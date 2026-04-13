# Slide Type HTML Patterns

All patterns assume the deck-shell.html CSS is loaded. Each pattern is the inner content of `<section class="slide">`.

---

## Title Slide

```html
<section class="slide" id="s1" style="
  background: radial-gradient(ellipse at 30% 50%, rgba(124,58,237,.25) 0%, transparent 60%),
              radial-gradient(ellipse at 70% 30%, rgba(6,182,212,.15) 0%, transparent 60%),
              var(--bg);
  display:flex; flex-direction:column; justify-content:center; align-items:flex-start;
  padding: 80px 120px;
">
  <div style="display:flex; align-items:center; gap:12px; margin-bottom:32px;">
    <span class="pill">Conference 2025</span>
    <span class="pill" style="background:rgba(6,182,212,.15); color:var(--accent2); border-color:rgba(6,182,212,.3);">Live Demo</span>
  </div>
  <h1 style="font-size:clamp(42px,5.5vw,80px); font-weight:900; line-height:1.05; margin-bottom:24px; max-width:800px;">
    Your <span class="ca">Compelling</span><br>Presentation Title
  </h1>
  <p style="font-size:clamp(16px,1.8vw,22px); color:var(--muted); max-width:600px; line-height:1.6; margin-bottom:48px;">
    A punchy subtitle that tells the audience what they'll walk away with.
  </p>
  <div style="display:flex; align-items:center; gap:24px;">
    <div style="width:48px; height:48px; border-radius:50%; background:linear-gradient(135deg,var(--accent),var(--accent2)); display:flex; align-items:center; justify-content:center; font-weight:700; font-size:18px;">Y</div>
    <div>
      <div style="font-weight:600; font-size:16px;">Your Name</div>
      <div style="color:var(--muted); font-size:14px;">Role @ Company</div>
    </div>
  </div>
  <!-- Decorative element -->
  <svg style="position:absolute;right:80px;top:50%;transform:translateY(-50%);opacity:.06;" width="400" height="400" viewBox="0 0 400 400">
    <circle cx="200" cy="200" r="180" fill="none" stroke="var(--accent)" stroke-width="1"/>
    <circle cx="200" cy="200" r="120" fill="none" stroke="var(--accent2)" stroke-width="1"/>
    <circle cx="200" cy="200" r="60" fill="none" stroke="var(--accent3)" stroke-width="1"/>
  </svg>
</section>
```

---

## Personal Hook / Story

```html
<section class="slide" id="s2" style="padding:64px 120px; display:flex; flex-direction:column; justify-content:center;">
  <h2 style="font-size:clamp(28px,3.5vw,48px); font-weight:800; margin-bottom:40px;">
    The Problem We All <span class="ca">Recognize</span>
  </h2>
  <div class="flow" style="gap:24px; align-items:stretch; margin-bottom:40px;">
    <div class="card" style="flex:1; text-align:center;">
      <div style="font-size:clamp(32px,4vw,56px); font-weight:900; color:var(--danger); line-height:1;">83%</div>
      <div style="color:var(--muted); font-size:14px; margin-top:8px;">of teams report this issue</div>
    </div>
    <div class="card" style="flex:1; text-align:center;">
      <div style="font-size:clamp(32px,4vw,56px); font-weight:900; color:var(--accent4); line-height:1;">4.2h</div>
      <div style="color:var(--muted); font-size:14px; margin-top:8px;">lost per developer per week</div>
    </div>
    <div class="card" style="flex:1; text-align:center;">
      <div style="font-size:clamp(32px,4vw,56px); font-weight:900; color:var(--accent3); line-height:1;">$2.4M</div>
      <div style="color:var(--muted); font-size:14px; margin-top:8px;">average annual cost</div>
    </div>
  </div>
  <p style="font-size:clamp(16px,1.6vw,20px); color:var(--muted); max-width:800px; line-height:1.7;">
    "I've seen this firsthand at <span style="color:var(--text)">three companies</span>. The symptoms look different everywhere, but the root cause is always the same..."
  </p>
</section>
```

