---
name: viral-post-writer
description: >
  Write viral social media posts that promote affiliate products naturally.
  Use this skill when the user asks anything about writing social media content
  for affiliate marketing, creating posts for LinkedIn/X/Reddit/Facebook,
  promoting a product on social media, writing affiliate content, or mentions
  "viral post", "social media post", "content for affiliate".
  Also trigger for: "write a post about X", "help me promote X on LinkedIn",
  "create a thread about X", "make a Reddit post for X", "draft tweets for X",
  "social media content for affiliate program", "how to promote X on social",
  "write something that goes viral", "LinkedIn post for affiliate", "X thread
  about this tool", "help me sell X naturally on social media".
license: MIT
metadata:
  author: affitor
  version: "1.0"
  stage: S2-Content
---

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
