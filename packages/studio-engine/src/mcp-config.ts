// intent: generate a per-spawn .mcp.json wiring UltraThink memory + any extra MCPs
// status: done
// next: add code-intel + design-doc MCPs to the default set once they're stable in stdio mode
// confidence: high
//
// Each Studio project gets a stable session id; memory MCP is invoked with that
// id so memories are project-scoped. Returns the path to a temp config file the
// engine passes to claude via --mcp-config.

import { mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

export interface McpServerEntry {
  command: string;
  args?: string[];
  env?: Record<string, string>;
  type?: "stdio" | "http" | "sse";
  url?: string;
}

export interface McpConfigOptions {
  /** Project session id; passed to memory MCP via PAPERCLIP_AGENT_ID-style env. */
  sessionId: string;
  /** Postgres connection string for the memory backend. */
  databaseUrl: string;
  /** Absolute path to the UltraThink root (memory MCP server lives there). */
  ultrathinkRoot: string;
  /** Optional extra MCP servers to merge in. */
  extras?: Record<string, McpServerEntry>;
}

/**
 * Build the in-memory mcp config and write it to a temp file. Returns the
 * absolute path. Caller is responsible for cleanup once the spawn finishes.
 */
export async function buildMcpConfig(opts: McpConfigOptions): Promise<string> {
  const memoryServer: McpServerEntry = {
    type: "stdio",
    command: "node",
    args: [join(opts.ultrathinkRoot, "mcp/memory/dist/index.js")],
    env: {
      DATABASE_URL: opts.databaseUrl,
      ULTRATHINK_SESSION_ID: opts.sessionId,
      ULTRATHINK_PROJECT_ROOT: opts.ultrathinkRoot,
    },
  };

  const config = {
    mcpServers: {
      memory: memoryServer,
      ...(opts.extras ?? {}),
    },
  };

  const dir = join(tmpdir(), "ultrathink-studio");
  await mkdir(dir, { recursive: true });
  const path = join(dir, `mcp-${randomUUID()}.json`);
  await writeFile(path, JSON.stringify(config, null, 2), "utf8");
  return path;
}

/** Stable session id derivation from a project directory — lets follow-ups resume. */
export function deriveSessionId(projectDir: string): string {
  // Uses a v5-style stable hash of the project path so the same dir always
  // resolves to the same session id across launches.
  const path = projectDir.replace(/\/+$/, "");
  const hash = simpleHash(path);
  // Format as UUID v4 placeholder; Claude Code accepts any UUID.
  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    "4" + hash.slice(13, 16),
    "8" + hash.slice(17, 20),
    hash.slice(20, 32),
  ].join("-");
}

function simpleHash(input: string): string {
  // FNV-1a 64-bit, expressed as 32 hex chars by doubling. Not crypto, but
  // deterministic and fast — fine for session id derivation.
  let h1 = 0xcbf29ce4n;
  let h2 = 0x84222325n;
  const prime = 0x100000001b3n;
  for (let i = 0; i < input.length; i++) {
    const c = BigInt(input.charCodeAt(i));
    h1 = BigInt.asUintN(64, (h1 ^ c) * prime);
    h2 = BigInt.asUintN(64, (h2 ^ (c + 1n)) * prime);
  }
  const hex = (n: bigint) => n.toString(16).padStart(16, "0");
  return (hex(h1) + hex(h2)).slice(0, 32);
}
