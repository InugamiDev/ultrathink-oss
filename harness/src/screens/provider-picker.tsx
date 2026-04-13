// intent: provider selection screen — lets the user pick their CLI/API backend.
//         Shows availability status and persists the choice to config.
// status: done
// confidence: high

import React, { useEffect, useState } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import { PROVIDER_LABELS, type ProviderKind } from "../providers/types.js";
import { detectProviders, createProvider } from "../providers/index.js";
import { loadConfig, setProvider } from "../config.js";
import { setActiveProvider } from "../workers/spawner.js";
import { store } from "../store/store.js";

type ProviderStatus = { kind: ProviderKind; available: boolean };

const ALL_KINDS: ProviderKind[] = ["claude", "codex", "local", "cloud", "stub"];

type ConfigField = null | "model" | "endpoint" | "apiKey";

export function ProviderPicker({ onDone }: { onDone: () => void }) {
  const [providers, setProviders] = useState<ProviderStatus[]>([]);
  const [idx, setIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [configField, setConfigField] = useState<ConfigField>(null);
  const [fieldValue, setFieldValue] = useState("");

  // Detect available providers on mount
  useEffect(() => {
    detectProviders().then((result) => {
      setProviders(result);
      // Default to current config's provider
      const config = loadConfig();
      const currentIdx = ALL_KINDS.indexOf(config.provider.kind);
      if (currentIdx >= 0) setIdx(currentIdx);
      setLoading(false);
    });
  }, []);

  useInput((input, key) => {
    if (configField) {
      if (key.escape) {
        setConfigField(null);
        setFieldValue("");
      }
      return;
    }

    if (key.upArrow) setIdx((i) => Math.max(0, i - 1));
    if (key.downArrow) setIdx((i) => Math.min(ALL_KINDS.length - 1, i + 1));
    if (key.escape) {
      onDone();
      return;
    }
    if (key.return) {
      selectProvider(ALL_KINDS[idx]);
      return;
    }

    // Quick config keys
    if (input === "m") {
      setConfigField("model");
      setFieldValue("");
      return;
    }
    if (input === "e") {
      setConfigField("endpoint");
      setFieldValue("");
      return;
    }
    if (input === "k") {
      setConfigField("apiKey");
      setFieldValue("");
      return;
    }
  });

  const selectProvider = (kind: ProviderKind) => {
    const config = loadConfig();
    const updated = setProvider(kind, {
      model: config.provider.kind === kind ? config.provider.model : undefined,
      endpoint: config.provider.kind === kind ? config.provider.endpoint : undefined,
      apiKey: config.provider.kind === kind ? config.provider.apiKey : undefined,
    });
    const provider = createProvider(updated.provider);
    setActiveProvider(provider);
    store.setProviderKind(kind);
    onDone();
  };

  const submitField = (value: string) => {
    const v = value.trim();
    const kind = ALL_KINDS[idx];
    if (v && configField) {
      setProvider(kind, { [configField]: v });
    }
    setConfigField(null);
    setFieldValue("");
  };

  if (loading) {
    return <Text color="gray">Detecting available providers...</Text>;
  }

  const currentConfig = loadConfig();

  return (
    <Box flexDirection="column">
      <Text color="magenta" bold>
        Provider Selection
      </Text>
      <Text color="gray">Choose which CLI or API backend runs your workers.</Text>

      <Box flexDirection="column" marginTop={1}>
        {ALL_KINDS.map((kind, i) => {
          const status = providers.find((p) => p.kind === kind);
          const available = status?.available ?? false;
          const active = i === idx;
          const isCurrent = currentConfig.provider.kind === kind;
          return (
            <Box key={kind}>
              <Text color={active ? "cyan" : "white"}>{active ? "▶ " : "  "}</Text>
              <Text color={available ? (active ? "cyan" : "white") : "gray"}>{PROVIDER_LABELS[kind].padEnd(22)}</Text>
              <Text color={available ? "green" : "red"}>{available ? "available" : "not found"}</Text>
              {isCurrent && <Text color="yellow">{" (active)"}</Text>}
            </Box>
          );
        })}
      </Box>

      {/* Show current config for selected provider */}
      <Box flexDirection="column" marginTop={1} paddingX={2}>
        <Text color="gray">
          {ALL_KINDS[idx] === currentConfig.provider.kind
            ? `Model: ${currentConfig.provider.model ?? "(default)"} · Endpoint: ${currentConfig.provider.endpoint ?? "(default)"}`
            : `Select to configure ${PROVIDER_LABELS[ALL_KINDS[idx]]}`}
        </Text>
      </Box>

      {configField && (
        <Box flexDirection="column" marginTop={1} borderStyle="round" borderColor="magenta" paddingX={1}>
          <Text color="magenta" bold>
            Set {configField} for {PROVIDER_LABELS[ALL_KINDS[idx]]}:
          </Text>
          <Box>
            <Text color="gray">{"> "}</Text>
            <TextInput value={fieldValue} onChange={setFieldValue} onSubmit={submitField} />
          </Box>
          <Text color="gray">Enter to save · Esc to cancel</Text>
        </Box>
      )}

      <Box marginTop={1}>
        <Text color="gray">↑/↓ select · Enter to use · [m] model · [e] endpoint · [k] api key · Esc back</Text>
      </Box>
    </Box>
  );
}
