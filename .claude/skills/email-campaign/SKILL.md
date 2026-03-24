---
name: email-campaign
description: Email campaign generator. One prompt → full drip sequence (welcome, nurture, conversion, re-engagement) as React Email components or HTML. Chains email-templates + brand + design-system + resend. Includes subject line variants, preview text, and plain-text fallbacks.
argument-hint: "[campaign type] [product] [goal]"
layer: hub
category: marketing
triggers:
  - email campaign
  - drip campaign
  - email sequence
  - onboarding emails
  - welcome email
  - nurture campaign
  - transactional emails
  - email templates
linksTo:
  - email-templates
  - brand
  - design-system
  - resend
  - seo
inputs: |
  Campaign type (welcome/nurture/conversion/re-engagement/transactional),
  product name and description, campaign goal (activation/purchase/upgrade/win-back),
  target audience, number of emails in sequence, and tone override (optional).
outputs: |
  emails/[campaign]/ — React Email components for each email in the sequence
  emails/[campaign]/preview.html — browser preview of all emails
  emails/[campaign]/copy.md — subject lines, preview text, and body copy
  emails/sequence.ts — Resend sequence trigger logic with scheduling
preferredNextSkills:
  - resend
  - saas-bootstrap
fallbackSkills:
  - email-templates
  - brand
memoryReadPolicy: selective
memoryWritePolicy: always
sideEffects: |
  Creates emails/[campaign]/ directory with .tsx component files, preview HTML,
  copy markdown, and emails/sequence.ts with Resend send logic.
---

# Email Campaign Generator

> One prompt → full email sequence with subject lines, copy, and HTML templates.

## What Gets Generated

| File | Content |
|---|---|
| `emails/[campaign]/` | React Email components for each email |
| `emails/[campaign]/preview.html` | Preview all emails in browser |
| `emails/[campaign]/copy.md` | Subject lines, preview text, body copy |
| `emails/sequence.ts` | Resend sequence trigger logic |

---

## Phase 0 — Discovery

Parse `$ARGUMENTS` for:
- `campaignType` — welcome / nurture / conversion / re-engagement / transactional
- `product` — what's being promoted
- `goal` — activation / purchase / upgrade / win-back
- `audience` — who receives this
- `numEmails` — how many in the sequence (default varies by type)
- `tone` — matches brand (default) or override

---

## Campaign Types & Default Sequences

### Welcome / Onboarding (7 emails, 14 days)
| # | Day | Subject Hook | Goal |
|---|---|---|---|
| 1 | 0 | "You're in — here's where to start" | First activation |
| 2 | 1 | "The one thing most people miss" | Key feature discovery |
| 3 | 3 | "How [similar user] got [result]" | Social proof |
| 4 | 5 | "Quick question" | Engagement + segmentation |
| 5 | 7 | "[Feature] walkthrough" | Power user activation |
| 6 | 10 | "You're [X]% there" | Progress motivation |
| 7 | 14 | "Ready to upgrade?" | Conversion |

### Nurture / Lead (5 emails, 10 days)
| # | Day | Hook | Goal |
|---|---|---|---|
| 1 | 0 | Pain point + insight | Credibility |
| 2 | 2 | Case study / story | Trust |
| 3 | 4 | Comparison / alternative | Differentiation |
| 4 | 7 | Objection handling | Remove blockers |
| 5 | 10 | Soft CTA + urgency | Conversion |

### Re-engagement (3 emails, 7 days)
| # | Day | Hook | Goal |
|---|---|---|---|
| 1 | 0 | "We miss you" (low pressure) | Re-open relationship |
| 2 | 3 | New feature / improvement | Give a reason to return |
| 3 | 7 | "Last chance" + unsubscribe option | Win-back or clean list |

### Transactional (single emails)
- Welcome / account created
- Email verification
- Password reset
- Payment receipt
- Payment failed (dunning)
- Plan upgraded / downgraded
- Team invite

---

## Phase 1 — Subject Lines

1. **Invoke `brand`** — Derive voice, tone, and vocabulary constraints from brand identity, then generate 3 subject line variants per email (curiosity, benefit-first, personal/direct).

