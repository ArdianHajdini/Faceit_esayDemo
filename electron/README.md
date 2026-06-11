# FACEIT Demo Manager — Electron (Windows Desktop)

This folder wraps the React web app into a native Windows desktop application using Electron.

## How it works

```
artifacts/demo-manager/   ← React + Vite web app (runs in Electron renderer)
electron/
  src/main.ts             ← Electron main process (window, file dialogs, .cfg writer)
  src/preload.ts          ← Exposes native APIs to the renderer safely
  electron-builder.json   ← Windows installer config
  package.json
.github/workflows/
  build-windows.yml       ← GitHub Actions: builds .exe on every push to main
```

## Build a Windows installer via GitHub Actions

1. **Push this repo to GitHub.**
2. GitHub Actions automatically runs on every push to `main`.
3. The workflow:
   - Installs Node 20 + pnpm
   - Builds the React frontend (`pnpm run build:frontend`)
   - Compiles the Electron main process (`pnpm run build:main`)
   - Packages everything with `electron-builder` → produces a `.exe` NSIS installer + portable `.exe`
4. **Download the installer** from the **Actions** tab → your workflow run → **Artifacts** → `faceit-demo-manager-windows`.

### Trigger a release with auto-generated notes

Tag a commit and push:

```bash
git tag v1.0.0
git push origin v1.0.0
```

GitHub Actions will build the installer and automatically create a GitHub Release with the `.exe` attached.

## Local development

To run in Electron locally (requires Windows or macOS with Wine, or a native Windows machine):

```bash
cd electron
pnpm install
pnpm run build
pnpm run start
```

## Extras the desktop version adds over the web app

| Feature | Web | Desktop |
|---------|-----|---------|
| Native file picker for .dem/.gz | Manual path input | Click "Browse" → opens file dialog |
| Browse for watched folder | Manual path input | Click "Browse" → opens folder dialog |
| Write `.cfg` aliases to CS2 | Clipboard copy only | Writes `demohelper_last.cfg` directly to CS2/game/csgo/cfg |
| Validate CS2 path exists | No | Yes (checks filesystem) |

The React frontend detects `window.electronAPI` at runtime — if it's present (desktop), native buttons appear; if absent (web), it gracefully falls back to the manual path input.
