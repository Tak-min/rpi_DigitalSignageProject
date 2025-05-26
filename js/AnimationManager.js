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
   * 歩行アニメーションを読み込む
   * @param {string} animationPath - アニメーションファイルのパス
   * @param {string} animationName - アニメーション名
   * @returns {Promise} - アニメーションのロード完了Promise
   */
  async loadWalkAnimation(animationPath, animationName) {
    try {
      const animConfig = {
        type: 'fbx',
        path: animationPath,
        name: animationName
      };
      
      this.animations.walk = await this.animationLoader.loadAnimation(animConfig);
      console.log(`歩行アニメーション「${animationName}」を読み込みました`);
      
      return this.animations.walk;
    } catch (error) {
      console.error('歩行アニメーションの読み込みに失敗しました:', error);
      throw error;
    }
  }

  /**
   * アイドルアニメーションを読み込む
   * @param {Array} idleConfigs - アイドルアニメーション設定の配列
   * @returns {Promise} - アニメーションのロード完了Promise
   */
  async loadIdleAnimations(idleConfigs) {
    this.animations.idle = [];
    
    for (const config of idleConfigs) {
      try {
        const animConfig = {
          type: 'vrma',
          path: config.path,
          name: config.name
        };
        
        const animation = await this.animationLoader.loadAnimation(animConfig);
        this.animations.idle.push(animation);
        console.log(`アイドルアニメーション「${config.name}」を読み込みました`);
      } catch (error) {
        console.error(`アイドルアニメーション「${config.name}」の読み込みに失敗:`, error);
        // エラーがあっても続行
      }
    }
    
    console.log(`${this.animations.idle.length}個のアイドルアニメーションを読み込みました`);
    return this.animations.idle;
  }  /**
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
   * 指定されたアニメーションを再生する（新版・外部から呼び出し可能）
   * @param {Object} animation - 再生するアニメーション
   * @param {number} fadeInTime - フェードイン時間（秒）
   * @param {number} fadeOutTime - 現在のアニメーションのフェードアウト時間（秒）
   */
  playAnimationWithFade(animation, fadeInTime = 0.3, fadeOutTime = 0.3) {
    if (!animation) return;
    
    try {
      // 現在のアニメーションをフェードアウト
      if (this.currentAnimation) {
        this.currentAnimation.fadeOut(fadeOutTime);
      }
      
      // 新しいアニメーションを準備
      const newAction = this.mixer.clipAction(animation);
      newAction.reset();
      newAction.setLoop(THREE.LoopRepeat);
      newAction.clampWhenFinished = false;
      
      // フェードインして再生
      newAction.fadeIn(fadeInTime);
      newAction.play();
      
      this.currentAnimation = newAction;
      
      console.log(`アニメーション再生: ${animation.name} (fade: ${fadeInTime}s)`);
    } catch (error) {
      console.error('アニメーション再生エラー:', error);
    }
  }  /**
   * 指定されたアニメーションを再生する
   * @param {Object} animation - 再生するアニメーション
   */
  playAnimation(animation) {
    if (!animation) {
      console.warn('再生するアニメーションが指定されていません');
      return;
    }

    if (!this.mixer) {
      console.error('AnimationMixerが初期化されていません');
      return;
    }

    try {
      // 現在のアニメーションを停止
      if (this.currentAnimation) {
        this.currentAnimation.stop();
      }
      
      console.log(`アニメーション再生開始: ${animation.name}`);
      
      // MixamoVRMMapperが利用可能かチェック
      if (window.vrmMapper && this.vrm) {
        // アニメーションを検証して最適化
        console.log('MixamoVRMMapperを使用してアニメーションを最適化します');
        
        // アニメーションを検証
        const validationResult = window.vrmMapper.validateClip(animation);
        
        // 有効なトラックが1つもない場合はエラー
        if (validationResult.validRatio < 0.1) { // 10%未満の場合
          console.error('このアニメーションはVRMモデルとの互換性が非常に低いです');
          console.error(`有効なトラック: ${validationResult.valid}/${validationResult.total}`);
          // それでも続行（デバッグ用）
        }
        
        // アニメーションをリターゲット
        animation = window.vrmMapper.retargetAnimation(animation);
        
        console.log(`リターゲット後のトラック数: ${animation.tracks.length}`);
      }
      // 従来のVRMBoneAnalyzerを使用したフォールバック処理
      else if (this.vrm && window.VRMBoneAnalyzer) {
        // もし初回実行なら、VRMBoneAnalyzerのデバッグ情報を出力
        if (!this._vrmAnalyzed && this.vrm) {
          this._vrmAnalyzed = true;
          window.VRMBoneAnalyzer.printDebugInfo(this.vrm);
        }
        
        // アニメーショントラックの検証
        const validation = window.VRMBoneAnalyzer.validateAnimationTracks(this.vrm, animation);
        if (validation.validTracks.length === 0) {
          console.error('このアニメーションはVRMモデルと互換性がありません');
          return;
        }
        
        // VRM特有のボーンに関する警告をフィルタリング
        const filteredInvalidTracks = validation.invalidTracks.filter(trackName => {
          const boneName = trackName.split('.')[0];
          return !window.VRMBoneAnalyzer.isVRMSpecificBone(boneName);
        });
        
        console.log(`アニメーション互換性: ${validation.validTracks.length}/${validation.totalTracks} トラックが有効`);
        console.log(`  - 無効トラック(VRM特有のボーンを除外): ${filteredInvalidTracks.length}`);
        
        // VRM特有のボーントラックをフィルタリングしたアニメーションクリップを作成
        const filteredAnimation = animation.clone();
        filteredAnimation.tracks = animation.tracks.filter(track => {
          const boneName = track.name.split('.')[0];
          // VRM特有のボーンでないトラックか、有効なトラックのみを保持
          return !window.VRMBoneAnalyzer.isVRMSpecificBone(boneName) || 
                 validation.validTracks.includes(track.name);
        });
        
        console.log(`フィルタリング後のトラック数: ${filteredAnimation.tracks.length}/${animation.tracks.length}`);
        
        // フィルタリングしたアニメーションを使用
        animation = filteredAnimation;
      }
      
      // 新しいアニメーションを開始
      this.currentAnimation = this.mixer.clipAction(animation);
      this.currentAnimation.reset();
      this.currentAnimation.setLoop(THREE.LoopRepeat);
      this.currentAnimation.clampWhenFinished = false;
      
      // アニメーションのウェイトを設定
      this.currentAnimation.setEffectiveWeight(1.0);
      this.currentAnimation.setEffectiveTimeScale(1.0);
      
      // アニメーションを再生
      this.currentAnimation.play();
      
      console.log(`アニメーション再生中: ${animation.name}, 長さ: ${animation.duration}秒`);
      
    } catch (error) {
      console.error('アニメーション適用エラー:', error);
      console.error('アニメーション詳細:', animation);
      
      // エラーが発生した場合、T-poseに戻す
      if (this.vrm) {
        console.log('T-poseに復帰します');
        // VRMUtilsが利用可能な場合のみ呼び出し
        if (window.VRMUtils) {
          window.VRMUtils.rotateVRM0(this.vrm);
        }
      }
    }
  }
  /**
   * VRMインスタンスを設定する（リターゲティング用）
   * @param {Object} vrm - VRMインスタンス
   */
  setVRM(vrm) {
    this.vrm = vrm;
    
    // AnimationLoaderにもVRMを設定
    if (this.animationLoader) {
      this.animationLoader.setVRM(vrm);
      console.log('AnimationLoaderにVRMを設定しました');
    }
    
    // 既存のアニメーションを再検証
    if (this.animations.walk) {
      console.log('歩行アニメーションのVRM互換性を検証中...');
      
      // MixamoVRMMapperが利用可能な場合、それを使って再検証
      if (window.vrmMapper) {
        console.log('MixamoVRMMapperを使用して歩行アニメーションを最適化します');
        this.animations.walk = window.vrmMapper.retargetAnimation(this.animations.walk);
      } else {
        // 従来の方法でフォールバック検証
        this.animations.walk = this.animationLoader.validateBonesAndCreateFallback(
          vrm, 
          [this.animations.walk]
        )[0];
      }
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

  /**
   * デバッグ情報を取得
   * @returns {Object} デバッグ情報
   */
  getDebugInfo() {
    return {
      currentState: this.currentState,
      hasWalkAnimation: !!this.animations.walk,
      idleAnimationCount: this.animations.idle.length,
      currentAnimationName: this.currentAnimation ? this.currentAnimation.getClip().name : 'なし',
      isPlaying: this.currentAnimation ? this.currentAnimation.isRunning() : false
    };
  }
}
