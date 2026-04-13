---
name: email-kit
description: "Unified email infrastructure + content toolkit — React Email/MJML responsive templates, Resend provider integration (batch sending, webhooks, domain mgmt), multi-sequence email automation with branching logic, drip sequences for affiliate/product campaigns, full marketing campaign generator (welcome, nurture, conversion, re-engagement). Covers both the send stack and the words."
layer: hub
category: communication
triggers: ["ad copy", "affiliate automation", "affiliate distribution", "bio link", "content repurpose", "drip campaign", "email api", "email automation builder", "email campaign", "email drip sequence", "email sequence", "email template", "email templates", "html email", "mjml", "nurture campaign", "onboarding emails", "react email", "resend", "resend webhook", "send email", "transactional email", "transactional emails", "welcome email"]
---

# email-kit

Unified email infrastructure + content toolkit — React Email/MJML responsive templates, Resend provider integration (batch sending, webhooks, domain mgmt), multi-sequence email automation with branching logic, drip sequences for affiliate/product campaigns, full marketing campaign generator (welcome, nurture, conversion, re-engagement). Covers both the send stack and the words.


## Absorbs

- `email-templates`
- `email-automation-builder`
- `email-drip-sequence`
- `email-campaign`
- `resend`


---

## From `email-templates`

> Build responsive HTML emails with React Email, MJML, and Resend for transactional email delivery, template design patterns, and cross-client compatibility

# Email Templates Domain Skill

## Purpose

HTML email is a hostile rendering environment -- Outlook uses Word's HTML engine, Gmail strips `<style>` tags, and there is no flexbox or grid. This skill produces emails that look correct across all major clients using React Email (preferred) or MJML, delivered via Resend or similar transactional providers.

## When to Use What

| Tool | Use Case | Strengths |
|------|----------|-----------|
| **React Email** | TypeScript projects, component reuse | JSX, type safety, composable, live preview |
| **MJML** | Quick templates, non-React teams | Simpler syntax, auto-generates compatible HTML |
| **Raw HTML** | Only for trivial emails | Full control, but painful cross-client compat |
| **Resend** | Transactional delivery | React Email native, great DX, webhooks |
| **SendGrid/Postmark** | High volume, legacy systems | Battle-tested, extensive analytics |

**Default to React Email + Resend** for TypeScript projects.

## Key Concepts

### Email Client Rendering Reality

```
Gmail (Web):     Strips <style> tags. Inline styles only. No media queries.
Gmail (App):     Supports some <style> in <head>. Limited media queries.
Outlook 2019+:   Uses Word rendering engine. No CSS grid, limited flexbox.
Apple Mail:      Best renderer. Supports most modern CSS.
Yahoo Mail:      Strips class attributes. Inline styles required.

Golden rule: Tables for layout. Inline styles for everything. Test everywhere.
```

### Responsive Strategy

```
Mobile-first is inverted for email:
  1. Design for desktop (600px) as the base
  2. Use fluid widths (%, not px) for content within the 600px frame
  3. Stack columns via media queries where supported
  4. Ensure single-column fallback for clients without media query support
```

## Patterns

### 1. React Email Setup

```bash
npm install @react-email/components resend
npm install -D react-email
```

```json
// package.json scripts
{
  "scripts": {
    "email:dev": "email dev --dir src/emails --port 3030",
    "email:export": "email export --dir src/emails --outDir out/emails"
  }
}
```

### 2. Base Layout Component

```tsx
// src/emails/components/layout.tsx
import {
  Html,
  Head,
  Body,
  Container,
  Preview,
  Section,
  Img,
  Text,
  Link,
  Hr,
  Font,
} from '@react-email/components';

interface EmailLayoutProps {
  preview: string;
  children: React.ReactNode;
}

export function EmailLayout({ preview, children }: EmailLayoutProps) {
  return (
    <Html lang="en" dir="ltr">
      <Head>
        <Font
          fontFamily="Inter"
          fallbackFontFamily="Helvetica"
          webFont={{
            url: 'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfMZhrib2Bg-4.ttf',
            format: 'truetype',
          }}
          fontWeight={400}
          fontStyle="normal"
        />
      </Head>
      <Preview>{preview}</Preview>
      <Body style={body}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Img
              src="https://yourapp.com/logo.png"
              width={120}
              height={36}
              alt="YourApp"
            />
          </Section>

          {/* Content */}
          <Section style={content}>
            {children}
          </Section>

          {/* Footer */}
          <Hr style={divider} />
          <Section style={footer}>
            <Text style={footerText}>
              YourApp Inc., 123 Main St, San Francisco, CA 94102
            </Text>
            <Text style={footerText}>
              <Link href="https://yourapp.com/unsubscribe" style={footerLink}>
                Unsubscribe
              </Link>
              {' | '}
              <Link href="https://yourapp.com/preferences" style={footerLink}>
                Email Preferences
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const body: React.CSSProperties = {
  backgroundColor: '#f6f9fc',
  fontFamily: 'Inter, Helvetica, Arial, sans-serif',
  margin: 0,
  padding: 0,
};

const container: React.CSSProperties = {
  backgroundColor: '#ffffff',
  borderRadius: '8px',
  margin: '40px auto',
  maxWidth: '600px',
  border: '1px solid #e5e7eb',
};

const header: React.CSSProperties = {
  padding: '32px 40px 0',
};

const content: React.CSSProperties = {
  padding: '24px 40px 40px',
};

const divider: React.CSSProperties = {
  borderColor: '#e5e7eb',
  margin: '0 40px',
};

const footer: React.CSSProperties = {
  padding: '24px 40px 32px',
};

const footerText: React.CSSProperties = {
  color: '#6b7280',
  fontSize: '12px',
  lineHeight: '20px',
  margin: '0 0 4px',
  textAlign: 'center' as const,
};

const footerLink: React.CSSProperties = {
  color: '#6b7280',
  textDecoration: 'underline',
};
```

