# R3A Group Access Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add durable groups, strict user/project/task ownership, scoped admin APIs, and audit primitives so an Admin can only discover and operate resources in their own group.

**Architecture:** Keep the existing Express, Knex, and SQLite runtime. Extend the current three-role account model with `groupId`, centralize scope checks in focused services/middleware, and make out-of-scope resources resolve as `404`. Preserve current route URLs during this phase while adding `/api/admin/*` foundations.

**Tech Stack:** TypeScript 5.9, Express 5, Knex, better-sqlite3, Zod, Node assert smoke tests.

---

## Dependency And File Map

This is the first R3 implementation phase and has no R3 dependency. Do not start the queue or admin frontend work before this phase passes.

**Create:**

- `app/src/types/access.ts`: group-aware access types and scope results.
- `app/src/services/accessScope.ts`: authoritative role/group/project decisions.
- `app/src/services/groupManagement.ts`: group creation, assignment, and Creator-limit transactions.
- `app/src/services/auditLog.ts`: redacted append-only audit writer.
- `app/src/middleware/projectAccess.ts`: request-level project/resource guards.
- `app/src/routes/admin/auth/session.ts`: admin-console session check.
- `app/src/routes/admin/groups/listGroups.ts`
- `app/src/routes/admin/groups/createGroup.ts`
- `app/src/routes/admin/groups/updateGroup.ts`
- `app/src/routes/admin/users/listUsers.ts`
- `app/src/routes/admin/users/createUser.ts`
- `app/src/routes/admin/users/updateUser.ts`
- `app/src/routes/admin/users/resetPassword.ts`
- `app/src/tests/r3a-group-access.test.ts`

**Modify:**

- `app/src/lib/initDB.ts`: fresh-install schemas.
- `app/src/lib/fixDB.ts`: idempotent upgrades and legacy assignment.
- `app/src/types/database.d.ts`: regenerate from the database, never hand-edit.
- `app/src/types/auth.ts`: add `groupId` to `AuthUser`.
- `app/src/middleware/auth.ts`: reload `groupId` on every request.
- `app/src/services/userManagement.ts`: safe group-aware user DTOs.
- `app/src/routes/project/{addProject,getProject,editProject,delProject}.ts`
- `app/src/routes/task/{getTaskApi,getProject,getTaskCategories,taskDetails}.ts`
- `app/src/routes/setting/userManagement/*.ts`: temporary compatibility adapters.
- `app/src/socket/routes/{scriptAgent,productionAgent}.ts`: authorize project before socket work.
- `app/src/app.ts`: mount admin role boundary and resource guards.
- `app/package.json`: add `test:r3a`.

### Task 1: Add Group And Ownership Schema

- [ ] **Step 1: Add a failing schema test**

Create `app/src/tests/r3a-group-access.test.ts` with an initial schema assertion:

```ts
import assert from "node:assert/strict";
import u from "@/utils";

async function assertSchema() {
  for (const table of ["o_group", "o_auditLog"]) {
    assert.equal(await u.db.schema.hasTable(table), true, `${table} must exist`);
  }
  for (const [table, column] of [
    ["o_user", "groupId"],
    ["o_project", "ownerUserId"],
    ["o_project", "groupId"],
    ["o_tasks", "ownerUserId"],
    ["o_tasks", "groupId"],
  ] as const) {
    assert.equal(await u.db.schema.hasColumn(table, column), true, `${table}.${column} must exist`);
  }
}

assertSchema().then(() => process.exit(0), (error) => {
  console.error(error);
  process.exit(1);
});
```

Add the script:

```json
"test:r3a": "cross-env TOONFLOW_NO_AUTOSTART=1 NODE_ENV=dev tsx src/tests/r3a-group-access.test.ts"
```

- [ ] **Step 2: Run the test and verify RED**

Run: `cd "D:\codex\服务器\Stars flow\app"; yarn test:r3a`

Expected: FAIL with `o_group must exist` or a missing-column assertion.

- [ ] **Step 3: Add fresh-install table definitions**

Add these schemas to `initDB.ts` using the existing `TableSchema` list:

```ts
{
  name: "o_group",
  builder: (table) => {
    table.increments("id").primary();
    table.text("name").notNullable();
    table.integer("adminUserId").unique();
    table.integer("creatorLimit").notNullable().defaultTo(5);
    table.text("status").notNullable().defaultTo("enabled");
    table.integer("createdAt").notNullable();
    table.integer("updatedAt").notNullable();
  },
},
{
  name: "o_auditLog",
  builder: (table) => {
    table.increments("id").primary();
    table.integer("actorUserId").notNullable();
    table.text("actorRole").notNullable();
    table.integer("groupId");
    table.text("action").notNullable();
    table.text("targetType").notNullable();
    table.text("targetId");
    table.text("summaryJson").notNullable().defaultTo("{}");
    table.text("result").notNullable();
    table.text("requestId");
    table.integer("createdAt").notNullable();
  },
},
```

Add `groupId` to `o_user`; add `ownerUserId` and `groupId` to `o_project`; add `ownerUserId` and `groupId` to `o_tasks`. Keep legacy `o_project.userId` during migration.

- [ ] **Step 4: Add an idempotent legacy migration**

In `fixDB.ts`, add `ensureTable` beside `addColumn`, then perform this deterministic migration:

```ts
const pendingName = "待分配";
let pending = await knex("o_group").where({ name: pendingName, adminUserId: null }).first();
if (!pending) {
  const [id] = await knex("o_group").insert({
    name: pendingName,
    adminUserId: null,
    creatorLimit: 5,
    status: "enabled",
    createdAt: now,
    updatedAt: now,
  });
  pending = { id };
}

for (const admin of users.filter((user) => user.role === "admin")) {
  let group = await knex("o_group").where({ adminUserId: admin.id }).first();
  if (!group) {
    const [id] = await knex("o_group").insert({
      name: `${admin.name}组`,
      adminUserId: admin.id,
      creatorLimit: 5,
      status: "enabled",
      createdAt: now,
      updatedAt: now,
    });
    group = { id };
  }
  await knex("o_user").where({ id: admin.id }).update({ groupId: group.id });
}

await knex("o_user")
  .where({ role: "creator" })
  .whereNull("groupId")
  .update({ groupId: pending.id });
```

Backfill `ownerUserId` from legacy `userId`, then derive `groupId` from the owner. If an owner is Super Admin or missing, use the pending group. Backfill `o_tasks` from its project. Never guess a Creator-to-Admin relationship.

- [ ] **Step 5: Run the schema test and regenerate types**

Run: `yarn test:r3a`

Expected: PASS.

Run: `yarn lint`

Expected: PASS and `src/types/database.d.ts` includes `o_group`, `o_auditLog`, and the ownership fields after the dev database snapshot refresh.

- [ ] **Step 6: Commit schema foundation**

```powershell
git add package.json src/lib/initDB.ts src/lib/fixDB.ts src/types/database.d.ts src/tests/r3a-group-access.test.ts
git commit -m "feat: add group ownership schema"
```

### Task 2: Make Authentication Group-Aware

- [ ] **Step 1: Extend the test with live auth assertions**

Start the test server using the R2 test helper pattern, create an Admin assigned to a group, log in, and assert:

