---
name: content-writer
description: "Unified content writing toolkit — long-form (SEO blog articles, how-to tutorials, comparison posts, listicles), short-form (viral social posts, reddit posts, twitter threads, tiktok scripts), paid ad copy, email sequences, and content repurposing. Channel-aware. Single entry point for any copywriting task across formats and platforms."
layer: hub
category: affiliate-marketing
triggers: ["ad copy", "affiliate automation", "affiliate blog", "affiliate blog builder", "affiliate content", "comparison post", "comparison post writer", "content repurpose", "content repurposer", "how to tutorial writer", "listicle", "listicle generator", "paid ad copy writer", "product review", "reddit post writer", "social media post", "tiktok script writer", "twitter thread writer", "viral post", "viral post writer"]
---

# content-writer

Unified content writing toolkit — long-form (SEO blog articles, how-to tutorials, comparison posts, listicles), short-form (viral social posts, reddit posts, twitter threads, tiktok scripts), paid ad copy, email sequences, and content repurposing. Channel-aware. Single entry point for any copywriting task across formats and platforms.


## Absorbs

- `affiliate-blog-builder`
- `comparison-post-writer`
- `how-to-tutorial-writer`
- `listicle-generator`
- `viral-post-writer`
- `reddit-post-writer`
- `twitter-thread-writer`
- `tiktok-script-writer`
- `paid-ad-copy-writer`
- `content-repurposer`


---

## From `affiliate-blog-builder`

> >

# Affiliate Blog Builder

Write full SEO-optimized blog articles that rank on Google and drive passive affiliate revenue. Supports four formats: product review, head-to-head comparison, best-of listicle, and how-to guide. Each article includes keyword strategy, structured headings, comparison tables, CTAs, FAQ schema, and FTC-compliant disclosure.

## Stage

S3: Blog — The highest-value content type in the affiliate funnel. Blog articles rank on Google, drive organic traffic for months/years, and convert at higher rates than social posts because readers have high purchase intent.

## When to Use

- User wants to write a blog post reviewing an affiliate product
- User wants a comparison article (Product A vs Product B)
- User wants a "best of" listicle for a product category
- User wants a how-to tutorial that naturally promotes an affiliate product
- User has a product from S1 (affiliate-program-search) and wants to create long-form content
- User says anything like "write a blog", "SEO article", "product review post", "roundup post"

## Input Schema

```yaml
product:                    # REQUIRED — the affiliate product to feature
  name: string              # Product name (e.g., "HeyGen")
  description: string       # What it does
  reward_value: string      # Commission (e.g., "30% recurring")
  url: string               # Affiliate link URL
  reward_type: string       # "recurring" | "one-time" | "tiered"
  cookie_days: number       # Cookie duration
  tags: string[]            # e.g., ["ai", "video", "saas"]

format: string              # OPTIONAL — "review" | "comparison" | "listicle" | "how-to"
                            # Default: "listicle" (highest traffic potential)

compare_with: object[]      # OPTIONAL — competitors for comparison/listicle formats
  - name: string            # Competitor name
    description: string     # Brief description
    url: string             # URL (non-affiliate OK)
    pricing: string         # Starting price

target_keyword: string      # OPTIONAL — primary SEO keyword to target
                            # Default: auto-generated from product name + category

blog_platform: string       # OPTIONAL — "wordpress" | "ghost" | "hugo" | "astro" | "webflow" | "markdown"
                            # Default: "markdown" (universal)

tone: string                # OPTIONAL — "professional" | "conversational" | "technical"
                            # Default: "conversational"

word_count_target: number   # OPTIONAL — override default word count for the format
```

**Chaining from S1**: If `affiliate-program-search` was run earlier in the conversation, automatically pick up `recommended_program` from its output as the `product` input. The field mapping:
- `recommended_program.name` → `product.name`
- `recommended_program.description` → `product.description`
- `recommended_program.reward_value` → `product.reward_value`
- `recommended_program.url` → `product.url`
- `recommended_program.reward_type` → `product.reward_type`
- `recommended_program.cookie_days` → `product.cookie_days`
- `recommended_program.tags` → `product.tags`

If the user says "now write a blog about it" after running S1 — use the recommended program. No need to ask again.

## Workflow

### Step 1: Determine Format

Choose the article format based on user request or defaults:

| Signal | Format |
|---|---|
| User says "review", "my experience with" | `review` |
| User mentions two+ products, "vs", "compare" | `comparison` |
| User says "best", "top", "roundup", numbers | `listicle` |
| User says "how to", "tutorial", "guide", "step by step" | `how-to` |
| No clear signal | `listicle` (default — highest traffic potential) |

If `format = comparison` and `compare_with` is empty or has only 1 product:
- Use `web_search` to find 2-3 top competitors in the same category
- Search query: `"best alternatives to [product.name]" OR "[product.name] vs" site:g2.com OR site:capterra.com`

If `format = listicle` and `compare_with` is empty:
- Use `web_search` to find 4-6 products in the same category
- Search query: `"best [product category] tools [year]"`

### Step 2: SEO Framework

Read `references/seo-checklist.md` for the complete SEO guidelines. Then:

1. **Generate target keyword** (if not provided):
   - Review format: `[product name] review`
   - Comparison: `[product A] vs [product B]`
   - Listicle: `best [category] tools`
   - How-to: `how to [goal] with [product/category]`

2. **Generate secondary keywords** (3-5):
   - Use `web_search` for: `"[target keyword]" related searches` and "People Also Ask"
   - Include: `[product] pricing`, `[product] alternatives`, `[product] pros and cons`, `is [product] worth it`

3. **Build title** using the formula from seo-checklist.md matching the format

4. **Write meta description** (150-160 chars) following the checklist format

5. **Plan heading structure**:
   - Map out all H2/H3 headings before writing
   - Ensure target keyword appears in at least 2 H2s
   - Ensure secondary keywords appear in H3s
   - Follow the heading hierarchy from seo-checklist.md

6. **Generate slug** from target keyword (lowercase, hyphens, no stop words)

### Step 3: Write Article

Read `references/blog-templates.md` and use the template matching the chosen format. Then write the full article following these rules:

**Content Rules:**
- Follow the exact template structure for the chosen format
- Write in the specified `tone` (default: conversational)
- Hit the word count target for the format (review: 2-3.5K, comparison: 2.5-3.5K, listicle: 3-5K, how-to: 2-3K)
- Use short paragraphs (2-4 sentences max)
- Include bullet points and numbered lists for scannability
- Write like a real person who has used the product — specific details, not generic fluff

**Required Sections (all formats):**
- FTC disclosure near the top — read `shared/references/ftc-compliance.md` and use the **medium** format
- Comparison table (at least one, even in reviews — compare to alternatives)
- Pros and cons for every recommended product
- "Who is this best for?" audience targeting
- Pricing information with affiliate CTA
- FAQ section (3-5 questions)
- Final verdict with clear recommendation and affiliate CTA

**Affiliate CTA Placement (2-4 per article):**
1. After the pricing section
2. After a key feature demonstration
3. In the final verdict
4. Optionally: in a callout box after the "who is this for" section

**CTA Formats:**
- Soft: `[Try [Product] free →]([affiliate_url])`
- Medium: `**Ready to get started?** [Sign up for [Product] →]([affiliate_url])`
- Strong (verdict only): `**Our recommendation**: [Get [Product] here]([affiliate_url]) — [brief value prop].`