### 3. Transactional Email Templates

```tsx
// src/emails/welcome.tsx
import { Text, Button, Section, Heading } from '@react-email/components';
import { EmailLayout } from './components/layout';

interface WelcomeEmailProps {
  name: string;
  loginUrl: string;
}

export default function WelcomeEmail({ name, loginUrl }: WelcomeEmailProps) {
  return (
    <EmailLayout preview={`Welcome to YourApp, ${name}!`}>
      <Heading as="h1" style={heading}>
        Welcome to YourApp
      </Heading>
      <Text style={paragraph}>Hi {name},</Text>
      <Text style={paragraph}>
        Thanks for signing up. We are excited to have you on board. Get started
        by exploring your dashboard.
      </Text>
      <Section style={buttonContainer}>
        <Button style={button} href={loginUrl}>
          Go to Dashboard
        </Button>
      </Section>
      <Text style={paragraph}>
        If you have any questions, just reply to this email -- we are always
        happy to help.
      </Text>
      <Text style={signoff}>
        The YourApp Team
      </Text>
    </EmailLayout>
  );
}

const heading: React.CSSProperties = {
  color: '#111827',
  fontSize: '24px',
  fontWeight: 600,
  lineHeight: '32px',
  margin: '0 0 16px',
};

const paragraph: React.CSSProperties = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '0 0 16px',
};

const buttonContainer: React.CSSProperties = {
  textAlign: 'center' as const,
  margin: '32px 0',
};

const button: React.CSSProperties = {
  backgroundColor: '#2563eb',
  borderRadius: '8px',
  color: '#ffffff',
  display: 'inline-block',
  fontSize: '16px',
  fontWeight: 600,
  lineHeight: '1',
  padding: '16px 32px',
  textDecoration: 'none',
  textAlign: 'center' as const,
};

const signoff: React.CSSProperties = {
  color: '#6b7280',
  fontSize: '14px',
  lineHeight: '24px',
  margin: '32px 0 0',
};

// Preview props for development
WelcomeEmail.PreviewProps = {
  name: 'Alice',
  loginUrl: 'https://yourapp.com/dashboard',
} satisfies WelcomeEmailProps;
```

```tsx
// src/emails/password-reset.tsx
import { Text, Button, Section, Heading } from '@react-email/components';
import { EmailLayout } from './components/layout';

interface PasswordResetEmailProps {
  name: string;
  resetUrl: string;
  expiresInMinutes: number;
}

export default function PasswordResetEmail({
  name,
  resetUrl,
  expiresInMinutes,
}: PasswordResetEmailProps) {
  return (
    <EmailLayout preview="Reset your YourApp password">
      <Heading as="h1" style={heading}>
        Reset Your Password
      </Heading>
      <Text style={paragraph}>Hi {name},</Text>
      <Text style={paragraph}>
        We received a request to reset your password. Click the button below to
        choose a new password. This link expires in {expiresInMinutes} minutes.
      </Text>
      <Section style={buttonContainer}>
        <Button style={button} href={resetUrl}>
          Reset Password
        </Button>
      </Section>
      <Text style={muted}>
        If you did not request a password reset, you can safely ignore this
        email. Your password will remain unchanged.
      </Text>
    </EmailLayout>
  );
}

const heading: React.CSSProperties = {
  color: '#111827',
  fontSize: '24px',
  fontWeight: 600,
  margin: '0 0 16px',
};

const paragraph: React.CSSProperties = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '0 0 16px',
};

const buttonContainer: React.CSSProperties = {
  textAlign: 'center' as const,
  margin: '32px 0',
};

const button: React.CSSProperties = {
  backgroundColor: '#2563eb',
  borderRadius: '8px',
  color: '#ffffff',
  display: 'inline-block',
  fontSize: '16px',
  fontWeight: 600,
  padding: '16px 32px',
  textDecoration: 'none',
};

const muted: React.CSSProperties = {
  color: '#9ca3af',
  fontSize: '13px',
  lineHeight: '22px',
  margin: '24px 0 0',
};

PasswordResetEmail.PreviewProps = {
  name: 'Alice',
  resetUrl: 'https://yourapp.com/reset?token=abc123',
  expiresInMinutes: 60,
} satisfies PasswordResetEmailProps;
```