```ts
const session = await request(baseUrl, "/api/admin/auth/session", adminToken);
assert.equal(session.status, 200);
assert.equal(session.body.data.role, "admin");
assert.equal(session.body.data.groupId, adminGroupId);

const creatorSession = await request(baseUrl, "/api/admin/auth/session", creatorToken);
assert.equal(creatorSession.status, 403);
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `yarn test:r3a`

Expected: FAIL because the admin session route and `groupId` are missing.

- [ ] **Step 3: Extend auth types and middleware**

Use this exact contract in `types/auth.ts`:

```ts
export interface AuthUser {
  id: number;
  name: string;
  role: UserRole;
  groupId: number | null;
}
```

Change `requireAuth` to select `groupId` on every request and normalize it with:

```ts
groupId: userRecord.groupId == null ? null : Number(userRecord.groupId),
```

Reject enabled Admin/Creator accounts with no group using `403` and the Chinese message `账号尚未分配分组，请联系超级管理员`.

- [ ] **Step 4: Add the admin session endpoint**

Create `routes/admin/auth/session.ts`:

```ts
const router = express.Router();
export default router.get("/", async (req, res) => {
  const user = getAuthUser(req);
  if (user.role === "creator") {
    return res.status(403).send(error("当前账号不能进入管理后台"));
  }
  const group = user.groupId == null ? null : await u.db("o_group").where("id", user.groupId).select("name").first();
  return res.send(success({ ...user, groupName: group?.name ?? null }));
});
```

Mount `/api/admin` behind `requireRole("super_admin", "admin")` in `app.ts`; keep the route-level check so the endpoint is safe when tested alone.

- [ ] **Step 5: Run tests and commit**

Run: `yarn test:r3a`

Expected: PASS for Admin and `403` for Creator.

```powershell
git add src/types/auth.ts src/middleware/auth.ts src/routes/admin/auth/session.ts src/app.ts src/router.ts src/tests/r3a-group-access.test.ts
git commit -m "feat: add group-aware admin sessions"
```

### Task 3: Add Scoped Group And User Management APIs

- [ ] **Step 1: Write failing API scenarios**

Add two Admin groups, five enabled Creators in group A, and one Creator in group B. Assert:

```ts
assert.deepEqual(
  (await request(baseUrl, "/api/admin/users/listUsers", adminAToken)).body.data.map((u: any) => u.groupId),
  [groupAId, groupAId, groupAId, groupAId, groupAId],
);
assert.equal((await request(baseUrl, "/api/admin/groups/listGroups", adminAToken)).status, 403);
assert.equal((await createCreator(adminAToken, groupAId)).status, 409);
assert.equal((await request(baseUrl, "/api/admin/users/listUsers", adminAToken)).body.data.some((u: any) => u.id === adminBId), false);
```

- [ ] **Step 2: Run and verify RED**

Run: `yarn test:r3a`

Expected: FAIL with missing admin group/user routes.

- [ ] **Step 3: Implement the authoritative services**

In `groupManagement.ts`, expose these signatures:

```ts
export interface GroupDto {
  id: number;
  name: string;
  adminUserId: number | null;
  creatorLimit: number;
  status: "enabled" | "disabled";
  createdAt: number;
  updatedAt: number;
}
export interface CreateGroupInput {
  name: string;
  adminUserId: number;
  creatorLimit: number;
  status: "enabled" | "disabled";
}
export interface UpdateGroupInput extends Partial<Omit<CreateGroupInput, "adminUserId">> {
  id: number;
  adminUserId?: number;
}
export interface CreateUserInput {
  name: string;
  password: string;
  role: UserRole;
  groupId?: number;
  status?: "enabled" | "disabled";
}
export interface UpdateUserInput {
  id: number;
  name?: string;
  status?: "enabled" | "disabled";
  groupId?: number;
}
export async function createGroup(actor: AuthUser, input: CreateGroupInput): Promise<GroupDto>;
export async function updateGroup(actor: AuthUser, input: UpdateGroupInput): Promise<GroupDto>;
export async function createScopedUser(actor: AuthUser, input: CreateUserInput): Promise<SafeUser>;
export async function updateScopedUser(actor: AuthUser, input: UpdateUserInput): Promise<SafeUser>;
export async function listScopedUsers(actor: AuthUser): Promise<SafeUser[]>;
```

Extend `SafeUser` and `SAFE_USER_COLUMNS` with `groupId`; optionally join `groupName` for admin list DTOs. Keep password fields excluded. Admin responses may contain only its own profile and Creator rows from `actor.groupId`.

For Admin creation and Creator enablement, use a Knex transaction. Count only `role = creator AND status = enabled` inside the target group. Return a typed `CREATOR_LIMIT_REACHED` conflict when the count equals `creatorLimit`.

- [ ] **Step 4: Implement thin Zod routes**

Use route schemas that never accept an Admin-supplied group scope:

```ts
const creatorInput = z.object({
  name: z.string().trim().min(2).max(64),
  password: z.string().min(8).max(128),
  status: z.enum(["enabled", "disabled"]).default("enabled"),
});
```

For Admin actors, ignore/reject `groupId` and force `actor.groupId`. For Super Admin, require an explicit target group for Creator creation. Only Super Admin can create Admin, and creating an Admin must create/bind exactly one group in the same transaction.

- [ ] **Step 5: Convert old setting routes to compatibility adapters**

Keep `/api/setting/userManagement/*` temporarily, but delegate to the same service functions. Do not preserve the old `canManageUser` behavior that exposed every Creator to every Admin.

- [ ] **Step 6: Verify and commit**

Run: `yarn test:r3a`

Expected: Admin A sees only group A Creators; Admin B and Super Admin are absent; the sixth enabled Creator returns `409`.

```powershell
git add src/services/groupManagement.ts src/services/userManagement.ts src/routes/admin/groups src/routes/admin/users src/routes/setting/userManagement src/router.ts src/tests/r3a-group-access.test.ts
git commit -m "feat: scope group and user administration"
```

### Task 4: Enforce Project Ownership And Group Isolation

- [ ] **Step 1: Add failing owner/group tests**

Create projects as Creator A, Creator B in the same group, and Creator C in another group. Assert:

```ts
assert.deepEqual(await projectIds(creatorAToken), [creatorAProjectId]);
assert.deepEqual((await projectIds(adminAToken)).sort(), [creatorAProjectId, creatorBProjectId].sort());
assert.deepEqual(await projectIds(adminBToken), [creatorCProjectId]);
assert.equal(await editProject(adminAToken, creatorCProjectId), 404);
assert.equal(await deleteProject(creatorBToken, creatorAProjectId), 404);
```

- [ ] **Step 2: Run and verify RED**

Run: `yarn test:r3a`

Expected: FAIL because project list/edit/delete are currently global.

- [ ] **Step 3: Implement the access service**

In `accessScope.ts`, implement:

```ts
export function applyProjectScope(query: Knex.QueryBuilder, actor: AuthUser) {
  if (actor.role === "super_admin") return query;
  if (actor.role === "admin") return query.where("o_project.groupId", actor.groupId);
  return query.where("o_project.ownerUserId", actor.id);
}

export async function getAccessibleProject(actor: AuthUser, projectId: number) {
  const query = u.db("o_project").where("o_project.id", projectId);
  return applyProjectScope(query, actor).first();
}
```

Return `404` from route helpers when `getAccessibleProject` returns no row. Do not return `403` for an ID outside scope.

- [ ] **Step 4: Update project CRUD**

On creation, derive fields only from auth:

```ts
ownerUserId: actor.id,
groupId: actor.groupId ?? selectedGroupIdForSuperAdmin,
userId: actor.id,
```

For Super Admin creation, require `groupId` and verify it exists. Scope list queries with `applyProjectScope`; call `getAccessibleProject` before edit/delete. Permanent deletion remains Super Admin-only; Admin gets a non-destructive archive/status operation in the admin API later.

- [ ] **Step 5: Verify and commit**

Run: `yarn test:r3a`

Expected: PASS for all owner, same-group Admin, and cross-group `404` cases.

```powershell
git add src/types/access.ts src/services/accessScope.ts src/middleware/projectAccess.ts src/routes/project src/tests/r3a-group-access.test.ts
git commit -m "feat: enforce project group ownership"
```

### Task 5: Scope Task, Resource, And Socket Access

- [ ] **Step 1: Add failing task/resource tests**

Insert one `o_tasks` row per group and select representative project resources (`o_novel`, `o_script`, `o_storyboard`, `o_assets`, `o_video`). Assert Admin A list/detail/action requests never return or mutate group B rows, and direct IDs return `404`.

- [ ] **Step 2: Run and verify RED**

Run: `yarn test:r3a`

Expected: FAIL on global task list/detail or a representative resource mutation.

- [ ] **Step 3: Add reusable resource resolution**

Implement these service signatures in `accessScope.ts`:

```ts
export type ResourceKind = "novel" | "script" | "storyboard" | "asset" | "image" | "video" | "task" | "track";
export async function getProjectIdForResource(
  resource: ResourceKind,
  resourceId: number,
): Promise<number | null>;

export async function assertResourceAccess(
  actor: AuthUser,
  resource: ResourceKind,
  resourceId: number,
): Promise<number>;
```

Resolve through the existing tables and joins, then call `getAccessibleProject`. Never authorize from a client-provided `groupId`.

- [ ] **Step 4: Scope task routes**

Update `routes/task/getTaskApi.ts` to join `o_project` and apply project scope. Scope categories/project filters from the already-scoped task query. Call `assertResourceAccess(actor, "task", taskId)` in `taskDetails.ts`. Return `404` for cross-group IDs.

- [ ] **Step 5: Apply guards to project-bound route families**

For routes with `projectId`, call `requireProjectAccess` after Zod validation. For ID-only routes, resolve the resource before the first read/write. Cover every file under these directories and record each file in the test fixture's route matrix:

```text
src/routes/novel/**
src/routes/script/**
src/routes/scriptAgent/**
src/routes/assets/**
src/routes/assetsGenerate/**
src/routes/cornerScape/**
src/routes/production/**
src/routes/general/**
src/routes/project/**
src/routes/task/**
```

The matrix must test at least one list, one detail, and one mutation per resource kind. A route with no project or resource context must be changed to require one; every project-bound route needs an explicit scope rule before R3A can pass.

- [ ] **Step 6: Guard Agent sockets**

After socket token validation, reload the current AuthUser including `groupId`, then call `getAccessibleProject` before starting ScriptAgent or ProductionAgent. Emit the Chinese error `项目不存在或当前账号无权访问` and do not start the agent on failure.

- [ ] **Step 7: Verify and commit**

Run: `yarn test:r3a`

Expected: all cross-group list/detail/mutation/socket checks pass with no leaked identifiers.

```powershell
git add src/services/accessScope.ts src/middleware/projectAccess.ts src/routes src/socket src/router.ts src/tests/r3a-group-access.test.ts
git commit -m "feat: isolate production resources by group"
```

### Task 6: Add Redacted Audit Logging

- [ ] **Step 1: Add failing audit assertions**

Perform a Creator disable and a project reassignment. Assert the audit rows contain actor/action/group/result but do not contain `password`, `passwordHash`, `apiKey`, or `token` in `summaryJson`.

- [ ] **Step 2: Implement the audit writer**

Use an allowlist, not recursive arbitrary-object serialization:

```ts
export async function writeAudit(input: {
  actor: AuthUser;
  groupId: number | null;
  action: string;
  targetType: string;
  targetId?: string | number;
  summary: Record<string, string | number | boolean | null>;
  result: "success" | "failure";
  requestId?: string;
}) {
  await u.db("o_auditLog").insert({
    actorUserId: input.actor.id,
    actorRole: input.actor.role,
    groupId: input.groupId,
    action: input.action,
    targetType: input.targetType,
    targetId: input.targetId == null ? null : String(input.targetId),
    summaryJson: JSON.stringify(input.summary),
    result: input.result,
    requestId: input.requestId ?? null,
    createdAt: Date.now(),
  });
}
```

- [ ] **Step 3: Wire audit calls into group/user/project mutations**

Write success and failure records for group changes, user create/update/reset, project reassignment/archive/delete, and rejected cross-scope admin mutations. Do not log login passwords or Provider credentials.

- [ ] **Step 4: Verify and commit**

Run: `yarn test:r3a`

Expected: PASS and the secret-name scan over `summaryJson` returns zero rows.

```powershell
git add src/services/auditLog.ts src/services/groupManagement.ts src/routes/project src/tests/r3a-group-access.test.ts
git commit -m "feat: audit scoped administration"
```

### Task 7: R3A Verification And Governance

- [ ] **Step 1: Run all app checks**

```powershell
cd "D:\codex\服务器\Stars flow\app"
yarn lint
yarn test:r2
yarn test:r3a
yarn build
```

Expected: all four commands exit 0.

- [ ] **Step 2: Run the outer harness**

Run: `cd "D:\codex\服务器\Stars flow"; npm run harness:verify:project`

Expected: `[harness] project verification passed`.

- [ ] **Step 3: Record evidence**

Create `docs/logbooks/validations/2026-07-10-r3a-group-access-foundation.md` with commands, commits, two-group test accounts, API matrices, and any residual risk. Update the daily log; keep R3 `In Progress` because R3B-R3D remain.

- [ ] **Step 4: Commit governance evidence**

```powershell
git add docs/logbooks docs/logbooks/progress/functional-reform-status.md
git commit -m "docs: validate R3A group access foundation"
```
