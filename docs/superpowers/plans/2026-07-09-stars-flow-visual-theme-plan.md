# Stars Flow Visual Theme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a centralized Stars Flow visual theme to Toonflow-web while preserving current layouts and functionality.

**Architecture:** Keep Toonflow's Vue/TDesign structure. Add one global SCSS theme entry that maps Xinghuan visual tokens into TDesign variables, then make small component color replacements where hard-coded colors bypass variables.

**Tech Stack:** Vue 3, Vite, SCSS, TDesign Vue Next, existing Toonflow-web assets.

---

### Task 1: Document The Visual Boundary

**Files:**
- Create: `D:\codex\服务器\Stars flow\docs\specs\2026-07-09-stars-flow-visual-requirements.md`
- Create: `D:\codex\服务器\Stars flow\docs\systems\frontend\frontend-design\stars-flow-visual-system.md`
- Create: `D:\codex\服务器\Stars flow\docs\systems\frontend\frontend-design\toonflow-xinghuan-feature-comparison.md`

- [x] **Step 1: Record the approved boundary**

Write that this pass changes visual styling and component styling only. It must not change layout, route structure, component hierarchy, or backend behavior.

- [x] **Step 2: Record the comparison table**

Compare Xinghuan requirements against Toonflow capabilities and mark later-phase items such as RBAC, quota, audit, AI video review, and tenant isolation.

- [x] **Step 3: Record the visual system**

Define the light production-console theme, Xinghuan teal, TDesign mapping, component rules, motion rules, and do-not list.

### Task 2: Add The Unified Theme Entry

**Files:**
- Create: `D:\codex\服务器\Stars flow\web\src\assets\starsflow-theme.scss`
- Modify: `D:\codex\服务器\Stars flow\web\src\main.ts`

- [x] **Step 1: Create Stars Flow tokens**

Define `--stars-*` semantic variables for brand, page, surface, border, text, state, radius, shadow, and motion.

- [x] **Step 2: Map TDesign variables**

Override TDesign brand, background, text, border, radius, shadow, and scrollbar variables from the Stars Flow tokens.

- [x] **Step 3: Add component polish**

Style TDesign buttons, cards, dialogs, drawers, menus, tags, tables, inputs, tabs, notifications, and scrollbars without changing layout.

- [x] **Step 4: Import the theme**

Import `./assets/starsflow-theme.scss` after `./assets/main.scss` in `main.ts` so it overrides Toonflow's default variable block without using deprecated Sass `@import`.

### Task 3: Replace Hard-Coded Visual Colors

**Files:**
- Modify: `D:\codex\服务器\Stars flow\web\src\pages\workbench\index.vue`
- Modify: `D:\codex\服务器\Stars flow\web\src\views\project\index.vue`

- [x] **Step 1: Replace black active state**

Change the hard-coded `#000` active background to `var(--stars-nav-active-bg)`.

- [x] **Step 2: Replace destructive red hover**

Change the hard-coded `red` delete hover to `var(--stars-danger)`.

- [x] **Step 3: Preserve component sizes and layout**

Do not change widths, heights, grids, padding, route logic, DOM order, or component placement.

### Task 4: Verify

**Files:**
- Verify: `D:\codex\服务器\Stars flow\web`
- Verify: `D:\codex\服务器\Stars flow`

- [x] **Step 1: Build frontend assets**

Run:

```powershell
yarn build-only
```

Expected: Vite build completes successfully.

- [x] **Step 2: Run project harness**

Run:

```powershell
npm run harness:verify:project
```

Expected: Harness exits successfully.

- [x] **Step 3: Review changed files**

Run:

```powershell
git status --short
git diff -- web/src/main.ts web/src/assets/starsflow-theme.scss web/src/pages/workbench/index.vue web/src/views/project/index.vue
```

Expected: Only visual-theme and documentation changes are present.
