// intent: React entry — mounts <App/> into #root, imports global styles
// status: done
// confidence: high

import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App.js";
import { installTelemetry } from "./lib/telemetry.js";
import { migrateKeysFromLocalStorage } from "./lib/keychain.js";
import "./styles/global.css";

installTelemetry();
// Best-effort one-time copy from localStorage → OS keychain. Idempotent: gated
// by a flag in localStorage so subsequent boots no-op. Don't await — the app
// must render even if the keychain is unavailable.
void migrateKeysFromLocalStorage();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
