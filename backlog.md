# Current Delivery Handoff

## Authority

Jira project `IG` is the authoritative delivery backlog. This file is a local handoff summary only; it does not replace Jira status, priority, assignment, hierarchy or acceptance criteria.

Requirements and architecture are authoritative under `docs/` as described in `AGENTS.md`.

## Current Project Status

**Phase:** Epic `IG-1` (Platform Foundation and Delivery) is complete. Within Epic `IG-2` (Public Website and Acquisition), Story `IG-18` (Discover the product from the landing page) is now complete — landing page content and its Create Invoice navigation tests are both done and verified in a real CI run. Next up is Story `IG-19` (Navigate public product pages). Product requirements, architecture and backlog planning remain available under `docs/` and Jira.

Jira backlog created and verified:

- Epics: `IG-1` through `IG-12` — 12 total
- Stories: `IG-13` through `IG-72` — 60 total
- Subtasks: `IG-73` through `IG-192` — 120 total
- All Stories have Epic parents.
- All Subtasks have Story parents.
- Created issues were configured as Highest priority and Unassigned.
- Epic dependency links were created using Jira's Blocks relationship.

Jira project: <https://appitometechnologies.atlassian.net/jira/software/projects/IG>

## Current Focus

Continue the platform foundation in delivery order:

```text
Epic:    IG-2  — Public Website and Acquisition
Story:   IG-19 — Navigate public product pages
Subtask: IG-85 — Build accessible public navigation
```

Direct links:

- <https://appitometechnologies.atlassian.net/browse/IG-2>
- <https://appitometechnologies.atlassian.net/browse/IG-19>
- <https://appitometechnologies.atlassian.net/browse/IG-85>

## Next Task

`IG-18` (S06, both Subtasks IG-83/IG-84) is Done. Next is Story `IG-19 — Navigate public product pages` (S07), starting with its first Subtask `IG-85 — Build accessible public navigation`. `IG-19` also has a second Subtask, `IG-86 — Verify responsive navigation states`.

Before implementation:

1. Check `IG-85`'s live status/assignee/comments first — Codex may have picked it up.
2. Read `IG-85`, its parent `IG-19` and Epic `IG-2` in Jira for live criteria.
3. `IG-19`'s acceptance criteria call for navigation exposing approved public destinations (Create Invoice, authentication, supporting info), usable on mobile and by keyboard. `SiteHeader.tsx` (built in `IG-83`) already has basic nav links — check what it currently covers before assuming this is greenfield work; this Subtask is likely about completing/hardening it (keyboard operability, mobile menu state, correct destination set) rather than building nav from scratch.
4. `/login`, `/signup` and `/invoice/create` still don't exist as pages (later Epics) — nav links to them are expected to remain non-functional destinations for now, consistent with `IG-84`'s precedent of testing route wiring, not building destinations.

## Last Execution

**Date:** 2026-08-22 Australia/Sydney

Completed:

- Implemented `IG-84 — Connect landing-page creation calls to action` (T012, S06/`IG-18`) — the second and final Subtask under `IG-18`, which is now Done.
- Determined (from `IG-84`'s completion criteria: "passes navigation tests") that this Subtask was about proving the CTAs wired in `IG-83` route correctly, not about building `/invoice/create`/`/login`/`/signup` themselves — those stay out of scope for later Epics.
- Introduced frontend component testing: Vitest + `@testing-library/react`/`jest-dom`/`user-event` + jsdom, `frontend/vitest.config.ts` + `frontend/vitest.setup.ts`, `"test": "vitest run"` script.
- Wrote navigation tests: `Hero.test.tsx` and `PricingTeaserSection.test.tsx` (per-component), `page.test.tsx` (full page, asserts exactly 2 "Create Free Invoice" links both pointing at `/invoice/create`, and the Pro plan CTA pointing at `/signup` instead).
- Added a `Test` step to the frontend CI job in `.github/workflows/ci.yml`, before `Build`, matching the backend job's existing gate-before-artifact pattern.
- Closed `IG-18` (Story) — both its Subtasks are Done.

Files changed or created:

- `frontend/vitest.config.ts`, `frontend/vitest.setup.ts` (new)
- `frontend/app/components/landing/Hero.test.tsx`, `frontend/app/components/landing/PricingTeaserSection.test.tsx`, `frontend/app/page.test.tsx` (new)
- `frontend/package.json` / `package-lock.json` (new devDependencies + `test` script)
- `.github/workflows/ci.yml` (frontend job: added `Test` step)
- `frontend/README.md` (documents the Vitest setup and the RTL cleanup gotcha)
- `backlog.md`

Verification performed:

- **Ran the tests locally and hit a real failure, not a hypothetical one**: `PricingTeaserSection.test.tsx`'s second test failed with a `getByRole` ambiguity because a prior test's DOM wasn't unmounted — React Testing Library's automatic `afterEach(cleanup)` only self-registers under Jest/Vitest globals, which `vitest.config.ts` doesn't enable. Fixed by adding an explicit `afterEach(cleanup)` in `vitest.setup.ts`; re-ran and confirmed all 4 tests pass.
- Pushed and watched a real GitHub Actions run to completion, confirming the new frontend `Test` step actually executes `npm run test` in CI (not just locally) alongside the pre-existing Lint/Build steps: <https://github.com/hassham/invoice-generator/actions/runs/32494052580> (both jobs green).

## Blockers and Open Decisions

No blocker is currently recorded for starting `IG-85`.

**Frontend component tests need explicit RTL cleanup.** `vitest.config.ts` does not set `test.globals: true`, so React Testing Library's automatic `afterEach(cleanup)` never self-registers; `vitest.setup.ts` now calls `cleanup()` in its own `afterEach` to compensate. Any future change to `vitest.config.ts`/`vitest.setup.ts` must preserve this or multi-`it()` test files will silently leak DOM state between tests.

**Port 3000 on this machine may be occupied by an unrelated project's dev server.** Next.js handles this gracefully on its own (auto-selects the next free port, e.g. 3002) — but always check the dev server's own startup log for the actual port before scripting/testing against `localhost:3000`, per the mixup caught during `IG-83`.

**No project skill exists yet for running the frontend in a browser**, and `chromium-cli` isn't available on this machine. `IG-83` used an ad-hoc Playwright script in a scratch directory; consider `/run-skill-generator` if browser verification becomes routine for future frontend Subtasks (`frontend/README.md` has the detail).

**Structured logging note for future work:** `builder.Logging.AddSimpleConsole(options => options.IncludeScopes = true)` is what makes correlation IDs (and any future `logger.BeginScope`) actually visible in log output — the default console configuration does not include scopes. If a future Subtask introduces a different/additional log provider (Seq, Application Insights, etc. per `docs/SAD.md` section 76), confirm it's still configured to surface scopes, or the correlation ID will silently stop appearing in logs even though the code is unchanged.

**`main` now has branch protection** requiring `Backend build` and `Frontend build` to pass before a PR can merge (force-push/deletion of `main` also disallowed). `enforce_admins` is off and no PR-review count is required, so direct pushes to `main` by an authenticated owner still work (as used throughout this project so far) — only PR merges are actually gated. Revisit if the team/workflow around PRs changes.

Architecture-boundary tests (`InvoiceApp.ArchitectureTests`) must be validated against what actually runs in CI (Linux), not only a Windows dev machine — a real cross-platform bug in `ProjectFile.cs` (fixed during `IG-80`) sat undetected through `IG-74` and every session since, because it only manifested on the Ubuntu CI runner.

**This directory is now a git repository** (it was not, as of the previous handoff) with a remote at `https://github.com/hassham/invoice-generator` (public, owned by GitHub account `hassham`, authenticated via `gh`). The default branch is `main`. Do not re-run `git init` or treat the repository as absent in a future session — check `git remote -v` / `git log` first.

`docs/DATABASE_SCHEMA.md` documents the intended design; always verify newly-generated migration SQL/column names actually match it before trusting the doc, per the naming-convention mismatch caught and fixed during `IG-78`.

**Resolved during `IG-77`, flagged to the user first:** the root `NuGet.Config` now has `nuget.org` as a real package source (previously `<clear />` with none). It was needed because `Microsoft.AspNetCore.Identity.EntityFrameworkCore` wasn't cached locally, and unlike EF Core's own packages, ASP.NET Core packages generally don't support running on an older .NET major than they're versioned for — so version 8.0.11 (matching the actual installed .NET 8 SDK) was used throughout the EF Core/Npgsql/Identity stack for consistency, restored fresh from nuget.org rather than mixing in the previously-cached 9.x EF Core packages.

**The invoicing app's Postgres runs on host port 5433, not 5432.** This machine already has an unrelated project's Postgres container (`meetingmind-postgres`) bound to 5432 — `infrastructure/docker/docker-compose.yml` deliberately avoids that port so it can never collide with or need to touch that container/data. Start it with `docker compose -f infrastructure/docker/docker-compose.yml up -d` before running migrations or the Api against a real database.

The `dotnet-ef` global tool is now installed at version 8.0.11 (matching the project's EF Core version) in this environment — a future session/environment without it will need `dotnet tool install --global dotnet-ef --version 8.0.11` before running migration commands.

The installed environment provides .NET SDK 8.0.300. Two approved attempts to install .NET 10 stalled, so the backend currently targets supported .NET 8 to retain a verified clean build. Upgrade the target to .NET 10 when that SDK is reliably available; do not represent the current target as .NET 10.

Both Claude and Codex are authorized to work in this repository and Jira project concurrently but must not work the same Subtask at once. Before starting a Subtask, check its live Jira status/assignee/comments; claim it by transitioning To Do → In Progress with a short comment before beginning implementation.

Provider and deployment choices that are not needed for the current structural task should be resolved through their relevant Jira work before implementation depends on them. Do not invent credentials, production environments or provider contracts.

## Jira Synchronization

**Last synchronized:** 2026-08-22 Australia/Sydney

`IG-84` is Done with a claim comment (start) and a verification comment (completion, including the CI-run evidence and the RTL cleanup bug/fix). Parent Story `IG-18` is Done (both Subtasks complete). Next Story `IG-19` (Navigate public product pages) is To Do with two Subtasks, `IG-85` and `IG-86`, both To Do/unclaimed as of this sync. Jira remains authoritative; refresh live issue state before starting work in a later session — do not assume the next Subtask by number alone.

## Handoff Update Template

Replace the current execution sections with concise, current information after meaningful work:

```text
Current focus:
Epic / Story / Subtask:

Last execution:
- Completed:
- Files changed:
- Verification:

Remaining work or blockers:

Next task:

Jira synchronization:
```
