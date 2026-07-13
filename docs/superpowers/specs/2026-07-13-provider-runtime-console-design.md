# Provider Runtime Console Design

## Status

Approved direction on 2026-07-13. The pre-change state is tagged `staging-20260713-pre-provider-console` in the app, web and outer governance repositories.

## Goal

Turn the existing Provider status table into a Super Admin-owned Provider runtime console without discarding the verified TypeScript adapters. Creator users receive only enabled model choices and public support contact information; they never configure Provider credentials, protocols or models.

## Product Decisions

1. The Creator feedback action opens a configurable support-contact dialog instead of an external form.
2. Empty Creator model selectors say that no model is available and direct the user to contact an administrator; they never open Creator settings.
3. Provider configuration remains Super Admin-only. Admin may read group-scoped operational data but cannot inspect or mutate global Provider resources.
4. The Provider page uses a fixed, independently scrolling Provider rail and a selected-Provider workspace. A Provider with many models cannot increase the height of every other Provider row.
5. Existing `data/vendor/*.ts` implementations remain usable through a Legacy Adapter Bridge.
6. `aigc-provider-runtime-kit` supplies normalized contracts, validation, standard adapters, RunningHub support, cancellation, timeout and result normalization. Stars Flow continues to own authentication, group scope, queues, concurrency, billing, persistence and audit.
7. Standard protocols are declarative. Arbitrary TypeScript editing remains a development-only escape hatch and is not exposed as a normal production Admin control.
8. The project remains desktop-only. Mobile and tablet layouts are outside the release gate.

## Current Constraints

- `o_vendorConfig` stores credentials, enablement and model overlays.
- Built-in Provider definitions and request functions live in `app/data/vendor/*.ts` and are evaluated through the existing VM loader.
- Existing adapters already implement valuable provider-specific request mapping, synchronous results, asynchronous task submission, polling and output extraction.
- The current Admin API can update credentials and enablement, test a known model and edit pricing, but cannot edit Provider identity, protocol, models, parameter schema or execution policy.
- Creator `modelSelect.vue` still opens the legacy Creator setting dialog when no model is available.

## Target Architecture

```text
Creator request
  -> Stars Flow auth/project validation
  -> pricing snapshot and quota reservation
  -> Stars Flow generation queue and scheduler
  -> ProviderRuntimeGateway
     -> Runtime Kit OpenAI adapter
     -> Runtime Kit RunningHub adapter
     -> LegacyVendorAdapter
     -> allowlisted custom adapter
  -> normalized result and usage
  -> OSS persistence
  -> Stars Flow settlement and audit
```

The queue calls one `ProviderRuntimeGateway.execute()` contract. Runtime adapters never own billing, group authorization or database transactions.

## Provider And Model Contracts

### Provider profile

- `providerId`, display name, enabled state and notes.
- Base URL and authentication mode.
- Protocol: `openai`, `runninghub_app`, `runninghub_workflow`, `legacy`, or an allowlisted custom adapter ID.
- Connection timeout, task timeout, retry count and polling interval.
- Credential values remain in the existing protected Provider record during the migration and are never returned by read APIs.

### Model profile

- Internal ID, upstream model ID and display name.
- Capability: chat, image, video, audio or workflow.
- Enabled state.
- Execution mode: `sync`, `background_poll`, `webhook`, `runninghub`, or `legacy`.
- Parameter schema and input capability profile.
- Optional adapter override and output mapping.
- Pricing remains versioned in `o_modelPricing` and is referenced, not duplicated.

### RunningHub descriptor

- App or Workflow kind and ID.
- Input node/field mappings and upload mappings.
- Output extraction rules.
- Key-pool and per-key concurrency policy.
- Poll interval and timeout bounded by the Stars Flow job lease.

## Compatibility Strategy

The initial runtime registry overlays three sources in this order:

1. Built-in legacy Provider/model definitions.
2. Existing `o_vendorConfig.models` overlays.
3. New versioned runtime Provider/model profiles.

No existing Provider is switched to a new adapter merely because the new schema exists. Each Provider receives a migration state: `legacy`, `shadow`, or `native`.

- `legacy`: production uses the current TypeScript adapter.
- `shadow`: production still uses legacy; non-billable comparison tests execute the new adapter and compare normalized contracts.
- `native`: production uses Runtime Kit after real low-cost acceptance passes.

Rollback changes the migration state back to `legacy`; it does not require restoring database files.

## Admin Information Architecture

The Provider page contains:

- A fixed 240-280px Provider rail with search, state filters, protocol badges, model counts and an Add Provider command.
- A selected Provider header with enablement, health and last-test summary.
- Tabs for Overview, Credentials, Models, Protocol And Execution, and Test History.
- A paged/filterable model table. Model editing uses a right-side drawer.
- Provider and model mutations use explicit save commands, audit entries and optimistic-concurrency versions.

## Support Contact

Super Admin configures a public support profile containing type, title, WeChat ID, QR-code asset reference and description. Creator receives only this public DTO. The QR code is stored through the existing server-side asset boundary, not embedded as Base64 in settings or source control.

## Security Boundaries

- Creator bundles contain no Provider mutation route names, credentials editor or protocol editor.
- Read APIs return booleans such as `credentialConfigured`; they never return secrets or masked secret fragments.
- Adapter IDs are allowlisted. Runtime database configuration cannot execute arbitrary code.
- Provider/model changes are versioned and audited without request bodies, keys or signed URLs.
- Connection and generation tests have separate routes. A connection test cannot create a billable image or video task.

## Release Gates

- Existing MiMo, GRSAI and AICopy real paths remain green through the Legacy Bridge.
- RunningHub App and Workflow descriptors pass fake and one controlled real acceptance case.
- Creator has no route into global configuration.
- Provider rail remains fixed with at least 100 fake models in desktop browser acceptance.
- Queue, concurrency, pricing, reservation, cancellation, recovery and settlement suites remain unchanged and pass.

