# Server Context For Stars Flow

## Purpose

本文档整理 `D:\codex\服务器` 根目录中与 Stars Flow 相关的非敏感服务器上下文。根目录原始文档仍服务多个项目，不移动到本项目内；Stars Flow 只复制必要结论。

## Shared VPS

- Provider: Tencent Cloud VPS.
- Host: `101.33.75.38`.
- SSH user: `ubuntu`.
- SSH port: `728`.
- Direct root login is rejected and must not be used.
- SSH command shape:

```powershell
ssh -i Tencent_Cloud_Server.pem -p 728 ubuntu@101.33.75.38
```

Do not print, copy, commit, or upload the private key.

## Local Network Note

This workstation has a persistent host route so traffic to `101.33.75.38` bypasses the local proxy tunnel and uses the physical Ethernet gateway. If SSH suddenly fails, first verify local routing and current trusted public IP before changing server configuration.

## Existing Server Responsibilities

The VPS is shared by several projects and services. Stars Flow deployment must avoid disrupting them.

Known shared constraints:

- Internal proxy service uses `/opt/apps/internal-proxy/`.
- Internal proxy exposes `shadowsocks-libev` on port `8443`.
- Canvas gray deployment uses `canvas-next.hhh2121.xyz` and loopback port `18200`.
- Canvas production deployment uses `canvas.hhh2121.xyz` and loopback port `18100`.
- Betting ads project plans to use `/opt/apps/betting-ads-intel/`.
- Existing Nginx routes and internal proxy routes must not be modified for Stars Flow unless explicitly approved.

## Native Services

Root workspace records indicate the server has been used with native services such as:

- PostgreSQL.
- Redis.
- Nginx.
- Node.js.
- Python.

Do not assume Docker is available or healthy. Before deployment, verify whether Stars Flow should use native Node.js/PM2/systemd or Docker Compose.

## Recommended Stars Flow Deployment Shape

For the first staging deployment:

- Proposed app path: `/opt/apps/stars-flow/`.
- Proposed service name: `stars-flow`.
- Bind the application to loopback only, for example `127.0.0.1:<dedicated-port>`.
- Put public access behind a dedicated Nginx server block only after confirming domain and port.
- Do not reuse canvas ports `18100` or `18200`.
- Do not reuse internal proxy port `8443`.
- Keep Provider keys only in server-side environment variables or encrypted server-side storage.
- Do not commit `.env`, SQLite files, generated assets, logs, or uploaded media.

## Deployment Gate

Before any server deployment, collect fresh read-only evidence:

1. Disk free space.
2. Memory and swap.
3. Node.js and package manager versions.
4. Nginx status and enabled sites.
5. Existing listening ports.
6. PostgreSQL and Redis status.
7. Docker availability, if Docker is considered.
8. Current `/opt/apps/` layout.

Deployment should not proceed if it risks existing internal proxy, canvas, advertising monitor, or other running services.

## Staging Principle

The server is for staging and internal team trial, not for ad hoc development. Code should be changed locally, committed to Git, then pulled on the server. Do not hot-edit production files on the server.
