---
name: openviking
description: OpenViking context database for AI agents — filesystem-paradigm context management with tiered loading (L0/L1/L2), hierarchical retrieval, and automatic session memory. Alternative/complement to flat RAG for agent context.
triggers:
  - "context database"
  - "agent context"
  - "openviking"
  - "hierarchical context"
  - "viking context"
  - "context management agent"
  - "tiered context"
linksTo:
  - "rag"
  - "ai-agents"
  - "context-engineering"
---

# OpenViking — Context Database for AI Agents

> Open-source context management system using filesystem paradigm for AI agents.
> Source: https://github.com/volcengine/OpenViking | Stars: 6K+

## Core Concept

OpenViking treats agent context like a filesystem (`viking://` protocol):
- **L0**: One-sentence summary (always loaded)
- **L1**: ~2K token overview (loaded on demand)
- **L2**: Full details (loaded when deep dive needed)

Reduces token consumption vs loading full context every turn.

## Installation

```bash
pip install openviking --upgrade --force-reinstall
```

Requirements: Python 3.10+, Go 1.22+, C++ compiler

**Config** (`~/.openviking/ov.conf`):
```toml
[embedding]
provider = "openai"  # or volcengine, litellm

[vlm]
provider = "openai"
model = "gpt-4o"
```

## Key CLI Commands

```bash
# Add a resource to the context DB
ov add-resource ./docs/architecture.md --tags "architecture,backend"

# Search context
ov find "authentication patterns"
ov grep "database schema"

# Start VikingBot agent
ov bot start
```

## Architecture

```
viking://
├── memories/          # Session memories (auto-extracted)
├── resources/         # Documents, code, specs
├── skills/            # Agent capabilities
└── preferences/       # User/project preferences
```

## Tiered Retrieval Flow

1. Lock high-score directory (vector search over L0 summaries)
2. Refine: load L1 overviews of top directories
3. Zoom in: load L2 full content only when needed
4. Track: every retrieval trajectory is logged (transparent RAG)

## vs UltraThink Memory

| Feature | UltraThink | OpenViking |
|---------|-----------|-----------|
| Storage | Neon Postgres + pgvector | Filesystem + vector index |
| Retrieval | Category/scope SQL | Hierarchical directory |
| Context tiers | Single level | L0/L1/L2 progressive |
| Session mgmt | Custom hooks | Built-in auto-extract |
| Language | TypeScript | Python + Go |

## Integration Pattern

OpenViking can serve as the **resource/document** layer for UltraThink — store large reference docs in OpenViking for efficient tiered retrieval while UltraThink handles episodic memory (solutions, patterns, decisions).

```bash
# Index UltraThink skills into OpenViking
ov add-resource .claude/skills/ --recursive --tags "skills"
ov add-resource memory/src/ --tags "memory,typescript"
```
