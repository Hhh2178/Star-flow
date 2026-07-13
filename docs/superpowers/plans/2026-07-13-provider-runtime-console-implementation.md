# Provider Runtime Console Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Do not use subagents for this project. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Super Admin Provider runtime console with configurable support contact, declarative model/protocol management, RunningHub compatibility and a zero-regression bridge for existing TypeScript adapters.

**Architecture:** Stars Flow retains its queue, authorization, concurrency, billing, persistence and audit boundaries. A new `ProviderRuntimeGateway` wraps the pinned Runtime Kit and routes each Provider through a standard, RunningHub, or Legacy adapter according to a versioned migration state. Creator receives only public model choices and contact information.

**Tech Stack:** TypeScript, Express, Knex/SQLite, Vue 3, TDesign Vue Next, Vitest, Node test runner, `aigc-provider-runtime-kit` pinned to commit `9cf7381c783406c9959713867052793927545d2e`.

---

## File Map

### App files to create

- `app/src/services/supportContact.ts`: public contact DTO and Super Admin mutation.
- `app/src/routes/public/support/getContact.ts`: authenticated Creator-safe contact read route.
- `app/src/routes/admin/system/updateSupportContact.ts`: Super Admin contact mutation.
- `app/src/services/providerRuntime/contracts.ts`: Stars Flow-facing Provider/model/runtime contracts.
- `app/src/services/providerRuntime/registry.ts`: legacy, database and runtime-profile overlay.
- `app/src/services/providerRuntime/gateway.ts`: single queue-facing execute contract.
- `app/src/services/providerRuntime/legacyAdapter.ts`: bridge to current VM-loaded TypeScript adapters.
- `app/src/services/providerRuntime/runtimeKit.ts`: pinned Runtime Kit construction and event mapping.
- `app/src/services/providerRuntime/runningHubAdapter.ts`: descriptor and key-pool integration.
- `app/src/services/providerRuntime/profileService.ts`: versioned Provider/model/protocol CRUD.
- `app/src/routes/admin/providers/getProvider.ts`
- `app/src/routes/admin/providers/createProvider.ts`
- `app/src/routes/admin/providers/updateProviderProfile.ts`
- `app/src/routes/admin/providers/listModels.ts`
- `app/src/routes/admin/providers/createModel.ts`
- `app/src/routes/admin/providers/updateModel.ts`
- `app/src/routes/admin/providers/deleteModel.ts`
- `app/src/routes/admin/providers/updateProtocol.ts`
- `app/src/routes/admin/providers/listTestRuns.ts`
- `app/src/tests/r3s-provider-runtime.test.ts`
- `app/src/tests/r3t-support-contact.test.ts`
- `app/src/tests/r3u-runninghub-runtime.test.ts`

### App files to modify

- `app/package.json`: pinned Runtime Kit dependency and R3S-R3U scripts.
- `app/src/lib/initDB.ts`: fresh runtime profile tables and public support settings.
- `app/src/lib/fixDB.ts`: idempotent migration and legacy defaults.
- `app/src/types/database.d.ts`: generated schema types.
- `app/src/utils/ai.ts`: route text/image/video execution through the gateway after compatibility tests.
- `app/src/utils/vendor.ts`: expose legacy definitions behind the bridge without changing current semantics.
- `app/src/jobs/handlers/coreTextExecutor.ts`
- `app/src/jobs/handlers/coreImageExecutor.ts`
- `app/src/jobs/handlers/coreVideoExecutor.ts`: consume normalized outputs and metering.
- `app/src/services/adminSettings.ts`: delegate Provider profile operations; keep secret-safe DTOs.
- `app/src/router.ts`: generated route registration.
- `app/data/serve/app.js`: rebuilt release runtime.

### Web files to create

- `web/src/components/support/SupportContactDialog.vue`
- `web/src/admin/pages/providers/ProviderRail.vue`
- `web/src/admin/pages/providers/ProviderOverviewPanel.vue`
- `web/src/admin/pages/providers/ProviderCredentialsPanel.vue`
- `web/src/admin/pages/providers/ProviderModelsPanel.vue`
- `web/src/admin/pages/providers/ProviderProtocolPanel.vue`
- `web/src/admin/pages/providers/ProviderTestHistoryPanel.vue`
- `web/src/admin/pages/providers/ModelEditorDrawer.vue`
- `web/src/admin/__tests__/provider-runtime-console.test.ts`
- `web/src/components/support/SupportContactDialog.test.ts`
- `web/src/utils/__tests__/creator-model-empty-state.test.ts`

### Web files to modify

- `web/src/pages/workbench/index.vue`: replace external feedback URL with support dialog.
- `web/src/components/modelSelect.vue`: remove Creator settings redirect and show administrator-contact state.
- `web/src/admin/pages/ProvidersPage.vue`: compose the fixed rail and selected-Provider panels.
- `web/src/admin/pages/SystemPage.vue`: support-contact management.
- `web/src/admin/api/adminApi.ts`: Provider runtime and support DTOs.
- `web/src/locales/language/zh-CN.json`: Chinese support and empty-model copy.
- `web/src/admin/__tests__/settings-pages.test.ts`
- `web/scripts/build-boundaries.test.mjs`: assert Creator has no global configuration imports.

