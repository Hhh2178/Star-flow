# R3C Dual Frontend And Admin Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce independent Creator and Admin frontend builds, serve the Admin Console at `/admin/`, and establish Chinese-first admin authentication, layout, routing, and role navigation.

**Architecture:** Keep one Vue repository but create separate entry HTML, app roots, routers, and output directories. Extract only session/API/design primitives into `src/shared`; admin business pages never enter the Creator import graph. Use the same-origin token for seamless switching while requiring `/api/admin/auth/session` before rendering the admin shell.

**Tech Stack:** Vue 3, Vue Router 4, Pinia, TDesign Vue Next, Vite, Vitest, Vue Test Utils, Express static hosting.

---

## Dependency And File Map

Required first: R3A admin session and scoped identity APIs. R3B may proceed in parallel after R3A, but complete R3B before wiring queue pages in R3D.

**Create:**

- `web/admin.html`
- `web/src/shared/api/createApiClient.ts`
- `web/src/shared/auth/session.ts`
- `web/src/shared/types/auth.ts`
- `web/src/admin/main.ts`
- `web/src/admin/AdminApp.vue`
- `web/src/admin/router.ts`
- `web/src/admin/stores/session.ts`
- `web/src/admin/layout/AdminLayout.vue`
- `web/src/admin/navigation.ts`
- `web/src/admin/pages/AdminLogin.vue`
- `web/src/admin/pages/AdminHome.vue`
- `web/src/admin/pages/AdminForbidden.vue`
- `web/src/admin/styles/admin.scss`
- `web/src/admin/__tests__/navigation.test.ts`
- `web/src/admin/__tests__/session.test.ts`
- `web/scripts/check-build-boundaries.mjs`

**Modify:**

- `web/vite.config.ts`
- `web/package.json`
- `web/src/main.ts`
- `web/src/utils/axios.ts`
- `web/src/stores/user.ts`
- `web/src/pages/workbench/index.vue`
- `app/src/app.ts`
- `scripts/build-web-to-app.ps1`
- `scripts/start-local-visual-dev.ps1`

### Task 1: Configure Two Independent Vite Builds

- [ ] **Step 1: Add failing build-boundary test script**

Create `web/scripts/check-build-boundaries.mjs`:

```js
import { readFile, stat } from "node:fs/promises";
import path from "node:path";

const creator = path.resolve("dist/creator/index.html");
const admin = path.resolve("dist/admin/index.html");
await Promise.all([stat(creator), stat(admin)]);

const creatorHtml = await readFile(creator, "utf8");
for (const forbidden of ["/api/admin/", "分组管理", "系统设置", "额度台账"]) {
  if (creatorHtml.includes(forbidden)) throw new Error(`Creator build leaked admin marker: ${forbidden}`);
}
console.log("frontend build boundaries passed");
```

- [ ] **Step 2: Add scripts and run RED**

Add scripts:

```json
"build:creator": "vite build --mode creator",
"build:admin": "vite build --mode admin",
"build-only": "yarn build:creator && yarn build:admin && node scripts/check-build-boundaries.mjs",
"dev:creator": "vite --host --mode creator --port 50188",
"dev:admin": "vite --host --mode admin --port 50189",
"test:admin": "vitest run src/admin/__tests__"
```

Run: `cd "D:\codex\服务器\Stars flow\web"; yarn build-only`

Expected: FAIL because `dist/creator` and `dist/admin` are not generated.

- [ ] **Step 3: Make Vite mode-select the entry and output**

Change `vite.config.ts` to `defineConfig(({ mode }) => { ... })`. Preserve existing plugins and use:

```ts
const admin = mode === "admin";
return {
  base: admin ? "/admin/" : "./",
  build: {
    outDir: admin ? "dist/admin" : "dist/creator",
    emptyOutDir: true,
    assetsInlineLimit: Infinity,
    rollupOptions: {
      input: fileURLToPath(new URL(admin ? "./admin.html" : "./index.html", import.meta.url)),
      output: { inlineDynamicImports: true },
    },
  },
  // keep the current Vue/auto-import/component/CSS/server configuration
};
```

Keep `viteSingleFile()` for both builds. Add `admin.html` with only `<script type="module" src="/src/admin/main.ts"></script>` and the `#app` mount.

