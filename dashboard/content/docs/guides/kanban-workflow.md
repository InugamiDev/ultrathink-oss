# Kanban Workflow

UltraThink includes a Kanban board for tracking tasks across their lifecycle, integrated with the plan system, memory, and dashboard.

## Columns

Tasks move through 7 columns:

| Column | Status Value | Description |
|--------|-------------|-------------|
| **Backlog** | `backlog` | Tasks identified but not scheduled |
| **Planned** | `planned` | Tasks with a plan, ready to start |
| **In Progress** | `in-progress` | Actively being worked on |
| **Blocked** | `blocked` | Waiting on external dependency |
| **Review** | `review` | Work complete, awaiting review |
| **Done** | `done` | Reviewed and accepted |
| **Archived** | `archived` | Completed and archived |

### Typical Flow

```
backlog --> planned --> in-progress --> review --> done --> archived
                            |
                            v
                         blocked --> in-progress (unblocked)
```

Any transition is allowed, including backward (e.g., `review` -> `in-progress` for rework).

## Using the `/kanban` Command

```bash
# View board
/kanban

# Add task
/kanban add "Implement API rate limiting" --priority 8 --labels backend,security

# Move task
/kanban move <task-id> in-progress

# View details
/kanban show <task-id>
```

## Task Structure

| Field | Type | Description |
|-------|------|-------------|
| `title` | VARCHAR(500) | Short task description |
| `description` | TEXT | Detailed description |
| `status` | VARCHAR(20) | Current column |
| `priority` | SMALLINT (1-10) | 10 = highest |
| `plan_id` | UUID | Link to associated plan |
| `board` | VARCHAR(100) | Board name (default: `main`) |
| `position` | INT | Vertical position within column |
| `assignee` | VARCHAR(100) | Assigned person or agent |
| `labels` | TEXT[] | Categorization labels |
| `due_date` | TIMESTAMPTZ | Task deadline |

## Priority System

| Priority | Meaning | Visual |
|----------|---------|--------|
| 9-10 | Critical / Blocking | Red badge |
| 7-8 | High importance | Orange badge |
| 4-6 | Normal | Blue badge |
| 1-3 | Low / Nice to have | Gray badge |

## Boards

The default board is `main`, configured in `ck.json`:

```json
{ "kanban": { "defaultBoard": "main" } }
```

Create additional boards by setting the `board` field on tasks.

## Integration with Plans

Plans and tasks have a one-to-many relationship:

1. Plan created via `/plan` -- registered as `draft`
2. Plan phases broken into tasks, each linked via `plan_id`
3. Plan status tracks progress: `draft` -> `active` -> `completed` -> `archived`
4. When archived via `/plan:archive`, all tasks move to `archived`, a journal entry is created, and lessons are written to memory

## Task Management API

```typescript
// Create
const task = await createTask({
  title: "Implement dark mode toggle",
  priority: 7,
  plan_id: "uuid-of-plan",
  board: "main",
  labels: ["frontend", "ui"],
});

// List
const allTasks = await listTasks("main");
const inProgress = await listTasks("main", "in-progress");

// Update status
await updateTaskStatus(taskId, "in-progress");

// Move (status + position)
await moveTask(taskId, "review", 0);
```

## Dashboard View

The Kanban page at `localhost:3333/kanban` provides visual columns, task cards with priority badges, drag-and-drop, board selector, filtering, and plan links.
