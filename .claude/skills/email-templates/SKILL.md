---
name: email-templates
description: Build responsive HTML emails with React Email, MJML, and Resend for transactional email delivery, template design patterns, and cross-client compatibility
layer: domain
category: frontend
triggers:
  - "email template"
  - "react email"
  - "mjml"
  - "transactional email"
  - "resend"
  - "html email"
  - "email design"
  - "newsletter template"
  - "welcome email"
  - "notification email"
inputs:
  - Email type (transactional, marketing, notification)
  - Branding requirements (colors, logos, fonts)
  - Content structure and dynamic data
  - Target email clients (Gmail, Outlook, Apple Mail)
outputs:
  - React Email or MJML templates
  - Resend integration code
  - Preview and testing setup
  - Responsive email layouts
  - Template management patterns
linksTo:
  - react
  - typescript-frontend
  - design-systems
  - api-designer
linkedFrom:
  - authentication
  - ecommerce
  - billing
preferredNextSkills:
  - api-designer
  - testing-patterns
fallbackSkills:
  - react
  - nodejs
riskLevel: low
memoryReadPolicy: selective
memoryWritePolicy: none
sideEffects:
  - May add @react-email/* and resend dependencies
  - May create email template directory structure
---

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
