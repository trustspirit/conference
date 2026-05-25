# Backfill: Per-Project User Roles

## Pre-flight
1. Firestore export to GCS: `gcloud firestore export gs://…/per-project-roles-backup-$(date +%Y%m%d)`
2. Verify export completed in the GCP Console.
3. Verify deployed code is phase A–E (dual-read code + rules).

## Dry-run
```
GCLOUD_PROJECT=finance-96f46 pnpm --filter @conference/finance migrate:project-roles
```
Read the plan output. Confirm:
- Every active user has a sensible `systemRole`.
- Every project's `memberRoles` matches the legacy `memberUids` cardinality.

## Commit
```
GCLOUD_PROJECT=finance-96f46 pnpm --filter @conference/finance migrate:project-roles:commit
```

## Verify
- Open Firestore Console, spot-check 5 users and 3 projects.
- Run rules tests against the production export imported into an emulator.
- Use the app: log in as known users in known projects, confirm same access as before.

## Rollback (within minutes)
1. Revert deployment to the commit before phase G.
2. Legacy fields are still present; no data restore needed.
3. If `memberRoles` corruption: `gcloud firestore import gs://…/per-project-roles-backup-YYYYMMDD`.
