import * as THREE from 'three';

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
    
    // 画面の境界を計算
    this.calculateScreenBoundaries();
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
    this.animationManager.playWalkAnimation();
    
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
    this.animationManager.playRandomIdleAnimation();
    
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
    
    // キャラクターを移動方向に向ける
    if (this.direction.length() > 0) {
      const targetRotation = Math.atan2(this.direction.x, this.direction.z);
      this.model.rotation.y = targetRotation;
    }
  }

  /**
   * キャラクターの状態を更新する
   */
  update() {
    if (this.isMoving) {
      // 目的地までの距離を計算
      const distanceToTarget = this.model.position.distanceTo(this.destination);
      
      if (distanceToTarget > 0.1) {
        // 目的地に向かって移動
        const moveVector = this.direction.clone().multiplyScalar(this.moveSpeed);
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
  }
}
