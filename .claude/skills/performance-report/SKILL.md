---
name: performance-report
description: >
  Generate affiliate performance reports with KPIs and recommendations. Triggers on:
  "show my affiliate report", "how are my programs doing", "performance review",
  "earnings report", "monthly affiliate report", "weekly report",
  "analyze my affiliate earnings", "which program is best", "EPC report",
  "conversion rate analysis", "revenue breakdown", "campaign performance".
license: MIT
metadata:
  author: affitor
  version: "1.0"
  stage: S6-Analytics
---

# Performance Report

Generate weekly or monthly affiliate performance reports — earnings, clicks, conversions, EPC, top performers, underperformers, and trend analysis. Output is a Markdown report with KPI dashboard, program rankings, and actionable recommendations.

## Stage

S6: Analytics — Data without analysis is just noise. This skill transforms raw affiliate numbers into insights — which programs are worth your time, which are dragging your portfolio down, and where to focus next. Professional affiliates review performance weekly.

## When to Use

- User wants to review their affiliate earnings for a period
- User asks "how are my programs doing?" or "show me my affiliate report"
- User has click/conversion/revenue data and wants analysis
- User wants to compare performance across multiple programs
- User says "weekly report", "monthly report", "earnings breakdown"
- Chaining from S6.1 (conversion-tracker) — analyze the data those links collected

## Input Schema

```yaml
programs:
  - name: string               # REQUIRED — program name (e.g., "HeyGen")
    clicks: number             # OPTIONAL — total clicks this period
    conversions: number        # OPTIONAL — total conversions
    revenue: number            # OPTIONAL — total commission earned ($)
    commission: number         # OPTIONAL — commission per sale ($)
    spend: number              # OPTIONAL — money spent on ads/promotion ($)

period: string                 # OPTIONAL — "week" | "month" | "quarter"
                               # Default: "month"

goals:
  revenue_target: number       # OPTIONAL — target revenue for the period ($)
  conversion_target: number    # OPTIONAL — target conversions

previous_period:               # OPTIONAL — last period's data for trend analysis
  - name: string
    clicks: number
    conversions: number
    revenue: number

notes: string                  # OPTIONAL — context about the period
                               # (e.g., "launched new blog post week 2")
```

**Chaining context**: If S1 program data or S6.1 tracking data exists in conversation, pull program names and any available metrics.

## Workflow

### Step 1: Collect Program Data

Gather data from user input. If data is incomplete, work with what's available and note gaps:
- "You provided revenue but not clicks — I can calculate revenue per program but not EPC or conversion rate."

### Step 2: Calculate KPIs

For each program:
- **EPC** (Earnings Per Click): revenue / clicks
- **Conversion Rate**: conversions / clicks × 100
- **Revenue Share**: program revenue / total revenue × 100
- **CPA** (Cost Per Acquisition): spend / conversions (if spend provided)
- **ROAS** (Return on Ad Spend): revenue / spend (if spend provided)
- **Commission Per Sale**: revenue / conversions

Portfolio-level:
- **Total Revenue**: sum of all program revenue
- **Blended EPC**: total revenue / total clicks
- **Blended Conversion Rate**: total conversions / total clicks × 100
- **Top Performer**: highest EPC program
- **Underperformer**: lowest EPC program

### Step 3: Rank Programs

Sort programs by ROI efficiency:
1. EPC (primary sort)
2. Total revenue (secondary)
3. Conversion rate (tertiary)

Assign labels:
- **Star**: High EPC + high volume → double down
- **Cash Cow**: Moderate EPC + high volume → maintain
- **Question Mark**: High EPC + low volume → scale up
- **Dog**: Low EPC + low volume → consider dropping

### Step 4: Identify Trends

If `previous_period` data is provided:
- Revenue trend: up/down/flat (with percentage)
- Click trend: up/down/flat
- Conversion trend: up/down/flat
- Per-program trends

### Step 5: Generate Recommendations

Based on data:
- **Double down**: Programs with high EPC that need more traffic
- **Optimize**: Programs with high traffic but low conversion (content issue)
- **Phase out**: Programs with low EPC and low volume
- **Investigate**: Programs with unusual patterns (sudden drops)

## Output Schema

```yaml
report:
  period: string
  total_revenue: number
  total_clicks: number
  total_conversions: number
  blended_epc: number
  blended_conversion_rate: number
  goal_progress: string        # "on_track" | "behind" | "ahead" | "no_goal"

programs:
  - name: string
    clicks: number
    conversions: number
    revenue: number
    epc: number
    conversion_rate: number
    revenue_share: number      # percentage of total
    label: string              # "star" | "cash_cow" | "question_mark" | "dog"
    trend: string              # "up" | "down" | "flat" | "new"

recommendations:
  - program: string
    action: string             # "double_down" | "optimize" | "phase_out" | "investigate"
    reason: string
    next_step: string          # specific action to take
```

## Output Format

1. **KPI Dashboard** — summary table with total revenue, clicks, conversions, blended EPC
2. **Program Rankings** — table sorted by EPC with labels (Star/Cash Cow/Question Mark/Dog)
3. **Trend Analysis** — period-over-period comparison (if previous data provided)
4. **Recommendations** — prioritized list of actions per program
5. **Goal Progress** — progress toward targets (if goals provided)

## Error Handling

- **No data provided**: "I need your affiliate numbers to generate a report. At minimum, provide: program names and revenue. Ideally also clicks and conversions. You can get these from your affiliate dashboard or tracking tool."
- **Only one program**: Generate the report for one program. Note: "With only one program, I can't do comparative analysis. Consider adding more programs to diversify. Use S1 (affiliate-program-search) to find complementary programs."
- **Missing clicks (revenue only)**: "Without click data, I can rank programs by revenue but can't calculate EPC or conversion rate. EPC is the most important affiliate metric — consider setting up tracking with S6.1 (conversion-tracker)."

## Examples

### Example 1: Monthly multi-program report

**User**: "Monthly report: HeyGen — 500 clicks, 15 conversions, $450. Semrush — 1200 clicks, 8 conversions, $320. Notion — 300 clicks, 25 conversions, $125."
**Action**: Calculate KPIs. HeyGen: EPC $0.90, CR 3.0% (Star). Semrush: EPC $0.27, CR 0.7% (Question Mark — high traffic, low conversion). Notion: EPC $0.42, CR 8.3% (Cash Cow — high conversion, low revenue per sale). Recommend: Scale HeyGen traffic, optimize Semrush content (CTAs, landing page), maintain Notion.

### Example 2: Week-over-week comparison

**User**: "This week vs last week: HeyGen clicks went from 100 to 150, but conversions dropped from 5 to 3."
**Action**: Flag conversion rate drop (5% → 2%). Diagnose: more traffic but lower quality? New traffic source? Landing page change? Recommend: Check traffic sources, run S6.4 (seo-audit) on landing page, test CTAs with S6.2 (ab-test-generator).

### Example 3: Revenue-only report

**User**: "My programs last month: HeyGen $450, Semrush $320, Notion $125, Canva $80."
**Action**: Revenue-only analysis. Total $975. Revenue share: HeyGen 46%, Semrush 33%, Notion 13%, Canva 8%. Note concentration risk (79% from 2 programs). Recommend: Set up click tracking (S6.1) for deeper analysis, consider diversifying with S1 research.

## References

- `shared/references/affiliate-glossary.md` — KPI definitions (EPC, CTR, ROAS). Referenced in Step 2.
