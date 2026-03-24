# Dashboard

A local-first observability and control center built with Next.js 15, React 19, and Tailwind CSS v4, running on `localhost:3333`.

## Tech Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| Framework | Next.js (App Router) | 15.1+ |
| UI Library | React | 19.0+ |
| Styling | Tailwind CSS | v4 |
| Charts | Recharts | 2.15+ |
| Icons | Lucide React | 0.469+ |
| Database | @neondatabase/serverless | 0.10+ |
| Language | TypeScript | 5.7+ |

## Design System

Dark control-center theme:

- **Background**: Dark slate
- **Text**: Light gray on dark
- **Accent**: Warm amber/orange for interactive elements
- **Health indicators**: Green (healthy), amber (warning), red (critical)
- **Cards**: Bordered with subtle shadow, low-glow effects
- **Layout**: Left sidebar (256px) + top header + main content area

## Pages

### Home (`/`)

At-a-glance system health: memory count, active plans, skill invocations, hook events. Recent plans with status badges, memory health, and quick actions.

### Analytics (`/analytics`)

Usage analytics: command and skill usage charts, success/failure ratios, memory read/write activity over time, session statistics, and week-over-week trends.

### Skills (`/skills`)

Skill catalog and graph: searchable/filterable list of all skills, visual mesh showing connections, layer filter, skill detail panel with metadata and triggers, dependency viewer, and orphan detection.

### Plans (`/plans`)

Plan management: plan list with status and task count, rendered Markdown preview, status transitions, validation, archiving with journal generation, and linked memories.

### Kanban (`/kanban`)

Visual project board: 7 columns (Backlog through Archived), task cards with priority badges, drag-and-drop, board selector, filtering by assignee/label/priority, and plan links.

### Testing (`/testing`)

UI test management: past test runs, viewport matrix (pass/warn/fail), screenshot gallery with zoom, rendered Markdown reports, and side-by-side comparison view.

### Memory (`/memory`)

Memory browser: searchable list with category/importance/confidence badges, full-text search, category filter, memory detail with tags and relations, health dashboard, and tag cloud.

### Hooks (`/hooks`)

Privacy and security monitoring: chronological event log, severity/action filters, blocked attempt highlights, event statistics, and incident tracker.

### Settings (`/settings`)

Configuration: `ck.json` editor with validation, `.ckignore` editor, coding level selector, language setting, notification channel config, dashboard preferences, and memory settings.

### Health (`/api/health`)

System diagnostics: database connectivity and latency, memory index health, hook execution status, skill registry integrity, dashboard build status, and disk usage.

## API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/health` | GET | System health check |
| `/api/analytics` | GET | Usage statistics and trends |
| `/api/skills` | GET | Skill registry and metadata |
| `/api/plans` | GET, POST | Plan CRUD |
| `/api/kanban` | GET, POST, PATCH | Task management |
| `/api/memory` | GET, POST, PATCH, DELETE | Memory CRUD and search |
| `/api/hooks` | GET | Hook event log and statistics |

## Running the Dashboard

```bash
# Development (hot reload)
npm run dashboard:dev

# Production
npm run dashboard:build
cd dashboard && npm run start
```

Requires `DATABASE_URL` in `.env` for data-backed features. Without it, the dashboard loads but shows empty states.
