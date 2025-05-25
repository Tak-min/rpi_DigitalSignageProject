// アニメーションローダーユーティリティ
// アニメーションファイルを動的に読み込むためのユーティリティクラス

import * as THREE from 'three';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
// import { VRMAnimationLoaderPlugin } from '@pixiv/three-vrm'; // 古いインポート

// カスタムVRMAnimationLoaderPluginの実装
class VRMAnimationLoaderPlugin {
  constructor(parser) {
    this.parser = parser;
    // GLTFLoaderプラグインには名前が必要
    this.name = 'VRMC_vrm_animation';
  }

  // GLTFParser拡張のコア関数
  async afterRoot(gltf) {
    const json = this.parser.json;

    // 基本的なVRMAのパースロジック
    if (json.extensions && json.extensions.VRMC_vrm_animation) {
      console.log('VRMAファイルを検出しました');
      return {
        animations: gltf.animations || [],
        // 必要に応じてここに他のプロパティを追加
        // メタデータやセットアップ用の情報など
      };
    }
    return null;
  }
}

export class AnimationLoader {  constructor() {
    this.fbxLoader = new FBXLoader();
    this.gltfLoader = new GLTFLoader();
    
    // VRMAローダーのために、GLTFLoaderにVRMAnimationLoaderPluginを登録
    this.gltfLoader.register((parser) => new VRMAnimationLoaderPlugin(parser));
    
    // カスタムVRMAのロード警告
    console.info('注：カスタムVRMAローダーを使用しています。完全なVRMAサポートには限界があります。');
  }
  
  /**
   * アニメーションリストのJSONを読み込む
   * @param {string} path - アニメーションリストJSONのパス
   * @returns {Promise<Array>} - アニメーションの配列
   */
  async loadAnimationsConfig(path) {
    try {
      const response = await fetch(path);
      return await response.json();
    } catch (error) {
      console.error('アニメーションリストの読み込みに失敗しました:', error);
      return [];
    }
  }
  
  /**
   * アニメーションの種類に基づいてローダーを取得
   * @param {string} type - アニメーションタイプ ('fbx' または 'vrma')
   * @returns {Object} - 適切なローダー
   */
  getLoaderByType(type) {
    switch(type.toLowerCase()) {
      case 'fbx':
        return this.fbxLoader;
      case 'vrma':
      case 'gltf':
      case 'glb':
        return this.gltfLoader;
      default:
        console.error(`未知のアニメーション形式: ${type}`);
        return null;
    }
  }
  
  /**
   * アニメーションを読み込む
   * @param {Object} animConfig - アニメーション設定 (type, path)
   * @returns {Promise<Object>} - 読み込まれたアニメーション
   */  loadAnimation(animConfig) {
    return new Promise((resolve, reject) => {
      const loader = this.getLoaderByType(animConfig.type);
      
      if (!loader) {
        reject(new Error(`サポートされていないアニメーション形式: ${animConfig.type}`));
        return;
      }
      
      loader.load(
        animConfig.path,
        (result) => {
          // タイプに応じて異なる処理
          if (animConfig.type.toLowerCase() === 'fbx') {
            // FBXの場合、最初のアニメーションを取得
            let animation = result.animations[0];
            if (animation) {
              // FBXアニメーションをVRMモデル用に最適化
              animation = this.optimizeAnimationForVRM(animation);
              resolve(animation);
            } else {
              reject(new Error(`アニメーションが含まれていません: ${animConfig.path}`));
            }
          } else if (animConfig.type.toLowerCase() === 'vrma') {
            // カスタムVRMAローダーの場合の処理
            console.log('VRMA読み込み結果:', result);
            
            // アニメーションデータを取得
            let animation = null;
            
            // 結果からアニメーションを抽出する様々な方法を試みる
            if (result.animations && result.animations.length > 0) {
              animation = result.animations[0]; 
            } else if (result.userData && result.userData.vrmAnimations) {
              animation = result.userData.vrmAnimations[0];
            } else if (result.animation) {
              animation = result.animation;
            } else {
              // 最後の手段として簡易アニメーションを作成
              console.warn('VRMAからアニメーションを抽出できませんでした。ダミーアニメーションを作成します。');
              animation = new THREE.AnimationClip('dummy', 1, [
                new THREE.NumberKeyframeTrack('.quaternion[0]', [0, 1], [0, 0])
              ]);
            }
            
            resolve(animation);
          } else {
            reject(new Error(`不明なアニメーション形式: ${animConfig.type}`));
          }
        },
        (xhr) => {
          // 進捗状況（必要に応じて）
        },
        (error) => {
          reject(new Error(`アニメーションのロードエラー: ${error}`));
        }
      );
    });
  }
  
