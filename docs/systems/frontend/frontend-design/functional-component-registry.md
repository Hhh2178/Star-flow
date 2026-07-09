# Frontend Functional Component Registry

| Capability | Inputs | Outputs | Reuse Rule |
| --- | --- | --- | --- |
| Provider selector | Provider catalog, task type | Selected provider/model | Reuse across generation forms |
| Generation action | Project id, node id, prompt/config | Job id and status | All AI generation buttons use this path |
| Review action | Asset/video id, review decision | Review record and next state | Reuse for human review panels |
| Retry action | Failed job or rejected output | New job linked to source | Reuse for video, image, and prompt reruns |
