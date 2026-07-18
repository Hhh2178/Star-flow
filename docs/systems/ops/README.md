# Operations System

## Purpose

Define the operational boundary for Stars Flow internal staging: immutable releases, health and queue observation, backup/restore readiness, rollback and incident evidence.

## Runtime Ownership

- Public endpoint: `https://starsflow.hhh2121.xyz`.
- Application service: `stars-flow.service`.
- Listener: loopback `127.0.0.1:18300` behind Nginx and Cloudflare.
- Persistent SQLite and OSS paths live under `/opt/apps/stars-flow/shared/` and must never be bundled into a release.
- Immutable release directories live under `/opt/apps/stars-flow/releases/`; `current` selects the active release.

Exact non-secret server facts remain in `docs/references/server-context.md`. This document owns the operating contract, not volatile release identifiers.

## Operational Gates

Every release requires:

1. Explicit deployment authorization.
2. Clean Monorepo commit with local and GitHub CI evidence.
3. Fresh read-only server preflight covering disk, memory, service state, ports, database integrity, queue/reservation state and rollback availability.
4. Database backup before any migration or release switch.
5. Candidate build and smoke validation before the atomic `current` switch.
6. Post-switch HTTPS, health, Creator, Admin, Socket.IO, queue and log checks.
7. A validation log that records commit, release, rollback and sanitized results.

## Observability Baseline

Operators must be able to answer without exposing secrets:

- Is `/healthz` healthy through the public endpoint and origin service?
- Is `stars-flow.service` active and bound only to the approved loopback port?
- Are queued/running/recovering jobs growing unexpectedly?
- Are quota reservations left without a corresponding nonterminal job?
- Are Provider failures, unknown external states or polling retries increasing?
- Is SQLite integrity `ok`, and are disk usage and OSS growth within safe limits?
- Are authentication, authorization or cross-group denials showing abnormal patterns?

The current baseline is manual inspection plus application audit/queue surfaces. Automated alerting is a future operational milestone and must not send credentials, payloads or signed media URLs.

## Backup And Restore

- Backups must be stored outside immutable release directories.
- Backup files must never enter Git or chat output.
- A backup is not considered proven until restored into an isolated path and checked for SQLite integrity and representative application reads.
- Production restore drills require separate authorization and must never overwrite the active database during validation.
- Record drill date, source release, sanitized integrity result and recovery time in `docs/logbooks/validations/`.

## Incident And Rollback

Rollback is preferred over live patching when a release fails health, startup, migration, authorization, queue or billing gates. Preserve the failed release and logs for diagnosis, switch only to an already validated rollback release, then record the incident. Never hot-edit the active server tree as the normal recovery path.

See `monorepo-release-runbook.md` for the execution sequence.
