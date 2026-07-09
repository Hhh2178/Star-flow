# Stars Flow Visual Requirements

## Status

Approved for first implementation pass on 2026-07-09.

## Purpose

Stars Flow will keep Toonflow as the functional base and replace the product surface with the Xinghuan Manju visual direction. This pass changes visual styling only. It does not change page layout, route structure, component hierarchy, data flow, or backend behavior.

## Source References

| Source | Use |
| --- | --- |
| `D:\codex\服务器\星环漫剧\docs\PRD.md` | Product requirements reference |
| `D:\codex\服务器\星环漫剧\docs\design\ui-visual-direction.md` | Canonical Xinghuan visual direction |
| `D:\codex\服务器\星环漫剧\docs\modules\*.md` | Functional backlog and admin requirements |
| `D:\codex\服务器\Stars flow\app\README.md` | Toonflow runtime, app/web split, and current feature set |
| `D:\codex\服务器\Stars flow\web\src` | Visual implementation source |

## Confirmed Boundary

- Preserve Toonflow's existing functional base.
- Preserve current page layout and information architecture.
- Preserve current Vue routes and workbench navigation.
- Treat Toonflow setting center as the current admin/configuration surface.
- Update foreground, background, buttons, cards, dialogs, tags, tables, hover states, active states, shadows, and lightweight motion.
- Do not introduce new frontend frameworks.
- Do not migrate old Xinghuan frontend code.
- Do not implement RBAC, quotas, billing, audit, workflow state machine, or AI review in this visual pass.

## Product Interpretation

Xinghuan Manju described the target UI as an internal AI manga/short-drama production console: cool light background, white surfaces, medium-high density, clear production state, restrained technical polish, and a Xinghuan teal accent. Toonflow already supplies the short-drama production workflow. Stars Flow should therefore first make Toonflow feel like the Xinghuan production console while retaining Toonflow's working pages.

## Visual Direction

Use a light production-console theme:

- Background: cool white-gray, not pure white.
- Surfaces: white panels with thin borders and subtle elevation.
- Brand accent: Xinghuan teal `#0f766e`.
- Support accent: AI blue-violet for rare AI status labels only.
- Density: medium-high, suitable for daily team production.
- Radius: small-to-medium, generally `6px` to `8px`.
- Shadows: light and functional, used for panels, dialogs, and hover elevation.
- Motion: 120-180ms feedback on hover, active, dialog, drawer, and loading states.

## Application Areas

| Toonflow Area | Stars Flow Visual Requirement |
| --- | --- |
| Login | Clean technical login panel, cool page background, teal primary action, restrained elevation |
| Workbench shell | Keep icon sidebar and main work area; update background, active icon, panel borders, hover feedback |
| Project list | Keep card grid; apply production-console cards, semantic tags, consistent destructive hover color |
| Script and novel areas | Keep current editor/workflow layout; normalize editor, table, and action styling through tokens |
| Production canvas | Keep Vue Flow/workbench arrangement; improve visual hierarchy without moving nodes or panels |
| Asset center | Keep gallery and generation controls; normalize cards, preview surfaces, and action states |
| Setting center | Treat as admin console; make menu, forms, model/provider panels, prompt/skill editors share the same token language |

## Functional Backlog From Xinghuan

These requirements are documented for later phases and must not be included in the first visual pass:

| Requirement | Current Status |
| --- | --- |
| Super Admin/Admin/Creator User roles | Later backend/product phase |
| Quota and cost unit `星力` | Later backend/product phase |
| Project budget and episode budget enforcement | Later backend/product phase |
| Audit logs and security review | Later backend/product phase |
| AI precheck plus manual video review | Later workflow phase |
| Provider-first admin console pages | Partly covered by Toonflow settings; later product phase |
| Tenant isolation and SaaS-ready data model | Later architecture phase |
| NestJS/FastAPI split | Not adopted for current Toonflow base |

## Implementation Entry

The first visual implementation entry is:

`D:\codex\服务器\Stars flow\web\src\assets\starsflow-theme.scss`

It is imported by:

`D:\codex\服务器\Stars flow\web\src\main.ts`

All new visual constants should start in the theme entry. Page-specific component edits are allowed only when an existing component hard-codes colors that cannot be reached through CSS variables.

## Acceptance Criteria

- Existing Toonflow pages keep their current layout and route behavior.
- The web app builds with `yarn build-only`.
- The theme entry centralizes brand, background, surface, border, shadow, status, and motion tokens.
- TDesign primary buttons, tags, cards, dialogs, drawers, menus, tables, inputs, and tabs reflect the Xinghuan production-console direction.
- No old Xinghuan app code is copied into Toonflow.
- Documentation contains a feature comparison table and visual design rules before broader UI refactoring begins.
