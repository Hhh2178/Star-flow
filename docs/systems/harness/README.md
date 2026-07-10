# Harness System

## Purpose

The harness protects Stars Flow project operations: docs routing, branch discipline, secret boundaries, submodule metadata, and verification scripts.

## Runtime Shape

The outer repository is a lightweight governance and release wrapper. Backend/runtime code lives in `app`; Creator/Admin frontend code lives in `web`. Both submodules keep independent histories but their gitlinks, generated static outputs and backend build are validated as one release unit.

## Interfaces

| Interface | Direction | Contract | Verification |
| --- | --- | --- | --- |
| `package.json` scripts | Human/agent to harness | `harness:verify:project` runs deterministic checks | `npm run harness:verify:project` |
| `.gitmodules` | Outer repo to product forks | `app` and `web` track their Stars Flow forks | Harness script checks URL and branch |
| `build:release` | Outer repo to both submodules | Builds Creator/Admin, copies both outputs, then builds app | Release layout tests and post-build artifact scan |
| `docs/INDEX.md` | Docs router | Names canonical docs and verification | Harness script checks required files |

## Verification

Run:

```powershell
npm run harness:verify:project
```