---

## Agenda

```html
<section class="slide" id="s3" style="padding:64px 120px; display:flex; flex-direction:column; justify-content:center;">
  <h2 style="font-size:clamp(28px,3.5vw,48px); font-weight:800; margin-bottom:48px;">What We'll <span class="ca">Cover</span></h2>
  <div class="g3" style="gap:20px;">
    <div class="card" style="position:relative;">
      <div style="font-size:48px; font-weight:900; color:var(--accent); opacity:.3; position:absolute; top:16px; right:20px; line-height:1;">01</div>
      <div style="font-size:13px; color:var(--accent); font-weight:600; text-transform:uppercase; letter-spacing:.05em; margin-bottom:12px;">Part One</div>
      <div style="font-size:18px; font-weight:700;">Section Title</div>
      <div style="color:var(--muted); font-size:13px; margin-top:8px;">Brief description</div>
    </div>
    <div class="card" style="position:relative;">
      <div style="font-size:48px; font-weight:900; color:var(--accent2); opacity:.3; position:absolute; top:16px; right:20px; line-height:1;">02</div>
      <div style="font-size:13px; color:var(--accent2); font-weight:600; text-transform:uppercase; letter-spacing:.05em; margin-bottom:12px;">Part Two</div>
      <div style="font-size:18px; font-weight:700;">Section Title</div>
      <div style="color:var(--muted); font-size:13px; margin-top:8px;">Brief description</div>
    </div>
    <div class="card" style="position:relative;">
      <div style="font-size:48px; font-weight:900; color:var(--accent3); opacity:.3; position:absolute; top:16px; right:20px; line-height:1;">03</div>
      <div style="font-size:13px; color:var(--accent3); font-weight:600; text-transform:uppercase; letter-spacing:.05em; margin-bottom:12px;">Part Three</div>
      <div style="font-size:18px; font-weight:700;">Section Title</div>
      <div style="color:var(--muted); font-size:13px; margin-top:8px;">Brief description</div>
    </div>
  </div>
</section>
```

---

## Bullet Points / Key Points

```html
<section class="slide" id="s4" style="padding:64px 120px; display:flex; flex-direction:column; justify-content:center;">
  <h2 style="font-size:clamp(28px,3.5vw,48px); font-weight:800; margin-bottom:40px;">Key Insight: <span class="ca">The Pattern</span></h2>
  <div style="display:flex; flex-direction:column; gap:16px; max-width:900px;">
    <div class="card" style="display:flex; align-items:flex-start; gap:20px; padding:20px 24px;">
      <span style="width:32px; height:32px; border-radius:50%; background:var(--accent); display:flex; align-items:center; justify-content:center; font-weight:700; font-size:14px; flex-shrink:0;">1</span>
      <div>
        <div style="font-weight:600; font-size:16px; margin-bottom:4px;">First key point with <span class="ca">emphasis</span></div>
        <div style="color:var(--muted); font-size:14px; line-height:1.6;">Supporting detail that adds context without overwhelming.</div>
      </div>
    </div>
    <div class="card" style="display:flex; align-items:flex-start; gap:20px; padding:20px 24px;">
      <span style="width:32px; height:32px; border-radius:50%; background:var(--accent2); display:flex; align-items:center; justify-content:center; font-weight:700; font-size:14px; flex-shrink:0;">2</span>
      <div>
        <div style="font-weight:600; font-size:16px; margin-bottom:4px;">Second key point with <span class="cs">secondary accent</span></div>
        <div style="color:var(--muted); font-size:14px; line-height:1.6;">Supporting detail here.</div>
      </div>
    </div>
    <div class="card" style="display:flex; align-items:flex-start; gap:20px; padding:20px 24px;">
      <span style="width:32px; height:32px; border-radius:50%; background:var(--accent3); display:flex; align-items:center; justify-content:center; font-weight:700; font-size:14px; flex-shrink:0;">3</span>
      <div>
        <div style="font-weight:600; font-size:16px; margin-bottom:4px;">Third key point</div>
        <div style="color:var(--muted); font-size:14px; line-height:1.6;">Supporting detail here.</div>
      </div>
    </div>
  </div>
</section>
```

