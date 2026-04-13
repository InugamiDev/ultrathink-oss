// intent: shows active workers and what each is currently doing.
// status: done
// confidence: high

import React from "react";
import { Box, Text } from "ink";
import type { WorkerInfo, WorkerStatus } from "../store/types.js";

const COLOR: Record<WorkerStatus, string> = {
  idle: "gray",
  busy: "yellow",
  done: "green",
  crashed: "red",
};

export function WorkerPanel({ workers }: { workers: WorkerInfo[] }) {
  if (workers.length === 0) {
    return <Text color="gray">  (no workers yet)</Text>;
  }
  return (
    <Box flexDirection="column">
      {workers.slice(-5).map((w) => (
        <Box key={w.id}>
          <Text color={COLOR[w.status]}>● </Text>
          <Text color="white">{w.id} </Text>
          <Text color="cyan">{w.skill ?? "(no skill)"}</Text>
          <Text color="gray">{"  — "}{w.currentAction ?? w.status}</Text>
        </Box>
      ))}
    </Box>
  );
}
