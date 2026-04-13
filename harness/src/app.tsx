// intent: top-level app shell. Shows header with active provider badge.
//         Importing ./workers/runner registers the bus → store wiring as a side-effect.
// status: done
// confidence: high

import React from "react";
import { Box, Text } from "ink";
import { Home } from "./screens/home.js";
import { useStore } from "./store/store.js";
import { PROVIDER_LABELS } from "./providers/types.js";
import "./workers/runner.js";

export function App() {
  const { providerKind } = useStore();
  return (
    <Box flexDirection="column" paddingX={1} paddingY={0}>
      <Box marginBottom={1}>
        <Text color="magenta" bold>
          {"⬢ UltraThink UY Edition"}
        </Text>
        <Text color="gray">{"  —  "}</Text>
        <Text color="cyan">{PROVIDER_LABELS[providerKind]}</Text>
        <Text color="gray">{"  [p] switch provider"}</Text>
      </Box>
      <Home />
    </Box>
  );
}
