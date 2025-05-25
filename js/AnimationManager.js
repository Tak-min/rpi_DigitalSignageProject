import * as THREE from 'three';
import { AnimationLoader } from './AnimationLoader.js';

/**
 * アニメーション管理クラス
 * VRMモデルとアニメーションを管理する
 */
export class AnimationManager {
  constructor(vrm, mixer) {
    this.vrm = vrm;
    this.mixer = mixer;
    this.animations = {
      walk: null,
      idle: []
    };
    this.currentAnimation = null;
    this.currentState = 'idle';
    this.clock = new THREE.Clock();
    this.animationLoader = new AnimationLoader();
  }
  
  /**
   * アニメーション設定ファイルからすべてのアニメーションを読み込む
   * @param {string} configPath - アニメーション設定JSONのパス
   * @returns {Promise} - アニメーションのロード完了Promise
   */
  async loadAnimationsFromConfig(configPath) {
    try {
      // アニメーション設定を読み込む
      const animConfigs = await this.animationLoader.loadAnimationsConfig(configPath);
      
      // すべてのアニメーションを読み込む
      const loadedAnimations = await this.animationLoader.loadAnimations(animConfigs);
      
      // 読み込んだアニメーションを保存
      this.animations.walk = loadedAnimations.walk;
      this.animations.idle = loadedAnimations.idle;
      
      return this.animations;
    } catch (error) {
      console.error('アニメーション設定の読み込みに失敗しました:', error);
      throw error;
    }
  }

  /**
   * ランダムなアイドルアニメーションを再生する
   */
  playRandomIdleAnimation() {
    if (this.animations.idle.length === 0) return;
    
    const index = Math.floor(Math.random() * this.animations.idle.length);
    this.playAnimation(this.animations.idle[index]);
    this.currentState = 'idle';
  }

  /**
   * 歩行アニメーションを再生する
   */
  playWalkAnimation() {
    if (!this.animations.walk) return;
    
    this.playAnimation(this.animations.walk);
    this.currentState = 'walk';
  }
  /**
   * 指定されたアニメーションを再生する
   * @param {Object} animation - 再生するアニメーション
   */
  playAnimation(animation) {
    if (this.currentAnimation) {
      // 現在のアニメーションを停止
      this.currentAnimation.stop();
    }
    
    try {
      // コンソールの警告を一時的に抑制
      const originalConsoleWarn = console.warn;
      console.warn = function(message) {
        // "No target node found for track"の警告を無視
        if (!message.includes("No target node found for track")) {
          originalConsoleWarn.apply(console, arguments);
        }
      };
      
      // 新しいアニメーションを開始
      this.currentAnimation = this.mixer.clipAction(animation);
      this.currentAnimation.reset();
      this.currentAnimation.play();
      
      // コンソール警告を元に戻す
      console.warn = originalConsoleWarn;
    } catch (error) {
      console.error('アニメーション適用エラー:', error);
    }
  }

  /**
   * アニメーションを更新する
   */
  update() {
    const delta = this.clock.getDelta();
    if (this.mixer) {
      this.mixer.update(delta);
    }
  }

  /**
   * 現在のアニメーション状態を取得する
   * @returns {string} - 現在のアニメーション状態（'idle' または 'walk'）
   */
  getCurrentState() {
    return this.currentState;
  }
}
