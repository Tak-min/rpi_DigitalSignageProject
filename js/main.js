import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { VRM, VRMUtils, VRMLoaderPlugin } from '@pixiv/three-vrm';

import { AnimationManager } from './AnimationManager.js';
import { CharacterController } from './CharacterController.js';
import { DebugPanel } from './DebugPanel.js';

// 設定ファイルを読み込む
let config;

// グローバル変数
let scene, camera, renderer;
let vrm, mixer, clock;
let animationManager, characterController;
let debugPanel;
let loadingElement;
let stats = { fps: 0, deltaTime: 0, elapsedTime: 0 };

// 初期化関数
async function init() {
  loadingElement = document.getElementById('loading');
  
  // 設定ファイルを読み込む
  await loadConfig();
  
  // シーンの作成
  createScene();
  
  // VRMモデルの読み込み
  await loadVRM();
  
  // アニメーション管理の初期化
  await initializeAnimations();
  
  // キャラクター制御の初期化
  initializeCharacterController();
  
  // デバッグパネルの初期化
  initializeDebugPanel();
  
  // ローディング表示を非表示にする
  hideLoading();
  
  // アニメーションループを開始
  animate();
}

// 設定ファイルの読み込み
async function loadConfig() {
  try {
    const response = await fetch('./config.json');
    config = await response.json();
  } catch (error) {
    console.error('設定ファイルの読み込みに失敗しました:', error);
  }
}

// シーンの作成
function createScene() {
  // シーン
  scene = new THREE.Scene();
  scene.background = null; // 透明な背景
  
  // 背景色/背景画像の設定
  setBackground();
  
  // カメラ
  camera = new THREE.PerspectiveCamera(
    30,
    config.display.width / config.display.height,
    0.1,
    1000
  );
  
  camera.position.set(
    config.camera.position.x,
    config.camera.position.y,
    config.camera.position.z
  );
  
  camera.lookAt(
    config.camera.lookAt.x,
    config.camera.lookAt.y,
    config.camera.lookAt.z
  );
  
  // レンダラー
  renderer = new THREE.WebGLRenderer({ 
    antialias: true,
    alpha: true // 透明背景を許可
  });
  
  renderer.setSize(config.display.width, config.display.height);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setClearColor(0x000000, 0); // 透明な背景
  document.getElementById('container').appendChild(renderer.domElement);
  
  // ウィンドウリサイズ対応
  window.addEventListener('resize', onWindowResize);
  
  // ライティング
  setupLighting();
  
  // クロックの初期化
  clock = new THREE.Clock();
}

// 背景の設定
function setBackground() {
  // config.jsonから背景設定を取得
  if (config.background.imagePath) {
    // 背景画像がある場合
    const textureLoader = new THREE.TextureLoader();
    const backgroundTexture = textureLoader.load(config.background.imagePath);
    scene.background = backgroundTexture;
  } else {
    // 背景画像がない場合、透明背景を保持
    // body要素のCSSで背景色を設定する
    document.body.style.backgroundColor = config.background.color;
  }
}

// ライトの設定
function setupLighting() {
  // 環境光
  const ambientLight = new THREE.AmbientLight(
    config.lighting.ambient.color, 
    config.lighting.ambient.intensity
  );
  scene.add(ambientLight);
  
  // 指向性ライト
  const directionalLight = new THREE.DirectionalLight(
    config.lighting.directional.color, 
    config.lighting.directional.intensity
  );
  
  directionalLight.position.set(
    config.lighting.directional.position.x,
    config.lighting.directional.position.y,
    config.lighting.directional.position.z
  );
  
  scene.add(directionalLight);
}

// VRMモデルの読み込み
async function loadVRM() {
  return new Promise((resolve, reject) => {
    // GLTFLoaderにVRMLoaderPluginを登録
    const loader = new GLTFLoader();
    loader.register((parser) => {
      return new VRMLoaderPlugin(parser);
    });
    
    loader.load(
      config.model.path,
      async (gltf) => {
        // VRMインスタンスを取得
        vrm = gltf.userData.vrm;
        
        // VRMの初期化処理
        if (vrm) {
          // T-Poseに初期化
          VRMUtils.rotateVRM0(vrm);
          
          // VRMをシーンに追加
          scene.add(vrm.scene);
          
          // モデルのスケール調整
          vrm.scene.scale.setScalar(config.model.scale);
          
          // アニメーションミキサーの作成
          mixer = new THREE.AnimationMixer(vrm.scene);
          
          resolve(vrm);
        } else {
          reject(new Error('VRMの読み込みに失敗しました'));
        }
      },
      (xhr) => {
        // 読み込み進捗の表示（必要に応じて）
        const percent = Math.round((xhr.loaded / xhr.total) * 100);
        if (loadingElement) {
          loadingElement.querySelector('.message').textContent = 
            `モデルを読み込み中... ${percent}%`;
        }
      },
      (error) => {
        console.error('VRMモデルの読み込みに失敗しました:', error);
        reject(error);
      }
    );
  });
}

