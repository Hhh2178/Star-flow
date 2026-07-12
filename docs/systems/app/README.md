# App System

## Purpose

The app system is the Toonflow fork that becomes Stars Flow product code.

## Ownership

- Local path: `app/`
- Fork remote: `https://github.com/Hhh2178/Starflow`
- Official upstream: `https://github.com/HBAI-Ltd/Toonflow-app`

## Runtime Shape

Toonflow runs as a Node service that provides static web UI, API routes, Socket.IO, SQLite data, local asset storage, and Provider integrations. Electron can wrap this service for desktop usage.

R3 保持单个 Express/Socket.IO 后端，并增加持久化生成队列。Creator 静态入口位于 `/`，Admin 静态入口位于 `/admin/`；管理 API 统一位于 `/api/admin/*`，必须在静态回退之前注册。SQLite 队列通过组总量、组任务类型、个人总量和个人任务类型四层策略共同限流，并通过公平调度、租约、心跳和恢复状态控制任务，不允许浏览器直接决定并发。

正常运行库为 `data/db2.sqlite`。浏览器验收库固定隔离为 `data/acceptance.sqlite`，防止其他本地服务的 scheduler 抢占验收任务。`STARS_ACCEPTANCE_MODE=1` 只替换付费 Provider 执行，真实队列和数据写入仍然生效。

Provider 的三层协议兼容、模型级参数和真实服务商状态见 `../providers/README.md`。

## Verification

Inside `app/`, after dependencies are installed:

```powershell
yarn lint
yarn test:r2
yarn test:r3a
yarn test:r3b
yarn test:r3d
yarn test:r3e
yarn test:r3f
yarn test:r3g
yarn test:r3h
yarn test:r3i
yarn test:r3j
yarn test:r3k
yarn test:r3l
yarn test:r3m
yarn test:r3n
yarn test:r3p
yarn build
```

For local smoke:

```powershell
$env:STARS_ACCEPTANCE_PASSWORD = "<仅本机使用的验收密码>"
yarn seed:acceptance
yarn start:acceptance
```

Use the three URLs printed by the launcher; it chooses a free local port.