---

## Code Block / Demo

```html
<section class="slide" id="s5" style="padding:64px 120px; display:flex; flex-direction:column; justify-content:center;">
  <div style="display:grid; grid-template-columns:1fr 1fr; gap:32px; align-items:center;">
    <div>
      <span class="pill" style="margin-bottom:16px; display:inline-block;">Before</span>
      <h2 style="font-size:clamp(24px,3vw,40px); font-weight:800; margin-bottom:16px;">The Old <span style="color:var(--danger);">Way</span></h2>
      <p style="color:var(--muted); font-size:15px; line-height:1.7; margin-bottom:24px;">Description of the problem or old approach.</p>
      <pre class="codeblock" style="font-size:13px;"><code>// Verbose, error-prone approach
const result = await fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ key: value })
});
const data = await result.json();
// 7 lines for one request</code></pre>
    </div>
    <div>
      <span class="pill" style="margin-bottom:16px; display:inline-block; background:rgba(16,185,129,.15); color:var(--accent3); border-color:rgba(16,185,129,.3);">After</span>
      <h2 style="font-size:clamp(24px,3vw,40px); font-weight:800; margin-bottom:16px;">The New <span class="ca">Way</span></h2>
      <p style="color:var(--muted); font-size:15px; line-height:1.7; margin-bottom:24px;">Description of the improved approach.</p>
      <pre class="codeblock" style="font-size:13px; border-color:rgba(16,185,129,.3);"><code><span class="ca">// Clean, type-safe, one line</span>
const data = await api.post&lt;ResponseType&gt;(url, { key: value });
<span style="color:var(--accent3)">// ✓ Types inferred   ✓ Errors handled</span></code></pre>
    </div>
  </div>
</section>
```

---

## Architecture Diagram

