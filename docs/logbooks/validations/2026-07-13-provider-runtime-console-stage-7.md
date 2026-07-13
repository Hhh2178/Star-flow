# Provider Runtime Console Stage 7 Validation

## Scope

Stage 7 replaces the flat Provider table with a fixed-rail, selected-Provider runtime console. It keeps credentials reference-only and exposes structured Provider, model and protocol configuration without a source-code editor.

## Implementation Evidence

- App commit: `2f25d6a feat: extend provider console runtime contracts`
- Web commit: `a795e44 feat: rebuild provider console around selected provider`
- Outer integration commit: `0d99b86 feat: implement provider runtime console stage 7`
- The 260 px Provider rail has independent scrolling, search, enabled-state filtering, migration badges, model counts and stable selection.
- The selected workspace provides Overview, Credentials, Models, Protocol And Execution, and Test History tabs.
- Model results are isolated by selected Provider and paged at 20 rows. The editor drawer covers capability, execution mode, input profile, parameter schema, output mapping, enablement and the pricing handoff.
- Protocol forms are type-specific for standard, poll, webhook, RunningHub and Legacy Bridge. No arbitrary TypeScript or source editor is exposed.
- Unsaved changes protect Provider selection, tab changes, drawer close, browser unload and route leave. Revision conflicts discard stale drafts, refresh current state and display a concise Chinese message.
- Credential and protocol responses are sanitized; inline credential-like protocol fields remain rejected by the App service.

## Test Evidence

| Command or check | Result |
| --- | --- |
| Focused component red baseline | PASS as TDD evidence: 2 expected failures before implementation |
| Provider console and settings regression | PASS, 6/6 |
| `yarn test:admin:unit` | PASS, 17 files / 174 tests |
| `yarn build:creator` | PASS |
| `yarn build:admin` | PASS |
| `yarn check:build-boundaries` | PASS |
| `yarn check:product-identity` | PASS |
| `yarn test:product-identity` | PASS, 2/2 |
| App `yarn test:r3v` | PASS |
| App `yarn lint` | PASS, `tsc --noEmit` |
| App `yarn build` | PASS |

## Desktop Viewport Matrix

Validated in the canonical local Admin development entry after aligning App and Web to the stage commits.

| Viewport | Rail | Workspace | Page overflow | Result |
| --- | ---: | ---: | --- | --- |
| 1280 x 720 | 260 px, independently scrollable | 754 px | None | PASS |
| 1440 x 900 | 260 px, independently scrollable | 914 px | None | PASS |
| 1920 x 1080 | 260 px, independently scrollable | 1394 px | None | PASS |

The live page displayed 13 Provider entries, all five approved tabs, selected-Provider status and revision metadata. The local runtime profiles currently contain zero migrated model rows for these legacy Providers; population and controlled comparison belong to Stage 8 rather than this UI stage.

## Exit Decision

Stage 7 is complete. Stage 8 may start controlled Provider/model migration and shadow comparison using this console and its revisioned runtime APIs.
