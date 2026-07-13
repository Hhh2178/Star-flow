# Provider Runtime Console Stage 1 Validation

## Scope

Stage 1 adds configurable public support contact information and removes Creator access to Provider configuration. No real Provider credentials, user media or paid generation calls were used.

## Commits

- App: `0c24261` — `feat: move creator support and model configuration boundaries`
- Web: `9757e2e` — `feat: move creator support and model configuration boundaries`

## Backend Evidence

- `rtk yarn test:r3t`: passed. Covers default and legacy-missing idempotency, Super Admin-only mutation, Creator/Admin read access, path validation, public DTO redaction and redacted audit records.
- `rtk yarn test:r3l`: passed. Existing Admin Provider/AI/system-setting contracts remain green.
- `rtk yarn lint`: passed.
- `rtk yarn build`: passed and regenerated the server runtime.

## Frontend Evidence

- Focused support, Creator boundary and System-page tests: 15 passed.
- `rtk yarn test:admin:unit`: 179 passed.
- Creator and Admin builds completed successfully.
- `rtk node --test scripts/build-boundaries.test.mjs`: 8 passed.
- `rtk yarn check:build-boundaries`: passed; Creator artifact contains no configured forbidden Provider/Admin markers.
- Product identity source and compiled-artifact checks passed.
- Source scan found no Tencent form URL, old “去设置中添加模型” copy, `goVendorConfig`, or model-selector assignment to `vendorConfig`.
- After fast-forwarding app, web and outer gitlinks to `dev`, `rtk npm run harness:verify:project` passed and all three working trees were clean.

## Known Baseline

`rtk yarn type-check` remains non-zero on the existing Creator type baseline documented before this stage. Errors are in legacy Markdown/theme declarations, provider-logo typings, copied workbench files and existing production components; no error references a stage 1 file. This is recorded as a known baseline, not a passing gate.

## Decision

Stage 1 is validated for source integration. Server deployment is deferred to stage 9; stage 2 may begin with additive runtime-profile schema work.
