---
name: linux-admin
description: Linux server management, systemd, networking, troubleshooting, security hardening, and performance tuning
layer: domain
category: devops
triggers:
  - "linux"
  - "server admin"
  - "systemd"
  - "ssh"
  - "iptables"
  - "firewall"
  - "server setup"
  - "ubuntu"
  - "debian"
  - "centos"
inputs: [server specifications, OS distribution, service requirements, security policies]
outputs: [systemd units, firewall rules, shell scripts, configuration files, troubleshooting steps]
linksTo: [docker, nginx, monitoring, terraform]
linkedFrom: [ship, debug, infrastructure]
preferredNextSkills: [docker, nginx, monitoring]
fallbackSkills: [shell-scripting]
riskLevel: medium
memoryReadPolicy: selective
memoryWritePolicy: none
sideEffects: [system configuration changes, service restarts, firewall modifications]
---

# Linux Administration Specialist

## Purpose

Manage Linux servers including initial setup, security hardening, service management, networking, performance tuning, and troubleshooting. This skill covers Ubuntu/Debian and RHEL/CentOS distributions with systemd.

## Key Patterns

### Initial Server Hardening

```bash
#!/bin/bash
# server-setup.sh — Run as root on a fresh server

set -euo pipefail

# 1. Update system
apt update && apt upgrade -y

# 2. Create admin user
USERNAME="deploy"
adduser --disabled-password --gecos "" "$USERNAME"
usermod -aG sudo "$USERNAME"
mkdir -p /home/$USERNAME/.ssh
cp /root/.ssh/authorized_keys /home/$USERNAME/.ssh/
chown -R $USERNAME:$USERNAME /home/$USERNAME/.ssh
chmod 700 /home/$USERNAME/.ssh
chmod 600 /home/$USERNAME/.ssh/authorized_keys

# 3. Harden SSH
cat > /etc/ssh/sshd_config.d/hardening.conf <<'SSHEOF'
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
MaxAuthTries 3
ClientAliveInterval 300
ClientAliveCountMax 2
AllowUsers deploy
SSHEOF
systemctl restart sshd

# 4. Firewall (UFW)
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp comment "SSH"
ufw allow 80/tcp comment "HTTP"
ufw allow 443/tcp comment "HTTPS"
ufw --force enable

# 5. Fail2ban
apt install -y fail2ban
cat > /etc/fail2ban/jail.local <<'F2BEOF'
[sshd]
enabled = true
port = 22
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 3600
findtime = 600
F2BEOF
systemctl enable --now fail2ban

# 6. Automatic security updates
apt install -y unattended-upgrades
dpkg-reconfigure -plow unattended-upgrades

# 7. Kernel hardening
cat > /etc/sysctl.d/99-security.conf <<'SYSEOF'
net.ipv4.conf.all.rp_filter = 1
net.ipv4.conf.default.rp_filter = 1
net.ipv4.icmp_echo_ignore_broadcasts = 1
net.ipv4.conf.all.accept_redirects = 0
net.ipv4.conf.default.accept_redirects = 0
net.ipv6.conf.all.accept_redirects = 0
net.ipv4.conf.all.send_redirects = 0
net.ipv4.conf.all.accept_source_route = 0
net.ipv4.tcp_syncookies = 1
kernel.randomize_va_space = 2
SYSEOF
sysctl --system

echo "Server hardening complete."
```

### Systemd Service Unit

```ini
# /etc/systemd/system/myapp.service
[Unit]
Description=My Application
Documentation=https://docs.example.com
After=network.target postgresql.service
Requires=postgresql.service

[Service]
Type=simple
User=appuser
Group=appgroup
WorkingDirectory=/opt/myapp
ExecStart=/usr/bin/node /opt/myapp/server.js
ExecReload=/bin/kill -HUP $MAINPID
Restart=on-failure
RestartSec=5
StartLimitBurst=3
StartLimitIntervalSec=60

# Security hardening
NoNewPrivileges=yes
ProtectSystem=strict
ProtectHome=yes
ReadWritePaths=/opt/myapp/data /var/log/myapp
PrivateTmp=yes
PrivateDevices=yes

# Environment
EnvironmentFile=/opt/myapp/.env
Environment=NODE_ENV=production

# Resource limits
LimitNOFILE=65535
MemoryMax=512M
CPUQuota=50%

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=myapp

[Install]
WantedBy=multi-user.target
```

