// intent: horizontal pipeline indicator. Renders the 5 visible phases.
// status: done
// confidence: high

import React from "react";
import { Box, Text } from "ink";
import { PHASE_LABEL, PHASE_ORDER, type Phase } from "../pipeline/phases.js";
import type { PhaseStatus } from "../pipeline/phases.js";

export function PhaseBar({
  current,
  status,
}: {
  current: Phase;
  status: PhaseStatus;
}) {
  const currentIdx = PHASE_ORDER.indexOf(current);
  return (
    <Box>
      {PHASE_ORDER.map((p, i) => {
        const active = p === current;
        const done = currentIdx > i;
        const color = done ? "green" : active ? "cyan" : "gray";
        const marker = done ? "✓" : active ? "●" : "○";
        return (
          <React.Fragment key={p}>
            <Text color={color}>
              {marker} {PHASE_LABEL[p]}
            </Text>
            {i < PHASE_ORDER.length - 1 && (
              <Text color="gray">{"  →  "}</Text>
            )}
          </React.Fragment>
        );
      })}
      <Text color="gray">{`   [${status}]`}</Text>
    </Box>
  );
}
