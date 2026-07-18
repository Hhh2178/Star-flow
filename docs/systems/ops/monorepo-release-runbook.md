# Monorepo Release Runbook

## Scope

This runbook prepares a Stars Flow release from the private Monorepo. It does not itself authorize SSH access, deployment, production data changes or paid Provider calls.

## 1. Local Candidate

From a clean commit on `dev`:

```powershell
npm run ci:governance

Push-Location app
yarn test:ci
Pop-Location

Push-Location web
yarn test:ci
Pop-Location

npm run build:release
```

Confirm generated release files do not leave the worktree dirty unless the release procedure explicitly expects a committed generated artifact. Never include `.env`, SQLite files, OSS data, uploads, logs or Provider credentials.

## 2. GitHub Gate

Push the candidate to `dev` and require `Governance`, `App` and `Web` to pass. Record the exact Monorepo commit. Do not deploy an uncommitted tree or rebuild from a different commit.

## 3. Read-Only Server Preflight

After explicit deployment authorization, verify the requirements in `docs/references/server-context.md` and collect sanitized evidence for:

- disk, memory and swap;
- Node.js/Yarn and systemd service state;
- Nginx configuration health and approved listener ownership;
- active release and immediate rollback target;
- SQLite integrity and backup destination;
- nonterminal queue jobs and reserved quota rows;
- shared OSS/data paths and release-directory separation.

Stop if another project, an unknown listener, a damaged database, active migration-sensitive work or insufficient rollback capacity is detected.

## 4. Immutable Candidate

- Build or upload into a new timestamped directory below `/opt/apps/stars-flow/releases/`.
- Keep `/opt/apps/stars-flow/shared/db2.sqlite` and `/opt/apps/stars-flow/shared/oss` outside the candidate.
- Run required migrations only after a database backup.
- Start the candidate on an isolated loopback port and smoke it without changing `current`.
- Verify health, static Creator/Admin assets, API authentication and Socket.IO.

## 5. Atomic Switch

Record the previous `current` target, atomically repoint `current` to the validated candidate, then restart only `stars-flow.service`. Do not modify unrelated Nginx sites, shared services or project directories.

## 6. Post-Switch Gate

Verify:

- public HTTPS `/healthz`;
- Creator and Admin login surfaces;
- role and cross-group boundaries;
- Provider/model catalog visibility without exposing credentials;
- Socket.IO handshake and task progress;
- queue/reservation counts and database integrity;
- service journal for startup, unhandled, SQLite and address-in-use errors.

Do not trigger paid generation unless separately authorized. Use deterministic acceptance mode for non-paid interaction checks.

## 7. Rollback

Rollback immediately if startup, health, schema, authorization, queue ownership, billing or static assets fail. Switch `current` back to the recorded validated release and restart only the Stars Flow service. Preserve the failed candidate and sanitized logs for investigation.

## 8. Evidence

Add a dated validation record containing the Monorepo commit, release identifier, rollback identifier, database-backup fact, checks executed and sanitized outcome. Update `docs/references/server-context.md` only after the active release actually changes.
