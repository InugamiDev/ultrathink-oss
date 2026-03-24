---
name: database-replication
description: "Database replication patterns — read replicas, streaming replication, logical replication, and failover."
layer: utility
category: database
triggers:
  - "replication"
  - "read replica"
  - "failover"
  - "streaming replication"
  - "logical replication"
  - "primary-replica"
inputs:
  - "Read/write scaling requirements"
  - "High availability and failover needs"
  - "Cross-region replication requirements"
  - "Data synchronization architecture questions"
outputs:
  - "Replication topology configurations"
  - "Application-level read/write routing"
  - "Failover and health check procedures"
  - "Monitoring and lag detection strategies"
linksTo:
  - postgresql
  - database-optimization
  - database-backup
linkedFrom: []
riskLevel: high
memoryReadPolicy: selective
memoryWritePolicy: none
sideEffects: []
---

# Database Replication Patterns

## Purpose

Provide expert guidance on database replication architectures including streaming replication, logical replication, read replicas, failover strategies, and application-level routing. Primarily focused on PostgreSQL but patterns apply broadly. This is a **high-risk** skill — replication misconfiguration can cause data loss.

## Key Patterns

### Replication Types

| Type | Mechanism | Use Case | Lag |
|------|-----------|----------|-----|
| **Streaming (Physical)** | WAL shipping byte-for-byte | Read replicas, HA failover | Sub-second |
| **Logical** | Row-level changes decoded from WAL | Selective replication, version upgrades | Seconds |
| **Synchronous** | Commit waits for replica ACK | Zero data loss (RPO=0) | Higher latency |
| **Asynchronous** | Commit returns immediately | Read scaling, best performance | Sub-second typical |

### PostgreSQL Streaming Replication

**Primary configuration (postgresql.conf):**

```ini
# WAL settings
wal_level = replica                    # minimum for streaming replication
max_wal_senders = 10                   # max number of replicas
wal_keep_size = 1GB                    # WAL retained for slow replicas
max_replication_slots = 10             # prevents WAL cleanup before replica catches up

# Synchronous replication (optional — for zero data loss)
# synchronous_standby_names = 'FIRST 1 (replica1, replica2)'
# synchronous_commit = on
```

**pg_hba.conf — allow replication connections:**

```
# TYPE  DATABASE        USER            ADDRESS                 METHOD
host    replication     replicator      10.0.0.0/24             scram-sha-256
```

**Replica setup:**

```bash
# Create base backup from primary
pg_basebackup -h primary-host -U replicator -D /var/lib/postgresql/data \
  --checkpoint=fast --wal-method=stream --progress

# Create standby signal file
touch /var/lib/postgresql/data/standby.signal
```

**Replica configuration (postgresql.conf):**

```ini
primary_conninfo = 'host=primary-host port=5432 user=replicator password=secret application_name=replica1'
primary_slot_name = 'replica1_slot'
hot_standby = on                       # allow read queries on replica
hot_standby_feedback = on              # prevents vacuum cleanup conflicts
```

### Logical Replication

For selective table replication, cross-version upgrades, or multi-primary setups:

**On the publisher (primary):**

```sql
-- Create a publication for specific tables
CREATE PUBLICATION order_pub FOR TABLE orders, order_items;

-- Or replicate all tables
CREATE PUBLICATION all_tables_pub FOR ALL TABLES;

-- Replicate only INSERT/UPDATE (skip deletes)
CREATE PUBLICATION insert_only_pub FOR TABLE audit_log
  WITH (publish = 'insert, update');
```

**On the subscriber (replica):**

```sql
-- Create matching tables first (schema not replicated)
-- Then create subscription
CREATE SUBSCRIPTION order_sub
  CONNECTION 'host=primary-host port=5432 dbname=mydb user=replicator password=secret'
  PUBLICATION order_pub
  WITH (
    copy_data = true,           -- initial data copy
    create_slot = true,         -- auto-create replication slot
    synchronous_commit = 'off'  -- async for performance
  );
```

### Application-Level Read/Write Routing

**Node.js with connection pool routing:**

```typescript
import { Pool } from "pg";

const primaryPool = new Pool({
  host: process.env.DB_PRIMARY_HOST,
  port: 5432,
  database: "mydb",
  max: 20,
});

const replicaPool = new Pool({
  host: process.env.DB_REPLICA_HOST,
  port: 5432,
  database: "mydb",
  max: 40, // more connections for reads
});

type QueryIntent = "read" | "write";

export async function query(sql: string, params: unknown[], intent: QueryIntent = "read") {
  const pool = intent === "write" ? primaryPool : replicaPool;
  return pool.query(sql, params);
}

// For queries that must see their own writes (read-after-write consistency)
export async function queryPrimary(sql: string, params: unknown[]) {
  return primaryPool.query(sql, params);
}
```

**Django with database routers:**

```python
# settings.py
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'HOST': os.environ['DB_PRIMARY_HOST'],
        'NAME': 'mydb',
    },
    'replica': {
        'ENGINE': 'django.db.backends.postgresql',
        'HOST': os.environ['DB_REPLICA_HOST'],
        'NAME': 'mydb',
    },
}

DATABASE_ROUTERS = ['myapp.routers.PrimaryReplicaRouter']

# routers.py
class PrimaryReplicaRouter:
    def db_for_read(self, model, **hints):
        return 'replica'

    def db_for_write(self, model, **hints):
        return 'default'

    def allow_relation(self, obj1, obj2, **hints):
        return True

    def allow_migrate(self, db, app_label, model_name=None, **hints):
        return db == 'default'
```

