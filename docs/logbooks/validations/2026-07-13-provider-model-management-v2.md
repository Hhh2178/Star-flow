# Provider And Model Management V2 Validation

## Status

Production release validated. App and Web are integrated into `dev` and `main`, tagged, and deployed through immutable server release `20260714-101317`.

## Validated Commits

- App: `1ea5318 chore: build production smoke hotfix assets`
- Web: `a622ac4 fix: skip Electron protocol probing in hosted Creator`
- Outer governance: recorded by the integration commit containing this report and the exact app/web gitlinks.
- Remote verification: App `origin/dev` and `origin/main` equal `1ea5318`; Web `origin/dev` and `origin/main` equal `a622ac4`; all pushes were ordinary fast-forwards.

## Functional Evidence

- Super Admin can create and edit Providers, replace or clear protected credentials, probe saved or draft connections, discover and selectively import models, and safely disable or delete resources.
- Model editing covers primary type, capability tags, visual understanding, reasoning control, reference-image bounds, first-frame/first-last-frame modes, parameter Schema, protocol override and model advanced JSON.
- Provider protocol editing covers synchronous and asynchronous templates, bounded polling and Provider advanced JSON. New protocols omit optimistic revision until revision 1 exists.
- Runtime configuration composes template, Provider, model and allowed task parameters deterministically. Sensitive keys, executable content, invalid depth/size and unsupported task parameters are rejected.
- Legacy TypeScript adapters remain the production owner for Legacy Providers. Queue, concurrency, reservation, settlement and failure-release behavior remains covered by regression tests.
- Ordinary Admin receives read-only Provider/model surfaces and cannot call global mutation endpoints. Creator artifacts contain no Provider credential or mutation controls.

## Automated Gates

- App: R2 plus all existing R3A-R3W scripts, 23/23 commands passed; the repository has no R3C command.
- App: `yarn lint` and `yarn build` passed.
- Web source: 34 files / 270 tests passed with `yarn vitest run src`.
- Web Admin/shared: 19 files / 194 tests passed; Creator/Admin builds and build-boundary tests passed.
- Product identity: source and compiled Creator/Admin checks passed.
- Outer: `npm run build:release`, `npm run test:release-layout` and `npm run harness:verify:project` passed.
- Security scan: zero files matched credential-shaped `sk-...` or `tp-...` values across source, docs and generated release outputs.

## Desktop Browser Acceptance

- Viewports: 1280x720, 1440x900 and 1920x1080.
- Passed Provider selection, creation, editing, credential replacement/clear, sync/async protocol editing, model creation/reopen/delete, capability/input controls, parameter Schema and advanced JSON interactions.
- Passed ordinary Admin read-only enforcement and confirmed legacy/internal branding is not visible.
- Browser console errors: 0.
- Temporary `accept-v2-*` Providers/models and invalid `null`/`undefined` legacy profiles after cleanup: 0.
- Screenshots: `evidence/2026-07-13-provider-model-v2/providers-1280x720.png`, `providers-1440x900.png` and `providers-1920x1080.png`.

## Production Release Outcome

- Final immutable release: `/opt/apps/stars-flow/releases/20260714-101317`.
- Rollback release: `/opt/apps/stars-flow/releases/20260714-094715`.
- Database backup: `/opt/apps/stars-flow/backups/db2-before-20260714-101317.sqlite`.
- HTTPS, Cloudflare proxying, Admin Provider console, Creator empty model catalog, Socket.IO and service journal checks passed.
- App/Web `main` were fast-forwarded and tag `production-20260714-provider-model-v2` was pushed without history rewriting.
- Detailed production evidence: `docs/logbooks/validations/2026-07-14-provider-model-v2-production-release.md`.

## Pre-Release Online Baseline

- Before V2 rollout, `https://starsflow.hhh2121.xyz/healthz` and `/admin/` both returned HTTP 200.
- Responses included `Server: cloudflare` and `CF-RAY`, confirming the orange-cloud proxy is active.
- This is evidence for the currently deployed baseline only. It does not count as V2 production deployment or production smoke evidence.

## Server Rollout Preflight

- Current server App commit: `1328196`; active release: `20260713-150313`.
- Disk: 59 GB total, 24 GB available. Memory: 3.6 GiB total, about 2.3 GiB available; swap remains available.
- Runtime: Node.js 22.22.2 and npm 10.9.7.
- Nginx, Stars Flow, PostgreSQL and Redis are active; `nginx -t` passed.
- Stars Flow listens only on `127.0.0.1:18300`. Canvas remains on 18100/18200 and the internal proxy remains on 8443.
- Shared SQLite and OSS paths exist with the expected ownership. The database contains 13 Legacy Providers, 0 non-Legacy Providers, 0 nonterminal jobs and 0 reserved quota rows.
- This preflight is read-only. No release directory, database backup, migration, symlink or service state was changed.
- Release integrity manifest: `evidence/2026-07-13-provider-model-v2/release-manifest.json`. Deployment must verify the App commit and all listed SHA-256 values before switching `current`.
