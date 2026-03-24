# Kanban Workflow

## Overview

UltraThink includes a Kanban board system for tracking tasks across their lifecycle. Tasks move through defined columns from `backlog` to `archived`, with integration into the plan system, memory, and dashboard.

The Kanban system operates at two levels:
1. **CLI/Claude level**: Text-based board rendering and task manipulation via the `kanban` skill and `/kanban` command
2. **Dashboard level**: Visual board at `localhost:3333/kanban` with drag-and-drop support

## Columns

Tasks move through these 7 columns in order:

| Column | Status Value | Description |
|--------|-------------|-------------|
| **Backlog** | `backlog` | Tasks identified but not yet scheduled |
| **Planned** | `planned` | Tasks with a plan, ready to start |
| **In Progress** | `in-progress` | Actively being worked on |
| **Blocked** | `blocked` | Waiting on external dependency or decision |
| **Review** | `review` | Work complete, awaiting review |
| **Done** | `done` | Reviewed and accepted |
| **Archived** | `archived` | Completed and archived for history |

### Column Transitions

Typical flow:

```
backlog --> planned --> in-progress --> review --> done --> archived
                            |
                            v
                         blocked --> in-progress (unblocked)
```

Any transition is allowed, but the typical progression follows the left-to-right flow above. Tasks can move backward (e.g., `review` -> `in-progress` for rework).

## Task Structure

Each task in the database has these fields:

| Field | Type | Description |
|-------|------|-------------|
| `title` | VARCHAR(500) | Short task description |
| `description` | TEXT | Detailed description, acceptance criteria |
| `status` | VARCHAR(20) | Current column (see above) |
| `priority` | SMALLINT (1-10) | 10 = highest priority, 1 = lowest |
| `plan_id` | UUID | Link to associated plan |
| `board` | VARCHAR(100) | Board name (default: `main`) |
| `position` | INT | Vertical position within column |
| `assignee` | VARCHAR(100) | Assigned person or agent |
| `labels` | TEXT[] | Categorization labels |
| `due_date` | TIMESTAMPTZ | Task deadline |

## Boards

Tasks are organized into boards. The default board is `main`, configured in `ck.json`:

```json
{
  "kanban": {
    "defaultBoard": "main"
  }
}
```

You can create additional boards for different projects, streams, or teams by setting the `board` field on tasks.

## Task Management API

The plans service (`memory/src/plans.ts`) provides these task operations:

### Creating Tasks

```typescript
const task = await createTask({
  title: "Implement dark mode toggle",
  description: "Add a toggle in settings page that switches between light/dark themes",
  priority: 7,
  plan_id: "uuid-of-plan",
  board: "main",
  assignee: "developer",
  labels: ["frontend", "ui"],
  due_date: "2026-03-15T00:00:00Z",
});
```

Tasks are automatically assigned the next position in the `backlog` column of their board.

### Listing Tasks

```typescript
// All tasks on the main board
const allTasks = await listTasks("main");

// Tasks with a specific status
const inProgress = await listTasks("main", "in-progress");
```

### Updating Task Status

```typescript
// Move to in-progress
await updateTaskStatus(taskId, "in-progress");

// Move to review
await updateTaskStatus(taskId, "review");
```

### Moving Tasks (Status + Position)

```typescript
// Move to review column, position 0 (top)
await moveTask(taskId, "review", 0);
```

## Integration with Plans

Plans and tasks have a one-to-many relationship: a plan can have multiple tasks, and each task optionally references a plan via `plan_id`.

### Plan-to-Task Flow

When a plan is created via the `plan` skill:
1. The plan is registered in the `plans` table with status `draft`
2. Plan phases can be broken into individual tasks
3. Each task links back to the plan via `plan_id`
4. The plan status tracks overall progress:
   - `draft` -- plan is being written
   - `active` -- at least one task is in-progress
   - `completed` -- all tasks are done
   - `archived` -- plan archived with journal

### Archiving Plans with Tasks

When a plan is archived via `/plan:archive`:
1. The plan status changes to `archived`
2. All associated tasks move to `archived` status
3. A journal entry is created capturing planned vs. implemented
4. Lessons learned are written to memory

## Using the `/kanban` Command

The `/kanban` command provides text-based board interaction:

### View Board

```
/kanban
```

Renders a text-based board showing all columns with task counts and titles.

### Add Task

```
/kanban add "Implement API rate limiting" --priority 8 --labels backend,security
```

### Move Task

```
/kanban move <task-id> in-progress
```

### View Details

```
/kanban show <task-id>
```

## Dashboard View

The Kanban page at `localhost:3333/kanban` provides:

- **Column layout**: 7 columns with task cards
- **Task cards**: Show title, priority badge, assignee, labels, and due date
- **Filtering**: Filter by board, assignee, label, or priority
- **Plan links**: Click through to associated plans
- **Statistics**: Tasks per column, overdue tasks, average cycle time

## Task Lifecycle Example

Here is a typical task lifecycle through the UltraThink system:

```
1. Plan created via /plan:
   - Plan "Add Authentication" registered as draft
   - 4 tasks created: setup, middleware, login-page, tests

2. Tasks in backlog:
   [backlog] setup-auth-provider     (priority: 9)
   [backlog] create-auth-middleware   (priority: 8)
   [backlog] build-login-page        (priority: 7)
   [backlog] write-auth-tests        (priority: 6)

3. /cook starts work:
   - Moves setup-auth-provider to in-progress
   - Completes setup, moves to review

4. Code review via /review:
   - Reviews setup-auth-provider
   - Approved, moves to done

5. Continue through tasks...

6. All tasks done:
   - Plan status updated to completed
   - /plan:archive creates journal entry
   - Tasks and plan moved to archived
```

## Priority System

| Priority | Meaning | Visual Indicator |
|----------|---------|------------------|
| 9-10 | Critical / Blocking | Red badge |
| 7-8 | High importance | Orange badge |
| 4-6 | Normal priority | Blue badge |
| 1-3 | Low priority / Nice to have | Gray badge |

## Related Documentation

- [Memory Schema](./memory-schema.md) -- Tasks table schema details
- [Command System](./command-system.md) -- `/kanban` command reference
- [Dashboard Overview](./dashboard-overview.md) -- Kanban page in the dashboard
- [Skills Catalog](./skills-catalog.md) -- The `kanban` skill
