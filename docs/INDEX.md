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
| Account and permission design | `specs/2026-07-09-stars-flow-account-permission-design.md` | Account role, backend permission, or setting-center access rules change |
| Separate admin console design | `specs/2026-07-10-stars-flow-separated-admin-console-design.md` | Frontend/admin boundary, group scope, admin module, quota, or audit rules change |
| Functional reform roadmap | `specs/2026-07-09-stars-flow-functional-reform-roadmap.md` | Functional reform sequence, ring scope, or status process changes |
| Functional reform status | `logbooks/progress/functional-reform-status.md` | Any reform ring starts, pauses, completes, or changes scope |
| Frontend visual system | `systems/frontend/frontend-design/stars-flow-visual-system.md` | Theme token, component style, or motion rules change |
| Toonflow/Xinghuan feature comparison | `systems/frontend/frontend-design/toonflow-xinghuan-feature-comparison.md` | Feature scope or migration priority changes |
| Deployment shape decision | `decisions/ADR-0001-toonflow-rebase-and-deployment-shape.md` | Deployment target or app/client boundary changes |
| Server facts | `references/server-context.md` | Server host, ports, service constraints, or deploy path changes |
| Deployment evidence | `references/deployment-assessment-2026-07-09.md` and `logbooks/validations/` | New deployment validation or incident |
| Governance rules | `governance/*.md` | Process, documentation, branch, or safety rules change |
| System contracts | `systems/*/README.md` | Runtime, interface, data, permission, or verification changes |
| Daily work evidence | `logbooks/daily/*.md` | Meaningful work occurs |

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