### 4. Sending with Resend

```typescript
// src/lib/email.ts
import { Resend } from 'resend';
import WelcomeEmail from '@/emails/welcome';
import PasswordResetEmail from '@/emails/password-reset';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendWelcomeEmail(to: string, name: string) {
  const { data, error } = await resend.emails.send({
    from: 'YourApp <hello@yourapp.com>',
    to,
    subject: `Welcome to YourApp, ${name}!`,
    react: WelcomeEmail({ name, loginUrl: 'https://yourapp.com/dashboard' }),
  });

  if (error) {
    console.error('Failed to send welcome email:', error);
    throw new Error(`Email send failed: ${error.message}`);
  }

  return data;
}

export async function sendPasswordResetEmail(
  to: string,
  name: string,
  resetToken: string
) {
  const { data, error } = await resend.emails.send({
    from: 'YourApp <no-reply@yourapp.com>',
    to,
    subject: 'Reset your password',
    react: PasswordResetEmail({
      name,
      resetUrl: `https://yourapp.com/reset?token=${resetToken}`,
      expiresInMinutes: 60,
    }),
    headers: {
      'X-Entity-Ref-ID': resetToken, // Prevent threading in Gmail
    },
  });

  if (error) throw new Error(`Email send failed: ${error.message}`);
  return data;
}

// Batch sending
export async function sendBatchEmails(
  emails: Array<{ to: string; name: string }>
) {
  const { data, error } = await resend.batch.send(
    emails.map((e) => ({
      from: 'YourApp <hello@yourapp.com>',
      to: e.to,
      subject: 'Your weekly digest',
      react: WelcomeEmail({ name: e.name, loginUrl: 'https://yourapp.com' }),
    }))
  );

  return { data, error };
}
```

### 5. MJML Alternative

```xml
<!-- For teams that prefer a markup language over JSX -->
<mjml>
  <mj-head>
    <mj-attributes>
      <mj-all font-family="Inter, Helvetica, Arial, sans-serif" />
      <mj-text font-size="16px" line-height="26px" color="#374151" />
      <mj-button background-color="#2563eb" border-radius="8px" font-size="16px"
                  font-weight="600" inner-padding="16px 32px" />
    </mj-attributes>
    <mj-preview>Welcome to YourApp!</mj-preview>
  </mj-head>
  <mj-body background-color="#f6f9fc">
    <mj-section background-color="#ffffff" border-radius="8px" padding="40px">
      <mj-column>
        <mj-image src="https://yourapp.com/logo.png" width="120px" alt="YourApp"
                   align="left" padding-bottom="24px" />
        <mj-text font-size="24px" font-weight="600" color="#111827" line-height="32px">
          Welcome to YourApp
        </mj-text>
        <mj-text>Hi {{name}},</mj-text>
        <mj-text>
          Thanks for signing up. Get started by exploring your dashboard.
        </mj-text>
        <mj-button href="{{loginUrl}}" align="center" padding="32px 0">
          Go to Dashboard
        </mj-button>
        <mj-divider border-color="#e5e7eb" padding="24px 0" />
        <mj-text font-size="12px" color="#6b7280" align="center">
          YourApp Inc., 123 Main St, San Francisco, CA 94102
        </mj-text>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>
```

```bash
# Compile MJML to HTML
npx mjml input.mjml -o output.html

# Watch mode for development
npx mjml --watch input.mjml -o output.html
```

## Template Design Patterns

### Reusable Components (React Email)

```tsx
// src/emails/components/notification-row.tsx
import { Row, Column, Img, Text, Link } from '@react-email/components';

interface NotificationRowProps {
  avatarUrl: string;
  actor: string;
  action: string;
  target: string;
  targetUrl: string;
  timestamp: string;
}

