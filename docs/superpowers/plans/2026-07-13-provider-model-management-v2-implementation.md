# Provider And Model Management V2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. This project requires main-agent inline execution; do not dispatch subagents. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete Super Admin Provider and model-management console with protected credentials, model discovery/import, capability tags, structured input constraints, model-specific parameter schemas and validated two-level advanced JSON.

**Architecture:** Extend the additive Provider Runtime tables and APIs while preserving `o_vendorConfig` as credential owner and preserving all Legacy TypeScript adapters. Put model semantics and advanced-config composition in pure backend modules; expose sanitized revisioned DTOs; split the Vue Provider console into focused desktop components that consume those contracts.

**Tech Stack:** TypeScript, Express, Zod, Knex/SQLite, Vue 3, TDesign Vue, Vitest, Node test scripts, existing `aigc-provider-runtime-kit` and Legacy Adapter Bridge.

---

## Execution Rules

- Execute inline with the main agent only.
- Use short-lived app/web feature worktrees based on the latest local `dev` commits.
- Use TDD for every behavior change: write the failing test, observe the intended failure, implement the minimum behavior, then rerun the focused and affected suites.
- Keep real Provider credentials out of source, fixtures, commands, logs and screenshots.
- Keep every migrated Provider in `legacy`; this plan does not promote a Provider to `shadow` or `native`.
- Do not deploy the standalone Web `2449840` hotfix. Include it in the first complete V2 release.
- Validate desktop only at 1280x720, 1440x900 and 1920x1080.

## File Structure

### App

- `src/lib/providerRuntimeSchema.ts`: additive database columns and idempotent backfill.
- `src/services/providerRuntime/modelCapabilities.ts`: tag registry, input-capability normalization and capability templates.
- `src/services/providerRuntime/advancedConfig.ts`: bounded validation, sensitive-field rejection and deterministic Provider/model/task composition.
- `src/services/providerRuntime/providerCredentials.ts`: write-only replace/clear/status operations over the existing credential owner.
- `src/services/providerRuntime/modelDiscovery.ts`: protocol-specific model-list URL, parsing, classification and selective import.
- `src/services/providerRuntime/adminService.ts`: orchestration, revision checks, guarded CRUD and sanitized DTOs only.
- `src/routes/admin/provider-runtime/index.ts`: Zod HTTP contracts and route wiring.
- `src/services/providerRuntime/runtimeKit.ts` and `gateway.ts`: consume composed, validated runtime configuration.
- `src/tests/r3s-provider-runtime.test.ts`: schema, capability and composer contracts.
- `src/tests/r3v-provider-runtime-admin.test.ts`: Super Admin CRUD, credential, discovery/import and audit contracts.
- `src/tests/r3p-provider-adapters.test.ts`: Legacy adapter regression.
- `src/types/database.d.ts`: generated additive table columns.

### Web

- `src/admin/pages/ProvidersPage.vue`: page orchestration, selection and unsaved-change guard.
- `src/admin/components/providers/ProviderRail.vue`: bounded Provider list and filters.
- `src/admin/components/providers/ProviderOverviewEditor.vue`: identity, enablement, adapter, migration state and note.
- `src/admin/components/providers/ProviderConnectionEditor.vue`: Base URL, protocol, protected credential commands, probe and model fetch.
- `src/admin/components/providers/ProviderModelCatalog.vue`: paged catalog, filtering, selective import, create, disable and guarded delete.
- `src/admin/components/providers/ProviderModelEditor.vue`: tags, input capabilities, parameter schema and model advanced config.
- `src/admin/components/providers/AdvancedJsonEditor.vue`: format, validation, reset and merged-preview commands.
- `src/admin/components/providers/ProviderProtocolEditor.vue`: protocol template and Provider advanced config.
- `src/admin/components/providers/ProviderTestHistory.vue`: test commands and redacted history.
- `src/admin/api/adminApi.ts`: sanitized V2 DTOs and commands.
- `src/admin/__tests__/provider-runtime-console.test.ts`: page integration and permission behavior.
- `src/admin/__tests__/provider-model-editor.test.ts`: model capability and JSON editor behavior.
- `src/admin/__tests__/provider-connection-editor.test.ts`: credential/probe/fetch behavior.
- `src/admin/__tests__/admin-api.test.ts`: HTTP client contracts.

---

### Task 1: Add Model Capability And Advanced-Config Storage