### Governance files to modify

- `docs/INDEX.md`
- `docs/systems/providers/README.md`
- `docs/systems/frontend/frontend-design/functional-component-registry.md`
- `docs/logbooks/progress/functional-reform-status.md`
- current daily and validation logs

---

## Task 1: Creator Support And Configuration Boundary

**Files:** support-contact service/routes, `workbench/index.vue`, `modelSelect.vue`, System Admin page, related tests.

- [x] Write failing backend tests proving only Super Admin can mutate contact data and the public DTO contains no internal asset path or secret fields.
- [x] Add an idempotent support profile stored as structured settings: `enabled`, `type`, `title`, `wechatId`, `qrAssetId`, `description`.
- [x] Write failing Web tests proving feedback opens an in-app dialog and no Tencent form URL remains.
- [x] Implement the QR contact dialog with copy-WeChat command and an empty state when support is disabled.
- [x] Write a failing model-selector test proving an empty list does not import or open `vendorConfig`.
- [x] Replace the action with `当前暂无可用模型，请联系管理员` and optional contact-dialog command.
- [x] Extend build-boundary tests to reject `vendorConfig`, Provider mutation API names and protocol editor modules in Creator output.
- [x] Run `yarn test:r3t`, targeted Web tests, Creator build and boundary checks.
- [x] Commit: `feat: move creator support and model configuration boundaries`.

## Task 2: Versioned Runtime Profile Schema

**Files:** `initDB.ts`, `fixDB.ts`, database types, `profileService.ts`, R3S tests.

- [x] Write failing schema tests for `o_providerRuntimeProfile`, `o_providerModelProfile`, `o_providerProtocolProfile`, `o_providerTestRun` and `o_runningHubDescriptor`.
- [x] Add integer `revision`, timestamps, enabled state and migration state (`legacy|shadow|native`) to mutable profiles.
- [x] Keep credentials in `o_vendorConfig`; reference the Provider ID rather than copying credentials into new tables.
- [x] Add unique Provider/model constraints and reject dangling Provider references.
- [x] Seed one `legacy` profile for each existing Provider without changing enablement, model lists or production routing.
- [x] Add optimistic concurrency: updates require the current revision and return `409 PROVIDER_REVISION_CONFLICT` when stale.
- [x] Run migration twice against fresh and legacy-shaped databases to prove idempotency.
- [x] Commit: `feat: add versioned provider runtime profiles`.

## Task 3: Legacy TypeScript Adapter Bridge

**Files:** runtime contracts, registry, gateway, `legacyAdapter.ts`, `vendor.ts`, R3S tests.

- [x] Define one queue-facing execution request containing canonical Provider/model, capability, normalized input, timeout and abort signal.
- [x] Define normalized outputs for text, image, video, audio, JSON, task ID, usage and raw diagnostic metadata.
- [x] Write contract tests around current MiMo text, GRSAI image and AICopy video adapters using fake network responses.
- [x] Implement `LegacyVendorAdapter.supports()` and delegate to current `textRequest/imageRequest/videoRequest/ttsRequest` functions.
- [x] Normalize URL/Base64/string results without changing Provider-specific submit/poll behavior.
- [x] Map legacy errors into stable categories while preserving a redacted upstream message.
- [x] Prove abort, timeout and task-result behavior do not double-complete the Stars Flow queue job.
- [x] Run R3P, R3R and R3S to verify no Provider or billing regression.
- [x] Commit: `feat: bridge legacy provider adapters into runtime gateway` (`79bced5`).

## Task 4: Pinned Runtime Kit And Standard Adapters

**Files:** `package.json`, `runtimeKit.ts`, `gateway.ts`, model profile validation, R3S tests.

- [x] Add the Runtime Kit dependency pinned to commit `9cf7381c783406c9959713867052793927545d2e`; never depend on a moving branch.
- [x] Write failing registry tests for invalid URLs, duplicate IDs, missing adapter IDs, disabled models and malformed parameter schemas.
- [x] Map Provider/model profiles into Runtime Kit registry contracts.
- [x] Add OpenAI-compatible execution for chat/image models with normalized usage.
- [x] Map Runtime Kit start/progress/success/failure events into redacted Stars Flow diagnostics and audit references.
- [x] Enforce Stars Flow job timeout as the outer deadline and Runtime Kit timeout as an equal or shorter inner deadline.
- [x] Add `legacy`, `shadow` and `native` routing. Shadow results are diagnostic only and can never debit quota or overwrite production output.
- [x] Run complete R3B queue, cancellation, pricing and runtime suites.
- [x] Commit: `feat: integrate pinned provider runtime kit` (`2690c91`).

## Task 5: RunningHub App And Workflow Support

**Files:** RunningHub descriptor service/adapter, R3U tests, Admin protocol DTOs.

