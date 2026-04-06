---
name: pdf-generation
description: Generate PDFs using Puppeteer, Playwright, react-pdf/renderer, pdfkit, jsPDF — server-side document rendering, invoices, reports, and export workflows
layer: domain
category: backend
triggers:
  - "generate pdf"
  - "pdf generation"
  - "export to pdf"
  - "invoice pdf"
  - "report pdf"
  - "puppeteer pdf"
  - "react-pdf"
  - "pdfkit"
  - "jspdf"
  - "server-side pdf"
  - "print to pdf"
inputs:
  - Document type (invoice, report, certificate, contract)
  - Data source and template requirements
  - Styling complexity (simple text vs rich layouts)
  - Runtime environment (server-only, edge, client-side)
  - Volume expectations (on-demand vs batch)
outputs:
  - PDF generation implementation with chosen library
  - Document template system
  - API endpoint for on-demand PDF generation
  - Batch generation pipeline (if needed)
  - Download/email delivery integration
linksTo:
  - react
  - api-designer
  - nodejs
  - message-queues
linkedFrom:
  - ecommerce
  - billing
preferredNextSkills:
  - caching
  - message-queues
fallbackSkills:
  - nodejs
riskLevel: low
memoryReadPolicy: selective
memoryWritePolicy: none
sideEffects:
  - May add browser dependencies (Puppeteer/Playwright Chromium)
  - May add native dependencies (pdfkit/canvas)
  - May increase Docker image size significantly for browser-based approaches
---

# PDF Generation Skill

## Purpose

PDF generation is essential for invoices, reports, certificates, contracts, and data exports. This skill covers the full spectrum: from browser-based HTML-to-PDF rendering (Puppeteer/Playwright) to programmatic PDF construction (pdfkit, react-pdf) to client-side generation (jsPDF).

## When to Use What

| Library | Best For | Runtime | Styling | Size Impact |
|---------|----------|---------|---------|-------------|
| **Puppeteer / Playwright** | Complex HTML layouts, pixel-perfect CSS | Server (needs Chromium) | Full CSS, Tailwind, Flexbox, Grid | ~400MB (Chromium) |
| **@react-pdf/renderer** | React developers, component-based layouts | Server or client | React-PDF subset (Flexbox, no CSS Grid) | ~2MB |
| **pdfkit** | Programmatic PDF, precise control | Server (Node.js) | Manual positioning, no CSS | ~5MB |
| **jsPDF** | Client-side generation, simple documents | Browser | Manual positioning | ~300KB |
| **Playwright `page.pdf()`** | Already using Playwright, need PDF export | Server | Full CSS | ~400MB |

**Decision shortcut:**
- Have complex HTML/CSS templates? **Puppeteer or Playwright**
- React-based, component-driven? **@react-pdf/renderer**
- Need precise low-level control? **pdfkit**
- Must generate in browser, no server? **jsPDF**

## Implementation Patterns

### 1. Puppeteer HTML-to-PDF (Most Flexible)

```typescript
import puppeteer, { Browser } from 'puppeteer';

// Reuse browser instance for performance
let browser: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (!browser || !browser.connected) {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',     // Use /tmp instead of /dev/shm
        '--disable-gpu',
        '--font-render-hinting=none',  // Consistent font rendering
      ],
    });
  }
  return browser;
}

interface PdfOptions {
  html: string;
  format?: 'A4' | 'Letter' | 'Legal';
  landscape?: boolean;
  margin?: { top: string; right: string; bottom: string; left: string };
  headerTemplate?: string;
  footerTemplate?: string;
  printBackground?: boolean;
}

async function generatePdf(options: PdfOptions): Promise<Buffer> {
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    // Set content and wait for everything to load
    await page.setContent(options.html, {
      waitUntil: ['networkidle0', 'domcontentloaded'],
      timeout: 30_000,
    });

    // Wait for any web fonts to load
    await page.evaluateHandle('document.fonts.ready');

    const pdfBuffer = await page.pdf({
      format: options.format ?? 'A4',
      landscape: options.landscape ?? false,
      printBackground: options.printBackground ?? true,
      margin: options.margin ?? {
        top: '1.5cm',
        right: '1.5cm',
        bottom: '2cm',
        left: '1.5cm',
      },
      displayHeaderFooter: !!(options.headerTemplate || options.footerTemplate),
      headerTemplate: options.headerTemplate ?? '<span></span>',
      footerTemplate:
        options.footerTemplate ??
        `<div style="font-size: 9px; width: 100%; text-align: center; color: #666;">
          Page <span class="pageNumber"></span> of <span class="totalPages"></span>
        </div>`,
    });

    return Buffer.from(pdfBuffer);
  } finally {
    await page.close();
  }
}

// Cleanup on shutdown
process.on('SIGTERM', async () => {
  if (browser) await browser.close();
});
```

