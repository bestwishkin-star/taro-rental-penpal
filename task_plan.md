# Map-Assisted Location Closure

Goal: finish the map-assisted rental location flow described in `docs/superpowers/plans/2026-04-16-map-assisted-location-plan.md`.

## Phases

- [x] Restore context from existing plan/spec and inspect current implementation.
- [x] Verify existing tests and add failing coverage for remaining location behavior.
- [x] Complete shared/frontend location helpers.
- [x] Complete share page structured region and optional precise address flow.
- [x] Complete find page region filter and distance sort flow.
- [x] Run focused and workspace verification.

## Decisions

- Treat the existing dated plan as the approved design source for this continuation.
- Preserve the legacy `location` display string while sending structured `province/city/district/address/latitude/longitude`.
- Use Shanghai district options for the initial rollout, matching the existing backend center table.

## Errors Encountered

| Error | Attempt | Resolution |
| --- | --- | --- |
| PowerShell profile execution warning appears on each command | Shell startup | Ignore unless it blocks commands; commands still complete with exit code 0. |
| `pnpm --filter @rental-penpal/* lint` fails before source linting | Existing ESLint config applies typed rules to JS config files without parser services | Recorded as unrelated existing repo lint configuration issue. |
| First `pnpm build:backend` failed with EPERM writing `.next/cache/.rscinfo` | Sandbox run | Re-ran with approved escalation; Next compiled, then failed on existing lint violations outside map-location files. |
