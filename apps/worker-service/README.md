# Worker Service: Alert Summaries Backfill

This document explains how to run the DB migration and backfill the `alert_daily_summaries` collection.

Prerequisites

- Access to MongoDB credentials for the target environment.
- Node.js installed.

Run DB migration (creates indexes) from repository root:

```powershell
node apps/api-gateway/scripts/db-migrate.mjs up
```

Run backfill for last N days (default 30) — set `MONGODB_URI` env var with credentials:

```powershell
$env:MONGODB_URI='mongodb://user:pass@host:27017/db?authSource=admin'
$env:BACKFILL_DAYS='30'
npm run -w apps/worker-service backfill:alert-summaries
```

Notes

- The backfill script upserts daily summaries into `alert_daily_summaries` collection.
- Always run migration on staging first and verify explain output before applying to production.
- Rollback: indexes are non-destructive; to rollback index creation run:

```powershell
node apps/api-gateway/scripts/db-migrate.mjs down
```

Security

- Do not commit production credentials to source control.
- Prefer running these commands from CI with secured secrets.
