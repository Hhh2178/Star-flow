# Documentation Governance Standard

## Rules

- One fact has one canonical source.
- Root files summarize and link; they do not store detailed histories.
- Daily work evidence goes to `docs/logbooks/daily/`.
- Deployment validation evidence goes to `docs/logbooks/validations/` or `docs/references/` when it is a one-time assessment.
- Superseded docs must be marked in place or moved under an archive folder after user approval.

## Update Duties

Update `docs/INDEX.md` whenever a new documentation family or canonical source is added.

Update daily logbooks after meaningful changes to harness, deployment, branch policy, or runtime behavior.

## Verification

Run `npm run harness:verify:project` before committing harness changes.