  /**
   * 複数のアニメーションを読み込む
   * @param {Array} animConfigs - アニメーション設定の配列
   * @returns {Promise<Array>} - 読み込まれたアニメーションの配列
   */  /**
   * FBXアニメーションをVRMモデル向けに最適化する
   * @param {THREE.AnimationClip} animation - 最適化するアニメーション
   * @returns {THREE.AnimationClip} - 最適化されたアニメーション
   */
  optimizeAnimationForVRM(animation) {
    // AnimationClipを複製して修正
    const optimizedAnimation = THREE.AnimationClip.parse(THREE.AnimationClip.toJSON(animation));
    
    // トラック名のマッピング (FBXからVRM向け)
    const commonBoneMap = {
      'mixamorigHips': 'hips',
      'mixamorigSpine': 'spine',
      'mixamorigSpine1': 'chest',
      'mixamorigSpine2': 'upperChest',
      'mixamorigNeck': 'neck',
      'mixamorigHead': 'head',
      'mixamorigLeftShoulder': 'leftShoulder',
      'mixamorigLeftArm': 'leftUpperArm',
      'mixamorigLeftForeArm': 'leftLowerArm',
      'mixamorigLeftHand': 'leftHand',
      'mixamorigRightShoulder': 'rightShoulder',
      'mixamorigRightArm': 'rightUpperArm',
      'mixamorigRightForeArm': 'rightLowerArm',
      'mixamorigRightHand': 'rightHand',
      'mixamorigLeftUpLeg': 'leftUpperLeg',
      'mixamorigLeftLeg': 'leftLowerLeg',
      'mixamorigLeftFoot': 'leftFoot',
      'mixamorigRightUpLeg': 'rightUpperLeg',
      'mixamorigRightLeg': 'rightLowerLeg',
      'mixamorigRightFoot': 'rightFoot'
    };
    
    // 有効なトラックのみを保持
    const filteredTracks = [];
    for (const track of optimizedAnimation.tracks) {
      // トラック名を分解 (例: mixamorigSpine.quaternion -> mixamorigSpine, quaternion)
      const trackSplit = track.name.split('.');
      const boneName = trackSplit[0];
      const propertyName = trackSplit[1];
      
      // VRMのボーン名にマッピングを試みる
      if (commonBoneMap[boneName]) {
        const vrmBoneName = commonBoneMap[boneName];
        const newTrackName = `${vrmBoneName}.${propertyName}`;
        
        // トラック名を更新して追加
        const newTrack = track.clone();
        newTrack.name = newTrackName;
        filteredTracks.push(newTrack);
      } else {
        // マッピングが見つからない場合は元のトラックを保持
        filteredTracks.push(track);
      }
    }
    
    // 最適化されたトラックをアニメーションに設定
    optimizedAnimation.tracks = filteredTracks;
    
    // 警告メッセージを追加
    console.info(`アニメーション「${optimizedAnimation.name}」をVRM用に${filteredTracks.length}トラックで最適化しました`);
    
    return optimizedAnimation;
  }

  async loadAnimations(animConfigs) {
    const animations = {
      walk: null,
      idle: []
    };
    
    for (const config of animConfigs) {
      try {
        const animation = await this.loadAnimation(config);
        
        // FBXは歩行アニメーション、VRMAはアイドルアニメーションとして扱う
        if (config.type.toLowerCase() === 'fbx') {
          animations.walk = animation;
        } else {
          animations.idle.push(animation);
        }
      } catch (error) {
        console.error(`アニメーション読み込みエラー (${config.path}):`, error);
        // エラーがあっても続行
      }
    }
    
    return animations;
  }
}
