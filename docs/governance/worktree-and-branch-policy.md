# Worktree And Branch Policy

## Long-Lived Branches

Stars Flow uses only:

- `main`: stable deployable branch.
- `dev`: daily integration branch.

## Short-Lived Branches

Use `feature/<short-name>` only when a change needs isolation. Merge into `dev`, then delete.

## Upstream Toonflow

Inside `app/`:

- `origin`: `https://github.com/Hhh2178/Starflow`
- `upstream`: `https://github.com/HBAI-Ltd/Toonflow-app`

Official Toonflow updates should be fetched from `upstream`, tested on `dev`, and merged to `main` only after local and staging checks pass.

## Merge Flow

```text
feature/* -> dev -> main
upstream/master -> dev -> main
```

Do not merge upstream directly into `main`.
