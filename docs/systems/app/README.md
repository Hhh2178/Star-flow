# App System

## Purpose

The app system is the Toonflow fork that becomes Stars Flow product code.

## Ownership

- Local path: `app/`
- Fork remote: `https://github.com/Hhh2178/Starflow`
- Official upstream: `https://github.com/HBAI-Ltd/Toonflow-app`

## Runtime Shape

Toonflow runs as a Node service that provides static web UI, API routes, Socket.IO, SQLite data, local asset storage, and Provider integrations. Electron can wrap this service for desktop usage.

R3 保持单个 Express/Socket.IO 后端，并增加持久化生成队列。Creator 静态入口位于 `/`，Admin 静态入口位于 `/admin/`；管理 API 统一位于 `/api/admin/*`，必须在静态回退之前注册。SQLite 队列通过四层并发策略、租约、心跳和恢复状态控制任务，不允许浏览器直接决定并发。

## Verification

Inside `app/`, after dependencies are installed:

```powershell
yarn lint
yarn test:r2
yarn test:r3a
yarn test:r3b
yarn build
```

For local smoke:

```powershell
yarn start
```

Then open `http://localhost:10588/`.
