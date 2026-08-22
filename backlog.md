# Current Delivery Handoff

## Authority

Jira project `IG` is the authoritative delivery backlog. This file is a local handoff summary only; it does not replace Jira status, priority, assignment, hierarchy or acceptance criteria.

Requirements and architecture are authoritative under `docs/` as described in `AGENTS.md`.

## Current Project Status

**Phase:** Epic `IG-1` (Platform Foundation and Delivery) is complete. Within Epic `IG-2` (Public Website and Acquisition), Story `IG-18` is complete. Story `IG-19` (Navigate public product pages) is in progress — its first Subtask `IG-85` (accessible mobile navigation) is done; its second and last Subtask `IG-86` (verify responsive navigation states) is next. Product requirements, architecture and backlog planning remain available under `docs/` and Jira.

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
Subtask: IG-86 — Verify responsive navigation states
```

Direct links:

- <https://appitometechnologies.atlassian.net/browse/IG-2>
- <https://appitometechnologies.atlassian.net/browse/IG-19>
- <https://appitometechnologies.atlassian.net/browse/IG-86>

## Next Task

`IG-85` is Done. Next is `IG-86 — Verify responsive navigation states`, the second and last Subtask under `IG-19`/S07 — completing it closes `IG-19`.

Before implementation:

1. Check `IG-86`'s live status/assignee/comments first — Codex may have picked it up.
2. Read `IG-86`, its parent `IG-19` and Epic `IG-2` in Jira for live criteria.
3. `IG-85` already built and verified the mobile navigation disclosure in `SiteHeader.tsx` (hamburger toggle, keyboard Tab/Enter/Escape, all 5 destinations reachable) with both component tests (`SiteHeader.test.tsx`) and a real Playwright check at 1440px/375px. `IG-86`'s completion criteria may call for something beyond what `IG-85` already covered — read carefully before re-doing verification that already exists (e.g. it may want the responsive breakpoint itself asserted, additional viewport sizes per FSD 85's 320px minimum, or coverage of `SiteFooter.tsx`'s nav, which was not touched in `IG-85`).

## Last Execution

**Date:** 2026-08-22 Australia/Sydney

Completed:

- Implemented `IG-85 — Build accessible public navigation` (T013, S07/`IG-19`) — the first of two Subtasks under `IG-19`.
- Found and fixed a real accessibility gap: `SiteHeader.tsx`'s primary nav (`Invoice Generator`, `Templates`, `Pricing`) was `hidden md:flex`, i.e. `display:none` below the `md` breakpoint with no alternative — those destinations were completely unreachable on mobile, not just visually hidden.
- Added a disclosure-style mobile menu: a real `<button>` toggle with `aria-expanded`/`aria-controls`, mobile links only mounted in the DOM while open (never sit in the tab order when closed), closes on Escape or on choosing a destination. Login/Sign Up moved into the same panel on mobile.
- All 5 FSD 6.1 header destinations preserved exactly (no destinations added or removed) — this was a reachability fix, not a redesign.

Files changed or created:

- `frontend/app/components/landing/SiteHeader.tsx` (rewritten as a client component)
- `frontend/app/components/landing/SiteHeader.test.tsx` (new)
- `backlog.md`

Verification performed:

- Component tests (`SiteHeader.test.tsx`): desktop nav hrefs; mobile menu closed/absent from DOM by default; opens on click with all 5 destinations reachable (scoped queries via `within()` — jsdom doesn't compute the CSS media queries that keep the desktop/mobile navs mutually exclusive in a real browser, so unscoped queries hit real `getByRole` ambiguity errors during development, same class of issue as `IG-84`'s RTL cleanup bug); Tab→Enter opens, Escape closes; closes after choosing a destination. 9/9 tests pass across the full suite.
- **Real headless-browser check (Playwright), not just component tests**: at 1440px the hamburger is absent and the desktop nav is visible; at 375px the reverse; opening the mobile menu makes all 5 destinations pointer-clickable; keyboard Tab→Enter opens it and Escape closes it; zero console errors; no horizontal overflow at 375px. Screenshots reviewed (`mobile-nav-closed.png`, `mobile-nav-open.png`).
- `npm run lint` / `npm run build` clean.
- Pushed and watched a real GitHub Actions run to completion, both jobs green including the frontend `Test` step: <https://github.com/hassham/invoice-generator/actions/runs/32548766323>.

## Blockers and Open Decisions

No blocker is currently recorded for starting `IG-86`.

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

`IG-85` is Done with a claim comment (start) and a verification comment (completion, including the CI-run evidence and the mobile-reachability fix). Parent Story `IG-19` is still In Progress — its second Subtask `IG-86 — Verify responsive navigation states` is To Do/unclaimed as of this sync. Jira remains authoritative; refresh live issue state before starting work in a later session — do not assume the next Subtask by number alone.

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
