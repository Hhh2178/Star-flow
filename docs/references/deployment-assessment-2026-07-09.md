# Deployment Assessment - 2026-07-09

## Scope

This note records the first Stars Flow deployment assessment using Toonflow-app as the base.

## Local Result

Local path:

`D:\codex\服务器\Stars flow\app`

Observed local environment:

- Node.js: `v20.20.2`
- npm: `10.8.2`
- Yarn: `1.22.22`

Actions:

1. Cloned Toonflow-app into `app`.
2. Ran `yarn install --ignore-engines`.
3. Started production service with `yarn start`.

Result:

- Local service started successfully.
- SQLite initialized at `app\data\db2.sqlite`.
- Static web entry is available at `http://localhost:10588/` and `http://localhost:10588/index.html`.
- Login API works with the upstream default account.
- `/web/index.html` is not the correct entry and returns unauthorized.

Local conclusion:

Stars Flow can run locally as a Toonflow production service even on Node 20, although upstream README recommends newer Node.

## Server Read-Only Assessment

Server:

- Host: `101.33.75.38`
- SSH user: `ubuntu`
- SSH port: `728`
- OS: Ubuntu Linux

Observed server environment before deployment attempt:

- Node.js: `v22.22.2`
- npm: `10.9.7`
- Corepack: available
- Yarn: missing as global binary, but Corepack can run Yarn
- PM2: missing
- Nginx: active
- PostgreSQL: active
- Redis: active
- Docker: inactive
- Disk `/`: about 26G available
- Memory: about 3.6GiB total, about 1.1GiB available
- Swap: nearly exhausted during read-only check

Existing important ports:

- `18100`: canvas production loopback service
- `18200`: canvas gray loopback service
- `8443`: internal proxy
- `80` / `443`: Nginx
- `5432`: PostgreSQL loopback
- `6379`: Redis loopback

## Server Staging Attempt

Actions:

1. Created `/opt/apps/stars-flow`.
2. Cloned Toonflow-app into `/opt/apps/stars-flow/app`.
3. Ran production dependency install with:

```bash
corepack yarn install --ignore-engines --production=true --network-timeout 600000
```

Result:

- Server dependency installation completed.
- A temporary `nohup` start command was attempted for `node data/serve/app.js`.
- Follow-up validation command timed out.
- Subsequent SSH attempts timed out during banner exchange even though TCP port `728` still accepted connections.
- External `http://101.33.75.38:10588/` returned HTTP 502 during a quick probe.

Server conclusion:

The shared VPS can install Toonflow dependencies, but the temporary staging start is not yet confirmed healthy. The server became unhealthy for SSH banner exchange after the start attempt. Do not proceed with more deployment commands until SSH responsiveness is restored.

## Current Risk

The server may have a lingering temporary Toonflow process or resource pressure. Because SSH is currently not completing banner exchange, cleanup could not be performed from this session.

## Required Next Steps

1. Wait for SSH to recover or use the cloud provider console if SSH remains unavailable.
2. Check server resources:

```bash
uptime
free -h
ps -eo pid,ppid,comm,%mem,%cpu,args --sort=-%cpu | head -30
```

3. If a temporary Toonflow process is running and causing pressure, stop it:

```bash
cat /opt/apps/stars-flow/toonflow.pid
kill <pid>
```

4. Inspect logs:

```bash
tail -120 /opt/apps/stars-flow/toonflow.log
tail -120 /opt/apps/stars-flow/toonflow.err.log
```

5. Before the next server attempt, add a controlled launch wrapper or patch so the app binds to loopback and configurable port instead of raw `10588`.

## Application Side Vs Server Side

Toonflow-app currently bundles several responsibilities into one Node service:

- Web UI static files.
- HTTP API.
- Socket.IO channels.
- SQLite database.
- Local file storage under `data/`.
- AI provider configuration and calls.

In desktop mode, Electron acts as the application shell and starts/uses this local service.

In server mode, the same Node service runs on the VPS and users access it through a browser. For team usage, server mode is better because project data, Provider keys, generated assets, and task state stay centralized.

For Stars Flow, the recommended target remains:

- Phase 1: server Web app for internal team staging.
- Phase 2: optional Electron client connected to cloud control.
