// intent: render the current phase's skill shortlist with layer/category context.
//         Makes it obvious that the TUI is driving real UltraThink skills.
// status: done
// confidence: high

import React from "react";
import { Box, Text } from "ink";
import { getSkill } from "../skills/registry.js";
import { loadRegistry } from "../skills/registry.js";

const LAYER_COLOR: Record<string, string> = {
  orchestrator: "magenta",
  hub: "cyan",
  utility: "yellow",
  domain: "green",
};

export function SkillPanel({
  shortlist,
  compact = false,
}: {
  shortlist: string[];
  compact?: boolean;
}) {
  const total = loadRegistry().skills.length;

  if (shortlist.length === 0) {
    return (
      <Box flexDirection="column">
        <Text color="gray">
          Skills: (no matches from {total} registry entries)
        </Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Text color="gray">
        Skills from registry ({total} total) — shortlisted for this phase:
      </Text>
      {shortlist.slice(0, compact ? 3 : 5).map((name) => {
        const s = getSkill(name);
        if (!s) {
          return (
            <Text key={name} color="red">
              {"  ✗ "}
              {name}
              <Text color="gray">{"  (missing from registry)"}</Text>
            </Text>
          );
        }
        return (
          <Box key={name}>
            <Text color={LAYER_COLOR[s.layer] ?? "white"}>
              {"  ▸ "}
              {s.name.padEnd(20)}
            </Text>
            <Text color="gray">{s.layer.padEnd(13)}</Text>
            <Text color="gray">{truncate(s.description, compact ? 40 : 70)}</Text>
          </Box>
        );
      })}
    </Box>
  );
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}