### 2. Invoice Template with Puppeteer

```typescript
interface InvoiceData {
  invoiceNumber: string;
  date: string;
  dueDate: string;
  company: { name: string; address: string; email: string; logo?: string };
  client: { name: string; address: string; email: string };
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  subtotal: number;
  tax: number;
  taxRate: number;
  total: number;
  notes?: string;
}

function renderInvoiceHtml(data: InvoiceData): string {
  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1a1a1a; font-size: 14px; line-height: 1.5; }
    .invoice { max-width: 800px; margin: 0 auto; padding: 2rem; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 3rem; }
    .logo { font-size: 1.5rem; font-weight: 700; color: #2563eb; }
    .invoice-meta { text-align: right; }
    .invoice-meta h1 { font-size: 2rem; color: #111; margin-bottom: 0.5rem; }
    .invoice-meta p { color: #666; }
    .parties { display: flex; justify-content: space-between; margin-bottom: 2.5rem; }
    .party { max-width: 45%; }
    .party-label { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; color: #999; margin-bottom: 0.25rem; }
    .party-name { font-weight: 600; font-size: 1rem; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 2rem; }
    th { text-align: left; padding: 0.75rem; border-bottom: 2px solid #e5e7eb; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; color: #666; }
    th:last-child { text-align: right; }
    td { padding: 0.75rem; border-bottom: 1px solid #f3f4f6; }
    td:last-child { text-align: right; }
    .totals { margin-left: auto; width: 280px; }
    .totals-row { display: flex; justify-content: space-between; padding: 0.5rem 0; }
    .totals-row.total { font-weight: 700; font-size: 1.25rem; border-top: 2px solid #111; padding-top: 0.75rem; margin-top: 0.25rem; }
    .notes { margin-top: 2rem; padding: 1rem; background: #f9fafb; border-radius: 0.5rem; color: #666; font-size: 0.875rem; }
  </style>
</head>
<body>
  <div class="invoice">
    <div class="header">
      <div class="logo">${data.company.logo ? `<img src="${data.company.logo}" height="40" />` : data.company.name}</div>
      <div class="invoice-meta">
        <h1>Invoice</h1>
        <p>#${data.invoiceNumber}</p>
        <p>Date: ${data.date}</p>
        <p>Due: ${data.dueDate}</p>
      </div>
    </div>

    <div class="parties">
      <div class="party">
        <div class="party-label">From</div>
        <div class="party-name">${data.company.name}</div>
        <p>${data.company.address}</p>
        <p>${data.company.email}</p>
      </div>
      <div class="party">
        <div class="party-label">Bill To</div>
        <div class="party-name">${data.client.name}</div>
        <p>${data.client.address}</p>
        <p>${data.client.email}</p>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Description</th>
          <th>Qty</th>
          <th>Unit Price</th>
          <th>Amount</th>
        </tr>
      </thead>
      <tbody>
        ${data.items
          .map(
            (item) => `
          <tr>
            <td>${item.description}</td>
            <td>${item.quantity}</td>
            <td>${formatCurrency(item.unitPrice)}</td>
            <td>${formatCurrency(item.total)}</td>
          </tr>`
          )
          .join('')}
      </tbody>
    </table>

    <div class="totals">
      <div class="totals-row">
        <span>Subtotal</span>
        <span>${formatCurrency(data.subtotal)}</span>
      </div>
      <div class="totals-row">
        <span>Tax (${data.taxRate}%)</span>
        <span>${formatCurrency(data.tax)}</span>
      </div>
      <div class="totals-row total">
        <span>Total Due</span>
        <span>${formatCurrency(data.total)}</span>
      </div>
    </div>

    ${data.notes ? `<div class="notes"><strong>Notes:</strong> ${data.notes}</div>` : ''}
  </div>
</body>
</html>`;
}

