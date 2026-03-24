---
name: ut-skills
description: Search and browse UltraThink skills by name, layer, or category
disable-model-invocation: true
allowed-tools: Read, Bash, Grep, Glob
argument-hint: "[search-term]"
---

# Browse UltraThink Skills

Search and browse the 104-skill mesh.

## If $ARGUMENTS is provided

Search for skills matching the query. Search across skill names, descriptions, triggers, and categories:

```bash
node -e "
const r=JSON.parse(require('fs').readFileSync(require('os').homedir()+'/.claude/skills/_registry.json'));
const q='$ARGUMENTS'.toLowerCase();
const matches=r.skills.filter(s=>
  s.name.includes(q)||
  (s.description||'').toLowerCase().includes(q)||
  (s.category||'').toLowerCase().includes(q)||
  (s.layer||'').toLowerCase().includes(q)||
  (s.triggers||[]).some(t=>t.toLowerCase().includes(q))
);
if(matches.length===0){console.log('No skills found matching: '+q)}
else{
  console.log('Found '+matches.length+' skills:\n');
  matches.forEach(s=>console.log('  '+s.layer.padEnd(13)+s.name.padEnd(25)+s.description));
}
"
```

Then offer to read the full SKILL.md for any matched skill.

## If no arguments

Show a layer summary with skill counts, then list all skills grouped by layer:

```bash
node -e "
const r=JSON.parse(require('fs').readFileSync(require('os').homedir()+'/.claude/skills/_registry.json'));
const layers={orchestrator:[],hub:[],utility:[],domain:[]};
r.skills.forEach(s=>(layers[s.layer]||[]).push(s));
for(const[layer,skills]of Object.entries(layers)){
  console.log('\n'+layer.toUpperCase()+' ('+skills.length+')');
  console.log('─'.repeat(60));
  skills.forEach(s=>console.log('  '+s.name.padEnd(25)+(s.description||'').slice(0,50)));
}
"
```

## Reading a specific skill

When the user wants details on a specific skill:

```bash
cat ~/.claude/skills/<skill-name>/SKILL.md
```

Show the key sections: description, triggers, linksTo, best practices, common pitfalls.