export function NotificationRow({
  avatarUrl, actor, action, target, targetUrl, timestamp,
}: NotificationRowProps) {
  return (
    <Row style={{ padding: '12px 0', borderBottom: '1px solid #f3f4f6' }}>
      <Column style={{ width: '40px', verticalAlign: 'top' }}>
        <Img
          src={avatarUrl}
          width={32}
          height={32}
          alt={actor}
          style={{ borderRadius: '50%' }}
        />
      </Column>
      <Column style={{ paddingLeft: '12px' }}>
        <Text style={{ margin: 0, fontSize: '14px', color: '#374151' }}>
          <strong>{actor}</strong> {action}{' '}
          <Link href={targetUrl} style={{ color: '#2563eb' }}>{target}</Link>
        </Text>
        <Text style={{ margin: '4px 0 0', fontSize: '12px', color: '#9ca3af' }}>
          {timestamp}
        </Text>
      </Column>
    </Row>
  );
}
```

### Dynamic Data Table

```tsx
// src/emails/components/data-table.tsx
import { Section, Row, Column, Text } from '@react-email/components';

interface DataTableProps<T extends Record<string, string | number>> {
  columns: Array<{ key: keyof T; label: string; align?: 'left' | 'right' }>;
  rows: T[];
}

export function DataTable<T extends Record<string, string | number>>({
  columns, rows,
}: DataTableProps<T>) {
  return (
    <Section style={{ border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
      {/* Header */}
      <Row style={{ backgroundColor: '#f9fafb' }}>
        {columns.map((col) => (
          <Column key={String(col.key)} style={{ padding: '12px 16px' }}>
            <Text style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: '#6b7280', textAlign: col.align ?? 'left' }}>
              {col.label}
            </Text>
          </Column>
        ))}
      </Row>
      {/* Body */}
      {rows.map((row, i) => (
        <Row key={i} style={{ borderTop: '1px solid #e5e7eb' }}>
          {columns.map((col) => (
            <Column key={String(col.key)} style={{ padding: '12px 16px' }}>
              <Text style={{ margin: 0, fontSize: '14px', color: '#374151', textAlign: col.align ?? 'left' }}>
                {String(row[col.key])}
              </Text>
            </Column>
          ))}
        </Row>
      ))}
    </Section>
  );
}
```

## Best Practices

1. **Inline all styles** -- Gmail strips `<style>` tags; React Email handles this automatically
2. **Use 600px max-width** -- the universally safe email width
3. **Always include Preview text** -- the snippet shown next to subject in inbox
4. **Set `X-Entity-Ref-ID` header** -- prevents Gmail from threading unrelated transactional emails
5. **Test in Litmus or Email on Acid** -- render across 90+ clients
6. **Include plain text version** -- spam filters penalize HTML-only emails
7. **Keep images under 100KB** -- many clients block images by default; do not rely on them for content
8. **Use web-safe fonts with fallbacks** -- custom fonts only render in Apple Mail and some mobile clients
9. **CAN-SPAM compliance** -- always include physical address and unsubscribe link
10. **Use `role="presentation"` on layout tables** -- accessibility for screen readers

## Common Pitfalls

| Pitfall | Impact | Fix |
|---------|--------|-----|
| Using flexbox/grid | Breaks in Outlook entirely | Use table-based layout or React Email components |
| Relying on `<style>` tags | Gmail strips them | Inline all styles (React Email does this automatically) |
| Images without alt text | Broken when images blocked | Always include descriptive alt text |
| Dark mode not handled | Invisible text on dark backgrounds | Use `color-scheme: light dark` meta, test dark mode |
| No plain text fallback | Higher spam score | Always provide text version via `text` prop in Resend |
| Missing unsubscribe link | Legal violation (CAN-SPAM, GDPR) | Include in every marketing/notification email |
| Giant HTML payload | Clipped in Gmail (> 102KB) | Keep HTML under 102KB; minimize inline CSS |
| Background images in Outlook | Not rendered | Use `<!--[if mso]>` conditional comments with VML |


---

## From `email-automation-builder`

> >

# Email Automation Builder

Build multi-sequence email automation flows with branching logic, segmentation, triggers, and tool-specific setup. More advanced than S5 email-drip-sequence: this skill creates conditional flows that respond to subscriber behavior (opened, clicked, purchased). Output includes ASCII flow diagrams, email content, and platform setup instructions.

## Stage

S7: Automation — S5's email-drip-sequence is a linear 7-email series. Real email marketing uses branching flows: if they opened → send X, if they didn't → send Y, if they clicked the affiliate link → move to a different sequence. This skill builds the automation system, not just the emails.

## When to Use

- User needs email flows with conditional logic (if/then branches)
- User wants welcome series, nurture flows, win-back campaigns, or cart abandonment
- User says "email automation", "branching email", "conditional sequence"
- User wants to set up flows in ConvertKit, Mailchimp, ActiveCampaign, or Beehiiv
- User already has an S5 drip sequence and wants to upgrade it to a full automation
- Chaining: upgrade S5 `email-drip-sequence` output to a branching automation

## Input Schema

```yaml
product:
  name: string                 # REQUIRED — product being promoted
  affiliate_url: string        # REQUIRED — affiliate link
  reward_value: string         # OPTIONAL — commission info (e.g., "30% recurring")

