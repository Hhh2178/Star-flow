# Functional Reform Status

## Purpose

Track Stars Flow functional reform progress across rings. This file must be updated whenever a ring starts, pauses, completes, or changes scope.

## Current Summary

| Ring | Name | Status | Risk | Latest Evidence | Next Action |
| --- | --- | --- | --- | --- | --- |
| R0 | Planning and tracking | Done | Low | Roadmap and plans created | Start R1 |
| R1 | Account/auth foundation | Done | Medium | `app/dev` commits `f379dbd`, `a9a45ea`; validation log added | Start R2 |
| R2 | Setting-center permissions | Done | Medium | `app/dev` commit `1c4d6be`; `web/dev` commit `8551e77`; validation log added | Start separate admin-console redesign |
| R3 | Separate admin console | Done | Medium | app/web merged to `dev`; unified release gate and full browser matrix passed | Begin R4 production closed-loop audit when scheduled |
| R4 | Production closed-loop audit | Done | Medium | Real text/image/video queue, persistence, usage and billing evidence recorded | Continue internal staging observation |
| R5 | Provider/admin hardening | In Progress | Medium | Stages 1-5 completed; RunningHub runtime landed in app `8c14ca2` | Implement Provider Runtime administration APIs |

## Update Log

| Date | Ring | Status Change | Notes |
| --- | --- | --- | --- |
| 2026-07-09 | R0 | Planned -> Done | Created reform roadmap, status tracker, and first implementation plans |
| 2026-07-09 | R1 | Planned -> Done | Added three-role auth foundation, verified lint/build/API/data; visual check not applicable because no UI changed |
| 2026-07-10 | R2 | Planned -> Done | Added role-aware setting center, user management, backend route guards, API smoke test, app/web builds, and browser role smoke |
| 2026-07-10 | R3 | Planned -> Replanned | User superseded project-ownership-first R3 with a new requirement to split creator frontend and admin console |
| 2026-07-10 | R3 | Replanned -> Planned | Approved dual-build admin architecture, strict group isolation, cost/quota ledger, and Chinese-first UI requirements |
| 2026-07-10 | R3 | Planned -> In Progress | Started R3A on `feature/r3a-group-access` after clean app lint, R2 test, and build baselines |
| 2026-07-10 | R3 | In Progress -> In Progress | Completed and validated R3A group ownership, strict resource isolation, Socket guards, and redacted audit foundation; R3B-R3D remain |
| 2026-07-10 | R3 | In Progress -> In Progress | R3B core queue, policy, recovery, handlers, usage/quota debit and scoped queue APIs reached `dbe5a4f`; remaining route/Agent coverage and full-suite evidence are still open |
| 2026-07-10 | R3 | In Progress -> In Progress | Added the browser-readiness convergence plan, dual-frontend release ADR and mandatory real role/state interaction matrix; implementation continues in isolated app/web worktrees |
| 2026-07-10 | R3 | In Progress -> Integration Pending | Backend queue, dual frontend, operations console and real browser matrix passed; feature merges and post-merge release gate remain |
| 2026-07-10 | R3 | Integration Pending -> Done | app/web fast-forwarded to `dev`, final web release was committed, gitlinks updated and unified release gate passed |
| 2026-07-12 | R4 | Planned -> Done | Real MiMo, GRSAI and AICopy production paths completed through queue, persistence, usage and settled billing, then passed server smoke testing |
| 2026-07-12 | R5 | Deferred -> In Progress | Provider protocol adapters, safe connection tests, model pricing, quota reservation and Admin controls reached the internal staging release |
| 2026-07-13 | R5 | In Progress -> Replanned | Tagged the deployed baseline and replaced the flat Provider-table direction with a Legacy Bridge, pinned Runtime Kit, RunningHub support and selected-Provider console plan |
| 2026-07-13 | R5 | Replanned -> In Progress | Completed stage 1 support contact, Creator empty-model boundary, dual builds and artifact scans; begin additive runtime-profile schema |
| 2026-07-13 | R5 | In Progress -> In Progress | Completed stage 2 five-table runtime-profile schema, legacy seeding and optimistic concurrency; begin Legacy Adapter Bridge |
| 2026-07-13 | R5 | In Progress -> In Progress | Completed stage 3 runtime gateway, legacy bridge, normalized errors/results and Provider contract regression; begin pinned Runtime Kit integration |
| 2026-07-13 | R5 | In Progress -> In Progress | Completed stage 4 pinned Runtime Kit registry, standard adapter, redacted diagnostics and controlled routing; begin RunningHub App/Workflow support |
| 2026-07-13 | R5 | In Progress -> In Progress | Completed stage 5 RunningHub App/Workflow descriptors, reference-only keys, dual concurrency and cancellation release; begin runtime administration APIs |

## Required Status Update Format

When updating a ring, add one row:

```text
YYYY-MM-DD | R# | Old -> New | One sentence evidence and next action
```
