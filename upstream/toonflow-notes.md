# Toonflow Upstream Notes

## Source

- GitHub: https://github.com/HBAI-Ltd/Toonflow-app
- License: Apache-2.0 with supplementary commercial agreement in upstream LICENSE.
- Current observed release during analysis: v1.1.8.

## Useful Capabilities

- AI 短剧生产工作台。
- 小说、剧本、分镜、素材、视频链路。
- ScriptAgent / ProductionAgent。
- Skill 文件化提示词。
- 本地 Agent 记忆。
- 画布式生产界面。
- Electron 桌面封装能力。
- Express 服务端和 SQLite 本地数据。

## Capabilities To Reuse Carefully

- Provider 可编程系统：适合作为灵感，但生产环境不能直接开放任意代码执行。
- 本地 SQLite：适合验证期，团队长期使用需要评估 PostgreSQL。
- 默认登录和长期 token：必须加固后才能用于团队服务器版。
- Electron：第一阶段不优先，第二阶段作为云端中控客户端。

## Upstream Risks

- 补充商业协议会影响未来外部分发或商业化。
- 单体 Express + SQLite 更偏本地工具，不是企业后台平台架构。
- 默认安全模型不能直接用于团队服务器。
- 前端源码在 Toonflow-web 独立仓库，Toonflow-app 内置的是构建后资源。