```html
<section class="slide" id="s6" style="padding:64px 120px; display:flex; flex-direction:column; justify-content:center;">
  <h2 style="font-size:clamp(24px,3vw,40px); font-weight:800; margin-bottom:32px;">System <span class="ca">Architecture</span></h2>
  <div style="display:flex; flex-direction:column; gap:16px; max-width:900px; margin:0 auto; width:100%;">
    <!-- Layer 1: Client -->
    <div style="display:flex; gap:12px; align-items:center;">
      <div style="width:100px; text-align:right; font-size:12px; color:var(--muted); font-weight:500;">CLIENT</div>
      <div style="flex:1; display:flex; gap:12px;">
        <div class="card" style="flex:1; text-align:center; padding:16px; border-color:rgba(124,58,237,.4); background:rgba(124,58,237,.1);">
          <div style="font-size:13px; font-weight:600; color:var(--accent);">Web App</div>
        </div>
        <div class="card" style="flex:1; text-align:center; padding:16px; border-color:rgba(124,58,237,.4); background:rgba(124,58,237,.1);">
          <div style="font-size:13px; font-weight:600; color:var(--accent);">Mobile</div>
        </div>
      </div>
    </div>
    <!-- Arrow -->
    <div style="display:flex; gap:12px; align-items:center;">
      <div style="width:100px;"></div>
      <div style="flex:1; text-align:center; color:var(--dim); font-size:20px;">↕</div>
    </div>
    <!-- Layer 2: API -->
    <div style="display:flex; gap:12px; align-items:center;">
      <div style="width:100px; text-align:right; font-size:12px; color:var(--muted); font-weight:500;">API</div>
      <div style="flex:1;">
        <div class="card" style="text-align:center; padding:16px; border-color:rgba(6,182,212,.4); background:rgba(6,182,212,.1);">
          <div style="font-size:13px; font-weight:600; color:var(--accent2);">API Gateway + Auth</div>
        </div>
      </div>
    </div>
    <!-- Arrow -->
    <div style="display:flex; gap:12px; align-items:center;">
      <div style="width:100px;"></div>
      <div style="flex:1; text-align:center; color:var(--dim); font-size:20px;">↕</div>
    </div>
    <!-- Layer 3: Services -->
    <div style="display:flex; gap:12px; align-items:center;">
      <div style="width:100px; text-align:right; font-size:12px; color:var(--muted); font-weight:500;">SERVICES</div>
      <div style="flex:1; display:flex; gap:12px;">
        <div class="card" style="flex:1; text-align:center; padding:16px; border-color:rgba(16,185,129,.4); background:rgba(16,185,129,.1);">
          <div style="font-size:13px; font-weight:600; color:var(--accent3);">Service A</div>
        </div>
        <div class="card" style="flex:1; text-align:center; padding:16px; border-color:rgba(16,185,129,.4); background:rgba(16,185,129,.1);">
          <div style="font-size:13px; font-weight:600; color:var(--accent3);">Service B</div>
        </div>
        <div class="card" style="flex:1; text-align:center; padding:16px; border-color:rgba(16,185,129,.4); background:rgba(16,185,129,.1);">
          <div style="font-size:13px; font-weight:600; color:var(--accent3);">Service C</div>
        </div>
      </div>
    </div>
    <!-- Arrow -->
    <div style="display:flex; gap:12px; align-items:center;">
      <div style="width:100px;"></div>
      <div style="flex:1; text-align:center; color:var(--dim); font-size:20px;">↕</div>
    </div>
    <!-- Layer 4: Data -->
    <div style="display:flex; gap:12px; align-items:center;">
      <div style="width:100px; text-align:right; font-size:12px; color:var(--muted); font-weight:500;">DATA</div>
      <div style="flex:1; display:flex; gap:12px;">
        <div class="card" style="flex:1; text-align:center; padding:16px; border-color:rgba(245,158,11,.4); background:rgba(245,158,11,.1);">
          <div style="font-size:13px; font-weight:600; color:var(--accent4);">PostgreSQL</div>
        </div>
        <div class="card" style="flex:1; text-align:center; padding:16px; border-color:rgba(245,158,11,.4); background:rgba(245,158,11,.1);">
          <div style="font-size:13px; font-weight:600; color:var(--accent4);">Redis Cache</div>
        </div>
      </div>
    </div>
  </div>
</section>
```

---

## Data Table

```html
<section class="slide" id="s7" style="padding:64px 120px; display:flex; flex-direction:column; justify-content:center;">
  <h2 style="font-size:clamp(24px,3vw,40px); font-weight:800; margin-bottom:32px;">Performance <span class="ca">Comparison</span></h2>
  <div class="card" style="overflow:hidden; padding:0;">
    <table style="width:100%; border-collapse:collapse; font-size:15px;">
      <thead>
        <tr style="background:rgba(124,58,237,.2);">
          <th style="padding:16px 24px; text-align:left; font-weight:600; color:var(--accent); border-bottom:1px solid var(--border);">Approach</th>
          <th style="padding:16px 24px; text-align:right; font-weight:600; color:var(--accent); border-bottom:1px solid var(--border);">Latency</th>
          <th style="padding:16px 24px; text-align:right; font-weight:600; color:var(--accent); border-bottom:1px solid var(--border);">Throughput</th>
          <th style="padding:16px 24px; text-align:center; font-weight:600; color:var(--accent); border-bottom:1px solid var(--border);">Complexity</th>
        </tr>
      </thead>
      <tbody>
        <tr style="border-bottom:1px solid var(--border);">
          <td style="padding:14px 24px; font-weight:500;">Legacy polling</td>
          <td style="padding:14px 24px; text-align:right; color:var(--danger); font-family:var(--mono);">850ms</td>
          <td style="padding:14px 24px; text-align:right; font-family:var(--mono);">120 req/s</td>
          <td style="padding:14px 24px; text-align:center;"><span style="color:var(--danger);">●●●○○</span></td>
        </tr>
        <tr style="border-bottom:1px solid var(--border);">
          <td style="padding:14px 24px; font-weight:500;">WebSockets</td>
          <td style="padding:14px 24px; text-align:right; color:var(--accent4); font-family:var(--mono);">45ms</td>
          <td style="padding:14px 24px; text-align:right; font-family:var(--mono);">2,400 req/s</td>
          <td style="padding:14px 24px; text-align:center;"><span style="color:var(--accent4);">●●●●○</span></td>
        </tr>
        <tr style="background:rgba(16,185,129,.05);">
          <td style="padding:14px 24px; font-weight:700; color:var(--accent3);">Our approach ✓</td>
          <td style="padding:14px 24px; text-align:right; color:var(--accent3); font-family:var(--mono); font-weight:700;">8ms</td>
          <td style="padding:14px 24px; text-align:right; font-family:var(--mono); font-weight:700;">18,000 req/s</td>
          <td style="padding:14px 24px; text-align:center;"><span style="color:var(--accent3);">●●○○○</span></td>
        </tr>
      </tbody>
    </table>
  </div>
</section>
```

