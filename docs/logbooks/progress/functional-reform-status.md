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
| R5 | Provider/admin hardening | In Progress | Medium | Stage 8 completed MiMo and both RunningHub real validations, final UI smoke and rollback; all 13 Providers remain Legacy | Run Stage 9 local release gates, then obtain separate server-rollout authorization |

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
| 2026-07-13 | R5 | In Progress -> In Progress | Completed stage 6 sanitized Provider/model/protocol CRUD, reference guards, controlled tests and audit history; begin fixed-rail Provider Console |
| 2026-07-13 | R5 | In Progress -> In Progress | Completed stage 7 fixed 260 px Provider rail, selected-Provider workspace, structured editors, full Admin regression and three-viewport browser matrix; begin controlled migration |
| 2026-07-13 | R5 | In Progress -> In Progress | Stage 8 added Legacy-first creation, MiMo-only revisioned transitions, shadow no-double-billing, contract/accounting evidence gates, rollback and RunningHub quota guard; paid real validation remains pending explicit authorization |
| 2026-07-13 | R5 | In Progress -> In Progress | Stage 8 no-cost Creator/Admin browser smoke passed; an ordinary-Admin edit-control exposure was caught, fixed test-first in web `91c8b2f`, and revalidated with 175 tests, dual builds, identity/boundary checks and the repository harness; paid real validation remains pending explicit authorization |
| 2026-07-13 | R5 | In Progress -> In Progress | The authorized MiMo comparison passed identity, Token and all accounting gates but failed its text-output gate under an 8-token deep-thinking budget; Native promotion was refused, MiMo was rolled back to 13/13 Legacy, and app `62b7f24` corrected the budget and Token-contract semantics test-first without logging content |
| 2026-07-13 | R5 | In Progress -> In Progress | The corrected MiMo comparison and Native smoke passed, MiMo was rolled back to 13/13 Legacy, and one concurrency-one RunningHub AI App completed with one normalized image output; app `cae2717` added scoped target validation while keeping credentials and payloads out of logs, leaving one independent Workflow and final UI repeat |
| 2026-07-13 | R5 | In Progress -> In Progress | Stage 8 completed after app `2b2bc72`/`dac2c01` aligned the Workflow v2 empty-input contract, the authorized Workflow returned three normalized images under concurrency one, and final Creator/Admin smoke plus all code, build, identity, migration and harness gates passed; begin Stage 9 local release preparation |

## Required Status Update Format

When updating a ring, add one row:

```text
YYYY-MM-DD | R# | Old -> New | One sentence evidence and next action
```
