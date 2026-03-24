import { getClient } from "./client.js";

export interface Plan {
  id: string;
  title: string;
  status: string;
  file_path?: string;
  summary?: string;
  created_at: string;
  updated_at: string;
  archived_at?: string;
  session_id?: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: number;
  plan_id?: string;
  board: string;
  position: number;
  assignee?: string;
  labels?: string[];
  due_date?: string;
  created_at: string;
  updated_at: string;
}

export async function createPlan(input: { title: string; file_path?: string; summary?: string; session_id?: string }): Promise<Plan> {
  const sql = getClient();
  const rows = await sql`
    INSERT INTO plans (title, file_path, summary, session_id)
    VALUES (${input.title}, ${input.file_path ?? null}, ${input.summary ?? null}, ${input.session_id ?? null})
    RETURNING *
  `;
  return rows[0] as Plan;
}

export async function getPlan(id: string): Promise<Plan | null> {
  const sql = getClient();
  const rows = await sql`SELECT * FROM plans WHERE id = ${id}`;
  return rows.length > 0 ? (rows[0] as Plan) : null;
}

export async function listPlans(status?: string): Promise<Plan[]> {
  const sql = getClient();
  if (status) {
    return (await sql`SELECT * FROM plans WHERE status = ${status} ORDER BY created_at DESC`) as Plan[];
  }
  return (await sql`SELECT * FROM plans ORDER BY created_at DESC`) as Plan[];
}

export async function updatePlanStatus(id: string, status: string): Promise<Plan | null> {
  const sql = getClient();
  const rows = await sql`
    UPDATE plans SET
      status = ${status},
      updated_at = NOW(),
      archived_at = CASE WHEN ${status} = 'archived' THEN NOW() ELSE archived_at END
    WHERE id = ${id}
    RETURNING *
  `;
  return rows.length > 0 ? (rows[0] as Plan) : null;
}

export async function createTask(input: {
  title: string;
  description?: string;
  priority?: number;
  plan_id?: string;
  board?: string;
  assignee?: string;
  labels?: string[];
  due_date?: string;
}): Promise<Task> {
  const sql = getClient();

  const [maxPos] = await sql`
    SELECT COALESCE(MAX(position), 0) + 1 as next_pos
    FROM tasks WHERE board = ${input.board ?? "main"} AND status = 'backlog'
  `;

  const rows = await sql`
    INSERT INTO tasks (title, description, priority, plan_id, board, position, assignee, labels, due_date)
    VALUES (
      ${input.title},
      ${input.description ?? null},
      ${input.priority ?? 5},
      ${input.plan_id ?? null},
      ${input.board ?? "main"},
      ${Number(maxPos.next_pos)},
      ${input.assignee ?? null},
      ${input.labels ?? null},
      ${input.due_date ?? null}
    )
    RETURNING *
  `;
  return rows[0] as Task;
}

export async function getTask(id: string): Promise<Task | null> {
  const sql = getClient();
  const rows = await sql`SELECT * FROM tasks WHERE id = ${id}`;
  return rows.length > 0 ? (rows[0] as Task) : null;
}

export async function listTasks(board: string = "main", status?: string): Promise<Task[]> {
  const sql = getClient();
  if (status) {
    return (await sql`
      SELECT * FROM tasks WHERE board = ${board} AND status = ${status} ORDER BY position
    `) as Task[];
  }
  return (await sql`
    SELECT * FROM tasks WHERE board = ${board} ORDER BY status, position
  `) as Task[];
}

export async function updateTaskStatus(id: string, status: string): Promise<Task | null> {
  const sql = getClient();
  const rows = await sql`
    UPDATE tasks SET status = ${status}, updated_at = NOW() WHERE id = ${id} RETURNING *
  `;
  return rows.length > 0 ? (rows[0] as Task) : null;
}

export async function moveTask(id: string, newStatus: string, newPosition: number): Promise<Task | null> {
  const sql = getClient();
  const rows = await sql`
    UPDATE tasks SET status = ${newStatus}, position = ${newPosition}, updated_at = NOW()
    WHERE id = ${id} RETURNING *
  `;
  return rows.length > 0 ? (rows[0] as Task) : null;
}

export async function createJournal(input: {
  plan_id: string;
  planned?: string;
  implemented?: string;
  blockers?: string;
  outcomes?: string;
  lessons?: string;
  followup_debt?: string;
}): Promise<{ id: string }> {
  const sql = getClient();
  const rows = await sql`
    INSERT INTO journals (plan_id, planned, implemented, blockers, outcomes, lessons, followup_debt)
    VALUES (
      ${input.plan_id},
      ${input.planned ?? null},
      ${input.implemented ?? null},
      ${input.blockers ?? null},
      ${input.outcomes ?? null},
      ${input.lessons ?? null},
      ${input.followup_debt ?? null}
    )
    RETURNING id
  `;
  return rows[0] as { id: string };
}
