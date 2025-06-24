#!/bin/bash
set -e

echo "Downloading get-pip.py..."
curl -sS -O https://bootstrap.pypa.io/get-pip.py

echo "Installing pip (user mode, bypassing PEP 668)..."
python3 get-pip.py --break-system-packages --user

echo "Adding ~/.local/bin to PATH..."
export PATH="$HOME/.local/bin:$PATH"

echo "Installing bgutil-ytdlp-pot-provider..."
pip install --break-system-packages --upgrade bgutil-ytdlp-pot-provider

# === Prepare Chrome library path ===
LIB_DIR="/home/container/chrome-libs"
mkdir -p "$LIB_DIR"

echo "Setting LD_LIBRARY_PATH..."
export LD_LIBRARY_PATH="$LIB_DIR:$LD_LIBRARY_PATH"

CHROME="$HOME/.cache/puppeteer/chrome/linux-137.0.7151.119/chrome-linux64/chrome"

echo "Testing Chrome launch..."

"$CHROME" \
  --headless=new \
  --no-sandbox \
  --disable-gpu \
  --disable-dev-shm-usage \
  --disable-software-rasterizer \
  --dump-dom about:blank \
  > /dev/null 2>&1

# === Check if Chrome ran successfully ===
if [ $? -eq 0 ]; then
  echo "✅ Chrome launched successfully. Starting Node.js..."
  node server.js
else
  echo "❌ Chrome failed to launch. Node.js will not start."
  exit 1
fi
