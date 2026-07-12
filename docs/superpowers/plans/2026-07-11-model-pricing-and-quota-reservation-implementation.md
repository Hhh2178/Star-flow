# Model Pricing And Quota Reservation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add model-level per-request, per-second and split Token pricing with immutable queue snapshots, atomic quota reservation, exact settlement and Admin/Creator billing interfaces.

**Architecture:** A focused pricing service owns rule validation, canonical model resolution and micro-yuan arithmetic. The generation queue calls a reservation service in the same transaction that creates jobs; terminal scheduler paths call one settlement/release service. Admin APIs expose sanitized model pricing and scoped quota/usage details, while frontend dialogs consume those contracts without reading Provider credentials.

**Tech Stack:** TypeScript, Express, Knex/SQLite, Node test runner, Vue 3, TDesign Vue Next, Vitest.

---

## File Map

### App files to create

- `app/src/services/modelPricing.ts`: pricing types, validation, canonical target resolution, version management and formulas.
- `app/src/services/quotaReservation.ts`: reserve, settle and release operations.
- `app/src/routes/admin/providers/getPricing.ts`: Super Admin pricing list route.
- `app/src/routes/admin/providers/updatePricing.ts`: Super Admin pricing version update route.
- `app/src/routes/generation/getPricingEstimate.ts`: scoped estimate route.
- `app/src/tests/r3r-model-pricing.test.ts`: pricing, reservation, settlement and API regression suite.

### App files to modify

- `app/src/lib/initDB.ts`: fresh schema.
- `app/src/lib/fixDB.ts`: idempotent upgrade, legacy job handling and default prices.
- `app/src/types/database.d.ts`: regenerated after final schema is stable.
- `app/src/types/generationQueue.ts`: pricing, units and reservation types.
- `app/src/services/generationQueue.ts`: atomic price snapshot and reservation at enqueue; queued cancellation release.
- `app/src/services/generationUsage.ts`: final settlement instead of direct debit.
- `app/src/services/generationScheduler.ts`: release on terminal failure/cancellation and preserve recovering reservations.
- `app/src/services/groupManagement.ts`: initialize expanded quota account fields.
- `app/src/services/quotaManagement.ts`: reserved/available/debt overview and debt recovery after top-up.
- `app/src/services/adminSettings.ts`: sanitized pricing summary in Provider overview.
- `app/src/services/adminMonitoring.ts`: parsed unit and pricing snapshot DTOs.
- `app/src/jobs/handlers/coreTextExecutor.ts`: normalized request and Token units.
- `app/src/jobs/handlers/coreImageExecutor.ts`: request/image units with snapshot-owned cost.
- `app/src/jobs/handlers/coreVideoExecutor.ts`: request/seconds units with snapshot-owned cost.
- `app/src/services/agentQueue.ts`: canonical text target and Token metering propagation.
- `app/src/router.ts`: generated route registration.
- `app/package.json`: `test:r3r` script.
- `app/data/serve/app.js`: rebuilt runtime.

### Web files to modify

- `web/src/admin/api/adminApi.ts`: pricing, quota and usage DTOs, guards and API calls.
- `web/src/admin/pages/ProvidersPage.vue`: per-model pricing summaries and edit dialog.
- `web/src/admin/pages/QuotaPage.vue`: balance/reserved/available/debt display.
- `web/src/admin/pages/UsagePage.vue`: units, billing mode, snapshot and final charge.
- `web/src/admin/__tests__/admin-settings-api.test.ts`: pricing endpoint contracts.
- `web/src/admin/__tests__/settings-pages.test.ts`: pricing dialog permissions and validation.
- `web/src/admin/__tests__/quota-page.test.ts`: reserved/available/debt rendering.
- `web/src/admin/__tests__/monitoring-pages.test.ts`: usage pricing snapshot rendering.
- `web/src/utils/generationJobTracker.ts`: surface stable billing rejection messages where needed.
- Creator image/video submission components that currently call generation endpoints: add estimate display without exposing global configuration.

