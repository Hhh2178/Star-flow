# Stars Flow

Stars Flow 是新的 AI 漫剧/短剧生产工具主线，计划以 Toonflow-app 为基础进行改造，并吸收旧星环漫剧项目中已经沉淀的需求、视觉方向和平台化业务规则。

## Current Status

R3 前后台分离、严格分组隔离、持久化生成队列、分层并发、额度台账和管理运营页面已经完成本地真实浏览器验收。Toonflow 后端和前端 fork 分别作为 `app/`、`web/` submodule 纳入外层治理仓库；当前进入 feature 分支合并、gitlink 更新和合并后统一发布门禁阶段。

## Project Direction

- 代码基础：Toonflow-app fork。
- fork 仓库：`https://github.com/Hhh2178/Starflow`。
- 参考项目：`D:\codex\服务器\星环漫剧`。
- 第一阶段形态：十人团队内部服务器版，浏览器访问。
- 第二阶段形态：Electron 客户端连接云端中控。
- 视觉方向：保留 Toonflow 的生产功能密度，向星环漫剧的生产中台、项目工作台、后台控制台方向调整。

## Development And Deployment Shape

第一阶段建议采用双环境：

- 本地开发环境：位于本工作区，用于代码开发、调试、提交和小范围验证。
- 服务器 staging 环境：部署同一项目，用于十人团队内部试用和真实流程验收。

本地和服务器使用同一 Git 仓库，但必须使用不同 `.env`、数据目录、Provider Key 和对象存储配置。真实密钥只放服务器或本机私有环境变量，不进入 Git。

## Documentation Map

- `AGENTS.md`：项目规则和工作入口。
- `docs/INDEX.md`：文档路由和权威来源。
- `docs/specs/2026-07-09-stars-flow-toonflow-rebase-design.md`：新主线迁移设计。
- `docs/decisions/ADR-0001-toonflow-rebase-and-deployment-shape.md`：第一条架构决策。
- `docs/references/server-context.md`：共享服务器上下文和 Stars Flow 部署注意事项。
- `upstream/toonflow-notes.md`：Toonflow 上游分析摘要。
- `legacy-reference/xinghuan-notes.md`：旧星环漫剧参考范围。

## First MVP Goal

第一阶段不追求完整 SaaS 平台，而是先验证一条真实可执行的内部生产链路：

1. 管理员配置 Provider 和模型。
2. 团队成员登录。
3. 创建项目。
4. 导入小说、题材或剧本。
5. 生成剧本结构、角色、场景、分镜。
6. 生成图片素材。
7. 生成视频样片。
8. 人工复核视频。
9. 对失败或不满意节点执行重跑。
10. 记录任务状态和基础成本。

## Branch Model

长期只保留两条主线：

- `main`：稳定可部署版本。
- `dev`：日常集成版本。

需要时可以开短期 `feature/<name>` 分支，但合并后删除。官方 Toonflow 通过 `app` 仓库的 `upstream` remote 同步，不作为长期开发分支。

## Harness Commands

```powershell
npm run harness:verify:project
```

## Visual Development

Visual and UI work uses the Toonflow-web fork as a local `web/` working copy. During local visual development, run:

```powershell
.\scripts\start-local-visual-dev.ps1
```

目标开发环境包含：

- App backend: `http://localhost:10588`
- Creator dev server: `http://localhost:50188`
- Admin dev server: `http://localhost:50189/admin/`

统一发布构建目标是生成两个独立前端产物并复制到 app runtime：

```powershell
.\scripts\build-web-to-app.ps1
```

- Creator: `app/data/web/`
- Admin: `app/data/web/admin/`

当前收敛执行计划：`docs/superpowers/plans/2026-07-10-r3-browser-test-readiness-execution.md`。

无真实 Provider 的本地验收由 app 工作树提供：

```powershell
yarn start:acceptance
```

启动器使用独立 `data/acceptance.sqlite`，并输出 Creator、Admin 和 API 的实际随机端口 URL。浏览器托管版统一使用同源 `/api` 和同源 Socket；Electron `file:` 构建继续使用显式后端地址。

## Non-Goals For Phase 1

- 不做公开注册。
- 不做外部 SaaS 收费。
- 不做完整多租户。
- 不做复杂 RBAC 权限点配置。
- 不迁入旧星环漫剧现有前后端代码。
- 不优先做每个人独立安装的离线桌面版。
