# Toonflow And Xinghuan Feature Comparison

## Purpose

This table records what should be preserved from Toonflow, what should be adopted from Xinghuan Manju, and which gaps belong to later phases. It prevents the first visual pass from turning into a full product rewrite.

## Summary

Toonflow is the runnable product base. Xinghuan Manju is the product requirement, visual direction, and future governance reference. Stars Flow should keep Toonflow's working app and progressively absorb Xinghuan's production-console identity and selected product requirements.

## Comparison

| Area | Xinghuan Manju Requirement | Toonflow Current Capability | Stars Flow Decision |
| --- | --- | --- | --- |
| Product positioning | AI manga/short-drama production middle platform | AI short-drama factory/workbench | Keep Toonflow as base; use Xinghuan positioning language |
| Frontend framework | Next.js, Tailwind, shadcn/ui planned | Vue 3, Vite, TDesign, Vue Flow | Keep Toonflow stack |
| Backend architecture | NestJS, FastAPI AI Runtime, Workers, PostgreSQL, Redis, MinIO planned | Express, SQLite, Socket.IO, Electron, local data directory | Keep Toonflow backend for first phase |
| Project creation | Blank project and AI-generated project, budgets, duration, style | Project creation with type, intro, style, models, ratio, quality | Preserve Toonflow project flow; later add budget fields if needed |
| Novel ingestion | Raw text/docx planned | Novel import and chapter/event handling exists | Preserve Toonflow implementation |
| Text production | Story bible, character cards, scene cards, outline, scripts | ScriptAgent, script management, prompt/skill driven generation | Preserve Toonflow; map future Xinghuan text assets later |
| Production workspace | Stage progress, feed, drawer, AI flow nodes | Production canvas, storyboard, assets, video workbench | Preserve Toonflow layout; style as production console |
| Storyboard and prompts | Segment/shot structure, first/last frame prompts | Storyboard nodes, storyboard table, image generation, prompt generation | Preserve; later align naming and review flow |
| Asset generation | Reference images, annotations, selected main reference | Asset center, image generation, material management | Preserve; later add annotation/review semantics |
| Video generation | Manual sample, AI precheck, manual review, rerun | Video generation, workbench tracks, polling, prompt updates | Preserve; later add Xinghuan QC workflow |
| Editing/export | Planned cutting/export flow | Video workbench and clip tooling exists | Preserve Toonflow; document later export gaps |
| Provider/model admin | Provider-first admin, model catalog, probes, cost rules | Setting center vendor config, model map, model tests | Style setting center as admin console now; deeper admin later |
| Prompt/Skill admin | Prompt templates, Agent strategy versions | Prompt management and Skill management exist | Preserve and style |
| Users/roles | Super Admin/Admin/Creator User | Basic login/user password config | Later backend phase |
| Quota/cost | Star power, budgets, model price rules, cost logs | Basic model/provider operation; no Xinghuan quota system | Later backend phase |
| Audit/security | Audit logs, tenant fields, internal service token | Local app style auth and config | Later backend phase |
| Deployment | Internal team server first, local client later | App can run as local/Electron/server | Continue local plus server staging route |

## Visual Migration Priority

| Priority | Area | Reason |
| --- | --- | --- |
| P0 | Global theme tokens and TDesign mapping | Enables consistent visual changes without layout churn |
| P0 | Login, workbench shell, setting center | First impression and primary daily workflow |
| P1 | Project cards, task list, asset center | High-frequency scanning and actions |
| P1 | Production canvas panels and video workbench | Core production workflow |
| P2 | Prompt/Skill editors and model test panels | Admin/config polish after base tokens land |

## Later Product Migration Backlog

| Backlog Item | Suggested Phase |
| --- | --- |
| Role-based team permissions | Server/internal team phase |
| Provider-first admin page outside dialog | Admin console phase |
| Quota and star power ledger | Cost governance phase |
| AI video precheck and manual review workflow | Production QC phase |
| Audit log and security review | Team governance phase |
| Multi-tenant SaaS readiness | Future SaaS phase |