### Governance files to modify

- `docs/systems/providers/README.md`: pricing ownership and model modes.
- `docs/logbooks/validations/2026-07-11-real-provider-loading.md`: fake-executor and real low-cost evidence.
- `docs/logbooks/daily/2026-07-11.md`: implementation and validation ledger.

---

## Task 1: Schema And Default Pricing Migration

**Files:**
- Modify: `app/src/lib/initDB.ts`
- Modify: `app/src/lib/fixDB.ts`
- Test: `app/src/tests/r3r-model-pricing.test.ts`
- Modify: `app/package.json`

- [ ] **Step 1: Add the R3R test command and failing schema assertions**

Add this script:

```json
"test:r3r": "cross-env TOONFLOW_NO_AUTOSTART=1 NODE_ENV=dev tsx --test src/tests/r3r-model-pricing.test.ts"
```

Create the test file with an in-memory Knex database and assert these tables/columns after `initDB` plus the queue migration:

```ts
test("pricing and reservation schema exists", async () => {
  const db = createTestDB();
  await initDB(db, false, false);
  await migrateGenerationQueue(db);

  assert.equal(await db.schema.hasTable("o_modelPricing"), true);
  assert.equal(await db.schema.hasTable("o_quotaReservation"), true);
  assert.equal(await db.schema.hasColumn("o_quotaAccount", "reservedBalance"), true);
  assert.equal(await db.schema.hasColumn("o_quotaAccount", "billingStatus"), true);
  assert.equal(await db.schema.hasColumn("o_generationJob", "pricingSnapshotJson"), true);
  assert.equal(await db.schema.hasColumn("o_generationJob", "reservedAmount"), true);
  await db.destroy();
});
```

- [ ] **Step 2: Run the schema test and verify RED**

Run:

```powershell
yarn test:r3r
```

Expected: FAIL because `o_modelPricing` and `o_quotaReservation` do not exist.

- [ ] **Step 3: Implement fresh and upgrade schemas**

Create both tables with the exact columns from the approved spec. Add unique constraints:

```ts
table.unique(["providerId", "modelId", "version"]);
table.unique(["jobId"]);
```

Add `reservedBalance`, `billingStatus`, `pricingSnapshotJson` and `reservedAmount` through idempotent `ensureColumn` operations. Existing quota accounts receive `reservedBalance = 0` and `billingStatus = balance < 0 ? "debt" : "active"`.

- [ ] **Step 4: Add failing default seed assertions**

```ts
test("migration seeds the four approved prices once", async () => {
  await migrateGenerationQueue(db);
  await migrateGenerationQueue(db);
  const rows = await db("o_modelPricing").where({ status: "active" }).orderBy(["providerId", "modelId"]);
  assert.deepEqual(rows.map(({ providerId, modelId, billingMode, requestPrice }) => ({
    providerId,
    modelId,
    billingMode,
    requestPrice: Number(requestPrice),
  })), [
    { providerId: "aicopy", modelId: "grok-imagine-video-1.5-preview", billingMode: "per_request", requestPrice: 0.18 },
    { providerId: "grsai", modelId: "gpt-image-2", billingMode: "per_request", requestPrice: 0.06 },
    { providerId: "mimo", modelId: "mimo-v2.5", billingMode: "per_request", requestPrice: 0.05 },
    { providerId: "mimo", modelId: "mimo-v2.5-pro", billingMode: "per_request", requestPrice: 0.05 },
  ]);
});
```

- [ ] **Step 5: Implement idempotent version-1 seed data**

Insert only when the exact Provider/model has no active row. Do not modify historical usage and do not synthesize reservations for pre-migration queued/running jobs.

- [ ] **Step 6: Run R3R and existing migration suites**

```powershell
yarn test:r3r
yarn test:r3a
yarn test:r3d
yarn test:r3f
```

