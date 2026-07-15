# Provider System

## Purpose

Provider 系统负责把管理员维护的服务商凭据、模型能力和上游协议转换为统一的文本、图片和视频生成接口。Creator 不得看到或修改 Provider 凭据。

## Protocol Layers

Stars Flow 采用三层兼容边界：

1. Provider 默认层：维护服务商标识、Base URL、凭据输入和默认模型目录。
2. 模型参数层：按模型声明能力、参考素材模式、时长、分辨率和字段映射。同一服务商的不同模型可以使用不同参数和端点。
3. 协议适配层：处理提交、异步轮询、状态归一、失败原因和结果提取。只有协议差异无法由参数映射表达时才增加专用适配器。

不要把服务商协议分支放入 Creator 页面或生产节点。Provider 定义位于 `app/data/vendor/`，打包目录位于 `app/src/lib/vendor.json`，启动迁移负责把新增内置 Provider 加入 `o_vendorConfig`。

## Current Production Providers

| Provider | Model | Layer | Runtime status |
| --- | --- | --- | --- |
| Xiaomi MiMo | `mimo-v2.5`, `mimo-v2.5-pro` | OpenAI-compatible text | Real model catalog, minimal chat and Stars Flow text routing passed |
| GRSAI | `gpt-image-2` | `/v1/draw/completions` submit and `/v1/draw/result` poll | Real `1:1 / 1K` image generation passed |
| AICopy | `grok-imagine-video-1.5-preview` | `/v1/videos` submit and `/v1/videos/{taskId}` poll | Real 6-second image-to-video generation and MP4 reachability passed |

The 2026-07-15 production validation enabled exactly these three V2 model profiles. Creator model selection now reads only enabled Provider Runtime profiles and enabled model profiles; it no longer publishes the full bundled Legacy catalog. All three Providers remain on the Legacy Bridge after validation, while MiMo separately passed Shadow comparison and Native Runtime Kit smoke before rollback.

The AICopy preview model is image-to-video only. Stars Flow duplicates one reference image into the two-item `images` payload expected by the upstream model and rejects missing references before making a network request. Completed results may be returned through top-level `video_url`, `result_url`, or `url`, with wrapped legacy result paths retained for compatibility.

AICopy polling treats upstream 5xx responses as transient and continues polling the same task without resubmission. Core video execution marks the external-state boundary before Provider invocation so an unresolved asynchronous task retains its quota reservation instead of being misclassified as an ordinary released failure.

Super Admin can start a connection test from one action on each Provider row, then select the target model in a dialog. The test performs only authentication and model-catalog or task-query probes, never creates image or video generation tasks, returns no upstream body or credential, and writes a sanitized audit entry. MiMo, GRSAI and AICopy currently pass this route.

The local real runtime uses normal Agent mode with `scriptAgent`, `productionAgent` and `universalAi` routed through `mimo:mimo-v2.5`. GRSAI and AICopy remain enabled as project-level image and video choices; project model selection is not silently overwritten by global routing.

Runtime migration is deliberately Provider-specific. Initial deployment keeps every Provider in `legacy`. Only MiMo is allowlisted for `legacy -> shadow -> native`; shadow production traffic still executes Legacy only, while explicit controlled comparison checks model identity, normalized text output and Token usage. GRSAI and AICopy stay on the Legacy Bridge until their asynchronous submit/poll/result contracts have equivalent coverage. See [migration runbook](migration-runbook.md).

Browser runtimes receive same-origin relative OSS media URLs so random local ports, reverse-proxy deployments and the canonical server origin all resolve persisted images and videos through the active Stars Flow instance. Electron retains its explicit loopback-port behavior, and an explicit `ossURL` still overrides browser defaults.

Usage attribution and quota settlement are active for text, image and video jobs. Current defaults are MiMo CNY 0.05/request, GRSAI CNY 0.06/request and AICopy CNY 0.18/request. Enqueue reserves the immutable price snapshot, success settles the final charge, ordinary failure/cancellation releases the reservation, and unknown external state retains the reservation for manual handling. Text deployment aliases accept both bare model names and canonical `provider:model` values, while rejecting a canonical Provider that conflicts with the deployment record.

`STARS_DATABASE_FILE` may point the runtime at an explicit SQLite file for isolated validation. Real billing smoke tests use a temporary copy of the runtime database, run one task at a time, report only sanitized accounting state, and delete the copy after completion. `scripts/validateRealProviderBilling.ts` additionally requires `STARS_RUN_REAL_PROVIDER_BILLING=1` and explicit validation resource IDs before it can make paid calls.

## Secret Boundary

- Real keys may exist only in the runtime database or deployment secret store.
- `data/acceptance.sqlite` must never contain real Provider keys.
- Source, Git, docs, logs, screenshots and chat summaries must not contain keys or signed result URLs.
- Admin API responses expose configured status, never raw `inputValues`.

## Verification

Inside `app/`:

```powershell
yarn test:r3p
yarn test:r3o
yarn test:r3l
yarn test:r3q
yarn test:r3r
yarn test:r3w
yarn validate:migrations
yarn lint
yarn build
```

Real Provider smoke tests must use the lowest-cost supported parameters, run one task at a time, and report only protocol status, result media type and sanitized charge totals. Current product and browser acceptance scope is desktop only; mobile and tablet layouts are not part of the release gate.
