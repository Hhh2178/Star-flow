# Stars Flow Visual Skin V2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all user-visible upstream branding and repository promotion, establish a replaceable Stars Flow brand registry, and apply the approved Stars-themed blue-gradient capsule skin to Creator and Admin without changing business layout or behavior.

**Architecture:** Keep the existing dual Vite entries and component hierarchy. Add one brand registry/component boundary, enforce product identity and theme contracts with source/build scans, then migrate existing page styles to shared semantic tokens in progressively broader surface groups. Visual acceptance uses the real local backend and deterministic R3 fixture at desktop and narrow viewports.

**Tech Stack:** Vue 3, TypeScript, SCSS, TDesign Vue Next, Vite, Vitest, Node test runner, existing in-app browser automation.

---

## Worktree And Baseline

- Frontend branch: `feature/visual-skin-v2`
- Frontend worktree: `web/.worktrees/visual-skin-v2`
- Canonical design: `docs/superpowers/specs/2026-07-11-stars-flow-visual-skin-v2-design.md`
- Baseline verified on 2026-07-11: 22 Vitest files / 183 tests, Creator build, Admin build, 7 boundary tests and artifact scan.
- The worktree-local `node_modules` is a junction to `web/node_modules`; it is ignored and must not be committed.

## File Responsibility Map

| Unit | Files | Responsibility |
| --- | --- | --- |
| Brand registry | `src/assets/brand/*`, `src/components/brand/BrandIdentity.vue` | Product name, descriptor, mark URLs and reusable visible identity |
| Identity enforcement | `scripts/product-identity.mjs`, `scripts/product-identity.test.mjs`, `package.json` | Reject upstream branding and repository promotion in source/build output |
| Shared theme | `src/assets/starsflow-theme.scss` | Semantic tokens, TDesign mapping and shared component chrome |
| Creator shell | `src/pages/login/index.vue`, `src/pages/workbench/index.vue`, `src/components/titleBar.vue`, `src/views/project/**` | Login, navigation, title and project surface skin |
| Creator production | `src/views/novel/**`, `src/views/script/**`, `src/views/scriptAgent/**`, `src/views/assets/**`, `src/views/production/**` | Editors, assets, canvas nodes and video workbench skin |
| Admin | `src/admin/styles/admin.scss`, `src/admin/components/**`, `src/admin/pages/**` | Admin shell, tables, filters, states and forms |
| Product copy | `src/locales/language/*.json`, `index.html`, visible About/welcome/update components | Stars Flow wording and removal of upstream/community actions |
| Visual evidence | outer `docs/logbooks/validations/**`, `docs/systems/**/frontend-design/**` | Screenshot matrix, registries and final evidence |

## Task 1: Brand Registry And Shared Identity Component

**Files:**
- Create: `web/.worktrees/visual-skin-v2/src/assets/brand/brand-mark.svg`
- Create: `web/.worktrees/visual-skin-v2/src/assets/brand/brand-wordmark.svg`
- Create: `web/.worktrees/visual-skin-v2/src/assets/brand/brand-favicon.svg`
- Create: `web/.worktrees/visual-skin-v2/src/assets/brand/brand.ts`
- Create: `web/.worktrees/visual-skin-v2/src/components/brand/BrandIdentity.vue`
- Create: `web/.worktrees/visual-skin-v2/src/components/brand/BrandIdentity.test.ts`

- [ ] **Step 1: Write the failing registry/component test**

```ts
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import BrandIdentity from "./BrandIdentity.vue";
import { brand } from "@/assets/brand/brand";

describe("Stars Flow brand registry", () => {
  it("exposes one product identity and renders an accessible mark", () => {
    expect(brand).toMatchObject({
      productName: "Stars Flow",
      chineseDescriptor: "AI 漫剧与短剧生产工作台",
    });
    const wrapper = mount(BrandIdentity, { props: { showDescriptor: true } });
    expect(wrapper.text()).toContain("Stars Flow");
    expect(wrapper.text()).toContain("AI 漫剧与短剧生产工作台");
    expect(wrapper.get("img").attributes("alt")).toBe("Stars Flow");
  });
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `yarn vitest run src/components/brand/BrandIdentity.test.ts`

Expected: FAIL because the registry and component do not exist.

- [ ] **Step 3: Add the registry and component**

```ts
import markUrl from "./brand-mark.svg";
import wordmarkUrl from "./brand-wordmark.svg";
import faviconUrl from "./brand-favicon.svg";

