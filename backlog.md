# Current Delivery Handoff

## Authority

Jira project `IG` is the authoritative delivery backlog. This file is a local handoff summary only; it does not replace Jira status, priority, assignment, hierarchy or acceptance criteria.

Requirements and architecture are authoritative under `docs/` as described in `AGENTS.md`.

## Current Project Status

**Phase:** Epic `IG-1` (Platform Foundation and Delivery) is complete. Within Epic `IG-2` (Public Website and Acquisition), Stories `IG-18`, `IG-19` and `IG-20` are all complete. Next is Story `IG-21` (Measure acquisition activity), starting with Subtask `IG-89` (Instrument acquisition funnel events) — this will likely need an analytics-provider decision from the user before implementation (no analytics provider has been chosen yet; do not invent one). Product requirements, architecture and backlog planning remain available under `docs/` and Jira.

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
Story:   IG-21 — Measure acquisition activity
Subtask: IG-89 — Instrument acquisition funnel events
```

Direct links:

- <https://appitometechnologies.atlassian.net/browse/IG-2>
- <https://appitometechnologies.atlassian.net/browse/IG-21>
- <https://appitometechnologies.atlassian.net/browse/IG-89>

## Next Task

`IG-20` (S08, both Subtasks IG-87/IG-88) is Done. Next is Story `IG-21 — Measure acquisition activity` (S09), starting with its first Subtask `IG-89 — Instrument acquisition funnel events`. `IG-21` also has a second Subtask, `IG-90 — Verify privacy-safe analytics behavior`.

Before implementation:

1. Check `IG-89`'s live status/assignee/comments first — Codex may have picked it up.
2. Read `IG-89`, its parent `IG-21` and Epic `IG-2` in Jira for live criteria. `IG-21`'s Jira acceptance criteria: landing-page visits, acquisition source and invoice-editor starts can be measured; events exclude invoice contents/unnecessary personal data; event failures don't block the user journey.
3. **Likely blocker: no analytics provider has been chosen yet.** `docs/PRD.md` mentions "SEO landing page source" and acquisition tracking as a goal but does not name a specific analytics vendor (GA4, PostHog, Plausible, a custom backend endpoint, etc.). Per the project's standing rule ("do not invent credentials, production environments or provider contracts"), this needs an explicit decision from the user before real event delivery can be implemented — ask via `AskUserQuestion` rather than picking one, unless a lightweight, provider-agnostic approach (e.g. an internal `/api/v1/...` event-logging endpoint already covered by the backend's existing Audit module) turns out to satisfy the criteria without needing a third-party contract. Check docs/SAD.md's Audit module design before assuming a new provider is required.

## Last Execution

**Date:** 2026-08-22 Australia/Sydney

Completed:

- Implemented `IG-88 — Control public and private route indexing` (T016, S08/`IG-20`) — the second and final Subtask under `IG-20`, which is now Done. Parent Story `IG-20` closed.
- Added `frontend/app/robots.ts` and `frontend/app/sitemap.ts` via Next.js's App Router file conventions. `robots.txt` allows `/` for all user agents and disallows the authenticated application routes already documented in `docs/FSD.md` (`/dashboard`, `/documents`, `/customers`, `/items`, `/settings`, `/templates` — sections 42, 45, 55, 56, 59, 62, 73) — none of these routes are built yet, but disallowing them now means indexing stays excluded from the moment each ships. Reused only paths already specified in the FSD rather than inventing a route structure.
- Explicitly verified (via a negative test) that public acquisition routes stay crawlable: `/`, `/invoice/create` (the anonymous-usable acquisition funnel per `docs/PRD.md` §25), `/login`, `/signup` — none of these are in the disallow list.
- Documented in code that robots.txt is advisory only, not access control — per-route `noindex` metadata should still be added to each authenticated page once it's actually built, as defense-in-depth (not implemented now since no such page exists).

Files changed or created:

- `frontend/app/robots.ts`, `frontend/app/sitemap.ts` (new)
- `frontend/app/robots.test.ts`, `frontend/app/sitemap.test.ts` (new)
- `backlog.md`

Verification performed:

- Unit tests calling the exported `robots()`/`sitemap()` functions directly (plain data, no rendering needed) — 9 test files / 23 tests pass across the full suite.
- Real dev-server check of the actual served `/robots.txt` and `/sitemap.xml` output.
- Confirmed both appear as prerendered static routes in a real production build.
- `npm run lint` clean.
- Pushed and watched a real GitHub Actions run to completion, both jobs green: <https://github.com/hassham/invoice-generator/actions/runs/32552316604>.

## Blockers and Open Decisions

**Likely blocker for `IG-89`: no analytics provider has been chosen.** See Next Task above — needs an explicit user decision (via `AskUserQuestion`) before real event delivery can be implemented, unless routing acquisition events through the backend's existing Audit module (if its design fits) avoids needing a third-party contract at all. Check docs/SAD.md before assuming a new provider is required.

**Next.js 16.1.6's root-layout title template doesn't apply to a page's own `title` string.** Confirmed with a clean Turbopack cache during `IG-87`, so it's genuine framework behavior in this version, not a project bug or stale cache. If a future page relies on the `%s | Invoice App` suffix appearing automatically, set its title explicitly instead (e.g. `` `${pageTitle} | Invoice App` ``) rather than assuming the layout's `template` will apply it.

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

`IG-88` is Done with a claim comment (start) and a verification comment (completion, including CI-run evidence). Parent Story `IG-20` is Done (both Subtasks complete). Next Story `IG-21` (Measure acquisition activity) is To Do with two Subtasks, `IG-89` and `IG-90`, both To Do/unclaimed as of this sync. Jira remains authoritative; refresh live issue state before starting work in a later session — do not assume the next Subtask by number alone.

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
