# R3B Generation Queue And Concurrency Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Route text, image, and video generation through a persistent backend queue governed by user/group total and task-type concurrency limits.

**Architecture:** Add database-backed policies and jobs, a single-process SQLite scheduler with atomic claims, leased workers, and a handler registry that reconstructs work from persisted payloads. Separate pure eligibility/fairness logic from database orchestration so it can be unit tested. Record usage and quota changes transactionally after Provider completion without putting the external call inside a database transaction.

**Tech Stack:** TypeScript, Express, Knex/better-sqlite3, existing AI SDK/provider adapters, Node assert tests.

---

## Dependency And File Map

Required first: `2026-07-10-r3a-group-access-foundation.md` completed and validated.

**Create:**

- `app/src/types/generationQueue.ts`: job, policy, status, and handler contracts.
- `app/src/services/concurrencyPolicy.ts`: effective policy and authorization rules.
- `app/src/services/generationQueue.ts`: enqueue, list, cancel, reprioritize.
- `app/src/services/generationScheduler.ts`: atomic claim, fair selection, leases, recovery.
- `app/src/services/generationUsage.ts`: usage/quota transaction.
- `app/src/jobs/registry.ts`: handler lookup with no dynamic user code.
- `app/src/jobs/handlers/textGeneration.ts`
- `app/src/jobs/handlers/imageGeneration.ts`
- `app/src/jobs/handlers/videoGeneration.ts`
- `app/src/routes/admin/concurrency/getPolicies.ts`
- `app/src/routes/admin/concurrency/updateGroupPolicy.ts`
- `app/src/routes/admin/concurrency/updateUserPolicy.ts`
- `app/src/routes/admin/queue/listJobs.ts`
- `app/src/routes/admin/queue/cancelJob.ts`
- `app/src/routes/admin/queue/reprioritizeJob.ts`
- `app/src/tests/r3b-generation-queue.test.ts`

**Modify:**

- `app/src/lib/initDB.ts`
- `app/src/lib/fixDB.ts`
- `app/src/types/database.d.ts`
- `app/src/app.ts`: scheduler lifecycle.
- `app/src/utils/ai.ts`: expose metered Provider results to handlers; do not enqueue recursively.
- `app/src/utils/taskRecord.ts`: link legacy tasks to queue jobs.
- Key HTTP generation routes under `novel`, `assetsGenerate`, `production/assets`, `production/storyboard`, and `production/workbench`.
- `app/src/socket/routes/{scriptAgent,productionAgent}.ts`: queue high-level agent runs and emit queue status.
- `app/package.json`: add `test:r3b`.

### Task 1: Add Queue, Policy, Usage, And Quota Schema

- [ ] **Step 1: Write the failing schema test**

Create `r3b-generation-queue.test.ts` and assert these tables and columns:

```ts
for (const table of [
  "o_concurrencyPolicy",
  "o_generationJob",
  "o_usageLedger",
  "o_quotaAccount",
  "o_quotaLedger",
]) {
  assert.equal(await u.db.schema.hasTable(table), true, `${table} must exist`);
}
```

Add:

```json
"test:r3b": "cross-env TOONFLOW_NO_AUTOSTART=1 NODE_ENV=dev tsx src/tests/r3b-generation-queue.test.ts"
```

- [ ] **Step 2: Run and verify RED**

Run: `cd "D:\codex\服务器\Stars flow\app"; yarn test:r3b`

Expected: FAIL with `o_concurrencyPolicy must exist`.

- [ ] **Step 3: Define fresh-install schemas**

Add the five tables to `initDB.ts`. Use these contracts:

```ts
// o_concurrencyPolicy
table.increments("id").primary();
table.text("scopeType").notNullable(); // group | user
table.integer("scopeId").notNullable();
table.integer("totalLimit").notNullable();
table.integer("textLimit").notNullable();
table.integer("imageLimit").notNullable();
table.integer("videoLimit").notNullable();
table.integer("updatedBy").notNullable();
table.integer("createdAt").notNullable();
table.integer("updatedAt").notNullable();
table.unique(["scopeType", "scopeId"]);

// o_generationJob
table.increments("id").primary();
table.integer("groupId").notNullable().index();
table.integer("ownerUserId").notNullable().index();
table.integer("projectId").index();
table.integer("sourceTaskId");
table.text("handlerKey").notNullable();
table.text("taskType").notNullable(); // text | image | video
table.text("status").notNullable().index();
table.integer("priority").notNullable().defaultTo(0);
table.text("payloadJson").notNullable();
table.text("resultJson");
table.text("errorCode");
table.text("errorMessage");
table.text("idempotencyKey").notNullable().unique();
table.text("leaseOwner");
table.integer("leaseExpiresAt");
table.integer("heartbeatAt");
table.integer("attemptCount").notNullable().defaultTo(0);
table.text("providerRequestId");
table.integer("cancellationRequestedAt");
table.integer("queuedAt").notNullable();
table.integer("startedAt");
table.integer("finishedAt");

// o_usageLedger
table.increments("id").primary();
table.integer("jobId").notNullable().unique();
table.integer("groupId").notNullable().index();
table.integer("userId").notNullable();
table.integer("projectId");
table.text("providerId");
table.text("modelId");
table.text("taskType").notNullable();
table.text("unitJson").notNullable().defaultTo("{}");
table.decimal("estimatedCost", 18, 6);
table.text("currency");
table.text("pricingSnapshotJson").notNullable().defaultTo("{}");
table.text("result").notNullable();
table.integer("createdAt").notNullable();

// o_quotaAccount
table.integer("groupId").primary();
table.decimal("balance", 18, 6).notNullable().defaultTo(0);
table.integer("updatedAt").notNullable();

// o_quotaLedger
table.increments("id").primary();
table.integer("groupId").notNullable().index();
table.text("entryType").notNullable();
table.decimal("amount", 18, 6).notNullable();
table.decimal("balanceBefore", 18, 6).notNullable();
table.decimal("balanceAfter", 18, 6).notNullable();
table.integer("actorUserId");
table.integer("usageLedgerId");
table.text("reason").notNullable();
table.integer("createdAt").notNullable();
```

- [ ] **Step 4: Add idempotent migration defaults**

Create one group policy and one quota account per existing group. Create one user policy per Admin/Creator. Use defaults:

```ts
const GROUP_DEFAULT = { totalLimit: 4, textLimit: 3, imageLimit: 2, videoLimit: 1 };
const USER_DEFAULT = { totalLimit: 2, textLimit: 2, imageLimit: 1, videoLimit: 1 };
```

Use Super Admin ID `1` as `updatedBy` for migrated defaults. Do not create a user policy for Super Admin because its jobs consume the selected project's owner/group policy.

- [ ] **Step 5: Verify and commit**

Run: `yarn test:r3b`

Expected: PASS schema/default assertions.

Run: `yarn lint`

Expected: PASS and regenerated DB types include all five tables.

```powershell
git add package.json src/lib/initDB.ts src/lib/fixDB.ts src/types/database.d.ts src/tests/r3b-generation-queue.test.ts
git commit -m "feat: add generation queue schema"
```

### Task 2: Implement Four-Layer Policy Evaluation

- [ ] **Step 1: Add pure failing policy tests**

Test that a video task is blocked independently by each layer:

```ts
const decision = evaluateCapacity({
  taskType: "video",
  group: { total: 3, video: 1 },
  user: { total: 1, video: 1 },
  groupLimit: { total: 4, video: 1 },
  userLimit: { total: 2, video: 1 },
});
assert.deepEqual(decision, { allowed: false, reason: "GROUP_TYPE_LIMIT" });
```

Add one test each for `GROUP_TOTAL_LIMIT`, `GROUP_TYPE_LIMIT`, `USER_TOTAL_LIMIT`, `USER_TYPE_LIMIT`, and allowed capacity.

- [ ] **Step 2: Run and verify RED**

Run: `yarn test:r3b`

Expected: FAIL because `evaluateCapacity` does not exist.

- [ ] **Step 3: Add queue types and pure evaluator**

In `types/generationQueue.ts`:

```ts
export type GenerationTaskType = "text" | "image" | "video";
export type GenerationJobStatus =
  | "queued"
  | "running"
  | "recovering"
  | "needs_attention"
  | "succeeded"
  | "failed"
  | "cancelled";

export interface ConcurrencyLimit {
  total: number;
  text: number;
  image: number;
  video: number;
}

export interface CapacityUsage {
  total: number;
  text: number;
  image: number;
  video: number;
}
```

Implement `evaluateCapacity` as a deterministic function that checks group total, group type, user total, then user type and returns the first stable reason code.

- [ ] **Step 4: Implement policy authorization**

Expose:

```ts
export async function updateGroupPolicy(actor: AuthUser, groupId: number, input: ConcurrencyLimit): Promise<ConcurrencyLimit>;
export async function updateUserPolicy(actor: AuthUser, userId: number, input: ConcurrencyLimit): Promise<ConcurrencyLimit>;
export async function getEffectivePolicies(groupId: number, userId: number): Promise<{ group: ConcurrencyLimit; user: ConcurrencyLimit }>;
```

Only Super Admin updates group policies and Admin-user policies. Admin may update only a Creator in `actor.groupId`. Validate `user.total <= group.total` and every user type limit <= the matching group type limit. Return `422` with Chinese messages for invalid limits.

- [ ] **Step 5: Verify and commit**

Run: `yarn test:r3b`

Expected: all capacity and policy permission cases pass.

```powershell
git add src/types/generationQueue.ts src/services/concurrencyPolicy.ts src/tests/r3b-generation-queue.test.ts
git commit -m "feat: evaluate hierarchical concurrency policies"
```

### Task 3: Build Persistent Fair Scheduling And Atomic Claims

- [ ] **Step 1: Write failing fairness tests**

Seed jobs `A1, A2, A3, B1, B2` in one group and `C1` in another. With one free group slot, assert successive completions select `A1`, `B1`, `A2`, `B2`, `A3`; group C schedules independently. Within one user, `queuedAt` order must never change.

- [ ] **Step 2: Write failing atomic-capacity test**

Start two concurrent `claimNextJob(groupId)` calls with one available slot. Assert exactly one returns a job and the other returns `null`.

- [ ] **Step 3: Implement the fair selector**

Use persisted history, not process-only round-robin state:

```ts
export interface QueueCandidate {
  id: number;
  ownerUserId: number;
  priority: number;
  queuedAt: number;
}
export function chooseFairCandidate(
  queued: QueueCandidate[],
  lastStartedByUser: Map<number, number>,
): QueueCandidate | null {
  return [...queued].sort((a, b) => {
    const aLast = lastStartedByUser.get(a.ownerUserId) ?? 0;
    const bLast = lastStartedByUser.get(b.ownerUserId) ?? 0;
    return aLast - bLast || b.priority - a.priority || a.queuedAt - b.queuedAt || a.id - b.id;
  })[0] ?? null;
}
```

Priority affects order only after user fairness. This prevents a high-volume user from permanently starving peers.

- [ ] **Step 4: Implement atomic claim**

Inside one Knex transaction:

1. Read group/user policies.
2. Count `running` jobs for group total/type and user total/type.
3. Select a fair queued candidate.
4. Recheck status with `WHERE id = ? AND status = 'queued'`.
5. Update it to `running`, set `leaseOwner`, `leaseExpiresAt = now + 30000`, `heartbeatAt`, `startedAt`, and increment `attemptCount`.
6. Return the claimed row only when update count is 1.

Run only one scheduler loop per app process in phase 1. The transactional conditional update still protects duplicate loop ticks and tests.

- [ ] **Step 5: Implement enqueue/cancel/reprioritize**

`enqueueGeneration` must derive group/owner from an already-authorized project and require a unique idempotency key. A duplicate key returns the existing job. Queued cancel transitions immediately to `cancelled`. Running cancel sets `cancellationRequestedAt`. Only Super Admin can change priority, with a required reason and audit record.

- [ ] **Step 6: Verify and commit**

Run: `yarn test:r3b`

Expected: fairness order is stable; only one concurrent claim succeeds.

```powershell
git add src/services/generationQueue.ts src/services/generationScheduler.ts src/tests/r3b-generation-queue.test.ts
git commit -m "feat: schedule generation jobs fairly"
```

### Task 4: Add Leases, Heartbeats, And Safe Recovery

- [ ] **Step 1: Add failing recovery tests**

Cover:

```text
queued after restart -> remains queued
running + expired lease + no providerRequestId -> queued for retry
running + expired lease + idempotent handler -> queued for retry
running + expired lease + providerRequestId + non-idempotent handler -> needs_attention
```

- [ ] **Step 2: Define the handler contract**

In `types/generationQueue.ts`:

```ts
export interface MeteringResult {
  providerId: string | null;
  modelId: string | null;
  units: Record<string, number>;
  estimatedCost: number | null;
  currency: string | null;
  pricingSnapshot: Record<string, string | number>;
  providerRequestId: string | null;
}

export interface GenerationExecutionContext {
  jobId: number;
  groupId: number;
  ownerUserId: number;
  projectId: number | null;
  signal: AbortSignal;
  heartbeat(): Promise<void>;
  setProviderRequestId(id: string): Promise<void>;
}

export interface GenerationExecutionResult<TResult> {
  result: TResult;
  metering: MeteringResult;
}

export interface GenerationJobHandler<TPayload = unknown, TResult = unknown> {
  key: string;
  taskType: GenerationTaskType;
  canRetryAfterProviderSubmission: boolean;
  parsePayload(value: unknown): TPayload;
  execute(context: GenerationExecutionContext, payload: TPayload): Promise<GenerationExecutionResult<TResult>>;
  cancel?(context: GenerationExecutionContext): Promise<void>;
}
```

The registry is a static map of trusted handlers. Never execute a handler name or code supplied outside this allowlist.

- [ ] **Step 3: Implement worker lifecycle**

Use a 10-second heartbeat and 30-second lease. `executeClaimedJob` must:

1. Parse persisted payload with the handler schema.
2. Start heartbeat renewal.
3. Execute the handler.
4. Complete usage/job records transactionally.
5. Stop heartbeat and release the slot in `finally`.

- [ ] **Step 4: Implement startup recovery**

On scheduler start, inspect expired `running` jobs. Requeue only when no Provider request was submitted or the handler declares safe retry. Otherwise transition to `needs_attention` with error code `EXTERNAL_STATE_UNKNOWN`. Do not convert queued jobs to failures in `fixDB.ts`.

- [ ] **Step 5: Verify and commit**

Run: `yarn test:r3b`

Expected: all four recovery cases pass and no unsafe job is auto-retried.

```powershell
git add src/jobs/registry.ts src/services/generationScheduler.ts src/types/generationQueue.ts src/tests/r3b-generation-queue.test.ts
git commit -m "feat: recover leased generation jobs safely"
```

### Task 5: Integrate Persisted Text, Image, And Video Handlers

- [ ] **Step 1: Add fake Provider integration tests**

Register test-only handlers that resolve deferred promises. Enqueue two jobs per type and assert running counts never exceed the four-layer policy. Assert route responses return job IDs before Provider completion.

- [ ] **Step 2: Refactor Provider execution without recursive enqueue**

Keep low-level `AiText.invoke/stream`, `AiImage.run`, and `AiVideo.run` callable only from trusted job handlers for queued flows. Add a `GenerationExecutionContext` carrying `jobId`, `groupId`, `ownerUserId`, `projectId`, cancellation signal, heartbeat function, and `setProviderRequestId`.

Do not call `enqueueGeneration` from `utils/ai.ts`; enqueue at high-level route/workflow boundaries so payloads are reconstructable.

- [ ] **Step 3: Implement trusted handlers**

Use Zod payloads and resource IDs rather than credentials:

```ts
const imagePayload = z.object({
  operation: z.enum(["asset", "storyboard", "edit"]),
  projectId: z.number().int().positive(),
  targetId: z.number().int().positive(),
  model: z.string().min(1),
  prompt: z.string(),
  referenceResourceIds: z.array(z.number().int().positive()).default([]),
  size: z.enum(["1K", "2K", "4K"]),
  aspectRatio: z.string(),
});
```

Create equivalent high-level payloads for text workflows and video generation. Rebuild base64 references at execution time from authorized database resources; do not persist Provider keys or base64 media in `payloadJson`.

- [ ] **Step 4: Convert HTTP generation routes**

Replace inline/background `Promise.all` and client `concurrentCount` control in these entry points with one persisted job per generation unit:

```text
src/routes/novel/event/generateEvents.ts
src/routes/assetsGenerate/generateAssets.ts
src/routes/assetsGenerate/batchGenerateImageAssets.ts
src/routes/production/assets/batchGenerateAssetsImage.ts
src/routes/production/storyboard/batchGenerateImage.ts
src/routes/production/editImage/generateFlowImage.ts
src/routes/production/workbench/generateVideoPrompt.ts
src/routes/production/workbench/batchGeneratePrompt.ts
src/routes/production/workbench/generateVideo.ts
src/routes/production/workbench/batchGenerateVideo.ts
```

Return `{ jobId, targetId, status: "queued" }`. Ignore/remove browser-supplied `concurrentCount`; backend policies are authoritative.

- [ ] **Step 5: Integrate ScriptAgent and ProductionAgent as high-level jobs**