---

## Two-Column Comparison

```html
<section class="slide" id="s8" style="padding:64px 120px; display:flex; flex-direction:column; justify-content:center;">
  <h2 style="font-size:clamp(24px,3vw,40px); font-weight:800; margin-bottom:32px;">The <span style="color:var(--danger);">Old</span> vs The <span class="ca">New</span></h2>
  <div class="g2" style="gap:24px;">
    <div class="card" style="border-color:rgba(239,68,68,.3); background:rgba(239,68,68,.05);">
      <div style="font-size:13px; font-weight:600; color:var(--danger); text-transform:uppercase; letter-spacing:.1em; margin-bottom:20px;">❌ Old Approach</div>
      <ul style="list-style:none; display:flex; flex-direction:column; gap:12px;">
        <li style="display:flex; gap:12px; align-items:flex-start; color:var(--muted); font-size:15px;">
          <span style="color:var(--danger); flex-shrink:0; margin-top:2px;">✕</span> Problem point one with explanation
        </li>
        <li style="display:flex; gap:12px; align-items:flex-start; color:var(--muted); font-size:15px;">
          <span style="color:var(--danger); flex-shrink:0; margin-top:2px;">✕</span> Problem point two
        </li>
        <li style="display:flex; gap:12px; align-items:flex-start; color:var(--muted); font-size:15px;">
          <span style="color:var(--danger); flex-shrink:0; margin-top:2px;">✕</span> Problem point three
        </li>
      </ul>
    </div>
    <div class="card" style="border-color:rgba(16,185,129,.3); background:rgba(16,185,129,.05);">
      <div style="font-size:13px; font-weight:600; color:var(--accent3); text-transform:uppercase; letter-spacing:.1em; margin-bottom:20px;">✓ New Approach</div>
      <ul style="list-style:none; display:flex; flex-direction:column; gap:12px;">
        <li style="display:flex; gap:12px; align-items:flex-start; font-size:15px;">
          <span style="color:var(--accent3); flex-shrink:0; margin-top:2px;">✓</span> Solution point one with explanation
        </li>
        <li style="display:flex; gap:12px; align-items:flex-start; font-size:15px;">
          <span style="color:var(--accent3); flex-shrink:0; margin-top:2px;">✓</span> Solution point two
        </li>
        <li style="display:flex; gap:12px; align-items:flex-start; font-size:15px;">
          <span style="color:var(--accent3); flex-shrink:0; margin-top:2px;">✓</span> Solution point three
        </li>
      </ul>
    </div>
  </div>
</section>
```

---

## Flow / Step Sequence

