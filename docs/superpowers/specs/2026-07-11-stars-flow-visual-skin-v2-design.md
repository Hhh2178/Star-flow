# Stars Flow Visual Skin V2 Design

## Status

Approved by the user on 2026-07-11 for implementation planning.

## Goal

Apply one coherent visual skin to the Creator application and Admin Console without changing routes, navigation placement, page structure, component hierarchy, data flow, or business behavior. The result should feel like a luminous, high-density Stars Flow production console rather than a partially recolored upstream interface.

## Design Read

Stars Flow is a daily production tool for an internal manga and short-drama team. Its visual language must prioritize scanning, repeated operation, production state, and clear hierarchy. The selected direction is a Stars-themed blue-violet console inspired by the visual polish of `api.apilio.ai`: a very light blue gradient environment, white floating work surfaces, capsule interactions, crisp dark text and restrained motion. The reference contributes visual language only; Stars Flow keeps its production workflows and does not adopt an API marketplace structure.

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

## Product Identity Cleanup

The shipped product surface is Stars Flow only. Creator, Admin and Electron-rendered pages must not present Toonflow, Toolflow or another open-source project as the product identity.

Remove or replace all user-visible instances of:

- Toonflow, ToonFlow, Toolflow or upstream product names.
- "Open source", `开源` and equivalent product-positioning copy in every bundled locale.
- GitHub, Gitee, AtomGit, repository, release-source, star request or upstream community promotion copy.
- Repository buttons, icons, links, click handlers and tooltips.
- Upstream welcome, About, update-source and official-platform descriptions.
- Upstream names in page titles, logos, accessible image labels, assistant greetings, exported backup filenames and visible errors.

Replacement rules:

- Product name: `Stars Flow`.
- Chinese product description: `AI 漫剧与短剧生产工作台`.
- Assistant description: role-specific neutral text such as `剧本创作助手` or `制片助手`; do not claim an upstream official service.
- Backup filename prefix: `stars-flow-backup`.
- Update and About surfaces may show Stars Flow version/runtime information, but no external repository or open-source promotion.
- A removed repository action leaves no empty menu row, separator, tooltip or unreachable click target.

Compatibility and legal boundary:

- Internal protocol names such as `toonflow://`, persisted Provider IDs, migration keys and API compatibility constants may remain when changing them would break Electron, existing data or Provider execution. They must never be rendered as product copy.
- Dependency licenses, legally required copyright notices and source-level provenance remain in source/distribution license material. They are not promoted as in-app product content.
- Technical governance documentation may retain upstream history where needed for traceability. Product UI, screenshots and user-facing help must not expose that history.

## Brand Asset Registry

This phase does not finalize the permanent Stars Flow logo. It establishes one replacement boundary so a later logo package can be installed without editing individual pages.

Create a canonical brand asset directory and registry in the frontend:

```text
web/src/assets/brand/
  brand-mark.svg
  brand-wordmark.svg
  brand-favicon.svg
  brand.ts
```

`brand.ts` owns the product name, Chinese descriptor, accessible labels and asset URLs. Existing Vue pages must not import legacy `logo.png`, `logo.svg` or upstream icons directly. They consume one shared brand component or the registry.

The temporary mark is a restrained `SF` identifier with a small star-light cue. It is an implementation placeholder, not the approved permanent logo. It must remain legible at favicon, 24px navigation, 40px login and high-resolution display sizes. It may use the approved blue-violet brand gradient, has transparent-background and inverse variants where required, and avoids blurred glow that harms small-size clarity.

Association points covered by the registry:

- Creator login, title bar, shell and welcome surfaces.
- Admin login, sidebar and narrow header.
- Browser title, favicon and install metadata.
- Empty/error surfaces that currently use a product logo.
- Electron-rendered title and product-visible labels.

Replacement requirements:

- A future formal logo replacement changes only files in `assets/brand/` and, where unavoidable, one build metadata reference.
- Tests reject direct imports of legacy logo assets from application components.
- Tests verify both Creator and Admin consume the Stars Flow brand name and contain no legacy logo accessible labels.
- Legacy logo files may remain temporarily only when no runtime import or generated HTML reference exists; cleanup can remove them after the dependency scan is green.

## Visual Foundation

| Token | Value | Purpose |
| --- | --- | --- |
| `--stars-page-bg` | `#f5f8ff` | Solid fallback application background |
| `--stars-page-gradient` | `linear-gradient(135deg, #f8faff 0%, #edf4ff 58%, #f7f1ff 100%)` | Subtle application environment |
| `--stars-surface` | `#ffffff` | Primary work surface |
| `--stars-surface-muted` | `#f4f7fc` | Table headers and secondary surfaces |
| `--stars-brand` | `#356df3` | Primary action fallback and active navigation |
| `--stars-brand-hover` | `#2759d8` | Primary hover fallback |
| `--stars-brand-accent` | `#7557f6` | Gradient endpoint and limited AI accent |
| `--stars-brand-gradient` | `linear-gradient(135deg, #2f7df4 0%, #7060f6 100%)` | Primary commands and selected capsule controls |
| `--stars-brand-subtle` | `#eaf1ff` | Selection and quiet brand background |
| `--stars-text` | `#172033` | Primary text |
| `--stars-text-muted` | `#667085` | Secondary text |
| `--stars-border` | `#dce5f2` | Standard border |
| `--stars-border-strong` | `#b7c7e3` | Focus and hover border |
| `--stars-running` | `#175cd3` | Running work |
| `--stars-completed` | `#344054` | Completed and enabled text; never green |
| `--stars-completed-bg` | `#f2f4f7` | Completed and enabled background |
| `--stars-warning` | `#b45309` | Queued and attention warning |
| `--stars-danger` | `#c2413b` | Failed and destructive |
| `--stars-needs-attention` | `#9f1239` | Manual intervention required |
| `--stars-radius-control` | `999px` | Command buttons and segmented interactions |
| `--stars-radius-input` | `8px` | Inputs and selects |
| `--stars-radius-panel` | `8px` | Panels, cards and dialogs |
| `--stars-motion-fast` | `180ms cubic-bezier(.2,.8,.2,1)` | Hover, focus and active feedback |
| `--stars-motion-page` | `220ms cubic-bezier(.2,.8,.2,1)` | Page and panel entrance |