Expected: all pass.

- [ ] **Step 7: Commit the schema unit**

```powershell
git add package.json src/lib/initDB.ts src/lib/fixDB.ts src/tests/r3r-model-pricing.test.ts
git commit -m "feat: add model pricing and quota reservation schema"
```

---

## Task 2: Pure Pricing Engine And Canonical Target Resolution

**Files:**
- Create: `app/src/services/modelPricing.ts`
- Modify: `app/src/types/generationQueue.ts`
- Test: `app/src/tests/r3r-model-pricing.test.ts`

- [ ] **Step 1: Write failing formula tests**

Add tests for these exact results:

```ts
assert.equal(calculateReservedCost(perRequest(0.18), { requests: 1 }), 0.18);
assert.equal(calculateActualCost(perSecond(0.03), { seconds: 6 }), 0.18);
assert.equal(calculateActualCost(perToken(2, 8, 0.05), {
  inputTokens: 125_000,
  outputTokens: 25_000,
}), 0.45);
assert.equal(calculateActualCost(perToken(2, 8, 0.05), {
  inputTokens: 125_000,
}), 0.05);
```

Also assert zero price is valid, seven-decimal input is rejected, and missing per-mode fields raise `PRICING_FIELDS_INCOMPLETE`.

- [ ] **Step 2: Run R3R and verify formula RED**

Expected: FAIL because pricing functions do not exist.

- [ ] **Step 3: Implement pricing types and integer arithmetic**

Define:

```ts
export type BillingMode = "per_request" | "per_second" | "per_token";

export interface PricingSnapshot {
  pricingId: number;
  providerId: string;
  modelId: string;
  taskType: GenerationTaskType;
  billingMode: BillingMode;
  requestPrice?: number;
  secondPrice?: number;
  inputPricePerMillion?: number;
  outputPricePerMillion?: number;
  fallbackRequestPrice?: number;
  currency: "CNY";
  version: number;
  effectiveAt: number;
}

export interface BillingUnits {
  requests?: number;
  images?: number;
  seconds?: number;
  inputTokens?: number;
  outputTokens?: number;
}
```

Use `toMoneyMicros`/`fromMoneyMicros` and BigInt multiplication for Token calculations. Round only when converting the combined Token numerator back to micro-yuan.

- [ ] **Step 4: Write failing target-resolution tests**

Seed `o_agentDeploy` so `universalAi` points to MiMo and assert:

```ts
assert.deepEqual(await resolvePricingTarget("text", "universalAi", db), {
  providerId: "mimo",
  modelId: "mimo-v2.5",
  canonicalModel: "mimo:mimo-v2.5",
});
assert.deepEqual(await resolvePricingTarget("image", "grsai:gpt-image-2", db), {
  providerId: "grsai",
  modelId: "gpt-image-2",
  canonicalModel: "grsai:gpt-image-2",
});
```

- [ ] **Step 5: Implement alias and canonical resolution**

Text aliases resolve through `o_agentDeploy.vendorId/modelName`. Image/video split on the first colon. Reject missing or task-incompatible active pricing with stable `ModelPricingError` codes.

- [ ] **Step 6: Implement price version mutation service**

`updateModelPricing(actor, input, db)` must require Super Admin, validate the model against `o_vendorConfig.models`, supersede the prior active row, insert `version + 1`, and write `pricing.update` audit data without credentials.

- [ ] **Step 7: Run R3R and type check**

```powershell
yarn test:r3r
yarn lint
```

- [ ] **Step 8: Commit the pricing engine**

```powershell
git add src/services/modelPricing.ts src/types/generationQueue.ts src/tests/r3r-model-pricing.test.ts
git commit -m "feat: add model pricing engine"
```

---

## Task 3: Atomic Enqueue Reservation And Idempotency

