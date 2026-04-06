---
name: dns
description: DNS record management, propagation debugging, Cloudflare DNS configuration, SSL/TLS setup, domain migration, and email authentication records (SPF, DKIM, DMARC)
layer: domain
category: devops
triggers:
  - "dns"
  - "dns records"
  - "domain setup"
  - "cloudflare dns"
  - "ssl certificate"
  - "tls setup"
  - "dns propagation"
  - "SPF record"
  - "DKIM"
  - "DMARC"
  - "domain migration"
  - "nameserver"
inputs:
  - Domain name(s) to configure
  - DNS provider (Cloudflare, Route 53, Vercel, etc.)
  - Hosting provider and IP addresses or CNAME targets
  - Email provider (for SPF/DKIM/DMARC)
  - SSL/TLS requirements
outputs:
  - Complete DNS zone configuration
  - SSL/TLS certificate setup instructions
  - Email authentication records (SPF, DKIM, DMARC)
  - Migration plan with TTL management
  - Propagation verification commands
linksTo:
  - cloudflare
  - vercel
  - aws
  - nginx
linkedFrom:
  - ship
  - cloudflare
  - cicd
preferredNextSkills:
  - cloudflare
  - nginx
  - monitoring
fallbackSkills:
  - linux-admin
  - debug
riskLevel: medium
memoryReadPolicy: selective
memoryWritePolicy: none
sideEffects: []
---

# DNS & SSL/TLS Skill

## Purpose

DNS is the foundation of every web application's reachability. Misconfigured DNS causes downtime, email deliverability failures, and SSL errors that are notoriously difficult to debug. This skill covers record types, Cloudflare DNS setup, SSL/TLS certificate management, email authentication (SPF/DKIM/DMARC), domain migrations, and propagation troubleshooting.

## Key Concepts

### DNS Record Types

| Type | Purpose | Example Value | When to Use |
|------|---------|---------------|-------------|
| **A** | Maps domain to IPv4 | `93.184.216.34` | Pointing to a server with a static IP |
| **AAAA** | Maps domain to IPv6 | `2606:2800:220:1:...` | IPv6-enabled servers |
| **CNAME** | Alias to another domain | `app.vercel.app` | Pointing subdomains to hosting providers |
| **MX** | Mail server routing | `10 mx1.emailprovider.com` | Email delivery configuration |
| **TXT** | Arbitrary text data | `v=spf1 include:...` | Domain verification, SPF, DKIM, DMARC |
| **NS** | Nameserver delegation | `ns1.cloudflare.com` | Delegating DNS to a provider |
| **CAA** | Certificate authority authorization | `0 issue "letsencrypt.org"` | Restricting which CAs can issue certs |
| **SRV** | Service location | `10 5 5060 sip.example.com` | Service discovery (rare in web apps) |

### Important Rules

- **CNAME cannot coexist** with other records at the same name (the "CNAME at apex" problem). Use ALIAS/ANAME or Cloudflare's CNAME flattening for root domains.
- **TTL (Time to Live)** controls how long resolvers cache a record. Lower TTL = faster propagation but more DNS queries.
- **Propagation is not instant** — it depends on the old TTL. If TTL was 86400 (24h), changes can take up to 24 hours.

## Workflow

### Step 1: Configure DNS Records

#### Vercel Deployment (Typical Setup)

```
# Root domain (@ or example.com)
Type: A
Name: @
Value: 76.76.21.21
TTL: Auto (or 300)

# www subdomain
Type: CNAME
Name: www
Value: cname.vercel-dns.com
TTL: Auto

# API subdomain (if separate)
Type: CNAME
Name: api
Value: cname.vercel-dns.com
TTL: Auto
```

#### Cloudflare with Proxy (Orange Cloud)

```
# Root domain — Cloudflare proxied (orange cloud)
Type: A
Name: @
Value: <origin server IP>
Proxy: Proxied (orange cloud)
TTL: Auto

# www — CNAME to root, proxied
Type: CNAME
Name: www
Value: example.com
Proxy: Proxied

# API — DNS only (gray cloud) if origin handles TLS
Type: A
Name: api
Value: <api server IP>
Proxy: DNS only (gray cloud)
```

#### Cloudflare API (Terraform or Script)

