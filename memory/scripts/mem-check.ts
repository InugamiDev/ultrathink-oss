import { getClient } from "../src/client.ts";
async function main() {
  const sql = getClient();
  
  const dist = await sql`
    SELECT scope, category, COUNT(*)::int as cnt, 
           MIN(LENGTH(content))::int as min_len, MAX(LENGTH(content))::int as max_len
    FROM memories WHERE is_archived = false
    GROUP BY scope, category ORDER BY cnt DESC LIMIT 25
  `;
  console.log("=== Distribution ===");
  for (const r of dist) console.log(`  scope="${r.scope}" cat="${r.category}" cnt=${r.cnt} len=${r.min_len}-${r.max_len}`);

  const identities = await sql`
    SELECT content, scope, importance 
    FROM memories WHERE category = 'identity' AND is_archived = false
    ORDER BY importance DESC LIMIT 15
  `;
  console.log("\n=== Identity nodes (top 15) ===");
  for (const r of identities) console.log(`  [${r.importance}] scope="${r.scope}" | ${r.content}`);

  const total = await sql`SELECT COUNT(*)::int as n FROM memories WHERE is_archived=false`;
  console.log(`\nTotal active memories: ${total[0].n}`);

  await sql.end();
}
main().catch(e => { console.error(e.message); process.exit(1); });
