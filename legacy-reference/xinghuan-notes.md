# Xinghuan Legacy Reference Notes

## Source

旧项目路径：

`D:\codex\服务器\星环漫剧`

## Role

旧星环漫剧项目作为 Stars Flow 的需求和架构参考库，不再作为默认实现主线。

## Valuable References

- AI 漫剧生产中台定位。
- 项目创建、文本生产、分镜、图片、视频、复核和重跑链路。
- Provider-first 服务商管理。
- 模型目录和模型能力结构。
- 项目预算、任务成本和额度显示。
- 视频质检、人工复核、回修提示词、回修参考图。
- 后台管理页面方向。
- 星环漫剧视觉方向。

## Do Not Directly Reuse

- 当前前台和后台页面实现。
- 当前前后端 API 连接方式。
- 当前过重的 NestJS + FastAPI + LangGraph 分层。
- 当前未形成端到端体验的工作台结构。
- 旧项目中不可点击或无法完成流程的页面逻辑。

## Extraction Principle

只提炼明确提升 Stars Flow 第一阶段生产闭环的需求。任何会拖慢 7-10 天验证期的复杂平台能力都暂缓。