```bash
# Create a DNS record via Cloudflare API
curl -X POST "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records" \
  -H "Authorization: Bearer ${CF_API_TOKEN}" \
  -H "Content-Type: application/json" \
  --data '{
    "type": "CNAME",
    "name": "app",
    "content": "cname.vercel-dns.com",
    "ttl": 1,
    "proxied": false
  }'
```

```hcl
# Terraform — Cloudflare DNS
resource "cloudflare_record" "app" {
  zone_id = var.cloudflare_zone_id
  name    = "app"
  content = "cname.vercel-dns.com"
  type    = "CNAME"
  ttl     = 1      # Auto when proxied
  proxied = false
}

resource "cloudflare_record" "root" {
  zone_id = var.cloudflare_zone_id
  name    = "@"
  content = "76.76.21.21"
  type    = "A"
  proxied = true
}
```

### Step 2: SSL/TLS Configuration

#### Cloudflare SSL Modes

```
Off             → No encryption (NEVER use this)
Flexible        → HTTPS client↔Cloudflare, HTTP Cloudflare↔origin (insecure!)
Full            → HTTPS everywhere, but origin cert not validated
Full (Strict)   → HTTPS everywhere, origin cert must be valid ← USE THIS
```

#### Cloudflare Origin Certificate

```bash
# Generate an origin certificate via Cloudflare dashboard or API
# Valid for up to 15 years, free, trusted ONLY by Cloudflare

# On origin server (nginx):
ssl_certificate     /etc/ssl/cloudflare-origin.pem;
ssl_certificate_key /etc/ssl/cloudflare-origin-key.pem;
```

#### Let's Encrypt with Certbot (Non-Cloudflare)

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate (nginx plugin auto-configures)
sudo certbot --nginx -d example.com -d www.example.com

# Auto-renewal (certbot installs a systemd timer by default)
sudo certbot renew --dry-run

# Manual DNS challenge (for wildcard certs)
sudo certbot certonly --manual --preferred-challenges dns \
  -d "*.example.com" -d "example.com"
# Requires adding a TXT record: _acme-challenge.example.com
```

#### CAA Records (Restrict Certificate Issuance)

```
# Only allow Let's Encrypt and Cloudflare to issue certificates
Type: CAA
Name: @
Value: 0 issue "letsencrypt.org"

Type: CAA
Name: @
Value: 0 issue "comodoca.com"    # Used by Cloudflare Universal SSL

Type: CAA
Name: @
Value: 0 issuewild "letsencrypt.org"

# Report unauthorized issuance attempts
Type: CAA
Name: @
Value: 0 iodef "mailto:security@example.com"
```

### Step 3: Email Authentication Records

#### SPF (Sender Policy Framework)

```
# Allow Google Workspace and Resend to send email on your behalf
Type: TXT
Name: @
Value: v=spf1 include:_spf.google.com include:amazonses.com ~all

# Breakdown:
#   v=spf1           — SPF version
#   include:...      — Authorize these senders
#   ~all             — Soft fail others (use -all for hard fail after testing)
```

#### DKIM (DomainKeys Identified Mail)

```
# Provider gives you a CNAME or TXT record
# Example for Resend:
Type: CNAME
Name: resend._domainkey
Value: resend._domainkey.resend.dev

# Example for Google Workspace:
Type: TXT
Name: google._domainkey
Value: v=DKIM1; k=rsa; p=MIIBIjANBgkq... (public key from admin console)
```

#### DMARC (Domain-based Message Authentication)

```
# Start with monitoring mode (p=none), then tighten
Type: TXT
Name: _dmarc
Value: v=DMARC1; p=none; rua=mailto:dmarc@example.com; ruf=mailto:dmarc@example.com; pct=100

# After confirming legitimate mail passes:
Value: v=DMARC1; p=quarantine; rua=mailto:dmarc@example.com; pct=100

# After full confidence:
Value: v=DMARC1; p=reject; rua=mailto:dmarc@example.com; pct=100
```

### Step 4: Domain Migration (Zero-Downtime)

```
Migration Timeline:

Day -7: Lower TTL on ALL records being changed
  Old TTL: 86400 (24h) → New TTL: 300 (5 min)

Day -1: Verify low TTL has propagated
  $ dig example.com +short | head -1
  # Confirm TTL is 300 in responses

Day 0: Update DNS records to new values
  - Change A/CNAME records to new hosting provider
  - Monitor for errors in both old and new infrastructure

Day 0 + 1h: Verify propagation across regions
  $ dig @8.8.8.8 example.com         # Google DNS
  $ dig @1.1.1.1 example.com         # Cloudflare DNS
  $ dig @208.67.222.222 example.com  # OpenDNS

