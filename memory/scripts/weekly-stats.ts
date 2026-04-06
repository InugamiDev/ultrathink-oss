/**
 * Weekly stats cache writer — outputs JSON for statusline consumption
 * Writes to /tmp/ultrathink-status/weekly-stats
 */
import { config } from "dotenv";
import { resolve, join } from "path";

const root = resolve(import.meta.dirname || ".", "..", "..");
config({ path: join(root, ".env") });

import { getClient } from "../src/client.js";

const sql = getClient();

const [s] =
  (await sql`SELECT COUNT(*) as c FROM sessions WHERE started_at > NOW() - INTERVAL '7 days' AND ended_at IS NOT NULL`) as any[];
const [m] = (await sql`SELECT COUNT(*) as c FROM memories WHERE created_at > NOW() - INTERVAL '7 days'`) as any[];
const [t] = (await sql`
  SELECT COALESCE(SUM(EXTRACT(EPOCH FROM (ended_at - started_at))), 0) as secs
  FROM sessions
  WHERE started_at > NOW() - INTERVAL '7 days' AND ended_at IS NOT NULL
`) as any[];

const secs = Math.round(Number(t.secs));
const h = Math.floor(secs / 3600);
const mins = Math.floor((secs % 3600) / 60);
const time = h > 0 ? `${h}h ${mins}m` : `${mins}m`;

// Weekly budget in hours (configurable via ULTRATHINK_WEEKLY_BUDGET_HOURS, default 5h)
const budgetHours = Number(process.env.ULTRATHINK_WEEKLY_BUDGET_HOURS || 5);
const budgetSecs = budgetHours * 3600;
const weekPct = Math.min(Math.round((secs / budgetSecs) * 100), 100);

console.log(JSON.stringify({ sessions: String(s.c), memories: String(m.c), time, secs, weekPct }));
process.exit(0);
