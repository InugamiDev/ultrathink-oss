---
name: database-backup
description: PostgreSQL backup strategies including pg_dump, WAL archiving, point-in-time recovery (PITR), and automated backup pipelines
layer: domain
category: database
triggers:
  - "database backup"
  - "pg_dump"
  - "WAL archiving"
  - "point-in-time recovery"
  - "PITR"
  - "backup pipeline"
  - "postgres backup"
  - "disaster recovery"
inputs:
  - "Database size and recovery time requirements"
  - "Backup frequency and retention needs"
  - "Compliance and RPO/RTO constraints"
  - "Infrastructure environment (self-hosted, cloud, Neon, RDS)"
outputs:
  - "Backup strategy with RPO/RTO analysis"
  - "pg_dump scripts and cron configurations"
  - "WAL archiving setup guides"
  - "Automated backup pipeline configurations"
linksTo:
  - postgresql
  - monitoring
  - cicd
linkedFrom:
  - postgresql
  - migration-planner
preferredNextSkills:
  - postgresql
  - monitoring
fallbackSkills:
  - linux-admin
riskLevel: medium
memoryReadPolicy: selective
memoryWritePolicy: none
sideEffects: []
---

# Database Backup & Recovery

## Purpose

Provide comprehensive guidance on PostgreSQL backup strategies from logical dumps to continuous archiving with point-in-time recovery. Covers self-hosted, managed (RDS, Cloud SQL), and serverless (Neon) environments with automated pipeline patterns.

## Key Patterns

### pg_dump -- Logical Backups

**Basic full backup:**

```bash
# Custom format (compressed, parallel restore capable)
pg_dump \
  --format=custom \
  --compress=zstd:6 \
  --jobs=4 \
  --file="/backups/mydb_$(date +%Y%m%d_%H%M%S).dump" \
  --verbose \
  "postgresql://user:pass@host:5432/mydb"

# Restore from custom format
pg_restore \
  --jobs=4 \
  --clean \
  --if-exists \
  --no-owner \
  --dbname="postgresql://user:pass@host:5432/mydb_restored" \
  /backups/mydb_20250310_120000.dump
```

**Schema-only and data-only backups:**

```bash
# Schema only (for version control)
pg_dump --schema-only --format=plain \
  --file="/backups/schema_$(date +%Y%m%d).sql" \
  "$DATABASE_URL"

# Data only (for seeding)
pg_dump --data-only --format=custom \
  --exclude-table='audit_logs' \
  --exclude-table='sessions' \
  --file="/backups/data_$(date +%Y%m%d).dump" \
  "$DATABASE_URL"
```

**Selective table backup:**

```bash
# Backup specific tables
pg_dump --format=custom \
  --table='public.users' \
  --table='public.orders' \
  --table='public.order_items' \
  --file="/backups/orders_$(date +%Y%m%d).dump" \
  "$DATABASE_URL"
```

### WAL Archiving -- Continuous Archiving

**postgresql.conf setup:**

```ini
# Enable WAL archiving
wal_level = replica
archive_mode = on
archive_command = 'test ! -f /archive/%f && cp %p /archive/%f'
archive_timeout = 300  # Force archive every 5 min even if WAL not full

# For S3 archiving (using wal-g)
# archive_command = 'wal-g wal-push %p'
```

**Using wal-g for cloud archiving:**

```bash
# Install wal-g
# Configure S3 backend
export WALG_S3_PREFIX=s3://my-backups/wal-archive
export AWS_REGION=us-east-1
export PGHOST=/var/run/postgresql

# Create base backup
wal-g backup-push $PGDATA

# List backups
wal-g backup-list

# Restore to latest
wal-g backup-fetch $PGDATA LATEST
```

### Point-in-Time Recovery (PITR)

**Recovery to a specific timestamp:**

```bash
# 1. Stop PostgreSQL
sudo systemctl stop postgresql

# 2. Move current data directory
mv $PGDATA ${PGDATA}.old

# 3. Restore base backup
pg_basebackup -D $PGDATA -h backup-host -U replicator
# OR with wal-g:
wal-g backup-fetch $PGDATA LATEST

# 4. Create recovery configuration
cat > $PGDATA/postgresql.auto.conf << 'EOF'
restore_command = 'cp /archive/%f %p'
recovery_target_time = '2025-03-10 14:30:00 UTC'
recovery_target_action = 'promote'
EOF

# 5. Create recovery signal file
touch $PGDATA/recovery.signal

# 6. Start PostgreSQL (will replay WAL to target time)
sudo systemctl start postgresql
```

### Automated Backup Pipeline

**Shell script with rotation:**

