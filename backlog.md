# Current Delivery Handoff

## Authority

Jira project `IG` is the authoritative delivery backlog. This file is a local handoff summary only; it does not replace Jira status, priority, assignment, hierarchy or acceptance criteria.

Requirements and architecture are authoritative under `docs/` as described in `AGENTS.md`.

## Current Project Status

**Phase:** Epic `IG-1` (Platform Foundation and Delivery) is complete. Within Epic `IG-2` (Public Website and Acquisition), Stories `IG-18` and `IG-19` are both complete. Story `IG-20` (Find public pages through search engines) is in progress — its first Subtask `IG-87` (public-page SEO metadata) is done; its second and last Subtask `IG-88` (control public/private route indexing) is next. Product requirements, architecture and backlog planning remain available under `docs/` and Jira.

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
Subtask: IG-88 — Control public and private route indexing
```

Direct links:

- <https://appitometechnologies.atlassian.net/browse/IG-2>
- <https://appitometechnologies.atlassian.net/browse/IG-20>
- <https://appitometechnologies.atlassian.net/browse/IG-88>

## Next Task

`IG-87` is Done. Next is `IG-88 — Control public and private route indexing`, the second and last Subtask under `IG-20`/S08 — completing it closes `IG-20`.

Before implementation:

1. Check `IG-88`'s live status/assignee/comments first — Codex may have picked it up.
2. Read `IG-88`, its parent `IG-20` and Epic `IG-2` in Jira for live criteria.
3. No authenticated/private routes exist in the app yet (Authentication and Invoice Generator are still later Epics) — don't invent private routes to gate. This Subtask is likely a `robots.txt` (and possibly `sitemap.xml`) mechanism via Next.js's App Router file conventions (`app/robots.ts`, `app/sitemap.ts`), established correctly now (allow `/`, disallow nothing yet since nothing private exists) so it's ready to extend when private routes are built later.
4. `IG-87` already set `metadataBase` (env-driven, `NEXT_PUBLIC_SITE_URL` with a localhost fallback) in `frontend/app/layout.tsx` — reuse it rather than hardcoding a host in `robots.ts`/`sitemap.ts`.

## Last Execution

**Date:** 2026-08-22 Australia/Sydney

Completed:

- Implemented `IG-87 — Add public-page SEO metadata` (T015, S08/`IG-20`) — the first of two Subtasks under `IG-20`.
- `frontend/app/page.tsx`: page-specific `title`/`description` (reused verbatim from `Hero.tsx`'s existing copy, not invented), `alternates: { canonical: "/" }`, matching Open Graph tags.
- `frontend/app/layout.tsx`: `metadataBase` read from `NEXT_PUBLIC_SITE_URL` with a `localhost:3000` fallback (no production domain decided yet, so nothing hardcoded — consistent with the project's "don't invent provider/production environments" rule), a title template for future pages, explicit `robots: { index: true, follow: true }`.
- Investigated and documented a real Next.js 16.1.6 behavior: the root layout's title template (`"%s | Invoice App"`) does not get applied to the page's own title — confirmed with a full Turbopack cache clear + dev server restart to rule out a stale-cache false positive before accepting it as genuine framework behavior rather than a bug in this code. Not blocking, since IG-87's actual completion criteria (title, description, canonical) all resolve correctly without it.

Files changed or created:

- `frontend/app/page.tsx`, `frontend/app/layout.tsx` (metadata added)
- `frontend/app/page-metadata.test.ts`, `frontend/app/layout.test.ts` (new)
- `backlog.md`

Verification performed:

- Unit tests directly on the exported `metadata` objects (cheap — they're plain data, no rendering needed).
- Real headless-browser check of the actual rendered `<head>` (not just the exported object): title, meta description, canonical `<link>`, Open Graph tags, robots meta all present and correct.
- 7 test files / 17 tests pass across the full suite; `npm run lint` / `npm run build` clean.
- Pushed and watched a real GitHub Actions run to completion, both jobs green: <https://github.com/hassham/invoice-generator/actions/runs/32551384970>.

While investigating the title-template issue, the dev server needed restarting twice more (to rule out a stale cache) — each time confirmed the listening PID's actual command line via `Get-CimInstance Win32_Process -Filter 'ProcessId = <pid>'` before stopping it, per the lesson recorded below from the earlier port-3000 mistake. No further misidentification occurred.

## Blockers and Open Decisions

No blocker is currently recorded for starting `IG-88`.

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

`IG-87` is Done with a claim comment (start) and a verification comment (completion, including CI-run evidence and the title-template note). Parent Story `IG-20` is still In Progress — its second Subtask `IG-88 — Control public and private route indexing` is To Do/unclaimed as of this sync. Jira remains authoritative; refresh live issue state before starting work in a later session — do not assume the next Subtask by number alone.

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