Neutral surfaces dominate and the blue-violet gradient is reserved for primary commands, selected capsule controls and limited brand moments. Green or teal must not be used for button fills, button text, links, tag text, status text or inline actions. Completed states use dark slate text with a check icon and neutral blue-gray background. Amber and red remain reserved for warning and failure.

## Readability And Contrast

- Normal text and interactive labels must meet at least WCAG AA `4.5:1` contrast against their rendered background.
- Large text and non-text interactive boundaries must meet at least `3:1`.
- Icon and label within one action use the same foreground color unless the icon has an independent semantic meaning.
- The screenshot defect where a teal button carries blue text/icon is prohibited. Component variants must define background, border, text and icon color together.
- Every action remains readable in hover, active, disabled and pending states.
- Status is never communicated by color alone; pair it with text and, where space permits, a familiar icon.

## Typography And Density

- Use the existing system Chinese font stack; do not introduce a network font dependency.
- Use `font-variant-numeric: tabular-nums` for counters, costs, task IDs and timestamps.
- Keep compact controls and tables suitable for repeated desktop work.
- Page titles, panel titles and field labels must form a clear three-level hierarchy without oversized display type.
- Letter spacing remains `0`.
- Visible Chinese copy must fit its container; controls may wrap where the current structure permits but must not overlap adjacent content.

## Component Rules

### Shells

Creator and Admin use the same tokens but different density. Existing navigation placement remains unchanged. Active navigation uses one blue-gradient capsule or a pale-blue selected surface; inactive navigation stays neutral. Shell borders and soft blue ambient shadow define regions without heavy elevation.

### Buttons And Inputs

Primary commands use the blue-violet gradient with white text and icons. Secondary commands use white capsule surfaces, dark text and neutral borders. Inline edit commands use the secondary style rather than a colored fill. Destructive commands use semantic red. Icon-only controls retain stable square or circular dimensions and accessible hover/focus states. Inputs use white surfaces, neutral borders and a blue focus ring.

### Panels And Cards

Panels are white with one thin cool-blue border and a restrained ambient shadow. The page background carries the subtle blue gradient; cards themselves do not use decorative gradients. Page sections must not become nested decorative cards. Existing project and asset cards retain their layout and gain consistent image surfaces, metadata hierarchy and action states.

### Capsule Interaction Rules

- Text command buttons, segmented modes, compact filters and status chips may use capsule geometry.
- Familiar icon-only actions remain stable circles or squares and require tooltips when meaning is not obvious.
- Long forms and data tables do not turn every cell or field into a pill.
- Primary, secondary, danger and disabled capsule variants define foreground and background as an inseparable pair.
- Dense stacked commands, such as batch-generation shortcuts, use white secondary capsules or one selected gradient capsule instead of repeated teal blocks.

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

## Motion Rules

- Page and major panel entry: opacity `0 -> 1` with `translateY(6px) -> 0` over 180-220ms.
- Card hover: at most `translateY(-1px)`, slightly stronger border and ambient shadow.
- Capsule hover: subtle brightness/shadow increase; active state may use `scale(.98)` for no more than 100ms.
- Selected navigation and segmented controls may animate background/indicator movement over 160-200ms.
- Loading shimmer remains low contrast and must not run beneath readable text.
- No bouncing, infinite decorative motion, large parallax or blurred animated blobs.
- `prefers-reduced-motion: reduce` disables translation, scale and non-essential transitions.

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
- Compare screenshots against the approved Stars-themed blue-gradient production-console direction and the supplied Apilio reference, not only against functional correctness.
- Verify that no rendered button, link, tag or status text uses green/teal and that computed text/icon contrast passes the stated thresholds.
- Search rendered Creator/Admin pages and built user-facing strings for `Toonflow`, `Toolflow`, `GitHub`, `Gitee`, `AtomGit`, `open source` and `开源`; expected result is zero product-facing matches.
- Verify repository icons, links, update-source actions and upstream welcome/About promotions are absent and leave no dead spacing.

## Delivery Sequence

1. Audit current surfaces, hard-coded presentation values and upstream product identity.
2. Create the brand asset registry and route every current logo association through it.
3. Remove user-visible upstream branding, open-source promotion and repository actions.
4. Normalize shared tokens and TDesign mappings.
5. Skin Creator shell and P0 surfaces.
6. Skin Admin shell and P0 surfaces.
7. Complete P1/P2 surfaces and production-specific chrome.
8. Run automated gates and desktop/narrow browser regression.
9. Update visual registries, validation evidence and progress logs.

## Completion Criteria

The visual skin is complete when all matrix surfaces use the shared visual language, no product-facing surface retains upstream branding, open-source promotion, repository actions or dominant upstream styling, all required responsive screenshots pass visual review, and the dual-build release gate remains green without functional or authorization regressions.