audience:
  description: string          # REQUIRED — who the subscribers are
  segments:                    # OPTIONAL — audience segments for branching
    - string                   # e.g., ["cold_leads", "warm_leads", "buyers"]

flow_type: string              # OPTIONAL — "welcome" | "nurture" | "winback"
                               # | "reengagement" | "cart_abandon"
                               # Default: "welcome"

email_tool: string             # OPTIONAL — "convertkit" | "mailchimp"
                               # | "activecampaign" | "beehiiv"
                               # Default: generic (works with any ESP)

num_emails: number             # OPTIONAL — total emails in the flow (5-12)
                               # Default: 7

lead_magnet: string            # OPTIONAL — what they opted in for
```

**Chaining context**: If S5 email-drip-sequence was run earlier, offer to upgrade it: "I see you have a 7-email drip sequence. Want me to upgrade it with branching logic and segments?"

## Workflow

### Step 1: Map Flow Type to Template

Select automation template based on `flow_type`:

**Welcome Flow**: Trigger → Welcome email → Wait 1 day → Value email → Branch (opened? → Soft sell / didn't open? → Re-engagement) → Continue selling to openers, re-engage non-openers

**Nurture Flow**: Trigger → Educational series → Branch (clicked affiliate link? → Move to sales sequence / didn't click? → Continue nurturing) → Post-purchase thank you for converters

**Win-back Flow**: Trigger (inactive 30+ days) → "We miss you" → Wait 3 days → Value reminder → Branch (re-engaged? → Move to nurture / still inactive? → Last chance) → Sunset after no response

### Step 2: Define Triggers and Entry Conditions

For each flow, specify:
- **Entry trigger**: What starts the flow (new subscriber, tag added, purchase, inactivity)
- **Exit conditions**: What removes someone (purchase, unsubscribe, entered different flow)
- **Branch conditions**: Opens, clicks, purchases, time-based

### Step 3: Design Branching Logic

Create decision points:
- After email N: Did they open? (Branch A: opened, Branch B: not opened)
- After email N: Did they click affiliate link? (Branch A: clicked, Branch B: didn't)
- After email N: Did they purchase? (Branch A: buyer → thank you, Branch B: non-buyer → continue)

### Step 4: Write Each Email

For each email in each branch, write:
- Subject line (40-60 chars)
- Preview text (80-100 chars)
- Body copy (200-400 words)
- CTA (single, clear)
- FTC disclosure (for emails with affiliate links)

### Step 5: Add Wait Times

Between emails:
- Welcome flow: 0, 1, 2, 3, 5, 7, 10 days
- Nurture flow: 2, 4, 7, 10, 14 days
- Win-back flow: 0, 3, 7, 14 days
- Adjust based on audience engagement patterns

### Step 6: Output Flow + Setup

Present:
- ASCII flow diagram showing the full automation
- Each email's content
- Tool-specific setup instructions (if email_tool specified)

## Output Schema

```yaml
automation:
  flow_type: string
  product: string
  total_emails: number
  total_branches: number
  estimated_days: number       # total span of the flow

flow:
  - step: number
    type: string               # "email" | "wait" | "branch" | "exit"
    email:                     # present if type is "email"
      subject: string
      preview: string
      body: string
      cta: string
      has_affiliate_link: boolean
    wait_days: number          # present if type is "wait"
    branch:                    # present if type is "branch"
      condition: string        # e.g., "opened previous email?"
      yes_path: number         # step number for yes
      no_path: number          # step number for no

setup:
  tool: string
  steps: string[]              # tool-specific setup instructions
  tags: string[]               # recommended tags to apply
  segments: string[]           # recommended segments
