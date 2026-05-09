---
name: scrapling
description: Web scraping with anti-bot bypass (Cloudflare Turnstile etc.), stealth headless browsing, adaptive selectors, and concurrent crawls. Use when the user asks to scrape, crawl, or extract data from websites; the built-in WebFetch fails; the target has anti-bot protections; or the work needs JavaScript rendering. Prefers the registered MCP tools (mcp__scrapling__*) over raw Python so token cost stays low.
layer: domain
category: data
triggers:
  - "scrape"
  - "scraping"
  - "crawl"
  - "crawler"
  - "spider"
  - "web data"
  - "extract from website"
  - "extract from url"
  - "anti-bot"
  - "cloudflare"
  - "turnstile"
  - "datadome"
  - "stealth fetch"
  - "headless browser"
  - "playwright scrape"
  - "scrape javascript"
  - "scrape spa"
  - "scrapling"
inputs:
  - Target URL(s) and what to extract
  - Whether the site has anti-bot protection (check first; default = no)
  - Whether the page is static HTML or dynamic (SPA / heavy JS)
  - Any auth, proxy, or session requirements
outputs:
  - Either: structured data extracted via MCP tools (preferred — cheaper)
  - Or: a small Python script using `scrapling.fetchers` / `scrapling.spiders`
linksTo:
  - vfs
  - code-intel
  - memory
---

# Scrapling — adaptive web scraping

[Scrapling](https://github.com/D4Vinci/Scrapling) is the active path for any task involving fetching content from the live web. Unlike Claude Code's built-in `WebFetch`, it:

- Renders JavaScript via Playwright (Chromium / real Chrome).
- Bypasses Cloudflare Turnstile / Interstitial out of the box (`stealthy_fetch`).
- Supports CSS / XPath / regex / similarity-based selectors.
- Persists sessions for multi-page flows (login → navigate → extract).
- Crawls at scale with the Scrapy-compatible spider framework.

## Decision tree — which Scrapling tool

```
Is the page static HTML / no bot protection?
├─ yes  →  mcp__scrapling__get  (HTTP-only, fastest)
└─ no
   ├─ Just JS, no anti-bot   →  mcp__scrapling__fetch   (browser-rendered)
   └─ Anti-bot protections   →  mcp__scrapling__stealthy_fetch  (full stealth)

Multiple URLs at once?              →  mcp__scrapling__bulk_get / bulk_fetch / bulk_stealthy_fetch
Page state matters across calls?    →  mcp__scrapling__open_session  →  reuse `session_id` on subsequent calls  →  close_session
Need a screenshot for the agent?    →  mcp__scrapling__screenshot
```

## Default arguments — keep token cost down

Pass these on every call unless the user says otherwise:

- `extraction_type: "markdown"` — markdown is ~30-50% fewer tokens than HTML
- `main_content_only: true` — strips nav, footer, sidebar
- `css_selector: "<minimal>"` — narrow further when the page is huge
- `disable_resources: true` (browser modes) — blocks fonts/images/media for speed

> **Important:** for command-line `scrapling` invocations (when MCP isn't available), always pass `--ai-targeted`. It enables ad blocking + sanitises hidden content to defend against prompt injection from the scraped page.

## Quick patterns (MCP-first)

**Static page → markdown of an article body**
```
mcp__scrapling__get(
  url="https://example.com/article",
  extraction_type="markdown",
  main_content_only=true,
  css_selector="article"
)
```

**SPA, no bot protection**
```
mcp__scrapling__fetch(
  url="https://app.example.com/dashboard",
  network_idle=true,
  wait_selector=".loaded",
  disable_resources=true
)
```

**Cloudflare-protected site**
```
mcp__scrapling__stealthy_fetch(
  url="https://protected.example.com",
  network_idle=true,
  google_search=true
)
```

**Multi-page flow with login (persistent session)**
```
sid = mcp__scrapling__open_session(stealth=true)
mcp__scrapling__stealthy_fetch(url="…/login", session_id=sid, ...)  # auto-includes cookies after
mcp__scrapling__stealthy_fetch(url="…/protected-data", session_id=sid)
mcp__scrapling__close_session(session_id=sid)
```

## When MCP isn't enough — fall back to Python

Code is the only way to use spiders, custom adaptive selectors with `auto_save`, or per-domain throttling. Scaffold:

```python
from scrapling.fetchers import StealthyFetcher
StealthyFetcher.adaptive = True
p = StealthyFetcher.fetch("https://example.com", headless=True, network_idle=True)
items = p.css(".product", auto_save=True)             # first run
# later, if site structure changes:
items = p.css(".product", adaptive=True)              # finds the renamed elements
```

Spider for full crawls:

```python
from scrapling.spiders import Spider, Response

class Demo(Spider):
    name = "demo"
    start_urls = ["https://example.com/listing"]
    async def parse(self, response: Response):
        for item in response.css(".product"):
            yield {"title": item.css("h2::text").get(),
                   "price": item.css(".price::text").get()}

Demo().start()
```

Pause/resume: hit Ctrl+C → relaunch picks up from the checkpoint.

## Setup (once per machine)

```bash
pip install "scrapling[all]>=0.4.7"
scrapling install --force   # downloads Playwright browser dependencies
```

Then verify the MCP server is registered: in `~/.mcp.json` or the project's `.mcp.json`, the `scrapling` entry runs `scrapling mcp` over stdio. Tools appear as `mcp__scrapling__*` in the tool surface.

## Pitfalls

- **WebFetch first?** No — UltraThink already prefers Scrapling for any non-trivial scrape. WebFetch is fine for plain markdown of a known-good docs page; for everything else, Scrapling is cheaper (token-wise) and won't fail on JS.
- **Don't reach for `requests` / `httpx`** in user code — Scrapling's `Fetcher` impersonates browser TLS + headers, while `requests` gets fingerprinted and blocked.
- **Don't paste credentials into prompts.** Pass them as `proxy_auth` / `auth` dict on the MCP call; the values aren't echoed back.
- **Adaptive selectors are not free** — `auto_save=True` writes a fingerprint sidecar file; `adaptive=True` recomputes against it. Only use when you're crawling the same site repeatedly.

## References

- Docs: https://scrapling.readthedocs.io/
- MCP server: https://scrapling.readthedocs.io/en/latest/ai/mcp-server.html
- Source: https://github.com/D4Vinci/Scrapling
- License: BSD-3-Clause
