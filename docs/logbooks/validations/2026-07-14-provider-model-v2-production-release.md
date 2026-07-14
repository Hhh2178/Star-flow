# Provider And Model Management V2 Production Release

## Decision

Approved for the current internal desktop production environment. The Provider/model management surface, hotfixes and release mechanics passed production smoke. Provider migration remains separately controlled: every production Provider is still Legacy and must not be promoted without its own contract, accounting and rollback gate.

## Immutable Release

- Active release: `/opt/apps/stars-flow/releases/20260714-101317`.
- App commit: `1ea531892c6150bf206692253087f40443ccab10`.
- Web commit: `a622ac4f648fdaa3014b69c2cdc2477d4a9021ac`.
- Previous release retained for rollback: `/opt/apps/stars-flow/releases/20260714-094715`.
- Pre-switch database backup: `/opt/apps/stars-flow/backups/db2-before-20260714-101317.sqlite`.
- Shared database and OSS paths were preserved; no release or backup was deleted.

## Switch Gates

- Database integrity: `ok`.
- Provider state: 12 total, 12 Legacy, 0 non-Legacy.
- Nonterminal queue jobs: 0.
- Reserved quota rows: 0.
- Candidate health passed on isolated port `18301` before switch.
- `current` was replaced atomically; automatic rollback to `20260714-094715` was prepared for restart or health failure and was not needed.

## Production Smoke

- `https://starsflow.hhh2121.xyz/healthz` returned HTTP 200 through Cloudflare; `Server: cloudflare` and `CF-RAY` were present.
- `stars-flow.service` was active and bound only to `127.0.0.1:18300`.
- Socket.IO polling returned a valid handshake and advertised WebSocket upgrade support.
- Admin Provider console displayed the fixed 260 px rail with 12/12 Providers and the five approved work areas: overview, credentials, models, protocol/execution and test history.
- Credentials remained write-only and were not rendered. The protocol view exposed synchronous, polling, webhook, RunningHub and Legacy templates plus validated Provider advanced JSON.
- Creator `/#/project` loaded at 1440x900 with zero browser console errors. The empty production catalog returned HTTP 200 and an empty list on both observed requests.
- Hosted Creator did not request the Electron-only `toonflow://getAppUrl` protocol.
- The service journal since the switch contained no `uncaught`, `unhandled`, `EADDRINUSE` or `SQLITE_ERROR` matches.

## Paid Generation Scope

No paid generation was submitted during this release smoke because no production model is enabled. The real MiMo, GRSAI and AICopy queue, persistence, usage and billing evidence from R4 remains valid, while current regression tests prove V2 leaves Legacy adapters, queue ownership, concurrency, reservation and settlement unchanged.

## Cleanup

- Temporary Super Admin prefix: zero remaining database rows.
- Local temporary credential file: absent.
- Browser local storage and cookies were cleared and the acceptance browser session was closed.
- No temporary Provider, model, task, generation job, quota reservation or credential was created.

## Verification And Git

- App: R3M, R3O, R3P, R3S, R3X, TypeScript and production build passed.
- Web: 35 files / 272 tests and 19 Admin/shared files / 194 tests passed; Creator/Admin builds, build boundaries and product identity passed.
- Outer release build, release-layout tests and project harness passed.
- App/Web `main` are exact fast-forwards to the deployed commits.
- App/Web tag `production-20260714-provider-model-v2` resolves to those commits and is published to GitHub.
- The outer governance repository has no remote; its gitlinks and this record remain local by design.
