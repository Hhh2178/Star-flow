# R3D Admin Operations And Settings Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the complete scoped operations console, cost/quota/audit surfaces, migrate all global settings out of Creator UI, and close R3 with Chinese-first end-to-end verification.

**Architecture:** Build scoped read models and mutation services behind `/api/admin/*`, then connect dense Chinese admin pages using the R3C shell. Reuse current setting editors only after extracting their business logic from route handlers and binding them to admin-safe endpoints. Remove every global-setting import from the Creator entry after admin parity is proven.

**Tech Stack:** TypeScript, Express, Knex/SQLite, Vue 3, TDesign Vue Next, Vitest, existing browser QA tooling.

---

## Dependency And File Map

Required first: R3A, R3B, and R3C completed and validated.

**Backend create:**

- `app/src/services/adminOverview.ts`
- `app/src/services/adminProjects.ts`
- `app/src/services/adminTasks.ts`
- `app/src/services/adminUsage.ts`
- `app/src/services/quotaManagement.ts`
- `app/src/services/providerAdmin.ts`
- `app/src/services/globalConfigAdmin.ts`
- `app/src/routes/admin/overview/getOverview.ts`
- `app/src/routes/admin/projects/listProjects.ts`
- `app/src/routes/admin/projects/reassignProject.ts`
- `app/src/routes/admin/projects/archiveProject.ts`
- `app/src/routes/admin/tasks/listTasks.ts`
- `app/src/routes/admin/tasks/cancelTask.ts`
- `app/src/routes/admin/tasks/retryTask.ts`
- `app/src/routes/admin/usage/getSummary.ts`
- `app/src/routes/admin/quota/getAccounts.ts`
- `app/src/routes/admin/quota/getLedger.ts`
- `app/src/routes/admin/quota/adjustQuota.ts`
- `app/src/routes/admin/audit/listAudit.ts`
- `app/src/routes/admin/providers/getStatus.ts`
- `app/src/routes/admin/providers/*`: Super Admin write adapters.
- `app/src/routes/admin/aiConfig/*`
- `app/src/routes/admin/system/*`
- `app/src/tests/r3d-admin-operations.test.ts`

**Frontend create:**

- `web/src/admin/api/adminApi.ts`
- `web/src/admin/pages/OverviewPage.vue`
- `web/src/admin/pages/GroupsPage.vue`
- `web/src/admin/pages/UsersPage.vue`
- `web/src/admin/pages/ProjectsPage.vue`
- `web/src/admin/pages/TasksPage.vue`
- `web/src/admin/pages/QueuePage.vue`
- `web/src/admin/pages/UsagePage.vue`
- `web/src/admin/pages/QuotaPage.vue`
- `web/src/admin/pages/ProvidersPage.vue`
- `web/src/admin/pages/AiConfigPage.vue`
- `web/src/admin/pages/SystemPage.vue`
- `web/src/admin/pages/AuditPage.vue`
- `web/src/admin/pages/ProfilePage.vue`
- `web/src/admin/components/PageHeader.vue`
- `web/src/admin/components/StatusText.vue`
- `web/src/admin/components/PagedTable.vue`
- `web/src/admin/__tests__/permissions.test.ts`

**Frontend modify:**

- `web/src/admin/router.ts`
- `web/src/admin/navigation.ts`
- `web/src/components/setting/components/*.vue`: bind migrated editors to admin client and explicit readonly props.
- `web/src/components/setting/index.vue`: reduce to personal-only content or replace with personal component.
- `web/src/components/setting/permissions.ts`: remove long-term global role map from Creator path.
- `web/src/pages/workbench/index.vue`
- `web/src/components/modelSelect.vue`: replace “open settings” with Chinese admin guidance for authorized roles.
- `web/src/locales/**`: add Chinese-first keys and remove Creator global-setting references.

### Task 1: Add Scoped Overview, Project, And Task Read Models

- [ ] **Step 1: Add failing two-group API tests**

Create `r3d-admin-operations.test.ts` and seed two groups with projects, legacy tasks, and generation jobs. Assert:

```ts
const overviewA = await get(adminAToken, "/api/admin/overview/getOverview");
assert.equal(overviewA.data.projects.total, groupAProjectCount);
assert.equal(overviewA.data.queue.running, groupARunningCount);
assert.equal(JSON.stringify(overviewA.data).includes(groupBProjectName), false);

const projectsA = await get(adminAToken, "/api/admin/projects/listProjects?page=1&pageSize=20");
assert.ok(projectsA.data.items.every((item: any) => item.groupId === groupAId));
assert.equal(await post(adminAToken, "/api/admin/projects/reassignProject", { projectId: groupBProjectId, ownerUserId: creatorAId }), 404);
```

