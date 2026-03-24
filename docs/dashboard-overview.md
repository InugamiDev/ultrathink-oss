# Dashboard Overview

## Overview

The UltraThink Dashboard is a local-first observability and control center built with Next.js 15 App Router, React 19, and Tailwind CSS v4. It runs on `localhost:3333` and provides real-time visibility into the skill mesh, memory, plans, hooks, and system health.

The dashboard is **not decorative**. It is an operational control plane where you can inspect skill connections, browse memory, manage tasks, review hook events, and configure the system.

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

The dashboard uses a dark control-center theme:

- **Background**: Dark slate (`--color-bg`)
- **Text**: Light gray on dark (`--color-text`)
- **Accent**: Warm amber/orange for interactive elements and highlights
- **Health indicators**: Green (healthy), amber (warning), red (critical)
- **Cards**: Bordered with subtle shadow, low-glow effects
- **Typography**: System font stack, antialiased rendering

The layout follows a standard dashboard pattern:
- **Left sidebar** (256px / `pl-64`): Navigation links to all pages
- **Top header**: Breadcrumb, project name, quick actions
- **Main content area**: Page-specific content with 2rem padding

## Architecture

```
dashboard/
  app/
    layout.tsx          # Root layout with Sidebar + Header
    page.tsx            # Home page
    globals.css         # Tailwind CSS v4 theme and variables
    analytics/page.tsx  # Analytics page
    skills/page.tsx     # Skills page
    plans/page.tsx      # Plans page
    kanban/page.tsx     # Kanban page
    testing/page.tsx    # Testing page
    memory/page.tsx     # Memory page
    hooks/page.tsx      # Hooks page
    settings/page.tsx   # Settings page
    api/
      analytics/route.ts  # Analytics API
      health/route.ts     # Health check API
      hooks/route.ts      # Hook events API
      kanban/route.ts     # Kanban tasks API
      memory/route.ts     # Memory CRUD API
      plans/route.ts      # Plans API
      skills/route.ts     # Skills registry API
  components/
    layout/
      sidebar.tsx       # Navigation sidebar
      header.tsx        # Top header bar
    charts/             # Recharts wrapper components
    kanban/             # Kanban board components
  lib/                  # Shared utilities and database client
```

## Pages

### 1. Home (`/`)

The landing page provides an at-a-glance view of system health:

- **Health cards**: Memory count, active plans, skill invocations, hook events
- **Recent plans**: Last 5 plans with status badges
- **Memory health**: Total memories, average importance, compaction state
- **Test health**: Latest test run results
- **Hook activity**: Recent hook events with severity badges
- **Quick actions**: Links to common operations

### 2. Analytics (`/analytics`)

Usage analytics and trends:

- **Command usage**: Most-used commands with bar chart
- **Skill usage**: Most-invoked skills with invocation counts
- **Success/failure ratios**: Skill reliability metrics
- **Memory activity**: Read/write operations over time
- **Session statistics**: Daily session counts and duration
- **Trend lines**: Week-over-week comparison

### 3. Skills (`/skills`)

The skill catalog and connection graph:

- **Skill catalog**: Searchable, filterable list of all 104 skills
- **Skill graph**: Visual mesh showing skill connections (nodes = skills, edges = links)
- **Layer filter**: View skills by layer (orchestrator, hub, utility, domain)
- **Skill detail panel**: Click a skill to see its metadata, links, triggers, and recent usage
- **Dependency viewer**: See what a skill depends on and what depends on it
- **Orphan detection**: Highlight skills with no incoming or outgoing links

### 4. Plans (`/plans`)

Plan management and tracking:

- **Plan list**: All plans with status, creation date, and associated task count
- **Plan preview**: Rendered Markdown of the plan document
- **Status management**: Change plan status (draft -> active -> completed -> archived)
- **Validation**: Run `/plan:validate` from the dashboard
- **Archive**: Archive plans with journal generation
- **Related memories**: Memories linked to each plan

### 5. Kanban (`/kanban`)

Visual project board:

- **7 columns**: Backlog, Planned, In Progress, Blocked, Review, Done, Archived
- **Task cards**: Title, priority badge, assignee, labels, due date
- **Drag and drop**: Move tasks between columns (optional)
- **Board selector**: Switch between different boards
- **Filtering**: Filter by assignee, label, priority, or due date
- **Plan links**: Click through to associated plans

### 6. Testing (`/testing`)

UI test management:

- **Test runs**: List of past test runs with date, URL, and overall status
- **Viewport matrix**: Pass/warn/fail grid for each route/viewport combination
- **Screenshot gallery**: Browse captured screenshots with zoom
- **Report viewer**: Rendered Markdown test reports
- **Comparison view**: Side-by-side before/after screenshot comparison

### 7. Memory (`/memory`)

Memory browser and health:

- **Memory list**: Recent memories with category, importance, and confidence badges
- **Search**: Full-text search across memory content
- **Category filter**: Filter by decision, pattern, solution, etc.
- **Memory detail**: Full content, tags, relations, access history
- **Health dashboard**: Total count, average confidence, stale memories, compaction state
- **Tag cloud**: Visual representation of most-used tags

### 8. Hooks (`/hooks`)

Privacy and security monitoring:

- **Event log**: Chronological list of hook events with severity badges
- **Severity filter**: Filter by info, warning, critical
- **Action filter**: Filter by allowed, blocked, prompted
- **Blocked attempts**: Highlighted list of recently blocked access
- **Statistics**: Events by type, severity distribution, blocked rate
- **Incident tracker**: Security incidents escalated from hook events

### 9. Settings (`/settings`)

System configuration:

- **ck.json editor**: Edit the main configuration file with validation
- **.ckignore editor**: Edit privacy patterns
- **Coding level**: Switch between beginner/intermediate/practical-builder/expert
- **Language**: Set default response language
- **Notifications**: Configure Telegram, Discord, Slack webhooks
- **Dashboard preferences**: Theme, refresh interval, default views
- **Memory settings**: Write policy, compaction threshold, auto-recall

### 10. Health

System health monitoring (accessible via API at `/api/health`):

- **Database connectivity**: Postgres connection status and latency
- **Memory index health**: pgvector index status
- **Hook status**: Each hook's last execution and result
- **Skill registry**: Loaded skill count and any broken links
- **Dashboard build**: Next.js build status
- **Disk usage**: Reports directory size

## API Routes

All API routes are in `dashboard/app/api/`:

| Route | Method | Description |
|-------|--------|-------------|
| `/api/health` | GET | System health check |
| `/api/analytics` | GET | Usage statistics and trends |
| `/api/skills` | GET | Skill registry and metadata |
| `/api/plans` | GET, POST | Plan CRUD operations |
| `/api/kanban` | GET, POST, PATCH | Task management |
| `/api/memory` | GET, POST, PATCH, DELETE | Memory CRUD and search |
| `/api/hooks` | GET | Hook event log and statistics |

## Running the Dashboard

### Development Mode

```bash
npm run dashboard:dev
# Or directly:
cd dashboard && npm run dev
```

Starts on `http://localhost:3333` with hot reload.

### Production Build

```bash
npm run dashboard:build
cd dashboard && npm run start
```

### Using the Script

```bash
./scripts/dashboard.sh
```

## Environment Requirements

The dashboard requires `DATABASE_URL` to be set for database-backed features (memory, plans, hooks, analytics). Without it, the dashboard still loads but shows empty states for data-dependent pages.

```bash
# In .env at project root
DATABASE_URL=postgres://user:password@host/database?sslmode=require
```

## Related Documentation

- [ck.json Config](./ck-json-config.md) -- Dashboard port and preferences
- [Memory Schema](./memory-schema.md) -- Database tables used by the dashboard
- [Kanban Workflow](./kanban-workflow.md) -- Kanban board details
- [Skills Catalog](./skills-catalog.md) -- Skills displayed in the dashboard
- [Hooks and Privacy](./hooks-and-privacy.md) -- Hook events displayed in the dashboard
- [Troubleshooting](./troubleshooting.md) -- Dashboard build and connection issues
