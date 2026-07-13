# Provider Runtime Console Stage 8 Validation

## Status

In progress. Local migration gates, corrected real MiMo comparison, Native smoke, rollback and one real RunningHub AI App are complete. One independent RunningHub Workflow real validation and the final local UI repeat remain before Stage 8 can exit.

## Completed Evidence

- App commit: `fbf53d9 feat: add controlled provider migration gates`
- App commit: `06f629f feat: wire controlled mimo runtime validation`
- App commit: `62b7f24 fix: harden mimo migration evidence`
- App commit: `cae2717 fix: support scoped runninghub validation`
- Web commit: `91c8b2f fix: enforce read-only provider console for admin`
- The local runtime database reports 13 Providers in `legacy`, zero in `shadow`, zero in `native`; AICopy and GRSAI are verified Legacy.
- Shadow production routing executes Legacy exactly once. It cannot duplicate a potentially billable request.
- Explicit comparison checks MiMo Provider/model identity, normalized non-empty text contract and independently valid, non-negative, internally consistent Token usage without retaining prompts or outputs.
- Native promotion additionally requires unchanged pricing version/currency, reservation, final settlement and failure release evidence.
- New Providers must start on Legacy Bridge. Direct Legacy-to-native promotion is rejected.
- Only MiMo is allowlisted for Stage 8 transitions. GRSAI and AICopy reject shadow/native transitions until async contract equivalence exists.
- Controlled transitions use expected revisions, emit sanitized audit evidence and support native/shadow-to-Legacy rollback without schema or OSS changes.
- `validate:migrations` is read-only by default. Mutation requires `PROVIDER_MIGRATION_APPLY=1`; native additionally requires a complete non-secret evidence file outside Git.
- RunningHub real validation is inert by default and requires a non-production scope, App plus Workflow IDs, concurrency one and a manual quota no greater than CNY 1.
- The isolated local acceptance database was used for no-cost Creator and Admin browser smoke. Creator login, project selection and three-row novel data rendering passed without a real Provider call.
- Browser smoke found that an ordinary Admin could see mutation controls even though the backend rejected writes. A regression test was added first, then the console was changed to show a read-only notice, disable overview/protocol fields, hide model/pricing edit actions and guard all mutation handlers.
- Ordinary Admin browser revalidation found exactly one read-only notice and zero overview-save, model-edit and protocol-save controls; the visible overview and protocol fields were disabled.
- The production non-streaming text queue now resolves the configured Provider runtime and routes Legacy, Shadow and Native states through one gateway. Shadow still executes Legacy exactly once; Native uses the pinned Runtime Kit adapter.
- The first authorized real MiMo comparison entered Shadow at revision 2 and ran under the CNY 0.10 manual quota. Model identity, Token usage, pricing, reservation, settlement and failure-release checks passed; the output contract failed, so Native promotion was refused.
- MiMo was immediately rolled back at revision 3. Post-rollback validation proved 13 Legacy / 0 Shadow / 0 Native, with AICopy and GRSAI still protected.
- Root-cause investigation found that the validator allowed only 8 completion tokens while MiMo V2.5 defaults to deep thinking. Official MiMo guidance uses a materially larger completion budget and documents thinking as default-enabled for V2.5.
- Test-first correction raises the controlled budget to 256 tokens, treats separately sampled Token totals as valid when each side is non-negative and internally consistent, and adds only per-path boolean text-presence diagnostics. No prompt or response content is logged.
- The explicitly authorized corrected MiMo comparison entered Shadow at revision 4 and passed model identity, non-empty output, independently valid Token usage and all four accounting invariants under the CNY 0.10 manual quota.
- Evidence-gated promotion entered Native at revision 5. The single Runtime Kit Native smoke passed its normalized output contract under the CNY 0.05 manual quota.
- MiMo was immediately rolled back to Legacy at revision 6. Final state validation again proved 13 Legacy / 0 Shadow / 0 Native; temporary evidence and database backup files were removed individually.
- The RunningHub real validator was extended test-first to support a single App or Workflow target, optional image-node mapping and generic failure reporting that cannot expose credentials, payloads, outputs or URLs.
- One explicitly authorized RunningHub AI App executed with concurrency one and the CNY 1 manual quota. It completed successfully with exactly one normalized image output; the credential, target ID, input payload, task ID and output URL were not persisted or logged.

## Test Evidence

| Command | Result |
| --- | --- |
| `yarn test:r3w` | PASS, 14/14 controlled migration and production-routing tests |
| `yarn validate:migrations` | PASS, 13 legacy / 0 shadow / 0 native |
| `yarn test:r3s` | PASS, shadow routing regression |
| `yarn test:r3a` | PASS, auth/group/audit regression |
| `yarn test:r3d` | PASS, Admin operations regression |
| `yarn test:r3r` | PASS, 12/12 pricing/reservation/settlement tests |
| `yarn test:r3u` | PASS, 6/6 RunningHub App/Workflow fake tests |
| `yarn test:r3v` | PASS, Provider Runtime Admin regression |
| `yarn lint` | PASS, `tsc --noEmit` |
| `yarn build` | PASS, backend and Electron bundles |
| `yarn vitest run src/admin/__tests__/provider-runtime-console.test.ts` | PASS, 3/3 including ordinary Admin read-only regression |
| `yarn test:admin` | PASS, 175/175 Admin/shared tests, dual builds and boundary checks |
| `yarn test:product-identity && yarn check:product-identity` | PASS, Creator/Admin product identity |
| Creator local browser smoke | PASS, login, project selection and persisted three-row content rendering |
| Admin local browser smoke | PASS, 13/13 Legacy Providers and ordinary Admin read-only enforcement |
| `npm run harness:verify:project` | PASS after app/web synchronization |
| First authorized MiMo real comparison | SAFE REJECT, output contract false; all other contract/accounting checks true |
| MiMo rollback validation | PASS, 13 legacy / 0 shadow / 0 native |
| Post-fix `yarn test:r3w && yarn lint && yarn test:r3s && yarn test:r3r && yarn build` | PASS |
| Corrected MiMo real comparison | PASS, all seven contract/accounting checks true |
| MiMo Native smoke | PASS, Runtime Kit normalized output contract true |
| Final MiMo rollback validation | PASS, 13 legacy / 0 shadow / 0 native |
| `yarn test:r3u` after scoped-validator change | PASS, 7/7 RunningHub tests |
| RunningHub AI App real acceptance | PASS, concurrency 1, one normalized image output |
| Post-real-call `yarn test:r3w && yarn test:r3u && yarn test:r3r && yarn lint && yarn build` | PASS |
| Post-real-call `yarn validate:migrations && npm run harness:verify:project` | PASS |

## Pending Exit Evidence

1. Environment-only credentials, Workflow ID and node parameters for one independent RunningHub Workflow under the already-authorized non-production manual quota.
2. Repeat the already-passing Creator/Admin smoke after the controlled real state changes.

No real key, prompt, output or Provider URL was written to Git or this log. The real MiMo state change was local and temporary, and was rolled back on the first failed gate. Stage 8 remains open until the remaining items are evidenced.
