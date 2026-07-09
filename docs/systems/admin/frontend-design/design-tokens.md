# Admin Design Tokens

The current Toonflow-based admin surface is the setting center in `web/src/components/setting/`. It uses the same visual token source as the main frontend: `web/src/assets/starsflow-theme.scss`.

| Token | Value | Usage |
| --- | --- | --- |
| layout.setting.menu.width | `200px` | Current setting-center menu width; do not change in visual-only pass |
| layout.page.padding | Existing component padding | Admin/config content; do not change in visual-only pass |
| panel.radius | `8px` | Data panels and forms |
| table.row.height | `44px` | Default admin tables |
| input.height | `36px` | Forms and filters |
| drawer.width.default | `520px` | Detail drawers |
| status.enabled | `#16a34a` | Enabled Provider/model |
| status.disabled | `#94a3b8` | Disabled Provider/model |
| focus.ring | `#0f766e` | Keyboard focus |