**Spring Boot with read/write routing:**

```java
@Configuration
public class DataSourceConfig {

    @Bean
    public DataSource routingDataSource(
            @Qualifier("primaryDataSource") DataSource primary,
            @Qualifier("replicaDataSource") DataSource replica) {

        var router = new ReadWriteRoutingDataSource();
        router.setTargetDataSources(Map.of(
                DataSourceType.PRIMARY, primary,
                DataSourceType.REPLICA, replica
        ));
        router.setDefaultTargetDataSource(primary);
        return router;
    }
}

public class ReadWriteRoutingDataSource extends AbstractRoutingDataSource {
    @Override
    protected Object determineCurrentLookupKey() {
        return TransactionSynchronizationManager.isCurrentTransactionReadOnly()
                ? DataSourceType.REPLICA
                : DataSourceType.PRIMARY;
    }
}
```

### Failover Strategies

**Automated failover with Patroni (PostgreSQL):**

```yaml
# patroni.yml
scope: my-cluster
name: node1

restapi:
  listen: 0.0.0.0:8008

postgresql:
  listen: 0.0.0.0:5432
  data_dir: /var/lib/postgresql/data
  parameters:
    max_connections: 200
    wal_level: replica
    max_wal_senders: 10

bootstrap:
  dcs:
    ttl: 30
    loop_wait: 10
    retry_timeout: 10
    maximum_lag_on_failover: 1048576  # 1MB max lag for failover candidate
    postgresql:
      use_pg_rewind: true

etcd:
  hosts: etcd1:2379,etcd2:2379,etcd3:2379
```

**Health check for replica lag:**

```sql
-- On replica: check replication lag
SELECT
  now() - pg_last_xact_replay_timestamp() AS replication_lag,
  pg_is_in_recovery() AS is_replica,
  pg_last_wal_receive_lsn() AS received_lsn,
  pg_last_wal_replay_lsn() AS replayed_lsn;
```

### Monitoring Replication

**Primary-side monitoring:**

```sql
-- Check replication status from primary
SELECT
  client_addr,
  application_name,
  state,
  sent_lsn,
  write_lsn,
  flush_lsn,
  replay_lsn,
  pg_wal_lsn_diff(sent_lsn, replay_lsn) AS replay_lag_bytes,
  sync_state
FROM pg_stat_replication;

-- Check replication slots (prevent WAL bloat)
SELECT
  slot_name,
  active,
  pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn) AS retained_bytes
FROM pg_replication_slots;
```

**Prometheus alerting rules:**

```yaml
groups:
  - name: replication
    rules:
      - alert: ReplicationLagHigh
        expr: pg_replication_lag_seconds > 30
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Replication lag exceeds 30s on {{ $labels.instance }}"

      - alert: ReplicationSlotInactive
        expr: pg_replication_slots_active == 0
        for: 10m
        labels:
          severity: critical
        annotations:
          summary: "Inactive replication slot {{ $labels.slot_name }} — WAL may bloat"
```

## Best Practices

1. **Use replication slots** — Prevents WAL cleanup before replicas consume it. Without slots, slow replicas can fall behind and require re-initialization.
2. **Monitor replication lag continuously** — Alert on lag exceeding your tolerance. For critical reads, route to primary.
3. **Use synchronous replication for zero RPO** — But accept the latency cost. Use `synchronous_commit = remote_apply` for strongest guarantee.
4. **Enable `hot_standby_feedback`** — Prevents long-running replica queries from conflicting with vacuum on the primary.
5. **Handle read-after-write consistency** — After a write, route subsequent reads to the primary for a short window (sticky session or explicit routing).
6. **Test failover regularly** — Automate failover drills. Use Patroni or PgBouncer for automated promotion.
7. **Monitor replication slot WAL retention** — Inactive slots prevent WAL cleanup and can fill the disk. Alert and drop stale slots.
8. **Use logical replication for selective sync** — When you only need certain tables replicated, logical replication avoids full WAL shipping overhead.
9. **Size replica connections separately** — Read replicas typically need more connections than the primary since they handle high read volume.
10. **Plan for split-brain** — Use consensus-based tools (etcd/ZooKeeper with Patroni) to prevent two nodes from both believing they are primary.

## Common Pitfalls

| Pitfall | Problem | Fix |
|---------|---------|-----|
| No replication slots | Replica falls behind, needs full re-sync | Always create replication slots |
| Inactive replication slots | WAL accumulates, disk fills up | Monitor and drop orphaned slots |
| Read-after-write inconsistency | User writes data, reads stale from replica | Route to primary for a few seconds after writes |
| Missing `hot_standby_feedback` | Long queries on replica cancelled by vacuum conflicts | Enable `hot_standby_feedback = on` |
| Synchronous replication without tuning | Every commit waits for network round trip | Use `synchronous_commit = remote_write` for balanced performance |
| No failover automation | Manual promotion takes minutes during outage | Use Patroni or cloud-managed HA |
| Schema changes breaking logical replication | ALTER TABLE on publisher not replicated | Apply DDL on both publisher and subscriber |
| WAL bloat from long transactions | `pg_wal` directory grows unbounded | Monitor `oldest_xact_age`, kill long transactions |
