# Stars Flow Visual System

## Purpose

This document defines the visual system for Stars Flow's Toonflow-based frontend. It translates Xinghuan Manju's production-console direction into the current Vue 3, Vite, TDesign, and Vue Flow stack.

## Non-Negotiable Boundary

This visual pass must not change page arrangement. Keep the current Toonflow workbench shell, project grid, setting dialog, production canvas, and editor layouts in place. Visual changes should come from tokens, component styling, and small hard-coded color replacements.

## Design Language

Stars Flow should feel like an internal AI production control room:

- Calm, cool, and work-focused.
- Clear hierarchy for projects, models, prompts, assets, tasks, and production states.
- Light surfaces and subtle shadows instead of dark panels or marketing gradients.
- Teal primary action color, with state colors reserved for real statuses.
- Medium-high density so a ten-person internal team can scan and operate quickly.

## Core Tokens

| Semantic Token | Value | Usage |
| --- | --- | --- |
| `--stars-brand` | `#0f766e` | Primary buttons, active navigation, focus |
| `--stars-brand-hover` | `#115e59` | Primary hover and active states |
| `--stars-brand-subtle` | `#ccfbf1` | Soft selected backgrounds and tags |
| `--stars-page-bg` | `#f7f8fa` | Application background |
| `--stars-surface` | `#ffffff` | Panels, cards, dialogs |
| `--stars-surface-muted` | `#f1f5f4` | Secondary panels and table headers |
| `--stars-border` | `#dfe6e4` | Default borders |
| `--stars-border-strong` | `#b7c8c4` | Hover/focus borders |
| `--stars-text` | `#111827` | Primary text |
| `--stars-text-muted` | `#64748b` | Secondary text |
| `--stars-success` | `#16a34a` | Success states |
| `--stars-warning` | `#d97706` | Warnings and cost attention |
| `--stars-danger` | `#dc2626` | Errors and destructive actions |
| `--stars-running` | `#2563eb` | Running tasks |
| `--stars-ai` | `#7c3aed` | AI suggestion/status accents only |
| `--stars-radius-sm` | `4px` | Compact controls |
| `--stars-radius-md` | `6px` | Inputs, tags, menu items |
| `--stars-radius-lg` | `8px` | Cards, dialogs, panels |
| `--stars-shadow-soft` | `0 10px 30px rgba(15, 23, 42, 0.08)` | Dialogs and raised panels |
| `--stars-motion-fast` | `140ms ease-out` | Hover and active feedback |

## TDesign Mapping

TDesign variables are overridden in `starsflow-theme.scss`:

- `--td-brand-color-*` maps to a teal scale.
- `--td-bg-color-page` maps to `--stars-page-bg`.
- `--td-bg-color-container` maps to `--stars-surface`.
- `--td-border-level-*` maps to Stars Flow borders.
- `--td-text-color-*` maps to Stars Flow text tokens.
- `--td-radius-*` maps to compact production-console radii.
- `--td-shadow-*` maps to subtle console shadows.

## Component Rules

| Component | Rule |
| --- | --- |
| Buttons | Primary is teal; danger actions use semantic danger; all buttons use short transitions |
| Cards | White surface, thin border, subtle hover elevation |
| Dialogs and drawers | White panels, soft shadow, clear header border |
| Menus | Active item uses teal text and pale teal background |
| Tags | Rounded but not pill-heavy; status colors must carry real status meaning |
| Tables | Muted header surface, soft row hover, no heavy borders |
| Inputs | White background, teal focus border, no oversized shadows |
| Scrollbars | Low-contrast gray-teal thumb |
| Canvas/workbench nodes | Keep layout and node behavior; only normalize color, border, and hover language |

## Motion

Use restrained feedback:

- Hover: border/color/elevation changes in `120-180ms`.
- Active: immediate color shift, no bounce.
- Dialogs/drawers: rely on existing TDesign transitions.
- Loading: keep existing behavior; only recolor through tokens.
- Reduced motion: disable non-essential transitions when `prefers-reduced-motion: reduce`.

## Do Not

- Do not move navigation, panels, cards, canvas nodes, or settings sections.
- Do not introduce a marketing hero or landing page.
- Do not use large purple-blue gradients as the dominant visual identity.
- Do not turn every section into nested cards.
- Do not use decorative orbs or bokeh backgrounds.
- Do not hard-code new hex colors in Vue components unless the value is first added as a token.

## Implementation Notes

The visual entry file is intentionally global because Toonflow uses TDesign and many page components already depend on TDesign CSS variables. Component-specific edits should be small and limited to replacing hard-coded colors with the new semantic variables.