- [ ] **Step 2: Run and verify RED**

Add:

```json
"test:r3d": "cross-env TOONFLOW_NO_AUTOSTART=1 NODE_ENV=dev tsx src/tests/r3d-admin-operations.test.ts"
```

Run: `cd "D:\codex\服务器\Stars flow\app"; yarn test:r3d`

Expected: FAIL with missing overview route.

- [ ] **Step 3: Implement one scope-first query pattern**

Every read service must begin from the actor scope:

```ts
function scopeGroup<T extends Knex.QueryBuilder>(query: T, actor: AuthUser): T {
  if (actor.role === "super_admin") return query;
  return query.where("groupId", actor.groupId) as T;
}
```

Do not query globally and filter arrays in JavaScript. Use SQL scope before count, sum, search, sort, pagination, or joins.

- [ ] **Step 4: Implement overview DTO**

Return only real values:

```ts
type AdminOverviewDto = {
  projects: { total: number; active: number; archived: number };
  tasks: { running: number; failed: number; succeededToday: number };
  queue: { queued: number; running: number; needsAttention: number };
  usage: { estimatedCost30d: number | null; currency: string | null };
  quota: { balance: number | null; rechargeTotal: number | null };
  users: { enabledCreators: number; creatorLimit: number | null };
};
```

For Super Admin, quota contains platform sums; for Admin, only the current group. Unknown costs remain excluded and are reported with an `unknownCostCount` field.

- [ ] **Step 5: Implement project/task pagination and mutations**

Use validated `page`, `pageSize <= 100`, search, status, owner, task type, and date filters. Admin reassignment targets must be enabled Creators in the same group. Archive is reversible and allowed to Admin; permanent delete remains Super Admin-only. Task cancel/retry delegates to the queue service and inherits project/job scope.

- [ ] **Step 6: Verify and commit**

Run: `yarn test:r3d`

Expected: Admin A overview/list/actions contain no group B rows or aggregates; direct group B IDs return `404`.

```powershell
git add package.json src/services/adminOverview.ts src/services/adminProjects.ts src/services/adminTasks.ts src/routes/admin/overview src/routes/admin/projects src/routes/admin/tasks src/router.ts src/tests/r3d-admin-operations.test.ts
git commit -m "feat: add scoped admin operations APIs"
```

### Task 2: Add Usage, Quota, Recharge, And Audit APIs

- [ ] **Step 1: Write failing ledger and scope tests**

Seed known/unknown usage, `manual_topup`, `manual_credit`, `manual_debit`, and `usage_debit`. Assert:

```ts
assert.equal(superSummary.data.rechargeTotal, sumManualTopupAcrossGroups);
assert.equal(adminASummary.data.rechargeTotal, groupAManualTopup);
assert.equal(adminASummary.data.items.some((row: any) => row.groupId === groupBId), false);
assert.equal(await post(adminAToken, "/api/admin/quota/adjustQuota", adjustment), 403);
```

- [ ] **Step 2: Implement scoped usage aggregation**

Support filters by group (Super Admin only), user, project, Provider, model, task type, and date. Return known estimated cost separately from unknown-cost call count. Never return prompt payloads or Provider credentials.

- [ ] **Step 3: Implement manual quota adjustment transaction**

Use this input:

```ts
const adjustmentSchema = z.object({
  groupId: z.number().int().positive(),
  entryType: z.enum(["manual_topup", "manual_credit", "manual_debit"]),
  amount: z.number().positive(),
  reason: z.string().trim().min(2).max(500),
});
```

Only Super Admin can call it. Convert debit to a negative signed amount server-side. In one transaction read current balance, insert ledger, update account, and insert audit. `rechargeTotal` sums positive `manual_topup` only.

- [ ] **Step 4: Implement audit list scope**

Super Admin may filter all groups. Admin query always appends `groupId = actor.groupId` and excludes target user records whose role is Admin or Super Admin. Return redacted summary JSON only.

- [ ] **Step 5: Verify rollback and commit**

Force an audit insert failure in a test transaction and assert balance/ledger remain unchanged. Then run `yarn test:r3d` and expect PASS.