**Files:**
- Modify: `app/src/lib/providerRuntimeSchema.ts`
- Modify: `app/src/types/database.d.ts`
- Modify: `app/src/tests/r3s-provider-runtime.test.ts`

- [x] **Step 1: Write failing additive-schema tests**

Require `o_providerRuntimeProfile` to contain `note` and `advancedConfigJson`. Require `o_providerModelProfile` to contain `capabilityTagsJson`, `inputCapabilitiesJson`, `advancedConfigJson` and `protocolOverride`. Verify running the migration twice preserves existing values.

```ts
for (const column of ["capabilityTagsJson", "inputCapabilitiesJson", "advancedConfigJson", "protocolOverride"]) {
  assert.equal(modelColumns.has(column), true, `missing model column ${column}`);
}
assert.equal(providerColumns.has("advancedConfigJson"), true);
assert.equal(providerColumns.has("note"), true);
```

- [x] **Step 2: Run the schema suite and verify RED**

Run: `yarn test:r3s`

Expected: FAIL because the new columns do not exist.

- [x] **Step 3: Add idempotent columns and conservative backfill**

Use text JSON columns with defaults serialized as `{}` or `[]`. Backfill existing models with empty tags and conservative input capabilities; never infer or enable a new capability during migration.

```ts
{ name: "capabilityTagsJson", type: "text", defaultValue: "[]" },
{ name: "inputCapabilitiesJson", type: "text", defaultValue: "{}" },
{ name: "advancedConfigJson", type: "text", defaultValue: "{}" },
{ name: "protocolOverride", type: "string", nullable: true },
```

- [x] **Step 4: Regenerate database types and verify GREEN**

Run against an isolated SQLite file and wait for the repository's asynchronous type generator before closing the connection:

```powershell
yarn cross-env TOONFLOW_NO_AUTOSTART=1 NODE_ENV=dev STARS_DATABASE_FILE=data/provider-model-v2-types.sqlite tsx -e 'import("./src/utils/db.ts").then(async (module) => { await module.dbReady; await new Promise((resolve) => setTimeout(resolve, 8000)); await module.db.destroy(); })'
```

Run: `yarn test:r3s`

Expected: PASS with fresh and repeat migration coverage.

- [x] **Step 5: Commit the app schema slice**

```powershell
git add src/lib/providerRuntimeSchema.ts src/types/database.d.ts src/tests/r3s-provider-runtime.test.ts
git commit -m "feat: add provider model capability storage"
```

### Task 2: Define Capability Templates And Safe Advanced JSON

**Files:**
- Create: `app/src/services/providerRuntime/modelCapabilities.ts`
- Create: `app/src/services/providerRuntime/advancedConfig.ts`
- Modify: `app/src/tests/r3s-provider-runtime.test.ts`

- [x] **Step 1: Write failing capability-contract tests**

Cover the approved tag registry, visual-understanding/reasoning tags, video frame-mode validation, reference-image ranges and conservative defaults.

```ts
assert.deepEqual(normalizeInputCapabilities("video", {
  prompt: true,
  imageReference: { enabled: true, min: 0, max: 3 },
  frameModes: ["first_frame", "first_last_frame"],
}), {
  prompt: true,
  systemPrompt: false,
  imageReference: { enabled: true, min: 0, max: 3 },
  frameModes: ["first_frame", "first_last_frame"],
  mask: false,
  videoReference: false,
  audioReference: false,
});
```

- [x] **Step 2: Write failing advanced-config tests**

Prove recursive credential-like fields, executable expressions, excessive depth, invalid polling bounds and unknown top-level sections are rejected. Prove deterministic merge order and task-parameter allowlisting.

```ts
assert.throws(() => validateAdvancedConfig({ request: { headers: { Authorization: "Bearer value" } } }), /credential|敏感/);
assert.deepEqual(composeRuntimeConfig({
  template: { request: { fixedBody: { a: 1, shared: "template" } } },
  provider: { request: { fixedBody: { b: 2, shared: "provider" } } },
  model: { request: { fixedBody: { c: 3, shared: "model" } } },
  task: { duration: 8 },
  parameterSchema: { duration: { type: "integer", min: 4, max: 12 } },
}).request.fixedBody, { a: 1, b: 2, c: 3, shared: "model", duration: 8 });
```

- [x] **Step 3: Run R3S and verify RED**

Run: `yarn test:r3s`

Expected: FAIL because the new modules are absent.

- [x] **Step 4: Implement pure registries, templates, validators and composer**

