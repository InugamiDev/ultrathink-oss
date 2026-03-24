---
name: nginx
description: Nginx configuration, reverse proxy, load balancing, SSL/TLS, caching, rate limiting, and security hardening
layer: domain
category: devops
triggers:
  - "nginx"
  - "reverse proxy"
  - "load balancer"
  - "nginx config"
  - "proxy pass"
  - "ssl termination"
inputs: [upstream services, domain names, SSL requirements, caching needs]
outputs: [nginx.conf files, server blocks, upstream configs, SSL configs]
linksTo: [docker, kubernetes, monitoring, linux-admin, cloudflare]
linkedFrom: [ship, optimize, infrastructure]
preferredNextSkills: [monitoring, docker, linux-admin]
fallbackSkills: [cloudflare, vercel]
riskLevel: medium
memoryReadPolicy: selective
memoryWritePolicy: none
sideEffects: [service restarts, configuration reloads]
---

# Nginx Specialist

## Purpose

Configure Nginx for reverse proxying, load balancing, SSL termination, caching, rate limiting, and security hardening. This skill covers both traditional server deployments and container-based Nginx configurations.

## Key Patterns

### Production Reverse Proxy

```nginx
# /etc/nginx/nginx.conf
user nginx;
worker_processes auto;
worker_rlimit_nofile 65535;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 4096;
    multi_accept on;
    use epoll;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # Logging
    log_format json escape=json '{'
        '"time":"$time_iso8601",'
        '"remote_addr":"$remote_addr",'
        '"method":"$request_method",'
        '"uri":"$request_uri",'
        '"status":$status,'
        '"body_bytes_sent":$body_bytes_sent,'
        '"request_time":$request_time,'
        '"upstream_response_time":"$upstream_response_time",'
        '"user_agent":"$http_user_agent"'
    '}';
    access_log /var/log/nginx/access.log json;

    # Performance
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    keepalive_requests 1000;
    types_hash_max_size 2048;

    # Gzip
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 5;
    gzip_types
        text/plain
        text/css
        application/json
        application/javascript
        text/xml
        application/xml
        image/svg+xml;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Hide Nginx version
    server_tokens off;

    # Rate limiting zones
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=login:10m rate=1r/s;
    limit_conn_zone $binary_remote_addr zone=conn_per_ip:10m;

    include /etc/nginx/conf.d/*.conf;
}
```

### Server Block with SSL

```nginx
# /etc/nginx/conf.d/app.conf
upstream app_backend {
    least_conn;
    server app1:3000 weight=3;
    server app2:3000 weight=3;
    server app3:3000 weight=3 backup;
    keepalive 32;
}

server {
    listen 80;
    server_name app.example.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name app.example.com;

    # SSL
    ssl_certificate /etc/letsencrypt/live/app.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/app.example.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;
    ssl_session_tickets off;

    # HSTS
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;

    # Body size
    client_max_body_size 10m;

    # Static assets with long cache
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2|woff|ttf)$ {
        proxy_pass http://app_backend;
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # API with rate limiting
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        limit_conn conn_per_ip 50;

        proxy_pass http://app_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Connection "";

        proxy_connect_timeout 5s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
    }

    # Login with strict rate limiting
    location /api/auth/login {
        limit_req zone=login burst=3 nodelay;
        proxy_pass http://app_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Default proxy
    location / {
        proxy_pass http://app_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # Health check endpoint (no logging)
    location /health {
        access_log off;
        proxy_pass http://app_backend;
    }

    # Deny hidden files
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }
}
```

### WebSocket Proxy

```nginx
map $http_upgrade $connection_upgrade {
    default upgrade;
    '' close;
}

server {
    location /ws/ {
        proxy_pass http://websocket_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        proxy_set_header Host $host;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
    }
}
```

### Proxy Cache Configuration

```nginx
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=app_cache:10m
    max_size=1g inactive=60m use_temp_path=off;

server {
    location /api/public/ {
        proxy_cache app_cache;
        proxy_cache_valid 200 10m;
        proxy_cache_valid 404 1m;
        proxy_cache_use_stale error timeout updating http_500 http_502 http_503;
        proxy_cache_lock on;
        proxy_cache_background_update on;
        add_header X-Cache-Status $upstream_cache_status;

        proxy_pass http://app_backend;
    }
}
```

## Best Practices

### Performance
- Use `worker_processes auto` to match CPU cores
- Enable `sendfile`, `tcp_nopush`, `tcp_nodelay`
- Use `keepalive` connections to upstreams
- Enable gzip for text-based responses
- Use proxy caching for cacheable responses
- Set `worker_connections` high enough for expected load

### Security
- Always redirect HTTP to HTTPS
- Use TLS 1.2+ only; disable older protocols
- Set security headers (HSTS, X-Frame-Options, etc.)
- Hide server tokens (`server_tokens off`)
- Rate limit authentication endpoints aggressively
- Deny access to hidden files (`/\.`)
- Limit `client_max_body_size`

### SSL/TLS
- Use Let's Encrypt with auto-renewal (certbot)
- Enable OCSP stapling for faster handshakes
- Use `ssl_session_cache` for session reuse
- Prefer TLS 1.3 where possible
- Generate DH params: `openssl dhparam -out dhparam.pem 2048`

### Load Balancing
- Use `least_conn` for uneven request durations
- Use `ip_hash` for session affinity (if needed)
- Mark servers as `backup` for failover
- Set `max_fails` and `fail_timeout` for health checking

## Common Pitfalls

| Pitfall | Fix |
|---------|-----|
| Missing `X-Forwarded-For` header | Always set `proxy_set_header X-Forwarded-For` |
| WebSocket connections dropping | Add `Upgrade` and `Connection` headers |
| 502 Bad Gateway | Check upstream health, increase timeouts |
| Large uploads failing | Increase `client_max_body_size` |
| SSL not working | Check certificate chain completeness (fullchain) |
| Rate limiting too aggressive | Tune `burst` parameter, use `nodelay` |
| Cache serving stale data | Set appropriate `proxy_cache_valid` durations |

## Examples

### Test Configuration

```bash
# Test config syntax
nginx -t

# Reload without downtime
nginx -s reload

# Check active connections
nginx -V 2>&1 | grep --color=auto -o "with-http_stub_status_module"
```

### Docker Nginx Config

```dockerfile
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/nginx.conf
COPY conf.d/ /etc/nginx/conf.d/
EXPOSE 80 443
HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget --no-verbose --tries=1 --spider http://localhost/health || exit 1
```

### Let's Encrypt with Certbot

```bash
# Initial certificate
certbot --nginx -d app.example.com

# Auto-renewal cron
0 0 1 * * certbot renew --quiet && nginx -s reload
```
