#!/bin/bash

# Raspberry Pi起動時に自動実行するためのスクリプト
# ディスプレイマネージャ起動後に実行されるようにする

# Xのセッションロックを無効化
xset s noblank
xset s off
xset -dpms

# Chromiumをキオスクモードで起動
chromium-browser --noerrdialogs --disable-infobars --kiosk http://localhost:8000/