Use explicit unions for tags and frame modes. Limit advanced JSON to the approved `request`, `response`, `polling` and `finalLookup` sections. Limit depth to 8, keys to 200 and serialized size to 64 KiB. Validate task values against the constrained parameter schema before composition.

- [x] **Step 5: Run focused and adapter regression suites**

Run: `yarn test:r3s`

Run: `yarn test:r3p`

Expected: PASS; Legacy adapter outputs remain unchanged.

- [x] **Step 6: Commit capability and composition services**

```powershell
git add src/services/providerRuntime/modelCapabilities.ts src/services/providerRuntime/advancedConfig.ts src/tests/r3s-provider-runtime.test.ts
git commit -m "feat: validate provider model capabilities"
```

### Task 3: Complete Provider Identity And Credential Administration

**Files:**
- Create: `app/src/services/providerRuntime/providerCredentials.ts`
- Modify: `app/src/services/providerRuntime/adminService.ts`
- Modify: `app/src/routes/admin/provider-runtime/index.ts`
- Modify: `app/src/tests/r3v-provider-runtime-admin.test.ts`

- [x] **Step 1: Write failing Super Admin credential and Provider tests**

Cover Provider note/default config updates, credential replace, credential clear, masked status, unsaved-draft probe and denial for ordinary Admin. Assert no returned or audited object contains the supplied test secret.

```ts
await replaceProviderCredential(superAdmin, "native-test", "test-secret-value", db);
const status = await getProviderCredentialStatus(superAdmin, "native-test", db);
assert.equal(status.configured, true);
assert.equal(JSON.stringify(status).includes("test-secret-value"), false);
await assert.rejects(replaceProviderCredential(admin, "native-test", "x", db), /SUPER_ADMIN_REQUIRED/);
```

- [x] **Step 2: Run R3V and verify RED**

Run: `yarn test:r3v`

Expected: FAIL because credential lifecycle commands and extended Provider DTOs do not exist.

- [x] **Step 3: Implement write-only credential operations**

Reuse `o_vendorConfig` and the existing protected input-values representation. Return only `configured`, `preview`, `updatedAt` and probe metadata. Never copy credentials into runtime-profile or protocol JSON.

- [x] **Step 4: Extend Provider route schemas**

Add explicit endpoints:

```text
PUT    /admin/provider-runtime/providers/:providerId/credential
DELETE /admin/provider-runtime/providers/:providerId/credential
POST   /admin/provider-runtime/providers/probe-draft
POST   /admin/provider-runtime/providers/:providerId/probe
```

Draft probe accepts a credential only in the request body and does not persist it. Sanitize all errors before response and audit.

- [x] **Step 5: Verify R3V, R3L and TypeScript**

Run: `yarn test:r3v`

Run: `yarn test:r3l`

Run: `yarn lint`

Expected: PASS.

- [x] **Step 6: Commit Provider administration**

```powershell
git add src/services/providerRuntime/providerCredentials.ts src/services/providerRuntime/adminService.ts src/routes/admin/provider-runtime/index.ts src/tests/r3v-provider-runtime-admin.test.ts
git commit -m "feat: complete provider credential administration"
```

### Task 4: Add Model Discovery, Selective Import And Full Model DTOs

**Files:**
- Create: `app/src/services/providerRuntime/modelDiscovery.ts`
- Modify: `app/src/services/providerRuntime/adminService.ts`
- Modify: `app/src/routes/admin/provider-runtime/index.ts`
- Modify: `app/src/tests/r3v-provider-runtime-admin.test.ts`
- Modify: `app/src/tests/r3p-provider-adapters.test.ts`

- [x] **Step 1: Write failing model-list parsing tests**

Cover OpenAI-compatible `{data:[{id}]}`, Gemini `{models:[{name}]}`, duplicate removal, capability suggestions and unsupported catalogs. Use fake fetch responses only.

```ts
assert.deepEqual(parseDiscoveredModels({ data: [{ id: "vision-chat" }, { id: "gpt-image-2" }] }, "standard"), [
  expect.objectContaining({ modelId: "gpt-image-2", suggestedCapability: "image" }),
  expect.objectContaining({ modelId: "vision-chat", suggestedCapability: "text" }),
]);
```

- [x] **Step 2: Write failing selective-import tests**

Prove only selected candidates are created, existing models are skipped, imported suggestions remain disabled by default and ordinary Admin cannot import.

- [x] **Step 3: Run R3V and verify RED**

Run: `yarn test:r3v`

Expected: FAIL because discovery/import services and routes are absent.

- [x] **Step 4: Implement discovery and import**