### systemd Management Commands

```bash
# Enable and start service
systemctl enable --now myapp

# View status
systemctl status myapp

# View logs
journalctl -u myapp -f --since "1 hour ago"

# Reload configuration
systemctl daemon-reload
systemctl reload myapp

# Restart
systemctl restart myapp
```

### Performance Tuning (sysctl)

```bash
# /etc/sysctl.d/99-performance.conf

# Network performance
net.core.somaxconn = 65535
net.core.netdev_max_backlog = 65535
net.ipv4.tcp_max_syn_backlog = 65535
net.ipv4.tcp_fin_timeout = 15
net.ipv4.tcp_tw_reuse = 1
net.ipv4.tcp_keepalive_time = 300
net.ipv4.tcp_keepalive_intvl = 30
net.ipv4.tcp_keepalive_probes = 5

# Memory
vm.swappiness = 10
vm.dirty_ratio = 15
vm.dirty_background_ratio = 5
vm.overcommit_memory = 1

# File handles
fs.file-max = 2097152
fs.nr_open = 2097152
```

## Best Practices

### Security
- Disable root SSH login; use key-based auth only
- Use fail2ban to block brute-force attempts
- Enable automatic security updates (unattended-upgrades)
- Apply kernel hardening via sysctl
- Use UFW or nftables for firewall management
- Regularly audit open ports: `ss -tlnp`
- Keep system packages up to date

### Service Management
- Always use systemd service units (not init.d scripts)
- Apply security directives: `NoNewPrivileges`, `ProtectSystem`, `PrivateTmp`
- Set resource limits (`MemoryMax`, `CPUQuota`, `LimitNOFILE`)
- Use `Restart=on-failure` with backoff (`RestartSec`)
- Log to journal (`StandardOutput=journal`)

### Disk and Storage
- Use LVM for flexible partition management
- Monitor disk usage with alerts at 80% threshold
- Set up log rotation (`logrotate`)
- Use `tmpfs` for ephemeral data (`/tmp`, `/run`)
- Schedule regular backups with verification

### Networking
- Use `ss` instead of `netstat` (faster, more info)
- Use `ip` instead of `ifconfig`
- Configure DNS resolution in `/etc/systemd/resolved.conf`
- Use `chrony` for NTP time sync

## Common Pitfalls

| Pitfall | Fix |
|---------|-----|
| Running services as root | Create dedicated service users |
| No firewall configured | Enable UFW/nftables on setup |
| SSH password auth enabled | Disable in sshd_config, use keys only |
| Full disk from logs | Set up logrotate with size limits |
| No swap on low-memory servers | Create a small swap file as a safety net |
| Forgetting `daemon-reload` | Always run after editing unit files |
| Time drift | Install and enable `chrony` or `systemd-timesyncd` |

## Examples

### Troubleshooting Checklist

```bash
# Check system resources
free -h                          # Memory
df -h                            # Disk
top -bn1 | head -20              # CPU/processes
uptime                           # Load average

# Check network
ss -tlnp                         # Listening ports
ip addr show                     # Network interfaces
curl -I http://localhost:3000    # Test local service
dig +short example.com           # DNS resolution

# Check services
systemctl --failed               # Failed services
journalctl -p err --since today  # Today's errors
dmesg | tail -20                 # Kernel messages

# Check security
last -10                         # Recent logins
who                              # Current sessions
fail2ban-client status sshd      # Ban status
```

### Log Rotation Config

```
# /etc/logrotate.d/myapp
/var/log/myapp/*.log {
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
    create 0640 appuser appgroup
    postrotate
        systemctl reload myapp > /dev/null 2>&1 || true
    endscript
}
```

### Swap File Setup

```bash
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
sysctl vm.swappiness=10
echo 'vm.swappiness=10' >> /etc/sysctl.d/99-performance.conf
```

### Backup Script

```bash
#!/bin/bash
set -euo pipefail

BACKUP_DIR="/backups/$(date +%Y-%m-%d)"
mkdir -p "$BACKUP_DIR"

# Database backup
pg_dump -h localhost -U app mydb | gzip > "$BACKUP_DIR/db.sql.gz"

# Application data
tar czf "$BACKUP_DIR/app-data.tar.gz" /opt/myapp/data/

# Retention: keep 30 days
find /backups -maxdepth 1 -type d -mtime +30 -exec rm -rf {} +

echo "Backup complete: $BACKUP_DIR"
```
