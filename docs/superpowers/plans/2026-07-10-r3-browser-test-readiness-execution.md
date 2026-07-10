# R3 Browser Test Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish the remaining R3 backend and dual-frontend work, produce one local release, and complete real browser interactions for every role and required task state.

**Architecture:** Preserve separate `app` and `web` Git histories under the outer release harness. Complete one shared Express/Socket.IO backend with server-owned queue and scope, and build independent Creator and Admin Vue applications whose outputs are mounted at `/` and `/admin/`. Use deterministic local acceptance data and fake/delayed handlers for state testing so paid Providers and secrets are not required.

**Tech Stack:** TypeScript, Express, Socket.IO, Knex/SQLite, Vue 3, Pinia, Vue Router, Vite, TDesign, Vitest/Node assert, Playwright or in-app browser automation.

---

## Verified Baseline

- R1, R2 and R3A are merged into the backend lineage.
- R3B commits `5bba749` through `dbe5a4f` implement schema, four-layer policy, fair queue, leases/recovery, trusted handlers, key novel/image/video routes, usage/quota debit and scoped queue APIs.
- Backend worktree: `app/.worktrees/r3b-generation-queue` on `feature/r3b-generation-queue`.
- Frontend worktree: `web/.worktrees/r3b-admin-console` on `feature/r3b-admin-console`; no R3 frontend implementation exists yet.
- Parent `dev` tracks both submodules, but release scripts still assume one `web/dist` output.
- No real Provider keys or production user media are used for this plan.

## Task 1: Close Backend Queue Entry And Status Contracts

**Files:** remaining production generation routes, `src/socket/routes/scriptAgent.ts`, `src/socket/routes/productionAgent.ts`, queue service/routes, and `src/tests/r3b-generation-queue.test.ts` in the backend worktree.

- [x] Add failing API tests for every remaining HTTP generation route and both Agent sockets. Assert `{ jobId, targetId, status: "queued" }`, actor-derived scope and idempotency.
- [x] Add a scoped current-user job detail/status endpoint usable by Creator polling; expose safe result/error fields and queue position without payload or credentials.
- [x] Convert `batchGenerateAssetsImage`, `generateFlowImage`, `generateVideoPrompt`, `batchGeneratePrompt`, ScriptAgent and ProductionAgent to trusted queue handlers or explicitly document any synchronous non-Provider operation that remains outside the queue.
- [x] Propagate cancellation through `AbortSignal`; test queued cancel, running cancellation request, succeeded/failed/cancelled/no-attention terminal states.
- [x] Run `yarn test:r3b`, then `yarn lint`, `yarn test:r2`, `yarn test:r3a`, `yarn build`.

## Task 2: Create Independent Creator And Admin Builds

**Files:** `vite.config.ts`, `package.json`, HTML entries, `src/admin/**`, shared session/API primitives and build-boundary tests in the frontend worktree.

- [x] Write a failing build-boundary test requiring `dist/creator` and `dist/admin` and rejecting Admin route/page markers in Creator output.
- [x] Add mode-specific Vite entries, routers and outputs; keep Creator behavior unchanged.
- [x] Extract router-neutral authenticated API/session primitives and add tests for 401 handling without router import cycles.
- [x] Build Chinese Admin login, role guard and dense console layout. Creator receives a role-gated Admin switch but no Admin page imports.
- [x] Verify Admin/Super Admin session restoration, Creator denial, direct-route denial and logout.

## Task 3: Implement Browser-Testable Admin Vertical Slice

**Files:** typed Admin API, navigation, shared table/status controls, Admin pages, backend overview/operations APIs and R3D tests.

- [x] Implement real scoped APIs and pages for overview, groups/users, projects/tasks, queue/concurrency, usage/quota, audit and personal profile.
- [x] Implement Super Admin manual quota adjustment and recharge shell against the real quota ledger; payment remains unavailable and is labeled accordingly.
- [x] Implement Admin readonly Provider/AI status and Super Admin write surfaces needed by current Creator model availability. Keep system settings Super Admin-only.
- [x] Test loading, empty, populated, validation, save success, backend failure, forbidden and not-found states in each page family.
- [x] Test two-group SQL scoping for list, search, count, sum, pagination and direct IDs. Admin never receives another Admin or Super Admin account row.

