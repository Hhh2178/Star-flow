# AGENTS.md - Stars Flow 项目规则

## Project Root

当前项目根目录：

`D:\codex\服务器\Stars flow`

Stars Flow 是基于 Toonflow 改造的新 AI 漫剧/短剧生产工具主线。旧 `D:\codex\服务器\星环漫剧` 仓库降级为需求、架构、视觉和业务规则参考库，不再作为默认实现主线。

## First Reading Order

任何 agent 或开发者修改本项目之前，先阅读：

1. `AGENTS.md`
2. `README.md`
3. `docs/INDEX.md`
4. `docs/specs/2026-07-09-stars-flow-toonflow-rebase-design.md`
5. `docs/decisions/ADR-0001-toonflow-rebase-and-deployment-shape.md`
6. `docs/references/server-context.md`
7. 最新 `docs/logbooks/daily/*.md`
8. `upstream/toonflow-notes.md`
9. `legacy-reference/xinghuan-notes.md`

## Current Direction

- 以 Toonflow-app 作为代码和产品底座。
- Toonflow fork 仓库为 `https://github.com/Hhh2178/Starflow`。
- 保留 Toonflow 的小说/剧本、Agent、Skill、分镜、素材、视频工作台和 Electron 可封装能力。
- 视觉风格在保留 Toonflow 功能密度的基础上，向星环漫剧的生产中台、项目工作台、后台控制台方向调整。
- 第一阶段优先做十人团队内部服务器版，通过浏览器统一访问。
- 第二阶段再考虑 Electron 客户端连接云端中控。
- 旧星环漫剧只作为参考，不直接搬运其现有前后端实现。
- 当前代码由外层治理仓库和 `app/`、`web/` 两个 Git submodule 组成；三者保留独立历史，但必须作为一个发布单元验证。
- 服务器内部试用环境已发布至 `https://starsflow.hhh2121.xyz`；systemd 服务、Nginx、HTTPS、SQLite 持久化库和 OSS 目录的非敏感事实以 `docs/references/server-context.md` 为准。
- `dev` 用于日常集成；通过完整发布门禁后才合入 `main`。外层发布 gitlink 必须同时指向 app/web 已验证的 `main` 提交，`.gitmodules` 的两个 submodule 发布跟踪分支统一为 `main`。
- R3 已合并；当前后端开发入口恢复为 `app/` 的 `dev`，前端开发入口恢复为 `web/` 的 `dev`。旧 R3 feature worktree 仅用于追溯，后续任务应从最新 `dev` 创建新的短期分支或 worktree。
- R3 的完成口径不是“页面可打开”，而是 Creator/Admin 双入口完成真实角色、队列、并发、额度、日志和异步生成状态的浏览器交互验证。

## Current Execution Entry

继续 R3 时按以下顺序读取和执行：

1. `docs/specs/2026-07-10-stars-flow-separated-admin-console-design.md`
2. `docs/superpowers/plans/2026-07-10-r3-browser-test-readiness-execution.md`
3. `docs/logbooks/progress/functional-reform-status.md`
4. `docs/logbooks/daily/2026-07-10.md`

R3 剩余实现必须遵守：

- 先补测试并确认失败，再实现行为。
- 当前产品只面向电脑端：不设计、不实现、不修复、不验收移动端或平板端适配，也不测试移动端/平板端视口；前端与浏览器验收统一使用桌面分辨率。
- Admin 跨组列表、聚合和直接 ID 访问都必须由服务端隔离，越界资源返回 `404`。
- Creator 构建不得包含后台页面或全局配置代码。
- 生成任务的浏览器状态至少覆盖排队、执行、成功、失败、取消和需要处理。
- 浏览器验收必须实际点击、输入、提交、刷新和切换账号，不以静态截图代替交互验证。

当前服务器发布与 GitHub 合流时还必须读取：

1. `docs/logbooks/validations/2026-07-12-server-staging-release.md`
2. `docs/references/server-context.md`
3. `docs/systems/harness/README.md`

## Server Context

- 共享服务器上下文已整理到 `docs/references/server-context.md`。
- 服务器操作必须使用 `ubuntu@101.33.75.38` 和 SSH 端口 `728`。
- 不要使用 `root@101.33.75.38`。
- 不要读取、打印或提交 SSH 私钥。
- Stars Flow 部署不能修改内部代理、画布、广告监控或其他既有项目的 Nginx 路由和服务。
- 正式部署前必须重新确认服务器端口、磁盘、内存、Node.js、PostgreSQL、Redis、Nginx 和 Docker 状态。

## Safety Rules

- 不要批量删除文件或目录。
- 不要使用 `del /s`、`rd /s`、`rmdir /s`、`Remove-Item -Recurse`、`rm -rf`。
- 如需删除文件，只能删除一个明确文件路径，并先说明原因。
- 不要打印、提交或记录密钥、私钥、API Key、服务器凭据、真实 Provider Key。
- 不要读取、打印、复制或提交根目录中的 `Tencent_Cloud_Server.pem`。
- 在正式确认迁移计划前，不要修改旧 `星环漫剧` 仓库。

## Branch Rules

- 只使用 `main` 和 `dev` 作为长期分支。
- `main` 是稳定可部署分支。
- `dev` 是日常集成分支。
- 短期任务可以使用 `feature/<name>`，合并后删除。
- 不创建长期模块分支。
- 官方 Toonflow 只作为 `app` 仓库的 `upstream` remote，不直接作为 Stars Flow 开发主线。

## Verification Commands

在提交 Stars Flow 外层治理仓库前运行：

```powershell
npm run harness:verify:project
```

在修改 Toonflow app 代码后，还需要进入 `app/` 运行对应 Toonflow 检查。

R3 浏览器就绪检查以 `docs/superpowers/plans/2026-07-10-r3-browser-test-readiness-execution.md` 的命令矩阵为准。外层统一构建最终必须同时产出 `app/data/web/` Creator 静态文件和 `app/data/web/admin/` Admin 静态文件。

本地无付费验收先通过 `STARS_ACCEPTANCE_PASSWORD` 自定义本机密码并运行 `yarn seed:acceptance`，再运行 `yarn start:acceptance`。该入口使用独立的 `data/acceptance.sqlite`、确定性测试数据和假 Provider 执行器，不得连接真实 Provider，也不得把验收账号密码写入文档或日志。

## Documentation Rules

- 路线和架构决策写入 `docs/decisions/`。
- 产品和迁移设计写入 `docs/specs/`。
- Toonflow 上游分析写入 `upstream/`。
- 旧星环漫剧参考结论写入 `legacy-reference/`。
- 新项目实现前，先保证端到端 MVP 链路设计明确。

## Stop And Ask

遇到以下情况先询问用户：

- 是否要正式 clone / fork Toonflow 到本项目目录。
- 是否要把旧星环漫剧代码迁入 Stars Flow。
- 是否要引入商业授权、外部分发或公开 SaaS 能力。
- 是否要处理真实 Provider Key、真实用户素材、真实付费生成任务。
- 是否要部署到服务器或修改已有服务器服务。
