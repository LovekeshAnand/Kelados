# Integrations

| Folder / file | What it is |
|---|---|
| [`chrome-extension/`](./chrome-extension) | MV3 extension: dictate into Google Docs, Gmail and any web text box |
| [`../frontend/public/kelados-word-manifest.xml`](../frontend/public/kelados-word-manifest.xml) | Microsoft Word add-in manifest; the task pane is the `/word/` page of the frontend |
| [`../desktop/`](../desktop) | Desktop app (Electron): a global shortcut that types into any app, including Claude Code in a terminal |
| [`../sdk/src/mcp.js`](../sdk/src/mcp.js) | MCP server (`npx kelados mcp`) so Claude Code and other agents can speak |

All of them reuse the web app's speech pipeline (`frontend/src/lib/engine` + `frontend/src/lib/speech`), so a fix there fixes
every integration at once.

## Word add-in

1. Download the manifest from `/kelados-word-manifest.xml` on the site.
2. **Word on the web:** Insert → Add-ins → My Add-ins → Upload My Add-in.
   **Word for Windows/Mac:** put the manifest in a shared folder, add it under File → Options → Trust Center → Trusted Add-in
   Catalogs, restart Word, then Insert → My Add-ins → Shared Folder.
3. Home → **Kelados** opens the panel.

## Claude Code

```bash
claude mcp add kelados -- npx -y kelados mcp   # Claude can speak: tools speak, save_speech, list_voices
```

Speak prompts into the terminal with the desktop app (Ctrl+Shift+Space). For a spoken "done" after every turn, add a Stop
hook to `~/.claude/settings.json`:

```json
{ "hooks": { "Stop": [{ "hooks": [{ "type": "command", "command": "npx -y kelados say \"Claude is done\"" }] }] } }
```
