# Provider Runtime Migration Runbook

## Invariants

- Initial and rollback state is `legacy` with adapter `legacy`.
- `shadow` never duplicates production traffic. Native comparison is an explicit controlled acceptance action.
- Stage 8 allowlists only MiMo for migration. GRSAI and AICopy remain Legacy Bridge Providers.
- A MiMo `native` transition requires evidence for model identity, normalized output, Token usage, pricing version, reservation, settlement and failure release.
- Every state transition uses an expected revision and writes a sanitized audit. Evidence records booleans and a non-secret acceptance identifier, never prompts, outputs, URLs or credentials.

## Read-only validation

Run inside `app/`:

```powershell
yarn validate:migrations
```

This command does not change state. It fails if GRSAI or AICopy left Legacy, or if any Provider other than MiMo left Legacy during Stage 8.

## MiMo transition

1. Verify Creator and Admin smoke paths while every Provider is Legacy.
2. Set MiMo to shadow only through the migration script with `PROVIDER_MIGRATION_APPLY=1` and `--provider mimo --to shadow`.
3. Run one explicitly authorized, lowest-cost comparison outside production traffic. Compare only normalized contract and accounting evidence.
4. Store the non-secret evidence JSON outside Git. All seven boolean checks must be `true`, and `controlledAcceptanceId` must contain only letters, digits, `.`, `_`, `:`, or `-`.
5. Point `PROVIDER_MIGRATION_EVIDENCE_FILE` to that local file and apply `--provider mimo --to native`.
6. Re-run Creator/Admin smoke, R3R billing, R3W migration and the read-only migration validator.

Direct `legacy -> native` is rejected. The normal Admin update route cannot promote MiMo to native without controlled evidence.

## Rollback

Set the Provider to `legacy` through the same explicit migration script. Rollback does not remove additive tables, replace SQLite, alter pricing versions or touch OSS. Re-run the validator and Creator/Admin smoke immediately.

## RunningHub controlled acceptance

`yarn validate:runninghub` is inert unless `RUNNINGHUB_REAL_VALIDATION=1` is explicitly set. A real run additionally requires:

- acceptance scope exactly `non-production`;
- a manual quota greater than CNY 0 and no more than CNY 1;
- one App ID and one Workflow ID;
- a key supplied only through the process environment;
- per-key concurrency fixed at one.

The command reports only scope, quota and output counts. It does not print keys, task IDs, prompts or output URLs.

## Stop conditions

Stop and roll back when identity, output, Token usage or any accounting invariant differs; when a revision conflicts; when an async Provider is selected; or when a credential-like value appears in evidence or logs. Real paid comparison and RunningHub validation require explicit authorization and must not be inferred from this runbook.
