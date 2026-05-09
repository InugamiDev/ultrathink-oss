# UltraThink Studio

Desktop app for building software with Claude Code + UltraThink skills + memory. Cross-platform (macOS, Windows, Linux) via Tauri 2.

## What's here

```
apps/studio/
├── src/                  React + Vite frontend
│   ├── App.tsx           Three-pane layout: chat | workspace
│   ├── components/
│   │   ├── ChatPanel.tsx       Chat input + scrolling event stream
│   │   └── EventList.tsx       Typed engine-event renderer
│   ├── lib/
│   │   └── engine-client.ts    Tauri IPC bridge → start/send/stop session
│   ├── styles/global.css       Design tokens + base layout
│   └── types.ts                Frontend mirror of EngineEvent
├── src-tauri/            Rust shell + bundling config
│   ├── src/lib.rs              Tauri commands + Node sidecar bridge
│   ├── tauri.conf.json         App + bundle config (dmg/msi/nsis/deb/appimage)
│   ├── capabilities/main.json  Tauri 2 security permissions
│   └── icons/                  Placeholder icons (regenerate with `tauri icon` for distribution)
├── vite.config.ts        Vite dev server + build (port 1420)
├── package.json
└── tsconfig.json
```

## Architecture

```
   Frontend (React)
        │
        │ Tauri IPC (invoke + listen)
        ▼
   Rust shell (src-tauri/src/lib.rs)
        │
        │ stdio JSON-RPC, line-delimited
        ▼
   Node sidecar (apps/studio-engine/dist/sidecar.js)
        │
        │ child_process.spawn("claude", [...])
        ▼
   Claude Code CLI ─────► your project on disk
```

Each chat session = one Node sidecar process owning one Claude Code spawn. Frontend listens to `engine:event:<sessionId>` Tauri events; backend forwards each line of sidecar stdout as one event payload.

## Run in dev

```bash
# from repo root, ensure deps are in place
pnpm install --filter @inuverse/studio --filter @inuverse/studio-engine

# build the engine + sidecar (the Rust shell looks for it at runtime)
pnpm --filter @inuverse/studio-engine build

# open the app in dev mode (Vite + Tauri together; HMR enabled)
pnpm --filter @inuverse/studio tauri:dev
```

The Vite dev server runs on `http://localhost:1420`; Tauri loads it in a native window.

## Build distributables

```bash
pnpm --filter @inuverse/studio tauri:build
```

Outputs:
- macOS: `src-tauri/target/release/bundle/dmg/UltraThink Studio_0.1.0_*.dmg`
- macOS: `src-tauri/target/release/bundle/macos/UltraThink Studio.app`
- Windows: `src-tauri/target/release/bundle/msi/UltraThink Studio_0.1.0_*.msi`
- Windows: `src-tauri/target/release/bundle/nsis/UltraThink Studio_0.1.0_*-setup.exe`
- Linux: `.deb` and `.AppImage`

## Before distributing

- Replace placeholder icons via `pnpm --filter @inuverse/studio tauri icon path/to/source-1024.png`
- Set up code-signing (task #95): Apple Developer cert for macOS notarization, EV cert for Windows
- Configure auto-update endpoint in `tauri.conf.json` (task #95)
- Bundle the engine sidecar as a Tauri resource so it ships with the app (currently dev-only, walks up the binary path to find it)

## What's wired today

- Chat panel: text input + event-stream rendering
- Engine sidecar bridge: start, send-followup, stop
- Project resolution under `~/Studio/projects/<slug>/`
- Skill auto-routing (top-3 contextual)
- Memory MCP injection scoped to project session id

## What's stubbed

- Workspace pane (Files / Memory tabs are placeholders — see tasks #86, #88)
- Live preview iframe (#87)
- Knowledge graph (#88)
- Global shortcut summoner (#89)
- Deploy adapters (#90)