```html
<section class="slide" id="s9" style="padding:64px 120px; display:flex; flex-direction:column; justify-content:center;">
  <h2 style="font-size:clamp(24px,3vw,40px); font-weight:800; margin-bottom:40px;">How It <span class="ca">Works</span></h2>
  <div class="flow" style="gap:0; align-items:stretch;">
    <div class="card" style="flex:1; text-align:center; padding:28px 20px;">
      <div style="width:48px; height:48px; border-radius:50%; background:linear-gradient(135deg,var(--accent),rgba(124,58,237,.5)); display:flex; align-items:center; justify-content:center; margin:0 auto 16px; font-size:20px;">📥</div>
      <div style="font-weight:700; font-size:15px; margin-bottom:8px;">Step 1</div>
      <div style="color:var(--muted); font-size:13px; line-height:1.5;">Description of what happens in this step</div>
    </div>
    <div style="display:flex; align-items:center; color:var(--dim); font-size:24px; padding:0 8px; flex-shrink:0;">→</div>
    <div class="card" style="flex:1; text-align:center; padding:28px 20px;">
      <div style="width:48px; height:48px; border-radius:50%; background:linear-gradient(135deg,var(--accent2),rgba(6,182,212,.5)); display:flex; align-items:center; justify-content:center; margin:0 auto 16px; font-size:20px;">⚙️</div>
      <div style="font-weight:700; font-size:15px; margin-bottom:8px;">Step 2</div>
      <div style="color:var(--muted); font-size:13px; line-height:1.5;">Description of what happens in this step</div>
    </div>
    <div style="display:flex; align-items:center; color:var(--dim); font-size:24px; padding:0 8px; flex-shrink:0;">→</div>
    <div class="card" style="flex:1; text-align:center; padding:28px 20px;">
      <div style="width:48px; height:48px; border-radius:50%; background:linear-gradient(135deg,var(--accent3),rgba(16,185,129,.5)); display:flex; align-items:center; justify-content:center; margin:0 auto 16px; font-size:20px;">📤</div>
      <div style="font-weight:700; font-size:15px; margin-bottom:8px;">Step 3</div>
      <div style="color:var(--muted); font-size:13px; line-height:1.5;">Description of what happens in this step</div>
    </div>
    <div style="display:flex; align-items:center; color:var(--dim); font-size:24px; padding:0 8px; flex-shrink:0;">→</div>
    <div class="card" style="flex:1; text-align:center; padding:28px 20px;">
      <div style="width:48px; height:48px; border-radius:50%; background:linear-gradient(135deg,var(--accent4),rgba(245,158,11,.5)); display:flex; align-items:center; justify-content:center; margin:0 auto 16px; font-size:20px;">✨</div>
      <div style="font-weight:700; font-size:15px; margin-bottom:8px;">Result</div>
      <div style="color:var(--muted); font-size:13px; line-height:1.5;">The outcome the user gets</div>
    </div>
  </div>
</section>
```

---

## SVG Radar / Spider Chart

