# Digital Signage Project

## 概要
このプロジェクトは、Raspberry Pi上で3Dキャラクターを表示するデジタルサイネージプログラムです。
縦向き画面に最適化され、VRMモデルとそのアニメーションを表示します。

## 必要なもの
- Raspberry Pi 4 Model B
- Raspberry Pi OS (最新版)
- 垂直向きディスプレイ (推奨解像度: 1024x600)
- インターネット接続 (初期セットアップ時のみ)

## セットアップ手順

### 1. 必要なパッケージのインストール
```bash
sudo apt update
sudo apt install -y chromium-browser xdotool unclutter
```

### 2. プロジェクトフォルダのセットアップ
```bash
mkdir -p ~/digital-signage
cd ~/digital-signage
```

### 3. プロジェクトファイルをコピー
プロジェクトのすべてのファイルをRaspberry Pi上の`~/digital-signage`フォルダにコピーします。

### 4. 画面の向きを設定
画面を縦向きにするには、`/boot/config.txt`を編集します:

```bash
sudo nano /boot/config.txt
```

以下の行を追加します（90度回転の場合）:
```
display_rotate=1
```

### 5. 自動起動の設定
```bash
mkdir -p ~/.config/lxsession/LXDE-pi
cp autostart ~/.config/lxsession/LXDE-pi/
```

### 6. モデルとアニメーションの配置
VRMモデルとアニメーションファイルを以下のディレクトリに配置してください:

- VRMモデル: `public/models/models.vrm`
- アニメーションファイル: `public/animations/`

### 7. 設定の調整
`config.json`ファイルを編集して、モデルやアニメーション、背景などの設定を調整できます。

### 8. システムの再起動
```bash
sudo reboot
```

## トラブルシューティング

1. **画面が表示されない場合**:
   - `http://localhost:8000/`にアクセスして、Webサーバーが正常に動作しているか確認してください。
   - Chromiumが正常に起動しているか確認してください。

2. **モデルが読み込まれない場合**:
   - モデルファイルのパスが正しいか確認してください。
   - ブラウザのコンソールでエラーがないか確認してください。

3. **アニメーションが再生されない場合**:
   - アニメーションファイルのパスが正しいか確認してください。
   - アニメーションフォーマットがサポートされているか確認してください。
