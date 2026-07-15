# Production Provider Paid Validation

## Decision

MiMo, GRSAI GPT Image 2 and AICopy Grok 1.5 Preview are approved for the current internal desktop production environment through their existing Legacy adapters. MiMo additionally passed controlled Native Runtime Kit validation but was returned to Legacy as the conservative production state. GRSAI and AICopy must remain Legacy until their asynchronous contracts are migrated independently.

## Final Production State

- Active release: `/opt/apps/stars-flow/releases/20260715-163439`.
- App commit: `672d95dd505ac68fab424cf31c0b2b6a61175033`.
- Web commit: `a622ac4f648fdaa3014b69c2cdc2477d4a9021ac`.
- Immediate rollback: `/opt/apps/stars-flow/releases/20260715-161328`.
- Provider-validation rollback: `/opt/apps/stars-flow/releases/20260714-101317`.
- Database integrity: `ok`.
- Provider migration state: 12 Legacy, 0 Shadow, 0 Native.
- Enabled production models: `mimo:mimo-v2.5`, `grsai:gpt-image-2`, `aicopy:grok-imagine-video-1.5-preview`.
- Configured text Agent deployments: 16, all routed to MiMo.
- Production nonterminal jobs: 0; production reserved quota rows: 0.

## Connection And Migration Evidence

- All three protected credential states are configured and all three no-generation connection checks passed.
- MiMo Shadow comparison passed model identity, non-empty output, independently valid Token usage, pricing, reservation, settlement and failure-release checks.
- MiMo Native smoke returned a normalized Runtime Kit text result.
- MiMo rollback completed; final migration validation confirmed GRSAI and AICopy remained protected Legacy Providers.

## Priced Queue Evidence

All paid jobs ran against temporary database copies and a temporary group/user/project with group and personal concurrency fixed at one. Production account and project rows were not changed.

| Phase | Provider | Result | Stars Flow accounting |
| --- | --- | --- | --- |
| Initial run | MiMo | Succeeded | CNY 0.05 settled |
| Initial run | GRSAI | Upstream failed | CNY 0.06 retained for external-state review in the disposable copy |
| Initial run | AICopy | Upstream completed after a transient 502 | Old runtime incorrectly released CNY 0.18; defect reproduced |
| Post-fix retest | GRSAI | Succeeded | CNY 0.06 settled |
| Post-fix retest | AICopy | Succeeded | CNY 0.18 settled |

The successful post-fix image/video balance moved from CNY 100.00 to CNY 99.76 and frozen balance returned to zero. Expected upstream spend is CNY 0.62 to CNY 0.68 depending on the failed GRSAI request's upstream billing policy. No task identifier, output URL, generated media or credential is retained in this record.

## Defects And Fixes

1. AICopy treated any polling non-2xx response as terminal. Commit `5c345c0` retries 5xx responses on the same task and marks video external state before Provider invocation, preventing duplicate submission and unsafe quota release.
2. Creator model selection still read the full bundled Legacy catalog. Commit `672d95d` publishes only enabled V2 Provider/model profiles and preserves the successful empty-catalog contract.

Both fixes were written test-first. R3P passed 7/7, R3B passed, R3R passed 13/13, R3X passed 2/2, R3M passed, TypeScript passed and the production build passed.

## Production API Smoke

- Text catalog: HTTP 200, exactly MiMo V2.5.
- Image catalog: HTTP 200, exactly GPT Image 2.
- Video catalog: HTTP 200, exactly Grok Imagine Video 1.5 Preview.
- Combined non-video catalog: HTTP 200, exactly MiMo and GPT Image 2.
- Admin Provider list: HTTP 200, 12 Providers total, only MiMo/GRSAI/AICopy enabled.
- `stars-flow.service`, `/healthz`, Cloudflare HTTPS and Socket.IO remained healthy; service journal matched none of the guarded fatal patterns.

## Cleanup

- Temporary database copies: absent.
- Temporary reconciliation state and scripts: absent.
- Temporary reference media and generated image/video files: absent.
- Production queue and reserved quota: zero.
- Credentials remain only in the protected production database and protected local runtime database.
