# ADR-0002 - Dual Frontend, Separate Histories, Single Release Unit

## Status

Accepted for R3 implementation on 2026-07-10. Repository-layout portions were superseded by ADR-0003 on 2026-07-18; the dual-frontend and single-release-unit decisions remain active.

## Context

Stars Flow needs a production-focused Creator application and an administrator-only console. The Toonflow backend and frontend forks have independent upstream histories, while operations require one reproducible release. Embedding management pages in Creator would ship privileged configuration code to ordinary users and keep routing, navigation and acceptance coupled.

## Decision

Keep Creator and Admin as separate build entries and validate App/Web as one release unit. Repository ownership and source layout now follow ADR-0003.

Build two independent applications from the `web/` Vite project:

- Creator entry at `/`, output `web/dist/creator`, copied to `app/data/web/`.
- Admin entry at `/admin/`, output `web/dist/admin`, copied to `app/data/web/admin/`.

The applications may share session, typed API, design tokens and low-level controls. They do not share routers, layouts, navigation or business-page imports. A release is valid only when both frontend outputs, the backend build, automated authorization checks and browser role/state smoke tests pass together.

The app remains one Express/Socket.IO service. It serves both static outputs, exposes management operations under `/api/admin/*`, and owns authorization, queue state and concurrency enforcement.

Hosted Creator and Admin builds use same-origin `/api` and same-origin Socket.IO so random local ports and reverse proxies need no runtime frontend rewrite. Electron `file:` builds keep the configured backend URL. Browser acceptance runs against an isolated `data/acceptance.sqlite`; `STARS_ACCEPTANCE_MODE=1` swaps only paid Provider execution for deterministic delayed/failing handlers while retaining the real scheduler, queue, leases, concurrency, cancellation and persistence paths.

## Consequences

- Creator artifacts can be scanned for forbidden Admin modules and global configuration code.
- Admin can evolve as a dense internal console without distorting Creator workflows.
- Backend and frontend upstream origins remain traceable through imported history and documented subtree synchronization.
- Local development and deployment need two frontend entries and one unified repository branch.
- A passing App-only or Web-only build is insufficient evidence for release readiness.

## Verification

The canonical execution and acceptance matrix is `docs/superpowers/plans/2026-07-10-r3-browser-test-readiness-execution.md`.
