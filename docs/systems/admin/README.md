# Admin System

## Purpose

The admin system is an independent `/admin/` frontend over the shared Stars Flow backend. It covers scoped overview, groups, users, projects, tasks, queue/concurrency, Provider/model status, AI configuration, usage, quota/recharge ledger, system settings, audit, and the current operator profile.

## Permission Boundary

- `super_admin`: global read/write, group and quota administration, global configuration, queue incident actions.
- `admin`: only its own group and Creator accounts; Provider/AI global state is redacted readonly; no system settings.
- `creator`: cannot open Admin routes or call Admin APIs.

Cross-group resources return `404`. Admin list, search, count, sum, export and detail queries must all start from SQL group scope; frontend filtering is never an authorization control.

## Visual Direction

Admin pages should feel like a dense internal API console: compact tables, clear status, direct actions, and visible audit/cost context.

## Verification

Admin visual changes must update `admin/frontend-design/` docs before or alongside implementation.

Browser verification uses real navigation and form operations for every permitted role and records loading, empty, success, validation, failure, cancelled and unauthorized states.
