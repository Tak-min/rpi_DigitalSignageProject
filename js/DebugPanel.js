/**
 * デバッグパネル
 * 開発中にモデルやアニメーションの状態を確認するためのデバッグパネル
 * 注: 本番環境では無効化されます
 */

export class DebugPanel {
  constructor(config) {
    this.config = config;
    this.visible = false;
    this.panelElement = null;
    
    // 開発モードの場合のみデバッグパネルを初期化
    if (this.config.debug && this.config.debug.enabled) {
      this.initialize();
    }
  }
  
  /**
   * デバッグパネルを初期化する
   */
  initialize() {
    // パネル要素を作成
    this.panelElement = document.createElement('div');
    this.panelElement.className = 'debug-panel';
    this.panelElement.style.position = 'fixed';
    this.panelElement.style.top = '10px';
    this.panelElement.style.right = '10px';
    this.panelElement.style.padding = '10px';
    this.panelElement.style.background = 'rgba(0, 0, 0, 0.7)';
    this.panelElement.style.color = 'white';
    this.panelElement.style.fontFamily = 'monospace';
    this.panelElement.style.fontSize = '12px';
    this.panelElement.style.zIndex = '1000';
    this.panelElement.style.borderRadius = '5px';
    this.panelElement.style.maxHeight = '80vh';
    this.panelElement.style.overflowY = 'auto';
    
    // ヘッダー
    const header = document.createElement('div');
    header.style.marginBottom = '10px';
    header.style.fontWeight = 'bold';
    header.textContent = 'デバッグパネル';
    this.panelElement.appendChild(header);
    
    // コンテンツ領域
    this.contentElement = document.createElement('div');
    this.panelElement.appendChild(this.contentElement);
    
    // トグルボタン
    const toggleButton = document.createElement('button');
    toggleButton.textContent = '表示/非表示';
    toggleButton.style.marginTop = '10px';
    toggleButton.style.padding = '5px';
    toggleButton.style.cursor = 'pointer';
    toggleButton.addEventListener('click', () => this.toggleVisibility());
    this.panelElement.appendChild(toggleButton);
    
    // キーボードショートカット
    document.addEventListener('keydown', (e) => {
      if (e.key === 'D' && e.ctrlKey) {
        this.toggleVisibility();
      }
    });
    
    // ページに追加
    document.body.appendChild(this.panelElement);
    
    // デフォルトでは非表示
    this.panelElement.style.display = 'none';
    this.visible = false;
  }
  
  /**
   * 表示/非表示を切り替える
   */
  toggleVisibility() {
    this.visible = !this.visible;
    this.panelElement.style.display = this.visible ? 'block' : 'none';
  }
  
  /**
   * デバッグ情報を更新する
   * @param {Object} data - 表示するデータ
   */
  update(data) {
    if (!this.contentElement) return;
    
    // コンテンツをクリア
    this.contentElement.innerHTML = '';
    
    // データをパネルに表示
    for (const [key, value] of Object.entries(data)) {
      const item = document.createElement('div');
      item.style.marginBottom = '5px';
      
      const label = document.createElement('strong');
      label.textContent = `${key}: `;
      
      const content = document.createElement('span');
      
      // 値の型に応じて表示を変える
      if (typeof value === 'object') {
        content.textContent = JSON.stringify(value);
      } else if (typeof value === 'boolean') {
        content.textContent = value ? 'はい' : 'いいえ';
        content.style.color = value ? '#8f8' : '#f88';
      } else {
        content.textContent = value;
      }
      
      item.appendChild(label);
      item.appendChild(content);
      this.contentElement.appendChild(item);
    }
  }
}
