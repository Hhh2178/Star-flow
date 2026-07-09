# Frontend System

## Purpose

The frontend system covers the user-facing project creation, script, storyboard, asset, video, and review workspace.

## Runtime Shape

Frontend source lives in the local `web/` working copy, forked from Toonflow-web. The Vite dev server runs on `50188` and talks to the app backend at `http://localhost:10588/api` by default.

Compiled frontend output is copied into `app/data/web` for the app runtime.

## Visual Direction

Preserve Toonflow's functional density while moving the experience toward Stars Flow's production-console style: clearer state, stronger hierarchy, fewer dead controls, and visible next actions.

## Verification

Frontend visual changes must update the design docs in `frontend-design/` before or alongside implementation.

Use:

```powershell
.\scripts\start-local-visual-dev.ps1
.\scripts\build-web-to-app.ps1
```
