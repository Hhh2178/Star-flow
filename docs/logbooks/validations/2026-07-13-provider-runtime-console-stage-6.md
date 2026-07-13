# Provider Runtime Console Stage 6 Validation

## Scope

Stage 6 exposes Provider Runtime administration APIs under `/api/admin/provider-runtime`, preserving Admin read access while restricting every mutation and test execution to Super Admin.

## Implementation Evidence

- App commit: `d66e87f feat: add provider runtime administration APIs`
- Provider and model creation, optimistic-revision update and guarded deletion use Zod HTTP DTOs plus service-level authorization.
- Provider/model list DTOs omit credentials and protocol payloads. Model listing supports page/pageSize, text query, capability, enabled and execution-mode filters.
- Protocol configuration supports standard, poll, webhook, RunningHub and legacy; inline key/token/password/authorization fields are rejected.
- Deletion checks project models, Agent deployment, active price and queued/running job references. Revisioned disablement remains available.
- Connection tests use the non-generation connection path. Generation tests require literal billable confirmation and enqueue through existing quota reservation.
- Test history contains only identity, type, status, duration, error code and time. Upstream messages, payloads, credentials and URLs are not persisted.
- R3V confirms Admin cannot mutate, stale revisions fail, references block deletion, and all successful mutations/tests create redacted audits.

## Test Evidence

| Command | Result |
| --- | --- |
| `yarn test:r3a` | PASS, group/auth and live API boundary suite |
| `yarn test:r3d` | PASS, Admin operations suite |
| `yarn test:r3l` | PASS, Admin settings and Provider credential boundary suite |
| `yarn test:r3s` | PASS, Provider Runtime suite |
| `yarn test:r3u` | PASS, 6/6 RunningHub suite |
| `yarn test:r3v` | PASS, Provider Runtime CRUD/filter/reference/test/audit suite |
| `yarn lint` | PASS, `tsc --noEmit` |
| `yarn build` | PASS, backend and Electron production bundles with generated route table |

## Exit Decision

Stage 6 is validated for source integration. Stage 7 may build the fixed Provider rail and selected-Provider console exclusively against these sanitized APIs.
