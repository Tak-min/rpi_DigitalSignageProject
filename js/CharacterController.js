import * as THREE from 'three';
import { ExpressionManager } from './ExpressionManager.js';
import { CharacterStateMachine } from './CharacterStateMachine.js';

/**
 * キャラクター制御クラス
 * 3Dキャラクターの移動とアニメーションを管理する
 */
export class CharacterController {
  constructor(model, scene, camera, config, animationManager) {
    this.model = model;
    this.scene = scene;
    this.camera = camera;
    this.config = config;
    this.animationManager = animationManager;
    
    // 移動パラメータ
    this.moveSpeed = config.character.moveSpeed;
    this.rotationSpeed = config.character.rotationSpeed;
    this.moveInterval = config.character.moveInterval;
    this.idleInterval = config.character.idleInterval;
    
    // 状態管理
    this.isMoving = false;
    this.moveTimeout = null;
    this.destination = new THREE.Vector3(0, 0, 0);
    this.direction = new THREE.Vector3(0, 0, 0);
    this.targetRotation = 0;
    this.currentRotation = 0;
    
    // 移動の滑らかさ
    this.rotationDamping = 0.1;
    this.movementDamping = 0.05;
    
    // 画面の境界を計算
    this.calculateScreenBoundaries();
    
    // 表情管理システムの初期化
    this.initializeExpressionManager();
    
    // ステートマシンの初期化
    this.initializeStateMachine();
  }

  /**
   * 表情管理システムの初期化
   */
  initializeExpressionManager() {
    try {
      // VRMインスタンスを取得（model.parent経由でVRMにアクセス）
      let vrm = null;
      
      // モデルからVRMインスタンスを探す
      this.model.traverse((child) => {
        if (child.userData && child.userData.vrm) {
          vrm = child.userData.vrm;
        }
      });
      
      // 親オブジェクトからVRMを探す
      if (!vrm && this.model.parent && this.model.parent.userData && this.model.parent.userData.vrm) {
        vrm = this.model.parent.userData.vrm;
      }
      
      // グローバルなVRMインスタンスがある場合
      if (!vrm && window.vrm) {
        vrm = window.vrm;
      }
      
      if (vrm) {
        this.expressionManager = new ExpressionManager(vrm);
        console.log('表情管理システムが初期化されました');
      } else {
        console.warn('VRMインスタンスが見つかりません。表情管理を無効化します。');
        this.expressionManager = null;
      }
    } catch (error) {
      console.error('表情管理システムの初期化に失敗:', error);
      this.expressionManager = null;
    }
  }

  /**
   * ステートマシンの初期化
   */
  initializeStateMachine() {
    try {
      this.stateMachine = new CharacterStateMachine(
        this.animationManager,
        this.expressionManager,
        this.config
      );
      console.log('キャラクターステートマシンが初期化されました');
    } catch (error) {
      console.error('ステートマシンの初期化に失敗:', error);
      this.stateMachine = null;
    }
  }

  /**
   * 画面内の移動可能な領域を計算する
   */
  calculateScreenBoundaries() {
    // 視錐台（フラスタム）の境界を計算
    const vFOV = THREE.MathUtils.degToRad(this.camera.fov);
    const height = 2 * Math.tan(vFOV / 2) * this.camera.position.z;
    const width = height * this.camera.aspect;
    
    // 安全マージンを考慮（キャラクターが画面外に出ないよう）
    const margin = 0.5;
    
    this.boundaries = {
      minX: -width / 2 + margin,
      maxX: width / 2 - margin,
      minZ: -height / 2 + margin,
      maxZ: height / 2 - margin
    };
  }
  /**
   * キャラクターの移動を開始する
   */
  startMoving() {
    if (this.moveTimeout) {
      clearTimeout(this.moveTimeout);
    }
    
    this.isMoving = true;
    this.setRandomDestination();
    
    // ステートマシンを使用して歩行状態に遷移
    if (this.stateMachine) {
      this.stateMachine.requestStateChange('walking');
    } else {
      // フォールバック：直接アニメーション管理
      this.animationManager.playWalkAnimation();
    }
    
    // 一定時間後に移動を止める
    this.moveTimeout = setTimeout(() => {
      this.stopMoving();
    }, this.moveInterval);
  }

