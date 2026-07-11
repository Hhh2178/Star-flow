# Stars Flow Visual Skin V2 Design

## Status

Approved by the user on 2026-07-11 for implementation planning.

## Goal

Apply one coherent visual skin to the Creator application and Admin Console without changing routes, navigation placement, page structure, component hierarchy, data flow, or business behavior. The result should feel like a calm, high-density internal AI production console rather than a lightly recolored Toonflow interface.

## Design Read

Stars Flow is a daily production tool for an internal manga and short-drama team. Its visual language must prioritize scanning, repeated operation, production state, and clear hierarchy. The selected direction is a cool light console with white work surfaces, restrained teal branding, compact geometry, and semantic status colors.

## Scope Boundary

This phase may change:

- Theme tokens and TDesign variables.
- Color, typography, spacing, borders, radius, shadow, focus, hover, active and disabled states.
- Visual treatment of existing shells, panels, cards, tables, forms, dialogs, drawers, tabs, canvas nodes and scrollbars.
- Responsive CSS needed to prevent clipping, overlap, unreadable text or unusable touch targets.
- Hard-coded presentation values that bypass the shared visual system.

This phase must not change:

- Routes, navigation location or page information architecture.
- Business component hierarchy or workflow order.
- API, stores, authorization, queue, quota or Provider behavior.
- Table columns, form fields, commands or production semantics.
- Creator/Admin build boundaries.

## Visual Foundation

| Token | Value | Purpose |
| --- | --- | --- |
| `--stars-page-bg` | `#f5f7f8` | Application background |
| `--stars-surface` | `#ffffff` | Primary work surface |
| `--stars-surface-muted` | `#f0f4f3` | Table headers and secondary surfaces |
| `--stars-brand` | `#0f766e` | Primary action and active navigation |
| `--stars-brand-hover` | `#115e59` | Primary hover |
| `--stars-brand-subtle` | `#dff3ef` | Selection and quiet brand background |
| `--stars-text` | `#17201f` | Primary text |
| `--stars-text-muted` | `#667370` | Secondary text |
| `--stars-border` | `#dce4e2` | Standard border |
| `--stars-border-strong` | `#b9c9c5` | Focus and hover border |
| `--stars-running` | `#2563eb` | Running work |
| `--stars-success` | `#15803d` | Completed and enabled |
| `--stars-warning` | `#b45309` | Queued and attention warning |
| `--stars-danger` | `#c2413b` | Failed and destructive |
| `--stars-needs-attention` | `#9f1239` | Manual intervention required |
| `--stars-radius-control` | `6px` | Inputs, buttons and tags |
| `--stars-radius-panel` | `8px` | Panels, cards and dialogs |
| `--stars-motion-fast` | `140ms ease-out` | Hover, focus and active feedback |

The palette must not become monochromatic teal. Neutral surfaces dominate; teal identifies brand and selection; blue, green, amber and red are reserved for real states.

## Typography And Density

- Use the existing system Chinese font stack; do not introduce a network font dependency.
- Use `font-variant-numeric: tabular-nums` for counters, costs, task IDs and timestamps.
- Keep compact controls and tables suitable for repeated desktop work.
- Page titles, panel titles and field labels must form a clear three-level hierarchy without oversized display type.
- Letter spacing remains `0`.
- Visible Chinese copy must fit its container; controls may wrap where the current structure permits but must not overlap adjacent content.

## Component Rules

### Shells

Creator and Admin use the same tokens but different density. Existing navigation placement remains unchanged. Active navigation uses one strong teal signal; inactive navigation stays neutral. Shell borders define regions without heavy shadows.

### Buttons And Inputs

Primary commands use teal. Secondary commands use white surfaces and neutral borders. Destructive commands use semantic red. Icon buttons retain stable square dimensions and accessible hover/focus states. Inputs use white surfaces, neutral borders and a teal focus ring.

### Panels And Cards

Panels are white with one thin border. Shadows are limited to dialogs, floating layers and actual hover elevation. Page sections must not become nested decorative cards. Existing project and asset cards retain their layout and gain consistent image surfaces, metadata hierarchy and action states.