- [ ] **Step 4: Add Vitest dependencies and config**

Add `vitest`, `@vue/test-utils`, and `jsdom` as dev dependencies. Configure Vitest in the existing Vite config with `environment: "jsdom"` and the same `@` alias.

- [ ] **Step 5: Verify both builds and commit**

Run: `yarn build-only`

Expected: both HTML files exist and boundary script passes.

```powershell
git add package.json yarn.lock vite.config.ts admin.html scripts/check-build-boundaries.mjs
git commit -m "build: split creator and admin frontend outputs"
```

### Task 2: Extract Router-Neutral Session And API Primitives

- [ ] **Step 1: Write failing session tests**

Test that the shared token store is reusable, Creator receives an admin denial, and `401` invokes the caller-provided callback instead of importing a concrete router:

```ts
const client = createApiClient({
  getBaseUrl: () => "",
  getToken: () => "token",
  onUnauthorized: () => unauthorizedCalls++,
});
assert.equal(client.defaults.headers.common.Authorization, undefined);
```

Mock the request adapter and assert `Authorization: token` is applied per request.

- [ ] **Step 2: Run and verify RED**

Run: `yarn test:admin`

Expected: FAIL because shared modules do not exist.

- [ ] **Step 3: Implement a router-neutral API factory**

Use this interface:

```ts
export function createApiClient(options: {
  getBaseUrl: () => string;
  getToken: () => string | null;
  getTimeout?: () => number;
  onUnauthorized: () => void;
  onForbidden?: (message: string) => void;
}) {
  const client = axios.create();
  client.interceptors.request.use((config) => {
    config.baseURL = options.getBaseUrl();
    config.timeout = options.getTimeout?.() ?? 30000;
    const token = options.getToken();
    if (token) config.headers.Authorization = token;
    return config;
  });
  return client;
}
```

Normalize successful responses exactly once. Keep TDesign notifications in the Creator/Admin wrappers, not in shared code.

- [ ] **Step 4: Convert Creator axios without behavior regression**

Make `src/utils/axios.ts` instantiate the shared factory with the Creator router and current setting store. Move shared `UserRole`, `CurrentUser`, and token helpers to `src/shared`, then re-export them from the existing user store so current imports keep working.

Use this shared identity shape:

```ts
export interface CurrentUser {
  id: number;
  name: string;
  role: "super_admin" | "admin" | "creator";
  status: "enabled" | "disabled";
  groupId: number | null;
  groupName?: string | null;
  mustChangePassword: boolean;
}
```

- [ ] **Step 5: Verify and commit**

Run: `yarn test:admin; yarn build-only`

Expected: shared tests pass and Creator build still succeeds.

```powershell
git add src/shared src/utils/axios.ts src/stores/user.ts src/admin/__tests__/session.test.ts
git commit -m "refactor: share frontend auth primitives"
```

### Task 3: Build Admin Login And Session Guard

- [ ] **Step 1: Write failing router/session tests**

Assert unauthenticated `/` redirects to `/login`; a Creator session redirects to `/forbidden`; Admin and Super Admin enter `/`.

- [ ] **Step 2: Implement the admin session store**

The store must expose:

```ts
type AdminSessionStore = {
  currentUser: CurrentUser | null;
  loading: boolean;
  load(): Promise<CurrentUser>;
  login(username: string, password: string): Promise<void>;
  logout(): void;
};
```

`login` calls the existing login API, stores the shared token, then calls `/admin/auth/session`. If the role is Creator, clear the token and show `当前账号不能进入管理后台`.

- [ ] **Step 3: Implement admin router**

Use clean admin paths:

```ts
const router = createRouter({
  history: createWebHistory("/admin/"),
  routes: [
    { path: "/login", component: () => import("./pages/AdminLogin.vue"), meta: { public: true } },
    { path: "/forbidden", component: () => import("./pages/AdminForbidden.vue"), meta: { public: true } },
    { path: "/", component: () => import("./layout/AdminLayout.vue"), children: [
      { path: "", name: "admin-home", component: () => import("./pages/AdminHome.vue") },
    ] },
  ],
});
```

