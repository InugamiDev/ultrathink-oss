# Program Scoring Framework

Score each program on 5 dimensions, 1-10 scale.

## 1. Earning Potential (weight: 30%)

Factors:
- Commission percentage (`reward_value` — higher = better)
- Recurring vs one-time (`reward_type`: `cps_recurring`/`cps_lifetime` scores 2+ points higher than `cps_one_time`)
- Product price point (higher price = higher absolute earnings per sale)
- Commission duration (`reward_duration`: lifetime > 12 months > one-time)
- Payout threshold (lower = better, especially for beginners)

Scoring guide:
- 9-10: 30%+ recurring on $50+/mo product, lifetime duration
- 7-8: 20-30% recurring on $20-50/mo, 12+ months
- 5-6: 15-20% recurring or $100+ one-time
- 3-4: 10-15% or low-price products
- 1-2: <10%, one-time, low-price

## 2. Content Potential (weight: 25%)

How easy is it to create compelling content about this product?

Factors:
- Does the product have a visual "wow" demo? (AI video, design tools = high)
- Can you show before/after results?
- Is there a free tier or free trial for audience to try?
- Are there multiple content angles? (tutorial, comparison, review, use case)
- Does content about this product tend to get engagement?

Scoring guide:
- 9-10: Visual product, free tier, 5+ content angles, viral potential
- 7-8: Good demo potential, free trial, 3+ content angles
- 5-6: Decent content angles but not visually exciting
- 3-4: Hard to demo, abstract product, limited angles
- 1-2: Boring product, no free tier, only 1 content angle

## 3. Market Demand (weight: 20%)

Is there active demand for this type of product?

To assess: `web_search` for "[product category] tools" and check result count, trends, and recent articles.

Factors:
- Search volume for product category keywords
- Trend direction (growing, stable, declining)
- Market size (how many potential buyers exist)
- Urgency of need (must-have vs nice-to-have)

Scoring guide:
- 9-10: Explosive growth category, high search volume, must-have tool
- 7-8: Growing category, solid search volume
- 5-6: Stable demand, moderate search volume
- 3-4: Niche market, low search volume
- 1-2: Declining market, minimal demand

## 4. Competition Level (weight: 15%)

How many other affiliates are promoting this? INVERSE scoring: less competition = higher score.

To assess: `web_search` for "[product] review" and "[product] affiliate" — count results and check who ranks.

Factors:
- Number of existing review articles ranking on Google
- How many YouTubers/creators already cover this product
- Are there dominant affiliates with huge audiences?
- Is the affiliate program new or established?

Scoring guide:
- 9-10: New program, almost no affiliates yet, blue ocean
- 7-8: Some affiliates but room to rank and stand out
- 5-6: Moderate competition, need good content to differentiate
- 3-4: Crowded, many established affiliates
- 1-2: Saturated, top spots locked by major publishers

## 5. Trust Factor (weight: 10%)

Is this a quality product you can recommend with integrity?

Factors:
- Product reviews and reputation (G2, Capterra, Trustpilot)
- Company track record and funding
- User retention (do people actually keep using it?)
- Stars on list.affitor.com (`stars_count` — community signal)
- Red flags? (layoffs, pivot, quality decline, data breaches)

Scoring guide:
- 9-10: Market leader, excellent reputation, high retention
- 7-8: Strong product, good reviews, funded company
- 5-6: Decent product with some known limitations
- 3-4: Mixed reviews, concerning signals
- 1-2: Poor reputation, high churn, red flags

## Overall Score Calculation

```
overall = (earning × 0.30) + (content × 0.25) + (demand × 0.20)
        + (competition × 0.15) + (trust × 0.10)
```

## Verdict

- **7.5+: "Strong Pick"** — recommend promoting, high confidence
- **5.5-7.4: "Worth Testing"** — try with small content investment, see results
- **<5.5: "Skip"** — better options available, don't waste effort
