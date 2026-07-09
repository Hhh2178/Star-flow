# Secrets And Access Policy

## Private Keys

The SSH private key remains outside the Stars Flow repository. The repository may reference the path in `.env.example`, but must never contain the key contents.

## Environment Files

- `.env` and `.env.*` are ignored.
- `.env.example` is tracked and must contain only non-secret placeholders or local path conventions.

## Provider Keys

Provider keys must stay in local `.env`, server environment variables, or encrypted server-side storage. They must not be committed to the outer repository or the app fork.

## Server Access

Use:

```powershell
ssh -i D:\codex\服务器\Tencent_Cloud_Server.pem -p 728 ubuntu@101.33.75.38
```

Do not use root login.
