# Admin Functional Component Registry

| Capability | Inputs | Outputs | Reuse Rule |
| --- | --- | --- | --- |
| User management | User profile and role | Updated account state | Reuse for internal team accounts |
| Provider configuration | Provider endpoint, key, model metadata | Stored Provider config | Central path for Provider setup |
| Model smoke test | Provider/model id and safe payload | Smoke result | Required before enabling paid use |
| Task monitor | Job status stream | Operational task table | Reuse for all generation job views |
| Cost record viewer | Job/provider/cost records | Cost summary | Reuse in admin and project budget views |