The guard loads `/api/admin/auth/session` before protected routes. `401` goes to `/login`; `403` goes to `/forbidden`.

- [ ] **Step 4: Build the Chinese login page**

Use labels `管理后台`, `账号`, `密码`, `登录`, `返回创作前台`. Include loading, validation, disabled-account, network, and role-denied states. Do not include marketing copy or feature descriptions.

- [ ] **Step 5: Verify and commit**

Run: `yarn test:admin; yarn build:admin`

Expected: tests pass and `/admin/login` route is present in the admin build.

```powershell
git add src/admin/main.ts src/admin/AdminApp.vue src/admin/router.ts src/admin/stores/session.ts src/admin/pages src/admin/__tests__
git commit -m "feat: add admin console authentication"
```

### Task 4: Add Role-Aware Chinese Admin Layout

- [ ] **Step 1: Write failing navigation tests**

Define expected menu keys:

```ts
assert.deepEqual(menuKeys("admin"), ["overview", "users", "projects", "tasks", "queue", "usage", "quota", "providers", "aiConfig", "audit"]);
assert.ok(menuKeys("super_admin").includes("groups"));
assert.ok(menuKeys("super_admin").includes("system"));
assert.equal(menuKeys("admin").includes("groups"), false);
assert.equal(menuKeys("admin").includes("system"), false);
assert.deepEqual(renderedMenuKeys("admin", new Set(["admin-home"])), ["overview"]);
```

- [ ] **Step 2: Implement navigation as data**

Use Chinese labels and explicit roles:

```ts
export interface AdminNavigationItem {
  key: string;
  routeName: string;
  label: string;
  path: string;
  roles: Array<"super_admin" | "admin">;
}

export const adminNavigation = [
  { key: "overview", routeName: "admin-home", label: "总览", path: "/", roles: ["super_admin", "admin"] },
  { key: "groups", routeName: "admin-groups", label: "分组管理", path: "/groups", roles: ["super_admin"] },
  { key: "users", routeName: "admin-users", label: "用户管理", path: "/users", roles: ["super_admin", "admin"] },
  { key: "projects", routeName: "admin-projects", label: "项目监管", path: "/projects", roles: ["super_admin", "admin"] },
  { key: "tasks", routeName: "admin-tasks", label: "任务监控", path: "/tasks", roles: ["super_admin", "admin"] },
  { key: "queue", routeName: "admin-queue", label: "队列与并发", path: "/queue", roles: ["super_admin", "admin"] },
  { key: "usage", routeName: "admin-usage", label: "成本与用量", path: "/usage", roles: ["super_admin", "admin"] },
  { key: "quota", routeName: "admin-quota", label: "额度台账", path: "/quota", roles: ["super_admin", "admin"] },
  { key: "providers", routeName: "admin-providers", label: "服务商与模型", path: "/providers", roles: ["super_admin", "admin"] },
  { key: "aiConfig", routeName: "admin-ai-config", label: "AI 全局配置", path: "/ai-config", roles: ["super_admin", "admin"] },
  { key: "system", routeName: "admin-system", label: "系统设置", path: "/system", roles: ["super_admin"] },
  { key: "audit", routeName: "admin-audit", label: "审计日志", path: "/audit", roles: ["super_admin", "admin"] },
] satisfies AdminNavigationItem[];
```

The shell must filter role-allowed navigation again by registered route name. During R3C only `admin-home` is registered, so no unfinished module link is visible. R3D registers each remaining named route and it then appears automatically.

- [ ] **Step 3: Implement a stable work-console layout**

Create a left navigation, compact header, content outlet, current-user menu, `进入创作前台`, and logout. Keep cards limited to repeated summary metrics; use full-width tables/forms for operational pages. Set stable widths and responsive collapse behavior so labels do not overlap.

- [ ] **Step 4: Add the functional home route**

`AdminHome.vue` displays the current role, group name/ID for Admin, and links only to routes already registered. Do not render fake metric values; R3D replaces this with the overview API.

- [ ] **Step 5: Verify and commit**

Run: `yarn test:admin; yarn build:admin`

Expected: navigation tests pass; Creator role has no allowed navigation.

