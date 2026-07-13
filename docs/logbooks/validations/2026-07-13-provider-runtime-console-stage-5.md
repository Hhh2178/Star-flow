# Provider Runtime Console Stage 5 Validation

## Scope

Stage 5 adds RunningHub App and Workflow runtime support using the pinned Runtime Kit while keeping Stars Flow ownership of host concurrency, cancellation and billing reservations.

## Implementation Evidence

- App commit: `8c14ca2 feat: add runninghub app and workflow runtime`
- Descriptor validation covers resource type/ID, Provider/model, node and field bindings, output kind/path, 1–60 second polling and 10 second–60 minute deadlines.
- Descriptor serialization uses the existing reference-only profile columns and contains no credential fields.
- Key configuration accepts only `secret://` and `env://` references, rejects inline `apiKey`/`value`, validates unique IDs and bounded concurrency, and exposes sanitized counts/status only.
- Execution acquires a Stars Flow host lease before a Runtime Kit key lease. A single `finally` releases the key then host lease on every exit path.
- App and Workflow fake-network tests assert submit body mapping, bearer resolution at execution time, polling, normalized outputs and zero remaining leases.
- Real validation requires `RUNNINGHUB_REAL_VALIDATION=1`; default execution performs no network request and output logging excludes keys and signed/media URLs.

## Test Evidence

| Command | Result |
| --- | --- |
| `yarn validate:runninghub` without opt-in | PASS/SKIP, no external request |
| `yarn test:r3u` | PASS, 6/6 descriptor, key boundary, App, Workflow and cancellation tests |
| `yarn test:r3h` | PASS, existing running cancellation suite |
| `yarn test:r3r` | PASS, 12/12 reservation and settlement suite |
| `yarn test:r3s` | PASS, Provider runtime regression suite |
| `yarn lint` | PASS, `tsc --noEmit` |
| `yarn build` | PASS, backend and Electron production bundles |
| `npm run harness:verify:project` on canonical `dev` | PASS after canonical app checkout was aligned to gitlink `8c14ca2` |

## Exit Decision

Stage 5 is validated for source integration. No real RunningHub generation was performed without explicit operator opt-in. Stage 6 may expose Super Admin-only runtime administration APIs with sanitized DTOs and audit history.
