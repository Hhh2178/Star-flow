# Harness System

## Purpose

The harness protects Stars Flow project operations: docs routing, branch discipline, secret boundaries, Monorepo layout, and verification scripts.

## Runtime Shape

Stars Flow is a private Monorepo. Backend/runtime code lives in `app`; Creator/Admin frontend code lives in `web`; governance and release automation live at the root. App and Web retain imported source history, while all new work is committed on one repository branch and validated as one release unit.

## Interfaces

| Interface | Direction | Contract | Verification |
| --- | --- | --- | --- |
| `package.json` scripts | Human/agent to harness | `harness:verify:project` runs deterministic checks | `npm run harness:verify:project` |
| `app/`, `web/` | Monorepo to product source | Both paths are normal tracked directories, never gitlinks or nested repositories | Harness checks required manifests, nested `.git` markers and index modes |
| `build:release` | Repository root to App/Web | Builds Creator/Admin, copies both outputs, then builds app | Release layout tests and post-build artifact scan |
| `.github/workflows/ci.yml` | GitHub to Monorepo | Runs isolated `Governance`, `App` and `Web` checks without production secrets | Required GitHub status checks |
| `docs/INDEX.md` | Docs router | Names canonical docs and verification | Harness script checks required files |

## Verification

Run:

```powershell
npm run harness:verify:project
```

Local CI-equivalent entrypoints are `npm run ci:governance`, `app/yarn test:ci` and `web/yarn test:ci`. The GitHub policy and required check names are canonical in `docs/governance/github-and-ci-policy.md`.

## Release Branch Gate

1. Create one short-lived branch from the latest Monorepo `dev`.
2. Commit matching App, Web, documentation and release-script changes on that branch.
3. Merge into `dev` without rewriting published history.
4. Run the unified release build and project harness from the merged commit.
5. Fast-forward `main` only after the complete release gate and required staging checks pass.
