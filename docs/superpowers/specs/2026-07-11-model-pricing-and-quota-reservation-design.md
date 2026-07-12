# Model Pricing And Quota Reservation Design

## Purpose

Stars Flow must charge completed text, image and video generation jobs using model-specific rules while preventing concurrent submissions from overspending a group's quota. Pricing is maintained only by Super Admin. Historical jobs retain the rule that was effective when they entered the queue.

The first enabled prices are:

| Provider | Model | Task type | Billing mode | Price |
| --- | --- | --- | --- | ---: |
| Xiaomi MiMo | `mimo-v2.5` | Text | Per request | CNY 0.05/request |
| Xiaomi MiMo | `mimo-v2.5-pro` | Text | Per request | CNY 0.05/request |
| GRSAI | `gpt-image-2` | Image | Per request | CNY 0.06/request |
| AICopy | `grok-imagine-video-1.5-preview` | Video | Per request | CNY 0.18/request |

The system also supports separate text input/output Token rates and video per-second rates. Those modes cannot be activated until their required rates are configured.

## Decisions

1. Pricing is keyed by the real `Provider + model`, not by a Creator-facing alias.
2. Supported modes are `per_request`, `per_second` and `per_token`.
3. Token rates are configured separately for input and output in CNY per one million Tokens.
4. Token mode uses a configured per-request fallback when upstream usage is missing.
5. A job locks an immutable pricing snapshot when it enters the queue.
6. Quota is reserved atomically with job creation. Failed or cancelled jobs release the reservation.
7. A successful job settles its actual cost. A Token job may cost more or less than its reservation.
8. If final Token cost exceeds the reservation and available quota, the real cost is still charged, the account enters debt, and further submissions are blocked until a top-up restores a non-negative balance.
9. Currency is CNY and all persisted monetary values use six decimal places.
10. Provider connection probes are platform diagnostics and are not billable generation jobs.

## Pricing Model

### Billing formulas

`per_request`:

```text
actual cost = request count * request price
reserved cost = request count * request price
```

`per_second`:

```text
actual cost = generated or submitted seconds * second price
reserved cost = submitted seconds * second price
```

`per_token`:

```text
actual cost =
  input tokens * input price per million / 1,000,000
  + output tokens * output price per million / 1,000,000

reserved cost = fallback request price
```

If input or output Token usage is unavailable, the complete request uses the fallback request price rather than partially estimating one side.

### Precision

Prices accept at most six decimal places. Calculations produce integer micro-yuan values and round once at the final unit multiplication boundary. Token arithmetic must avoid binary floating-point accumulation; integer micro-yuan and integer Token counts are used for settlement.

Zero is a valid configured price for a deliberately free model. Missing required fields are not treated as zero.

### Pricing resolution

Image and video jobs already carry canonical model IDs such as `grsai:gpt-image-2` and `aicopy:grok-imagine-video-1.5-preview`. Text jobs may carry aliases such as `universalAi`, `scriptAgent` or `productionAgent`. Before enqueue, the pricing service resolves these aliases through `o_agentDeploy` to the actual Provider and model. The queue, usage ledger and Admin UI then use the canonical target.

An enabled generation target without an active pricing rule is rejected with `PRICING_NOT_CONFIGURED`. This prevents silent free usage. Existing non-generation Provider connection tests remain available without pricing.

## Data Model

### `o_modelPricing`

Versioned model pricing records:

| Column | Type | Rules |
| --- | --- | --- |
| `id` | integer | Primary key |
| `providerId` | text | Required |
| `modelId` | text | Provider-native model ID, required |
| `taskType` | text | `text`, `image`, or `video` |
| `billingMode` | text | `per_request`, `per_second`, or `per_token` |
| `requestPrice` | decimal(18,6) | Required for per-request mode |
| `secondPrice` | decimal(18,6) | Required for per-second mode |
| `inputPricePerMillion` | decimal(18,6) | Required for Token mode |
| `outputPricePerMillion` | decimal(18,6) | Required for Token mode |
| `fallbackRequestPrice` | decimal(18,6) | Required for Token reservation and missing usage |
| `currency` | text | Fixed to `CNY` in this phase |
| `version` | integer | Increases per Provider and model |
| `status` | text | `active` or `superseded` |
| `effectiveAt` | integer | New-job effective time |
| `createdBy` | integer | Super Admin user ID |
| `createdAt` | integer | Creation time |

`providerId + modelId + version` is unique. Updating a price supersedes the active row and inserts a new active version in one transaction. Queue snapshots remain valid after a version is superseded.

### `o_quotaReservation`

One reservation per generation job:

| Column | Type | Rules |
| --- | --- | --- |
| `id` | integer | Primary key |
| `jobId` | integer | Required and unique |
| `groupId` | integer | Required |
| `pricingId` | integer | Source pricing version |
| `reservedAmount` | decimal(18,6) | Amount frozen at enqueue |
| `finalAmount` | decimal(18,6) | Null until settled or released |
| `status` | text | `reserved`, `settled`, or `released` |
| `reason` | text | Settlement or release reason |
| `createdAt` | integer | Reservation time |
| `settledAt` | integer | Successful settlement time |
| `releasedAt` | integer | Failure or cancellation release time |

