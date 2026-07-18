# Engineering Guardrails

## Scope

Stars Flow is one private Monorepo at `D:\codex\服务器\Stars flow`. Product source lives directly in `app/` and `web/`; governance, documentation and release scripts live at the root.

## Rules

- Do not modify old `D:\codex\服务器\星环漫剧` unless explicitly requested.
- Do not print, copy, or commit private keys or Provider keys.
- Do not deploy to the shared VPS without checking `docs/references/server-context.md`.
- Do not add long-lived branches beyond `main` and `dev`.
- Do not create UI components without checking system design docs and registries once they exist.
- Do not hot-edit server files as the normal development path; develop locally, commit, then deploy.

## Verification

- Monorepo harness: `npm run harness:verify:project`.
- App code: use Toonflow app scripts inside `app/`, such as `yarn lint`, after dependencies are installed.