Persist the agent operation, project ID, authenticated owner, and user input needed to reconstruct the run. Emit `queued`, estimated position, `running`, terminal status, and errors over the existing socket. On reconnect, allow the client to subscribe by job ID. Do not attempt to serialize AI SDK tool functions; reconstruct them inside the trusted handler.

- [ ] **Step 6: Verify and commit**

Run: `yarn test:r3b`

Expected: all three task types queue, obey limits, and complete through trusted handlers.

```powershell
git add src/jobs/handlers src/jobs/registry.ts src/utils/ai.ts src/utils/taskRecord.ts src/routes src/socket src/tests/r3b-generation-queue.test.ts
git commit -m "feat: route generation through persistent jobs"
```

### Task 6: Record Usage And Quota Atomically

- [ ] **Step 1: Add failing ledger tests**

Complete one known-cost job and one unknown-cost job. Assert:

```ts
assert.equal(await count("o_usageLedger", { jobId: knownJobId }), 1);
assert.equal(await count("o_quotaLedger", { usageLedgerId: knownUsageId }), 1);
assert.equal(knownBalanceAfter, knownBalanceBefore - knownCost);
assert.equal(unknownUsage.estimatedCost, null);
assert.equal(await count("o_quotaLedger", { usageLedgerId: unknownUsage.id }), 0);
```

Retry the completion transaction and assert the unique `jobId` prevents double charging.

- [ ] **Step 2: Expose normalized metering**

Normalize available Provider results to the `MeteringResult` contract introduced in Task 4.

Do not invent cost when model pricing or usage is unavailable.

- [ ] **Step 3: Implement one completion transaction**

`completeGenerationUsage` must atomically update the job terminal state, insert one usage row, and, only for a known non-zero cost, lock/read the quota account, insert a negative `usage_debit` ledger row, and update balance. Balance may go negative; never block job start based on balance in R3.

- [ ] **Step 4: Verify and commit**

Run: `yarn test:r3b`

Expected: known usage charges once, unknown usage remains visible without a guessed debit.

```powershell
git add src/services/generationUsage.ts src/utils/ai.ts src/services/generationScheduler.ts src/tests/r3b-generation-queue.test.ts
git commit -m "feat: record generation usage and quota debits"
```

### Task 7: Add Queue And Concurrency Admin APIs

- [ ] **Step 1: Add failing two-group API tests**

Assert Admin A can list/cancel only group A jobs, cannot update its own policy, can update group A Creator policies within group caps, and gets `404` for group B job IDs. Assert only Super Admin can update group policy or reprioritize.

- [ ] **Step 2: Implement thin routes over services**

Use stable response shapes:

```ts
type QueueListResponse = {
  items: Array<{
    id: number;
    ownerUserId: number;
    projectId: number | null;
    taskType: GenerationTaskType;
    status: GenerationJobStatus;
    queuePosition: number | null;
    queuedAt: number;
    startedAt: number | null;
    errorMessage: string | null;
  }>;
  counts: Record<GenerationJobStatus, number>;
};
```

Never return `payloadJson`, full prompts, base64 data, leases, or Provider credentials to ordinary Admin responses.

- [ ] **Step 3: Verify and commit**

Run: `yarn test:r3b`

Expected: all policy and queue APIs enforce group scope and redaction.

```powershell
git add src/routes/admin/concurrency src/routes/admin/queue src/router.ts src/tests/r3b-generation-queue.test.ts
git commit -m "feat: expose scoped queue administration"
```

### Task 8: R3B Verification And Governance

- [ ] **Step 1: Run backend suite**

```powershell
cd "D:\codex\服务器\Stars flow\app"
yarn lint
yarn test:r2
yarn test:r3a
yarn test:r3b
yarn build
```

Expected: all commands exit 0.

- [ ] **Step 2: Run a restart smoke**

Start the scheduler in its test-only paused mode, queue at least three fake delayed jobs, stop the service before any claim, restart with scheduling enabled, and verify they remain queued then execute. Expire a submitted non-idempotent fake job and verify `needs_attention`, not a second Provider call.

- [ ] **Step 3: Record evidence and commit**

Create `docs/logbooks/validations/2026-07-10-r3b-generation-queue.md` with policy values, fairness order, restart output, and charge idempotency evidence. Update daily/status with R3 still `In Progress`.

```powershell
cd "D:\codex\服务器\Stars flow"
git add docs/logbooks docs/logbooks/progress/functional-reform-status.md
git commit -m "docs: validate R3B generation queue"
```