Resolve the model-list URL from the saved protocol/Base URL. Return candidates only; never persist raw upstream responses. Import through the same model validator used by manual creation, with `enabled: false`, revision 1 and conservative defaults.

Add endpoints:

```text
POST /admin/provider-runtime/providers/:providerId/fetch-models
POST /admin/provider-runtime/providers/:providerId/import-models
```

- [x] **Step 5: Expand model create/update/list DTOs**

Add `capabilityTags`, `inputCapabilities`, `advancedConfig` and `protocolOverride`. Validate tags and advanced config before storage. Include fields in sanitized list responses.

- [x] **Step 6: Verify backend suites**

Run: `yarn test:r3v`

Run: `yarn test:r3s`

Run: `yarn test:r3p`

Run: `yarn lint`

Expected: PASS.

- [x] **Step 7: Commit model discovery and DTOs**

```powershell
git add src/services/providerRuntime/modelDiscovery.ts src/services/providerRuntime/adminService.ts src/routes/admin/provider-runtime/index.ts src/tests/r3v-provider-runtime-admin.test.ts src/tests/r3p-provider-adapters.test.ts
git commit -m "feat: discover and import provider models"
```

### Task 5: Add Web API Contracts And Split The Provider Console

**Files:**
- Modify: `web/src/admin/api/adminApi.ts`
- Modify: `web/src/admin/__tests__/admin-api.test.ts`
- Modify: `web/src/admin/pages/ProvidersPage.vue`
- Create: `web/src/admin/components/providers/ProviderRail.vue`
- Create: `web/src/admin/components/providers/ProviderOverviewEditor.vue`
- Create: `web/src/admin/components/providers/ProviderTestHistory.vue`
- Modify: `web/src/admin/__tests__/provider-runtime-console.test.ts`

- [x] **Step 1: Write failing Admin API client tests**

Cover credential replace/clear, draft/saved probe, fetch/import, complete model DTOs and guarded delete endpoints. Assert validators reject secret-bearing GET responses.

- [x] **Step 2: Write failing page split and permission tests**

Prove stable Provider selection, ordinary Admin read-only behavior, Super Admin create/delete commands, bounded model workspace and no TypeScript editor.

- [x] **Step 3: Run focused Web tests and verify RED**

Run: `yarn vitest run src/admin/__tests__/admin-api.test.ts src/admin/__tests__/provider-runtime-console.test.ts`

Expected: FAIL for missing V2 contracts/components.

- [x] **Step 4: Implement V2 DTOs and extract stable components**

Keep data fetching and unsaved-change orchestration in `ProvidersPage.vue`. Move rail, overview and history rendering into focused components with typed props/events. Do not change route ownership or Creator bundles.

- [x] **Step 5: Verify focused and full Admin tests**

Run: `yarn vitest run src/admin/__tests__/admin-api.test.ts src/admin/__tests__/provider-runtime-console.test.ts`

Run: `yarn test:admin:unit`

Expected: PASS.

- [x] **Step 6: Commit Web contracts and page decomposition**

```powershell
git add src/admin/api/adminApi.ts src/admin/__tests__/admin-api.test.ts src/admin/pages/ProvidersPage.vue src/admin/components/providers/ProviderRail.vue src/admin/components/providers/ProviderOverviewEditor.vue src/admin/components/providers/ProviderTestHistory.vue src/admin/__tests__/provider-runtime-console.test.ts
git commit -m "refactor: split provider runtime console"
```

### Task 6: Build Provider Connection, Credential And Discovery Workspace

**Files:**
- Create: `web/src/admin/components/providers/ProviderConnectionEditor.vue`
- Create: `web/src/admin/components/providers/ProviderModelCatalog.vue`
- Create: `web/src/admin/__tests__/provider-connection-editor.test.ts`
- Modify: `web/src/admin/pages/ProvidersPage.vue`
- Modify: `web/src/admin/__tests__/provider-runtime-console.test.ts`

- [x] **Step 1: Write failing connection-editor tests**

Prove Base URL/protocol editing, masked credential state, replace/clear confirmation, unsaved draft probe, saved probe and no credential redisplay.

- [x] **Step 2: Write failing catalog tests**

Prove fetch does not auto-import, picker search/filter/selection works, capability suggestions are editable, duplicates are marked and imported models start disabled.

- [x] **Step 3: Run focused tests and verify RED**

Run: `yarn vitest run src/admin/__tests__/provider-connection-editor.test.ts src/admin/__tests__/provider-runtime-console.test.ts`

