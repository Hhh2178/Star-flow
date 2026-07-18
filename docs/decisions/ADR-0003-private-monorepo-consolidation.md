# ADR-0003 - Private Monorepo Consolidation

## Status

Accepted on 2026-07-18.

## Context

Stars Flow was maintained as an outer governance repository plus `app/` and `web/` Git submodules. In practice, backend, frontend, documentation and release automation change together and are validated and deployed as one unit. The three-repository workflow required synchronized branches, tags and gitlinks, increased onboarding and worktree complexity, and left the product forks publicly visible while the intended project repository is private.

## Decision

Consolidate Stars Flow into the private repository `https://github.com/Hhh2178/Star-flow`.

- `app/` and `web/` become normal tracked directories.
- Existing App and Web histories are imported with Git subtree merges rather than discarded.
- New product work uses one `feature/* -> dev -> main` branch flow.
- App, Web, governance and release scripts are committed and reviewed together when a change crosses boundaries.
- Creator and Admin remain separate build entries and continue to ship as one release unit under ADR-0002.
- Official Toonflow App/Web updates are imported on explicit short-lived upstream synchronization branches; nested repositories and submodules are not reintroduced.

## Consequences

- A normal clone contains all source without `git submodule update`.
- One pull request and one commit graph can represent a complete cross-stack change.
- CI, worktrees, tags, releases and server deployments have one authoritative commit.
- Repository size grows and upstream synchronization requires a documented subtree-aware process.
- Previously public App/Web history cannot be made historically private; the consolidated repository controls future development visibility.

## Verification

- `.gitmodules` is absent.
- `app/` and `web/` contain their required package manifests.
- Neither directory contains a nested `.git` marker or a `160000` gitlink entry.
- `npm run harness:verify:project` passes from the Monorepo root.
