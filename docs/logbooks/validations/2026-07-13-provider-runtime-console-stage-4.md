# Provider Runtime Console Stage 4 Validation

## Scope

Stage 4 integrates the Provider Runtime Kit at immutable commit `9cf7381c783406c9959713867052793927545d2e`, adds standard OpenAI-compatible execution, and introduces controlled legacy/shadow/native routing without switching existing Provider profiles away from legacy mode.

## Implementation Evidence

- App commit: `2690c91 feat: integrate pinned provider runtime kit`
- `package.json` and `yarn.lock` both reference the full immutable Git commit.
- Node 20 remains the host runtime. `postinstall` builds the pinned package's missing `dist` files with the app's existing TypeScript toolchain; Node 22 was not installed.
- Runtime profile mapping rejects invalid URLs, duplicate Provider IDs, missing adapter IDs and malformed schemas; disabled models are excluded from enabled listings.
- Standard execution normalizes OpenAI text/media outputs and token usage into Stars Flow contracts.
- Lifecycle callbacks expose allow-listed event identity/status fields only; request inputs, raw outputs, credentials and error causes are omitted.
- The Stars Flow deadline is passed to Runtime Kit and timeout is returned through the stable Stars Flow error category.
- Shadow routing returns the legacy result. Its diagnostic callback cannot contain usage or the production result body, so it cannot settle quota or overwrite output.

## Test Evidence

| Command | Result |
| --- | --- |
| `yarn install --frozen-lockfile --ignore-engines` | PASS; pinned Runtime Kit post-install TypeScript build ran on Node 20 |
| `yarn test:r3b` | PASS, complete generation queue schema/behavior suite |
| `yarn test:r3h` | PASS, running cancellation suite |
| `yarn test:r3r` | PASS, 12/12 pricing/reservation/settlement tests |
| `yarn test:r3s` | PASS, registry validation, standard execution, redaction, timeout and migration routing |
| `yarn lint` | PASS, `tsc --noEmit` |
| `yarn build` | PASS, backend and Electron production bundles |

## Exit Decision

Stage 4 is validated for source integration. Existing profiles remain legacy by default. Stage 5 may add RunningHub App and Workflow descriptors and execution while retaining Stars Flow concurrency, cancellation and billing ownership.
