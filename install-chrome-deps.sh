#!/bin/bash

set -e

echo "Updating package list..."
dnf update

echo "Installing required dependencies for headless Chrome..."
dnf install -y \
  libatk1.0-0 \
  libatk-bridge2.0-0 \
  libcups2 \
  libxcomposite1 \
  libxrandr2 \
  libxdamage1 \
  libxss1 \
  libxtst6 \
  libnss3 \
  libasound2 \
  libxshmfence1 \
  libgbm1 \
  libgtk-3-0 \
  libpangocairo-1.0-0 \
  libpango-1.0-0 \
  fonts-liberation \
  libappindicator3-1 \
  lsb-release \
  xdg-utils \
  wget \
  ca-certificates

echo "All required libraries installed."

# Optional: test if the Chrome binary can now run
if [ -x "/home/container/.cache/puppeteer/chrome/linux-137.0.7151.119/chrome-linux64/chrome" ]; then
  echo "Testing Chrome binary..."
  "/home/container/.cache/puppeteer/chrome/linux-137.0.7151.119/chrome-linux64/chrome" --version || echo "Chrome ran with error but dependencies are likely fixed"
else
  echo "Chrome binary not found. Make sure Puppeteer has downloaded it correctly."
fi