```powershell
git add src/services/adminUsage.ts src/services/quotaManagement.ts src/routes/admin/usage src/routes/admin/quota src/routes/admin/audit src/tests/r3d-admin-operations.test.ts
git commit -m "feat: add scoped usage and quota ledgers"
```

### Task 3: Create Admin-Safe Provider And Global Configuration APIs

- [ ] **Step 1: Add failing redaction/permission tests**

Assert Admin can read Provider name, enable state, model names, and health but response JSON contains none of the real secret value, vendor code, DB path, request base URL credentials, or developer switches. Assert Admin writes return `403`; Super Admin writes pass.

- [ ] **Step 2: Extract provider/config business logic from route handlers**

Move database and filesystem operations from existing `routes/setting/*` handlers into `providerAdmin.ts` and `globalConfigAdmin.ts`. Both old compatibility routes and new `/api/admin/*` routes must call the same services during migration.

Expose explicit read DTOs:

```ts
type ProviderStatusDto = {
  id: string;
  name: string;
  enabled: boolean;
  credentialState: "未配置" | "已配置";
  credentialSuffix: string | null;
  models: Array<{ id: string; name: string; type: "text" | "image" | "video" }>;
  health: "正常" | "异常" | "未检测";
  checkedAt: number | null;
};
```

Never return `inputValues`, vendor executable source, or full credentials to Admin.

- [ ] **Step 3: Enforce current configuration permissions**

- Provider/model/vendor code: Super Admin write, Admin redacted read.
- Prompt/Skill/Memory/Agent: Super Admin write, Admin read-only.
- Database/file/request/dev/other: Super Admin only, not merely readonly for Admin.

Remove R2's Admin write access to prompt/skill/memory at the backend boundary.

- [ ] **Step 4: Add audit calls for every global mutation**

Write only changed field names, resource IDs, enable states, and version/hash metadata. Never include secret values or full prompt content in audit summaries.

- [ ] **Step 5: Verify and commit**

Run: `yarn test:r2; yarn test:r3d`

Expected: update R2 expectations to the superseding R3 rule; both suites pass with Admin readonly and Super Admin write access.

```powershell
git add src/services/providerAdmin.ts src/services/globalConfigAdmin.ts src/routes/admin/providers src/routes/admin/aiConfig src/routes/admin/system src/routes/setting src/app.ts src/router.ts src/tests
git commit -m "feat: migrate global configuration to admin APIs"
```

### Task 4: Register Complete Admin Routes And Typed Client

- [ ] **Step 1: Add failing frontend permission tests**

Test route records and permissions:

```ts
assert.equal(canOpenAdminRoute("admin", "/groups"), false);
assert.equal(canOpenAdminRoute("admin", "/system"), false);
assert.equal(canOpenAdminRoute("admin", "/quota"), true);
assert.equal(canOpenAdminRoute("super_admin", "/groups"), true);
```

- [ ] **Step 2: Define typed API response contracts**

In `adminApi.ts`, define `PagedResult<T>`, `AdminOverviewDto`, `GroupDto`, `AdminUserDto`, `AdminProjectDto`, `AdminTaskDto`, `QueueJobDto`, `UsageSummaryDto`, `QuotaAccountDto`, `QuotaLedgerDto`, `ProviderStatusDto`, and `AuditDto`. Keep endpoint functions small and explicit.

- [ ] **Step 3: Register all admin routes with role metadata**

Add lazy routes for `/groups`, `/users`, `/projects`, `/tasks`, `/queue`, `/usage`, `/quota`, `/providers`, `/ai-config`, `/system`, `/audit`, and `/profile`. The router guard must reject direct navigation when the role metadata does not include the current role.

- [ ] **Step 4: Add shared operational components**

`PagedTable` owns pagination/loading/empty/error layout but not business filters. `StatusText` maps stable backend states to Chinese labels without changing cell dimensions. `PageHeader` contains compact title and commands; it must not render feature-description prose.

- [ ] **Step 5: Verify and commit**

Run: `cd "D:\codex\服务器\Stars flow\web"; yarn test:admin; yarn type-check`

Expected: route permission and API type tests pass.

```powershell
git add src/admin/api src/admin/router.ts src/admin/components src/admin/__tests__/permissions.test.ts
git commit -m "feat: register typed admin operations routes"
```

### Task 5: Build Group And User Administration Pages

- [ ] **Step 1: Write component behavior tests**

