// intent: public surface of the studio engine package
// status: done
// next: re-exports stable; expand once GUI consumers need internals
// confidence: high

export { createSpawn } from "./spawn.js";
export { resolveProject, listProjects, studioRoot } from "./project.js";
export { routeSkills, findUltrathinkRoot } from "./skill-router.js";
export { buildMcpConfig, deriveSessionId } from "./mcp-config.js";
export { JsonlStreamParser, normaliseClaudeEvent } from "./parse.js";
export type { EngineEvent, SpawnOptions, SpawnHandle, SkillRouterDecision, MemoryMcpEntry } from "./types.js";
export type { EngineConfig } from "./spawn.js";
export type { ProjectInfo, ResolveOptions } from "./project.js";
export type { McpConfigOptions, McpServerEntry } from "./mcp-config.js";
export type { RouteOptions } from "./skill-router.js";
