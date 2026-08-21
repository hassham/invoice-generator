# Current Delivery Handoff

## Authority

Jira project `IG` is the authoritative delivery backlog. This file is a local handoff summary only; it does not replace Jira status, priority, assignment, hierarchy or acceptance criteria.

Requirements and architecture are authoritative under `docs/` as described in `AGENTS.md`.

## Current Project Status

**Phase:** Epic `IG-1` (Platform Foundation and Delivery) is complete — modular solution structure, architecture-boundary enforcement, environment/secrets handling, database schema and migrations, CI with quality gates and branch protection, health checks, and structured error diagnostics are all in place and verified against real infrastructure (a live Postgres container, a live GitHub Actions pipeline). Construction is moving into Epic `IG-2` (Public Website and Acquisition) — the first genuinely frontend/product-content work. Product requirements, architecture and backlog planning remain available under `docs/` and Jira.

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
Story:   IG-18 — Discover the product from the landing page
Subtask: IG-84 — Connect landing-page creation calls to action
```

Direct links:

- <https://appitometechnologies.atlassian.net/browse/IG-2>
- <https://appitometechnologies.atlassian.net/browse/IG-18>
- <https://appitometechnologies.atlassian.net/browse/IG-84>

## Next Task

`IG-83` is Done. Next is `IG-84 — Connect landing-page creation calls to action`, the second and last Subtask under `IG-18`/S06.

Before implementation:

1. Check `IG-84`'s live status/assignee/comments first — Codex may have picked it up.
2. Read `IG-84`, its parent `IG-18` and Epic `IG-2` in Jira for live criteria.
3. The landing page's CTAs (`Create Free Invoice`, template links, pricing plan buttons) already point at `/invoice/create`, `/login`, `/signup` — none of those pages exist yet (they belong to later Epics: Invoice Generator, Authentication). Read `IG-84`'s completion criteria carefully before assuming scope: it may be about the CTAs' *behaviour* (e.g. anchor scrolling, analytics/acquisition tracking per `docs/PRD.md`'s SEO Acquisition Strategy section) rather than building the destination pages themselves, which would be a much bigger, out-of-scope pull-forward.
4. `docs/FSD.md` section 6.1 already specifies the primary CTA's destination (`/invoice/create`) and label (`Create Free Invoice`) — both already implemented in `IG-83`. Confirm what's actually left before adding anything new.

## Last Execution

**Date:** 2026-08-21 Australia/Sydney

Completed:

- Implemented `IG-83 — Build the responsive landing-page content` (T011, S06/`IG-18`) — the first genuinely frontend/product-content Subtask in the project.
- Replaced the Next.js starter template with a real landing page (`frontend/app/page.tsx` composing new components in `frontend/app/components/landing/`), covering every component `docs/FSD.md` section 6.1 requires: header nav, hero (headline "Create it. Send it. Get paid." per `docs/PRD.md` section 35's stated positioning, already present in the scaffold and kept), product benefits, template preview, how it works, feature overview, pricing teaser, FAQ, footer.
- Template preview names/codes (`classic`/`modern`/`minimal`) deliberately match the three rows already seeded in `document.templates` by the backend (`IG-78`) rather than inventing separate marketing names.
- Pricing teaser content grounded in `docs/PRD.md` section 24's Freemium Model (Free vs Pro feature lists, indicative Pro price) — informational only, no checkout/payment flow (Subscriptions module is explicitly future/out of MVP scope).
- FAQ content grounded in FSD/AGENTS.md facts already true of the product (anonymous preview before account, GST support, PDF download after sign-in) rather than invented claims.

Files changed or created:

- `frontend/app/page.tsx` (rewritten)
- `frontend/app/components/landing/{SiteHeader,Hero,BenefitsSection,TemplatePreviewSection,HowItWorksSection,FeatureOverviewSection,PricingTeaserSection,FaqSection,SiteFooter}.tsx`
- `frontend/README.md` (new — first frontend README; documents the landing page and the browser-verification approach)
- `backlog.md`

Verification performed:

- `npm run lint` / `npm run build` — both clean (build also type-checks).
- **Real browser verification, not just a successful build** — no project skill covered this yet, so used a small ad-hoc Playwright script (`chromium-cli` unavailable on this machine; Playwright installed to a scratch directory, not the repo) to actually load the running dev server: confirmed all 7 section headings render, the FAQ `<details>` disclosure opens on click, zero browser console errors, and **no horizontal overflow at 1440px, 375px or 320px** (the FSD's minimum supported width) — screenshots reviewed at all three sizes, not just asserted.
- **Caught and worked around a real environment gotcha**: port 3000 was already occupied by a completely unrelated project's dev server on this machine ("Lead → Launch"); Next.js correctly auto-selected port 3002, and the first verification attempt against the assumed port 3000 hit the wrong app entirely before this was noticed and fixed. Documented in `frontend/README.md` for future sessions.
- Pushed and watched two real GitHub Actions runs to completion (the landing page commit, then the README commit): <https://github.com/hassham/invoice-generator/actions/runs/32462727335>.

## Blockers and Open Decisions

No blocker is currently recorded for starting `IG-84`.

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

**Last synchronized:** 2026-08-21 Australia/Sydney

Jira `IG-83` is Done with a claim comment (start) and a verification comment (completion, including the browser-verification evidence). Parent Story `IG-18` is In Progress with one remaining Subtask, `IG-84` (To Do). Jira remains authoritative; refresh live issue state before starting work in a later session — do not assume the next Subtask by number alone.

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
