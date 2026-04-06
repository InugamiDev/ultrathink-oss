---
name: visual-render
description: "Generate visual images from HTML/SVG/Canvas — logos, icons, diagrams, charts, infographics, tables, flowcharts, architecture maps, ER diagrams. Pipeline: Claude generates HTML → Playwright screenshots → Python crop/trim/export → clean PNG/SVG/WebP output file. Actions: render, generate, create, design, export, capture. Types: logo, icon, diagram, flowchart, chart, table, infographic, architecture, ER diagram, sequence diagram, network graph, timeline, badge, banner."
layer: domain
category: design
triggers:
  - "generate image"
  - "create diagram"
  - "render visual"
  - "make icon"
  - "design logo"
  - "create chart"
  - "export image"
  - "html to image"
  - "svg to image"
  - "architecture diagram"
  - "flowchart"
  - "ER diagram"
  - "sequence diagram"
  - "infographic"
  - "generate svg"
  - "render diagram"
  - "create visual"
  - "network diagram"
  - "draw diagram"
linksTo:
  - ui-ux-pro-max
  - design
  - ui-styling
linkedFrom:
  - design
  - ui-ux-pro-max
riskLevel: low
memoryReadPolicy: never
memoryWritePolicy: never
---

# Visual Render Skill

Generate images from HTML/SVG/Canvas using a Playwright capture pipeline with Python post-processing.

## Visual Types

| Type | Best Renderer | Notes |
|------|--------------|-------|
| Logo | SVG inline | Vector, scalable, transparent bg |
| Icon | SVG inline | 24×24 to 512×512, viewBox required |
| Diagram / Flowchart | HTML+CSS or SVG | Use CSS Grid for layout |
| Architecture diagram | HTML+CSS boxes+arrows | Flexbox/Grid containers |
| ER diagram | SVG | Tables as rects, relationships as lines |
| Sequence diagram | HTML table or SVG | Time flows top→bottom |
| Chart (bar/line/pie) | Chart.js via CDN | Canvas element, wait 500ms |
| Data table | HTML `<table>` | Styled with CSS |
| Infographic | HTML sections | Mix of SVG + text |
| Badge / Label | SVG or HTML | Small, sharp output |
| Network graph | SVG with paths | Nodes as circles, edges as lines |
| Timeline | HTML+CSS | Horizontal or vertical |

---

## Workflow

### Step 1: Generate the HTML file

Write a self-contained HTML file to `/tmp/visual-render/<name>.html`.

**Required wrapper** — the capture script targets `[data-export]`:
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: transparent; font-family: system-ui, sans-serif; }
  </style>
</head>
<body>
  <div data-export style="display: inline-block; padding: 24px;">
    <!-- YOUR VISUAL HERE -->
  </div>
</body>
</html>
```

### Step 2: Run the capture script

```bash
~/.local/share/ultrathink/venv/bin/python3 \
  ~/.claude/skills/visual-render/scripts/capture.py \
  /tmp/visual-render/<name>.html \
  /tmp/visual-render/<name>.png
```

**Full options:**
```
--scale 2          HiDPI output (default: 2 for retina-quality)
--bg white         Background: transparent (default), white, black, #hex
--padding 32       Extra padding around content (default: 24)
--format png       Output format: png, jpeg, webp (default: png)
--selector .card   Override CSS selector (default: [data-export])
--wait 600         Wait ms after load, useful for Chart.js animations (default: 300)
--width 1400       Viewport width (default: 1200)
--no-trim          Skip whitespace trim
```

### Step 3: Show the result

After capture, show the image path and optionally display it.

---

## HTML Patterns by Type

### Logo (SVG)
```html
<div data-export style="display:inline-flex; padding:32px;">
  <svg width="200" height="80" viewBox="0 0 200 80" xmlns="http://www.w3.org/2000/svg">
    <!-- logomark -->
    <rect x="0" y="20" width="40" height="40" rx="8" fill="#6366f1"/>
    <text x="50" y="52" font-family="system-ui" font-weight="700" font-size="28" fill="#1e1e2e">BrandName</text>
  </svg>
</div>
```

### Icon (SVG)
```html
<div data-export style="display:inline-flex; padding:16px; background:#f8f9fa; border-radius:12px;">
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2" xmlns="http://www.w3.org/2000/svg">
    <path stroke-linecap="round" stroke-linejoin="round" d="M12 2L2 7l10 5 10-5-10-5z"/>
    <path stroke-linecap="round" stroke-linejoin="round" d="M2 17l10 5 10-5M2 12l10 5 10-5"/>
  </svg>
