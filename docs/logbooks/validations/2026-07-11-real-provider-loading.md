# Real Provider Loading Validation - 2026-07-11

## Scope

Validate dedicated MiMo and AICopy Provider adapters, existing GRSAI image generation, Admin catalog loading, and local secret isolation. No credential, task identifier, signed URL or generated media is recorded here.

## Automated Evidence

| Gate | Result |
| --- | --- |
| `yarn test:r3p` | Pass: 4 Provider adapter and catalog contracts |
| `yarn test:r3o` | Pass: product identity and Provider copy |
| `yarn test:r3l` | Pass: Admin Provider permission and secret-response boundaries |
| `yarn lint` | Pass |
| `yarn build` | Pass |
| `yarn vitest run src` in `web/` | Pass: 25 files, 195 tests |
| `yarn build:admin` in `web/` | Pass |
| `npm run harness:verify:project` | Pass |
| `yarn test:r3a` | Pass: new Admin-created groups receive a zero-balance quota account |
| `yarn test:r3q` | Pass: browser runtimes receive same-origin OSS URLs |

## Real Provider Evidence

| Provider | Test | Result |
| --- | --- | --- |
| GRSAI `gpt-image-2` | One `1:1 / 1K` minimal image | Pass: completed in about 35 seconds and returned PNG data of about 1.15 MB |
| AICopy Grok preview | One 6-second minimal image-to-video task | Pass: upstream reached `completed`; result media was reachable as `video/mp4` |
| Xiaomi MiMo | Authenticated model catalog, minimal chat and Stars Flow `universalAi` route | Pass: model catalog and chat returned `200`; unified runtime routing returned text and usage |

## Protocol Findings

- AICopy direct API submission is `POST /v1/videos`; `/v2/videos/generations` on the supplied direct domain returns an HTML page and is not an API route.
- AICopy polling is `GET /v1/videos/{taskId}`.
- The preview model requires an input image and rejects text-only tasks.
- The direct response exposes completed media in top-level `video_url`, `result_url`, or `url`; relying only on legacy `data.output` causes a false timeout.
- GRSAI submit and poll paths match the documented `/v1/draw/completions` and `/v1/draw/result` contract.
- MiMo uses the supplied OpenAI-compatible `/v1` endpoint; both `mimo-v2.5` and `mimo-v2.5-pro` are present in its model catalog.
- Super Admin connection checks select a model from the Provider-level dialog, use model catalog or task-query probes, and do not create image or video jobs.

## Runtime Isolation

- Real credentials were stored only in local `data/db2.sqlite`.
- AICopy and GRSAI are enabled in the real local database.
- MiMo, GRSAI and AICopy are enabled in the real local database.
- Normal Agent mode routes `scriptAgent`, `productionAgent` and `universalAi` through `mimo:mimo-v2.5`.
- `data/acceptance.sqlite` contains catalog shells only and no real credentials.
- The authenticated Admin Provider page displays AICopy, MiMo and GRSAI model catalogs.
- The Admin Provider page displays one Chinese connection-test action per Provider and selects the model in a dialog; unconfigured Provider tests are disabled.
- Browser acceptance confirmed 13 Provider rows and 13 test actions, no document-width overflow, and no current-origin console errors.
- Secret-shape scans of source, bundled Provider metadata, `data/serve/app.js`, and all three Git diffs returned zero matches.

## Creator Production Workflow

The real local runtime was exercised with a dedicated Super Admin-created group, Creator account, project and test quota. Test credentials, generated media and upstream identifiers are not recorded here.

| Workflow | Result |
| --- | --- |
| Novel event extraction | Pass: two Creator-submitted chapters entered the queue, completed through `universalAi`, and wrote extracted events back to the novel table |
| Production Agent planning | Pass: one queued text job created a six-second single-frame storyboard track using the existing role asset |
| GRSAI image generation | Pass: one `gpt-image-2` 1K asset job completed, persisted locally and rendered through the same-origin OSS route |
| AICopy video generation | Pass: one six-second 720p single-image job completed in about 75 seconds and persisted as a reachable `video/mp4` file of about 2.4 MB |
| Admin queue | Pass: five completed jobs were visible with text, image and video types and no failed, cancelled or attention states |
| Admin usage | Pass: five successful usage records showed the expected Creator, group, project, Provider and model attribution |
| Admin quota | Partial: the manual top-up ledger and balance were correct, but model pricing is not configured, so recorded estimated cost and usage debit remained zero |

## Defects Found During Production Validation

- New Admin-created groups did not receive `o_quotaAccount` rows, so the first manual top-up failed with `QUOTA_ACCOUNT_NOT_FOUND`. Group creation now initializes a zero-balance account in the same transaction; the regression test failed before the fix and passed after it.
- Development browser runtimes returned OSS URLs pinned to port `10588`, so media generated on a random local port could not render after persistence. Non-Electron browser runtimes now return same-origin relative OSS URLs; the generated asset subsequently loaded from the active runtime.
- The production canvas video-workbench card did not open its full-screen panel during this run. The real video request was therefore submitted through the same authenticated Creator production API after the track and reference asset had been created in the UI. This interaction remains a frontend follow-up and does not invalidate the Provider adapter or queue result.

## Priced Queue Validation - 2026-07-12

The full priced queue was exercised against an isolated temporary copy of the real runtime database. The copy contained the existing local Provider configuration, was never committed, and was deleted after verification. No credential, Provider request identifier, signed URL or generated media is recorded.

| Task | Billing mode | Result |
| --- | --- | --- |
| MiMo text | CNY 0.05/request | Succeeded; reservation settled at 0.05 |
| GRSAI image | CNY 0.06/request | Succeeded; reservation settled at 0.06 |
| AICopy six-second video | CNY 0.18/request | Succeeded; reservation settled at 0.18 |

The isolated group balance moved from 100.00 to 99.71, total charge was exactly 0.29, reserved balance returned to zero, and all three reservations ended as `settled`. The validation process reached its command timeout during connection shutdown, but a read-only database check showed the video and accounting transaction had already completed successfully; no task was retried.

This run exposed a real configuration compatibility defect before any paid call: `o_agentDeploy.modelName` contained a canonical value such as `provider:model`, while pricing alias resolution treated it as a bare model and prefixed the Provider again. `resolvePricingTarget` now normalizes canonical deployment values, verifies the Provider prefix agrees with `vendorId`, and retains bare-model compatibility. The new R3R regression failed before the fix and passes afterward.

Desktop browser acceptance at the default 1294-pixel application width covered Provider pricing, usage and quota pages. There was no document-level horizontal overflow and no current-origin console error. Per product-owner direction, mobile and tablet validation are no longer in scope.