### Existing table changes

`o_quotaAccount` adds:

- `reservedBalance decimal(18,6) not null default 0`
- `billingStatus text not null default 'active'`, with `active` and `debt` values.

The available amount is `balance - reservedBalance`. `billingStatus` becomes `debt` whenever settled balance is negative and returns to `active` after a top-up or credit makes balance non-negative.

`o_generationJob` adds:

- `pricingSnapshotJson text not null default '{}'`
- `reservedAmount decimal(18,6)`

`o_usageLedger` keeps its current `unitJson`, `estimatedCost`, `currency` and `pricingSnapshotJson` columns. For priced jobs, `estimatedCost` becomes the final charge despite the legacy field name. Renaming it is deferred to avoid widening the API migration.

### Immutable pricing snapshot

Each queued job stores:

```json
{
  "pricingId": 1,
  "providerId": "aicopy",
  "modelId": "grok-imagine-video-1.5-preview",
  "taskType": "video",
  "billingMode": "per_request",
  "requestPrice": 0.18,
  "currency": "CNY",
  "version": 1,
  "effectiveAt": 0
}
```

Only fields relevant to the active mode are included. Credentials, upstream request bodies and signed media URLs are never part of a pricing snapshot.

## Transaction Flow

### Enqueue and reserve

The generation workflow performs these steps in one database transaction:

1. Resolve the authenticated actor and project scope.
2. Resolve the canonical Provider and model.
3. Read the active pricing version.
4. Build the immutable snapshot and reserved amount.
5. Read the group's quota account inside the write transaction.
6. Reject debt accounts with `ACCOUNT_IN_DEBT`.
7. Reject `balance - reservedBalance < required reservation` with `INSUFFICIENT_QUOTA`.
8. Insert the generation job with its snapshot and reserved amount.
9. Insert the unique reservation.
10. Increment `o_quotaAccount.reservedBalance`.

Idempotent replays return the existing job and reservation without reserving twice.

### Success settlement

The executor returns normalized units:

- text: `requests`, `inputTokens`, `outputTokens`
- image: `requests`, `images`
- video: `requests`, `seconds`

Settlement runs in the existing completion transaction:

1. Load the job snapshot and its `reserved` reservation.
2. Calculate the final cost from actual units.
3. Write one usage record with units, final cost and the job snapshot.
4. Reduce `reservedBalance` by the reservation.
5. Reduce `balance` by final cost.
6. Insert one `usage_debit` quota ledger row linked to the usage record.
7. Mark the reservation `settled` with its final amount.
8. Mark the account `debt` if the resulting balance is negative.

Repeated completion is idempotent because `o_usageLedger.jobId` and `o_quotaReservation.jobId` are unique.

### Failure and cancellation

Every terminal transition to `failed`, `cancelled` or unrecoverable `needs_attention` releases a still-reserved amount in the same transaction:

1. Decrease `reservedBalance` by the reservation amount.
2. Mark the reservation `released` with a reason.
3. Do not create a usage debit.

Recovering jobs retain their reservation. Retrying a running job does not create a second reservation.

### Top-up and debt recovery

Manual top-up and credit operations continue to change `balance`; they do not change `reservedBalance`. After adjustment, `billingStatus` is recomputed from the resulting balance. A debt account becomes active when its balance reaches zero or above.

## API Design

### Super Admin pricing APIs

`GET /api/admin/providers/pricing`

- Returns current active rules and required-field completeness for visible Provider models.
- Super Admin only.
- Never returns Provider credentials.

`POST /api/admin/providers/pricing/update`

Request fields:

- `providerId`
- `modelId`
- `taskType`
- `billingMode`
- mode-specific price fields
- `currency: "CNY"`

The service verifies that the Provider and model exist in the catalog, validates mode/task compatibility, supersedes the previous rule, creates the next version and writes a sanitized `pricing.update` audit row.

### Estimate API

`POST /api/generation/pricing/estimate`

Authenticated Creator/Admin input contains canonical or supported alias model ID plus known units such as video duration. The response contains:

- billing mode label
- estimated/reserved amount
- currency
- group balance, reserved balance and available balance
- whether submission is currently allowed
- a stable Chinese denial code/message when blocked

It never exposes Provider credentials or other groups' balances. The enqueue transaction remains authoritative because balance may change after an estimate.

### Existing API changes

- Provider catalog responses add a sanitized pricing summary per model.
- Queue job DTOs add reserved amount and pricing mode.
- Usage DTOs add parsed units and pricing snapshot.
- Quota overview adds reserved balance, available balance and billing status at summary and group levels.
- Generation entrypoints return `INSUFFICIENT_QUOTA`, `ACCOUNT_IN_DEBT` or `PRICING_NOT_CONFIGURED` as Chinese user-facing errors.

## Admin And Creator UI

### Provider And Model page

Each model shows a compact price summary and a Super Admin-only `计价设置` action. A dialog uses a segmented control for billing mode:

- Per request: request price.
- Per second: second price.
- Token: input price per million, output price per million and fallback request price.

The dialog validates six-decimal precision and mode-specific completeness. Saving refreshes the model row and shows the effective version and time.

### Usage page

Usage records display:

- billing mode
- normalized units
- price snapshot summary
- final CNY charge

Historical rows remain unchanged when current prices change.

### Quota page

Summary and group rows display:

- account balance
- reserved amount
- available amount
- total top-up
- total settled usage
- debt status

Group Admin sees only its own group. Super Admin sees all groups.

### Creator generation surfaces

Image and video generation dialogs request an estimate after the model and billable units are selected. Text workflows that submit batches display the aggregate fallback reservation before confirmation. Enqueue failures use concise Chinese messages and never submit an upstream request.

## Default Data Migration

The migration is idempotent and inserts version 1 only when no active pricing exists for the exact Provider and model. It seeds:

- `mimo + mimo-v2.5`: `per_request`, CNY 0.05
- `mimo + mimo-v2.5-pro`: `per_request`, CNY 0.05
- `grsai + gpt-image-2`: `per_request`, CNY 0.06
- `aicopy + grok-imagine-video-1.5-preview`: `per_request`, CNY 0.18

Existing successful zero-cost usage records are not retroactively charged. Existing queued/running jobs created before migration have no reservation and complete under the legacy unpriced behavior; the migration records their legacy status rather than synthesizing a charge after submission.

Existing quota accounts receive `reservedBalance = 0` and `billingStatus` based on their current balance.

## Security And Audit

- Only Super Admin can read or mutate global price configuration.
- Group Admin can read scoped usage and quota results, not global pricing administration.
- Creator can read only a scoped estimate for its own group and project.
- `pricing.update` audit summaries include Provider ID, model ID, old/new mode, changed monetary fields, version and effective time.
- Logs and snapshots never include API keys, authorization headers, upstream bodies, signed URLs or generated content.
- Price updates and reservations use server-side catalog/model validation; clients cannot invent a cheaper rule.

## Error Handling

Stable error codes:

- `PRICING_NOT_CONFIGURED`: no active valid price exists.
- `PRICING_MODE_INVALID`: configured mode is incompatible with the task type.
- `PRICING_FIELDS_INCOMPLETE`: required rates are missing.
- `INSUFFICIENT_QUOTA`: available balance is below the reservation.
- `ACCOUNT_IN_DEBT`: the group must top up before submitting.
- `USAGE_UNAVAILABLE_FALLBACK_APPLIED`: internal settlement marker, not a failed job.
- `RESERVATION_NOT_FOUND`: terminal processing cannot safely settle or release a priced job; move it to `needs_attention` without attempting an untracked charge.

Pricing and quota errors are sanitized before reaching Creator. Unexpected settlement failures keep the reservation intact and move the job to `needs_attention` for Super Admin review.

## Test Strategy

### Unit tests

- Per-request, per-second and split input/output Token formulas.
- Token fallback when any required usage value is missing.
- Six-decimal rounding and zero-price rules.
- Canonical model and text alias resolution.
- Mode-specific validation.

### Service and database tests

- Idempotent default price migration.
- Price version replacement and audit output.
- Atomic enqueue plus reservation.
- Concurrent submissions cannot reserve more than available quota.
- Idempotent replay does not reserve twice.
- Success settlement, lower Token refund, higher Token supplement and debt transition.
- Failure, cancellation and unrecoverable recovery release reservations.
- Worker retry and duplicate completion do not double-charge.
- Top-up clears debt when balance becomes non-negative.
- Cross-group and role access boundaries.

### Frontend tests

- Pricing dialog mode switching and required fields.
- Super Admin-only price mutation controls.
- Usage price snapshot rendering.
- Quota balance/reserved/available/debt rendering.
- Creator estimate and Chinese insufficient-quota errors.

### Browser acceptance

Use `data/acceptance.sqlite` and fake Provider executors only:

1. Configure per-request, per-second and Token rules.
2. Submit enough concurrent jobs to prove reservation prevents overspend.
3. Complete, fail and cancel jobs and verify balances/reservations.
4. Change a price while a job is queued and verify the queued snapshot does not change.
5. Complete a Token job above its reservation and verify debt blocks the next submission.
6. Top up the group and verify submissions resume.
7. Confirm Admin scope and Creator denial from global price APIs.

Real Provider smoke tests are limited to one low-cost request per task type after all fake-executor tests pass.

## Release Criteria

- The four default model prices appear in Admin and are used by new jobs.
- New jobs cannot enter the queue without valid pricing and sufficient available quota.
- Reservations are atomic, visible and released or settled exactly once.
- Completed usage records contain units, immutable pricing snapshots and final CNY charges.
- Failed and cancelled jobs do not consume quota.
- Token fallback and debt behavior match this specification.
- Existing group isolation and Super Admin permissions remain intact.
- Creator and Admin builds, App tests, type checks, harness verification, browser acceptance and secret scans pass.
