# Root Entry Responsibility Matrix

| File | Owns | Must Not Own | Update Trigger |
| --- | --- | --- | --- |
| `AGENTS.md` | Agent constitution, reading order, safety rules, branch rules | Long history, feature specs, secrets | Project operating rules change |
| `README.md` | Human overview, setup summary, commands, docs map | Deep system contracts, deployment logs | Setup or current direction changes |
| `.env.example` | Non-secret environment variable names and example paths | Real secrets or Provider keys | Runtime config shape changes |
| `app/`, `web/` | Product source inside the private Monorepo | Nested Git repositories or runtime secrets | Product implementation changes |
| `docs/INDEX.md` | Documentation routing and source-of-truth map | Detailed implementation plans | New docs or authority changes |
| `package.json` | Harness command entrypoints for outer repository | App runtime dependencies | Harness command changes |
