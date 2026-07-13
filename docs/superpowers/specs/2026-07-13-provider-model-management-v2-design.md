# Provider And Model Management V2 Design

## Status

Approved on 2026-07-13. This design extends the completed Provider Runtime foundation instead of replacing it. The existing TypeScript Provider adapters, Stars Flow queue, concurrency, pricing, quota, persistence and audit remain authoritative.

## Goal

Give Super Admin a complete desktop Provider and model-management console: create and edit Providers, manage protected credentials, probe connectivity, fetch and selectively import upstream models, describe model capabilities, configure incompatible parameters, select execution protocols and test the resulting runtime without exposing global configuration to Creator users.

## Reference And Adaptation

The interaction and capability model is based on the active Xinghuan Canvas 2.0 worktree at `D:/codex/无限画布2.0-worktrees/xinghuan-integration-clean`, especially its Provider rail, model picker, manual-model dialog, model editor, capability tags, input capabilities, parameter schema and advanced JSON design.

Stars Flow adopts those management patterns but does not copy Canvas-specific node, Worker or storage ownership. Stars Flow keeps its own authentication, group isolation, generation queue, billing and Legacy Adapter Bridge.

## Product Boundaries

- Creator receives only enabled, published model choices and public support information.
- Admin cannot read or mutate global Providers, credentials, protocols or model catalogs.
- Super Admin can manage all Provider and model runtime configuration.
- Provider credentials are write-only. Read APIs expose only presence, masked preview and health metadata.
- Arbitrary TypeScript, JavaScript, expressions and command templates are never accepted through Admin.
- The product and acceptance matrix remain desktop-only.

## Information Architecture

The existing fixed Provider rail remains. The selected Provider workspace is split into focused tabs:

1. `基本信息`: identity, enablement, adapter, migration state and note.
2. `凭据与连接`: Base URL, protocol, credential state, replace/clear commands, connection probe and latest result.
3. `模型目录`: paged models, upstream fetch, selective import, manual creation, filtering, enablement and guarded deletion.
4. `模型编辑`: identity, primary type, capability tags, input capabilities, parameter schema and model advanced JSON.
5. `协议与执行`: Provider defaults, protocol template, execution policy, Provider advanced JSON and merged preview.
6. `计价与并发`: pricing handoff, request/Token/second units and concurrency references.
7. `测试与历史`: non-billable connection checks, explicitly confirmed generation checks and redacted history.

Large model catalogs stay inside a bounded table and drawer workspace. They never expand every Provider row or the whole page vertically.

## Configuration Layers

Runtime request configuration is composed in this order:

```text
system capability template
  -> Provider default advanced config
  -> model advanced-config override
  -> validated per-task parameters
```

Later layers override earlier layers. Per-task values can modify only fields declared by the selected model's parameter schema. Unknown values are rejected rather than forwarded upstream.

Provider advanced configuration stores shared request, response and polling behavior. Model advanced configuration stores only model-specific differences. Neither layer stores credentials.

## Model Description

### Primary Type

Every model has one primary type:

- `text`
- `image`
- `video`
- `audio`
- `json`

### Capability Tags

Capability tags describe discoverable and routable abilities. Initial tags are:

- Language: `text_chat`, `image_understanding`, `video_understanding`, `audio_understanding`, `reasoning`, `reasoning_control`, `long_context`, `web_search`, `tool_calling`, `structured_output`.
- Image: `image_generation`, `image_to_image`, `image_edit`, `inpainting`, `outpainting`, `multi_reference_image`, `character_consistency`, `transparent_background`.
- Video: `video_generation`, `image_to_video`, `multi_reference_video`, `first_frame_video`, `last_frame_video`, `first_last_frame_video`, `video_edit`, `video_extend`, `native_audio`, `lip_sync`.
- Audio: `tts`, `voice_design`, `voice_clone`, `music_generation`, `audio_cover`, `audio_extend`.

Tags aid filtering and Agent routing but do not by themselves permit an input shape or upstream parameter.

### Input Capabilities

Input capabilities are structured runtime constraints. They drive Creator controls and server validation:

```json
{
  "prompt": true,
  "systemPrompt": true,
  "imageReference": { "enabled": true, "min": 0, "max": 4 },
  "frameModes": ["text_only", "first_frame", "first_last_frame"],
  "mask": false,
  "videoReference": false,
  "audioReference": false
}
```

`frameModes` may contain `text_only`, `reference_images`, `first_frame`, `last_frame`, `first_or_last_frame` and `first_last_frame`. This avoids incorrectly treating independent first-frame and last-frame booleans as proof that simultaneous first-and-last input is supported.

### Parameter Schema

