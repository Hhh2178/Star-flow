# Stars Flow Server Staging Release Validation

## Scope

This record covers the desktop-only internal staging release at `https://starsflow.hhh2121.xyz`. It contains no credentials, Provider keys, database rows or signed asset URLs.

## Release Shape

- Release directory: `/opt/apps/stars-flow/releases/20260712-092111`.
- Active pointer: `/opt/apps/stars-flow/current`.
- Service: `stars-flow.service`, enabled and active.
- Runtime listener: `127.0.0.1:18300`.
- Persistent SQLite file: `/opt/apps/stars-flow/shared/db2.sqlite`.
- Persistent object storage: `/opt/apps/stars-flow/shared/oss`.
- Nginx terminates HTTPS and forwards normal HTTP, long-running generation requests and WebSocket upgrades.

## Evidence

- `/healthz`, Creator and Admin returned HTTP 200 over a valid TLS certificate.
- Creator opened the Stars Flow login route and Admin opened the separate Chinese administrator login surface.
- Socket.IO polling returned a valid session and advertised WebSocket upgrade support.
- No warnings or errors were recorded for the production hostname during the desktop browser smoke run.
- The rotated initial Super Admin password remains server-only with `mustChangePassword=1`; its value was not read into this record.
- The deployment migration regression for a partially initialized legacy skill database is covered by R3M.
- Stars Flow certificate renewal simulation succeeded. The server-wide Certbot command remains non-zero only because the unrelated Hermes hostname is protected by Cloudflare Access.

## Readiness Decision

Approved for internal team staging and controlled production-flow testing. It is not yet classified as public SaaS production-ready because the Creator project retains the documented legacy `vue-tsc` baseline and broader operational monitoring, backup/restore drills and public security hardening are still outstanding.

## Cloudflare Note

After the product owner enabled the orange-cloud proxy, public DNS and response headers must be rechecked. A direct `101.33.75.38` A answer without `CF-Ray` means the proxy change has not propagated or the record is still DNS-only; do not claim Cloudflare proxying until both signals change.

The immediate post-change check still returned `101.33.75.38` without `CF-Ray`. The origin deployment is healthy, but orange-cloud activation remains pending external confirmation.

## GitHub Publication

- App `dev` and `main`: `1330df6` (`feat: deploy provider billing and staging runtime`).
- Web `dev` and `main`: `1a1c4a5` (`feat: complete pricing-aware production flows`).
- Both `main` updates were fast-forwards from previously validated local history; no force push was used.
- The outer governance repository has no configured remote and was not published.