**Things to AVOID:**
- No Affitor branding in the article body (this is the user's blog, not ours)
- No "AI-generated" disclaimers (the user will edit and personalize)
- No placeholder text like "[insert your experience here]" — write complete content. If personal experience is needed, write realistic example scenarios clearly marked as examples
- No keyword stuffing — natural language only
- No false claims about products

### Step 4: Format Output

Produce the final output in this exact structure:

**Part 1: SEO Metadata Block**
```
---
SEO METADATA
---
Title: [SEO title]
Slug: [url-slug]
Meta Description: [150-160 chars]
Target Keyword: [primary keyword]
Secondary Keywords: [comma-separated list]
Word Count: [actual count]
Format: [review/comparison/listicle/how-to]
---
```

**Part 2: Full Article**
The complete markdown article ready to paste into any blogging platform.

**Part 3: Supplementary Data**
```
---
SUPPLEMENTARY
---
FAQ Questions (for schema markup):
1. [Question] → [Answer]
2. [Question] → [Answer]
...

Image Suggestions:
1. [Description] — alt: "[alt text]"
2. [Description] — alt: "[alt text]"
...

Products Featured:
- [Product 1]: [affiliate URL] (featured/mentioned)
- [Product 2]: [affiliate URL] (compared/mentioned)
...

Next Steps:
- Personalize: Add your own experience, screenshots, and results
- Images: Take product screenshots and add them at suggested locations
- Links: Replace affiliate URLs with your own tracking links
- Publish: See references/wordpress-deploy.md for WordPress setup guide
- Promote: Run viral-post-writer to create social posts promoting this article
---
```

## Output Schema

```yaml
article:
  title: string             # SEO-optimized title
  slug: string              # URL-friendly slug
  meta_description: string  # 150-160 character meta description
  target_keyword: string    # Primary keyword targeted
  format: string            # review | comparison | listicle | how-to
  content: string           # Full markdown article
  word_count: number        # Actual word count
  headings:                 # Article structure
    - level: number         # 2 for H2, 3 for H3
      text: string          # Heading text

seo:
  secondary_keywords: string[]    # 3-5 secondary keywords used
  faq_questions:                  # For FAQ schema markup
    - question: string
      answer: string
  image_suggestions:              # Recommended images
    - description: string         # What to screenshot/create
      alt_text: string            # SEO alt text
      placement: string           # After which section

products_featured:                # All products mentioned
  - name: string
    url: string                   # Affiliate URL
    role: string                  # "primary" | "compared" | "mentioned"
    reward_value: string          # Commission info
```

## Output Format

Present the output as a single markdown document with three clearly separated sections:
1. **SEO Metadata** — fenced block with all SEO settings for easy copy into WordPress/Yoast
2. **Article** — the full blog post in markdown, ready to paste
3. **Supplementary** — FAQ for schema markup, image suggestions, products list, and next steps

The article should be **immediately publishable** — not a draft or outline. The user should be able to copy-paste it into their blog editor, add their own screenshots and personal touches, and publish.

## Error Handling

- **No product provided**: "I need a product to write about. Run `/affiliate-program-search` first to find one, or tell me the product name and I'll research it."
- **Comparison with only 1 product**: Auto-search for 2-3 competitors using `web_search`. Search: `"best alternatives to [product]"` on G2/Capterra.
- **No compare_with for listicle**: Auto-search for 4-6 products in the category. Inform user: "I found these products to include — let me know if you want to swap any."
- **Unknown blog platform**: Default to markdown output. Add note: "This is universal markdown — works with WordPress, Ghost, Hugo, Astro, and most platforms."
- **Product has no public info**: Use `web_search` to research the product. If still insufficient: "I couldn't find enough information about [product] to write a credible article. Can you provide more details about features, pricing, and your experience?"
- **Controversial or questionable product**: Include balanced pros/cons. Add note: "This product has mixed reviews — make sure you've personally verified these claims before publishing."

## Examples

### Example 1: Product Review (chained from S1)
**User**: "Now write a detailed review of HeyGen for my blog"
**Context**: S1 previously returned HeyGen as recommended_program
**Action**: Auto-detect format=review, pick up HeyGen product data from S1 output, generate full review article targeting "heygen review" keyword.

### Example 2: Comparison Article
**User**: "Write a comparison blog post: HeyGen vs Synthesia vs Colossyan for AI video creation"
**Action**: Format=comparison, primary product=HeyGen (if from S1, else first mentioned), compare_with=[Synthesia, Colossyan], target keyword="heygen vs synthesia vs colossyan".

### Example 3: Listicle (Default Format)
**User**: "Write a blog post about the best AI video tools"
**Action**: Format=listicle (matches "best"), web_search for top AI video tools, target keyword="best ai video tools", write 3-5K word roundup with 5-7 products.

### Example 4: How-To Guide
**User**: "Write a tutorial blog post on how to create AI-generated videos for YouTube with HeyGen"
**Action**: Format=how-to (matches "tutorial", "how to"), target keyword="how to create ai videos for youtube", write step-by-step guide featuring HeyGen with affiliate CTAs.

### Example 5: Minimal Input
**User**: "Blog post about Semrush"
**Action**: No format specified → default to listicle? No — single product implies review. Use format=review, web_search Semrush for features/pricing/reviews, target keyword="semrush review", generate full article.

**Format detection logic for ambiguous cases**: If only one product is mentioned with no format keyword, default to `review`. If a category is mentioned with no specific product, default to `listicle`.

## References

- `references/seo-checklist.md` — Title formulas, meta description rules, heading hierarchy, keyword density, content depth guidelines. Read in Step 2.
- `references/blog-templates.md` — Four article format templates (review, comparison, listicle, how-to) with exact structure. Read in Step 3.
- `references/wordpress-deploy.md` — WordPress publishing guide, Yoast SEO setup, Pretty Links, FAQ schema implementation. Reference in Step 4 next steps.
- `shared/references/ftc-compliance.md` — FTC disclosure requirements and format templates. Read in Step 3 for disclosure text.
- `shared/references/affitor-branding.md` — Affitor brand guidelines. Note: NO Affitor branding in article body (user's blog). Only in tool output metadata.
- `shared/references/affiliate-glossary.md` — Affiliate marketing terminology reference.


---

## From `comparison-post-writer`

> >

# Comparison Post Writer

Write high-converting "X vs Y" comparison blog posts that rank on Google and help readers make a confident buying decision. Each post includes a feature comparison table, individual product breakdowns, pros and cons, a clear winner recommendation, and affiliate CTAs placed at maximum-intent moments.

## When to Use

- User wants to compare two or three competing products side by side
- User has two affiliate programs and wants a single article that covers both
- User says "vs", "versus", "compare", "which is better", "side by side"
- User wants to capture high-intent search traffic (X vs Y searches convert at 2-3x the rate of generic reviews)
- User has a product from S1 and wants to frame it against competitors

## Workflow

### Step 1: Identify Products to Compare

Parse the user's request for product names. You need a minimum of 2 and a maximum of 3 products.

**If only 1 product is provided:**
- Use `web_search` to find the top 1-2 competitors
- Search: `"[product name] alternatives" OR "[product name] vs" site:g2.com OR site:capterra.com OR site:trustradius.com`
- Pick the competitors with the most head-to-head search volume

**If 3+ products are provided:**
- Keep all 3 if they are genuinely comparable
- If the user listed 4+, ask which 2-3 to focus on — more than 3 makes the comparison unwieldy

**Affiliate priority**: The user's affiliate product goes first (featured position). If both products have affiliate links, feature the higher-commission one in the "winner" slot unless the product genuinely loses on quality.

### Step 2: Research Both Products

For each product, use `web_search` to gather:
1. **Pricing**: starting price, tiers, free trial availability
2. **Key features**: 8-12 features that matter to buyers
3. **Target audience**: who uses this product and why
4. **Known weaknesses**: common complaints on G2, Capterra, Reddit, or Trustpilot
5. **Unique differentiator**: one thing this product does better than everyone else
6. **Search volume signal**: `"[product A] vs [product B]"` — check if autocomplete shows this is a real query

Search queries to run per product:
- `"[product name] review [year]"`
- `"[product name] pricing"`
- `"[product name] pros cons"`

### Step 3: Build the Comparison Framework

Determine the 6-10 comparison dimensions that matter most for this product category. These should be:
- Directly relevant to buyer decisions (not vanity features)
- Measurable or clearly differentiable between products
- Things that appear in search queries ("does X have [feature]?")

**Example dimensions by category:**
- Email tools: deliverability, automation, templates, integrations, pricing/contacts ratio, free plan
- SEO tools: keyword database size, backlink data, site audit depth, reporting, API access, pricing
- Video tools: resolution, AI avatars, voice cloning, templates, render speed, watermark on free plan
- Project management: task limits on free, Gantt chart, time tracking, automations, integrations, mobile app

Assign a winner per dimension based on research. Mark ties where genuine.

### Step 4: Determine the Narrative Angle

Choose one of three angles based on what the data shows:

| Angle | When to use | Headline formula |
|---|---|---|
| **Clear winner** | One product is genuinely better for most users | "[A] vs [B]: [A] Wins for Most, But [B] Is Better If..." |
| **It depends** | Products serve different audiences | "[A] vs [B]: Which Is Right for You? (Honest Comparison)" |
| **Upset** | Lesser-known product beats the market leader | "[A] vs [B]: Why [Lesser-Known] Is Actually Better in [Year]" |

Default to "clear winner" — readers want a recommendation, not a non-answer.

### Step 5: Write the Article

Write the full comparison post following this exact structure:

**1. FTC Disclosure** (3 lines, above the fold)
Read `shared/references/ftc-compliance.md` and use the medium format. Insert immediately after the title.

**2. Introduction** (150-250 words)
- Open with the core tension: why this is a hard choice
- State who each product is best suited for (one sentence each)
- End with: "By the end of this post, you'll know exactly which one to pick."
- Include target keyword naturally in the first 100 words

**3. Quick Verdict Box** (immediately after intro)
A scannable summary for readers who won't read the full article:
```
**Quick Verdict**
- Best overall: [Product A] — [one-line reason]
- Best for [use case]: [Product B] — [one-line reason]
- Best for budget: [Product X]
- Skip if: [edge case where neither works]
```

**4. Product Overviews** (200-300 words each)
One H2 section per product:
- What it is and what it does
- Who built it and when (brief credibility context)
- The one thing it does better than anyone else
- Starting price and free trial info
- Affiliate CTA: `[Try [Product] free →](affiliate_url)`

**5. Feature Comparison Table**
A full markdown table with all comparison dimensions:
```
| Feature | [Product A] | [Product B] |
|---|---|---|
| [Dimension 1] | ✅ Yes | ❌ No |
| [Dimension 2] | ⭐ Better | Good |
| Price | $X/mo | $Y/mo |
```
Use ✅ / ❌ / ⚠️ (partial) for binary features. Use descriptive text for nuanced ones. Bold the winner per row.

**6. Deep-Dive Sections** (one H2 per key dimension, 3-4 total)
Pick the 3-4 dimensions that drive 80% of buying decisions. For each:
- Explain what the feature does and why it matters
- Compare both products specifically (not generically)
- Include a sub-verdict: "Winner: [Product] because..."

**7. Pricing Breakdown**
- Table showing all pricing tiers for both products
- Calculate cost at 3 usage levels: starter, growing, scale
- Highlight free plan differences
- Note which has better value per feature

**8. Pros and Cons**
Two H3 sections (one per product), each with 4-6 bullet points per list.

**9. Who Should Choose Each Product**
Two H3 sections with bullet lists:
- "Choose [Product A] if you..."
- "Choose [Product B] if you..."
Be specific — job titles, use cases, budget ranges, team sizes.

**10. The Verdict** (200-300 words)
- State the winner clearly: "[Product A] is the better choice for most people."
- Explain why in 2-3 sentences
- Acknowledge the exception case where [Product B] wins
- Final affiliate CTA (strong format): `**Get started with [Product A] →**(affiliate_url)`
- If [Product B] also has affiliate link: secondary CTA below

**11. FAQ Section** (5-7 questions)
Address the real questions people type into Google:
- "Is [Product A] better than [Product B]?"
- "Which is cheaper, [A] or [B]?"
- "Does [Product A] offer a free trial?"
- "Can I switch from [Product B] to [Product A]?"
- "Which has better customer support?"

### Step 6: Format Output

Produce output in three parts:

**Part 1: SEO Metadata**
```
---
SEO METADATA
---
Title: [title]
Slug: [product-a]-vs-[product-b]
Meta Description: [150-160 chars comparing both products with clear angle]
Target Keyword: [product-a] vs [product-b]
Secondary Keywords: [product-a] review, [product-b] alternatives, best [category] tool, [product-a] pricing
Word Count: [actual]
Format: comparison
Winner: [product name]
---
```

**Part 2: Full Article**
Complete markdown ready to paste into any blog platform.

**Part 3: Supplementary Data**
FAQ schema questions, image suggestions (comparison screenshots), products featured with affiliate URLs, next steps.

## Input Schema

```yaml
product_a:                  # REQUIRED — the primary affiliate product
  name: string
  description: string
  reward_value: string      # e.g., "30% recurring"
  url: string               # Affiliate link
  reward_type: string       # "recurring" | "one-time" | "tiered"
  cookie_days: number
  tags: string[]

product_b:                  # REQUIRED — the product to compare against
  name: string
  url: string               # Affiliate link if available, otherwise homepage
  description: string       # Optional — will research if missing

product_c:                  # OPTIONAL — third product for 3-way comparison
  name: string
  url: string
  description: string

target_keyword: string      # OPTIONAL — default: "[product_a] vs [product_b]"
tone: string                # OPTIONAL — "conversational" | "technical" | "professional"
                            # Default: "conversational"
angle: string               # OPTIONAL — "clear-winner" | "it-depends" | "upset"
                            # Default: auto-detected from research
```

## Output Schema

```yaml
article:
  title: string
  slug: string              # e.g., "heygen-vs-synthesia"
  meta_description: string
  target_keyword: string
  format: "comparison"
  content: string           # Full markdown article
  word_count: number
  winner: string            # Name of the recommended product

comparison:
  dimensions: string[]      # The features compared
  dimension_winners:        # Who won each dimension
    - dimension: string
      winner: string        # "product_a" | "product_b" | "tie"

products_featured:
  - name: string
    url: string
    role: string            # "primary" | "compared"
    reward_value: string

seo:
  secondary_keywords: string[]
  faq_questions:
    - question: string
      answer: string
  image_suggestions:
    - description: string
      alt_text: string
```

## Output Format

Present as three sections:
1. **SEO Metadata** — fenced block for copy-paste into WordPress/Yoast/Ghost
2. **Article** — complete markdown, immediately publishable
3. **Supplementary** — FAQ schema, image suggestions, products list, next steps

Target word count: 2,500-3,500 words. Longer for complex SaaS tools with many features.

## Error Handling

- **Only 1 product provided**: Auto-search for top 2 competitors. Inform user: "I found [B] and [C] as the main competitors — using those. Let me know if you want different ones."
- **No affiliate link for product_b**: Use homepage URL. Note in output: "No affiliate link for [B] — using homepage. You can still earn on [A] clicks."
- **Products in completely different categories**: Stop and ask — comparing an email tool to a project management tool is not useful.
- **Controversial product (MLM, scam accusations)**: Add warning note: "This product has mixed reputation signals. Review carefully before publishing — your credibility is at stake."
- **Tie on most dimensions**: Use "it depends" angle. Never force a winner that isn't real — readers trust honest comparisons more.

## Examples

**Example 1: Two affiliate products**
User: "Write a comparison post: HeyGen vs Synthesia"
Action: product_a=HeyGen (affiliate), product_b=Synthesia (affiliate), research both, detect angle=clear-winner (or it-depends based on data), write 3,000-word comparison targeting "heygen vs synthesia".

**Example 2: Chained from S1**
User: "Compare it with its top competitor"
Context: S1 returned HeyGen as recommended_program
Action: product_a=HeyGen from S1 output, web_search for top competitor, write comparison.

**Example 3: Three-way comparison**
User: "HeyGen vs Synthesia vs Colossyan comparison post"
Action: Three-way comparison, determine winner + runners-up, write 3,500-4,000 word article with side-by-side table.

**Example 4: Underdog angle**
User: "Compare Ahrefs vs Ubersuggest — I'm promoting Ubersuggest"
Action: product_a=Ubersuggest (affiliate), product_b=Ahrefs, angle=upset (lesser-known vs market leader), frame Ubersuggest as the budget-friendly winner for specific use cases.

## References

- `shared/references/ftc-compliance.md` — FTC disclosure text. Read in Step 5.
- `shared/references/affitor-branding.md` — Do NOT add Affitor branding to blog body. Only applies to landing pages.
- `shared/references/affiliate-glossary.md` — Terminology reference.


---

## From `how-to-tutorial-writer`

> >

# How-To Tutorial Writer

Write practical, step-by-step tutorial blog posts that solve a real reader problem and naturally recommend affiliate products as the best tool for the job. Uses the "problem → solution → tool" pattern: establish what the reader wants to do, show them exactly how to do it, and position the affiliate product as the right instrument for each step.

## When to Use

- User wants to create educational content that drives affiliate conversions indirectly
- User says "how to", "tutorial", "guide", "walkthrough", "step by step"
- User wants to rank for "how to [task]" keywords (high traffic, lower competition than "best" keywords)
- User has a product that is best understood through demonstration, not just description
- User wants to build authority and trust in a niche before making a sale

## Workflow

### Step 1: Define the Tutorial Goal

Parse the request to identify:
- **The task**: what the reader wants to accomplish (e.g., "create AI videos for YouTube")
- **The tool**: which affiliate product enables the task (e.g., HeyGen)
- **The audience**: who is asking this question (beginner / intermediate / advanced)
- **The end state**: what the reader will have built or achieved by the end

If the task is vague ("write a tutorial about HeyGen"), default to the most popular use case for that tool — search for it: `"[product name] tutorial" OR "how to use [product name]"` — pick the highest-traffic query.

**Tutorial types** — detect from user's phrasing:
| Signal | Type | Format |
|---|---|---|
| "How to get started", "beginners guide", "first time" | `quickstart` | 5-8 steps, 1,500-2,000 words |
| "Step by step", "complete guide", "full tutorial" | `deep-dive` | 8-15 steps, 2,500-3,500 words |
| "How to [specific feature]" | `feature-focus` | 5-8 steps on one feature, 1,500-2,000 words |
| "How to [goal] without [product]" → redirect to product | `problem-solution` | 6-10 steps, 2,000-2,500 words |

### Step 2: Research the Tutorial Content

Use `web_search` to gather:
1. The actual step-by-step process for accomplishing the task
2. Common mistakes or gotchas beginners encounter
3. Official documentation or help articles for the product
4. What the top-ranking tutorials already cover (identify gaps)

Search queries:
- `"how to [task] with [product]"` — understand existing guides
- `"[product] tutorial [year]"` — find current instructions
- `"[product] [feature] settings"` — get accurate step names
- `"[task] mistakes beginners make"` — find pain points to address

**Content accuracy rule**: Never invent product UI details. If unsure about a specific button name or menu path, describe the action generically ("navigate to the settings section") rather than naming something that may be wrong.

### Step 3: Plan the Tutorial Structure

Map every section before writing. A well-structured tutorial follows this flow:

**What readers need before starting (Prerequisites):**
- Account requirements (free plan vs. paid tier needed for tutorial steps)
- Technical requirements
- Assets they should have ready (images, scripts, data)

**The steps themselves:**
- Each step = one atomic action (not a cluster of actions)
- Steps should be numbered, not just bulleted
- Each step has: action verb headline + explanation + expected result
- Decision points get callout boxes: "If you see X, do Y instead"

**Affiliate integration points** (natural, not forced):
1. In the Prerequisites section: "You'll need a [Product] account. [Sign up free here →](url)"
2. At the step where the product's key feature is used: contextual CTA
3. After showing the final result: "You just did X with [Product]. Here's what else it can do: [affiliate CTA]"
4. In the "Next Steps" section at the end

**Rule**: Never interrupt a step sequence with a hard sell. CTAs belong at natural pause points — before the reader starts, after they finish a major phase, and at the very end.

### Step 4: Write the Full Tutorial

**Title formula:**
- `How to [Task] with [Product]: Step-by-Step Guide ([Year])`
- `How to [Task]: A Beginner's Guide Using [Product]`
- `[Goal]: How to [Task] in [N] Steps (Even If You're New to [Topic])`

**Introduction (150-200 words):**
- Open with the reader's problem/desire (not with "In this tutorial...")
- State the end result: "By the end, you'll have [specific output]"
- Mention how long it takes and what level of experience is needed
- One-sentence product intro: "[Product] is what makes this possible — here's how to use it."
- Affiliate CTA if they need to sign up before starting

**Prerequisites section:**
```
**What you need before starting:**
- A [Product] account (free plan works / Pro plan required for [specific feature])
  → [Create your free account →](affiliate_url)
- [Any other required tool/asset/knowledge]
- Estimated time: [X minutes]
```

**Step-by-Step Section:**
Write each step as:
```
## Step [N]: [Action Verb] + [What You're Doing]

[2-4 sentence explanation of what this step does and why it matters]

1. [Specific sub-action with exact UI element names where known]
2. [Next sub-action]
3. [Continue...]

**You should see:** [description of what the expected result looks like]

> **Note:** [Optional callout for a common mistake or alternative path]
```

**Result/Output Section:**
After all steps, show what the reader has built:
- Describe the final output in concrete terms
- Include what they can do with it now
- Contextual affiliate CTA: "Now that you've [achieved X], you can use [Product]'s [feature] to take it further."

**Troubleshooting Section** (optional, high SEO value):
3-5 common issues readers might hit:
- "Error: [X]" → "This usually means [Y]. Fix it by [Z]."
- "Step 4 doesn't work if [condition]" → "Instead, try [alternative]."

**Next Steps Section:**
- What to do with the result
- Related features of the product to explore next
- Related tutorials (if user has other content)
- Final strong affiliate CTA

**FAQ Section (4-6 questions):**
- "Do I need a paid plan for [product] to follow this tutorial?"
- "How long does [task] take?"
- "Can I do this without [product]?"
- "Is [product] free to use for [task]?"
- "What should I do if [common problem]?"

### Step 5: Format Output

**Part 1: SEO Metadata**
```
---
SEO METADATA
---
Title: [title]
Slug: how-to-[task-slug]
Meta Description: [150-160 chars — include "how to", the task, and product name]
Target Keyword: how to [task] with [product]
Secondary Keywords: [product] tutorial, [task] guide, how to [task] [year], [product] for beginners
Word Count: [actual]
Format: how-to
Steps: [N]
---
```

**Part 2: Full Article**
Complete markdown ready to publish.

**Part 3: Supplementary Data**
- FAQ schema questions/answers
- Screenshot suggestions (one per major step)
- Products featured with affiliate URLs
- Video script outline (optional — if user wants to turn this into a YouTube tutorial)

## Input Schema

```yaml
task:                       # REQUIRED — what the reader wants to accomplish
  description: string       # e.g., "create an AI avatar video for YouTube"
  goal: string              # The end state — "a published YouTube video with AI avatar"

product:                    # REQUIRED — the affiliate tool that enables the task
  name: string
  description: string
  reward_value: string
  url: string               # Affiliate link
  reward_type: string
  cookie_days: number
  tags: string[]

tutorial_type: string       # OPTIONAL — "quickstart" | "deep-dive" | "feature-focus" | "problem-solution"
                            # Default: auto-detected from task complexity

audience_level: string      # OPTIONAL — "beginner" | "intermediate" | "advanced"
                            # Default: "beginner" (wider audience)

supporting_tools: object[]  # OPTIONAL — other tools used alongside the primary product
  - name: string
    url: string
    purpose: string         # What role this tool plays in the tutorial

target_keyword: string      # OPTIONAL — override default "how to [task]" keyword

tone: string                # OPTIONAL — "conversational" | "technical"
                            # Default: "conversational"

include_video_outline: boolean  # OPTIONAL — generate a YouTube video script outline alongside
                                # Default: false
```

## Output Schema

```yaml
article:
  title: string
  slug: string
  meta_description: string
  target_keyword: string
  format: "how-to"
  tutorial_type: string     # quickstart | deep-dive | feature-focus | problem-solution
  content: string
  word_count: number
  steps:
    - number: number
      headline: string      # Step heading
      affiliate_cta: boolean # Whether this step contains a CTA

products_featured:
  - name: string
    url: string
    role: string            # "primary-tool" | "supporting-tool"
    reward_value: string
    cta_placement: string[] # Which sections contain CTAs for this product

seo:
  secondary_keywords: string[]
  faq_questions:
    - question: string
      answer: string
  screenshot_suggestions:   # One per major step — high-value for tutorials
    - step: number
      description: string
      alt_text: string

video_outline:              # Only if include_video_outline=true
  title: string
  hook: string              # First 30 seconds script
  chapters:
    - timestamp: string     # e.g., "0:00"
      title: string
  description_for_youtube: string
  tags: string[]
```

## Output Format

Present as three sections:
1. **SEO Metadata** — fenced block for copy-paste into CMS
2. **Article** — complete markdown, immediately publishable
3. **Supplementary** — FAQ schema, screenshot suggestions, affiliate URLs, optional video outline

Target word count: 1,500-3,500 words based on tutorial type. Quality over length — do not pad steps.

## Error Handling

- **Task too vague** ("tutorial about email marketing"): Ask: "What specific task should the tutorial walk through? For example: 'how to set up an automated welcome email sequence in Mailchimp'."
- **No product provided**: "Which product should this tutorial feature? If you don't have one in mind, I can suggest the best tool for [task]."
- **Product feature requires paid plan**: Note clearly in Prerequisites section and add affiliate CTA. Do not hide paid requirements.
- **Task not suited for a single tutorial** (too complex): "This task has multiple phases — I'll write a [quickstart] tutorial focused on [first phase]. Let me know if you want additional tutorials for the other phases."
- **Product UI has changed**: Use generic action descriptions where UI details are uncertain. Add note: "Screenshots may vary slightly from your current version of [Product]."

## Examples

**Example 1: Product-driven tutorial**
User: "Write a tutorial on how to create AI avatar videos with HeyGen"
Action: task="create AI avatar video", product=HeyGen, audience=beginner, tutorial_type=deep-dive, write 12-step guide targeting "how to create ai avatar video with heygen".

**Example 2: Goal-driven tutorial**
User: "Write a how-to guide for automating social media posts"
Action: web_search for best social media automation tool, present to user for affiliate selection (or auto-select if S1 already ran), write problem-solution tutorial targeting "how to automate social media posts".

**Example 3: Feature-specific tutorial**
User: "Tutorial on how to use Semrush keyword magic tool"
Action: task="find keywords with Semrush Keyword Magic Tool", tutorial_type=feature-focus, write focused 8-step guide, affiliate CTAs at start and end.

**Example 4: With video outline**
User: "Write a HeyGen tutorial that I can also use as a YouTube video script"
Action: Same as Example 1 but with include_video_outline=true, output includes full video description, chapter markers, and hook script.

## References

- `shared/references/ftc-compliance.md` — FTC disclosure text. Insert after title.
- `shared/references/affiliate-glossary.md` — Terminology reference.


---

## From `listicle-generator`

> >

# Listicle Generator

Write "Top N Best [Category]" roundup articles that rank on Google, capture featured snippets, and drive affiliate conversions across multiple products. Each list entry is a self-contained mini-review with features, pricing, pros/cons, audience fit, and a CTA. The article is structured to win both the featured snippet and the "People Also Ask" box.

## When to Use

- User wants to cover an entire product category with multiple affiliate links
- User says "best", "top", "roundup", "list of", or mentions a number with a category
- User wants to capture high-volume generic keywords ("best email marketing tools") vs. specific product searches
- User has multiple affiliate programs in the same category and wants one article to cover them all
- User wants an article format that benefits from regular updates (add/remove products as market evolves)

## Workflow

### Step 1: Determine List Parameters

Parse the user's request for:
- **Category**: what type of product (e.g., "email marketing tools", "AI video generators")
- **List size (N)**: explicitly stated number, or auto-select based on category depth
  - Niche/specialized categories: 5-7 products
  - Broad/competitive categories: 7-10 products
  - Very broad (e.g., "project management tools"): 10-12 products
- **Target audience**: inferred from category + any context clues (beginners, enterprises, specific industries)
- **Year**: always use current year in the title for freshness signal

**If no affiliate product is specified:**
- Ask: "Which product are you promoting? I'll feature it prominently in the list."
- If user says to proceed anyway, generate a balanced list and note where they should insert their affiliate link.

### Step 2: Research the Product Landscape

Use `web_search` to build the product list:

1. **Seed query**: `"best [category] tools [year]" site:g2.com OR site:capterra.com OR site:trustradius.com`
2. **Validate with traffic**: `"best [category]"` — check autocomplete for common phrasings
3. **Find affiliate programs**: `"[category] affiliate program"` — identify which products offer commissions

For each candidate product, gather:
- Product name and one-line description
- Starting price and free plan availability
- G2/Capterra rating (if available)
- The one thing it does best (unique angle)
- Who it's primarily designed for

**Affiliate prioritization rules:**
- Position the user's affiliate product at #1 or #2 (never lower than #3 unless it genuinely cannot be defended in the top 3)
- #1 position gets the most clicks — use it for the highest-commission or best-converting product
- If the user has multiple affiliate programs, spread them in positions 1, 2, and 4
- Non-affiliate products fill the remaining slots to make the list credible and balanced

### Step 3: Plan the Article Structure

Map out every section before writing:

**Article structure:**
1. Title (with year, number, category)
2. FTC disclosure
3. Introduction (150-200 words)
4. "At a Glance" summary table
5. Evaluation criteria (H2)
6. Individual product entries × N (H2 each)
7. Comparison table (all products × key dimensions)
8. How to Choose (H2)
9. FAQ (H2)
10. Final Recommendation (H2)

**Per-entry structure** (400-600 words each):
- H2: `[Rank]. [Product Name] — [One-line Value Prop]`
- Opening paragraph: what it is, who made it, why it's on this list
- Key features section (3-5 bullet points)
- Pricing table (free / starter / pro / enterprise)
- Pros list (4-5 bullets)
- Cons list (2-3 bullets — be honest, builds trust)
- Best for: one sentence naming the ideal user
- Affiliate CTA button: `[Try [Product] free →](url)`

### Step 4: Write the Full Article

**Title formula:** `[N] Best [Category] Tools in [Year] (Ranked and Reviewed)`
Alternative: `Best [Category] Software: Top [N] Picks for [Year]`

**Introduction (150-200 words):**
- Open with the core problem this category solves
- Mention how many tools you evaluated and your selection criteria
- Name-drop 2-3 products from the list to signal comprehensiveness
- End with a transition: "Here are the [N] best options I found."

**"At a Glance" Table** (immediately after intro, captures featured snippet):
```
| Tool | Best For | Starting Price | Free Plan |
|---|---|---|---|
| [Product 1] | [Use case] | $X/mo | ✅ |
| [Product 2] | [Use case] | $Y/mo | ❌ |
```

**Evaluation Criteria (H2, before the list):**
List the 4-6 criteria used to rank products. This builds credibility and explains why your #1 pick is #1.
Example criteria: ease of use, feature depth, pricing value, customer support quality, integration ecosystem, scalability.

**Individual Product Entries:**
Write each entry following the per-entry structure above. Vary the opening sentence — don't start every entry the same way. Include specific, verifiable details (actual feature names, real pricing tiers, concrete limitations) — not generic praise.

**Master Comparison Table:**
After all product entries, include a comprehensive feature matrix:
```
| Feature | [P1] | [P2] | [P3] | [P4] | [P5] |
|---|---|---|---|---|---|
| Free plan | ✅ | ❌ | ✅ | ⚠️ | ✅ |
| [Key feature] | ✅ | ✅ | ❌ | ✅ | ❌ |
| [Key feature] | ⭐ Best | Good | Limited | Good | Basic |
| Starting price | $X | $Y | $Z | $A | Free |
```

**How to Choose (H2, 300-400 words):**
A decision framework for readers who are still unsure after reading the list:
- "If you're a beginner with a tight budget → [Product X]"
- "If you need [specific feature] → [Product Y]"
- "If you're scaling a team → [Product Z]"
- "If you're migrating from [common competitor] → [Product A]"

**FAQ Section (5-7 questions):**
- "What is the best [category] tool?"
- "What is the cheapest [category] tool?"
- "What [category] tool has the best free plan?"
- "Is [top product] worth it?"
- "How do I choose [category] software?"

**Final Recommendation (H2):**
- Restate the #1 pick with a 2-sentence reason
- Give a backup pick for a different audience
- Strong CTA: `**Start with [Product] — it's free to try.** [Get started →](affiliate_url)`

### Step 5: Format Output

**Part 1: SEO Metadata**
```
---
SEO METADATA
---
Title: [title with year and number]
Slug: best-[category-slug]-tools
Meta Description: [150-160 chars, include number + year + top product name]
Target Keyword: best [category] tools
Secondary Keywords: [category] software, [product 1] review, [product 2] alternatives, top [category] [year]
Word Count: [actual]
Format: listicle
Products: [N]
---
```

**Part 2: Full Article**
Complete markdown ready to publish.

**Part 3: Supplementary Data**
- FAQ questions for schema markup
- Image suggestions (product screenshots, comparison screenshots)
- All products with affiliate URLs flagged
- Update reminder: "This article should be refreshed every 6 months to keep rankings."

## Input Schema

```yaml
category:                   # REQUIRED — product category to cover
  name: string              # e.g., "AI video generators", "email marketing platforms"
  tags: string[]            # Optional — helps with research targeting

primary_product:            # OPTIONAL but recommended — the affiliate product to feature at #1
  name: string
  description: string
  reward_value: string
  url: string               # Affiliate link
  reward_type: string
  cookie_days: number
  tags: string[]

additional_affiliates:      # OPTIONAL — other affiliate products to include in the list
  - name: string
    url: string
    reward_value: string

list_size: number           # OPTIONAL — how many products (5-12). Default: auto-select.

target_audience: string     # OPTIONAL — "beginners" | "enterprise" | "freelancers" | "agencies"
                            # Default: inferred from category

year: number                # OPTIONAL — year for title/freshness. Default: current year.

target_keyword: string      # OPTIONAL — override default keyword
tone: string                # OPTIONAL — "conversational" | "professional". Default: "conversational"
```

## Output Schema

```yaml
article:
  title: string
  slug: string
  meta_description: string
  target_keyword: string
  format: "listicle"
  content: string
  word_count: number
  product_count: number

products_featured:
  - name: string
    url: string
    rank: number            # Position in the list (1 = top)
    role: string            # "affiliate-primary" | "affiliate-secondary" | "editorial"
    reward_value: string

seo:
  secondary_keywords: string[]
  at_a_glance_table: string   # Markdown table — can be extracted for featured snippet
  faq_questions:
    - question: string
      answer: string
  image_suggestions:
    - description: string
      alt_text: string
      placement: string

update_schedule:
  recommended_frequency: string   # "every 6 months" for most categories
  items_to_check: string[]        # What to verify on next update
```

## Output Format

Present as three sections:
1. **SEO Metadata** — fenced block for copy-paste into blog CMS
2. **Article** — full markdown, immediately publishable
3. **Supplementary** — FAQ schema, image suggestions, affiliate URLs, update notes

Target word count: 3,000-5,000 words depending on list size (aim for 400-500 words per product entry plus structural sections).

## Error Handling

- **No category provided**: "What category of products should this listicle cover? For example: 'best email marketing tools' or 'top AI writing assistants'."
- **No affiliate product specified**: Generate a balanced editorial list. Flag in output: "Affiliate link not set — insert your tracking URL for [top pick] before publishing."
- **Category too broad** ("best software"): Narrow it. Ask: "That's very broad — can you narrow it down? For example: 'best project management software for small teams'."
- **Category too niche** (fewer than 5 good products exist): Reduce list size and be transparent: "Only 5 strong options exist in this niche — I've included all of them."
- **Product research returns low-quality results**: Use web_search with 3 different query variations before giving up. Fallback: base entries on official product pages + G2 reviews.

## Examples

**Example 1: Standard category listicle**
User: "Write a top 10 best AI video tools article"
Action: category="AI video generators", list_size=10, research top tools, position user's affiliate at #1, write 4,500-word listicle targeting "best ai video tools [year]".

**Example 2: Niche with specific audience**
User: "Best email marketing tools for e-commerce, I'm promoting Klaviyo"
Action: category="email marketing for e-commerce", primary_product=Klaviyo, target_audience="e-commerce store owners", list_size=7, write article with Klaviyo at #1.

**Example 3: Alternatives format**
User: "Write a 'best alternatives to Mailchimp' article"
Action: Treat as listicle where Mailchimp is the incumbent being replaced. Title: "7 Best Mailchimp Alternatives in [Year] (Cheaper + More Powerful)". Position user's affiliate at #1 as top alternative.

**Example 4: Chained from S1**
User: "Now write a roundup post for the category"
Context: S1 returned Semrush in the SEO tools category
Action: category=SEO tools, primary_product=Semrush, auto-select list_size=8, write "Best SEO Tools [year]" with Semrush at #1.

## References

- `shared/references/ftc-compliance.md` — FTC disclosure text. Read before Step 4.
- `shared/references/affiliate-glossary.md` — Terminology reference.


---

## From `viral-post-writer`

> >

# Viral Post Writer

Write high-converting social media posts that promote affiliate products without feeling salesy. Each post uses proven viral frameworks, is tailored to the target platform, and includes proper FTC disclosure.

## Stage

This skill belongs to Stage S2: Content

## When to Use

- User wants to promote an affiliate product on social media
- User asks for LinkedIn posts, X/Twitter threads, Reddit posts, or Facebook posts
- User has picked a program (from S1 or manually) and needs content
- User wants "viral" or "engaging" social media content for affiliate marketing
- User asks how to naturally promote a product on a specific platform

## Input Schema

```
{
  product: {                  # (required) Product to promote — from S1 output or user-provided
    name: string              # "HeyGen"
    description: string       # What the product does (1-2 sentences)
    reward_value: string      # "30%" (for context — never shown in post)
    url: string               # Product website or affiliate link
  }
  platform: string            # (required) "linkedin" | "x" | "reddit" | "facebook" | "all"
  angle: string               # (optional, default: auto-selected) Content angle — see Viral Frameworks
  tone: string                # (optional, default: "conversational") "conversational" | "professional" | "casual" | "storytelling"
  audience: string            # (optional, default: inferred from platform) Target audience description
  personal_experience: string # (optional) User's real experience with the product — makes content authentic
  cta_style: string           # (optional, default: "soft") "soft" | "direct" | "question"
}
```

## Workflow

### Step 1: Gather Context

If not clear from conversation:
1. What product are they promoting? (Check if S1 ran earlier — use `recommended_program` from context)
2. Which platform? (If "all", generate for LinkedIn + X + Reddit)
3. Any personal experience with the product? (Authentic stories convert 3-5x better)

If user just says "write a post for HeyGen" → default to LinkedIn, conversational tone, soft CTA.

If product details are missing, use `web_search "[product name] features pricing"` to research.

### Step 2: Research the Product

Even if product info is provided, do a quick `web_search` to find:
- Recent product updates or launches (recency = virality)
- Common pain points the product solves (hook material)
- Competitor comparisons (contrast = engagement)
- Real user testimonials or reviews (social proof)

Extract 2-3 **specific details** — exact numbers, real features, concrete use cases. Generic "this tool is amazing" posts don't go viral.

### Step 3: Pick the Viral Framework

Select from `references/viral-frameworks.md` based on product + platform + angle.

If user specified an `angle`, use that framework. Otherwise, auto-select:

| Platform | Best Default Framework |
|----------|----------------------|
| LinkedIn | Transformation Story or Contrarian Take |
| X | Thread (Problem → Solution) or Hot Take |
| Reddit | Genuine Recommendation or Problem-Solve |
| Facebook | Before/After or Listicle |

### Step 4: Write the Post

Apply the selected framework from `references/viral-frameworks.md`.

**Critical rules:**
1. **Hook in first line** — reader decides in 1.5 seconds whether to keep reading
2. **Specific > generic** — "saved 4 hours/week on video editing" beats "great tool"
3. **Story > pitch** — wrap the recommendation in a narrative or discovery
4. **Platform-native format** — see `references/platform-specs.md` for formatting rules
5. **One CTA only** — don't overwhelm. One clear next step
6. **FTC compliance** — include disclosure per `shared/references/ftc-compliance.md` placement rules

**Never do:**
- Start with "I'm excited to share..." (LinkedIn death sentence)
- Use "game-changer", "revolutionary", "hands down the best" (empty superlatives)
- Put the link in the main post body on LinkedIn (algorithm penalty)
- Hard-sell in the first sentence
- Mention commission rates or that you're an affiliate (FTC requires disclosure, not details)
- Include "Powered by Affitor" branding (see `shared/references/affitor-branding.md`)

### Step 5: Add FTC Disclosure

Per platform (from `shared/references/ftc-compliance.md`):
- **LinkedIn:** "#ad | Affiliate link" at the end of the post body
- **X:** "#ad" in the tweet containing the link (usually last tweet in thread)
- **Reddit:** "Full disclosure: affiliate link" at the bottom
- **Facebook:** "#ad | Affiliate link" at the end

### Step 6: Format Output

Present the post ready to copy-paste. Include:
1. The post content (formatted for the platform)
2. Where to place the affiliate link
3. Best time to post (platform-specific)
4. 2-3 engagement tips for the specific platform

## Output Schema

Other skills can consume these fields from conversation context:

```
{
  posts: [
    {
      platform: string         # "linkedin" | "x" | "reddit" | "facebook"
      framework: string        # Which viral framework was used
      content: string          # The full post text, ready to copy-paste
      link_placement: string   # Where to put the affiliate link
      disclosure: string       # FTC disclosure text included
      hashtags: string[]       # Suggested hashtags (if applicable)
      best_time: string        # Best posting time for this platform
    }
  ]
  product_name: string         # For downstream skill chaining
  content_angle: string        # The angle used (for consistency across content)
}
```

## Output Format

```
## Viral Post: [Product Name] on [Platform]

**Framework:** [Name of viral framework used]
**Angle:** [The content angle]

---

### Post Content

[Full post text, formatted for the platform. Ready to copy-paste.]

---

### Posting Guide

| Detail | Value |
|--------|-------|
| Link placement | [Where to put the link] |
| Best time to post | [Platform-specific optimal time] |
| Expected engagement | [What metrics to watch] |

### Engagement Tips

1. [Tip specific to this platform + content type]
2. [Tip about responding to comments]
3. [Tip about amplifying reach]

### Variations

Want more options? Try these angles:
- **[Framework 2]:** [1-line preview of alternative approach]
- **[Framework 3]:** [1-line preview of alternative approach]
```

When platform = "all", generate separate sections for LinkedIn, X, and Reddit.

## Error Handling

- **No product info:** Ask the user what product they want to promote. Suggest running `affiliate-program-search` first.
- **Unknown platform:** Default to LinkedIn. Mention available platforms.
- **No personal experience:** Generate research-based content. Flag that personal stories convert better and suggest the user adds their own experience.
- **Product has no public info:** Use `web_search` to find product details. If truly nothing found, ask user to describe the product.
- **Controversial product:** If the product has significant negative reviews or ethical concerns, flag this to the user and suggest adjusting the angle.

## Examples

**Example 1:**
User: "Write a LinkedIn post promoting HeyGen"
→ Research HeyGen (AI video, 30% recurring, 60-day cookie)
→ Select "Transformation Story" framework for LinkedIn
→ Write: hook about video creation pain → discovered HeyGen → specific result → soft CTA
→ Link in first comment, FTC disclosure in post body

**Example 2:**
User: "Create an X thread about Semrush for SEO marketers"
→ Research Semrush features + recent updates
→ Select "Thread: Problem → Solution" framework
→ Write: 5-7 tweet thread, hook → pain points → how Semrush solves each → results → CTA in last tweet
→ FTC "#ad" in the tweet with the link

**Example 3:**
User: "I've been using Notion for 2 years, help me write a Reddit post"
→ Use personal experience as the core (authenticity = Reddit gold)
→ Select "Genuine Recommendation" framework
→ Write: problem context → how they discovered Notion → specific workflows → natural mention
→ "Full disclosure: affiliate link" at bottom
→ Recommend posting in r/productivity or r/Notion

**Example 4:**
User: "Promote GetResponse on all platforms"
→ Research GetResponse (email marketing, 33% recurring)
→ Generate 3 posts: LinkedIn (Transformation Story), X (Thread), Reddit (Genuine Recommendation)
→ Each tailored to platform format, audience, and link rules

## References

- `references/viral-frameworks.md` — the viral content frameworks with templates and examples
- `references/platform-specs.md` — character limits, formatting, optimal posting times per platform
- `shared/references/ftc-compliance.md` — FTC disclosure requirements and placement rules
- `shared/references/affitor-branding.md` — when to include/exclude Affitor branding (social = NO branding)
- `shared/references/affiliate-glossary.md` — affiliate marketing terminology


---

## From `reddit-post-writer`

> >

# Reddit Post Writer

Write Reddit posts and comments that earn upvotes by leading with genuine value.
The affiliate recommendation comes second — after trust is built. Reddit users
have a finely tuned spam detector. This skill helps affiliates write like Redditors,
not marketers.

## Stage

This skill belongs to Stage S2: Content

## When to Use

- User wants to drive affiliate traffic from Reddit
- User wants to recommend a product in a relevant subreddit
- User is active in a community and wants to add a helpful product mention
- User has a genuine experience with a product and wants to share it naturally
- User asks how to participate on Reddit without getting banned for self-promotion

## Input Schema

```
{
  product: {
    name: string              # (required) "Notion"
    description: string       # (optional) What the product does
    url: string               # (optional) Affiliate link — used in disclosure only
    reward_value: string      # (optional) Commission — never revealed in post
  }
  subreddit: string           # (optional) Target subreddit, e.g., "r/productivity"
  post_type: string           # (optional, default: auto) "post" | "comment_reply" | "ama_style"
  trigger_question: string    # (optional) Specific Reddit question or post you're replying to
  personal_experience: string # (optional) Real experience with the product to use as anchor
  audience: string            # (optional) Who reads this subreddit — "students", "developers"
  tone: string                # (optional, default: "genuine") "genuine" | "analytical" | "casual"
  problem_focus: string       # (optional) The specific problem this post addresses
}
```

## Workflow

### Step 1: Understand Reddit Culture First

Before writing, confirm the target subreddit context. If subreddit is provided,
use `web_search "reddit r/[subreddit] rules affiliate"` to check:
- Are affiliate links explicitly banned? (many subreddits ban them outright)
- What post formats are most common? (links, text posts, discussions)
- What gets upvoted vs. downvoted in this community?
- Is there a community expectation of neutrality or personal experience?

**Subreddits that generally tolerate product mentions:**
r/productivity, r/entrepreneur, r/Entrepreneur, r/sidehustle, r/personalfinance,
r/freelance, r/marketing, r/SEO, r/webdev, r/startups, r/smallbusiness

**Subreddits that are extremely ban-happy about promotion:**
r/frugal, r/cscareerquestions, r/AskReddit, r/personalfinance (strict on direct links)

If subreddit bans affiliate links: do NOT write a post with a link. Instead, write
a post that mentions the product by name with a note like "Search for [product]
affiliate program if interested." Disclose and redirect.

### Step 2: Determine the Post Type

**Option A — Original Post (new thread):**
Best when there's no existing discussion. Write a story, question, or breakdown that
organically leads to a product mention.
- "How I went from X to Y — the exact tools I used"
- "Anyone else use [product] for [use case]? Here's my 6-month review"
- "I tested 5 [category] tools so you don't have to — honest breakdown"

**Option B — Comment Reply (responding to an existing post):**
Highest trust format. Someone asks "what tool do you use for X?" and you reply helpfully.
- Write a substantive answer that doesn't mention the product until the 3rd+ paragraph
- Add value even without the product mention — if removed, the comment should still be helpful
- Product mention: "Personally, I use [product] and it's been solid for [specific use case]"

**Option C — AMA-Style / Experience Share:**
"I've been doing [X] for [N] years. Happy to share what's worked."
- Opens conversation, positions creator as authority
- Product naturally comes up when people ask "what tools do you use?"

If `trigger_question` is provided → use Option B. Otherwise, default to Option A.

### Step 3: Research Product and Find Reddit-Specific Angles

Use `web_search "reddit [product name] review"` to find:
- What real Reddit users are saying about the product (use their language)
- Common objections raised on Reddit (address these proactively)
- How competitors are discussed (context for framing)
- Questions people ask that your post can answer

Also use `web_search "reddit [problem space] best tools"` to understand:
- What alternatives Redditors currently recommend
- How to frame your recommendation as additive, not replacing their preferences
- What not to say (phrases that get downvoted in this community)

### Step 4: Write the Post

**Reddit post structure that converts:**

1. **Title** (for new posts): specific, searchable, sounds like a real person's question or story
   - Good: "I tried 4 project management tools over 2 years — here's what I actually use now"
   - Bad: "The BEST productivity tool I've ever used!! (link in post)"
   - Good: "[6 months update] How I finally stopped context-switching between apps"

2. **Opening paragraph**: establish credibility or relatability. NO product mention here.
   - "I've been freelancing for 3 years and I'm embarrassed by how long I tried to manage
     everything in spreadsheets."

3. **Body**: share the actual useful content — your experience, the problem, what you tried.
   This section should be valuable even without the product mention.

4. **Product introduction** (70-80% through the post): introduce naturally.
   - "Eventually I landed on [product] and I've stuck with it for [X months]."
   - Specific use case: what exactly you use it for, not vague praise
   - ONE honest con: "It's not perfect — the mobile app is weak — but for desktop work
     it's exactly what I needed." Cons dramatically increase trust.

5. **FTC disclosure** (at the bottom):
   - "Full disclosure: the link in my profile leads to an affiliate link. No extra cost
     to you, and I would recommend this tool regardless."
   - Or if not posting a link: "Not affiliated, just a genuine fan."
   - Per `shared/references/ftc-compliance.md` — disclosure is required for Reddit too.

6. **Closing**: invite discussion, not clicks.
   - "Happy to answer questions about my workflow in the comments."
   - Ask a question back: "What does your current setup look like?"

### Step 5: Anti-Spam Checklist

Before finalizing, run through this checklist:

- [ ] Post adds value even if the product mention is removed
- [ ] No exclamation marks in praise ("This tool is AMAZING!!")
- [ ] No superlatives without evidence ("best tool I've ever used" → needs qualifier)
- [ ] Affiliate link goes in comments or profile bio, NOT the main post body (most subreddits)
- [ ] FTC disclosure is present and clear
- [ ] Post doesn't read like a press release
- [ ] Includes at least one real limitation or caveat about the product
- [ ] Tone matches the subreddit (match voice to community)
- [ ] Username context matters — new accounts posting affiliate content get instant downvotes

### Step 6: Add Engagement Strategy

Reddit rewards participation, not broadcasting. Include:
1. **Reply strategy**: when commenters respond, how to keep conversation going naturally
2. **Upvote path**: what type of engagement to solicit (awards, saves, discussion)
3. **Subreddit timing**: best day/time to post in this subreddit
4. **Cross-post candidates**: which other subreddits this post could work in

## Output Schema

```
{
  post: {
    type: string              # "post" | "comment_reply" | "ama_style"
    subreddit: string         # "r/productivity"
    title: string | null      # For new posts only
    body: string              # Full post/comment body
    link_placement: string    # Where to put the affiliate link
    disclosure: string        # The disclosure text used
    char_count: number
  }
  subreddit_notes: {
    allows_affiliate_links: boolean
    community_tone: string
    best_post_time: string
    cross_post_subreddits: string[]
  }
  engagement_tips: string[]
  product_name: string
  content_angle: string
}
```

## Output Format

```
## Reddit Post: [Product Name]

**Type:** [New Post / Comment Reply / AMA-style]
**Target Subreddit:** [r/subreddit]
**Subreddit allows affiliate links:** [Yes / No / Link in comments only]

---

### Post Title (for new posts)

[Post title here]

---

### Post Body

[Full post text, formatted with Reddit markdown — use **bold**, *italic*, > quotes
as appropriate. Paragraphs separated by blank lines.]

---

### Link Placement

[Where to put the affiliate link — in post, in comment, or profile bio — and why]

---

### Subreddit Notes

- **Community tone:** [What vibe this subreddit has]
- **Best time to post:** [Day and time]
- **Watch out for:** [Specific rules or sensitivities]

---

### Cross-Post Opportunities

This post could also work in:
1. [r/subreddit2] — [why]
2. [r/subreddit3] — [why]

---

### Engagement Tips

1. [How to respond to likely comments]
2. [How to handle skeptics or downvotes]
3. [When to resurface this content]

---

### Alternative Angles

- **[Alternative 1]:** [Different framing for the same product]
- **[Alternative 2]:** [...]
```

## Error Handling

- **Subreddit bans affiliate links outright:** Flag this clearly. Rewrite without a direct
  link — mention the product by name only, disclosure becomes "not affiliated, genuine rec."
  Suggest building karma in the subreddit first with unrelated helpful posts.
- **No personal experience provided:** Write from a researched perspective but clearly label
  it as such ("Based on what I've seen from other users..."). Recommend the user add their
  own experience before posting — fabricated personal experience on Reddit gets called out.
- **Product is controversial on Reddit:** Acknowledge the controversy directly in the post.
  "I know [product] gets mixed reviews here. Here's my honest take after [X months]..."
  This signals authenticity and pre-empts downvote brigading.
- **User asks to mass-post the same content:** Refuse this pattern. It's spam and will
  result in account bans. Write unique versions for each subreddit.
- **New Reddit account:** Add warning: "New accounts posting affiliate content are
  immediately suspect. Build 3-6 months of genuine participation first."
- **Product has no free tier / high price:** Don't hide this. State the price early.
  "It's not cheap — $X/mo — but here's why it's been worth it for me."

## Examples

**Example 1:**
User: "Write a Reddit post for r/productivity recommending Notion"
→ No trigger question → write original post
→ Title: "Finally stopped fighting my productivity system — 18 months with Notion"
→ Body: relatable struggle with scattered notes → what I tried → landed on Notion →
  specific workflows I use → honest con (learning curve) → disclosure at bottom
→ Affiliate link in first comment, not the post body

**Example 2:**
User: "Someone on r/freelance asked 'what tools do you use to manage clients?' — write a reply"
→ Comment reply format, responding to that specific question
→ Open with the full workflow (3-4 tools) — Notion is one of several, not the only mention
→ Position Notion as the project management layer specifically
→ Mention it's in my profile link if they want the affiliate version
→ Disclosure at bottom of comment

**Example 3:**
User: "Write a Reddit post about HeyGen for r/videography"
→ Check r/videography rules — likely strict about promotion
→ Frame as experience share: "I tried AI avatar video for client work — here's my honest take"
→ Include real limitations prominently (not real filmmaker footage, uncanny valley)
→ Position as "works for explainer/promo videos, not cinema" — niche and honest
→ Disclosure present, link in comments only

## References

- `shared/references/ftc-compliance.md` — FTC disclosure requirements for Reddit
- `shared/references/platform-rules.md` — Reddit-specific format and link rules
- `shared/references/affiliate-glossary.md` — terminology


---

## From `twitter-thread-writer`

> >

# Twitter Thread Writer

Write X/Twitter threads that deliver genuine value, build authority, and naturally
recommend affiliate products without feeling like ads. The best affiliate threads
get bookmarked for the insights and clicked for the product recommendation.

## Stage

This skill belongs to Stage S2: Content

## When to Use

- User wants to promote an affiliate product on X/Twitter
- User wants to build an audience on X while monetizing with affiliate links
- User has expertise to share and wants to weave in a product recommendation
- User asks how to write threads that convert without being spammy
- User wants content that compounds (bookmarks → future impressions)

## Input Schema

```
{
  product: {
    name: string              # (required) "ConvertKit"
    description: string       # (optional) What it does
    url: string               # (optional) Affiliate link
    reward_value: string      # (optional) For context only — never shown in thread
  }
  thread_angle: string        # (optional, default: auto) See Thread Frameworks below
  expertise_area: string      # (optional) Creator's area of authority — "email marketing", "SaaS growth"
  audience: string            # (optional) "founders", "freelancers", "content creators"
  tone: string                # (optional, default: "direct") "direct" | "educational" | "storytelling" | "contrarian"
  tweet_count: number         # (optional, default: 8) Number of tweets in thread: 5-15
  personal_story: string      # (optional) Real experience or result to anchor the thread
  cta_style: string           # (optional, default: "soft") "soft" | "direct" | "question"
}
```

## Workflow

### Step 1: Research the Product and Angle

Use `web_search "[product name] best features use cases"` and
`web_search "[product name] vs [competitor]"` to find:
- The 2-3 strongest use cases (thread body material)
- The problem it solves that X audiences care about
- Any recent updates, launches, or news (recency boosts engagement)
- Real user testimonials or case study numbers (third-party proof)

Also search `web_search "site:twitter.com [product name] affiliate"` to see what
existing threads look like — then do something different or better.

### Step 2: Select the Thread Framework

| Framework | Structure | Best For |
|-----------|-----------|----------|
| **Lessons Learned** | "I used [product] for X months. Here's what I learned:" → 7 insights → CTA | Tools you've genuinely used |
| **Problem → Solution** | Hook pain → Agitate it → Introduce solution → Show how it solves each pain → CTA | High-awareness problems |
| **Contrarian Take** | "Everyone says [common advice]. I disagree. [product] changed my mind." | Standing out in crowded niches |
| **Numbers Story** | "From [before metric] to [after metric] using [product]. Here's how:" → step-by-step → CTA | When you have real results |
| **How-to Tutorial** | "How to [achieve outcome] with [product] in [timeframe]:" → step-by-step → CTA | Educational, drives bookmarks |
| **Tool Stack** | "My [role] tool stack in 2024: Thread on each → [product] gets its own deep-dive tweet → CTA | Multi-product threads |
| **Myth Busting** | "5 myths about [problem space] — and what actually works:" → each myth → [product] as the solution | High engagement, saves |

Auto-select based on:
- Has personal experience → Numbers Story or Lessons Learned
- No personal experience → How-to Tutorial or Problem → Solution
- Large audience, strong takes → Contrarian Take
- Beginner-friendly product → How-to Tutorial

### Step 3: Write the Hook Tweet (Tweet 1)

The hook tweet determines if anyone reads tweet 2. It must:
- Promise a specific, tangible outcome ("how I 3x'd my email open rate")
- Or state a bold, curiosity-generating claim ("most email marketing advice is wrong")
- Or open a story loop ("6 months ago I had 400 email subscribers. Today I have 12,000.")
- End with a signal that a thread follows: "A thread:" or "Here's how:" or "Thread 🧵"

Never start with: "I want to share...", "In this thread...", "Have you ever..."
Never use buzzwords as hooks: "game-changing", "revolutionary", "must-read"

**Hook formula:** [Specific outcome or bold claim] + [Credibility signal] + [Thread signal]

### Step 4: Write the Body Tweets (Tweets 2-N)

Each tweet in the body must:
1. **Deliver a complete thought** — readable as a standalone tweet
2. **Build on the previous tweet** — threads should reward people who read all the way
3. **Include a specific detail** — numbers, names, steps, not vague generalizations
4. **Stay under 280 characters** — hard limit. No tweet should require expanding
5. **Use whitespace** — line breaks between ideas, not wall-of-text tweets

Place the product recommendation at 60-70% through the thread (tweet 5-7 of 8-10).
It should feel discovered, not pitched:
- "The tool that actually made this easy for me: [product name]"
- "I tried 4 tools before finding [product]. Here's why it worked:"
- "If I had to pick one tool for this: [product]"

Mention the product once prominently. A brief second mention in the CTA tweet is fine.

### Step 5: Write the CTA Tweet (Last Tweet)

The CTA tweet should:
1. Summarize what the thread delivered
2. Recommend action (try the product, sign up, or check it out)
3. Include the affiliate link OR direct to bio for the link
4. Include FTC disclosure "#ad" per `shared/references/ftc-compliance.md`

Soft CTA example: "If you want to try [product], there's a free trial at [link]. I use it daily. #ad"
Direct CTA: "[Product] is how I [result]. Link to try it free: [link] #ad"

### Step 6: Add Engagement Mechanics

Increase bookmark and retweet probability:
1. **Add a summary tweet** after the CTA: "TL;DR: [3 bullets from the thread]"
   Summaries drive bookmarks from skimmers.
2. **First reply** (pinned under thread): "If you found this useful, follow me for more [topic]."
3. **Engagement question** somewhere in thread: "Which of these do you do already?
   Drop your answer below." (Boosts reply count → algorithm boost)

### Step 7: Format Output

Present tweets numbered and ready to paste. Include character count for each.
Flag any tweet at 250+ characters for potential trimming.

## Output Schema

```
{
  thread: [
    {
      tweet_number: number      # 1, 2, 3...
      content: string           # Full tweet text
      char_count: number        # Character count
      role: string              # "hook" | "body" | "product_mention" | "cta" | "summary"
    }
  ]
  framework: string             # Which framework was used
  product_mention_tweet: number # Which tweet number introduces the product
  disclosure_tweet: number      # Which tweet has #ad
  suggested_hashtags: string[]  # 2-3 hashtags for the thread
  best_time_to_post: string     # Optimal posting time for X
  product_name: string
  content_angle: string
}
```

## Output Format

```
## Twitter Thread: [Product Name]

**Framework:** [Name]
**Angle:** [Content angle]
**Tweets:** [N] tweets

---

**Tweet 1 (Hook)** — [X chars]
[Tweet content]

---

**Tweet 2** — [X chars]
[Tweet content]

---

*...continue for all tweets...*

---

**Tweet [N] (CTA)** — [X chars]
[Tweet content including #ad disclosure]

---

**Pinned Reply** — [X chars]
[Suggested first reply to boost engagement]

---

### Posting Guide

| Detail | Value |
|--------|-------|
| Best time to post | [Day + time] |
| First action after posting | [Like all tweets to boost visibility, pin reply] |
| Expected engagement pattern | [What metrics to watch] |

### Alternate Hook Options

- **[Hook style 2]:** "[Alternative tweet 1]"
- **[Hook style 3]:** "[Alternative tweet 1]"
```

## Error Handling

- **No product info:** Pull `recommended_program` from S1 context if available.
  Otherwise ask what product they want to promote.
- **No personal experience:** Write research-based content. Flag that personal
  experience threads get 2-3x more engagement and suggest adding a real data point.
- **Thread feels too promotional too early:** Move product mention to tweet 6+.
  Add 1-2 more value tweets before the recommendation.
- **Content is too generic:** Use `web_search` to add specific stats, quotes, or
  examples. Replace every vague claim with a concrete number or example.
- **Tweet over 280 characters:** Auto-split or suggest cut. Never truncate — the
  full thought must fit in one tweet.
- **Creator has no X following:** Add note: "New accounts should engage in replies
  for 1-2 weeks before posting threads. Algorithm rewards accounts with engagement history."

## Examples

**Example 1:**
User: "Write a Twitter thread promoting ConvertKit to freelancers"
→ Angle: "How I built a 3,000-subscriber email list as a freelancer — what worked"
→ Framework: Numbers Story
→ 9 tweets: Hook (metrics) → 6 lessons → ConvertKit mention at tweet 6 → CTA + #ad
→ Emphasis: free plan, creator-friendly, no bloat

**Example 2:**
User: "I want to write a contrarian thread about email marketing tools"
→ Angle: "Most people pick the wrong email platform. Here's why:"
→ Framework: Contrarian Take
→ Myths to bust: "Mailchimp is fine for beginners", "you need fancy automations"
→ Natural product mention: "After trying 5 tools, I settled on ConvertKit because..."

**Example 3:**
User: "8-tweet thread about HeyGen for video creators"
→ Framework: How-to Tutorial — "How to create a talking-head video without a camera"
→ Step-by-step: sign up → upload script → pick avatar → generate → edit → export
→ Product mention woven in at step 1 (that's HeyGen)
→ CTA: "HeyGen has a free plan — I made my first 3 videos for free: [link] #ad"

## References

- `shared/references/ftc-compliance.md` — #ad placement rules for Twitter/X
- `shared/references/platform-rules.md` — X character limits, link handling, thread best practices
- `shared/references/affiliate-glossary.md` — terminology


---

## From `tiktok-script-writer`

> >

# TikTok Script Writer

Write punchy 30-60 second video scripts for TikTok, Instagram Reels, and YouTube
Shorts that stop the scroll, demo the product naturally, and drive affiliate link
clicks. Every script is structured for vertical video: hook → problem → demo →
result → CTA.

## Stage

This skill belongs to Stage S2: Content

## When to Use

- User wants to promote an affiliate product on short-form video platforms
- User has an affiliate program picked (from S1) and needs TikTok/Reels content
- User asks for video script ideas for TikTok affiliate marketing
- User wants a hook-first script that converts viewers to buyers
- User creates content on TikTok, Instagram Reels, or YouTube Shorts

## Input Schema

```
{
  product: {
    name: string              # (required) "HeyGen"
    description: string       # (optional) What it does — will be researched if missing
    url: string               # (optional) Affiliate link or product URL
    reward_value: string      # (optional) Commission info — never shown in script
  }
  duration: number            # (optional, default: 45) Target duration in seconds: 15 | 30 | 45 | 60
  platform: string            # (optional, default: "tiktok") "tiktok" | "reels" | "shorts" | "all"
  hook_style: string          # (optional, default: auto) "question" | "shock" | "relatable" | "bold_claim" | "demo_first"
  creator_persona: string     # (optional) "beginner marketer" | "tech reviewer" | "productivity nerd"
  has_product_access: boolean # (optional, default: true) Can creator do live demo?
  personal_experience: string # (optional) Real experience to weave in
  audience: string            # (optional) "freelancers" | "small business owners" | "students"
}
```

## Workflow

### Step 1: Research the Product

If product details are sparse, use `web_search "[product name] what it does tutorial"` to find:
- The single most impressive thing the product does (demo-able in <20 seconds)
- The main pain it eliminates (hook material)
- A specific result users achieve (e.g., "make a talking avatar video in 2 minutes")
- Any free trial or free tier (reduces friction for CTA)

Concrete specifics > vague claims. "Creates a 2-minute video in 30 seconds" beats
"saves time on video creation".

### Step 2: Select the Hook Style

Short-form video is won or lost in seconds 1-3. Pick the hook based on the product's
strongest angle:

| Hook Style | Template | Best For |
|------------|----------|----------|
| **Question** | "What if you could [result] without [pain]?" | Products that remove a hard task |
| **Shock/Stat** | "I replaced [expensive thing] with a $[price]/mo tool" | Cost/efficiency wins |
| **Relatable** | "[Frustrating situation]? Same. Then I found this." | Niche audience pain |
| **Bold Claim** | "This [tool] is the reason I [impressive result]" | Strong ROI proof |
| **Demo First** | [Open with screen recording of the coolest feature immediately] | Visual/AI tools |
| **Story Opener** | "6 months ago I was [before state]. Now [after state]. Here's why." | Transformation |

For AI tools and visual products → **Demo First** almost always wins on TikTok.
For SaaS productivity tools → **Relatable** or **Shock/Stat** hooks work well.

### Step 3: Structure the Script

Every script follows this structure (adapt timing to duration):

**For 45-second scripts:**
- 0-3s: Hook (spoken + on-screen text)
- 3-8s: Relatable pain or setup
- 8-30s: Live demo OR narrated walkthrough of key feature
- 30-38s: Specific result / proof
- 38-44s: CTA (bio link, comment for link, or "link in bio")
- 44-45s: FTC disclosure overlay

**For 30-second scripts:**
- 0-3s: Hook
- 3-15s: Demo the #1 feature
- 15-25s: Result + social proof
- 25-30s: CTA + disclosure

**For 60-second scripts:**
- 0-3s: Hook
- 3-10s: Problem setup
- 10-40s: Full demo (2-3 features)
- 40-52s: Results + pricing mention (anchoring)
- 52-58s: CTA
- 58-60s: FTC disclosure

### Step 4: Write the Script

Format scripts with:
- **[VISUAL]** — what's on screen (screen recording, hands typing, reaction face, b-roll)
- **[SPOKEN]** — what the creator says (keep sentences short, max 10 words each)
- **[TEXT OVERLAY]** — on-screen text (keywords for silent viewers — 40% watch with no sound)
- **[CAPTION]** — suggested TikTok caption + hashtags

Writing rules:
1. Sentences under 10 words. TikTok viewers process fast.
2. No filler phrases: "basically", "literally", "you know what I mean"
3. Every 3-5 seconds: new visual cut, new text overlay, or spoken transition
4. Sound-optional: the text overlay should tell the whole story without audio
5. End the hook WITH the setup — don't just ask a question, tease the answer
6. The demo must be REAL — no vague "and then it does this amazing thing"

### Step 5: Add FTC Disclosure

Per `shared/references/ftc-compliance.md` for short-form video:
- Verbal disclosure if spoken at all (not required but best practice)
- Text overlay "#ad" or "Affiliate link in bio" must appear during CTA section
- Disclosure must be visible for at least 3 seconds
- Do NOT bury in caption — overlay is required per FTC guidance

### Step 6: Add Production Notes

Include brief notes for the creator:
- What to screen-record vs. film on camera
- Suggested background music BPM range (fast = tech demos, mid = tutorials)
- Caption and hashtag strategy for the platform
- Best time to post on each platform

## Output Schema

```
{
  scripts: [
    {
      platform: string          # "tiktok" | "reels" | "shorts"
      duration_seconds: number  # 45
      hook_style: string        # "demo_first"
      scenes: [
        {
          timecode: string      # "0-3s"
          visual: string
          spoken: string
          text_overlay: string
        }
      ]
      caption: string           # Full TikTok caption
      hashtags: string[]        # Suggested hashtags
      disclosure: string        # How and when FTC disclosure appears
    }
  ]
  product_name: string
  content_angle: string
  hook_used: string
}
```

## Output Format

```
## TikTok Script: [Product Name] ([Duration]s)

**Hook Style:** [Style name]
**Platform:** [TikTok / Reels / Shorts]
**Target Audience:** [Who this is for]

---

### Script

| Time | Visual | Spoken | Text Overlay |
|------|--------|--------|-------------|
| 0-3s | [What's on screen] | "[Hook line]" | [On-screen text] |
| 3-8s | [Visual] | "[Spoken]" | [Overlay] |
| ... | ... | ... | ... |

---

### Caption

[Full caption text — optimized for TikTok SEO]

**Hashtags:** #[tag1] #[tag2] #[tag3] (5-8 tags max)

---

### Production Notes

- **Film:** [Camera vs screen recording breakdown]
- **Music:** [BPM and mood suggestion]
- **Best time to post:** [Platform-specific optimal time]
- **Disclosure:** #ad text overlay appears at [timecode] for [X] seconds

---

### Hook Alternatives

Want a different opening? Try:
- **[Hook Style 2]:** "[Alternative opening line]"
- **[Hook Style 3]:** "[Alternative opening line]"
```

## Error Handling

- **No product info:** Ask what product they're promoting. If they came from S1, pull
  `recommended_program` from context.
- **Product isn't visual / hard to demo:** Shift to reaction/testimonial format —
  creator's face on screen reacting to the tool, narrating the discovery.
- **User has no product access:** Write a "third-person discovery" script —
  "My friend showed me this tool and I had to share it"
- **Duration feels too long for the content:** Cut the demo to single strongest moment.
  If 30s still feels crowded, suggest two separate videos (problem setup + solution).
- **Platform unspecified:** Default to TikTok. Mention Reels and Shorts are the same script
  with minor caption/hashtag adjustments.

## Examples

**Example 1:**
User: "Write a 45-second TikTok script for HeyGen"
→ Research: HeyGen creates AI avatar videos, talking head from text
→ Hook: Demo first — open with a finished AI video playing
→ Script: [0-3s] Show output video → [3-8s] "Made this in 2 minutes, no camera" →
  [8-30s] Screen record: paste script → avatar speaks → [30-38s] "Used this for
  my client, saved 4 hours" → [38-44s] "Link in bio, 30-day free trial" → [44-45s] "#ad overlay"

**Example 2:**
User: "TikTok script for Notion affiliate, targeting students"
→ Hook: Relatable — "POV: it's 2am before finals and your notes are chaos"
→ Demo: Notion AI organizing scattered notes into a study guide
→ CTA: "Free forever plan — link in bio"
→ Caption: "study with me + notion hacks" for algorithm reach

**Example 3:**
User: "I need 3 different hooks for a ConvertKit TikTok script"
→ Write hook-only variants: Question / Shock / Bold Claim
→ Full script for the strongest one, alternative openings for others
→ Note which hook style historically performs best for SaaS on TikTok

## References

- `shared/references/ftc-compliance.md` — disclosure rules for short-form video
- `shared/references/affiliate-glossary.md` — reward_type and program terminology
- `shared/references/platform-rules.md` — TikTok/Reels/Shorts format specs


---

## From `paid-ad-copy-writer`

> >

# Paid Ad Copy Writer

Write paid ad copy for affiliate offers — Facebook Ads, Google Search Ads, Google Display Ads, TikTok Ads, and Pinterest Ads. Each output includes multiple ad variants, targeting suggestions, compliance notes, and campaign setup guidance. Output is platform-formatted ad copy ready to deploy.

## Stage

S7: Automation — When organic content proves profitable, paid ads let you scale 10x faster. But affiliate ad copy has unique constraints: platform policies around affiliate links, FTC disclosure requirements, and the need to drive clicks to a landing page (not direct-link). This skill writes compliant, high-converting ad copy for each platform.

## When to Use

- User wants to run paid traffic to affiliate offers
- User says "write ad copy", "Facebook ad", "Google Ads", "TikTok ad"
- User wants to scale a profitable organic campaign with paid media
- User has a landing page (from S4) and wants ads driving traffic to it
- User wants multiple ad variants for testing
- Chaining from S4 (landing page) → write ads pointing to the landing page

## Input Schema

```yaml
product:
  name: string                 # REQUIRED — product name
  description: string          # OPTIONAL — one-line product description
  reward_value: string         # OPTIONAL — commission info
  url: string                  # OPTIONAL — product URL (for research)
  key_benefits: string[]       # OPTIONAL — top 3 benefits

platform: string               # REQUIRED — "facebook" | "google_search" | "google_display"
                               # | "tiktok" | "pinterest"

audience:
  description: string          # REQUIRED — target audience
  pain_points: string[]        # OPTIONAL — problems the audience has
  demographics: string         # OPTIONAL — age, gender, interests

budget: string                 # OPTIONAL — daily/monthly budget (e.g., "$20/day")

landing_url: string            # OPTIONAL — destination URL (from S4 or a bridge page)
                               # Note: most platforms don't allow direct affiliate links
```

**Chaining context**: If S1 product data exists, pull name, benefits, commission. If S4 landing page was created, use its URL as `landing_url`.

## Workflow

### Step 1: Analyze Product and Audience

Gather product info and audience details. If `key_benefits` is not provided, infer from product name and description using training knowledge.

Identify:
- Primary value proposition
- Emotional triggers for the audience
- Competitive angle (what makes this product different)

### Step 2: Select Ad Format

Each platform has specific formats:

**Facebook Ads**:
- Primary text (125 chars above fold, 500+ total)
- Headline (40 chars)
- Description (30 chars)
- CTA button (from predefined list)

**Google Search Ads**:
- Headlines (3 × 30 chars)
- Descriptions (2 × 90 chars)
- Sitelink extensions (4 × 25 chars + 35 char descriptions)

**Google Display Ads**:
- Short headline (30 chars)
- Long headline (90 chars)
- Description (90 chars)
- Business name

**TikTok Ads**:
- Video script (15-30 seconds)
- Hook (first 3 seconds)
- CTA overlay text
- Ad text (100 chars)

**Pinterest Ads**:
- Pin title (100 chars)
- Pin description (500 chars)
- Image text suggestions

### Step 3: Write Ad Variants

Create 3-5 variants per platform, each testing a different angle:
- **Pain Point**: Lead with the problem
- **Benefit**: Lead with the outcome
- **Social Proof**: Lead with results/numbers
- **Curiosity**: Lead with an intriguing question or statement
- **Urgency**: Lead with a time-sensitive offer (only if real)

### Step 4: Add Compliance Notes

Per platform:
- **Facebook**: "Paid Partnership" label if required. No misleading claims. Landing page must match ad claims. Affiliate links may be flagged — use a bridge/landing page.
- **Google**: Ad must match landing page content. No superlative claims without proof. Affiliate disclaimer on landing page required. Follow Google Ads affiliate policies.
- **TikTok**: #ad or Paid Partnership toggle. No medical/financial advice. Must feel native to platform.
- **Pinterest**: Disclosures in pin description. Must link to content page, not direct affiliate link.

### Step 5: Suggest Targeting

Recommend targeting parameters:
- Interest-based audiences
- Lookalike audiences (if pixel data exists)
- Keyword targeting (Google)
- Demographic filters

### Step 6: Budget Allocation

If budget is provided, suggest:
- Daily spend per variant (for A/B testing phase)
- When to kill underperformers (after 500+ impressions with <0.5% CTR)
- When to scale winners (after 3+ days of profitable ROAS)

## Output Schema

```yaml
campaign:
  product: string
  platform: string
  num_variants: number
  landing_url: string

variants:
  - label: string              # "Variant A: Pain Point", etc.
    angle: string              # the approach used
    copy:
      headline: string         # or headlines[] for Google
      description: string      # or descriptions[] for Google
      primary_text: string     # Facebook only
      cta: string
      video_script: string     # TikTok only
    character_counts: object   # per field

compliance:
  notes: string[]              # platform-specific requirements
  warnings: string[]           # things that might get the ad rejected

targeting:
  interests: string[]
  demographics: string
  keywords: string[]           # Google only

budget_suggestion:
  test_phase: string           # e.g., "$10/day per variant for 5 days"
  scale_phase: string          # e.g., "Increase winning variant to $50/day"
  kill_criteria: string        # when to stop a variant
```

## Output Format

1. **Campaign Overview** — product, platform, landing URL
2. **Ad Variants** — each variant with full copy in platform format
3. **Compliance Checklist** — platform-specific requirements and warnings
4. **Targeting Suggestions** — interests, demographics, keywords
5. **Budget Guide** — test and scale strategy

## Error Handling

- **No landing URL**: "Most ad platforms don't allow direct affiliate links. I recommend creating a landing page first with S4 (landing-page-creator) and using that as your ad destination."
- **Unknown platform**: "I support Facebook, Google Search, Google Display, TikTok, and Pinterest ads. Which platform would you like ad copy for?"
- **Product with strict ad policies (supplements, finance)**: "This product category has strict advertising policies on [platform]. I'll write compliant copy, but review your ad account's specific restrictions before publishing. Avoid health/income claims."

## Examples

### Example 1: Facebook ad for SaaS product

**User**: "Write Facebook ads for HeyGen targeting content creators. My landing page is example.com/heygen-review"
**Action**: 3 variants. Variant A (pain point): "Spending hours editing videos? HeyGen creates professional AI videos in minutes." Variant B (benefit): "Create studio-quality videos without a camera. 50+ AI avatars, any language." Variant C (social proof): "10,000+ creators switched to HeyGen. Here's why." Each with headline, description, CTA. Include Facebook compliance notes.

### Example 2: Google Search ads

**User**: "Google Search ads for Semrush targeting 'best SEO tools'"
**Action**: 5 headline + 2 description combinations. H1: "Best SEO Tool for 2026" (30 chars). H2: "Try Semrush Free Today" (22 chars). H3: "Trusted by 10M+ Marketers" (25 chars). D1: "Complete SEO toolkit: keyword research, site audit, backlink analysis. Start your free trial." D2: "Outrank your competitors with data-driven SEO. 7-day free trial, no card required." Plus sitelink extensions.

### Example 3: TikTok ad script

**User**: "Write a TikTok ad for Notion targeting college students"
**Action**: 30-second script. Hook (0-3s): "POV: You just discovered the app that replaced 5 other apps." Middle (3-20s): Show use cases (notes, calendar, to-do, project tracker). CTA (20-30s): "Link in bio for the student discount." #ad disclosure. Include compliance notes about TikTok's policies on educational content promotions.

## References

- `shared/references/ftc-compliance.md` — FTC disclosure requirements for paid advertising. Read in Step 4.
- `shared/references/affiliate-glossary.md` — Ad terminology (ROAS, CTR, CPC). Referenced in budget guide.


---

## From `content-repurposer`

> >

# Content Repurposer

Repurpose one piece of affiliate content into multiple formats — blog post to tweets, landing page to email, video script to blog, social post to newsletter. Each output is adapted to the target platform's rules, tone, length, and FTC requirements. Output is a set of ready-to-post content blocks.

## Stage

S7: Automation — Creating content from scratch is expensive. The fastest way to scale is to repurpose what already works. One blog post can become 5 tweets, 1 LinkedIn post, 1 Reddit post, and 2 emails — multiplying your reach without multiplying your effort.

## When to Use

- User has existing content and wants it on more platforms
- User says "turn my blog into tweets" or "repurpose this for LinkedIn"
- User wants to scale content distribution without writing from scratch
- User says "cross-post", "content recycling", "omnichannel"
- User has a winning piece and wants to maximize its ROI
- Chaining from S2-S5: take any content output and adapt it for additional platforms

## Input Schema

```yaml
source_content: string         # REQUIRED — the original content (full text, or from conversation)

source_type: string            # REQUIRED — "blog" | "social" | "landing" | "email"
                               # | "video_script" | "newsletter"

target_formats:                # REQUIRED — formats to repurpose into
  - string                     # "tweet_thread" | "linkedin_post" | "tiktok_script"
                               # | "newsletter" | "reddit_post" | "email"
                               # | "blog_summary" | "pinterest_pin"

product:
  name: string                 # OPTIONAL — product being promoted
  affiliate_url: string        # OPTIONAL — affiliate link to include in each format
```

**Chaining context**: If S2-S5 content was generated in the same conversation, reference it directly: "repurpose my blog post for Twitter and LinkedIn."

## Workflow

### Step 1: Analyze Source Content

Extract from the source:
- **Core value proposition**: The main benefit or insight
- **Key hooks**: Attention-grabbing statements or data points
- **Proof points**: Statistics, testimonials, personal experience
- **CTA**: The action the reader should take
- **Affiliate link**: The link to preserve in all formats

### Step 2: Map to Target Formats

For each target format, define constraints:
- **Tweet thread**: 5-10 tweets, 280 chars each, hook in tweet 1, CTA + link in last tweet
- **LinkedIn post**: 1,300 chars max for full visibility, professional tone, no link in body (comments)
- **TikTok script**: 30-60 seconds, spoken word, hook in first 3 seconds, CTA at end
- **Newsletter**: 500-800 words, subject line + preview, value-first structure
- **Reddit post**: Authentic tone, value-first, disclosure at bottom, suggest subreddit
- **Email**: Subject + preview + body + CTA, 200-300 words
- **Blog summary**: 300-500 words condensed version with key points
- **Pinterest pin**: Title (40 chars), description (500 chars), image text suggestion

### Step 3: Adapt Content

For each target format:
1. Select the most relevant hooks and proof points
2. Rewrite in the platform's native voice and format
3. Adjust length to platform norms
4. Place affiliate link according to platform best practices
5. Add platform-appropriate FTC disclosure

### Step 4: Add Platform-Specific Posting Guides

For each output, include:
- Best time to post (general guidance)
- Hashtag strategy (if applicable)
- Engagement tips specific to the platform
- Link placement rules

### Step 5: Output All Variants

Present each format as a separate, clearly labeled block ready to copy and paste.

## Output Schema

```yaml
repurposed:
  source_type: string
  source_summary: string       # one-sentence summary of original
  formats_generated: number

outputs:
  - format: string             # target format name
    content: string            # the repurposed content (ready to post)
    platform: string           # which platform this is for
    character_count: number
    affiliate_link_placement: string  # where the link goes
    disclosure: string         # FTC disclosure used
    posting_guide:
      best_time: string
      hashtags: string[]
      tips: string[]
```

## Output Format

1. **Source Summary** — one paragraph describing the original content
2. **Repurposed Content** — each format as a separate block with clear headers
3. **Posting Guide** — per-format tips for best results
4. **Affiliate Link Summary** — which formats include the link and where

## Error Handling

- **Source content too short (<100 words)**: "The source content is quite short. I'll work with what's here, but longer source content produces better repurposed variants. Consider using the full blog post rather than just the intro."
- **No affiliate link**: "I'll repurpose the content without an affiliate link. Add `[YOUR_AFFILIATE_LINK]` where I've marked the CTA before posting."
- **Incompatible format**: "Converting a tweet to a blog post is more like 'expanding' than 'repurposing.' Use S3 (affiliate-blog-builder) to write a full blog post around this topic instead."

## Examples

### Example 1: Blog to social media

**User**: "Turn my HeyGen review blog post into a tweet thread and LinkedIn post"
**Action**: Extract key points from the blog (top 5 features, pricing, verdict). Tweet thread: Hook tweet → 5 feature tweets with mini-takes → verdict tweet → CTA tweet with link + #ad. LinkedIn post: Professional angle (time savings, ROI), personal experience tone, link in first comment, #ad disclosure.

### Example 2: Landing page to email

**User**: "Repurpose my Semrush landing page into a 3-email sequence"
**Action**: Extract value proposition, benefits, social proof, CTA from landing page. Email 1: Problem awareness (pain point from landing page). Email 2: Solution introduction (benefits). Email 3: CTA (affiliate link + urgency from landing page). Each email under 300 words.

### Example 3: Social post to newsletter

**User**: "My LinkedIn post about AI tools got 500 likes. Turn it into a newsletter."
**Action**: Expand the LinkedIn post's hook into a newsletter intro. Add depth: examples, data, personal experience that couldn't fit in 1,300 chars. Structure: Hook → context → 3 insights → recommendation → CTA. Include FTC disclosure and affiliate link.

## References

- `shared/references/ftc-compliance.md` — Per-platform FTC disclosure rules. Read in Step 3.
- `shared/references/affitor-branding.md` — Branding guidelines for page outputs. Referenced in Step 3.

