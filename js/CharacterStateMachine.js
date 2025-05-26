import * as THREE from 'three';

/**
 * キャラクターステートマシン
 * キャラクターの状態遷移と行動を管理する
 */
export class CharacterStateMachine {
  constructor(animationManager, expressionManager, config) {
    this.animationManager = animationManager;
    this.expressionManager = expressionManager;
    this.config = config;
    
    // 状態定義
    this.states = {
      IDLE: 'idle',
      WALKING: 'walking',
      TRANSITIONING: 'transitioning'
    };
    
    // 現在の状態
    this.currentState = this.states.IDLE;
    this.previousState = null;
    this.stateStartTime = Date.now();
    this.transitionProgress = 0;
    
    // 状態継続時間の管理
    this.stateMinDurations = {
      [this.states.IDLE]: config.character.idleInterval || 6000,
      [this.states.WALKING]: config.character.moveInterval || 5000
    };
    
    // アニメーション遷移の管理
    this.currentAnimationAction = null;
    this.nextAnimationAction = null;
    this.isTransitioning = false;
    this.transitionDuration = 500; // 0.5秒の遷移時間
    
    // アイドルアニメーションのローテーション
    this.lastIdleAnimation = null;
    this.idleAnimationCooldown = new Set();
    
    console.log('CharacterStateMachine初期化完了');
  }

  /**
   * 状態を変更する
   * @param {string} newState - 新しい状態
   * @param {boolean} force - 強制的に状態変更するか
   */
  changeState(newState, force = false) {
    if (!force && this.currentState === newState) return;
    
    const now = Date.now();
    const currentStateDuration = now - this.stateStartTime;
    const minDuration = this.stateMinDurations[this.currentState] || 0;
    
    // 最小継続時間のチェック（強制でない場合）
    if (!force && currentStateDuration < minDuration) {
      console.log(`状態変更がブロックされました: ${this.currentState} (最小継続時間: ${minDuration}ms)`);
      return false;
    }
    
    console.log(`状態変更: ${this.currentState} -> ${newState}`);
    
    this.previousState = this.currentState;
    this.currentState = newState;
    this.stateStartTime = now;
    
    // 状態に応じた処理を実行
    this.executeStateAction(newState);
    
    return true;
  }

  /**
   * 状態に応じたアクションを実行
   * @param {string} state - 実行する状態
   */
  executeStateAction(state) {
    switch(state) {
      case this.states.IDLE:
        this.enterIdleState();
        break;
      case this.states.WALKING:
        this.enterWalkingState();
        break;
      case this.states.TRANSITIONING:
        this.enterTransitioningState();
        break;
      default:
        console.warn(`未知の状態: ${state}`);
    }
  }

  /**
   * アイドル状態に入る
   */
  enterIdleState() {
    console.log('アイドル状態に移行');
    
    // アイドルアニメーションを選択・再生
    this.playIdleAnimation();
    
    // 表情をアイドル用に設定
    if (this.expressionManager) {
      // 少し遅延を入れて自然な表情変化を演出
      setTimeout(() => {
        this.expressionManager.playRandomExpression();
      }, 500);
    }
  }

  /**
   * 歩行状態に入る
   */
  enterWalkingState() {
    console.log('歩行状態に移行');
    
    // 歩行アニメーションを再生
    this.smoothTransitionToAnimation(() => {
      this.animationManager.playWalkAnimation();
    });
    
    // 歩行時の表情設定
    if (this.expressionManager) {
      this.expressionManager.setWalkingExpression();
    }
  }

  /**
   * 遷移状態に入る
   */
  enterTransitioningState() {
    console.log('遷移状態に移行');
    this.isTransitioning = true;
  }

  /**
   * アイドルアニメーションを再生（重複回避）
   */
  playIdleAnimation() {
    if (!this.animationManager || !this.animationManager.animations.idle.length) {
      console.warn('アイドルアニメーションが利用できません');
      return;
    }
    
    const availableAnimations = this.animationManager.animations.idle.filter(
      (anim, index) => !this.idleAnimationCooldown.has(index)
    );
    
    // すべてのアニメーションがクールダウン中の場合、リセット
    if (availableAnimations.length === 0) {
      this.idleAnimationCooldown.clear();
      this.playIdleAnimation();
      return;
    }
    
    // ランダムにアニメーションを選択
    const randomIndex = Math.floor(Math.random() * availableAnimations.length);
    const selectedAnimation = availableAnimations[randomIndex];
    const originalIndex = this.animationManager.animations.idle.indexOf(selectedAnimation);
    
    // スムーズな遷移でアニメーションを再生
    this.smoothTransitionToAnimation(() => {
      this.animationManager.playAnimation(selectedAnimation);
    });
    
    // クールダウンに追加
    this.idleAnimationCooldown.add(originalIndex);
    this.lastIdleAnimation = originalIndex;
    
    // クールダウンの管理（3つのアニメーションを記憶）
    if (this.idleAnimationCooldown.size > Math.min(3, this.animationManager.animations.idle.length - 1)) {
      const oldestIndex = this.idleAnimationCooldown.values().next().value;
      this.idleAnimationCooldown.delete(oldestIndex);
    }
    
    console.log(`アイドルアニメーション選択: インデックス ${originalIndex}`);
  }

