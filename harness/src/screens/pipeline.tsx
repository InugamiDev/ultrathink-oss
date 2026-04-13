// intent: main run view. Phase bar, skills, workers, log, context-sensitive
//         shortcuts, and a persistent input field at the bottom for all user input.
// status: done
// confidence: high

import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import { useStore } from "../store/store.js";
import { PhaseBar } from "../ui/phase-bar.js";
import { WorkerPanel } from "../ui/worker-panel.js";
import { SkillPanel } from "../ui/skill-panel.js";
import {
  approvePlan,
  continuePipeline,
  fixFailure,
  giveFeedback,
  improvePhase,
  modifyPhase,
  redoPhase,
  revisePlan,
  shipNow,
  applyIntent,
} from "../actions.js";
import { allowed } from "../pipeline/machine.js";
import type { Intent } from "../pipeline/machine.js";
import type { Phase } from "../pipeline/phases.js";

// intent: map phases to the shortcuts that make sense in that phase.
// Only show keys that map to allowed intents — no dead shortcuts.
const SHORTCUT_MAP: Record<string, { key: string; label: string; intent: Intent }> = {
  c: { key: "c", label: "continue", intent: "continue_pipeline" },
  f: { key: "f", label: "fix", intent: "fix_failure" },
  a: { key: "a", label: "approve", intent: "approve_plan" },
  r: { key: "r", label: "reject", intent: "reject_plan" },
  s: { key: "s", label: "ship", intent: "ship_now" },
  d: { key: "d", label: "redo", intent: "redo" },
  x: { key: "x", label: "abort", intent: "abort" },
};

function activeShortcuts(phase: Phase): typeof SHORTCUT_MAP {
  const intents = new Set(allowed(phase));
  const result: typeof SHORTCUT_MAP = {};
  for (const [k, v] of Object.entries(SHORTCUT_MAP)) {
    if (intents.has(v.intent)) result[k] = v;
  }
  return result;
}

// intent: determine what happens when the user submits text in the input field.
// Phase-sensitive: clarify → answer_clarify, plan → feedback, build+ → feedback.
function inputPlaceholder(phase: Phase, status: string): string {
  if (phase === "clarify" && status === "awaiting-input") {
    return "Answer the clarifying questions, then press Enter...";
  }
  if (phase === "plan" && status === "passed") {
    return "Feedback on the plan (or press [a] to approve)...";
  }
  return "Type feedback for the current phase...";
}

export function PipelineScreen() {
  const { run, mode } = useStore();
  const [inputValue, setInputValue] = useState("");
  const [inputFocused, setInputFocused] = useState(false);

  useInput((input, key) => {
    if (inputFocused) {
      if (key.escape) {
        setInputFocused(false);
        setInputValue("");
      }
      return; // TextInput handles everything else
    }

    if (input === "q") process.exit(0);
    if (!run) return;

    const shortcuts = activeShortcuts(run.phase);
    const shortcut = shortcuts[input];
    if (shortcut) {
      void applyIntent(shortcut.intent);
      return;
    }

    // Enter or Tab focuses the input field
    if (key.return || key.tab) {
      setInputFocused(true);
      return;
    }
  });

  if (!run) return <Text>no run</Text>;

  const shortcuts = activeShortcuts(run.phase);
  const isAwaitingInput = run.phaseStatus === "awaiting-input";

  const submitInput = (value: string) => {
    const v = value.trim();
    setInputFocused(false);
    setInputValue("");
    if (!v) return;

    // Route input based on current phase
    if (run.phase === "clarify") {
      void applyIntent("answer_clarify", { feedback: v });
    } else if (run.phase === "plan") {
      // Text input in plan phase = modification feedback
      void modifyPhase(v);
    } else {
      // Any other phase = general feedback to the worker
      void giveFeedback(v);
    }
  };

  return (
    <Box flexDirection="column">
      <Box>
        <Text color="cyan" bold>
          {truncate(run.intent, 90)}
        </Text>
      </Box>

      <Box marginTop={1}>
        <PhaseBar current={run.phase} status={run.phaseStatus} />
      </Box>

      <Box marginTop={1}>
        <SkillPanel shortlist={run.skillShortlist} compact={mode !== "expert"} />
      </Box>

      <Box flexDirection="column" marginTop={1}>
        <Text color="gray">Workers:</Text>
        <WorkerPanel workers={run.workers} />
      </Box>

      <Box flexDirection="column" marginTop={1}>
        <Text color="gray">Recent activity:</Text>
        {run.log.slice(-6).map((l, i) => (
          <Text
            key={`${l.at}-${i}`}
            color={
              l.level === "error" ? "red" : l.level === "warn" ? "yellow" : l.level === "worker" ? "cyan" : "white"
            }
          >
            [{new Date(l.at).toLocaleTimeString()}] {l.message}
          </Text>
        ))}
      </Box>

      {/* ── Input field — always visible ── */}
      <Box
        flexDirection="column"
        marginTop={1}
        borderStyle="round"
        borderColor={inputFocused ? "cyan" : isAwaitingInput ? "yellow" : "gray"}
        paddingX={1}
      >
        <Text
          color={inputFocused ? "cyan" : isAwaitingInput ? "yellow" : "gray"}
          dimColor={!inputFocused && !isAwaitingInput}
        >
          {inputPlaceholder(run.phase, run.phaseStatus)}
        </Text>
        <Box>
          <Text color={inputFocused ? "cyan" : "gray"}>{"> "}</Text>
          {inputFocused ? (
            <TextInput value={inputValue} onChange={setInputValue} onSubmit={submitInput} />
          ) : (
            <Text color="gray" italic>
              {isAwaitingInput ? "Press Enter or Tab to type..." : "Press Enter or Tab to give feedback..."}
            </Text>
          )}
        </Box>
        {inputFocused && <Text color="gray">Enter to submit · Esc to cancel</Text>}
      </Box>

      {/* ── Context-sensitive shortcuts ── */}
      <Box marginTop={1} flexDirection="column">
        <Box>
          {Object.values(shortcuts).map((s) => (
            <Text key={s.key} color="cyan">
              {"["}
              {s.key}
              {"] "}
              {s.label}
              {"  "}
            </Text>
          ))}
          <Text color="gray">[q] quit</Text>
        </Box>
      </Box>

      {mode === "expert" && (
        <Box marginTop={1} flexDirection="column">
          <Text color="magenta">-- expert panel --</Text>
          <Text color="gray">run id: {run.id}</Text>
          <Text color="gray">project: {run.projectPath}</Text>
          <Text color="gray">created: {new Date(run.createdAt).toLocaleString()}</Text>
          <Text color="gray">workers total: {run.workers.length}</Text>
          <Text color="gray">phase status: {run.phaseStatus}</Text>
        </Box>
      )}
    </Box>
  );
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}
