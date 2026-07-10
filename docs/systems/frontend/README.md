# Frontend System

## Purpose

The frontend system covers the user-facing project creation, script, storyboard, asset, video, and review workspace.

## Runtime Shape

Frontend source lives in the `web/` submodule, forked from Toonflow-web. R3 uses two independent Vite entries: Creator runs at `/` and Admin runs at `/admin/`. Hosted builds use same-origin `/api` and Socket.IO; Electron `file:` builds use the configured backend URL. The applications share only session/API/design primitives.

Compiled output is separated as `web/dist/creator` and `web/dist/admin`, then copied to `app/data/web` and `app/data/web/admin`. Creator routes, layout and chunks must have no import path to Admin pages or global setting editors.

## Visual Direction

Preserve Toonflow's functional density while moving the experience toward Stars Flow's production-console style: clearer state, stronger hierarchy, fewer dead controls, and visible next actions.

## Verification

Frontend visual changes must update the design docs in `frontend-design/` before or alongside implementation.

Use:

```powershell
.\scripts\start-local-visual-dev.ps1
.\scripts\build-web-to-app.ps1
```

浏览器验收必须覆盖 Admin/Super Admin 菜单差异、Creator 后台拒绝、跨组直接 URL/API 拒绝、表格筛选和操作、并发策略提交、队列各终态、手工额度流水以及窄屏无重叠。