```html
<section class="slide" id="s10" style="padding:64px 120px; display:flex; flex-direction:column; justify-content:center;">
  <div class="g2" style="gap:48px; align-items:center;">
    <div>
      <h2 style="font-size:clamp(24px,3vw,40px); font-weight:800; margin-bottom:16px;">Capability <span class="ca">Profile</span></h2>
      <p style="color:var(--muted); font-size:15px; line-height:1.7; margin-bottom:24px;">Our solution excels where others fall short.</p>
      <div style="display:flex; flex-direction:column; gap:10px;">
        <div style="display:flex; align-items:center; gap:12px; font-size:14px;">
          <span style="width:12px; height:12px; border-radius:50%; background:var(--accent); flex-shrink:0;"></span>Our Solution
        </div>
        <div style="display:flex; align-items:center; gap:12px; font-size:14px; color:var(--muted);">
          <span style="width:12px; height:12px; border-radius:50%; background:var(--dim); flex-shrink:0;"></span>Industry Average
        </div>
      </div>
    </div>
    <!-- Radar chart: 5 axes, centered at 200,200, radius 160 -->
    <svg width="400" height="400" viewBox="0 0 400 400" style="max-width:100%;">
      <!-- Grid circles -->
      <circle cx="200" cy="200" r="160" fill="none" stroke="var(--border)" stroke-width="1"/>
      <circle cx="200" cy="200" r="120" fill="none" stroke="var(--border)" stroke-width="1"/>
      <circle cx="200" cy="200" r="80" fill="none" stroke="var(--border)" stroke-width="1"/>
      <circle cx="200" cy="200" r="40" fill="none" stroke="var(--border)" stroke-width="1"/>
      <!-- Axes (5-pointed: 90°, 162°, 234°, 306°, 378°=18°) -->
      <line x1="200" y1="200" x2="200" y2="40" stroke="var(--dim)" stroke-width="1"/>
      <line x1="200" y1="200" x2="47.7" y2="110.8" stroke="var(--dim)" stroke-width="1"/>
      <line x1="200" y1="200" x2="113.6" y2="312.8" stroke="var(--dim)" stroke-width="1"/>
      <line x1="200" y1="200" x2="286.4" y2="312.8" stroke="var(--dim)" stroke-width="1"/>
      <line x1="200" y1="200" x2="352.3" y2="110.8" stroke="var(--dim)" stroke-width="1"/>
      <!-- Our data (values: 0.9, 0.75, 0.85, 0.95, 0.8) -->
      <polygon points="200,56 83.4,141.6 138.5,284.2 282.4,273.8 323.3,141.6"
        fill="rgba(124,58,237,.2)" stroke="var(--accent)" stroke-width="2"/>
      <!-- Average data (values: 0.5, 0.5, 0.5, 0.5, 0.5) -->
      <polygon points="200,120 123.8,159.6 151.5,247.1 248.5,247.1 276.2,159.6"
        fill="rgba(74,74,106,.15)" stroke="var(--dim)" stroke-width="1.5" stroke-dasharray="4"/>
      <!-- Labels -->
      <text x="200" y="28" text-anchor="middle" fill="var(--text)" font-size="13" font-family="var(--font)">Performance</text>
      <text x="35" y="108" text-anchor="end" fill="var(--text)" font-size="13" font-family="var(--font)">Reliability</text>
      <text x="100" y="330" text-anchor="middle" fill="var(--text)" font-size="13" font-family="var(--font)">Scalability</text>
      <text x="300" y="330" text-anchor="middle" fill="var(--text)" font-size="13" font-family="var(--font)">Security</text>
      <text x="365" y="108" text-anchor="start" fill="var(--text)" font-size="13" font-family="var(--font)">DX</text>
    </svg>
  </div>
</section>
```

---

## Quote / Big Stat

```html
<section class="slide" id="s11" style="
  display:flex; flex-direction:column; justify-content:center; align-items:center;
  padding:80px 120px; text-align:center;
  background: radial-gradient(ellipse at center, rgba(124,58,237,.12) 0%, transparent 70%), var(--bg);
">
  <div style="font-size:80px; line-height:1; font-weight:900; color:var(--accent); opacity:.3; font-family:Georgia,serif; margin-bottom:-16px;">"</div>
  <blockquote style="font-size:clamp(22px,3vw,38px); font-weight:600; line-height:1.4; max-width:800px; font-style:italic; color:var(--text); margin-bottom:32px;">
    The best code is the code you never had to write because the system handled it.
  </blockquote>
  <div style="color:var(--muted); font-size:16px;">— Memorable Attribution, Role</div>
</section>
```

---

## Staircase / Progression

