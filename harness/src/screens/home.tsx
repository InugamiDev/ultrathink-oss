// intent: top-level screen router — picker when no run, pipeline when run exists,
//         provider picker on [p] key. Shows active provider in the status area.
// status: done
// confidence: high

import React, { useEffect, useState } from "react";
import { useInput } from "ink";
import { IntentPicker } from "./intent-picker.js";
import { PipelineScreen } from "./pipeline.js";
import { ProviderPicker } from "./provider-picker.js";
import { useStore } from "../store/store.js";
import { store } from "../store/store.js";
import { loadConfig } from "../config.js";
import { createProvider } from "../providers/index.js";
import { setActiveProvider } from "../workers/spawner.js";

export function Home() {
  const { run, screen } = useStore();
  const [initialized, setInitialized] = useState(false);

  // Load provider from config on first render
  useEffect(() => {
    if (!initialized) {
      const config = loadConfig();
      store.setProviderKind(config.provider.kind);
      const provider = createProvider(config.provider);
      setActiveProvider(provider);
      setInitialized(true);
    }
  }, [initialized]);

  useInput((input) => {
    // [p] opens provider picker from any screen except when already there
    if (input === "p" && screen !== "provider") {
      store.setScreen("provider");
    }
    if (input === "n" && run && screen === "pipeline") {
      store.setScreen("picker");
    }
    if (input === "q" && screen === "picker") process.exit(0);
  });

  if (screen === "provider") {
    return (
      <ProviderPicker
        onDone={() => {
          store.setScreen(run ? "pipeline" : "picker");
        }}
      />
    );
  }

  if (screen === "picker" || !run) {
    return (
      <IntentPicker
        onDone={() => {
          store.setScreen("pipeline");
        }}
      />
    );
  }

  return <PipelineScreen />;
}