```

## Output Format

1. **Flow Overview** — flow type, total emails, total days, branch count
2. **ASCII Flow Diagram** — visual representation of the automation with branches
3. **Email Content** — each email with subject, preview, body, CTA (grouped by branch)
4. **Setup Instructions** — tool-specific steps to build this automation
5. **Tags & Segments** — recommended tagging strategy for tracking

## Error Handling

- **No product info**: "What affiliate product are you promoting? I need the product name and your affiliate link to write the email content."
- **Unknown email tool**: "I don't have specific setup instructions for [tool]. I'll provide generic automation logic that works with any ESP — just map the triggers, waits, and branches to your tool's interface."
- **Too many emails requested (>12)**: "12+ emails in one flow is usually too many. I'll create a 7-email flow with branches. For longer nurture, consider chaining two separate flows."
- **Upgrading from S5**: "I see your existing 7-email drip. I'll keep the email content and add branching logic: opened/not-opened splits after emails 2 and 4, and a purchase detection branch after email 5."

## Examples

### Example 1: Welcome flow with branches

**User**: "Build a welcome email automation for HeyGen (affiliate link: heygen.com/ref/abc123) for content creators who downloaded my AI tools guide."
**Action**: 7-email welcome flow. Email 1: Deliver guide. Email 2: Value (AI video tip). Branch: Did they open email 2? Yes → Email 3 (soft sell HeyGen). No → Email 3b (re-engagement with different subject). Continue branching through to email 7. ASCII diagram + all email content + ConvertKit setup.

### Example 2: Upgrade existing S5 drip

**User**: "Take my email drip sequence from earlier and add automation logic."
**Action**: Keep the 7 emails from S5 output. Add branches: After email 2 (opened → continue / not opened → resend with new subject). After email 4 (clicked affiliate link → skip to email 5 hard sell / didn't click → add extra value email). After email 5 (purchased → exit + thank you / didn't purchase → continue to email 6-7).

### Example 3: Win-back flow

**User**: "Create a win-back sequence for subscribers who haven't opened emails in 30 days. I promote Semrush."
**Action**: 4-email win-back flow. Trigger: 30 days no opens. Email 1: "Still interested in SEO?" (curiosity). Wait 3 days. Email 2: Value piece (SEO tip). Branch: Opened? Yes → Move to nurture flow. No → Email 3: "Last chance" (urgency). No response after 7 days → Sunset (remove from list).

## References

- `shared/references/ftc-compliance.md` — FTC disclosure for emails with affiliate links. Read in Step 4.
- `shared/references/affitor-branding.md` — Branding guidelines for email footers. Referenced in Step 4.


---

## From `email-drip-sequence`

> >

# Email Drip Sequence

Write a 5-7 email drip sequence that nurtures new subscribers from cold to warm to buyer. Follows the Welcome → Value → Value → Soft Sell → Hard Sell → Objection Handling → Follow-Up pattern. Each email includes subject line, preview text, body copy, and a single clear CTA.

## Stage

S5: Distribution — Email is the highest-ROI channel for affiliate marketers (avg $42 return per $1 spent). This skill turns a list of subscribers into a predictable revenue stream by delivering value first and selling second.

## When to Use

- User has an email list and wants to promote an affiliate product
- User just launched a lead magnet or opt-in form and needs a welcome sequence
- User wants to automate affiliate promotions via email automation (ConvertKit, Mailchimp, Beehiiv, ActiveCampaign, etc.)
- User says anything like "email sequence", "drip campaign", "email funnel", "nurture series"
- User wants a sequence for a specific product or niche
- Chaining from S1 (research) — user found a product and now wants an email sequence for it

## Input Schema

```yaml
product:
  name: string              # REQUIRED — product name (e.g., "HeyGen")
  affiliate_url: string     # REQUIRED — the affiliate link to promote
  category: string          # OPTIONAL — product category (e.g., "AI video tool")
  reward_value: string      # OPTIONAL — commission amount/percentage (e.g., "30% recurring")
  key_benefits: string[]    # OPTIONAL — top 3 benefits. Auto-researched if not provided.
  price: string             # OPTIONAL — product pricing (e.g., "$29/mo")

audience:
  description: string       # REQUIRED — who are the subscribers? (e.g., "content creators", "SaaS founders")
  pain_point: string        # OPTIONAL — main problem they want solved
  awareness_level: string   # OPTIONAL — "cold" | "warm" | "hot". Default: "cold"

sequence:
  length: number            # OPTIONAL — number of emails: 5, 6, or 7. Default: 7
  send_days: number[]       # OPTIONAL — days to send (e.g., [0, 1, 3, 5, 7, 10, 14])
                            # Default: [0, 1, 3, 5, 7, 10, 14]
  sender_name: string       # OPTIONAL — from name (e.g., "Alex from ContentPro")
  tone: string              # OPTIONAL — "conversational" | "professional" | "bold"
                            # Default: "conversational"
  lead_magnet: string       # OPTIONAL — what they opted in for (e.g., "AI tools checklist")