For each email, generate 3 subject line variants:

| Variant | Style | Example |
|---|---|---|
| A | Curiosity gap | "The mistake 80% of [audience] make" |
| B | Benefit-first | "Get [result] in [timeframe]" |
| C | Personal/direct | "Quick question, [First Name]" |

**Rules:**
- Max 50 characters (fits mobile preview)
- No ALL CAPS, no excessive punctuation (!!!)
- No spam triggers: "free", "guaranteed", "act now"
- Use `[First Name]` personalization token
- Preview text: 90 chars, extends subject, no repeat

---

## Phase 2 — Copy Framework

For each email, apply the appropriate framework:

**Awareness emails:** PAS (Problem → Agitate → Solve)
**Nurture emails:** AIDA (Attention → Interest → Desire → Action)
**Conversion emails:** FAB (Feature → Advantage → Benefit)
**Re-engagement:** HOOK → Empathy → Value → CTA

**Copy rules:**
- Single CTA per email (not 3 buttons)
- Sentences: max 20 words
- Paragraphs: max 3 sentences
- Reading level: Grade 8 (use Hemingway App logic)
- No jargon unless audience is technical
- P.S. line: repeat the CTA or add a bonus detail (gets 2nd-highest read rate)

---

## Phase 3 — HTML Templates

2. **Invoke `email-templates`** — Scaffold the React Email component structure with correct imports, layout, and accessibility attributes.
3. **Invoke `design-system`** — Apply brand color tokens, typography, spacing, and CTA button styles within the 600px email constraints.

Build React Email components:

```tsx
// emails/welcome/01-welcome.tsx
import { Html, Head, Body, Container, Text, Button, Img } from "@react-email/components";

export default function WelcomeEmail({ firstName = "there" }: { firstName?: string }) {
  return (
    <Html>
      <Head />
      <Body style={{ backgroundColor: "#f5f5f7", fontFamily: "-apple-system, sans-serif" }}>
        <Container style={{ maxWidth: "600px", margin: "0 auto", backgroundColor: "#ffffff" }}>
          {/* Header with logo */}
          {/* Body copy */}
          {/* CTA button — min 44px height, brand color */}
          {/* Footer: unsubscribe, address */}
        </Container>
      </Body>
    </Html>
  );
}
```

**Email design rules:**
- Max width: 600px
- Single column (2-col breaks on mobile)
- CTA button: min 44px height, solid color (not outlined), centered
- Images: host externally, include alt text, max 600px wide
- Font stack: system fonts only (web fonts unreliable in email)
- Background: white content area, light gray email bg
- Footer: unsubscribe link (CAN-SPAM), company address (legally required)

---

## Phase 4 — Resend Integration

4. **Invoke `resend`** — Generate `emails/sequence.ts` with the Resend send calls, scheduling logic, and send-time recommendations per email.

Generate `emails/sequence.ts`:

```typescript
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function triggerWelcomeSequence(email: string, firstName: string) {
  // Email 1: immediate
  await resend.emails.send({ to: email, subject: "...", react: <WelcomeEmail firstName={firstName} /> });

  // Email 2: schedule via your job queue (Inngest, QStash, etc.)
  // Trigger after 1 day delay
}
```

Generate send-time recommendations per email (e.g., welcome = immediate, nurture = Tuesday 10am).

---

## Phase 5 — Preview & Testing

Generate `emails/preview/index.html`:
- Grid of all email thumbnails
- Click to open full-size preview
- Toggle: light / dark mode preview
- Toggle: desktop / mobile width

Checklist before sending:
- [ ] All `[First Name]` tokens replaced in preview
- [ ] Unsubscribe link present in every email
- [ ] Company address in footer (CAN-SPAM)
- [ ] Images have alt text
- [ ] CTA button has fallback color (not just image)
- [ ] Plain-text version generated
- [ ] Tested in Gmail, Apple Mail, Outlook

---

## Usage

```
/email-campaign welcome Plano — activate developers on AI proxy features
/email-campaign nurture InuAuth — convert free users to paid plan
/email-campaign re-engagement Meey — win back users inactive 30+ days
/email-campaign transactional — generate all standard transactional emails
```
