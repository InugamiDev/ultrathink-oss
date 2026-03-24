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
