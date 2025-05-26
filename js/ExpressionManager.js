import * as THREE from 'three';

/**
 * 表情管理クラス
 * VRMモデルの表情（ブレンドシェイプ）を制御する
 */
export class ExpressionManager {
  constructor(vrm) {
    this.vrm = vrm;
    this.isEnabled = false;
    this.currentExpressions = new Map();
    this.expressionQueue = [];
    this.lastExpressionTime = 0;
    this.expressionInterval = 3000; // 3秒間隔
    this.transitionDuration = 1000; // 1秒で表情遷移
    
    // 利用可能な表情を初期化
    this.initializeExpressions();
  }

  /**
   * 表情システムの初期化
   */
  initializeExpressions() {
    if (!this.vrm || !this.vrm.expressionManager) {
      console.warn('VRM表情管理システムが利用できません');
      return;
    }

    this.isEnabled = true;
    
    // 利用可能な表情をログ出力
    const presets = this.vrm.expressionManager.presetExpressionMap;
    console.log('利用可能な表情:', Object.keys(presets));
    
    // 基本表情の定義
    this.basicExpressions = [
      { name: 'neutral', weight: 1.0, duration: 2000 },
      { name: 'happy', weight: 0.8, duration: 1500 },
      { name: 'sad', weight: 0.6, duration: 1800 },
      { name: 'surprised', weight: 0.7, duration: 1200 },
      { name: 'angry', weight: 0.5, duration: 1600 }
    ];
    
    // まばたきの初期化
    this.initializeBlink();
  }

  /**
   * まばたきシステムの初期化
   */
  initializeBlink() {
    this.blinkInterval = 2000 + Math.random() * 3000; // 2-5秒間隔
    this.lastBlinkTime = 0;
    this.isBlinking = false;
    this.blinkDuration = 150; // まばたきの長さ
    
    console.log('まばたきシステムを初期化しました');
  }

  /**
   * 表情を設定する
   * @param {string} expressionName - 表情名
   * @param {number} weight - 重み（0.0-1.0）
   * @param {number} duration - 継続時間（ミリ秒）
   */
  setExpression(expressionName, weight = 1.0, duration = 1000) {
    if (!this.isEnabled) return;

    try {
      // 既存の表情をクリア
      this.clearExpressions();
      
      // 新しい表情を設定
      this.vrm.expressionManager.setValue(expressionName, weight);
      this.currentExpressions.set(expressionName, {
        weight: weight,
        startTime: Date.now(),
        duration: duration
      });
      
      console.log(`表情設定: ${expressionName} (重み: ${weight})`);
      
      // 指定時間後に表情をクリア
      setTimeout(() => {
        this.fadeOutExpression(expressionName);
      }, duration);
      
    } catch (error) {
      console.error('表情設定エラー:', error);
    }
  }

  /**
   * 表情をフェードアウトする
   * @param {string} expressionName - フェードアウトする表情名
   */
  fadeOutExpression(expressionName) {
    if (!this.currentExpressions.has(expressionName)) return;
    
    const expression = this.currentExpressions.get(expressionName);
    const fadeSteps = 10;
    const fadeInterval = 100;
    
    let currentStep = 0;
    const fadeTimer = setInterval(() => {
      currentStep++;
      const newWeight = expression.weight * (1 - currentStep / fadeSteps);
      
      try {
        this.vrm.expressionManager.setValue(expressionName, Math.max(0, newWeight));
        
        if (currentStep >= fadeSteps) {
          clearInterval(fadeTimer);
          this.vrm.expressionManager.setValue(expressionName, 0);
          this.currentExpressions.delete(expressionName);
        }
      } catch (error) {
        clearInterval(fadeTimer);
        console.error('表情フェードアウトエラー:', error);
      }
    }, fadeInterval);
  }

  /**
   * すべての表情をクリアする
   */
  clearExpressions() {
    if (!this.isEnabled) return;
    
    try {
      // 現在の表情をすべてクリア
      for (const [expressionName] of this.currentExpressions) {
        this.vrm.expressionManager.setValue(expressionName, 0);
      }
      this.currentExpressions.clear();
    } catch (error) {
      console.error('表情クリアエラー:', error);
    }
  }

  /**
   * ランダムな表情を再生する
   */
  playRandomExpression() {
    if (!this.isEnabled || this.basicExpressions.length === 0) return;
    
    const randomIndex = Math.floor(Math.random() * this.basicExpressions.length);
    const expression = this.basicExpressions[randomIndex];
    
    this.setExpression(expression.name, expression.weight, expression.duration);
  }

  /**
   * まばたきを実行する
   */
  performBlink() {
    if (!this.isEnabled || this.isBlinking) return;
    
    this.isBlinking = true;
    
    try {
      // まばたき開始
      this.vrm.expressionManager.setValue('blink', 1.0);
      
      // まばたき終了
      setTimeout(() => {
        try {
          this.vrm.expressionManager.setValue('blink', 0.0);
          this.isBlinking = false;
          
          // 次のまばたきタイミングを設定
          this.blinkInterval = 2000 + Math.random() * 3000;
        } catch (error) {
          console.error('まばたき終了エラー:', error);
          this.isBlinking = false;
        }
      }, this.blinkDuration);
      
    } catch (error) {
      console.error('まばたきエラー:', error);
      this.isBlinking = false;
    }
  }

  /**
   * アイドル状態での表情変化
   */
  idleExpressionLoop() {
    if (!this.isEnabled) return;
    
    const now = Date.now();
    
    // まばたきチェック
    if (now - this.lastBlinkTime > this.blinkInterval) {
      this.performBlink();
      this.lastBlinkTime = now;
    }
    
    // 表情変化チェック
    if (now - this.lastExpressionTime > this.expressionInterval) {
      this.playRandomExpression();
      this.lastExpressionTime = now;
      
      // 次の表情変化タイミングをランダムに設定
      this.expressionInterval = 3000 + Math.random() * 4000; // 3-7秒
    }
  }

  /**
   * 歩行時の表情設定
   */
  setWalkingExpression() {
    if (!this.isEnabled) return;
    
    // 歩行時は集中した表情を維持
    this.setExpression('neutral', 0.8, 2000);
  }

  /**
   * 更新処理
   */
  update() {
    if (!this.isEnabled) return;
    
    try {
      // VRM表情システムの更新
      this.vrm.expressionManager.update();
    } catch (error) {
      console.error('表情更新エラー:', error);
    }
  }

  /**
   * デバッグ情報を取得
   * @returns {Object} デバッグ情報
   */
  getDebugInfo() {
    return {
      isEnabled: this.isEnabled,
      currentExpressions: Array.from(this.currentExpressions.keys()),
      isBlinking: this.isBlinking,
      nextBlinkIn: Math.max(0, this.blinkInterval - (Date.now() - this.lastBlinkTime)),
      nextExpressionIn: Math.max(0, this.expressionInterval - (Date.now() - this.lastExpressionTime))
    };
  }
}
