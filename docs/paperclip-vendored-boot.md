# Vendored Paperclip server — boot diagnosis (INU-23)

The repo vendors `@paperclipai/server@2026.416.0` under `paperclip/server/`. A
parallel `paperclipai onboard` (npx) install runs the newer 2026.427.0 on
:3100. This note records the result of diagnosing the reported boot failure
(`Database has tables but no migration journal; automatic migration is unsafe`)
and how to reproduce a clean boot of the vendored server for future debugging.

## TL;DR

- The vendored server boots successfully today.
- The hypothesis "vendored looks for `__drizzle_migrations` only in PUBLIC" was
  not correct for the version actually vendored: `paperclip/db/dist/client.js`
  already includes `discoverMigrationTableSchema`, which finds the table in
  any schema and prefers `drizzle`.
- No code change applied. If the symptom recurs (e.g. after a fresh data-dir
  or a partial rollback that leaves `public` populated but `drizzle.__drizzle_migrations`
  empty), re-vendor at 2026.427.0 rather than patching the 2026.416.0 client.

## How to boot the vendored server without disrupting :3100

The `PORT` env var (not `PAPERCLIP_PORT`) selects the listen port; everything
else is read from `~/.paperclip/instances/default/config.json`.

```sh
PORT=3105 node paperclip/server/dist/index.js
curl -s http://127.0.0.1:3105/api/health
# -> {"status":"ok","version":"2026.416.0", ...}
```

The embedded Postgres at port 54329 is shared — vendored boot logs
`Embedded PostgreSQL already running; reusing existing process`, so the running
:3100 instance is unaffected.

## Where the migration journal lives

```sh
PGPASSWORD=paperclip psql -h 127.0.0.1 -p 54329 -U paperclip -d paperclip \
  -c "SELECT n.nspname, c.relname FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE c.relname = '__drizzle_migrations';"
# -> nspname=drizzle, relname=__drizzle_migrations
```

`paperclip/db/dist/client.js:420` resolves the schema dynamically and prefers
`drizzle` over `public`, so `inspectMigrations` returns `upToDate` and the
throw at `client.js:523` does not fire.

## If the failure recurs

Check the journal first:

```sh
PGPASSWORD=paperclip psql -h 127.0.0.1 -p 54329 -U paperclip -d paperclip \
  -c "SELECT count(*) FROM drizzle.__drizzle_migrations;"
```

If that table is missing or empty while `public` has tables, the vendored
2026.416.0 will throw `no-migration-journal-non-empty-db`. Preferred fix is
**option C** — re-vendor `paperclip/server` and `paperclip/db` at the version
actually running on :3100 (currently 2026.427.0), since that ships the
reconciliation path responsible for backfilling the journal in place.

## Hard rules followed during diagnosis

- Did not kill the running :3100 server.
- No writes to `~/.paperclip/` (read-only `psql` queries, read-only file reads).
- Vendored test instance bound to :3105 and stopped after verification.
