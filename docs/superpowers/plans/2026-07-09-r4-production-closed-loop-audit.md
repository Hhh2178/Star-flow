# R4 Production Closed Loop Audit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Verify and stabilize the existing Toonflow production chain before adding larger Xinghuan workflow features.

**Architecture:** Treat Toonflow's existing flow as the base: project -> novel/script -> ScriptAgent -> assets/storyboard -> ProductionAgent -> video workbench. Audit what already works, fix blocking defects, and record gaps instead of redesigning the whole flow.

**Tech Stack:** Toonflow app, Toonflow-web, Express APIs, Vue workbench, current local/server runtime.

---

## Files

- Create: `D:\codex\服务器\Stars flow\docs\systems\app\production-closed-loop-runbook.md`
- Create: `D:\codex\服务器\Stars flow\docs\logbooks\validations\YYYY-MM-DD-production-closed-loop.md`
- Review: `D:\codex\服务器\Stars flow\web\src\views\project\index.vue`
- Review: `D:\codex\服务器\Stars flow\web\src\views\novel\index.vue`
- Review: `D:\codex\服务器\Stars flow\web\src\views\scriptAgent\index.vue`
- Review: `D:\codex\服务器\Stars flow\web\src\views\script\index.vue`
- Review: `D:\codex\服务器\Stars flow\web\src\views\cornerScape\index.vue`
- Review: `D:\codex\服务器\Stars flow\web\src\views\production\index.vue`
- Review: `D:\codex\服务器\Stars flow\web\src\views\assets\index.vue`
- Update logs: `D:\codex\服务器\Stars flow\docs\logbooks\progress\functional-reform-status.md`

## Tasks

### Task 1: Define the accepted closed loop

- [ ] **Step 1: Write the runbook path**

Document the expected internal-team flow:

1. Log in.
2. Configure model provider.
3. Create project.
4. Import novel or create script project.
5. Generate/prepare script content.
6. Extract assets.
7. Build storyboard.
8. Generate reference images.
9. Generate video prompt.
10. Generate video sample.
11. Review and adjust.

- [ ] **Step 2: Identify required input data**

Document the smallest test project, model settings, and mock/provider assumptions.

### Task 2: Run browser-level smoke

- [ ] **Step 1: Start local backend and web dev server**

Use existing scripts:

```powershell
cd "D:\codex\服务器\Stars flow"
.\scripts\start-local-visual-dev.ps1
```

- [ ] **Step 2: Walk through the flow**

Record each page, button, API result, and failure in the validation log.

- [ ] **Step 3: Categorize failures**

Use these categories:

- Blocking: prevents continuing the loop.
- Major: works only with manual workaround.
- Minor: visual or copy issue.
- Deferred: requires provider/API account or product decision.

### Task 3: Fix only blocking defects

- [ ] **Step 1: Fix one blocker at a time**

Each blocker gets one focused commit.

- [ ] **Step 2: Re-run the failed step**

Do not proceed until the previous failed step passes or is explicitly deferred.

- [ ] **Step 3: Update validation log**

Every fixed blocker needs before/after evidence.

### Task 4: Build the gap table

- [ ] **Step 1: Compare Toonflow flow to Xinghuan requirements**

Mark each requirement as:

- Already works.
- Works but needs naming/UI polish.
- Needs backend data.
- Needs new workflow state.
- Deferred.

- [ ] **Step 2: Keep existing design where enough**

If Toonflow already has a good design for a Xinghuan need, record it as "reuse Toonflow".

### Task 5: Verify

- [ ] **Step 1: Frontend build**

```powershell
cd "D:\codex\服务器\Stars flow\web"
yarn build-only
```

- [ ] **Step 2: App build**

```powershell
cd "D:\codex\服务器\Stars flow\app"
yarn build
```

- [ ] **Step 3: Harness**

```powershell
cd "D:\codex\服务器\Stars flow"
npm run harness:verify:project
```

- [ ] **Step 4: Update status**

Set R4 to `Done` only when the runbook, validation log, and gap table exist.

## Adjustment Checkpoints

Pause and update this plan if:

- Real model provider credentials are needed to continue.
- Server deployment behavior differs from local behavior.
- A flow relies on desktop/Electron-only behavior and needs a server-safe replacement.