```bash
#!/usr/bin/env bash
set -euo pipefail

# Configuration
DB_URL="${DATABASE_URL:?DATABASE_URL not set}"
BACKUP_DIR="/backups/postgres"
RETENTION_DAYS=30
S3_BUCKET="s3://myapp-backups/postgres"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/backup_${TIMESTAMP}.dump"

# Ensure backup directory exists
mkdir -p "$BACKUP_DIR"

# Create backup
echo "[$(date)] Starting backup..."
pg_dump \
  --format=custom \
  --compress=zstd:6 \
  --jobs=4 \
  --file="$BACKUP_FILE" \
  "$DB_URL"

BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "[$(date)] Backup complete: $BACKUP_FILE ($BACKUP_SIZE)"

# Upload to S3
aws s3 cp "$BACKUP_FILE" "$S3_BUCKET/$(basename $BACKUP_FILE)" \
  --storage-class STANDARD_IA

# Verify backup integrity
pg_restore --list "$BACKUP_FILE" > /dev/null 2>&1
echo "[$(date)] Backup verified"

# Rotate old local backups
find "$BACKUP_DIR" -name "backup_*.dump" -mtime +$RETENTION_DAYS -delete
echo "[$(date)] Rotated backups older than $RETENTION_DAYS days"

# Rotate old S3 backups (lifecycle policy preferred, but as fallback)
aws s3 ls "$S3_BUCKET/" | \
  awk '{print $4}' | \
  head -n -$RETENTION_DAYS | \
  xargs -I{} aws s3 rm "$S3_BUCKET/{}"
```

**Cron schedule:**

```cron
# Daily full backup at 2 AM UTC
0 2 * * * /opt/scripts/backup-postgres.sh >> /var/log/pg-backup.log 2>&1

# Hourly WAL push (if not using continuous archiving)
0 * * * * wal-g wal-push /var/lib/postgresql/data/pg_wal/ >> /var/log/wal-push.log 2>&1
```

### Docker-Based Backup

```yaml
# docker-compose.backup.yml
services:
  pg-backup:
    image: postgres:16-alpine
    environment:
      PGHOST: db
      PGUSER: postgres
      PGPASSWORD_FILE: /run/secrets/db_password
    volumes:
      - backup-data:/backups
      - ./scripts/backup.sh:/backup.sh:ro
    entrypoint: ["crond", "-f", "-d", "8"]
    configs:
      - source: backup-cron
        target: /var/spool/cron/crontabs/root

configs:
  backup-cron:
    content: |
      0 2 * * * /backup.sh

volumes:
  backup-data:
```

### Managed Service Backups

**Neon (serverless Postgres):**

```typescript
// Neon handles backups automatically via branching
// Create a point-in-time branch for recovery:
import { neonClient } from './neon';

async function createRecoveryBranch(timestamp: string) {
  const branch = await neonClient.createBranch({
    projectId: process.env.NEON_PROJECT_ID!,
    parentId: 'main',
    parentTimestamp: timestamp, // ISO 8601
    name: `recovery-${Date.now()}`,
  });

  return branch.connectionUri;
}
```

**AWS RDS:**

```bash
# Restore to point in time
aws rds restore-db-instance-to-point-in-time \
  --source-db-instance-identifier mydb-prod \
  --target-db-instance-identifier mydb-recovery \
  --restore-time "2025-03-10T14:30:00Z" \
  --db-instance-class db.t3.medium
```

## Best Practices

1. **Define RPO and RTO first** -- Recovery Point Objective (max data loss) and Recovery Time Objective (max downtime) drive your backup strategy.
2. **Test restores regularly** -- An untested backup is not a backup. Schedule monthly restore drills.
3. **Use custom format for pg_dump** -- It compresses well, supports parallel restore, and allows selective table restore.
4. **Combine logical + physical backups** -- pg_dump for portability, WAL archiving for minimal data loss.
5. **Encrypt backups at rest and in transit** -- Use `--compress=zstd` with GPG encryption or S3 server-side encryption.
6. **Store backups in a different region** -- Cross-region replication protects against regional outages.
7. **Monitor backup jobs** -- Alert on failures. A silent backup failure is worse than no backup at all.
8. **Version your backup scripts** -- Keep backup and restore procedures in version control alongside your application.

## Common Pitfalls

| Pitfall | Problem | Fix |
|---------|---------|-----|
| Never testing restores | Discover corrupt backups during an actual emergency | Schedule automated monthly restore verification |
| Plain SQL format for large DBs | Cannot restore in parallel, extremely slow | Use `--format=custom` with `--jobs=N` for parallel restore |
| No WAL archiving | RPO limited to backup frequency (hours of data loss) | Enable WAL archiving for near-zero RPO |
| Backups on the same disk | Disk failure loses both data and backups | Store backups on separate storage, ideally different region |
| Missing `--no-owner` on restore | Restore fails due to missing roles | Use `--no-owner --no-privileges` when restoring to a different environment |
| Unmonitored backup cron | Backup silently fails for weeks | Send alerts on failure; check backup age in monitoring |
| No retention policy | Disk fills up with old backups | Implement rotation: 7 daily, 4 weekly, 12 monthly |
| Backing up during peak load | Locks and performance degradation | Schedule backups during low-traffic windows; use `--no-synchronized-snapshots` for standbys |