Mount UsersPage with Admin data and assert role controls only offer Creator, group selector is absent, enabled-count/limit is displayed, and no other Admin/Super Admin row renders. Mount GroupsPage as Super Admin and assert group create/edit controls exist.

- [ ] **Step 2: Implement GroupsPage for Super Admin**

Use one dense table with columns `分组`, `管理员`, `启用创作者`, `创作者上限`, `当前余额`, `状态`, `更新时间`, `操作`. Create/edit dialogs require name, Admin binding, Creator limit, status, and concurrency summary. No nested cards.

- [ ] **Step 3: Implement UsersPage by role**

Admin sees only its group header, enabled count, limit, Creator table, create/reset/enable/disable actions, and personal concurrency editor. Super Admin adds group and role filters and may create Admin. Password values are shown once only after create/reset and never appear in list responses.

- [ ] **Step 4: Verify and commit**

Run: `yarn test:admin; yarn type-check; yarn build:admin`

Expected: role-specific controls and Chinese validation tests pass.

```powershell
git add src/admin/pages/GroupsPage.vue src/admin/pages/UsersPage.vue src/admin/__tests__
git commit -m "feat: add scoped group and user pages"
```

### Task 6: Build Project, Task, Queue, And Concurrency Pages

- [ ] **Step 1: Add filter/action behavior tests**

Test that Admin project reassignment options contain only same-group Creators; cross-group IDs are not rendered. Test queue page shows four limits, dynamic queue position, and no Admin priority control.

- [ ] **Step 2: Implement ProjectsPage and TasksPage**

Projects columns: `项目`, `负责人`, `分组` (Super Admin only), `状态`, `任务`, `预估成本`, `最近活动`, `操作`. Tasks columns: `任务`, `类型`, `项目`, `发起人`, `状态`, `排队/开始时间`, `模型`, `错误`, `操作`. Use server pagination and scope; do not aggregate client-side.

- [ ] **Step 3: Implement QueuePage**

Display group total/type limits, current running counts, per-user limits, queue counts, and jobs. Admin can edit Creator limits and cancel allowed jobs. Super Admin can edit group/Admin limits, filter groups, reprioritize with a mandatory reason, and process `needs_attention` jobs.

Use Chinese states: `排队中`, `执行中`, `恢复中`, `需要处理`, `已完成`, `失败`, `已取消`. Queue position must be labeled `预计排队位置`.

- [ ] **Step 4: Verify and commit**

Run: `yarn test:admin; yarn type-check; yarn build:admin`

Expected: scoped options/actions and concurrency labels pass.

```powershell
git add src/admin/pages/ProjectsPage.vue src/admin/pages/TasksPage.vue src/admin/pages/QueuePage.vue src/admin/__tests__
git commit -m "feat: add production operations and queue pages"
```

### Task 7: Build Usage, Quota, And Audit Pages

- [ ] **Step 1: Add summary/calculation display tests**

Assert `充值总额` uses backend `rechargeTotal`, unknown costs display `未提供计价`, and Admin has no adjustment button. Super Admin adjustment requires type, positive amount, and reason.

- [ ] **Step 2: Implement UsagePage**

Provide scoped filters and table breakdowns by date, group (Super Admin), user, project, Provider, model, and type. Label all values `预估成本`; show unknown-cost call count separately.

- [ ] **Step 3: Implement QuotaPage**

Super Admin sees all group balances, recharge totals, usage debits, and ledger; it can open a manual adjustment dialog. Admin sees only its group and no mutation controls. Negative balances use a restrained danger status but do not disable production controls.

- [ ] **Step 4: Implement AuditPage**

Show actor, action, target, group, result, time, and a safe summary. Admin view has no group selector and cannot discover high-role account activity. Never render raw JSON without a field allowlist.

- [ ] **Step 5: Verify and commit**

Run: `yarn test:admin; yarn type-check; yarn build:admin`

Expected: cost wording, quota permissions, and audit redaction tests pass.

```powershell
git add src/admin/pages/UsagePage.vue src/admin/pages/QuotaPage.vue src/admin/pages/AuditPage.vue src/admin/__tests__
git commit -m "feat: add usage quota and audit pages"
```

### Task 8: Migrate Provider, AI, And System Settings Out Of Creator

- [ ] **Step 1: Add build and permission tests before moving imports**

Extend the Creator build scan with unique component/module names: `VendorConfig`, `ModelMap`, `PromptManage`, `SkillManagement`, `DbConfig`, `DevConfig`, `FileManagement`. Assert Admin settings pages render readonly controls and Super Admin renders edit/save commands.