Expected: FAIL because the components are absent.

- [x] **Step 4: Implement Provider connection editor**

Use password input only for a new replacement value. Clear the local value immediately after submit. Show status, preview and latest probe metadata without exposing raw upstream responses.

- [x] **Step 5: Implement model discovery picker and catalog**

Use a bounded dialog and paged table. Provide manual creation, selective import, enable/disable, edit and guarded delete commands. Use icons for refresh, add, delete and test commands with tooltips.

- [x] **Step 6: Verify Admin tests, builds and boundary checks**

Run: `yarn test:admin:unit`

Run: `yarn build:admin`

Run: `yarn build:creator`

Run: `yarn check:build-boundaries`

Expected: PASS; Creator output contains no Provider mutation or credential markers.

- [x] **Step 7: Commit Provider connection and discovery UI**

```powershell
git add src/admin/components/providers/ProviderConnectionEditor.vue src/admin/components/providers/ProviderModelCatalog.vue src/admin/__tests__/provider-connection-editor.test.ts src/admin/pages/ProvidersPage.vue src/admin/__tests__/provider-runtime-console.test.ts
git commit -m "feat: manage provider connections and model discovery"
```

### Task 7: Build Capability, Parameter And Advanced JSON Editors

**Files:**
- Create: `web/src/admin/components/providers/AdvancedJsonEditor.vue`
- Create: `web/src/admin/components/providers/ProviderModelEditor.vue`
- Create: `web/src/admin/components/providers/ProviderProtocolEditor.vue`
- Create: `web/src/admin/__tests__/provider-model-editor.test.ts`
- Modify: `web/src/admin/pages/ProvidersPage.vue`

- [x] **Step 1: Write failing capability-editor tests**

Cover visual understanding, reasoning/reasoning-control, multi-reference image limits and valid video frame-mode combinations. Prove changing primary type offers but does not silently apply a destructive template reset.

- [x] **Step 2: Write failing Advanced JSON tests**

Cover invalid JSON, format, validation error display, reset confirmation, Provider/model merge preview and redaction of credential-like keys.

- [x] **Step 3: Run focused tests and verify RED**

Run: `yarn vitest run src/admin/__tests__/provider-model-editor.test.ts`

Expected: FAIL because editors are absent.

- [x] **Step 4: Implement structured capability and parameter controls**

Use checkbox/tag groups for capability tags, numeric controls for reference bounds, a multi-select for frame modes and capability-specific parameter templates. Keep the raw parameter-schema JSON in an advanced collapsible section with validation and formatting.

- [x] **Step 5: Implement Provider/model Advanced JSON editor**

Provide format, validate, reset and merged-preview commands. Never include arbitrary code execution or a source editor. Keep editor dimensions stable so long JSON cannot resize the page.

- [x] **Step 6: Implement protocol templates**

Expose the seven approved templates. Render structured fields for common paths and polling bounds while preserving the validated JSON area for incompatible declarative mappings.

- [x] **Step 7: Verify Web gates**

Run: `yarn test:admin:unit`

Run: `yarn build-only`

Run: `yarn check:build-boundaries`

Run: `yarn check:product-identity`

Run: `yarn test:product-identity`

Expected: PASS.

- [x] **Step 8: Commit model and protocol editors**

```powershell
git add src/admin/components/providers/AdvancedJsonEditor.vue src/admin/components/providers/ProviderModelEditor.vue src/admin/components/providers/ProviderProtocolEditor.vue src/admin/__tests__/provider-model-editor.test.ts src/admin/pages/ProvidersPage.vue
git commit -m "feat: edit provider model capabilities"
```

### Task 8: Integrate Composed Configuration With Runtime And Tests

**Files:**
- Modify: `app/src/services/providerRuntime/runtimeKit.ts`
- Modify: `app/src/services/providerRuntime/gateway.ts`
- Modify: `app/src/services/providerRuntime/productionText.ts`
- Modify: `app/src/tests/r3s-provider-runtime.test.ts`
- Modify: `app/src/tests/r3w-provider-migration.test.ts`
- Modify: `app/src/tests/r3r-model-pricing.test.ts`

- [x] **Step 1: Write failing runtime-composition tests**

Prove Provider defaults and model overrides produce the expected normalized request, unsupported task parameters are rejected, frame modes are enforced and Legacy mode does not consume declarative mappings.

- [x] **Step 2: Write failing accounting regression tests**