// Generate the invoice PDF
async function generateInvoicePdf(data: InvoiceData): Promise<Buffer> {
  return generatePdf({
    html: renderInvoiceHtml(data),
    format: 'A4',
    margin: { top: '1cm', right: '1cm', bottom: '2cm', left: '1cm' },
  });
}
```

### 3. @react-pdf/renderer (Component-Based)

```typescript
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  renderToBuffer,
  Image,
  Link,
} from '@react-pdf/renderer';

// Register custom fonts
Font.register({
  family: 'Inter',
  fonts: [
    { src: '/fonts/Inter-Regular.ttf', fontWeight: 400 },
    { src: '/fonts/Inter-Medium.ttf', fontWeight: 500 },
    { src: '/fonts/Inter-Bold.ttf', fontWeight: 700 },
  ],
});

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Inter',
    fontSize: 11,
    padding: 40,
    color: '#1a1a1a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
  },
  table: {
    marginTop: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 2,
    borderBottomColor: '#e5e7eb',
    paddingBottom: 8,
    marginBottom: 4,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  colDescription: { flex: 3 },
  colQty: { flex: 1, textAlign: 'center' },
  colPrice: { flex: 1, textAlign: 'right' },
  colTotal: { flex: 1, textAlign: 'right' },
  headerText: {
    fontSize: 9,
    fontWeight: 500,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: '#666',
  },
  totalSection: {
    marginTop: 20,
    alignItems: 'flex-end',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 200,
    paddingVertical: 4,
  },
  grandTotal: {
    fontWeight: 700,
    fontSize: 16,
    borderTopWidth: 2,
    borderTopColor: '#111',
    paddingTop: 8,
    marginTop: 4,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    color: '#999',
    fontSize: 9,
  },
});

interface InvoiceDocProps {
  data: InvoiceData;
}

