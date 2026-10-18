#!/bin/sh
# Install or update Kelados on macOS or Linux:   curl -fsSL https://kelados.in/install.sh | sh
# Downloads the latest release from GitHub, closes Kelados if it's running, installs it and starts it.
# macOS: the app isn't notarized by Apple, so this script signs it locally (ad hoc) and clears the download flag;
# that is what lets it open without the "unidentified developer" block. Nothing here needs sudo.
set -e
REL="https://github.com/LovekeshAnand/Kelados/releases/latest/download"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

case "$(uname -s)" in
Darwin)
  APPS="/Applications"
  [ -w "$APPS" ] || { APPS="$HOME/Applications"; mkdir -p "$APPS"; }
  echo "Downloading Kelados for Mac..."
  curl -fL --progress-bar "$REL/Kelados-mac.zip" -o "$TMP/Kelados.zip"
  pkill -x Kelados 2>/dev/null || true
  sleep 1
  rm -rf "$APPS/Kelados.app"
  ditto -x -k "$TMP/Kelados.zip" "$APPS"
  xattr -dr com.apple.quarantine "$APPS/Kelados.app" 2>/dev/null || true
  codesign --force --deep --sign - "$APPS/Kelados.app" >/dev/null 2>&1 || true
  open "$APPS/Kelados.app"
  echo "Done. Kelados is in your menu bar. Allow Microphone and Accessibility when macOS asks"
  echo "(System Settings > Privacy & Security), then press Cmd+Shift+Space in any app and talk."
  ;;
Linux)
  DIR="$HOME/.local/bin"
  mkdir -p "$DIR" "$HOME/.local/share/applications"
  echo "Downloading Kelados for Linux..."
  curl -fL --progress-bar "$REL/Kelados.AppImage" -o "$TMP/Kelados.AppImage"
  pkill -f Kelados.AppImage 2>/dev/null || true
  sleep 1
  mv "$TMP/Kelados.AppImage" "$DIR/Kelados.AppImage"
  chmod +x "$DIR/Kelados.AppImage"
  cat > "$HOME/.local/share/applications/kelados.desktop" <<DESKTOP
[Desktop Entry]
Name=Kelados
Comment=Talk and it types, in any app
Exec=$DIR/Kelados.AppImage
Terminal=false
Type=Application
Categories=Utility;
DESKTOP
  command -v xdotool >/dev/null || echo "Note: install xdotool so Kelados can type (sudo apt install xdotool)."
  nohup "$DIR/Kelados.AppImage" >/dev/null 2>&1 &
  echo "Done. Kelados is running. Press Ctrl+Shift+Space in any app and talk."
  ;;
*)
  echo "This script is for macOS and Linux. On Windows run:  irm https://kelados.in/install.ps1 | iex"
  exit 1
  ;;
esac
