# Frontend Visual Component Registry

| Component | Purpose | Reuse Rule |
| --- | --- | --- |
| Project workspace shell | Holds project nav, active production surface, and inspector | One shell per project route |
| Production canvas panel | Displays storyboard, assets, videos, or flow nodes | Reuse for all creative workspace surfaces |
| Status pill | Shows task/review/generation state | Use shared severity mapping from design tokens |
| Inspector drawer | Shows selected item details and actions | Use for shot, asset, video, and review details |
| Empty state | Shows missing setup or next action | Must include one concrete action |
