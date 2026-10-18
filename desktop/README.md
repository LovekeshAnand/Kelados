# Kelados for desktop

Press **Ctrl+Shift+Space** (⌘+Shift+Space on macOS), talk, and Kelados types into whatever app has focus: Slack, VS Code,
Word, your browser, a terminal running Claude Code. Press it again to stop.

## Install or update

```powershell
irm https://kelados.in/install.ps1 | iex          # Windows (PowerShell)
```

```bash
curl -fsSL https://kelados.in/install.sh | sh      # macOS and Linux (Terminal)
```

Or download an installer from [kelados.in/download](https://kelados.in/download/). Installed apps also offer updates from
a notification and the tray menu; both paths run the same script and keep your settings and history.

macOS: the app isn't notarized by Apple yet, so `install.sh` signs it locally (ad hoc, no Apple account needed) and clears
the download flag. Allow **Microphone** and **Accessibility** when asked.

## Shortcuts

| Shortcut | Does |
|---|---|
| Ctrl+Shift+Space | Start or stop dictation |
| Ctrl+Alt+S | Read the selected text aloud (again to stop) |
| Ctrl+Alt+R | Rewind: type what you said in the last 30 seconds (only while Rewind is on in Settings) |

While dictating, a phrase said on its own can edit what's already typed ("no no, make it Saturday", "change coffee to
tea", "make that a bullet list") or press a key ("press enter", "send it", "select all").

## How it works

```
global shortcut ──▶ overlay window (the site's /desktop/ page, non-focusable, always on top)
                     mic → AudioWorklet → VAD → Moonshine / Whisper → cleanup rules → voice edits
                     │ window.kelados.insert / replace / key   (preload.cjs, the only bridge)
                     ▼
main.js ──▶ keys.js: clipboard ← text, OS paste keystroke, clipboard restored
                     (voice edits: Backspace over Kelados' own text, then paste the fix)
```

- The overlay and the main window (`/app/`: history, dictionary, meeting notes, style, settings, help) are hosted web
  pages, so the app always has the latest models and fixes. They share one origin, so settings apply live.
- Typing uses the platform's own tools, with no native modules: a long-lived PowerShell `SendKeys` on Windows, `osascript` on
  macOS, `xdotool` on Linux. The clipboard is restored after every paste.
- Voice edits only reach back within the current dictation, and rely on the cursor still being where Kelados left it.
- Speech runs multi-threaded on the CPU (the site is cross-origin isolated), which on laptops is faster and lighter than
  WebGPU. The read-aloud voice loads on first use and is released after 10 idle minutes.
- Rewind keeps the last 30 seconds of microphone audio in memory only. It is off by default because the microphone stays
  on while it's enabled.
- Updates: `update.js` checks GitHub Releases on launch and daily; installing runs the public install script, which
  closes the app, installs over it and starts the new version.
- Security: the bridge only accepts messages from the Kelados origin, windows can't navigate elsewhere, the microphone is
  only granted to that origin, and each listener is registered once (a page reloading can't double it).

## Develop

```bash
npm install
npm run dev     # uses http://localhost:3000 (run `npm run dev` in ../frontend first)
npm start       # uses the hosted site
npm run smoke   # loads the overlay, checks the bridge, exits 0/1 (used in CI)
npm test
npm run dist    # installer for this OS in dist/
```

Releases for Windows, Linux and macOS (unsigned zip) are built by `.github/workflows/release.yml` when a `v*` tag is pushed.

## Known limits

- Toggle only: Electron's global shortcuts can't detect key release, so there's no hold-to-talk yet.
- Needs the site to be reachable when it starts. Models are cached after the first run.
- Voice edits count characters by code point; apps that delete an emoji sequence or a Devanagari cluster with one
  Backspace can lose one extra character.
- Linux terminals paste with Ctrl+Shift+V; most other apps work with the default Ctrl+V.
