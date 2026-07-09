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
