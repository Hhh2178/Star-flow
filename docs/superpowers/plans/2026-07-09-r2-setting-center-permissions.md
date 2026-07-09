# R2 Setting Center Permissions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn Toonflow's setting center into a role-aware internal admin surface without changing the overall page layout.

**Architecture:** Keep the existing setting dialog and menu. Add current-user state, menu filtering, backend route guards, and a simple User Management section for Super Admin/Admin.

**Tech Stack:** Vue 3, Pinia, TDesign, Express, Knex.

---

## Files

- Modify: `D:\codex\服务器\Stars flow\web\src\stores\user.ts`
- Modify: `D:\codex\服务器\Stars flow\web\src\components\setting\index.vue`
- Modify: `D:\codex\服务器\Stars flow\web\src\components\setting\components\loginConfig.vue`
- Create: `D:\codex\服务器\Stars flow\web\src\components\setting\components\userManagement.vue`
- Create: `D:\codex\服务器\Stars flow\app\src\routes\setting\userManagement\listUsers.ts`
- Create: `D:\codex\服务器\Stars flow\app\src\routes\setting\userManagement\createUser.ts`
- Create: `D:\codex\服务器\Stars flow\app\src\routes\setting\userManagement\updateUser.ts`
- Create: `D:\codex\服务器\Stars flow\app\src\routes\setting\userManagement\resetPassword.ts`
- Modify: `D:\codex\服务器\Stars flow\app\src\router.ts`
- Update logs: `D:\codex\服务器\Stars flow\docs\logbooks\progress\functional-reform-status.md`

## Tasks

### Task 1: Expose current user safely

- [ ] **Step 1: Add `/setting/loginConfig/me` or equivalent**

Return current user's `id`, `name`, `role`, `status`, and `mustChangePassword`. Do not return password or passwordHash.

- [ ] **Step 2: Update frontend user store**

Store:

```ts
type CurrentUser = {
  id: number;
  name: string;
  role: "super_admin" | "admin" | "creator";
  status: "enabled" | "disabled";
  mustChangePassword: boolean;
};
```

### Task 2: Gate setting menu items

- [ ] **Step 1: Add role metadata to menu items**

Each menu item in `setting/index.vue` gets `roles`.

```ts
{ key: "vendorConfig", label: "settings.menu.vendorConfig", icon: "i-computer", roles: ["super_admin"] }
```

- [ ] **Step 2: Filter menus by current role**

Creators see only UI, language, profile, about, and logout. Admins see production-admin sections but not vendor keys, db, file, request, or dev settings.

- [ ] **Step 3: Keep layout unchanged**

Do not change dialog width, menu placement, or panel arrangement.

### Task 3: Split account profile from user management

- [ ] **Step 1: Convert current login config to own profile**

`loginConfig.vue` edits only the current user's own name/password.

- [ ] **Step 2: Add user management component**

`userManagement.vue` supports:

- list users
- create user
- set role
- enable/disable
- reset temporary password

- [ ] **Step 3: Enforce role restrictions**

Super Admin can manage all roles. Admin can create/update Creator users only. Creator cannot access the component.

### Task 4: Gate backend setting APIs

- [ ] **Step 1: Add route-level `requireRole`**

Apply `requireRole("super_admin")` to vendor, db, file, request, dev, and destructive setting APIs.

- [ ] **Step 2: Apply production admin gate**

Apply `requireRole("super_admin", "admin")` to prompt, skill, and memory management APIs.

- [ ] **Step 3: Add defensive API tests or smoke checks**

Verify that a Creator token receives 403 from vendor config and user management.

### Task 5: Verify

- [ ] **Step 1: Build frontend**

```powershell
cd "D:\codex\服务器\Stars flow\web"
yarn build-only
```

- [ ] **Step 2: Build app**

```powershell
cd "D:\codex\服务器\Stars flow\app"
yarn build
```

- [ ] **Step 3: Manual role smoke**

Log in as each role and confirm visible setting sections match the permission map.

- [ ] **Step 4: Update status**

Set R2 to `Done`, append daily log evidence, and commit.

## Adjustment Checkpoints

Pause and update this plan if:

- The current i18n files require new keys before menus can be renamed.
- Existing setting routes are generated and require route-builder refresh.
- User management needs pagination because internal data already contains many users.