```

**Chaining context**: If S1 (product research) was run earlier in the conversation, pull `product.name`, `product.affiliate_url`, `product.key_benefits`, and `product.reward_value` automatically. Do not ask the user to repeat information already provided.

## Workflow

### Step 1: Gather Information

Collect required inputs. If `product.name` and `product.affiliate_url` are present (from user or S1 chain), proceed. Otherwise ask:
- "What product are you promoting and what's your affiliate link?"
- "Who are your subscribers? (e.g., freelancers, SaaS founders, content creators)"

If `product.key_benefits` is not provided, infer 3 benefits from the product name and category using your training knowledge. State: "Based on what I know about [product], I'm using these key benefits: [list]. Correct me if needed."

### Step 2: Plan the Sequence

Map each email to its purpose using the 7-email arc. For a 5-email sequence, drop emails 6 and 7. For a 6-email sequence, drop email 7.

| # | Day | Type | Purpose |
|---|-----|------|---------|
| 1 | 0 | Welcome | Deliver lead magnet, set expectations, build trust |
| 2 | 1 | Value | Teach something useful (no sell) |
| 3 | 3 | Value + Soft Mention | More value, casual mention of the product |
| 4 | 5 | Soft Sell | Introduce the product properly, benefits focus |
| 5 | 7 | Hard Sell | Clear CTA, urgency (limited offer / deadline if available) |
| 6 | 10 | Objection Handling | Answer top 3 objections, social proof |
| 7 | 14 | Follow-Up / Last Chance | "Did you see this?" re-engagement email |

### Step 3: Write Each Email

For each email, write all four components:

**Subject Line**: 40-60 characters. Use curiosity, specificity, or direct benefit. Avoid spam trigger words (free, guaranteed, act now).

**Preview Text**: 80-100 characters. Extends the subject line, adds context or intrigue. Shown in inbox preview.

**Body Copy**:
- Email 1-2: 200-300 words. Focus on value, zero sell pressure.
- Email 3-4: 250-350 words. Introduce product naturally in context.
- Email 5: 300-400 words. Strong pitch, benefits listed, clear CTA button.
- Email 6: 250-300 words. Story-driven or testimonial-anchored.
- Email 7: 150-200 words. Short, punchy re-engagement.

**Formatting rules**:
- Short paragraphs (2-3 sentences max)
- One idea per paragraph
- Conversational opener (use "you", avoid "Dear [Name]")
- Single CTA per email (one link, one action)
- Sign off with sender name + brief sign-off line

**CTA structure**:
- Email 1: CTA = download/access lead magnet (not affiliate link)
- Email 2: CTA = read an article or reply to email (engagement)
- Email 3: CTA = soft mention "check it out" with affiliate link
- Email 4-7: CTA = affiliate link with action verb ("Try [Product] Free", "Get [X]% Off", "Start Your Trial")

### Step 4: Add Compliance Disclosures

Each email that contains an affiliate link must include a one-line FTC disclosure. Place it immediately before or after the affiliate link:

> *Affiliate disclosure: I may earn a commission if you purchase through my link, at no extra cost to you.*

For email clients that strip formatting, also include plain text disclosure in the footer.

### Step 5: Output the Sequence

Present all emails in order. Each email formatted as:

```
---
EMAIL [N] — Day [X] — [Type]
---
Subject: [subject line]
Preview: [preview text]

[Body copy]

[CTA]

[Signature]
---
```

After all emails, provide the Setup Instructions section.

## Output Schema

```yaml
sequence:
  product_name: string
  affiliate_url: string
  audience: string
  email_count: number
  total_days: number          # span of the sequence in days
  emails:
    - number: number          # 1-7
      day: number             # send delay in days from signup
      type: string            # welcome | value | soft-sell | hard-sell | objection | follow-up
      subject: string
      preview_text: string
      body: string            # full email body
      cta_text: string        # button/link text
      cta_url: string         # affiliate link or engagement action

setup:
  recommended_esp: string[]   # e.g., ["ConvertKit", "Beehiiv", "ActiveCampaign"]
  automation_notes: string    # how to set up the delay/trigger logic
  ab_test_suggestion: string  # what to A/B test first