- [ ] **Step 2: Build ProvidersPage**

Admin receives status/model/health rows only; credential controls and vendor code are absent. Super Admin uses migrated vendor/model editors and tests. Mask credentials as `已配置 (...末四位)` only when the backend supplies a suffix.

- [ ] **Step 3: Build AiConfigPage**

Tabs: `Agent 模型`, `Prompt`, `Skill`, `Memory`. Admin is readonly; Super Admin can save. Do not add group-level overrides.

- [ ] **Step 4: Build SystemPage**

Super Admin-only tabs: `数据库`, `文件`, `请求`, `开发设置`, `其他设置`. Preserve destructive confirmations and add audit-aware Chinese success/error states. Do not register this route for Admin.

- [ ] **Step 5: Reduce Creator settings to personal scope**

Remove imports and templates for vendor, model map, agent, prompt, skill, memory, user management, database, file, request, dev, and other configuration from the Creator setting entry. Keep only `界面`, `语言`, `个人资料`, `关于`, `退出登录`. Add `ProfilePage` to admin with the same current-user profile/password service.

When a model is unavailable, Creator text says `当前没有可用模型，请联系管理员`; Admin/Super Admin additionally get a command to open `/admin/providers`.

- [ ] **Step 6: Close compatibility writes**

After both builds pass, remove Creator calls to global `/api/setting/*`. Keep temporary backend aliases only for the migrated admin components, and record their removal target in the validation log. Do not leave an Admin write path to Prompt/Skill/Memory through old URLs.

- [ ] **Step 7: Verify and commit**

Run:

```powershell
cd "D:\codex\服务器\Stars flow\web"
yarn test:admin
yarn type-check
yarn build-only
```

Expected: Creator artifact scan contains no global-setting modules; Admin readonly/Super Admin write tests pass.

```powershell
git add src/admin/pages/ProvidersPage.vue src/admin/pages/AiConfigPage.vue src/admin/pages/SystemPage.vue src/admin/pages/ProfilePage.vue src/components/setting src/components/modelSelect.vue src/pages/workbench/index.vue src/locales scripts/check-build-boundaries.mjs
git commit -m "feat: move global settings into admin console"
```

### Task 9: End-To-End R3 Verification

- [ ] **Step 1: Run every automated check**

```powershell
cd "D:\codex\服务器\Stars flow\app"
yarn lint
yarn test:r2
yarn test:r3a
yarn test:r3b
yarn test:r3d
yarn build

cd "D:\codex\服务器\Stars flow\web"
yarn type-check
yarn test:admin
yarn build-only

cd "D:\codex\服务器\Stars flow"
npm run harness:verify:project
```

Expected: every command exits 0.

- [ ] **Step 2: Run browser role matrix**

Use 1 Super Admin, 2 Admins in separate groups, and 2 Creators per group. Verify:

```text
Creator: own projects only; /admin denied; personal settings only.
Admin A: group A users/projects/tasks/queue/cost/quota/audit only; all group B direct IDs return 404.
Admin B: symmetric isolation from group A.
Super Admin: all groups, balances, recharge totals, logs, settings, and concurrency controls.
```

- [ ] **Step 3: Run queue and restart matrix**

Set group total 2, image 1; set Creator total 1. Submit interleaved text/image/video tasks from two Creators, verify four-layer limits and fair order, restart with queued jobs, and verify safe recovery/no duplicate Provider calls.

- [ ] **Step 4: Run visual and Chinese QA**

Capture desktop and narrow viewport screenshots for every admin page. Check no overlapping text/controls, no nested cards, stable table/action dimensions, and Chinese labels for navigation, forms, empty states, validation, confirmation, errors, and job statuses.

- [ ] **Step 5: Verify Creator production regression**

Run the existing novel -> script -> storyboard -> asset -> video path with low-cost/mock Providers. Confirm generated jobs queue, complete, update target resources, and appear in scoped task/cost views.

- [ ] **Step 6: Record validation and close R3**

Create `docs/logbooks/validations/2026-07-10-r3-separated-admin-console.md` with commands, screenshots, API matrices, queue evidence, artifact scan, and residual risks. Update roadmap/status/daily to R3 `Done` only if every required check passed.

- [ ] **Step 7: Commit final evidence**

```powershell
git add docs README.md
git commit -m "docs: close R3 separated admin console"
```
