// intent: single source of truth for actor formatting across dashboard, Discord bot, and CLI
// status: done
// next: wire into activity log rows, Discord embeds, CLI output
// confidence: high
//
// Convention (M6):
//   - Agents render as `Name [Title]` (e.g. `Steven [CEO]`)
//   - Humans render as `Name` (no brackets)
//   - System actor renders as the literal string `system`
//
// All formatters MUST go through `formatActor()`. Do not concatenate
// agent names + titles by hand — the bracket convention is data-level,
// not display-level.

export type AgentActor = {
  type: "agent";
  id: string;
  name: string;
  title: string;
};

export type HumanActor = {
  type: "human";
  id: string;
  name: string;
  discordUserId?: string;
};

export type SystemActor = {
  type: "system";
  name: "system";
};

export type Actor = AgentActor | HumanActor | SystemActor;

export function formatActor(actor: Actor): string {
  if (actor.type === "agent" && actor.title) {
    return `${actor.name} [${actor.title}]`;
  }
  return actor.name;
}

export function isAgent(actor: Actor): actor is AgentActor {
  return actor.type === "agent";
}

export function isHuman(actor: Actor): actor is HumanActor {
  return actor.type === "human";
}
