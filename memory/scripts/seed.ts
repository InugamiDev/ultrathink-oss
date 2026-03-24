import { config } from "dotenv";
import { join } from "path";
import { getClient } from "../src/client.js";

config({ path: join(import.meta.dirname, "../../.env") });

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}

const sql = getClient();

async function seed() {
  console.log("Seeding database...\n");

  // Create initial session
  const [session] = await sql`
    INSERT INTO sessions (summary, task_context)
    VALUES ('UltraThink initial setup', 'System bootstrap and configuration')
    RETURNING id
  `;
  const sessionId = session.id as string;
  console.log(`  Created session: ${sessionId}`);

  // Create foundational memories
  const memories = [
    {
      content:
        "UltraThink uses a 4-layer skill architecture: Orchestrators > Workflow Hubs > Utility Providers > Domain Specialists",
      category: "architecture",
      importance: 9,
      confidence: 1.0,
      scope: "ultrathink",
    },
    {
      content: "Memory is stored in Neon serverless Postgres with pgvector for semantic search",
      category: "architecture",
      importance: 8,
      confidence: 1.0,
      scope: "ultrathink",
    },
    {
      content: "Dashboard runs on Next.js 15 with Tailwind CSS v4 on port 3333",
      category: "architecture",
      importance: 7,
      confidence: 1.0,
      scope: "ultrathink/dashboard",
    },
    {
      content: "Privacy hooks run as pre-tool hooks checking .ckignore patterns before file access",
      category: "pattern",
      importance: 8,
      confidence: 1.0,
      scope: "ultrathink/hooks",
    },
    {
      content: "Skills use YAML frontmatter in SKILL.md for metadata including layer, triggers, and link graph",
      category: "convention",
      importance: 7,
      confidence: 1.0,
      scope: "ultrathink/skills",
    },
  ];

  for (const mem of memories) {
    const [row] = await sql`
      INSERT INTO memories (content, category, importance, confidence, scope, session_id, source)
      VALUES (${mem.content}, ${mem.category}, ${mem.importance}, ${mem.confidence}, ${mem.scope}, ${sessionId}, 'seed')
      RETURNING id
    `;
    console.log(`  Created memory: ${mem.category} — ${mem.content.slice(0, 60)}...`);

    await sql`INSERT INTO memory_tags (memory_id, tag) VALUES (${row.id}, ${"#" + mem.category})`;
    await sql`INSERT INTO memory_tags (memory_id, tag) VALUES (${row.id}, '#ultrathink')`;
  }

  // Create initial plan
  const [plan] = await sql`
    INSERT INTO plans (title, status, summary, session_id)
    VALUES ('UltraThink Bootstrap', 'active', 'Initial system setup and configuration', ${sessionId})
    RETURNING id
  `;
  console.log(`  Created plan: ${plan.id}`);

  // Create sample kanban tasks
  const tasks = [
    { title: "Configure Neon database", status: "done", priority: 9 },
    { title: "Set up skill registry", status: "done", priority: 8 },
    { title: "Implement dashboard layout", status: "in-progress", priority: 7 },
    { title: "Add semantic search to memory", status: "planned", priority: 6 },
    { title: "Write integration tests", status: "backlog", priority: 5 },
  ];

  for (let i = 0; i < tasks.length; i++) {
    await sql`
      INSERT INTO tasks (title, status, priority, plan_id, position)
      VALUES (${tasks[i].title}, ${tasks[i].status}, ${tasks[i].priority}, ${plan.id}, ${i})
    `;
    console.log(`  Created task: [${tasks[i].status}] ${tasks[i].title}`);
  }

  // Create initial decision record
  await sql`
    INSERT INTO decisions (title, context, decision, consequences, alternatives)
    VALUES (
      'Use Neon serverless Postgres for memory',
      'Need persistent memory with vector search for semantic recall',
      'Neon serverless Postgres with pgvector extension',
      'Serverless scaling, vector search support, SQL familiarity',
      'SQLite (no vector search), Pinecone (vendor lock-in), Supabase (heavier)'
    )
  `;
  console.log("  Created decision record");

  // Update session
  await sql`UPDATE sessions SET memories_created = ${memories.length} WHERE id = ${sessionId}`;

  console.log("\nSeed complete!");
}

seed().catch(console.error);