Day +3: Old infrastructure can be decommissioned

Day +7: Raise TTL back to production values
  New TTL: 3600 (1h) or 86400 (24h)
```

### Step 5: Debugging DNS Issues

```bash
# Check current DNS resolution
dig example.com A +short
dig example.com AAAA +short
dig example.com MX +short
dig example.com TXT +short
dig _dmarc.example.com TXT +short

# Check specific nameserver
dig @ns1.cloudflare.com example.com A

# Full trace (follow delegation chain)
dig example.com +trace

# Check all record types
dig example.com ANY +noall +answer

# Check TTL remaining
dig example.com A | grep -E "^example" | awk '{print $2}'

# Verify CNAME chain
dig www.example.com CNAME +short
# Should return: cname.vercel-dns.com (or similar)

# Check SSL certificate
openssl s_client -connect example.com:443 -servername example.com < /dev/null 2>/dev/null | \
  openssl x509 -noout -dates -subject -issuer

# Check certificate chain
curl -vI https://example.com 2>&1 | grep -E "subject:|issuer:|expire"

# Online propagation checker
# https://www.whatsmydns.net/#A/example.com
```

#### Common DNS Debug Patterns

```bash
# "DNS_PROBE_FINISHED_NXDOMAIN" → Domain does not resolve at all
dig example.com NS +short
# If empty: nameservers not delegated. Check registrar NS records.

# "ERR_SSL_VERSION_OR_CIPHER_MISMATCH" → SSL mode conflict
# Cloudflare Flexible SSL + origin expecting HTTPS = redirect loop
# Fix: Set Cloudflare SSL to "Full (Strict)" and install origin cert

# "Too many redirects" → HTTP↔HTTPS redirect loop
# Cloudflare "Always Use HTTPS" + origin 301 to HTTPS = infinite loop
# Fix: Set Cloudflare SSL to "Full (Strict)", remove origin HTTP→HTTPS redirect
```

## Best Practices

1. **Always use Full (Strict) SSL** on Cloudflare — "Flexible" mode means traffic between Cloudflare and your origin is unencrypted.
2. **Lower TTL before migrations** — Drop to 300s at least 48 hours before changing records, so old caches expire before the switch.
3. **Set CAA records** — Prevent unauthorized certificate issuance by restricting which CAs can issue for your domain.
4. **Deploy DMARC in stages** — Start with `p=none` to monitor, then `p=quarantine`, then `p=reject` once you confirm no legitimate mail is failing.
5. **Use CNAME for subdomains, A for apex** — CNAMEs are more flexible (they follow the target if the IP changes), but cannot be used at the zone apex without provider support.
6. **Add both IPv4 and IPv6** — Modern clients prefer AAAA records. Dual-stack avoids connectivity issues.
7. **Document your DNS zone** — Keep a table of all records and their purpose. DNS changes without context cause debugging nightmares months later.
8. **Test email authentication** — Use `mail-tester.com` or `mxtoolbox.com` to verify SPF, DKIM, and DMARC pass before relying on them.

## Common Pitfalls

| Pitfall | Symptom | Fix |
|---------|---------|-----|
| **CNAME at zone apex** | Registrar rejects the record or resolution fails | Use A record pointing to IP, or use Cloudflare/Route53 ALIAS/ANAME flattening |
| **Cloudflare Flexible SSL** | Infinite redirect loop or mixed content | Switch to Full (Strict) and install an origin certificate |
| **High TTL during migration** | Users stuck on old IP for hours/days | Lower TTL to 300s at least 48 hours before migration |
| **Missing SPF record** | Emails land in spam or get rejected | Add `v=spf1 include:<provider> ~all` TXT record |
| **SPF too many lookups** | SPF validation fails (max 10 DNS lookups) | Consolidate includes; use `ip4:`/`ip6:` for known IPs instead of `include:` |
| **Proxying non-HTTP through Cloudflare** | SSH, database connections fail | Set DNS-only (gray cloud) for non-HTTP services |
| **Wildcard cert without DNS challenge** | Certbot HTTP challenge fails for `*.example.com` | Use `--preferred-challenges dns` with certbot for wildcard certificates |
| **Forgot to update nameservers at registrar** | All DNS changes at new provider are ignored | Update NS records at the registrar to point to the new DNS provider's nameservers |