**Files:**
- Create: `app/src/services/quotaReservation.ts`
- Modify: `app/src/services/generationQueue.ts`
- Modify: `app/src/services/generationWorkflows.ts`
- Modify: `app/src/services/productionTextWorkflows.ts`
- Modify: `app/src/services/agentQueue.ts`
- Test: `app/src/tests/r3r-model-pricing.test.ts`
- Test: `app/src/tests/r3b-generation-queue.test.ts`

- [ ] **Step 1: Write failing reservation tests**

Test a group with balance `0.20`, then enqueue one `0.18` job:

```ts
const job = await enqueueGeneration(actor, pricedVideoInput, db);
const account = await db("o_quotaAccount").where({ groupId: actor.groupId }).first();
const reservation = await db("o_quotaReservation").where({ jobId: job.id }).first();
assert.equal(Number(account.reservedBalance), 0.18);
assert.equal(Number(reservation.reservedAmount), 0.18);
assert.equal(reservation.status, "reserved");
assert.equal(JSON.parse(job.pricingSnapshotJson).requestPrice, 0.18);
```

Replay the same idempotency key and assert reservation count remains one. Enqueue another `0.18` job and assert `INSUFFICIENT_QUOTA` with no second job row.

- [ ] **Step 2: Run tests and verify RED**

Expected: job is inserted without pricing or reservation.

- [ ] **Step 3: Implement `reserveQuotaForJob`**

The function receives the transaction, inserted job ID, project/group, canonical target and submitted units. It loads active pricing, calculates the reservation, checks `billingStatus` and `balance - reservedBalance`, inserts one reservation, increments `reservedBalance`, and updates the job snapshot.

- [ ] **Step 4: Refactor enqueue into one transaction**

`enqueueGeneration` must perform project scope, duplicate lookup, job insert and reservation in `inTransaction`. Duplicate validation occurs before any new reservation. Add submitted billing units to `EnqueueGenerationInput`, with defaults:

```ts
text: { requests: 1 }
image: { requests: 1, images: 1 }
video: { requests: 1, seconds: payload.duration }
```

- [ ] **Step 5: Add batch atomicity tests**

For two image items at `0.06` each and `0.10` available, assert the whole workflow transaction rejects and creates neither image jobs nor reservations. This prevents partially submitted batches.

- [ ] **Step 6: Add debt and missing-pricing tests**

Assert `ACCOUNT_IN_DEBT` and `PRICING_NOT_CONFIGURED` are returned before Provider execution.

- [ ] **Step 7: Run queue/workflow suites**

```powershell
yarn test:r3r
yarn test:r3b
yarn test:r3g
yarn test:r3i
yarn test:r3j
```

- [ ] **Step 8: Commit atomic reservation**

```powershell
git add src/services/quotaReservation.ts src/services/generationQueue.ts src/services/generationWorkflows.ts src/services/productionTextWorkflows.ts src/services/agentQueue.ts src/tests/r3r-model-pricing.test.ts src/tests/r3b-generation-queue.test.ts
git commit -m "feat: reserve quota when generation jobs enter queue"
```

---

## Task 4: Settlement, Release, Debt And Retry Safety

**Files:**
- Modify: `app/src/services/quotaReservation.ts`
- Modify: `app/src/services/generationUsage.ts`
- Modify: `app/src/services/generationScheduler.ts`
- Modify: `app/src/services/generationQueue.ts`
- Modify: `app/src/services/quotaManagement.ts`
- Test: `app/src/tests/r3r-model-pricing.test.ts`
- Test: `app/src/tests/r3b-generation-queue.test.ts`
- Test: `app/src/tests/r3h-running-cancellation.test.ts`

- [ ] **Step 1: Write failing success settlement tests**

Cover:

```ts
await completeGenerationUsage(job.id, result, {
  providerId: "aicopy",
  modelId: "aicopy:grok-imagine-video-1.5-preview",
  units: { requests: 1, seconds: 6 },
  estimatedCost: null,
  currency: null,
  pricingSnapshot: {},
  providerRequestId: null,
}, db);

assert.equal(Number(account.balance), 0.82);
assert.equal(Number(account.reservedBalance), 0);
assert.equal(reservation.status, "settled");
assert.equal(Number(usage.estimatedCost), 0.18);
```

The test deliberately passes no executor cost; settlement must use the job snapshot.

- [ ] **Step 2: Write Token refund and debt tests**

Reserve fallback `0.05`. Assert actual `0.03` settles at `0.03`, and actual `0.30` can move a `0.20` balance to `-0.10`, set `billingStatus = debt`, then block another enqueue. A `0.10` top-up restores active status.

- [ ] **Step 3: Run tests and verify RED**

Expected: old `generationUsage` uses executor `estimatedCost` and does not manage reservations.

- [ ] **Step 4: Implement `settleQuotaReservation`**

Load the unique reserved record and job snapshot, compute final cost from actual units, insert usage and quota debit once, decrement reserved balance, decrement balance, mark reservation settled, and set debt status atomically.

- [ ] **Step 5: Implement `releaseQuotaReservation`**

Release only `reserved` rows. Decrement `reservedBalance` with a floor at zero, set status/reason/timestamp, and create no usage debit.

- [ ] **Step 6: Wire every terminal path**

- Queued cancellation releases immediately.
- Running cancellation releases only when the worker transitions to `cancelled`.
- `failed` releases.
- unrecoverable `needs_attention` releases only when Provider completion is not known; if settlement safety is uncertain, keep the reservation and set `RESERVATION_NOT_FOUND`/attention for review.
- `recovering` retains reservation.

- [ ] **Step 7: Verify retries and duplicate callbacks**

Call success completion twice and failure release twice. Assert one usage row, one debit row, one reservation transition and stable balances.

- [ ] **Step 8: Run terminal-state suites**

```powershell
yarn test:r3r
yarn test:r3b
yarn test:r3h
yarn test:r3k
yarn test:r3m
```

- [ ] **Step 9: Commit settlement and release**

```powershell
git add src/services/quotaReservation.ts src/services/generationUsage.ts src/services/generationScheduler.ts src/services/generationQueue.ts src/services/quotaManagement.ts src/tests
git commit -m "feat: settle and release generation quota reservations"
```

---

## Task 5: Executor Units And Text Token Usage

**Files:**
- Modify: `app/src/jobs/handlers/coreTextExecutor.ts`
- Modify: `app/src/jobs/handlers/coreImageExecutor.ts`
- Modify: `app/src/jobs/handlers/coreVideoExecutor.ts`
- Modify: `app/src/services/agentQueue.ts`
- Modify: `app/src/types/generationQueue.ts`
- Test: `app/src/tests/r3g-generation-entrypoints.test.ts`
- Test: `app/src/tests/r3i-production-text-entrypoints.test.ts`
- Test: `app/src/tests/r3p-provider-adapters.test.ts`
- Test: `app/src/tests/r3r-model-pricing.test.ts`

- [ ] **Step 1: Write failing normalized-unit tests**

Mock text invocation results using both common usage shapes:

```ts
{ usage: { inputTokens: 120, outputTokens: 30 } }
{ usage: { promptTokens: 120, completionTokens: 30 } }
```

Assert both produce `{ requests: 1, inputTokens: 120, outputTokens: 30 }`. Missing usage produces `{ requests: 1 }` so Token pricing applies fallback.

- [ ] **Step 2: Add image/video unit assertions**

Image returns `{ requests: 1, images: 1 }`; video returns `{ requests: 1, seconds: submittedDuration }`. Provider code must not calculate business price.

- [ ] **Step 3: Run executor suites and verify RED**

Expected: executor metering has null cost and empty/incomplete units.

- [ ] **Step 4: Implement `normalizeTextUsage`**