```

## Output Format

Present the sequence as clearly separated email blocks (as shown in Step 5). After the last email, add a **Setup Instructions** section:

```
---
SETUP INSTRUCTIONS
---
ESP Recommendations: ConvertKit, Beehiiv, or ActiveCampaign
Trigger: New subscriber joins list / completes opt-in form
Delays: Set each email to fire X days after the previous
A/B Test First: Subject lines on Email 5 (the hard sell) — highest impact
Tag to apply: Add an "affiliate-[product]" tag to track clicks in your ESP
---
```

## Error Handling

- **No affiliate URL provided**: "I'll write the sequence structure now. Drop in your affiliate link where I've marked `[YOUR_AFFILIATE_LINK]` before setting it up in your ESP."
- **Unknown product**: Research the product using web search if possible. If not found, ask: "Can you tell me the top 2-3 benefits of [product]? I'll write the sequence around those."
- **Audience too vague ("everyone")**: Default to "online business owners and marketers." Note: "I used a general audience. For better conversions, replace 'you' with specific language like 'as a freelancer...' or 'for SaaS founders...' throughout."
- **No lead magnet info**: Email 1 defaults to a "welcome + what to expect" format rather than lead magnet delivery.
- **Request for 3 emails or fewer**: "A 3-email sequence is too short to build trust before the sell. I recommend at least 5. Want me to write a 5-email version?"

## Examples

**Example 1: Product + audience provided**
User: "Write an email sequence for HeyGen (my link: heygen.com/ref/abc123) targeting YouTube creators who opted in for my AI tools checklist."
Action: 7-email sequence, Day 0 delivers checklist, emails 2-3 teach AI video creation tips, emails 4-7 pitch HeyGen with creator-specific angles (save editing time, AI avatars, multilingual).

**Example 2: Chained from S1**
Context: S1 found Semrush with 30% recurring commission targeting SEO consultants.
User: "Now write an email sequence for this."
Action: Pull product details from S1 output. Write 7-email sequence targeting SEO consultants. Lead magnet assumed to be SEO-related content.

**Example 3: Minimal input**
User: "Write me a drip sequence for my Notion template affiliate program"
Action: Ask for affiliate URL and audience. Use Notion affiliate program knowledge for benefits. Write 5-email sequence (conservative default for shorter products with simpler buying journey).

## References

- `shared/references/ftc-compliance.md` — FTC affiliate disclosure requirements. Apply to every email containing an affiliate link.
- `shared/references/affitor-branding.md` — Affitor footer. Include in plain text footer of each email.


---

## From `email-campaign`

> Email campaign generator. One prompt → full drip sequence (welcome, nurture, conversion, re-engagement) as React Email components or HTML. Chains email-templates + brand + design-system + resend. Includes subject line variants, preview text, and plain-text fallbacks.

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


---

## From `resend`

> Resend email API — React Email templates, batch sending, webhooks, domain management

# Resend

> Modern email API for developers — send transactional emails with React Email templates.

## When to Use
- Transactional emails (welcome, password reset, receipts, notifications)
- React Email templates (JSX to HTML) with batch sending or scheduled delivery
- Delivery tracking via webhooks (sent, delivered, bounced, opened, clicked)

## Core Patterns

### Send Email
```typescript
import { Resend } from "resend";
import { WelcomeEmail } from "@/emails/welcome";

const resend = new Resend(process.env.RESEND_API_KEY);
const { data, error } = await resend.emails.send({
  from: "App <noreply@yourdomain.com>",
  to: ["user@example.com"],
  subject: "Welcome!",
  react: WelcomeEmail({ name: "Inu" }),
  headers: { "X-Entity-Ref-ID": "unique-id" },
  attachments: [{ filename: "invoice.pdf", content: buffer }],
  tags: [{ name: "category", value: "welcome" }],
  scheduledAt: "2026-03-15T09:00:00Z", // optional, up to 72h
});
```

### React Email Template
```tsx
import { Html, Head, Body, Container, Section, Text, Button, Img, Link, Hr } from "@react-email/components";

export function WelcomeEmail({ name }: { name: string }) {
  return (
    <Html><Head /><Body style={{ fontFamily: "sans-serif", background: "#f6f9fc" }}>
        <Container style={{ maxWidth: 480, margin: "0 auto", padding: 20 }}>
          <Img src="https://yourdomain.com/logo.png" width={120} alt="Logo" />
          <Text>Hi {name}, welcome aboard!</Text>
          <Button href="https://yourdomain.com/dashboard"
            style={{ background: "#000", color: "#fff", padding: "12px 20px", borderRadius: 6 }}>
            Get Started
          </Button>
          <Hr />
          <Text style={{ color: "#8898aa", fontSize: 12 }}>© 2026 Your Company</Text>
        </Container>
      </Body>
    </Html>
  );
}
```

### Batch Sending (up to 100 per call)
```typescript
const { data } = await resend.batch.send([
  { from: "noreply@yourdomain.com", to: ["a@ex.com"], subject: "Hi A", react: EmailA() },
  { from: "noreply@yourdomain.com", to: ["b@ex.com"], subject: "Hi B", react: EmailB() },
]);
```
### Key Features
- **Domains**: Add DNS records (MX, SPF, DKIM) via dashboard or `resend.domains.create()`
- **Webhooks**: Configure endpoint in dashboard; verify `svix-signature` header
- **Idempotency**: Pass `Idempotency-Key` header to prevent duplicate sends
- **Preview**: `npx email dev` — localhost preview of all templates in `/emails`
- **Rate limits**: 2/sec (free), 50/sec (pro) — use batch for bulk

