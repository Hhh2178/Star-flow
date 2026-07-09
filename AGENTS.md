# AGENTS.md - Stars Flow 项目规则

## Project Root

当前项目根目录：

`D:\codex\服务器\Stars flow`

Stars Flow 是基于 Toonflow 改造的新 AI 漫剧/短剧生产工具主线。旧 `D:\codex\服务器\星环漫剧` 仓库降级为需求、架构、视觉和业务规则参考库，不再作为默认实现主线。

## First Reading Order

任何 agent 或开发者修改本项目之前，先阅读：

1. `AGENTS.md`
2. `README.md`
3. `docs/specs/2026-07-09-stars-flow-toonflow-rebase-design.md`
4. `docs/decisions/ADR-0001-toonflow-rebase-and-deployment-shape.md`
5. `upstream/toonflow-notes.md`
6. `legacy-reference/xinghuan-notes.md`

## Current Direction

- 以 Toonflow-app 作为代码和产品底座。
- 保留 Toonflow 的小说/剧本、Agent、Skill、分镜、素材、视频工作台和 Electron 可封装能力。
- 视觉风格在保留 Toonflow 功能密度的基础上，向星环漫剧的生产中台、项目工作台、后台控制台方向调整。
- 第一阶段优先做十人团队内部服务器版，通过浏览器统一访问。
- 第二阶段再考虑 Electron 客户端连接云端中控。
- 旧星环漫剧只作为参考，不直接搬运其现有前后端实现。

## Safety Rules

- 不要批量删除文件或目录。
- 不要使用 `del /s`、`rd /s`、`rmdir /s`、`Remove-Item -Recurse`、`rm -rf`。
- 如需删除文件，只能删除一个明确文件路径，并先说明原因。
- 不要打印、提交或记录密钥、私钥、API Key、服务器凭据、真实 Provider Key。
- 不要读取、打印、复制或提交根目录中的 `Tencent_Cloud_Server.pem`。
- 在正式确认迁移计划前，不要修改旧 `星环漫剧` 仓库。

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