</div>
```

### Flowchart (HTML+CSS)
```html
<div data-export style="padding:40px; font-family:system-ui; background:#fff; border-radius:16px;">
  <style>
    .flow { display:flex; flex-direction:column; align-items:center; gap:0; }
    .node { padding:12px 24px; border-radius:8px; font-size:14px; font-weight:500; text-align:center; min-width:160px; }
    .start { background:#6366f1; color:#fff; border-radius:24px; }
    .process { background:#f1f5f9; border:2px solid #e2e8f0; color:#1e293b; }
    .decision { background:#fef3c7; border:2px solid #f59e0b; color:#92400e; transform:rotate(0); clip-path:polygon(50% 0,100% 50%,50% 100%,0 50%); padding:20px 32px; }
    .end { background:#22c55e; color:#fff; border-radius:24px; }
    .arrow { width:2px; height:28px; background:#cbd5e1; margin:0 auto; position:relative; }
    .arrow::after { content:''; position:absolute; bottom:0; left:50%; transform:translateX(-50%); border:6px solid transparent; border-top:8px solid #cbd5e1; }
  </style>
  <div class="flow">
    <div class="node start">Start</div>
    <div class="arrow"></div>
    <div class="node process">Process Step</div>
    <div class="arrow"></div>
    <div class="node decision">Decision?</div>
    <div class="arrow"></div>
    <div class="node end">End</div>
  </div>
</div>
```

### Chart (Chart.js)
```html
<div data-export style="padding:32px; background:#fff; border-radius:16px; width:600px;">
  <canvas id="chart" width="540" height="320"></canvas>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <script>
    new Chart(document.getElementById('chart'), {
      type: 'bar',
      data: {
        labels: ['Jan','Feb','Mar','Apr','May'],
        datasets:[{ label:'Revenue', data:[12,19,8,15,23], backgroundColor:'#6366f1' }]
      },
      options: { responsive:false, plugins:{ legend:{ display:true } } }
    });
  </script>
</div>
```
> Use `--wait 600` for Chart.js to finish rendering.

### Data Table
```html
<div data-export style="padding:24px; background:#fff; border-radius:12px; font-family:system-ui;">
  <table style="border-collapse:collapse; min-width:400px; font-size:14px;">
    <thead>
      <tr style="background:#6366f1; color:#fff;">
        <th style="padding:12px 16px; text-align:left;">Name</th>
        <th style="padding:12px 16px; text-align:right;">Value</th>
      </tr>
    </thead>
    <tbody>
      <tr style="border-bottom:1px solid #f1f5f9;">
        <td style="padding:10px 16px;">Row 1</td>
        <td style="padding:10px 16px; text-align:right;">100</td>
      </tr>
    </tbody>
  </table>
</div>
```

### Architecture Diagram
```html
<div data-export style="padding:40px; background:#0f172a; border-radius:16px; font-family:system-ui; color:#e2e8f0; min-width:700px;">
  <style>
    .arch { display:flex; gap:32px; align-items:center; }
    .box { padding:16px 20px; border-radius:10px; border:2px solid; font-size:13px; font-weight:500; text-align:center; min-width:100px; }
    .client { background:#1e3a5f; border-color:#3b82f6; color:#93c5fd; }
    .service { background:#1a2e1a; border-color:#22c55e; color:#86efac; }
    .db { background:#2d1b1b; border-color:#ef4444; color:#fca5a5; }
    .arrow { font-size:20px; color:#64748b; }
  </style>
  <div class="arch">
    <div class="box client">Browser</div>
    <span class="arrow">→</span>
    <div class="box service">API Server</div>
    <span class="arrow">→</span>
    <div class="box db">Database</div>
  </div>
</div>
```

---

## Post-Processing Options

| Goal | Command flag |
|------|-------------|
| Crisp retina output | `--scale 2` (default) |
| White background | `--bg white` |
| Transparent background | `--bg transparent` (default) |
| Fixed size output | `--resize 512x512` |
| JPEG for photos | `--format jpeg --quality 90` |
| WebP for web | `--format webp --quality 85` |
| No auto-crop | `--no-trim` |
| Extra padding | `--padding 48` |

---

## Setup (first time only)

```bash
python3 -m venv ~/.local/share/ultrathink/venv
~/.local/share/ultrathink/venv/bin/pip install playwright Pillow
~/.local/share/ultrathink/venv/bin/playwright install chromium
```

> Already done on this machine — venv is at `~/.local/share/ultrathink/venv`.

---

## Anti-Patterns

- **No `data-export` attribute** → captures full viewport; add `data-export` to the root element
- **Missing `display:inline-block`** on `data-export` → element has no intrinsic size, capture fails
- **External fonts without fallback** → use `system-ui` as fallback or embed fonts as base64
- **Chart.js without `--wait`** → captures before canvas renders; always use `--wait 600`
- **Fixed px viewport too small** → content clips; use `--width 1600` for wide diagrams
