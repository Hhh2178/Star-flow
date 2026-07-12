# Harness System

## Purpose

The harness protects Stars Flow project operations: docs routing, branch discipline, secret boundaries, submodule metadata, and verification scripts.

## Runtime Shape

The outer repository is a lightweight governance and release wrapper. Backend/runtime code lives in `app`; Creator/Admin frontend code lives in `web`. Both submodules keep independent histories but their gitlinks, generated static outputs and backend build are validated as one release unit.

## Interfaces

| Interface | Direction | Contract | Verification |
| --- | --- | --- | --- |
| `package.json` scripts | Human/agent to harness | `harness:verify:project` runs deterministic checks | `npm run harness:verify:project` |
| `.gitmodules` | Outer repo to product forks | `app` and `web` track their Stars Flow forks and release from `main` | Harness checks both origin/upstream URLs and both `main` branch declarations |
| `build:release` | Outer repo to both submodules | Builds Creator/Admin, copies both outputs, then builds app | Release layout tests and post-build artifact scan |
| `docs/INDEX.md` | Docs router | Names canonical docs and verification | Harness script checks required files |

## Verification

Run:

```powershell
npm run harness:verify:project
```

## Release Branch Gate

1. Commit and validate app/web on `dev`.
2. Push both `dev` branches without rewriting remote history.
3. Merge the exact validated commits into each repository's `main`.
4. Re-run the unified release build and project harness.
5. Commit the resulting app/web gitlinks in the outer governance repository.

The outer repository is a local governance wrapper until a dedicated remote is configured. Never imply that its documentation or gitlinks were pushed when only the two product forks were published.
