#!/usr/bin/env bash
# intent: one-shot SEO audit — Web Vitals + structured data + meta sanity
# status: done (PageSpeed + structured-data API + grep-based head check)
# next: integrate axe-core for a11y, lighthouse-ci for trend tracking
# usage: scripts/audit.sh https://example.com [--mobile|--desktop]

set -euo pipefail

URL="${1:-}"
STRATEGY="${2:-mobile}"
STRATEGY="${STRATEGY//--/}"

if [[ -z "$URL" ]]; then
  echo "Usage: $0 <url> [--mobile|--desktop]" >&2
  exit 2
fi

bold(){ printf "\033[1m%s\033[0m\n" "$1"; }
ok(){   printf "  \033[32m✓\033[0m %s\n" "$1"; }
warn(){ printf "  \033[33m⚠\033[0m %s\n" "$1"; }
fail(){ printf "  \033[31m✗\033[0m %s\n" "$1"; }
dim(){  printf "  \033[2m%s\033[0m\n" "$1"; }

bold "── SEO audit: $URL"
dim "strategy: $STRATEGY"
echo

# 1. PageSpeed Insights — Core Web Vitals
bold "Core Web Vitals (PageSpeed Insights)"
PSI_KEY="${PAGESPEED_API_KEY:-}"
PSI_URL="https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=$(printf '%s' "$URL" | jq -sRr @uri)&strategy=$STRATEGY${PSI_KEY:+&key=$PSI_KEY}"
PSI_JSON="$(curl -fsS --max-time 30 "$PSI_URL" 2>/dev/null || echo '{}')"

if [[ "$PSI_JSON" != "{}" ]]; then
  LCP_S=$(echo "$PSI_JSON" | jq -r '.lighthouseResult.audits."largest-contentful-paint".numericValue / 1000 // empty')
  CLS=$(echo   "$PSI_JSON" | jq -r '.lighthouseResult.audits."cumulative-layout-shift".numericValue // empty')
  TBT=$(echo   "$PSI_JSON" | jq -r '.lighthouseResult.audits."total-blocking-time".numericValue // empty')
  PERF_SCORE=$(echo "$PSI_JSON" | jq -r '.lighthouseResult.categories.performance.score * 100 // empty')

  [[ -n "$LCP_S" ]] && {
    LCP_FMT=$(printf '%.2fs' "$LCP_S")
    awk_check=$(awk -v v="$LCP_S" 'BEGIN{ if (v<=2.5) print "ok"; else if (v<=4) print "warn"; else print "fail" }')
    case "$awk_check" in ok) ok "LCP $LCP_FMT" ;; warn) warn "LCP $LCP_FMT (target ≤2.5s)" ;; fail) fail "LCP $LCP_FMT (poor)" ;; esac
  }
  [[ -n "$CLS" ]] && {
    awk_check=$(awk -v v="$CLS" 'BEGIN{ if (v<=0.1) print "ok"; else if (v<=0.25) print "warn"; else print "fail" }')
    case "$awk_check" in ok) ok "CLS $CLS" ;; warn) warn "CLS $CLS (target ≤0.1)" ;; fail) fail "CLS $CLS (poor)" ;; esac
  }
  [[ -n "$TBT" ]] && dim "TBT ${TBT}ms (proxy for INP — install web-vitals JS for field data)"
  [[ -n "$PERF_SCORE" ]] && dim "Lighthouse perf: $PERF_SCORE/100"
else
  warn "PageSpeed API unreachable — set PAGESPEED_API_KEY for higher quota"
fi
echo

# 2. Page meta + head sanity
bold "Head sanity"
HTML="$(curl -fsSL --max-time 15 -A "Mozilla/5.0 SEO-audit/1.0" "$URL" 2>/dev/null || echo "")"
if [[ -z "$HTML" ]]; then
  fail "Couldn't fetch the page"
  exit 1
fi

grep -qi '<title' <<<"$HTML" && ok "<title> present" || fail "<title> missing"
grep -qi 'name="description"' <<<"$HTML" && ok 'meta description present' || fail "meta description missing"
grep -qi 'rel="canonical"' <<<"$HTML" && ok "canonical link present" || warn "canonical link missing — add to prevent duplicate-content drag"
grep -qi 'property="og:title"' <<<"$HTML" && ok "og:title present" || warn "og:title missing"
grep -qi 'property="og:image"' <<<"$HTML" && ok "og:image present" || warn "og:image missing — bad social shares"
grep -qi 'name="viewport"' <<<"$HTML" && ok "viewport meta present" || fail "viewport meta missing — mobile rendering breaks"
grep -qi '<script[^>]*application/ld\+json' <<<"$HTML" && ok "JSON-LD block present" || warn "no JSON-LD — no rich snippets"
echo

# 3. Structured-data validation (Google's testing API is hard to call un-keyed; use schema.org instead)
bold "Structured data (next steps)"
dim "Run https://search.google.com/test/rich-results?url=$URL to validate visible rich-result types"
dim "Run https://validator.schema.org/?url=$URL for structural validity"
echo

# 4. Robots / sitemap
bold "Indexing surfaces"
HOST="$(printf '%s' "$URL" | sed -E 's#^(https?://[^/]+).*#\1#')"
ROBOTS="$(curl -fsSL --max-time 5 "$HOST/robots.txt" 2>/dev/null || echo "")"
SITEMAP_LINE="$(grep -i '^Sitemap:' <<<"$ROBOTS" | head -1)"
if [[ -n "$SITEMAP_LINE" ]]; then
  ok "robots.txt references sitemap: $SITEMAP_LINE"
else
  warn "robots.txt has no Sitemap: line"
fi
SM="$(curl -fsSL --max-time 5 "$HOST/sitemap.xml" 2>/dev/null | head -c 256 || echo "")"
if [[ "$SM" == *"<urlset"* || "$SM" == *"<sitemapindex"* ]]; then
  ok "sitemap.xml looks valid at $HOST/sitemap.xml"
else
  warn "no sitemap.xml at default location"
fi
echo

bold "Done."
