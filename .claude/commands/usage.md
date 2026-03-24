# /usage — UltraThink Weekly Usage Report

Show full weekly activity with rich visual formatting.

## Steps

### 1. Run usage report
```bash
cd /Users/inugami/Documents/GitHub/InuVerse/ai-agents/ultrathink && npx tsx memory/scripts/usage-report.ts
```

### 2. Skill registry summary
```bash
cat /Users/inugami/Documents/GitHub/InuVerse/ai-agents/ultrathink/.claude/skills/_registry.json | jq '{
  total: (.skills | length),
  byLayer: [.skills[] | .layer] | group_by(.) | map({layer: .[0], count: length}) | sort_by(-.count)
}'
```

### 3. System health
```bash
echo "--- System Health ---"
echo "DATABASE_URL: $(test -n "${DATABASE_URL:-}" && echo 'SET' || echo 'NOT SET')"
echo "Pending memories: $(ls /tmp/ultrathink-memories/*.json 2>/dev/null | wc -l | tr -d ' ')"
echo "Error log: $(wc -l < /tmp/ultrathink-errors.log 2>/dev/null || echo '0') lines"
echo "Recent errors: $(tail -3 /tmp/ultrathink-errors.log 2>/dev/null || echo 'none')"
echo "Hooks: $(ls /Users/inugami/Documents/GitHub/InuVerse/ai-agents/ultrathink/.claude/hooks/*.sh 2>/dev/null | wc -l | tr -d ' ')"
echo "Commands: $(ls /Users/inugami/Documents/GitHub/InuVerse/ai-agents/ultrathink/.claude/commands/*.md 2>/dev/null | wc -l | tr -d ' ')"
echo "Session file: $(ls /tmp/ultrathink-session-* 2>/dev/null | head -1 || echo 'none')"
echo "Suggestion tracking: $(ls /tmp/ultrathink-skill-suggestions/*.json 2>/dev/null | wc -l | tr -d ' ') pending"
```

## Output Format

Present as a **visually rich, magazine-quality dashboard** using markdown formatting. Use these design principles:

1. **Header with date range** — bold title with the week span
2. **Hero stat cards** — show 4 key numbers prominently at the top
3. **Sparklines** — use Unicode block characters (▁▂▃▄▅▆▇█) to show 7-day trends inline
4. **Progress bars** — use block characters (█░) for category distributions
5. **Color coding** — use bold/italic for emphasis, not just plain text
6. **Compact tables** — aligned columns with clean separators
7. **Visual hierarchy** — most important info first, details nested below

### Template:

```
# ✦ UltraThink — Week of Mar 10–16, 2026

## Overview
╭──────────────╮  ╭──────────────╮  ╭──────────────╮  ╭──────────────╮
│  **XX**       │  │  **Xh Xm**   │  │  **X,XXX**   │  │  **X.X**     │
│  sessions     │  │  active time  │  │  memories     │  │  avg imp     │
│  XX all-time  │  │  XX today     │  │  +XXX week    │  │  XX archived │
╰──────────────╯  ╰──────────────╯  ╰──────────────╯  ╰──────────────╯

## Daily Activity
| Day          | Sessions | Time  | Memories | Trend                |
|:-------------|:--------:|:-----:|:--------:|:---------------------|
| **Sun** 3/16 |    3     | 45m   |   +12    | ▆▆▆░░░░░░░░░░░░░░░░ |
| **Sat** 3/15 |    8     | 2h 4m |   +195   | ████████████████░░░░ |
| **Fri** 3/14 |    4     | 14m   |   +459   | ████████████████████ |
| ...          |          |       |          |                      |

**Weekly sparkline**: ▃▅▇▆▂▁▄  sessions  ·  ▅▇█▆▃▂▄  memories

## Projects
| Project              | Sessions | Time  |  ▓ Activity           |
|:---------------------|:--------:|:-----:|:----------------------|
| research-try-out     |    5     | 53m   | ████████████████░░░░ |
| AdmissionSortedLTD   |    4     | 26m   | ██████████░░░░░░░░░░ |
| ultrathink           |    3     | 10m   | ████░░░░░░░░░░░░░░░░ |
| web-tools            |    3     | 21m   | ████████░░░░░░░░░░░░ |

## Memory
**Active** 2,261 · **Archived** 31 · **Relations** 10,323 · **This week** +2,029

### Categories
```
solution       ████████████████████ 1,012  (44.8%)
pattern        ████████████         582  (25.7%)
architecture   ██████               326  (14.4%)
preference     ███                  157  ( 6.9%)
insight        ██                    84  ( 3.7%)
tool-pref      █                     72  ( 3.2%)
```

### Most Recalled
| Memory                                   | Category   | Accesses | Imp |
|:-----------------------------------------|:-----------|:--------:|:---:|
| Avoids paragraphs                        | preference |   40x    | 10  |
| Prefers stock photos                     | preference |   40x    | 10  |

### Daily Growth
```
        M    T    W    T    F    S    S
       209  205  277  459  195    5
        ▄    ▄    ▅    █    ▃    ▁
```

## Skills — **344** total
| Layer          | Count | Distribution           |
|:---------------|:-----:|:-----------------------|
| Domain         |  228  | ████████████████████ |
| Utility        |   82  | ███████              |
| Hub            |   21  | ██                   |
| Orchestrator   |   13  | █                    |

## System Health
| Component        | Status |
|:-----------------|:-------|
| Database         | ● Connected |
| Pending memories | X files |
| Error log        | X lines |
| Hooks            | XX active · XX commands |
| Session          | `XXXXXXXX...` |

---
*Dashboard: http://localhost:3333/usage*
```

**IMPORTANT**: Only show closed sessions (with `ended_at`) in duration calculations. Note ghost session count separately. Use real numbers from the query results. Format large numbers with commas. Calculate percentages for category distribution.