export const brand = Object.freeze({
  productName: "Stars Flow",
  chineseDescriptor: "AI 漫剧与短剧生产工作台",
  markAlt: "Stars Flow",
  markUrl,
  wordmarkUrl,
  faviconUrl,
});
```

`BrandIdentity.vue` must expose `compact`, `inverse` and `showDescriptor` props, use only the registry, and keep stable 32px/40px mark dimensions. The temporary SVG mark uses the approved blue-violet gradient, compact `SF` letterforms and one restrained four-point star cue; it avoids blurred glow and makes no final-logo claim.

- [ ] **Step 4: Run the focused test and full source tests**

Run: `yarn vitest run src/components/brand/BrandIdentity.test.ts src`

Expected: 184 tests pass with no changed business tests.

- [ ] **Step 5: Commit**

```powershell
git add src/assets/brand src/components/brand
git commit -m "feat: add replaceable Stars Flow brand registry"
```

## Task 2: Product Identity Enforcement And Upstream UI Removal

**Files:**
- Create: `web/.worktrees/visual-skin-v2/scripts/product-identity.mjs`
- Create: `web/.worktrees/visual-skin-v2/scripts/product-identity.test.mjs`
- Modify: `web/.worktrees/visual-skin-v2/package.json`
- Modify: `web/.worktrees/visual-skin-v2/index.html`
- Modify: `web/.worktrees/visual-skin-v2/src/pages/login/index.vue`
- Modify: `web/.worktrees/visual-skin-v2/src/pages/workbench/index.vue`
- Modify: `web/.worktrees/visual-skin-v2/src/components/titleBar.vue`
- Modify: `web/.worktrees/visual-skin-v2/src/components/hello.vue`
- Modify: `web/.worktrees/visual-skin-v2/src/components/setting/components/about.vue`
- Modify: `web/.worktrees/visual-skin-v2/src/components/setting/components/dbConfig.vue`
- Modify: `web/.worktrees/visual-skin-v2/src/locales/language/*.json`

- [ ] **Step 1: Write failing source/build identity tests**

```js
import test from "node:test";
import assert from "node:assert/strict";
import { scanProductIdentity } from "./product-identity.mjs";

test("product-facing source contains no upstream promotion", async () => {
  const findings = await scanProductIdentity({ root: process.cwd(), mode: "source" });
  assert.deepEqual(findings, []);
});

test("compiled Creator and Admin contain Stars Flow identity only", async () => {
  const findings = await scanProductIdentity({ root: process.cwd(), mode: "dist" });
  assert.deepEqual(findings, []);
});
```

The scanner checks visible templates, locale values, HTML titles and compiled HTML for case-insensitive `toolflow`, `toonflow`, `github`, `gitee`, `atomgit`, `open source`, `open-source`, `开源`, upstream repository URLs and star-request copy. It explicitly excludes source comments, license files, internal `toonflow://` protocol literals and persisted Provider IDs.

- [ ] **Step 2: Verify RED**

Run: `node --test scripts/product-identity.test.mjs`

Expected: FAIL listing login, welcome, workbench, About and locale findings.

- [ ] **Step 3: Route visible identity through `BrandIdentity`**

Replace direct legacy logo imports and visible product literals in login, title bar, welcome and Admin brand surfaces. Set the browser title to `Stars Flow`. Remove repository menu rows, buttons, icons, tooltips, update-source actions and their click handlers; remove empty wrappers and separators left behind.

Keep `toonflow://` Electron protocol calls only where the action is not repository-related. Do not rename persisted Provider IDs or migration keys.

- [ ] **Step 4: Replace bundled locale values mechanically and safely**

Use JSON parsing for every file under `src/locales/language/`. Replace visible product names with `Stars Flow`, replace product descriptions with neutral Stars Flow descriptions, and set removed repository/open-source strings to neutral non-rendered values only if deleting the key would break runtime lookup. No ad hoc regular-expression rewrite of JSON.

Change backup downloads to `stars-flow-backup-${Date.now()}.json` in frontend and record the backend filename counterpart for the later release integration task.

- [ ] **Step 5: Register deterministic scripts**

```json
{
  "scripts": {
    "check:product-identity": "node scripts/product-identity.mjs",
    "test:product-identity": "node --test scripts/product-identity.test.mjs"
  }
}
```

- [ ] **Step 6: Verify source GREEN, then build and verify dist GREEN**

Run:

```powershell
yarn test:product-identity
yarn build-only
yarn check:product-identity
```

Expected: all identity tests pass; Creator and Admin both build; no product-facing finding remains.

- [ ] **Step 7: Commit**

```powershell
git add package.json index.html scripts src/pages src/components src/locales
git commit -m "feat: remove upstream product identity"
```

## Task 3: Normalize Shared Theme Tokens And TDesign Mapping

**Files:**
- Modify: `web/.worktrees/visual-skin-v2/src/assets/starsflow-theme.scss`
- Create: `web/.worktrees/visual-skin-v2/src/assets/starsflow-theme.test.ts`
- Modify: `web/.worktrees/visual-skin-v2/src/assets/main.scss`

- [ ] **Step 1: Write the failing semantic-token contract**

Read `starsflow-theme.scss` in a Vitest test and require the exact V2 contracts: page fallback `#f5f8ff`, blue-violet page and primary gradients, text `#172033`, border `#dce5f2`, capsule control radius `999px`, panel radius `8px`, 180-220ms motion, tabular numeric styling and reduced-motion handling. Reject green/teal action and text tokens, while allowing amber/red semantic states.

- [ ] **Step 2: Verify RED**

Run: `yarn vitest run src/assets/starsflow-theme.test.ts`

Expected: FAIL on the changed V2 values and missing needs-attention/tabular-number contracts.

- [ ] **Step 3: Implement the token system**

Keep `:root` as the canonical source. Map TDesign brand, neutral background, borders, text, radius, shadows and focus variables to semantic Stars tokens. Override the full TDesign success palette so it cannot render green text/buttons; completed states use the neutral completion pair. Add shared primary-gradient, secondary-capsule, tabular-counter, focus-visible, page-enter, local-overflow and reduced-motion utilities. Do not add a second palette file.

- [ ] **Step 4: Verify GREEN and inspect hard-coded chrome colors**

Run:

```powershell
yarn vitest run src/assets/starsflow-theme.test.ts
rg -n "#[0-9a-fA-F]{3,8}" src --glob "*.vue" --glob "*.scss"
```

Classify remaining findings in the plan log as neutral/state/media-specific before changing page files. Add a source scan for direct green/teal presentation values (`green`, `#0f766e`, `#115e59`, `#16a34a`, `#15803d`, TDesign success themes) and either migrate them or prove they are non-rendered data/test literals.

- [ ] **Step 5: Commit**

```powershell
git add src/assets
git commit -m "style: normalize Stars Flow visual tokens"
```

## Task 4: Skin Creator Login, Shell And Project Surface

**Files:**
- Modify: `web/.worktrees/visual-skin-v2/src/pages/login/index.vue`
- Modify: `web/.worktrees/visual-skin-v2/src/pages/workbench/index.vue`
- Modify: `web/.worktrees/visual-skin-v2/src/components/titleBar.vue`
- Modify: `web/.worktrees/visual-skin-v2/src/views/project/index.vue`
- Modify: `web/.worktrees/visual-skin-v2/src/views/project/components/addProject.vue`
- Modify: `web/.worktrees/visual-skin-v2/src/views/project/components/projectDialog.vue`
- Create: `web/.worktrees/visual-skin-v2/src/pages/__tests__/creator-skin-contract.test.ts`

- [ ] **Step 1: Write failing Creator P0 visual contracts**

Mount login and workbench with existing router/store mocks. Assert the shared brand component is present, repository controls are absent, the current functional controls still exist, and shell/project classes consume semantic CSS variables rather than hard-coded brand colors.

- [ ] **Step 2: Verify RED**

Run: `yarn vitest run src/pages/__tests__/creator-skin-contract.test.ts`

- [ ] **Step 3: Apply skin-only page changes**

Preserve template order and event handlers. Normalize login surface, navigation active/hover state, title bar, project cards, project metadata, action overlays, dialogs, inputs and empty state. Use the subtle page gradient and gradient primary capsules without adding hero copy, marketing cards or new navigation.

- [ ] **Step 4: Run Creator and regression tests**

Run: `yarn vitest run src/pages src/views/project src/components/brand src/stores src/utils`

Expected: focused visual contracts and existing Creator queue/auth tests pass.

- [ ] **Step 5: Commit**

```powershell
git add src/pages src/components/titleBar.vue src/views/project
git commit -m "style: skin Creator shell and projects"
```

## Task 5: Skin Creator Editors, Assets And Production Workbench

**Files:**
- Modify: `web/.worktrees/visual-skin-v2/src/views/novel/**`
- Modify: `web/.worktrees/visual-skin-v2/src/views/script/**`
- Modify: `web/.worktrees/visual-skin-v2/src/views/scriptAgent/**`
- Modify: `web/.worktrees/visual-skin-v2/src/views/assets/**`
- Modify: `web/.worktrees/visual-skin-v2/src/views/production/**`
- Create: `web/.worktrees/visual-skin-v2/src/views/production/visual-state.test.ts`

- [ ] **Step 1: Write failing production-state style contracts**

Require semantic selectors for selected, queued, generating, completed, failed and needs-attention states. Assert existing generation controls and queue-state text remain mounted and callable.

- [ ] **Step 2: Verify RED**

Run: `yarn vitest run src/views/production/visual-state.test.ts`

- [ ] **Step 3: Normalize editor and Agent chrome**

Replace page-level neutral/brand hard codes in novel, script and Agent surfaces with semantic tokens. Keep editor dimensions, split panes, chat behavior and tabs unchanged. Ensure system/assistant/user messages remain distinguishable without decorative bubbles dominating the work area.

- [ ] **Step 4: Normalize assets, storyboard, canvas nodes and video workbench**

Keep image/video media prominent. Normalize asset cards, preview background, node borders, selection, canvas controls, generation status, tracks, toolbars and property panels. Fixed tool controls retain stable dimensions; status additions must not resize nodes or tracks.

- [ ] **Step 5: Run existing queue/Agent tests and the visual contract**

Run: `yarn vitest run src/views src/utils/__tests__/agentJobTracker.test.ts src/utils/__tests__/generationJobTracker.test.ts src/utils/__tests__/useChat.agentQueue.test.ts`

Expected: all selected tests pass with no changed generation behavior.

- [ ] **Step 6: Commit**

```powershell
git add src/views
git commit -m "style: skin Creator production surfaces"
```

## Task 6: Skin Admin Console Consistently

**Files:**
- Modify: `web/.worktrees/visual-skin-v2/src/admin/styles/admin.scss`
- Modify: `web/.worktrees/visual-skin-v2/src/admin/components/AdminLayout.vue`
- Modify: `web/.worktrees/visual-skin-v2/src/admin/components/PageHeader.vue`
- Modify: `web/.worktrees/visual-skin-v2/src/admin/components/StatusText.vue`
- Modify: `web/.worktrees/visual-skin-v2/src/admin/components/LoadingState.vue`
- Modify: `web/.worktrees/visual-skin-v2/src/admin/components/EmptyState.vue`
- Modify: `web/.worktrees/visual-skin-v2/src/admin/components/ErrorState.vue`
- Modify: `web/.worktrees/visual-skin-v2/src/admin/pages/**`
- Create: `web/.worktrees/visual-skin-v2/src/admin/__tests__/visual-skin.test.ts`

- [ ] **Step 1: Write failing Admin visual contracts**

Mount Admin login, layout, queue and one settings page. Assert the shared brand identity, semantic status classes, compact panel radius, neutral table headers, focus-visible treatment and absence of inline upstream/legacy brand colors.

- [ ] **Step 2: Verify RED**

Run: `yarn vitest run src/admin/__tests__/visual-skin.test.ts`

- [ ] **Step 3: Normalize shell and shared components**

Keep sidebar/header placement. Apply the shared blue-gradient capsule language, stable icon buttons, tabular counters and one active navigation signal. Loading, empty, forbidden and error states use compact neutral presentation without feature-explanation copy.

- [ ] **Step 4: Normalize pages by family**

Apply one filter/table/form grammar to overview, groups/users, projects/tasks, queue/concurrency, usage/quota, audit, Provider/AI/system and profile. Replace repeated raw hex values with semantic variables or shared Admin classes. Do not introduce page cards around existing data sections.

- [ ] **Step 5: Run all Admin tests**

Run: `yarn vitest run src/admin src/shared`

Expected: Admin visual contract plus all existing role, API, page and queue tests pass.

- [ ] **Step 6: Commit**

```powershell
git add src/admin
git commit -m "style: unify Admin console skin"
```

## Task 7: Responsive And Accessibility Pass

**Files:**
- Modify: files touched in Tasks 4-6 only where responsive rules are required.
- Create: `web/.worktrees/visual-skin-v2/src/assets/responsive-contract.test.ts`

- [ ] **Step 1: Add failing static responsive contracts**

Require local overflow containment for tables/canvas/toolbars, 36px minimum interactive heights where applicable, `min-width: 0` on flexible text regions, visible focus styles and reduced-motion support. Reject viewport-width font scaling and negative letter spacing.

- [ ] **Step 2: Verify RED**

Run: `yarn vitest run src/assets/responsive-contract.test.ts`

- [ ] **Step 3: Repair CSS without changing business layout**

At 390px, preserve section order and table columns but contain horizontal overflow locally. Ensure titles, buttons, filters, status strips and navigation do not overlap. At desktop, retain medium-high density and avoid excessive whitespace.

- [ ] **Step 4: Run all source tests**

Run: `yarn vitest run src`

Expected: all source test files pass.

- [ ] **Step 5: Commit**

```powershell
git add src
git commit -m "style: harden responsive visual skin"
```

## Task 8: Dual Build, Artifact Scans And Backend Filename Alignment

**Files:**
- Modify: `web/.worktrees/visual-skin-v2/scripts/check-build-boundaries.mjs`
- Modify: `web/.worktrees/visual-skin-v2/scripts/build-boundaries.test.mjs`
- Modify later in backend integration branch: `app/src/routes/setting/dbConfig/exportData.ts`

- [ ] **Step 1: Extend build-boundary tests**

Require Creator/Admin HTML to contain `Stars Flow`, reject upstream product/repository promotion, and keep the existing Creator-no-Admin-module assertion. Test that `yarn test:admin` includes product identity scanning after both builds.

- [ ] **Step 2: Verify RED**

Run: `node --test scripts/build-boundaries.test.mjs`

- [ ] **Step 3: Integrate the scanner into release checks**

Update the boundary script and package command order to build Creator/Admin first, then run structural and identity scans. Do not scan required dependency license comments as product copy.

- [ ] **Step 4: Build and verify GREEN**

Run:

```powershell
yarn build-only
node --test scripts/build-boundaries.test.mjs
yarn check:build-boundaries
yarn check:product-identity
```

- [ ] **Step 5: Align the backend backup filename in a separate app commit**

Change only the response filename from `toonflow-backup-*` to `stars-flow-backup-*`, add or update the focused route test, run backend lint and that test, then commit in `app/dev` or a dedicated short feature branch. Do not rename internal database tables, Provider IDs or protocols.

- [ ] **Step 6: Commit frontend release gates**

```powershell
git add package.json scripts
git commit -m "test: enforce Stars Flow release identity"
```

## Task 9: Real Browser Visual Matrix And Closure

**Files:**
- Create: `Stars flow/docs/logbooks/validations/2026-07-11-visual-skin-v2.md`
- Create: `Stars flow/docs/logbooks/validations/evidence/2026-07-11-visual-skin-v2/*`
- Modify: `Stars flow/docs/systems/frontend/frontend-design/stars-flow-visual-system.md`
- Modify: `Stars flow/docs/systems/frontend/frontend-design/visual-component-registry.md`
- Modify: `Stars flow/docs/systems/admin/frontend-design/design-tokens.md`
- Modify: `Stars flow/docs/systems/admin/frontend-design/visual-component-registry.md`
- Create: `Stars flow/docs/logbooks/daily/2026-07-11.md`

- [ ] **Step 1: Produce one local release from the feature worktree**

Copy `dist/creator` and `dist/admin` into an acceptance app worktree/runtime without overwriting unrelated data. Start the isolated acceptance database and deterministic fake Provider mode. Record the random Creator/Admin URLs without recording fixture passwords.

- [ ] **Step 2: Exercise the visual matrix at required viewports**

Capture Creator login, project list, novel/script, Agent, assets, production canvas and video workbench; capture Admin login, overview, users/groups, queue, quota, Provider/settings and audit. Required viewports: `1440x900`, `1920x1080`, `768x1024`, `390x844`.

- [ ] **Step 3: Inspect interaction states**

Use real hover, focus, active, disabled, loading, empty, queued, running, completed, failed, cancelled and needs-attention states. Check text fit, local overflow, document overflow, stable control dimensions, status semantics and absence of dead repository actions.

- [ ] **Step 4: Run final automated release gate**

```powershell
yarn vitest run src
yarn build-only
node --test scripts/build-boundaries.test.mjs scripts/product-identity.test.mjs
yarn check:build-boundaries
yarn check:product-identity
```

Then from the outer repository:

```powershell
npm run test:release-layout
npm run harness:verify:project
```

- [ ] **Step 5: Record evidence and remaining exceptions**

The validation record lists each route/state/viewpoint, screenshot filename, fixed visual defect, and every retained internal `toonflow` compatibility identifier with the reason it is not product-facing. Do not include passwords, Provider keys or user media.

- [ ] **Step 6: Update docs and commit**

Update visual registries to match actual shipped tokens/components, add the daily log, commit frontend work, fast-forward `web/dev`, update the outer gitlink and rerun the unified release build. Do not mark the visual skin complete until the screenshot matrix and identity scan both pass.

## Completion Gate

Visual Skin V2 is complete only when Creator and Admin share the approved production-console language, all listed surfaces pass desktop/narrow inspection, product-facing upstream/open-source/repository references are absent, the brand registry is the only logo association boundary, all existing functional tests pass, and the final dual-build release unit is reproducible from the merged gitlinks.