Use one helper to read integer non-negative input/output counts from supported response fields. Extend the internal invocation result type without returning raw Provider responses or credentials.

- [ ] **Step 5: Canonicalize metering identities**

Metering identifies the actual Provider/model resolved at enqueue. Preserve the immutable job snapshot as the pricing authority; executor identity is diagnostic and must match snapshot before settlement.

- [ ] **Step 6: Run Provider and production tests**

```powershell
yarn test:r3g
yarn test:r3i
yarn test:r3j
yarn test:r3p
yarn test:r3r
yarn lint
```

- [ ] **Step 7: Commit normalized metering**

```powershell
git add src/jobs/handlers src/services/agentQueue.ts src/types/generationQueue.ts src/tests
git commit -m "feat: collect billable generation units"
```

---

## Task 6: Admin Pricing, Estimate, Usage And Quota APIs

**Files:**
- Create: `app/src/routes/admin/providers/getPricing.ts`
- Create: `app/src/routes/admin/providers/updatePricing.ts`
- Create: `app/src/routes/generation/getPricingEstimate.ts`
- Modify: `app/src/services/adminSettings.ts`
- Modify: `app/src/services/adminMonitoring.ts`
- Modify: `app/src/services/quotaManagement.ts`
- Modify: `app/src/router.ts`
- Test: `app/src/tests/r3l-admin-settings.test.ts`
- Test: `app/src/tests/r3d-admin-operations.test.ts`
- Test: `app/src/tests/r3e-admin-monitoring.test.ts`
- Test: `app/src/tests/r3r-model-pricing.test.ts`

- [ ] **Step 1: Write failing permission and DTO tests**

Assert:

- Super Admin can list/update pricing.
- Admin and Creator receive `403` from pricing mutation.
- Creator estimate returns only its own group balances.
- Provider overview contains sanitized pricing but no `inputValues`.
- Usage rows parse `unitJson` and `pricingSnapshotJson`.
- Quota summary returns balance, reserved, available and billing status.

- [ ] **Step 2: Run API tests and verify RED**

Expected: routes and fields are absent.

- [ ] **Step 3: Implement routes with strict Zod validation**

`updatePricing` accepts only mode-compatible fields and CNY. `getPricingEstimate` accepts task type, model, and known submitted units; it reuses the same pricing calculator as enqueue but does not reserve funds.

- [ ] **Step 4: Extend Admin monitoring DTOs**

Return:

```ts
units: BillingUnits;
pricingSnapshot: PricingSnapshot | null;
billingMode: BillingMode | null;
finalCost: number | null;
```

Keep `estimatedCost` temporarily for backward compatibility and set `finalCost` from the same persisted value.

- [ ] **Step 5: Extend quota DTOs**

Summary and each group include:

```ts
balance: number;
reservedBalance: number;
availableBalance: number;
billingStatus: "active" | "debt";
```

- [ ] **Step 6: Regenerate router and verify route contracts**

Run the repository route-generation command if configured; otherwise update `src/router.ts` through the established generator, not manual numbering. Confirm exact paths:

```text
/api/admin/providers/getPricing
/api/admin/providers/updatePricing
/api/generation/getPricingEstimate
```

- [ ] **Step 7: Run Admin API suites**

```powershell
yarn test:r3l
yarn test:r3d
yarn test:r3e
yarn test:r3r
yarn lint
```

- [ ] **Step 8: Commit API contracts**

```powershell
git add src/routes src/services/adminSettings.ts src/services/adminMonitoring.ts src/services/quotaManagement.ts src/router.ts src/tests
git commit -m "feat: expose model pricing and quota reservation APIs"
```

---

## Task 7: Admin Pricing And Billing UI

