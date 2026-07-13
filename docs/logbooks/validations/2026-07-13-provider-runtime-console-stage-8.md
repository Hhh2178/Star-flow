# Provider Runtime Console Stage 8 Validation

## Status

In progress. Local migration gates, fake contract validation, accounting invariants and rollback are complete. Explicitly authorized low-cost MiMo and RunningHub real calls remain required before Stage 8 can exit.

## Completed Evidence

- App commit: `fbf53d9 feat: add controlled provider migration gates`
- The local runtime database reports 13 Providers in `legacy`, zero in `shadow`, zero in `native`; AICopy and GRSAI are verified Legacy.
- Shadow production routing executes Legacy exactly once. It cannot duplicate a potentially billable request.
- Explicit comparison checks MiMo Provider/model identity, normalized non-empty text contract and exact normalized Token usage without retaining prompts or outputs.
- Native promotion additionally requires unchanged pricing version/currency, reservation, final settlement and failure release evidence.
- New Providers must start on Legacy Bridge. Direct Legacy-to-native promotion is rejected.
- Only MiMo is allowlisted for Stage 8 transitions. GRSAI and AICopy reject shadow/native transitions until async contract equivalence exists.
- Controlled transitions use expected revisions, emit sanitized audit evidence and support native/shadow-to-Legacy rollback without schema or OSS changes.
- `validate:migrations` is read-only by default. Mutation requires `PROVIDER_MIGRATION_APPLY=1`; native additionally requires a complete non-secret evidence file outside Git.
- RunningHub real validation is inert by default and requires a non-production scope, App plus Workflow IDs, concurrency one and a manual quota no greater than CNY 1.

## Test Evidence

| Command | Result |
| --- | --- |
| `yarn test:r3w` | PASS, 5/5 controlled migration tests |
| `yarn validate:migrations` | PASS, 13 legacy / 0 shadow / 0 native |
| `yarn test:r3s` | PASS, shadow routing regression |
| `yarn test:r3a` | PASS, auth/group/audit regression |
| `yarn test:r3d` | PASS, Admin operations regression |
| `yarn test:r3r` | PASS, 12/12 pricing/reservation/settlement tests |
| `yarn test:r3u` | PASS, 6/6 RunningHub App/Workflow fake tests |
| `yarn test:r3v` | PASS, Provider Runtime Admin regression |
| `yarn lint` | PASS, `tsc --noEmit` |
| `yarn build` | PASS, backend and Electron bundles |

## Pending Exit Evidence

1. Explicit authorization for a lowest-cost real MiMo comparison, because it invokes a real Provider and may incur a charge.
2. MiMo shadow comparison evidence from the real path, followed by native smoke and rollback proof.
3. Explicit authorization and environment-only credentials for one RunningHub App and one Workflow under the non-production manual quota.
4. Final Creator/Admin smoke after the controlled state changes.

No real keys, paid calls or production state changes were inferred from the implementation request. Stage 8 remains open until these items are evidenced.