## Task 4: Adapt Creator To Asynchronous Generation

**Files:** Creator API calls/stores/pages for novel, assets, storyboard, image flow, video and Agent flows plus polling utilities and tests.

- [x] Write failing tests for queued response parsing and terminal-state polling.
- [x] Replace synchronous result assumptions with one typed job tracker that handles `queued`, `running`, `recovering`, `needs_attention`, `succeeded`, `failed` and `cancelled`.
- [x] Keep target resource IDs stable while polling; refresh affected resource only after success.
- [x] Remove browser `concurrentCount` as an authoritative limit. Display server queue position and Chinese state/error copy.
- [x] Stop polling on unmount, logout and terminal state; use bounded backoff and avoid duplicate submissions after refresh.

## Task 5: Unify Build, Static Hosting And Acceptance Data

**Files:** outer build/start scripts, backend static mounts, package scripts, deterministic local seed/fixture and documentation.

- [x] Update copy/release scripts for `dist/creator -> app/data/web` and `dist/admin -> app/data/web/admin` without deleting unrelated runtime data.
- [x] Add Admin history fallback before Creator fallback and verify `/admin/login`, `/admin/queue` and `/` after a production build.
- [x] Provide a non-secret local acceptance fixture with one Super Admin, two Admins in separate groups, two Creators per group, projects/jobs/usage/quota/audit rows and forced queue states.
- [x] Provide delayed/failing fake generation handlers or a test-only adapter so queue transitions and cancellation can be observed without paid calls.
- [x] Update local launcher to report exact Creator/Admin/backend URLs and fail clearly when a port is occupied.

## Task 6: Automated Release Gate

- [x] Backend: `yarn lint`, `yarn test:r2`, `yarn test:r3a`, `yarn test:r3b`, added API/R3D tests, `yarn build`.
- [x] Frontend: focused tests, Admin tests, type-check with pre-existing baseline separated from new errors, Creator build, Admin build and artifact boundary scan.
- [x] Parent: `npm run harness:verify:project` and `npm run build:release`.
- [x] Confirm git status in all three repositories contains only intended source/docs changes and ignored local `.codegraph/` indexes.

## Task 7: Real Browser Interaction Matrix

- [x] Login/logout/session refresh: all three roles; disabled and invalid accounts; Creator `/admin` denial.
- [x] Scope: Admin A and B list/search/filter/detail/actions; paste known cross-group URLs/IDs and verify `404` without leaked names or counts.
- [x] Users/groups: Creator limit, create/disable/reenable, password reset, role-specific controls and form validation.
- [x] Queue/concurrency: edit four layers, exceed limits with interleaved users/types, observe fair order and queue position, cancel queued/running jobs, reprioritize as Super Admin, inspect `needs_attention`.
- [x] Quota/logs: manual top-up/credit/debit, balance and recharge-total changes, usage debit, unknown cost, audit redaction and Admin readonly behavior.
- [x] Creator production: submit representative text/image/video and Agent work, refresh while queued, observe every reachable state and verify target resource refresh on success.
- [x] Responsive/visual: desktop and narrow viewports; verify Chinese labels, no overlap, stable tables/forms/dialogs and usable navigation.
- [x] Restart: leave delayed jobs queued/running, restart backend, verify queued recovery, lease behavior and no duplicate external submission.

## Task 8: Evidence And Closure

- [x] Save browser screenshots and machine-readable interaction results under a non-secret validation evidence path.
- [x] Record exact commands, account roles (not passwords), tested URLs, state transitions, failures fixed and residual risks in `docs/logbooks/validations/2026-07-10-r3-browser-readiness.md`.
- [x] Update this plan, functional status and daily log after each task group; do not mark R3 Done until the full matrix passes.
- [ ] Merge backend/frontend feature branches into their `dev` branches, update parent gitlinks and run the release gate again from the parent repository.

## Completion Gate

The work is browser-test ready only when local services start from documented commands, both applications render from independent builds, deterministic acceptance accounts/data exist, and automated checks pass. The goal is complete only after the browser matrix performs real interactions and verifies role scope plus queue/concurrency/quota/generation states; opening login pages alone is insufficient.
