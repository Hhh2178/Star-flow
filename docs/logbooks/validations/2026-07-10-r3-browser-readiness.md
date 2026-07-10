# R3 Browser Readiness Validation

## Result

R3 completed its local automated release gate and real browser interaction matrix on 2026-07-10. Validation used the production static-hosting shape with an isolated SQLite fixture and deterministic fake Provider execution. No real Provider key, payment, or user media was used.

## Runtime

- One Express/Socket.IO process served Creator at `/`, Admin at `/admin/`, and API at `/api` on one random free localhost port.
- Browser builds used same-origin API and Socket connections. Electron `file:` behavior remained on its configured backend URL.
- Acceptance data used `data/acceptance.sqlite`, isolated from the normal `data/db2.sqlite` scheduler.
- `STARS_ACCEPTANCE_MODE=1` replaced only paid Provider execution. Queue persistence, scheduling, four-layer concurrency, leases, recovery, cancellation, Agent events and resource writes used production code.

## Automated Evidence

Backend checks passed sequentially:

```text
yarn lint
yarn test:r2
yarn test:r3a
yarn test:r3b
yarn test:r3d through yarn test:r3n
yarn build
```

Frontend checks passed:

- 22 test files and 183 tests.
- Creator build and Admin build.
- 7 build-boundary tests.
- Creator artifact scan rejected Admin/global-setting markers.

Outer release checks passed before integration:

```text
npm run test:release-layout
npm run harness:verify:project
```

Expected non-blocking warnings were limited to the existing non-SPDX package license and deprecated PostCSS plugin.

## Browser Matrix

Real clicks, input, submit, refresh, account switching and backend restart verified:

- Authentication: invalid password, disabled account, logout/session restoration and Creator denial from Admin.
- User management: create Creator, disable, re-enable and reset password.
- Scope: Admin only saw and operated on its own group; Super Admin retained global visibility.
- Concurrency: Admin edited personal policy; Super Admin edited group policy and restored the original value.
- Queue: position, readonly group policy, priority change, queued/running/succeeded/failed/cancelled and `needs_attention` states.
- Agent: queue, execution, deterministic failure, running cancellation, refresh while running and persisted event replay.
- Restart: an unsubmitted expired job retried safely; a provider-submitted expired job moved to `needs_attention` without increasing its attempt count or resubmitting.
- Creator production: actual image and video screens submitted jobs, displayed generating state, completed, refreshed target data and served the generated placeholder PNG.
- Quota and settings: Super Admin viewed per-group balance, recharge totals and logs; recharge remained an explicit shell. Provider/AI/system role boundaries were exercised.
- Responsive layout: 1440x900 and 390x844 had no document-level horizontal overflow or incoherent overlap.

Screenshots are under `docs/logbooks/validations/evidence/2026-07-10-r3/`:

- `admin-queue-desktop-verified.png`
- `admin-queue-narrow.png`
- `interaction-results.json` contains the non-secret machine-readable matrix result.

## Fixes During Validation

- Isolated acceptance storage prevented an older local scheduler from claiming random-port fixture jobs.
- Hosted Axios and Agent Socket clients now resolve to same-origin endpoints.
- Queue policy controls keep the group selector visible when a selected group has no manageable users.
- Video completion state now matches the persisted `已完成` contract.
- Production Agent flow data preserves legacy script-linked asset semantics and excludes unrelated assets from the same project.

## Residual Risk

Provider submission deduplication is protected by persisted provider request state and `needs_attention` recovery. Agent tool calls that mutate the database do not yet have tool-call-level idempotency keys; a process crash after a tool side effect but before job completion could repeat that side effect on retry. This is accepted for local browser readiness and must be hardened before production paid Agent execution.

Real Provider compatibility, payment processing, server staging deployment and load testing remain outside this local R3 gate.

## Integration Gate

- Backend feature fast-forwarded to `app/dev`; final release artifact commit: `baafc28`.
- Frontend feature fast-forwarded to `web/dev`; merged head: `44d2401`.
- Post-merge `npm run build:release`, `npm run test:release-layout` and `npm run harness:verify:project` passed.
- The outer repository records both final submodule gitlinks. No remote push or server deployment was included.
