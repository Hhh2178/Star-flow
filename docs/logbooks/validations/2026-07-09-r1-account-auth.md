# 2026-07-09 R1 Account Auth Validation

## Scope

R1 implemented the account/auth foundation for the three-role model.

## Commits

| Repository | Branch | Commit | Purpose |
| --- | --- | --- | --- |
| `app` | `dev` | `f379dbd` | Add three-role auth foundation |
| `app` | `dev` | `a9a45ea` | Add `TOONFLOW_NO_AUTOSTART` smoke-test startup support |

## Verification

| Type | Result | Evidence |
| --- | --- | --- |
| Code/type | Passed | `yarn lint` in `D:\codex\服务器\Stars flow\app` |
| Build | Passed | `yarn build` in `D:\codex\服务器\Stars flow\app` |
| Interaction/API | Passed | Random-port service returned login role `super_admin`; protected API returned 401 without token and success with token |
| Data | Passed | `o_user.id=1` has `role=super_admin`, `status=enabled`, `passwordHash`, and `lastLoginAt` |
| Visual | Not applicable | R1 changed backend/auth only; no web or visual component files changed |

## Notes

- Existing service on `10588` was not stopped.
- R1 smoke used random port `53773`.
- Tokens were not printed or stored in documentation.
- A leftover ignored directory may remain at `app/.worktrees/r1-account-auth` because Git removed the worktree record but Windows did not delete the directory body. Project rules prohibit recursive deletion, and `.worktrees/` is ignored.

## Unable To Verify

| Item | Reason | Follow-Up |
| --- | --- | --- |
| Browser-level visual interaction | R1 has no UI changes | R2 must run setting-center visual and interaction checks |
| Multi-user role UI behavior | User management UI is planned for R2 | Verify in R2 after UI/API exists |
