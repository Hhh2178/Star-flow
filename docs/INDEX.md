# Documentation Index

## Purpose

This file routes Stars Flow documentation. New agents and developers should use it to find the canonical source for each fact before editing code or docs.

## Fast Path

Read in order:

1. `../AGENTS.md`
2. `../README.md`
3. `docs/INDEX.md`
4. Latest `logbooks/daily/*.md`
5. Relevant `systems/*` doc
6. Relevant `specs/*` or `superpowers/plans/*`

## Source Of Truth

| Fact | Canonical Source | Update Trigger |
| --- | --- | --- |
| Project identity and branch rules | `../AGENTS.md` | Branch model, repository, or safety rules change |
| Human overview and commands | `../README.md` | Setup, command, or current direction changes |
| Documentation routing | `docs/INDEX.md` | New doc family or canonical source changes |
| Toonflow rebase strategy | `specs/2026-07-09-stars-flow-toonflow-rebase-design.md` | Product or architecture direction changes |
| Visual migration requirements | `specs/2026-07-09-stars-flow-visual-requirements.md` | Visual boundary, UI migration scope, or Xinghuan visual direction changes |
| Current visual skin V2 design | `superpowers/specs/2026-07-11-stars-flow-visual-skin-v2-design.md` | Creator/Admin skin scope, tokens, surface matrix or visual acceptance changes |
| Current visual skin V2 execution | `superpowers/plans/2026-07-11-visual-skin-v2-implementation.md` | Brand cleanup, page skin tasks, build gates or visual matrix progress changes |
| Provider runtime console design | `superpowers/specs/2026-07-13-provider-runtime-console-design.md` | Provider contracts, Creator boundary, protocol, Runtime Kit or RunningHub decisions change |
| Provider runtime console execution | `superpowers/plans/2026-07-13-provider-runtime-console-implementation.md` | Provider runtime, Legacy Bridge, Admin console or migration tasks change |
| Provider/model management V2 design | `superpowers/specs/2026-07-13-provider-model-management-v2-design.md` | Provider editing, model discovery, capability tags, parameter schemas or advanced JSON rules change |
| Account and permission design | `specs/2026-07-09-stars-flow-account-permission-design.md` | Account role, backend permission, or setting-center access rules change |
| Separate admin console design | `specs/2026-07-10-stars-flow-separated-admin-console-design.md` | Frontend/admin boundary, group scope, admin module, quota, or audit rules change |
| Functional reform roadmap | `specs/2026-07-09-stars-flow-functional-reform-roadmap.md` | Functional reform sequence, ring scope, or status process changes |
| Functional reform status | `logbooks/progress/functional-reform-status.md` | Any reform ring starts, pauses, completes, or changes scope |
| Frontend visual system | `systems/frontend/frontend-design/stars-flow-visual-system.md` | Theme token, component style, or motion rules change |
| Toonflow/Xinghuan feature comparison | `systems/frontend/frontend-design/toonflow-xinghuan-feature-comparison.md` | Feature scope or migration priority changes |
| Deployment shape decision | `decisions/ADR-0001-toonflow-rebase-and-deployment-shape.md` | Deployment target or app/client boundary changes |
| Dual frontend and release-unit decision | `decisions/ADR-0002-dual-frontend-single-release-unit.md` | Creator/Admin entry, submodule, output, or static hosting shape changes |
| Server facts | `references/server-context.md` | Server host, ports, service constraints, or deploy path changes |
| Deployment evidence | `references/deployment-assessment-2026-07-09.md`, `logbooks/validations/2026-07-12-server-staging-release.md` and later validation records | New deployment validation or incident |
| Governance rules | `governance/*.md` | Process, documentation, branch, or safety rules change |
| System contracts | `systems/*/README.md` | Runtime, interface, data, permission, or verification changes |
| R3 browser acceptance evidence | `logbooks/validations/2026-07-10-r3-browser-readiness.md` | R3 interaction matrix, acceptance launcher, or residual risk changes |
| Daily work evidence | `logbooks/daily/*.md` | Meaningful work occurs |
| Current R3 browser-readiness execution | `superpowers/plans/2026-07-10-r3-browser-test-readiness-execution.md` | Remaining implementation, verification matrix, or browser acceptance scope changes |

## Document Families

- `governance/`: durable project rules.
- `systems/`: system contracts and operating maps.
- `references/`: imported context and assessment notes.
- `specs/`: product and architecture designs.
- `superpowers/plans/`: executable implementation plans.
- `logbooks/`: append-only work, validation, release, and incident evidence.

## Verification

Run:

```powershell
npm run harness:verify:project
```

The harness verifies root entries, required docs, submodule metadata, and branch policy anchors.