// アニメーションの初期化
async function initializeAnimations() {
  // アニメーション管理クラスの初期化
  animationManager = new AnimationManager(vrm, mixer);
  
  // JSON設定ファイルからアニメーションを読み込む
  try {
    await animationManager.loadAnimationsFromConfig('./public/animations/animations.json');
    console.log('アニメーションの読み込みが完了しました');
  } catch (error) {
    console.error('アニメーションの読み込みに失敗しました:', error);
    
    // エラーが発生した場合は、設定ファイルから読み込む（フォールバック）
    try {
      // 歩行アニメーションの読み込み
      await animationManager.loadWalkAnimation(
        config.animations.walk.path,
        config.animations.walk.name
      );
      
      // アイドルアニメーションの読み込み
      await animationManager.loadIdleAnimations(config.animations.idle);
    } catch (fallbackError) {
      console.error('フォールバックアニメーションの読み込みにも失敗しました:', fallbackError);
    }
  }
  
  // 最初のアイドルアニメーションを再生
  animationManager.playRandomIdleAnimation();
}

// キャラクターコントローラーの初期化
function initializeCharacterController() {
  characterController = new CharacterController(
    vrm.scene, 
    scene, 
    camera, 
    config, 
    animationManager
  );
  
  // 初期位置を設定
  characterController.setInitialPosition();
  
  // 移動を開始
  setTimeout(() => {
    characterController.startMoving();
  }, 1000);
}

// デバッグパネルの初期化
function initializeDebugPanel() {
  if (config.debug && config.debug.enabled) {
    debugPanel = new DebugPanel(config);
  }
}

// ウィンドウサイズ変更時の処理
function onWindowResize() {
  // 縦横比を計算（常に縦向き）
  const aspect = config.display.width / config.display.height;
  
  // カメラのアスペクト比を更新
  camera.aspect = aspect;
  camera.updateProjectionMatrix();
  
  // レンダラーのサイズを更新
  const container = document.getElementById('container');
  
  // 縦向き用にサイズを設定
  const width = Math.min(window.innerWidth, window.innerHeight * aspect);
  const height = width / aspect;
  
  renderer.setSize(width, height);
  
  // キャラクターの移動可能領域を再計算
  if (characterController) {
    characterController.calculateScreenBoundaries();
  }
}

// ローディング表示を非表示にする
function hideLoading() {
  if (loadingElement) {
    loadingElement.style.display = 'none';
  }
}

// アニメーションループ
function animate() {
  requestAnimationFrame(animate);
  
  // デルタタイムを計算
  const delta = clock.getDelta();
  const elapsed = clock.getElapsedTime();
  
  // FPS計算（0.5秒ごとに更新）
  stats.deltaTime = delta;
  stats.elapsedTime = elapsed;
  if (Math.floor(elapsed * 2) > Math.floor((elapsed - delta) * 2)) {
    stats.fps = Math.round(1 / delta);
  }
  
  // アニメーションの更新
  if (animationManager) {
    animationManager.update();
  }
  
  // キャラクターの更新
  if (characterController) {
    characterController.update();
  }
  
  // VRMの更新
  if (vrm) {
    vrm.update(delta);
  }
  
  // デバッグ情報の更新
  updateDebugInfo();
  
  // シーンのレンダリング
  renderer.render(scene, camera);
}

// デバッグ情報の更新
function updateDebugInfo() {
  if (!debugPanel || !config.debug || !config.debug.enabled) return;
  
  // デバッグ情報を収集
  const debugInfo = {
    'FPS': stats.fps,
    '経過時間': stats.elapsedTime.toFixed(1) + 's',
    'アニメーション状態': animationManager ? animationManager.getCurrentState() : 'なし',
    'モデル位置': vrm ? `X:${vrm.scene.position.x.toFixed(2)}, Y:${vrm.scene.position.y.toFixed(2)}, Z:${vrm.scene.position.z.toFixed(2)}` : 'なし',
    '移動中': characterController ? (characterController.isMoving ? 'はい' : 'いいえ') : 'なし',
    'モデルロード済': vrm ? 'はい' : 'いいえ'
  };
  
  // デバッグパネルを更新
  debugPanel.update(debugInfo);
}

// ページロード時に初期化を実行
window.addEventListener('DOMContentLoaded', init);
