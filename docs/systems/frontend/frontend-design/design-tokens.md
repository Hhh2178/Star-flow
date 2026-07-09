# Frontend Design Tokens

The canonical implementation entry is `web/src/assets/starsflow-theme.scss`.

| Token | Value | Usage |
| --- | --- | --- |
| page.background | `#f7f8fa` | Main production workspace background |
| panel.background | `#ffffff` | Tool panels, dialogs, cards, and inspectors |
| panel.muted | `#f1f5f4` | Table headers and secondary panels |
| panel.border | `#dfe6e4` | Panel and canvas item borders |
| text.primary | `#111827` | Primary labels and titles |
| text.secondary | `#64748b` | Secondary metadata and hints |
| accent.primary | `#0f766e` | Primary actions and active states |
| accent.primary.hover | `#115e59` | Primary action hover |
| accent.primary.subtle | `#ccfbf1` | Soft selected backgrounds |
| status.success | `#16a34a` | Successful generation and pass states |
| status.warning | `#d97706` | Pending review, budget, and cost warnings |
| status.danger | `#dc2626` | Failed jobs and destructive actions |
| status.running | `#2563eb` | Running jobs |
| status.ai | `#7c3aed` | AI suggestion/status accents only |
| radius.panel | `8px` | Panels, dialogs, repeated cards |
| radius.control | `6px` | Buttons, inputs, tags, menu items |
| motion.fast | `140ms ease-out` | Hover and state transitions |

## Rule

Do not add new hard-coded colors to Vue components. Add a semantic token in `starsflow-theme.scss` first, then consume the token from the component.
