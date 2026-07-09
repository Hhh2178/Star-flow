# R3 Project Ownership And Production Access Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make projects and production APIs respect three-role access rules.

**Architecture:** Keep Toonflow's project and production tables. Use `o_project.userId` as the first ownership boundary. Super Admin and Admin can see all projects in the first internal-team version; Creator can see only owned projects.

**Tech Stack:** TypeScript, Express, Knex, Vue 3.

---

## Files

- Modify: `D:\codex\服务器\Stars flow\app\src\routes\project\addProject.ts`
- Modify: `D:\codex\服务器\Stars flow\app\src\routes\project\getProject.ts`
- Modify: `D:\codex\服务器\Stars flow\app\src\routes\project\editProject.ts`
- Modify: `D:\codex\服务器\Stars flow\app\src\routes\project\delProject.ts`
- Create: `D:\codex\服务器\Stars flow\app\src\middleware\projectAccess.ts`
- Review: `D:\codex\服务器\Stars flow\app\src\routes\task\*.ts`
- Review: `D:\codex\服务器\Stars flow\app\src\routes\production\**\*.ts`
- Review: `D:\codex\服务器\Stars flow\app\src\routes\assets\*.ts`
- Update logs: `D:\codex\服务器\Stars flow\docs\logbooks\progress\functional-reform-status.md`

## Tasks

### Task 1: Add project access helper

- [ ] **Step 1: Create `canAccessProject`**

```ts
export async function canAccessProject(user: AuthUser, projectId: number | string): Promise<boolean> {
  if (user.role === "super_admin" || user.role === "admin") return true;
  const project = await u.db("o_project").where("id", projectId).first();
  return Boolean(project && Number(project.userId) === Number(user.id));
}
```

- [ ] **Step 2: Add `requireProjectAccess` middleware**

It should read project id from body, query, params, or resolved entity depending on route.

### Task 2: Scope project routes

- [ ] **Step 1: Fix project creation**

Replace fixed `userId: 1` with current authenticated user id:

```ts
userId: (req as any).user.id
```

- [ ] **Step 2: Scope project list**

Super Admin/Admin return all projects. Creator returns `where("userId", user.id)`.

- [ ] **Step 3: Guard edit/delete**

Before edit/delete, verify `canAccessProject`. Return 403 if not allowed.

### Task 3: Review production routes for missing project context

- [ ] **Step 1: Categorize routes**

Classify each task/production/assets route:

- Direct project id present.
- Entity id present and can resolve project.
- Global configuration route.
- No project context available.

- [ ] **Step 2: Guard direct project routes first**

Apply `requireProjectAccess` only where the project boundary is clear.

- [ ] **Step 3: Record unresolved routes**

Do not guess. Add unresolved routes to the daily log and status tracker as R3 follow-up items.

### Task 4: Frontend behavior

- [ ] **Step 1: Keep page layout unchanged**

Project list still uses the existing grid. It only receives filtered data from backend.

- [ ] **Step 2: Add permission messages**

When an operation gets 403, show a clear message such as "当前账号无权访问该项目".

### Task 5: Verify

- [ ] **Step 1: Create test users**

Create one Admin and two Creators.

- [ ] **Step 2: Project scope smoke**

Creator A creates a project. Creator B must not see or edit it. Admin and Super Admin can see it.

- [ ] **Step 3: Production route smoke**

Run one guarded production route as owner and non-owner. Owner succeeds; non-owner gets 403.

- [ ] **Step 4: Build**

```powershell
cd "D:\codex\服务器\Stars flow\app"
yarn build
```

- [ ] **Step 5: Update status**

Set R3 to `Done` only after scoped routes and unresolved-route list are recorded.

## Adjustment Checkpoints

Pause and update this plan if:

- A route cannot be scoped because the database entity lacks project linkage.
- Existing frontend store assumes all projects are globally visible.
- ProductionAgent socket routes need separate project access checks.
