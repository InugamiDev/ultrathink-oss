// intent: first screen — project directory display, template grid, free prompt.
//         Shows where the harness will operate and lets users change it.
// status: done
// confidence: high

import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import { listTemplates } from "../skills/templates.js";
import { startProject } from "../actions.js";
import { getProjectDir, setProjectDir, projectName, discoverProjects } from "../project.js";

type Mode = "menu" | "prompt" | "dir-list" | "dir-input";

export function IntentPicker({ onDone }: { onDone: () => void }) {
  const templates = listTemplates();
  const [mode, setMode] = useState<Mode>("menu");
  const [idx, setIdx] = useState(0);
  const [value, setValue] = useState("");
  const [dirIdx, setDirIdx] = useState(0);
  const [projects] = useState(() => discoverProjects());

  useInput((input, key) => {
    if (mode === "dir-input") {
      if (key.escape) {
        setMode("menu");
        setValue("");
      }
      return;
    }

    if (mode === "dir-list") {
      if (key.escape) {
        setMode("menu");
        return;
      }
      if (key.upArrow) setDirIdx((i) => Math.max(0, i - 1));
      if (key.downArrow) setDirIdx((i) => Math.min(projects.length, i + 1));
      if (key.return) {
        if (dirIdx === projects.length) {
          // "Type a path..." option
          setMode("dir-input");
          setValue("");
          return;
        }
        try {
          setProjectDir(projects[dirIdx].path);
        } catch {
          // ignore invalid
        }
        setMode("menu");
      }
      return;
    }

    if (mode === "prompt") {
      if (key.escape) {
        setMode("menu");
        setValue("");
      }
      return;
    }

    // Menu mode
    if (key.upArrow) setIdx((i) => Math.max(0, i - 1));
    if (key.downArrow) setIdx((i) => Math.min(templates.length, i + 1));
    if (key.return) {
      if (idx === templates.length) {
        setMode("prompt");
        return;
      }
      const tpl = templates[idx];
      startProject(tpl.intent, tpl.id);
      onDone();
    }
    if (input === "d") {
      setMode("dir-list");
      return;
    }
    if (input === "q") process.exit(0);
  });

  // ── Directory input mode ──
  if (mode === "dir-input") {
    return (
      <Box flexDirection="column">
        <Text color="cyan" bold>
          Enter project path:
        </Text>
        <Box marginTop={1}>
          <Text color="gray">{"> "}</Text>
          <TextInput
            value={value}
            onChange={setValue}
            onSubmit={(v) => {
              const trimmed = v.trim();
              if (trimmed) {
                try {
                  setProjectDir(trimmed);
                } catch {
                  // ignore
                }
              }
              setMode("menu");
              setValue("");
            }}
          />
        </Box>
        <Box marginTop={1}>
          <Text color="gray">Enter to confirm · Esc to cancel</Text>
        </Box>
      </Box>
    );
  }

  // ── Directory picker mode ──
  if (mode === "dir-list") {
    return (
      <Box flexDirection="column">
        <Text color="cyan" bold>
          Select project directory
        </Text>
        <Text color="gray">Found {projects.length} projects in common locations.</Text>
        <Box flexDirection="column" marginTop={1}>
          {projects.slice(Math.max(0, dirIdx - 8), dirIdx + 8).map((p, i) => {
            const realIdx = Math.max(0, dirIdx - 8) + i;
            const active = realIdx === dirIdx;
            return (
              <Box key={p.path}>
                <Text color={active ? "cyan" : "white"}>
                  {active ? "▶ " : "  "}
                  {p.name.padEnd(25)}
                </Text>
                <Text color="gray">{p.hasGit ? "git " : "    "}</Text>
                <Text color="gray" dimColor>
                  {p.path.replace(process.env.HOME ?? "", "~")}
                </Text>
              </Box>
            );
          })}
          <Box>
            <Text color={dirIdx === projects.length ? "cyan" : "white"}>
              {dirIdx === projects.length ? "▶ " : "  "}
            </Text>
            <Text italic color={dirIdx === projects.length ? "cyan" : "white"}>
              Type a path...
            </Text>
          </Box>
        </Box>
        <Box marginTop={1}>
          <Text color="gray">↑/↓ to move · Enter to select · Esc to cancel</Text>
        </Box>
      </Box>
    );
  }

  // ── Free prompt mode ──
  if (mode === "prompt") {
    return (
      <Box flexDirection="column">
        <Text color="cyan" bold>
          Describe what you want to build:
        </Text>
        <Box marginTop={1}>
          <Text color="gray">{"> "}</Text>
          <TextInput
            value={value}
            onChange={setValue}
            onSubmit={(v) => {
              if (v.trim().length === 0) return;
              startProject(v.trim());
              onDone();
            }}
          />
        </Box>
        <Box marginTop={1}>
          <Text color="gray">Enter to submit · Esc to go back</Text>
        </Box>
      </Box>
    );
  }

  // ── Template menu mode ──
  return (
    <Box flexDirection="column">
      <Text color="cyan" bold>
        UltraThink UY Edition — start project
      </Text>

      {/* Project directory badge */}
      <Box marginTop={1}>
        <Text color="gray">Project: </Text>
        <Text color="yellow" bold>
          {projectName()}
        </Text>
        <Text color="gray" dimColor>
          {"  "}
          {getProjectDir().replace(process.env.HOME ?? "", "~")}
        </Text>
        <Text color="gray">{"  [d] change"}</Text>
      </Box>

      <Box flexDirection="column" marginTop={1}>
        {templates.map((t, i) => (
          <Box key={t.id}>
            <Text color={i === idx ? "cyan" : "white"}>
              {i === idx ? "▶ " : "  "}
              {t.name.padEnd(18)}
            </Text>
            <Text color="gray">{t.description}</Text>
            {t.skill && (
              <Text color="magenta">
                {" · "}
                {t.skill.name}
              </Text>
            )}
          </Box>
        ))}
        <Box>
          <Text color={idx === templates.length ? "cyan" : "white"}>{idx === templates.length ? "▶ " : "  "}</Text>
          <Text italic color={idx === templates.length ? "cyan" : "white"}>
            Describe your own...
          </Text>
        </Box>
      </Box>

      <Box marginTop={1}>
        <Text color="gray">↑/↓ to move · Enter to pick · [d] change directory · [q] quit</Text>
      </Box>
    </Box>
  );
}