- [x] Write failing tests for App and Workflow descriptors, node mappings, upload mappings and output extraction.
- [x] Validate App/Workflow ID, required inputs, node IDs, output rules and bounded polling values.
- [x] Integrate Runtime Kit submit/poll and normalized outputs.
- [x] Add encrypted/reference-only key-pool configuration; read APIs return key counts and status, never values.
- [x] Enforce both Stars Flow group/user concurrency and RunningHub per-key concurrency.
- [x] Ensure cancellation releases the Runtime Kit wait and lets Stars Flow perform its existing reservation release exactly once.
- [x] Add fake RunningHub acceptance and one opt-in real low-cost validation script guarded by environment variables.
- [x] Commit: `feat: add runninghub app and workflow runtime` (`8c14ca2`).

## Task 6: Provider Runtime Admin APIs

**Files:** Provider routes, `profileService.ts`, `adminSettings.ts`, API tests.

- [x] Add Super Admin-only create/update/delete Provider and model routes with Zod validation.
- [x] Add paged model listing with query, capability, enabled and execution-mode filters.
- [x] Add protocol mutation for standard, poll, webhook, RunningHub and legacy modes.
- [x] Reject deletion when a model is referenced by a project, Agent deployment, active price or nonterminal job; allow disablement instead.
- [x] Separate non-billable connection tests from controlled generation tests.
- [x] Persist test history with status, duration, redacted error code and timestamp only.
- [x] Add audit entries for every mutation without credentials, raw payloads or signed URLs.
- [x] Run R3A/R3D/R3L/R3S/R3U and TypeScript.
- [x] Commit: `feat: add provider runtime administration APIs` (`d66e87f`).

## Task 7: Fixed-Rail Provider Console

**Files:** new Provider page components, Admin API client and tests.

- [ ] Write a failing component test with 20 Providers and 100 models proving only the selected Provider models render.
- [ ] Implement the fixed 240-280px independently scrolling rail with search, filters, badges, counts and stable selection.
- [ ] Implement Overview, Credentials, Models, Protocol And Execution, and Test History tabs.
- [ ] Implement paged model table and model editor drawer for identity, capability, execution mode, input profile, parameter schema, output mapping, enablement and pricing link.
- [ ] Build protocol-specific forms; never expose arbitrary TypeScript source editing in production Admin.
- [ ] Add unsaved-change protection, revision-conflict refresh and concise Chinese error states.
- [ ] Verify the desktop viewport matrix at 1280x720, 1440x900 and 1920x1080 only.
- [ ] Run Admin tests, dual build, product identity and boundary checks.
- [ ] Commit: `feat: rebuild provider console around selected provider`.

## Task 8: Controlled Provider Migration

**Files:** migration scripts, validation log and Provider system documentation.

- [ ] Keep all Providers in `legacy` after initial deployment and verify Creator/Admin smoke paths.
- [ ] Move MiMo to `shadow`; compare model identity, text output contract and Token usage, then promote to `native` OpenAI-compatible mode.
- [ ] Keep GRSAI and AICopy on the Legacy Bridge until their provider-specific async behavior has equivalent contract tests; do not force them into OpenAI semantics.
- [ ] Validate one RunningHub App and one Workflow in a non-production group with a strict manual quota.
- [ ] Confirm prices, reservations, final charges and failure releases remain unchanged across adapter modes.
- [ ] Record per-Provider migration and rollback evidence.
- [ ] Commit: `chore: validate provider runtime migrations`.

## Task 9: Unified Release And Server Rollout

**Files:** generated release output, governance logs and deployment record.

- [ ] Run backend R2 and R3A-R3U, lint and build.
- [ ] Run all Web source tests, Node boundary tests, Creator/Admin builds and product-identity checks.
- [ ] Run outer `build:release`, `test:release-layout` and `harness:verify:project`.
- [ ] Scan source and generated artifacts for credentials and upstream branding.
- [ ] Deploy a new immutable server release while preserving shared SQLite and OSS paths.
- [ ] Run migrations with a database backup and verify legacy Adapter mode before enabling any native profile.
- [ ] Browser-test support contact, Creator empty-model behavior, Provider rail, model editor, protocol forms and RH test history on desktop.
- [ ] Verify Cloudflare HTTPS, health, Socket.IO and generation task progress.
- [ ] Tag the validated release, push app/web `dev`, fast-forward `main` only after production smoke, and update the outer gitlinks.

## Rollback Rules

- Provider-level rollback changes `migrationState` from `native` or `shadow` to `legacy`.
- Release rollback switches `/opt/apps/stars-flow/current` to the prior immutable release; shared database and OSS are not replaced.
- New tables and columns remain additive during this milestone. No rollback requires destructive schema removal.
- If Creator boundary scans fail, the release is blocked even when Admin and backend tests pass.

## Definition Of Done

- Creator feedback uses configured support contact and no external form URL remains.
- Creator cannot navigate to or bundle Provider configuration.
- Provider console remains usable with 100+ models.
- Super Admin can manage Provider identity, models, schemas, protocols and execution policy without editing code.
- Existing TypeScript adapters still execute through the Legacy Bridge.
- OpenAI-compatible and RunningHub runtime paths are covered by fake and controlled real validation.
- Queue, concurrency, pricing, reservation, settlement and audit behavior remain authoritative in Stars Flow.