```html
<section class="slide" id="s12" style="padding:64px 120px; display:flex; flex-direction:column; justify-content:center;">
  <h2 style="font-size:clamp(24px,3vw,40px); font-weight:800; margin-bottom:40px;">The <span class="ca">Journey</span></h2>
  <div style="position:relative; padding-left:40px;">
    <div style="position:absolute; left:20px; top:0; bottom:0; width:2px; background:linear-gradient(to bottom, var(--accent), var(--accent3));"></div>
    <div style="display:flex; flex-direction:column; gap:24px;">
      <div style="display:flex; align-items:flex-start; gap:24px;">
        <div style="width:40px; height:40px; border-radius:50%; background:var(--accent); display:flex; align-items:center; justify-content:center; font-weight:700; font-size:14px; flex-shrink:0; margin-left:-20px; border:3px solid var(--bg);">1</div>
        <div class="card" style="flex:1; padding:20px 24px;">
          <div style="font-weight:700; font-size:16px; margin-bottom:4px;">Phase One: <span class="ca">Foundation</span></div>
          <div style="color:var(--muted); font-size:14px;">Description of this phase and what it involves.</div>
        </div>
      </div>
      <div style="display:flex; align-items:flex-start; gap:24px;">
        <div style="width:40px; height:40px; border-radius:50%; background:var(--accent2); display:flex; align-items:center; justify-content:center; font-weight:700; font-size:14px; flex-shrink:0; margin-left:-20px; border:3px solid var(--bg);">2</div>
        <div class="card" style="flex:1; padding:20px 24px;">
          <div style="font-weight:700; font-size:16px; margin-bottom:4px;">Phase Two: <span class="cs">Growth</span></div>
          <div style="color:var(--muted); font-size:14px;">Description of this phase and what it involves.</div>
        </div>
      </div>
      <div style="display:flex; align-items:flex-start; gap:24px;">
        <div style="width:40px; height:40px; border-radius:50%; background:var(--accent3); display:flex; align-items:center; justify-content:center; font-weight:700; font-size:14px; flex-shrink:0; margin-left:-20px; border:3px solid var(--bg);">3</div>
        <div class="card" style="flex:1; padding:20px 24px; border-color:rgba(16,185,129,.3);">
          <div style="font-weight:700; font-size:16px; margin-bottom:4px;">Phase Three: <span style="color:var(--accent3);">Scale</span></div>
          <div style="color:var(--muted); font-size:14px;">Description of this phase and what it involves.</div>
        </div>
      </div>
    </div>
  </div>
</section>
```

---

## Thank You / Q&A

```html
<section class="slide" id="sN" style="
  display:flex; flex-direction:column; justify-content:center; align-items:center;
  padding:80px; text-align:center;
  background: radial-gradient(ellipse at 40% 60%, rgba(124,58,237,.2) 0%, transparent 60%),
              radial-gradient(ellipse at 70% 30%, rgba(6,182,212,.1) 0%, transparent 50%), var(--bg);
">
  <div style="margin-bottom:32px;">
    <div style="font-size:64px; font-weight:900; line-height:1; background:linear-gradient(135deg,var(--accent),var(--accent2)); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; margin-bottom:8px;">Thank You</div>
    <div style="font-size:22px; color:var(--muted); margin-bottom:40px;">Questions?</div>
  </div>
  <div class="g3" style="gap:16px; max-width:700px; width:100%;">
    <div class="card" style="padding:20px; text-align:center;">
      <div style="font-size:20px; margin-bottom:8px;">🌐</div>
      <div style="font-size:12px; color:var(--muted); margin-bottom:4px;">Website</div>
      <div style="font-size:14px; font-weight:600; color:var(--accent);">yoursite.com</div>
    </div>
    <div class="card" style="padding:20px; text-align:center;">
      <div style="font-size:20px; margin-bottom:8px;">𝕏</div>
      <div style="font-size:12px; color:var(--muted); margin-bottom:4px;">Twitter/X</div>
      <div style="font-size:14px; font-weight:600; color:var(--accent);">@yourhandle</div>
    </div>
    <div class="card" style="padding:20px; text-align:center;">
      <div style="font-size:20px; margin-bottom:8px;">💬</div>
      <div style="font-size:12px; color:var(--muted); margin-bottom:4px;">Email</div>
      <div style="font-size:14px; font-weight:600; color:var(--accent);">you@email.com</div>
    </div>
  </div>
  <!-- Staircase decoration -->
  <svg style="position:absolute;bottom:40px;right:80px;opacity:.06;" width="200" height="120" viewBox="0 0 200 120">
    <rect x="0" y="90" width="40" height="30" fill="var(--accent)"/>
    <rect x="40" y="60" width="40" height="60" fill="var(--accent2)"/>
    <rect x="80" y="30" width="40" height="90" fill="var(--accent3)"/>
    <rect x="120" y="0" width="40" height="120" fill="var(--accent4)"/>
  </svg>
</section>
```
