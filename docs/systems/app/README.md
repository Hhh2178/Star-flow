# App System

## Purpose

The app system is the Toonflow fork that becomes Stars Flow product code.

## Ownership

- Local path: `app/`
- Fork remote: `https://github.com/Hhh2178/Starflow`
- Official upstream: `https://github.com/HBAI-Ltd/Toonflow-app`

## Runtime Shape

Toonflow runs as a Node service that provides static web UI, API routes, Socket.IO, SQLite data, local asset storage, and Provider integrations. Electron can wrap this service for desktop usage.

## Verification

Inside `app/`, after dependencies are installed:

```powershell
yarn lint
```

For local smoke:

```powershell
yarn start
```

Then open `http://localhost:10588/`.