### Tables And Filters

Table headers use the muted surface, rows use subtle hover feedback and status uses semantic text or compact tags. Filter labels, selects and actions align visually without changing their DOM order. Narrow screens may use existing overflow containers, but the document itself must not scroll horizontally.

### Dialogs, Drawers And Empty States

Dialogs and drawers use clear header separation, compact body spacing and predictable footer actions. Empty, loading, error and forbidden states use the same typography and muted icon treatment; they do not use illustrations or marketing copy.

### Production Canvas And Video Workbench

Node positions, canvas controls and workbench tracks remain unchanged. Styling should distinguish editable, selected, generating, completed and failed states through border, surface and status treatment. Media remains the primary visual signal; chrome must stay quiet.

## Surface Matrix

| Priority | Creator Surface | Visual Work |
| --- | --- | --- |
| P0 | Login, application shell, project list | Brand identity, hierarchy, controls, cards |
| P0 | Novel, script and Agent | Editors, tabs, side panels, chat states |
| P1 | Asset center and storyboard | Gallery cards, preview surfaces, generation state |
| P1 | Production canvas and video workbench | Nodes, toolbars, tracks, selected/generating states |
| P2 | Creator profile/settings still permitted by role | Forms, menu, dialog consistency |

| Priority | Admin Surface | Visual Work |
| --- | --- | --- |
| P0 | Login, shell, overview | Brand, navigation, metrics and hierarchy |
| P0 | Groups, users, projects and tasks | Filters, tables, forms and actions |
| P0 | Queue, concurrency, quota and usage | State grammar, counters, policy panels |
| P1 | Provider, AI, system and audit | Dense configuration, read-only states, logs |
| P2 | Profile, empty/error/forbidden states | Shared finishing and responsive polish |

## Implementation Architecture

`web/src/assets/starsflow-theme.scss` remains the canonical shared token and TDesign mapping entry. Page-level styles should consume semantic variables. Repeated values that appear across page families must move into the shared theme or the existing Admin stylesheet instead of being copied.

Hard-coded colors in Vue components are handled as follows:

1. Classify the value as brand, neutral, state or media-specific.
2. Replace brand, neutral and state values with semantic variables.
3. Keep media-specific colors only when they represent source content rather than application chrome.
4. Add no new hex value to a Vue component unless the value first exists as a semantic token.

The Admin and Creator builds continue to import the shared theme independently. No Admin page, route or configuration editor may enter the Creator artifact.

## Responsive Rules

- Required viewports: `1440x900`, `1920x1080`, `768x1024` and `390x844`.
- Fixed-format controls use stable dimensions and responsive constraints.
- Existing table overflow stays inside its local container.
- Text and controls must not overlap, disappear behind fixed chrome or force document-level horizontal scrolling.
- Touch controls remain at least 36px high where the current component permits.
- Responsive work in this phase may repair CSS but may not reorder business sections or remove data.

## Verification

Automated gates:

- Frontend unit tests.
- Creator build and Admin build.
- Build-boundary tests and Creator artifact scan.
- Outer release-layout and harness verification.

Browser gates:

- Capture representative Creator and Admin pages at desktop and narrow widths.
- Exercise hover, focus, active, disabled, loading, empty, success, failure, queued, running, cancelled and needs-attention states where available.
- Check for old default blue branding, isolated hard-coded colors, inconsistent radius, excessive shadows, clipping, overlap and document-level overflow.
- Compare screenshots against the approved calm production-console direction, not only against functional correctness.

## Delivery Sequence

1. Audit current surfaces and hard-coded presentation values.
2. Normalize shared tokens and TDesign mappings.
3. Skin Creator shell and P0 surfaces.
4. Skin Admin shell and P0 surfaces.
5. Complete P1/P2 surfaces and production-specific chrome.
6. Run automated gates and desktop/narrow browser regression.
7. Update visual registries, validation evidence and progress logs.

## Completion Criteria

The visual skin is complete when all matrix surfaces use the shared visual language, no known page retains dominant Toonflow default styling, all required responsive screenshots pass visual review, and the dual-build release gate remains green without functional or authorization regressions.