function InvoiceDocument({ data }: InvoiceDocProps) {
  const fmt = (n: number) => `$${n.toFixed(2)}`;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>{data.company.name}</Text>
            <Text>{data.company.address}</Text>
          </View>
          <View>
            <Text style={{ fontSize: 20, fontWeight: 700 }}>Invoice</Text>
            <Text>#{data.invoiceNumber}</Text>
            <Text>Date: {data.date}</Text>
            <Text>Due: {data.dueDate}</Text>
          </View>
        </View>

        {/* Line items table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.colDescription, styles.headerText]}>Description</Text>
            <Text style={[styles.colQty, styles.headerText]}>Qty</Text>
            <Text style={[styles.colPrice, styles.headerText]}>Price</Text>
            <Text style={[styles.colTotal, styles.headerText]}>Amount</Text>
          </View>
          {data.items.map((item, i) => (
            <View key={i} style={styles.tableRow}>
              <Text style={styles.colDescription}>{item.description}</Text>
              <Text style={styles.colQty}>{item.quantity}</Text>
              <Text style={styles.colPrice}>{fmt(item.unitPrice)}</Text>
              <Text style={styles.colTotal}>{fmt(item.total)}</Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totalSection}>
          <View style={styles.totalRow}>
            <Text>Subtotal</Text>
            <Text>{fmt(data.subtotal)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text>Tax ({data.taxRate}%)</Text>
            <Text>{fmt(data.tax)}</Text>
          </View>
          <View style={[styles.totalRow, styles.grandTotal]}>
            <Text>Total</Text>
            <Text>{fmt(data.total)}</Text>
          </View>
        </View>

        <Text style={styles.footer}>
          Thank you for your business.
        </Text>
      </Page>
    </Document>
  );
}

// Server-side rendering to buffer
async function generateInvoiceReactPdf(data: InvoiceData): Promise<Buffer> {
  return renderToBuffer(<InvoiceDocument data={data} />);
}
```

### 4. pdfkit (Programmatic, Low-Level)

```typescript
import PDFDocument from 'pdfkit';
import { Writable } from 'stream';

function generateWithPdfKit(data: InvoiceData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    const doc = new PDFDocument({ size: 'A4', margin: 50 });

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Header
    doc
      .fontSize(24)
      .font('Helvetica-Bold')
      .text(data.company.name, 50, 50)
      .fontSize(10)
      .font('Helvetica')
      .text(data.company.address, 50, 80)
      .text(data.company.email, 50, 95);

    // Invoice title
    doc
      .fontSize(28)
      .font('Helvetica-Bold')
      .text('INVOICE', 400, 50, { align: 'right' })
      .fontSize(10)
      .font('Helvetica')
      .text(`#${data.invoiceNumber}`, 400, 85, { align: 'right' })
      .text(`Date: ${data.date}`, 400, 100, { align: 'right' })
      .text(`Due: ${data.dueDate}`, 400, 115, { align: 'right' });

    // Divider
    doc.moveTo(50, 140).lineTo(545, 140).stroke('#e5e7eb');

    // Bill to
    doc
      .fontSize(8)
      .fillColor('#999')
      .text('BILL TO', 50, 160)
      .fontSize(12)
      .fillColor('#1a1a1a')
      .font('Helvetica-Bold')
      .text(data.client.name, 50, 175)
      .fontSize(10)
      .font('Helvetica')
      .text(data.client.address, 50, 192)
      .text(data.client.email, 50, 207);

    // Table header
    const tableTop = 250;
    doc
      .fontSize(8)
      .fillColor('#666')
      .text('DESCRIPTION', 50, tableTop)
      .text('QTY', 320, tableTop, { width: 60, align: 'center' })
      .text('PRICE', 380, tableTop, { width: 80, align: 'right' })
      .text('AMOUNT', 460, tableTop, { width: 85, align: 'right' });

    doc.moveTo(50, tableTop + 15).lineTo(545, tableTop + 15).stroke('#e5e7eb');

    // Table rows
    let y = tableTop + 25;
    doc.fontSize(10).fillColor('#1a1a1a');

    for (const item of data.items) {
      doc
        .text(item.description, 50, y, { width: 260 })
        .text(String(item.quantity), 320, y, { width: 60, align: 'center' })
        .text(`$${item.unitPrice.toFixed(2)}`, 380, y, { width: 80, align: 'right' })
        .text(`$${item.total.toFixed(2)}`, 460, y, { width: 85, align: 'right' });

      y += 25;
      doc.moveTo(50, y - 5).lineTo(545, y - 5).stroke('#f3f4f6');
    }

    // Totals
    y += 10;
    doc
      .text('Subtotal', 380, y, { width: 80, align: 'right' })
      .text(`$${data.subtotal.toFixed(2)}`, 460, y, { width: 85, align: 'right' });
    y += 20;
    doc
      .text(`Tax (${data.taxRate}%)`, 380, y, { width: 80, align: 'right' })
      .text(`$${data.tax.toFixed(2)}`, 460, y, { width: 85, align: 'right' });
    y += 25;
    doc.moveTo(380, y - 5).lineTo(545, y - 5).stroke('#111');
    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .text('Total', 380, y, { width: 80, align: 'right' })
      .text(`$${data.total.toFixed(2)}`, 460, y, { width: 85, align: 'right' });

    doc.end();
  });
}
```

### 5. API Route for PDF Download

```typescript
// Next.js: /api/invoices/[id]/pdf/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Fetch invoice data
  const invoice = await db.invoice.findUnique({
    where: { id },
    include: { items: true, company: true, client: true },
  });

  if (!invoice) {
    return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
  }

  // Check authorization
  const session = await getSession(request);
  if (!session || session.companyId !== invoice.companyId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const pdfBuffer = await generateInvoicePdf(invoice);

  return new NextResponse(pdfBuffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="invoice-${invoice.invoiceNumber}.pdf"`,
      'Content-Length': String(pdfBuffer.length),
      'Cache-Control': 'private, max-age=300',
    },
  });
}
```

### 6. Client-Side with jsPDF

```typescript
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

function downloadInvoicePdf(data: InvoiceData) {
  const doc = new jsPDF();

  // Title
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('Invoice', 14, 22);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`#${data.invoiceNumber}`, 14, 30);
  doc.text(`Date: ${data.date}`, 14, 36);

  // Table using autoTable plugin
  autoTable(doc, {
    startY: 50,
    head: [['Description', 'Qty', 'Price', 'Amount']],
    body: data.items.map((item) => [
      item.description,
      String(item.quantity),
      `$${item.unitPrice.toFixed(2)}`,
      `$${item.total.toFixed(2)}`,
    ]),
    foot: [
      ['', '', 'Subtotal', `$${data.subtotal.toFixed(2)}`],
      ['', '', `Tax (${data.taxRate}%)`, `$${data.tax.toFixed(2)}`],
      ['', '', 'Total', `$${data.total.toFixed(2)}`],
    ],
    styles: { fontSize: 10 },
    headStyles: { fillColor: [37, 99, 235] },
    footStyles: { fillColor: [249, 250, 251], textColor: [0, 0, 0], fontStyle: 'bold' },
  });

  doc.save(`invoice-${data.invoiceNumber}.pdf`);
}
```

## Best Practices

1. **Reuse browser instances** with Puppeteer/Playwright -- launching Chromium per request is expensive (500ms+ cold start).
2. **Use `waitUntil: 'networkidle0'`** and `document.fonts.ready` to ensure all assets and fonts load before PDF capture.
3. **Set explicit page size and margins** -- defaults vary between libraries and can cause truncated content.
4. **Use CSS `@media print`** rules for Puppeteer/Playwright to hide UI chrome, adjust colors, avoid page-break issues.
5. **Add `page-break-inside: avoid`** on table rows and card elements to prevent splitting across pages.
6. **Stream large PDFs** instead of buffering the entire document in memory.
7. **Queue batch PDF generation** -- generating 100+ PDFs synchronously will timeout or OOM. Use a job queue.
8. **Cache generated PDFs** if the source data hasn't changed (hash the input, store in S3/R2).
9. **Set `Content-Disposition: attachment`** for downloads, `inline` for browser preview.
10. **Test with real data** -- long text, special characters, empty fields, and multi-page documents all break layouts.

## Common Pitfalls

| Pitfall | Impact | Fix |
|---------|--------|-----|
| Launching new browser per request | 500ms+ overhead, memory leaks | Reuse browser instance, pool pages |
| Missing fonts in container | Squares or fallback glyphs in PDF | Install fonts in Dockerfile, or embed base64 fonts |
| Not waiting for fonts/images | Missing content in PDF | `waitUntil: 'networkidle0'` + `document.fonts.ready` |
| Chromium in Docker without `--no-sandbox` | Crashes on startup | Add sandbox flags, use `@sparticuz/chromium` for Lambda |
| Content overflows page | Truncated text, overlapping elements | Test with long data, use `page-break-inside: avoid` |
| Blocking the main thread | Request timeouts on batch generation | Use background job queue (BullMQ, SQS) |
| Generating same PDF repeatedly | Wasted compute, slow UX | Cache by content hash, serve from CDN/S3 |

## Docker Setup for Puppeteer

```dockerfile
FROM node:20-slim

# Install Chromium dependencies
RUN apt-get update && apt-get install -y \
  chromium \
  fonts-liberation \
  fonts-noto-color-emoji \
  --no-install-recommends \
  && rm -rf /var/lib/apt/lists/*

# Tell Puppeteer to use installed Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .

CMD ["node", "dist/server.js"]
```

## Examples

### Example 1: SaaS Invoice Generation

```
Library: @react-pdf/renderer (component-based, no Chromium needed)
Trigger: After successful payment via Stripe webhook
Flow: Stripe webhook → generate PDF → store in S3 → email to customer
Caching: Store in S3 keyed by invoice ID, serve directly on re-download
```

### Example 2: Analytics Report Export

```
Library: Puppeteer (complex charts, CSS Grid layout)
Trigger: User clicks "Export as PDF" on dashboard
Flow: Render HTML template with Chart.js → Puppeteer PDF → stream to client
Optimization: Reuse browser instance, pool of 3 pages for concurrency
```

### Example 3: Certificate / Diploma Generation

```
Library: pdfkit (precise positioning, custom fonts, background image)
Trigger: Course completion event
Flow: Event → queue job → pdfkit renders certificate → S3 → email
Batch: Use BullMQ for processing 500+ certificates after a cohort graduates
```
