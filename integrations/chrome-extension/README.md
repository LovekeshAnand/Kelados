# Kelados for Chrome

Dictate into Google Docs, Gmail, Notion, ChatGPT, claude.ai and any other text box on the web.

## Install (unpacked)

1. Download `kelados-chrome.zip` from the latest [release](https://github.com/LovekeshAnand/Kelados/releases/latest) and unzip it, or use this folder directly.
2. Open `chrome://extensions`, turn on **Developer mode**, click **Load unpacked**, and choose the folder.
3. In any tab, click into a text field and press **Alt+Shift+D** (or click the Kelados icon).
4. Allow the microphone once in the small Kelados window. Talk; each phrase is typed at your cursor. Press the shortcut again or close the window to stop.

## How it works

- `background.js` opens `https://kelados.lovekeshanand6.workers.dev/extension/` in a small popup window. Speech recognition runs there,
  on your device, with the same models and settings as the website.
- The page sends each finished phrase to the extension (`externally_connectable`), and `insert.js` is injected into the tab you
  started from to type it at the caret. Google Docs gets a synthetic paste into its hidden input frame.
- Permissions: `activeTab` and `scripting` only act on the tab where you pressed the shortcut; `storage` remembers the session.

## Development

Run the frontend locally (`cd frontend && npm run dev`), then in the extension's service-worker console:

```js
chrome.storage.local.set({ dev: true }); // use http://localhost:3000 instead of the hosted site
```

Self-hosting: change `KELADOS` in `background.js` and the URL in `manifest.json` → `externally_connectable`.