Each model owns a constrained JSON parameter schema. It declares visible controls and accepted task parameters, including type, options, minimum, maximum, step and default. Common examples include temperature, top-p, maximum Token count, reasoning effort, aspect ratio, size, duration, resolution, seed, reference count, audio format and voice.

Changing the primary type can offer a default template, but it never silently overwrites an existing schema. The Admin must explicitly apply or reset a template.

### Advanced JSON

Provider and model advanced JSON use a versioned, allowlisted contract. Supported areas include:

- request content type, headers by safe reference, fixed body, field mapping and value-type conversion;
- submit path and HTTP method;
- task ID, status, error and output extraction paths;
- polling path, interval, timeout and terminal-state mappings;
- optional second-stage final resource lookup;
- output normalization hints.

The editor provides format, validate, reset-to-template and merged-preview commands. The merged preview redacts credential references and authorization-like headers.

## Protocol Templates

The first release supports:

- `sync_inline_result`
- `async_task_poll_result`
- `async_task_poll_then_final_lookup`
- `webhook_callback`
- `runninghub_app`
- `runninghub_workflow`
- `legacy_adapter`

The existing TypeScript MiMo, GRSAI and AICopy adapters continue through `legacy_adapter` until an equivalent declarative or native route passes controlled acceptance. A declarative configuration never overrides a Legacy adapter automatically.

## Provider And Credential Model

Provider runtime identity remains revisioned. The editable Provider view adds Base URL, default protocol, adapter selection, migration state, enabled state and note. Protected credentials remain in the existing credential owner and are referenced by Provider ID.

Credential commands are explicit:

- replace credential;
- clear credential;
- test with saved credential;
- test an unsaved Provider draft without persisting the supplied secret.

No GET response, audit entry, test history row or validation log may contain a credential value.

## Model Discovery And Import

For protocols with a model-list endpoint, Super Admin can fetch candidates. Fetching never imports automatically.

The candidate picker supports search, capability filters, selection and capability correction. Existing models are identified and cannot be duplicated. Imported models receive safe default capability tags, input capabilities and parameter schemas; all inferred values remain editable.

Protocols without a catalog endpoint use manual model creation. RunningHub Apps and Workflows remain descriptors rather than being mixed blindly into a generic OpenAI model list.

## Capability Inference And Testing

Model IDs may produce suggested tags, but suggestions do not publish a capability automatically. The flow is:

```text
fetch or enter model
  -> infer suggestions
  -> Super Admin reviews
  -> run capability-specific low-cost test
  -> persist redacted evidence
  -> enable model
```

Tests can target text chat, visual understanding, image generation, video generation and audio features as applicable. Test history stores status, duration, error code, inferred tags and timestamps, but not prompts, outputs, signed URLs, raw responses or credentials.

## Validation And Safety

- JSON values must be plain objects with bounded depth, key count and serialized size.
- Credential-like keys and inline Authorization values are rejected recursively.
- Paths and field mappings use strings only; executable expressions are rejected.
- URLs must be HTTP(S) endpoints or approved internal references.
- Polling intervals and timeouts are bounded.
- Parameter defaults must satisfy their own schemas.
- Input capability ranges must be internally consistent.
- Capability tags must come from the approved registry.
- Provider, model and protocol updates require the current revision.
- Deletion remains blocked by project, Agent, price or nonterminal-job references; disablement is the normal fallback.

## Runtime Ownership

The management console produces validated runtime profiles. `ProviderRuntimeGateway` composes the configuration and chooses the registered runtime. Stars Flow remains responsible for authorization, project scope, queueing, concurrency, reservation, charging, result persistence and audit.

The configuration composer is a pure, separately tested service. UI code and individual adapters do not implement their own merge rules.

## Migration

The schema change is additive. Existing Providers remain `legacy`, existing credential records remain in place and current model rows are backfilled with empty tag sets plus conservative input capabilities.

No existing Provider is switched to `shadow` or `native` by migration. Provider-by-Provider rollout follows the established Legacy, Shadow and Native acceptance gates.

## Acceptance

- Super Admin can create, edit, disable and safely delete Providers and models.
- Super Admin can replace or clear a credential without ever reading it back.
- Super Admin can probe a Provider, fetch candidates and selectively import models.
- Model tags and input capabilities accurately express visual understanding, reasoning control, multi-reference, first-frame and first/last-frame behavior.
- Common parameters use structured controls; incompatible parameters remain representable through validated advanced JSON.
- The merged request preview is deterministic and redacted.
- Creator bundles contain no global Provider mutation or credential code.
- Ordinary Admin remains read-only or entirely excluded according to the existing global-resource policy.
- Legacy TypeScript adapters continue to work without behavior or billing changes.
- Desktop browser acceptance passes at 1280x720, 1440x900 and 1920x1080.
