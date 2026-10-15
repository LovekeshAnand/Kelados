# Kelados for desktop

Press **Ctrl+Shift+Space** (⌘+Shift+Space on macOS), talk, and Kelados types into whatever app has focus: Slack, VS Code,
Word, your browser, a terminal running Claude Code. Press it again to stop.

## How it works

```
global shortcut ──▶ overlay window (the site's /desktop/ page, non-focusable, always on top)
                     mic → AudioWorklet → VAD → Moonshine/Whisper (WebGPU) → cleanup rules
                     │ window.kelados.insert(text)   (preload.cjs, the only bridge)
                     ▼
main.js ──▶ keys.js: clipboard ← text, OS paste keystroke, clipboard restored
```

- The overlay is the hosted web page, so the desktop app always has the latest models, fixes and settings, and shares
  the model cache and preferences with **Tray → Settings** (the `/dictate/` page in an app window).
- Typing uses the platform's own tools, with no native modules: a long-lived PowerShell `SendKeys` on Windows, `osascript` on
  macOS (allow Kelados under Privacy & Security → Accessibility), `xdotool` on Linux.
- Saying "scratch that" sends an undo keystroke to the target app.
- Security: the bridge only accepts messages from the Kelados origin, windows can't navigate elsewhere, and the
  microphone is only granted to that origin.

## Develop

```bash
npm install
npm run dev     # uses http://localhost:3000 (run `npm run dev` in ../frontend first)
npm start       # uses the hosted site
npm run smoke   # loads the overlay, checks the bridge, exits 0/1 (used in CI)
npm test
npm run dist    # installer for this OS in dist/
```

Releases are built for Windows, macOS and Linux by `.github/workflows/release.yml` when a `v*` tag is pushed.

## Known limits

- Toggle only: Electron's global shortcuts can't detect key release, so there's no hold-to-talk yet.
- Needs the site to be reachable when it starts. Models are cached after the first run.
- Linux terminals paste with Ctrl+Shift+V; most other apps work with the default Ctrl+V.