**Files:**
- Modify: `web/src/admin/api/adminApi.ts`
- Modify: `web/src/admin/pages/ProvidersPage.vue`
- Modify: `web/src/admin/pages/QuotaPage.vue`
- Modify: `web/src/admin/pages/UsagePage.vue`
- Modify: `web/src/admin/__tests__/admin-settings-api.test.ts`
- Modify: `web/src/admin/__tests__/settings-pages.test.ts`
- Modify: `web/src/admin/__tests__/quota-page.test.ts`
- Modify: `web/src/admin/__tests__/monitoring-pages.test.ts`

- [ ] **Step 1: Write failing API guard tests**

Add fixtures for all three modes and reject malformed values such as string prices, missing Token fallback, unknown mode, negative reserved balance and absent pricing version.

- [ ] **Step 2: Write failing Providers page tests**

Assert one `计价设置` action per model for Super Admin, no mutation action for group Admin, segmented mode switching, required fields, six-decimal validation and a successful refresh after update.

- [ ] **Step 3: Write failing Quota/Usage page tests**

Assert Chinese labels for `余额`, `冻结额度`, `可用额度`, `欠费`; usage rows show `按次/按秒/Token`, units, snapshot version and final CNY charge.

- [ ] **Step 4: Run focused Vitest files and verify RED**

```powershell
yarn vitest run src/admin/__tests__/admin-settings-api.test.ts src/admin/__tests__/settings-pages.test.ts src/admin/__tests__/quota-page.test.ts src/admin/__tests__/monitoring-pages.test.ts
```

- [ ] **Step 5: Implement typed API contracts and guards**

Add `BillingMode`, `PricingRule`, `PricingUpdateInput`, expanded quota/usage DTOs, `getProviderPricing`, `updateProviderPricing`, and estimate types. Do not accept malformed backend data silently.

- [ ] **Step 6: Implement pricing dialog**

Use TDesign segmented/radio mode controls and numeric inputs. Show only fields relevant to the selected mode. Keep model rows compact; do not add one card per model or nest cards.

- [ ] **Step 7: Implement quota and usage rendering**

Use existing full-width summary strips and tables. Debt uses a readable warning state, not green/teal. Tables scroll internally without document overflow.

- [ ] **Step 8: Run focused and full Web tests/build**

```powershell
yarn vitest run src/admin
yarn vitest run src
yarn build:admin
```

- [ ] **Step 9: Publish Admin artifact and commit Web changes**

Copy `web/dist/admin/index.html` and the favicon artifact into `app/data/web/admin/`, verify hashes, then:

```powershell
git add src/admin
git commit -m "feat: add model pricing administration"
```

---

## Task 8: Creator Estimates And Billing Errors

**Files:**
- Modify: Creator image generation dialog component identified by `生成图片`
- Modify: `web/src/views/production/components/workbench/generate/index.vue`
- Modify: batch text submission dialogs that enqueue novel/script jobs
- Modify: `web/src/shared/api.ts` or a focused Creator pricing API module following existing patterns
- Modify: `web/src/utils/generationJobTracker.ts`
- Test: nearest existing component/unit tests under `web/src/utils/__tests__` and Creator view tests

- [ ] **Step 1: Add failing estimate tests**

Assert model/duration changes request a new estimate, stale responses cannot overwrite newer selections, and blocked estimates disable the final generation command with Chinese text.

- [ ] **Step 2: Add failing stable-error tests**

Map:

```ts
PRICING_NOT_CONFIGURED -> 当前模型尚未配置价格
INSUFFICIENT_QUOTA -> 分组可用额度不足
ACCOUNT_IN_DEBT -> 当前分组存在欠费，请联系管理员充值
```

- [ ] **Step 3: Run focused tests and verify RED**

Expected: no estimate request or billing-specific messages exist.

- [ ] **Step 4: Implement scoped estimate display**

Image shows one-request estimate. Video includes selected duration. Token text batches show fallback reservation multiplied by batch size before confirmation. The enqueue response remains authoritative.

- [ ] **Step 5: Verify no global pricing/Provider secrets enter Creator bundle**

