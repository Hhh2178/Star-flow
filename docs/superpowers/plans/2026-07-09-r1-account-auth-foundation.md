# R1 Account Auth Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Toonflow's single-admin login foundation with a secure three-role account foundation.

**Architecture:** Keep Express, SQLite/Knex, and the current JWT flow. Add role fields, password hashing, auth helpers, and backward-compatible migration from the existing `admin/admin123` account to `super_admin`.

**Tech Stack:** TypeScript, Express, Knex, SQLite, jsonwebtoken, Node crypto.

---

## Files

- Modify: `D:\codex\服务器\Stars flow\app\src\lib\initDB.ts`
- Modify: `D:\codex\服务器\Stars flow\app\src\lib\fixDB.ts`
- Modify: `D:\codex\服务器\Stars flow\app\src\routes\login\login.ts`
- Modify: `D:\codex\服务器\Stars flow\app\src\app.ts`
- Create: `D:\codex\服务器\Stars flow\app\src\types\auth.ts`
- Create: `D:\codex\服务器\Stars flow\app\src\middleware\auth.ts`
- Update logs: `D:\codex\服务器\Stars flow\docs\logbooks\progress\functional-reform-status.md`
- Update daily log: `D:\codex\服务器\Stars flow\docs\logbooks\daily\2026-07-09.md` or current date log

## Tasks

### Task 1: Extend the user model

- [x] **Step 1: Update schema**

Add these fields to `o_user` in `initDB.ts`:

```ts
table.text("role").notNullable().defaultTo("creator");
table.text("status").notNullable().defaultTo("enabled");
table.text("passwordHash");
table.integer("createdAt");
table.integer("updatedAt");
table.integer("lastLoginAt");
table.boolean("mustChangePassword").defaultTo(false);
```

- [x] **Step 2: Update default account**

Default seed should create one enabled Super Admin. Keep `password` only for migration compatibility during R1; use `passwordHash` for new auth.

```ts
await knex("o_user").insert([
  {
    id: 1,
    name: "admin",
    password: "admin123",
    passwordHash: hashPassword("admin123"),
    role: "super_admin",
    status: "enabled",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    mustChangePassword: true,
  },
]);
```

- [x] **Step 3: Add migration repair**

In `fixDB.ts`, add missing columns if an existing database was created before R1. Existing user `id=1` must become `super_admin`.

### Task 2: Add auth types and helpers

- [x] **Step 1: Create role types**

In `types/auth.ts`:

```ts
export type UserRole = "super_admin" | "admin" | "creator";

export interface AuthUser {
  id: number;
  name: string;
  role: UserRole;
}
```

- [x] **Step 2: Create password helpers**

In `middleware/auth.ts`, add `hashPassword` and `verifyPassword` using Node crypto `scryptSync` or `pbkdf2Sync`. The stored value must include salt and derived hash.

- [x] **Step 3: Create role helpers**

Add:

```ts
export function hasRole(user: AuthUser, roles: UserRole[]): boolean;
export function requireRole(...roles: UserRole[]): express.RequestHandler;
```

### Task 3: Update login

- [x] **Step 1: Verify by hash first**

Login must validate `passwordHash` first. If an old row only has `password`, accept it once and write `passwordHash`.

- [x] **Step 2: Enforce account status**

If `status !== "enabled"`, return 403 with a clear message.

- [x] **Step 3: Sign role into JWT**

JWT payload must include:

```ts
{
  id: data.id,
  name: data.name,
  role: data.role
}
```

- [x] **Step 4: Update last login**

Set `lastLoginAt = Date.now()` after successful login.

### Task 4: Centralize auth middleware

- [x] **Step 1: Move token verification into helper**

Create `requireAuth` in `middleware/auth.ts` and use it from `app.ts`.

- [x] **Step 2: Preserve login whitelist**

Only `/api/login/login` remains public.

- [x] **Step 3: Preserve static assets behavior**

Do not change `/oss`, `/skills`, `/assets`, or static web serving in this ring.

### Task 5: Verify

- [x] **Step 1: Build app**

```powershell
cd "D:\codex\服务器\Stars flow\app"
yarn build
```

- [x] **Step 2: Smoke login**

Start the app locally and verify:

```powershell
Invoke-RestMethod -Method Post -Uri "http://127.0.0.1:10588/api/login/login" -Body (@{username="admin";password="admin123"} | ConvertTo-Json) -ContentType "application/json"
```

Expected: response includes token and user role `super_admin`. Do not print real tokens in docs or chat.

- [x] **Step 3: Smoke protected API**

Call one protected API without a token and confirm 401. Call with the token and confirm success.

- [x] **Step 4: Update status**

Set R1 to `Done` in `functional-reform-status.md`, append daily log evidence, and commit.

## Adjustment Checkpoints

Pause and update this plan if:

- Existing packaged `data/serve/app.js` needs the same auth changes before server deployment.
- Password migration affects existing local data.
- Build reveals generated route output that must be refreshed.