  /**
   * キャラクターの移動を停止する
   */
  stopMoving() {
    this.isMoving = false;
    
    // ステートマシンを使用してアイドル状態に遷移
    if (this.stateMachine) {
      this.stateMachine.requestStateChange('idle');
    } else {
      // フォールバック：直接アニメーション管理
      this.animationManager.playRandomIdleAnimation();
    }
    
    // 一定時間後に再び移動を開始する
    this.moveTimeout = setTimeout(() => {
      this.startMoving();
    }, this.idleInterval);
  }
  /**
   * ランダムな目的地を設定する
   */
  setRandomDestination() {
    // 画面内のランダムな位置を生成
    const randomX = THREE.MathUtils.randFloat(this.boundaries.minX, this.boundaries.maxX);
    const randomZ = THREE.MathUtils.randFloat(this.boundaries.minZ, this.boundaries.maxZ);
    
    this.destination.set(randomX, 0, randomZ);
    
    // 目的地への方向ベクトルを計算
    this.direction.subVectors(this.destination, this.model.position).normalize();
    
    // 移動方向の角度を計算（正面を向くよう調整）
    if (this.direction.length() > 0) {
      // Z軸を前方として、移動方向に向く回転を計算
      this.targetRotation = Math.atan2(this.direction.x, this.direction.z);
      
      console.log(`新しい目的地: (${randomX.toFixed(2)}, ${randomZ.toFixed(2)})`);
      console.log(`移動方向: ${this.targetRotation.toFixed(2)} rad`);
    }
  }

  /**
   * キャラクターの回転を滑らかに更新する
   */
  updateRotation() {
    if (!this.isMoving) return;
    
    // 現在の回転と目標回転の差を計算
    let rotationDiff = this.targetRotation - this.currentRotation;
    
    // 角度の正規化（-π から π の範囲に収める）
    while (rotationDiff > Math.PI) rotationDiff -= 2 * Math.PI;
    while (rotationDiff < -Math.PI) rotationDiff += 2 * Math.PI;
    
    // 滑らかな回転補間
    this.currentRotation += rotationDiff * this.rotationDamping;
    
    // モデルの回転を適用
    this.model.rotation.y = this.currentRotation;
  }  /**
   * キャラクターの状態を更新する
   */
  update(deltaTime = 0.016) {
    // ステートマシンの更新
    if (this.stateMachine) {
      this.stateMachine.update();
    }
    
    // 表情管理の更新
    if (this.expressionManager) {
      this.expressionManager.update();
    }
    
    // 移動処理
    if (this.isMoving) {
      // 目的地までの距離を計算
      const distanceToTarget = this.model.position.distanceTo(this.destination);
      
      if (distanceToTarget > 0.1) {
        // 滑らかな回転更新
        this.updateRotation();
        
        // 目的地に向かって移動（フレームレート独立）
        const actualMoveSpeed = this.moveSpeed * deltaTime * 60; // 60FPS基準
        const moveVector = this.direction.clone().multiplyScalar(actualMoveSpeed);
        this.model.position.add(moveVector);
        
        // キャラクターの位置が境界内に収まるよう制限
        this.model.position.x = THREE.MathUtils.clamp(
          this.model.position.x,
          this.boundaries.minX,
          this.boundaries.maxX
        );
        
        this.model.position.z = THREE.MathUtils.clamp(
          this.model.position.z,
          this.boundaries.minZ,
          this.boundaries.maxZ
        );
      } else {
        // 目的地に到着
        this.stopMoving();
      }
    }
  }
  /**
   * キャラクターの初期位置を設定する
   */
  setInitialPosition() {
    // 画面の中央に配置
    this.model.position.set(0, 0, 0);
    this.currentRotation = 0;
    this.model.rotation.y = 0;
  }

  /**
   * VRMインスタンスを設定する（外部から呼び出し可能）
   * @param {Object} vrm - VRMインスタンス
   */
  setVRM(vrm) {
    if (vrm && !this.expressionManager) {
      try {
        this.expressionManager = new ExpressionManager(vrm);
        console.log('VRM設定後に表情管理システムを初期化しました');
        
        // ステートマシンも再初期化
        if (!this.stateMachine) {
          this.initializeStateMachine();
        }
      } catch (error) {
        console.error('VRM設定後の表情管理初期化に失敗:', error);
      }
    }
  }

  /**
   * デバッグ情報を取得
   * @returns {Object} デバッグ情報
   */
  getDebugInfo() {
    const baseInfo = {
      isMoving: this.isMoving,
      position: {
        x: this.model.position.x.toFixed(2),
        y: this.model.position.y.toFixed(2),
        z: this.model.position.z.toFixed(2)
      },
      rotation: this.currentRotation.toFixed(2),
      targetRotation: this.targetRotation.toFixed(2)
    };
    
    // ステートマシンのデバッグ情報を追加
    if (this.stateMachine) {
      baseInfo.stateMachine = this.stateMachine.getDebugInfo();
    }
    
    // 表情管理のデバッグ情報を追加
    if (this.expressionManager) {
      baseInfo.expressions = this.expressionManager.getDebugInfo();
    }
    
    return baseInfo;
  }
}
