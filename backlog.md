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
Subtask: IG-83 — Build the responsive landing-page content
```

Direct links:

- <https://appitometechnologies.atlassian.net/browse/IG-2>
- <https://appitometechnologies.atlassian.net/browse/IG-18>
- <https://appitometechnologies.atlassian.net/browse/IG-83>

## Next Task

**Epic `IG-1` — Platform Foundation and Delivery — is complete.** All 5 Stories (`IG-13` through `IG-17`) and their 10 Subtasks are Done. The next Epic is `IG-2 — Public Website and Acquisition`, first Story `IG-18 — Discover the product from the landing page`, first Subtask `IG-83 — Build the responsive landing-page content`.

**This is a significant pivot, not a routine continuation** — flagged rather than started automatically:

1. Everything since `IG-73` has been backend/platform infrastructure with no real product UI. `IG-83` is the first genuinely frontend/product-content Subtask — it needs `docs/FSD.md` section 6 (Public Website) and `docs/PRD.md` for actual landing-page content/copy, not just architecture docs.
2. Check `IG-83`'s live status/assignee/comments first — Codex may have picked it up, and may be more likely to be working frontend/product Epics than backend infra ones.
3. Read `IG-83`, its parent `IG-18` and Epic `IG-2` in Jira for live criteria before starting.
4. The frontend (`frontend/app/`) is still the Next.js starter template (default `page.tsx`/`layout.tsx`, no real content) — this Subtask likely replaces it entirely.

## Last Execution

**Date:** 2026-08-21 Australia/Sydney

Completed:

- Implemented `IG-82 — Implement structured error diagnostics` (T010, S05/`IG-17`), completing S05 **and Epic `IG-1` in full**.
- Added `InvoiceApp.Application/Exceptions/{Validation,NotFound,Conflict}Exception.cs` — the first real content in the shared Application project beyond its assembly marker.
- Added `InvoiceApp.Api/Diagnostics/CorrelationIdMiddleware.cs`: uses `HttpContext.TraceIdentifier` as the correlation ID, echoes it in `X-Correlation-Id`, wraps the pipeline in a logging scope so every log statement carries it.
- Added `InvoiceApp.Api/Diagnostics/GlobalExceptionHandler.cs` (`IExceptionHandler`): maps the three typed exceptions above to 400/404/409 with their (client-safe) message; anything else maps to 500 with a generic message and no detail — an internal exception's message can never reach the client regardless of what it contains.
- **Found and fixed a real ordering bug via manual verification, not by reasoning about it**: `CorrelationIdMiddleware` must be registered *before* `UseExceptionHandler()`. With the opposite (initially chosen) order, an exception unwinds past and disposes the correlation logging scope before the handler runs, so its own log entry silently lost the `CorrelationId` enrichment. Caught by actually reading the console log output, not assumed correct from the code.

Files changed or created:

- `backend/src/InvoiceApp.Application/Exceptions/ValidationException.cs`, `NotFoundException.cs`, `ConflictException.cs`
- `backend/src/InvoiceApp.Api/Diagnostics/CorrelationIdMiddleware.cs`
- `backend/src/InvoiceApp.Api/Diagnostics/GlobalExceptionHandler.cs`
- `backend/src/InvoiceApp.Api/Program.cs` (logging scopes enabled, middleware wired in the correct order)
- `backend/tests/InvoiceApp.Infrastructure.Tests/InvoiceApp.Infrastructure.Tests.csproj` (added a ProjectReference to `InvoiceApp.Api` to test its diagnostics code)
- `backend/tests/InvoiceApp.Infrastructure.Tests/Diagnostics/GlobalExceptionHandlerTests.cs`
- `backend/README.md` (new "Error diagnostics" section)
- `backlog.md`

Verification performed:

- `dotnet build`/`dotnet test` — 0 warnings, 28/28 tests passed.
- **Real end-to-end runtime verification** using temporary endpoints (removed before committing): confirmed correct status/body for all three typed exceptions, and for a deliberately "sensitive-looking" unexpected exception (`Host=db.internal;Password=supersecret`) confirmed the client response had **no** `detail` field at all, while the server-side console log for that same request showed the full exception tagged with the identical `CorrelationId` as the response header/body — proving the correlation-to-logs link actually works, not just that the code compiles.
- Pushed and watched a real GitHub Actions run to completion: <https://github.com/hassham/invoice-generator/actions/runs/32458911833>.

## Blockers and Open Decisions

No blocker is currently recorded for starting `IG-83`.

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

Jira `IG-17` is Done. **Epic `IG-1` is Done** (all 5 Stories complete, closed with a comment recording acceptance-criteria verification). `IG-82` is Done with a claim comment (start) and a verification comment (completion). Next Epic `IG-2` is To Do; first Story `IG-18` is To Do with two To Do Subtasks (`IG-83`, `IG-84`). Jira remains authoritative; refresh live issue state before starting work in a later session — do not assume the next Subtask by number alone.

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