```powershell
git add src/admin/layout src/admin/navigation.ts src/admin/pages/AdminHome.vue src/admin/styles/admin.scss src/admin/__tests__/navigation.test.ts src/admin/router.ts
git commit -m "feat: add Chinese admin console shell"
```

### Task 5: Add Creator-To-Admin Switching Without Exposing Admin Pages

- [ ] **Step 1: Add role-computed switch behavior**

In the Creator workbench, load `currentUser` and render a single admin icon/button only for `admin` or `super_admin`. The command is:

```ts
window.location.assign("/admin/");
```

Creator must not render the command. Do not import admin router/pages/navigation into Creator code.

- [ ] **Step 2: Keep personal settings only in the Creator trigger**

At this phase, change the settings trigger label to `个人设置`. R3D removes global sections after their admin equivalents are live. Keep profile, password, UI, language, about, and logout reachable.

- [ ] **Step 3: Strengthen build scan**

Scan the entire `dist/creator` directory, not only HTML. Fail if any file contains admin route chunks or these unique markers: `分组管理`, `额度台账`, `系统设置`, `/api/admin/`.

- [ ] **Step 4: Verify and commit**

Run: `yarn build-only`

Expected: boundary scan passes and Creator artifact has no admin markers.

```powershell
git add src/pages/workbench/index.vue scripts/check-build-boundaries.mjs
git commit -m "feat: link authorized users to admin console"
```

### Task 6: Serve And Copy Both Frontends

- [ ] **Step 1: Update the copy script**

Copy `web/dist/creator/*` to `app/data/web/` and `web/dist/admin/*` to `app/data/web/admin/`. Validate both source `index.html` files before copying. Do not add a recursive delete command.

- [ ] **Step 2: Mount admin static files and history fallback**

In `app.ts`, mount in this order before auth/API middleware:

```ts
const adminWebDir = path.join(webDir, "admin");
if (fs.existsSync(adminWebDir)) {
  app.use("/admin", express.static(adminWebDir, { acceptRanges: false }));
  app.get(/^\/admin(?:\/.*)?$/, (req, res, next) => {
    if (req.path.startsWith("/api/")) return next();
    return res.sendFile(path.join(adminWebDir, "index.html"));
  });
}
app.use(express.static(webDir, { acceptRanges: false }));
```

Keep `/api/*` routing unaffected. Verify a direct GET to `/admin/login` returns admin HTML.

- [ ] **Step 3: Update local dev launcher**

Start one Vite creator dev server and one admin-mode Vite server on distinct ports, or use Vite's creator server plus an explicit admin command. Print both URLs. Keep the backend on its current local port.

- [ ] **Step 4: Build/copy/smoke and commit**

Run:

```powershell
cd "D:\codex\服务器\Stars flow"
.\scripts\build-web-to-app.ps1
```

Expected: output confirms both builds copied; `app/data/web/index.html` and `app/data/web/admin/index.html` exist.

```powershell
cd "D:\codex\服务器\Stars flow\app"
git add src/app.ts
git commit -m "feat: serve admin frontend routes"

cd "D:\codex\服务器\Stars flow"
git add scripts/build-web-to-app.ps1 scripts/start-local-visual-dev.ps1
git commit -m "build: copy separate creator and admin apps"
```

### Task 7: R3C Verification And Governance

- [ ] **Step 1: Run frontend and app checks**

```powershell
cd "D:\codex\服务器\Stars flow\web"
yarn type-check
yarn test:admin
yarn build-only

cd "D:\codex\服务器\Stars flow\app"
yarn lint
yarn build
```

Expected: all commands exit 0.

- [ ] **Step 2: Browser smoke all roles**

Verify direct `/admin/login`, shared Admin session, Creator denial, logout, Creator-to-admin switch, and direct refresh on `/admin/`. Capture desktop and narrow viewport screenshots; confirm Chinese text fits and no controls overlap.

- [ ] **Step 3: Record evidence and commit**

Create `docs/logbooks/validations/2026-07-10-r3c-dual-frontend-shell.md`, update daily/status, and keep R3 `In Progress`.

```powershell
cd "D:\codex\服务器\Stars flow"
git add docs/logbooks docs/logbooks/progress/functional-reform-status.md
git commit -m "docs: validate R3C dual frontend shell"
```
