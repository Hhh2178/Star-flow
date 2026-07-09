# Stars Flow Functional Reform Roadmap

## Status

Drafted for the first formal reform cycle on 2026-07-09.

## Purpose

This roadmap breaks the first Stars Flow functional reform into small, verifiable rings. Each ring must preserve the main strategy: keep Toonflow's working base, improve it toward Xinghuan Manju's production-console requirements, and avoid large rewrites before the current flow is proven.

## Main Strategy

- Keep Toonflow as the runtime and product base.
- Prefer incremental hardening over replacement.
- Do not rebuild features that Toonflow already has.
- Convert existing Toonflow features into a reliable internal-team production system.
- Update logs, status, and verification evidence after every ring.
- Use `dev` for daily integration and keep `main` stable.

## Reform Rings

| Ring | Name | Goal | Output | Status |
| --- | --- | --- | --- | --- |
| R0 | Planning and tracking | Establish plans, status table, and update rules | Roadmap, implementation plans, status tracker | Done |
| R1 | Account/auth foundation | Convert single-admin auth into three-role account foundation | Backend role model, secure login, role helpers | Planned |
| R2 | Setting-center permissions | Gate the current backend/settings UI by role | User management and role-aware setting center | Planned |
| R3 | Project ownership and production access | Make project data respect user role and ownership | Scoped project/task/production APIs | Planned |
| R4 | Production closed-loop audit | Verify and stabilize the existing Toonflow production chain | Runbook, smoke tests, gap list, fixes | Planned |
| R5 | Provider/admin hardening | Harden model/provider operations after roles exist | Safer provider admin, probes, logs | Deferred |

## First Batch Scope

The first batch includes R1, R2, R3, and R4. R5 is deferred until the account and project scope foundation exists.

## Status Levels

| Status | Meaning |
| --- | --- |
| Planned | Design is accepted, implementation has not started |
| In Progress | Files are being changed |
| Verifying | Code is complete and validation is running |
| Blocked | Progress needs a decision or external fix |
| Done | Implemented, verified, logged, and committed |

## Update Rules

After each ring or meaningful subtask:

1. Update `docs/logbooks/progress/functional-reform-status.md`.
2. Append evidence to the current daily log in `docs/logbooks/daily/`.
3. Run the planned verification commands.
4. Commit the result with a focused message.
5. Record any scope change in this roadmap or the relevant plan.

## Adjustment Rules

Adjust the plan during implementation when:

- Current Toonflow code already implements a requirement differently but acceptably.
- A route lacks project context and needs a narrower first pass.
- A change would require layout redesign or backend rewrite beyond the ring.
- Verification reveals a broken flow that should be fixed before adding more features.

Every adjustment must state:

- What changed.
- Why the old plan was wrong or incomplete.
- Whether the ring status changes.
- Which verification must be repeated.

## Verification Baseline

Use these checks whenever a ring touches the relevant area:

```powershell
cd "D:\codex\服务器\Stars flow"
npm run harness:verify:project

cd "D:\codex\服务器\Stars flow\app"
yarn build

cd "D:\codex\服务器\Stars flow\web"
yarn build-only
```

If `yarn build` is too broad for a small app change, record the narrower command used and why it is sufficient.