Search Creator source and built output for Admin pricing mutation paths and credential field names. Only the scoped estimate endpoint may appear.

- [ ] **Step 6: Run Creator tests and build**

```powershell
yarn vitest run src
yarn build:creator
```

- [ ] **Step 7: Publish Creator artifact and commit**

Copy Creator build artifacts into `app/data/web/`, preserving Admin output, then commit the Web and App artifact changes separately.

---

## Task 9: Acceptance Migration, Browser QA And Documentation

**Files:**
- Modify: `app/src/services/acceptanceFixture.ts`
- Modify: `app/src/tests/r3f-acceptance-fixture.test.ts`
- Modify: `docs/systems/providers/README.md`
- Modify: `docs/logbooks/validations/2026-07-11-real-provider-loading.md`
- Modify: `docs/logbooks/daily/2026-07-11.md`

- [ ] **Step 1: Extend acceptance fixture with deterministic pricing**

Seed fake per-request, per-second and Token rules plus quota accounts with known balances. Keep all real Provider credentials absent.

- [ ] **Step 2: Add fixture idempotency assertions**

Run seed twice and assert one active price version per fake model, one reservation per job, stable balances and no duplicate debits.

- [ ] **Step 3: Run complete App verification**

```powershell
yarn test:r3a
yarn test:r3b
yarn test:r3d
yarn test:r3e
yarn test:r3f
yarn test:r3g
yarn test:r3h
yarn test:r3i
yarn test:r3j
yarn test:r3k
yarn test:r3l
yarn test:r3m
yarn test:r3o
yarn test:r3p
yarn test:r3q
yarn test:r3r
yarn lint
yarn build
```

- [ ] **Step 4: Run project harness and diff checks**

```powershell
npm run harness:verify:project
git -C app diff --check
git -C web diff --check
git diff --check
```

- [ ] **Step 5: Run acceptance browser matrix**

Verify:

1. Super Admin changes all three pricing modes.
2. Group Admin cannot mutate global price.
3. Creator estimate matches reservation.
4. Concurrent fake jobs cannot overspend available quota.
5. Success settles, failure/cancel releases.
6. Queued job keeps old price after an Admin price change.
7. Token overage creates debt and blocks a new submission.
8. Top-up clears debt and permits submission.
9. Quota and usage pages show Chinese labels, no overflow and no current-origin console errors.

- [ ] **Step 6: Run one real low-cost job per task type**

Only after acceptance passes, run MiMo once, GRSAI once and AICopy once. Confirm exact configured charges `0.05`, `0.06` and `0.18`, then verify balance decreases by `0.29` total. Do not record credentials, Provider request IDs, signed URLs or generated media.

- [ ] **Step 7: Run final secret scans**

Scan App/Web source, Provider bundles, `data/serve/app.js`, docs and all Git diffs for credential-shaped values. Confirm `acceptance.sqlite` has zero real credential rows and audit summaries contain no key shape.

- [ ] **Step 8: Update documentation and logbooks**

Record formulas, default prices, migration behavior, browser results, final balances and remaining risks without secrets.

- [ ] **Step 9: Commit verification documentation**

```powershell
git add docs
git commit -m "docs: record model pricing and quota reservation validation"
```

---

## Plan Self-Review

- Every approved billing mode maps to formula tests, API validation and UI controls.
- Immutable queue pricing is implemented before executor metering so price changes cannot race queued jobs.
- Reservation creation and job insertion share one transaction; settlement/release cover every terminal path.
- Token fallback, refund, overage, debt and top-up recovery have explicit tests.
- Existing `estimatedCost` remains compatible while Admin receives `finalCost` and parsed snapshots.
- Default prices exactly match CNY 0.05, 0.06 and 0.18.
- Real Provider calls occur only after fake-executor acceptance and remain one request per type.
- No implementation step requires storing credentials in source, docs, logs or screenshots.