Prove composed configuration does not alter reservation, settlement, failure release or concurrency ownership.

- [x] **Step 3: Run R3S/R3R/R3W and verify RED**

Run: `yarn test:r3s`

Run: `yarn test:r3r`

Run: `yarn test:r3w`

Expected: at least the new composition assertions fail.

- [x] **Step 4: Integrate the pure composer at the gateway boundary**

Compose only for declarative/native routes. Legacy routes continue to call their registered TypeScript adapters with existing normalized inputs. Preserve Stars Flow's outer timeout, cancellation and billing sequence.

- [x] **Step 5: Run backend release matrix**

Run: `yarn test:r3p`

Run: `yarn test:r3r`

Run: `yarn test:r3s`

Run: `yarn test:r3u`

Run: `yarn test:r3v`

Run: `yarn test:r3w`

Run: `yarn lint`

Run: `yarn build`

Expected: PASS.

- [x] **Step 6: Commit runtime integration**

```powershell
git add src/services/providerRuntime/runtimeKit.ts src/services/providerRuntime/gateway.ts src/services/providerRuntime/productionText.ts src/tests/r3s-provider-runtime.test.ts src/tests/r3w-provider-migration.test.ts src/tests/r3r-model-pricing.test.ts
git commit -m "feat: compose provider model runtime configuration"
```

### Task 9: Integrate, Browser-Test And Release

**Files:**
- Modify: `docs/logbooks/daily/2026-07-13.md`
- Modify: `docs/logbooks/progress/functional-reform-status.md`
- Create: `docs/logbooks/validations/2026-07-13-provider-model-management-v2.md`
- Modify: outer `app` and `web` gitlinks

- [x] **Step 1: Fast-forward app/web feature commits into local `dev`**

Use `git merge --ff-only`. Do not push or update `main` yet.

- [x] **Step 2: Run complete local release gates**

App: R2 and all available R3 suites, TypeScript and build.

Web: all source tests, Admin tests, Creator/Admin builds, build boundaries and product identity.

Outer:

```powershell
npm run build:release
npm run test:release-layout
npm run harness:verify:project
```

- [x] **Step 3: Scan source and generated output**

Reject credential-shaped values, upstream branding, external form URLs and Creator Provider-mutation markers.

- [x] **Step 4: Run local desktop browser acceptance**

At 1280x720, 1440x900 and 1920x1080 verify Provider selection, edit/save, credential replace/clear using fixture data, probe, model fetch/import, manual model creation, tag/input/schema editing, advanced JSON validation/preview, guarded deletion, ordinary Admin read-only behavior and Creator model consumption.

- [x] **Step 5: Commit release assets, gitlinks and validation records**

Keep app, web and outer commits separate and record exact hashes in the validation log.

- [x] **Step 6: Push `dev` with fast-forward-only history**

Push app and web `dev`; the outer governance repository has no remote.

- [x] **Step 7: Deploy one immutable server release after explicit rollout authorization**

Back up shared SQLite, preserve shared OSS, run additive migrations, keep every Provider Legacy, switch `current` atomically and retain the prior release for rollback.

- [x] **Step 8: Run production smoke without exposing secrets**

Verify HTTPS, Creator/Admin, Socket.IO, Provider rail, model editor, protocol editor, test history and one controlled generation-progress path. Create any temporary acceptance records with a unique prefix and remove them before completion.

Release deviation: no new paid generation was submitted because the production catalog intentionally had zero enabled models. The R4 real text/image/video production-chain evidence was retained as the paid baseline, while this release verified the empty-catalog boundary and the unchanged queue/accounting regressions.

- [x] **Step 9: Tag and evaluate `main` fast-forward**

Only after production smoke passes, tag app/web/outer validated commits and fast-forward app/web `main`. Update the outer release gitlinks to the exact validated main commits.

---

## Definition Of Done

- Super Admin can fully administer Provider identity, protected credentials, connectivity, model discovery/import, models, tags, inputs, parameters, protocols, tests and safe deletion.
- Ordinary Admin cannot mutate global Provider/model resources.
- Creator contains no Provider mutation or credential-management code.
- Visual understanding, reasoning control, multi-reference images and video frame combinations are represented structurally and enforced server-side.
- Provider and model Advanced JSON compose deterministically, reject sensitive/executable content and provide a redacted preview.
- Legacy TypeScript adapters and Stars Flow queue, concurrency, pricing and accounting behavior remain unchanged.
- Local and production desktop acceptance passes with no temporary account, model, Provider, task or credential residue.
