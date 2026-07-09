# ADR-0001 - Toonflow Rebase And Deployment Shape

## Status

Accepted for design phase.

## Context

旧星环漫剧项目在实际推进中出现前后端连接不稳定、页面不可用、端到端项目无法执行和长期局部修补的问题。继续在旧实现上追加功能存在较高风险。

Toonflow-app 已经具备 AI 短剧生产所需的基础创作链路、Agent、Skill、分镜、素材和视频工作台能力，更适合作为新的产品体验底座。

## Decision

Stars Flow 采用 Toonflow-app 作为新主线代码基础。

旧星环漫剧仓库标记为参考库，仅用于提取需求、视觉方向、Provider 管理、预算成本、质检复核和重跑规则。

第一阶段部署形态采用内部服务器 Web App，供十人团队通过浏览器统一访问。

第二阶段再考虑 Electron 客户端连接云端中控。

开发方式采用本地开发环境 + 服务器 staging 环境。两者使用同一 Git 仓库，不共享 `.env`、Provider Key、数据库文件、对象存储目录或生成素材。

## Consequences

正面影响：

- 更快获得可运行的 AI 短剧生产体验。
- 避免继续修补旧星环漫剧中未闭环的前后端结构。
- Provider、素材、项目和成本可以集中管理。
- 保留后续桌面客户端演进空间。
- 本地开发和服务器试用可以同步推进，避免只在本机可用或只在服务器手改。

负面影响：

- Toonflow 的本地 SQLite、Express 单体和安全模型需要逐步加固。
- 旧星环漫剧已有部分代码资产不会直接复用。
- 如果未来外部分发或商业化，需要处理 Toonflow 补充商业协议。

## Follow-Up

- 在 `Stars flow/app` 中 clone 或 fork Toonflow 前，需要用户确认。
- 建立 7-10 天验证期，优先证明端到端项目生产链路。
- 验证成功后再决定是否正式冻结旧星环漫剧实现。
