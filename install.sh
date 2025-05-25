#!/bin/bash

# このスクリプトはRaspberry Piにプロジェクトをインストールするためのものです

# 必要なディレクトリを作成
mkdir -p ~/digital-signage
cd ~/digital-signage

# 必要なパッケージをインストール
sudo apt update
sudo apt install -y chromium-browser xdotool unclutter python3

# 自動起動設定をコピー
mkdir -p ~/.config/lxsession/LXDE-pi/
cp autostart ~/.config/lxsession/LXDE-pi/

# 実行権限を付与
chmod +x start_kiosk.sh

echo "インストールが完了しました。システムを再起動してください。"
echo "再起動コマンド: sudo reboot"
