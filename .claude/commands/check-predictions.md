# /check-predictions — Review & Verify Past Predictions

Review predictions stored in memory, check which ones have reached their deadline, and verify accuracy by re-searching current reality.

## Steps

### 1. Fetch all predictions from memory
```bash
cd /Users/inugami/Documents/GitHub/InuVerse/ai-agents/ultrathink && npx tsx -e "
import { config } from 'dotenv';
import { resolve, join } from 'path';
config({ path: join(resolve(import.meta.dirname, '../..'), '.env') });
import { getClient } from './memory/src/client.js';
const sql = getClient();
const predictions = await sql\`
  SELECT id, content, importance, confidence, created_at, accessed_at,
         array_agg(mt.tag) FILTER (WHERE mt.tag IS NOT NULL) as tags
  FROM memories m
  LEFT JOIN memory_tags mt ON m.id = mt.memory_id
  WHERE m.category = 'prediction' AND m.is_archived = false
  GROUP BY m.id
  ORDER BY m.created_at DESC
  LIMIT 20
\`;
console.log(JSON.stringify(predictions, null, 2));
process.exit(0);
"
```

### 2. For each prediction, determine status
For each prediction found:
- **Parse the time horizon** from the content (e.g., "over 6 months", "by Q3 2026")
- **Calculate if deadline has passed** by comparing `created_at + time_horizon` vs today (2026-03-16)
- Mark as: `pending` (deadline not reached), `due` (deadline passed, needs verification), `verified` (already checked)

### 3. For predictions marked `due`, verify by re-searching
Run WebSearch queries to check current reality against the prediction.
Compare the predicted outcome vs what actually happened.

### 4. Score each verified prediction
- **Accurate**: Prediction was correct (direction + approximate magnitude)
- **Partially accurate**: Direction correct but magnitude off
- **Inaccurate**: Wrong direction or wildly off
- **Inconclusive**: Not enough data to verify yet

### 5. Update memory with verification
For each verified prediction, update the memory content to append verification:
```
[Original prediction]
---
VERIFIED [date]: [Accurate/Partially/Inaccurate]
Reality: [what actually happened]
Calibration note: [what the model got right/wrong]
```

Save verification as a new memory:
- Category: "prediction-verification"
- Importance: 7
- Tags: ["#prediction", "#calibration", "#verified"]

### 6. Output calibration summary
```
## Prediction Calibration Report

### Due for Verification
| # | Prediction | Made | Deadline | Status |
|---|-----------|------|----------|--------|

### Calibration Score
- Total predictions: X
- Verified: X (Y% accurate, Z% partial, W% inaccurate)
- Pending: X (not yet due)

### Calibration Notes
- Systematic bias: [over-optimistic / over-pessimistic / well-calibrated]
- Best domain: [where predictions were most accurate]
- Worst domain: [where predictions were least accurate]
```
