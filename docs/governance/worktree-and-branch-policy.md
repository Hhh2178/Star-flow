# Worktree And Branch Policy

## Long-Lived Branches

Stars Flow uses only:

- `main`: stable deployable branch.
- `dev`: daily integration branch.

## Short-Lived Branches

Use `feature/<short-name>` only when a change needs isolation. Merge into `dev`, then delete.

## Repository And Upstream Toonflow

- Monorepo `origin`: `https://github.com/Hhh2178/Star-flow`
- App upstream source: `https://github.com/HBAI-Ltd/Toonflow-app`
- Web upstream source: `https://github.com/HBAI-Ltd/Toonflow-web`

`app/` and `web/` are normal Monorepo directories, not nested repositories. Official Toonflow updates must be imported on a short-lived synchronization branch with subtree-aware tooling, reviewed as prefixed App/Web changes, tested on `dev`, and merged to `main` only after local and staging checks pass.

## Merge Flow

```text
feature/* -> dev -> main
feature/upstream-* -> dev -> main
```

Do not merge upstream directly into `main`.
