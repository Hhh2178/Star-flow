# Provider Runtime Console Stage 2 Validation

## Scope

Stage 2 introduces additive, versioned Provider runtime-profile storage while preserving the current `o_vendorConfig` credentials, model JSON and legacy production routing.

## Commit

- App: `5289760` — `feat: add versioned provider runtime profiles`

## Schema Evidence

- Fresh initialization creates `o_providerRuntimeProfile`, `o_providerModelProfile`, `o_providerProtocolProfile`, `o_providerTestRun` and `o_runningHubDescriptor`.
- Mutable profiles include enabled state, revision and timestamps; Provider runtime profiles own `legacy`, `shadow` or `native` migration state.
- Provider IDs and Provider/model pairs are unique.
- No new runtime-profile table contains `apiKey`, `credentials`, `inputValues` or secret fields.
- Generated `src/types/database.d.ts` includes interfaces and DB mappings for all five tables.

## Migration Evidence

- R3S ran the migration twice against a legacy-shaped in-memory database and retained exactly one `legacy` profile per existing Provider.
- Legacy `inputValues`, model JSON and enablement remained unchanged.
- Fresh initialization seeded one revision-1 legacy profile per existing `o_vendorConfig` row.
- Model creation rejected a missing Provider with `422 PROVIDER_NOT_FOUND`.
- Duplicate models returned `409 PROVIDER_MODEL_CONFLICT`.
- A stale Provider revision returned `409 PROVIDER_REVISION_CONFLICT` after the first atomic update advanced revision 1 to 2.

## Commands

- `rtk yarn test:r3s` — passed repeatedly.
- `rtk yarn test:r3t` — passed.
- `rtk yarn test:r3r` — 12 passed.
- `rtk yarn lint` — passed.
- `rtk yarn build` — passed and regenerated the server runtime.
- After fast-forwarding app and outer gitlinks to `dev`, `rtk npm run harness:verify:project` passed with all three working trees clean.

## Decision

Stage 2 is validated for source integration. All Providers remain in `legacy` mode; no production execution path uses the new tables yet. Stage 3 may add the Legacy Adapter Bridge.
