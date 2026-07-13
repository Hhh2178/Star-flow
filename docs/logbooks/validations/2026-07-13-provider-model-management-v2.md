# Provider And Model Management V2 Validation

## Status

Local release validated. App and Web are integrated into local `dev`. No remote push, server deployment, database migration, release tag or `main` update has been performed.

## Validated Commits

- App: `4a0b1f5 chore: build provider model management release assets`
- Web: `a5d9e70 fix: complete provider protocol and model editing flows`
- Outer governance: recorded by the integration commit containing this report and the exact app/web gitlinks.

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

## Remaining Release Gates

1. Push App and Web `dev` only when remote publication is authorized.
2. Deploy one immutable server release only after explicit rollout authorization; back up shared SQLite, preserve OSS, run additive migrations and retain rollback.
3. Run production HTTPS, Creator/Admin, Socket.IO, Provider console and controlled generation smoke without exposing credentials or payloads.
4. Tag and evaluate `main` fast-forward only after production smoke passes.

## Pre-Release Online Baseline

- Before V2 rollout, `https://starsflow.hhh2121.xyz/healthz` and `/admin/` both returned HTTP 200.
- Responses included `Server: cloudflare` and `CF-RAY`, confirming the orange-cloud proxy is active.
- This is evidence for the currently deployed baseline only. It does not count as V2 production deployment or production smoke evidence.