  /**
   * アニメーションの滑らかな遷移
   * @param {Function} animationCallback - 新しいアニメーションを開始するコールバック
   */
  smoothTransitionToAnimation(animationCallback) {
    if (!this.animationManager.currentAnimation) {
      animationCallback();
      return;
    }
    
    const currentAction = this.animationManager.currentAnimation;
    
    // 現在のアニメーションをフェードアウト
    currentAction.fadeOut(this.transitionDuration / 1000);
    
    // 新しいアニメーションを開始してフェードイン
    setTimeout(() => {
      animationCallback();
      
      if (this.animationManager.currentAnimation) {
        this.animationManager.currentAnimation.reset();
        this.animationManager.currentAnimation.fadeIn(this.transitionDuration / 1000);
        this.animationManager.currentAnimation.play();
      }
    }, this.transitionDuration / 2);
  }

  /**
   * 自動状態遷移の判定
   */
  checkAutoTransitions() {
    const now = Date.now();
    const currentStateDuration = now - this.stateStartTime;
    const minDuration = this.stateMinDurations[this.currentState] || 0;
    
    // 最小継続時間経過後の自動遷移
    if (currentStateDuration >= minDuration) {
      switch(this.currentState) {
        case this.states.IDLE:
          // アイドル状態から歩行状態への遷移
          this.changeState(this.states.WALKING);
          break;
        case this.states.WALKING:
          // 歩行状態からアイドル状態への遷移
          this.changeState(this.states.IDLE);
          break;
      }
    }
  }

  /**
   * 外部からの状態変更要求
   * @param {string} newState - 要求された新しい状態
   */
  requestStateChange(newState) {
    return this.changeState(newState, false);
  }

  /**
   * 強制的な状態変更
   * @param {string} newState - 強制する新しい状態  
   */
  forceStateChange(newState) {
    return this.changeState(newState, true);
  }

  /**
   * 更新処理
   */
  update() {
    // 自動状態遷移の確認
    this.checkAutoTransitions();
    
    // 現在の状態に応じた更新処理
    switch(this.currentState) {
      case this.states.IDLE:
        this.updateIdleState();
        break;
      case this.states.WALKING:
        this.updateWalkingState();
        break;
      case this.states.TRANSITIONING:
        this.updateTransitioningState();
        break;
    }
  }

  /**
   * アイドル状態の更新
   */
  updateIdleState() {
    // 表情変化の管理
    if (this.expressionManager) {
      this.expressionManager.idleExpressionLoop();
    }
  }

  /**
   * 歩行状態の更新
   */
  updateWalkingState() {
    // 歩行中の特別な処理があればここに追加
  }

  /**
   * 遷移状態の更新
   */
  updateTransitioningState() {
    // 遷移完了の判定
    if (this.isTransitioning) {
      // 遷移時間経過後に次の状態へ
      const now = Date.now();
      if (now - this.stateStartTime >= this.transitionDuration) {
        this.isTransitioning = false;
        // 適切な次の状態に遷移
        this.changeState(this.states.IDLE);
      }
    }
  }

  /**
   * 現在の状態を取得
   * @returns {string} 現在の状態
   */
  getCurrentState() {
    return this.currentState;
  }

  /**
   * 状態継続時間を取得
   * @returns {number} 現在の状態が開始してからの経過時間（ミリ秒）
   */
  getStateDuration() {
    return Date.now() - this.stateStartTime;
  }

  /**
   * デバッグ情報を取得
   * @returns {Object} デバッグ情報
   */
  getDebugInfo() {
    return {
      currentState: this.currentState,
      previousState: this.previousState,
      stateDuration: this.getStateDuration(),
      isTransitioning: this.isTransitioning,
      lastIdleAnimation: this.lastIdleAnimation,
      idleAnimationCooldown: Array.from(this.idleAnimationCooldown)
    };
  }
}
