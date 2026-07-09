# Harness System

## Purpose

The harness protects Stars Flow project operations: docs routing, branch discipline, secret boundaries, submodule metadata, and verification scripts.

## Runtime Shape

The outer repository is a lightweight governance wrapper. Product code lives in the `app` submodule.

## Interfaces

| Interface | Direction | Contract | Verification |
| --- | --- | --- | --- |
| `package.json` scripts | Human/agent to harness | `harness:verify:project` runs deterministic checks | `npm run harness:verify:project` |
| `.gitmodules` | Outer repo to app fork | `app` tracks `https://github.com/Hhh2178/Starflow`, branch `main` | Harness script checks URL and branch |
| `docs/INDEX.md` | Docs router | Names canonical docs and verification | Harness script checks required files |

## Verification

Run:

```powershell
npm run harness:verify:project
```
