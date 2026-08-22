# Current Delivery Handoff

## Authority

Jira project `IG` is the authoritative delivery backlog. This file is a local handoff summary only; it does not replace Jira status, priority, assignment, hierarchy or acceptance criteria.

Requirements and architecture are authoritative under `docs/` as described in `AGENTS.md`.

## Current Project Status

**Phase:** Epic `IG-1` (Platform Foundation and Delivery) is complete. Within Epic `IG-2` (Public Website and Acquisition), Stories `IG-18` and `IG-19` are both complete. Next is Story `IG-20` (Find public pages through search engines), starting with Subtask `IG-87` (Add public-page SEO metadata). Product requirements, architecture and backlog planning remain available under `docs/` and Jira.

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
Story:   IG-20 — Find public pages through search engines
Subtask: IG-87 — Add public-page SEO metadata
```

Direct links:

- <https://appitometechnologies.atlassian.net/browse/IG-2>
- <https://appitometechnologies.atlassian.net/browse/IG-20>
- <https://appitometechnologies.atlassian.net/browse/IG-87>

## Next Task

`IG-19` (S07, both Subtasks IG-85/IG-86) is Done. Next is Story `IG-20 — Find public pages through search engines` (S08), starting with its first Subtask `IG-87 — Add public-page SEO metadata`. `IG-20` also has a second Subtask, `IG-88 — Control public and private route indexing`.

Before implementation:

1. Check `IG-87`'s live status/assignee/comments first — Codex may have picked it up.
2. Read `IG-87`, its parent `IG-20` and Epic `IG-2` in Jira for live criteria.
3. `IG-20`'s Jira acceptance criteria: indexable pages provide appropriate titles/metadata; public routes support crawlable content where appropriate; private application routes are not presented as public acquisition pages. `IG-87` is likely Next.js `metadata`/`generateMetadata` export work on `frontend/app/page.tsx` (title, description, Open Graph, canonical) — the app currently only has the one landing route, so this is probably scoped to it plus the App Router's shared `layout.tsx` defaults.
4. `IG-88`'s "private route" indexing-control concern doesn't yet have anything to control — no authenticated/private routes exist in the app yet (Authentication and Invoice Generator are still later Epics). Don't invent private routes to gate; that Subtask likely wants a `robots.txt`/`sitemap` mechanism established correctly for when private routes do exist, not private routes built now.

## Last Execution

**Date:** 2026-08-22 Australia/Sydney

Completed:

- Implemented `IG-86 — Verify responsive navigation states` (T014, S07/`IG-19`) — the second and final Subtask under `IG-19`, which is now Done. Parent Story `IG-19` closed.
- Fixed a real focus-management gap found during this work: pressing Escape closed `SiteHeader`'s mobile disclosure but never returned focus anywhere, stranding keyboard users. Focus now returns to the toggle button (`toggleRef.current?.focus()`), the standard WAI-ARIA disclosure-button pattern.
- Added interaction-test coverage that didn't exist: `SiteFooter.test.tsx` (new — footer nav was completely untested), plus a focus-return assertion in `SiteHeader.test.tsx`.
- Scoped "active routes" (T014's completion-criteria wording, which appears nowhere else in `docs/`) as "nav interactions genuinely activate their destination route" rather than inventing an undocumented "current page" visual indicator — flagged this reading in the Jira claim comment before starting.
- Real Playwright verification of route activation for every nav control (desktop, footer, mobile disclosure) at 1440px and 375px — genuinely clicked each link and confirmed the browser navigated (hash update for `#templates`/`#pricing`, path change for `/login`/`/signup`/`/invoice/create`), not just DOM assertions. Two apparent failures during this check were verification-script bugs (missing waits, an unscoped locator matching both header and footer "Login" links), not product bugs — diagnosed with an isolated debug script before concluding that, fixed, and re-verified clean.

Files changed or created:

- `frontend/app/components/landing/SiteHeader.tsx` (focus-return fix)
- `frontend/app/components/landing/SiteHeader.test.tsx` (extended)
- `frontend/app/components/landing/SiteFooter.test.tsx` (new)
- `backlog.md`

Verification performed:

- 5 test files / 11 tests pass across the full Vitest suite.
- `npm run lint` / `npm run build` clean.
- Real headless-browser check confirming actual route activation and keyboard focus behavior (detailed above), zero console errors beyond the expected 404s for not-yet-built routes.
- Pushed and watched a real GitHub Actions run to completion, both jobs green: <https://github.com/hassham/invoice-generator/actions/runs/32550442707>.

**Incident during this session, self-corrected:** while trying to free a stale dev-server lock file, misread a Next.js log line and ran `taskkill` against the wrong PID — it turned out to be the unrelated pre-existing process occupying port 3000 on this machine (documented gotcha, not this project's process), not a leftover dev server. Killed it by mistake; flagged immediately to the user. Recovered by confirming the correct PID via `Get-CimInstance Win32_Process` (checked the full command line, not just the process name) before stopping the actual dev server cleanly. Lesson for future sessions: always confirm a process's command line before terminating it, even when freeing a port that seems safe to touch.

## Blockers and Open Decisions

No blocker is currently recorded for starting `IG-87`.

**Frontend component tests need explicit RTL cleanup.** `vitest.config.ts` does not set `test.globals: true`, so React Testing Library's automatic `afterEach(cleanup)` never self-registers; `vitest.setup.ts` now calls `cleanup()` in its own `afterEach` to compensate. Any future change to `vitest.config.ts`/`vitest.setup.ts` must preserve this or multi-`it()` test files will silently leak DOM state between tests.

**Playwright verification scripts need explicit waits after client-side navigation.** `waitForLoadState("networkidle")` is unreliable in Next.js dev mode (HMR/websocket activity can keep it from settling, or it can throw `net::ERR_ABORTED` if another navigation is issued too soon after). Prefer `page.waitForURL(pattern)` for cross-page navigation checks and a short fixed `waitForTimeout` for same-page hash/state changes, as used in `IG-86`'s verification script.

**Be careful running process-killing commands to free a port/lock.** This machine has an unrelated app's process on port 3000 (see below) that looks superficially similar to a stale dev-server lock in log output. Always confirm a PID's actual command line (e.g. `Get-CimInstance Win32_Process -Filter 'ProcessId = <pid>'` on Windows) before terminating it — a misread during `IG-86` killed that unrelated process by mistake.

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

`IG-86` is Done with a claim comment (start, including the scope note on "active routes") and a verification comment (completion, including CI-run evidence and the focus-return fix). Parent Story `IG-19` is Done (both Subtasks complete). Next Story `IG-20` (Find public pages through search engines) is To Do with two Subtasks, `IG-87` and `IG-88`, both To Do/unclaimed as of this sync. Jira remains authoritative; refresh live issue state before starting work in a later session — do not assume the next Subtask by number alone.

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
