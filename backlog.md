# Current Delivery Handoff

## Authority

Jira project `IG` is the authoritative delivery backlog. This file is a local handoff summary only; it does not replace Jira status, priority, assignment, hierarchy or acceptance criteria.

Requirements and architecture are authoritative under `docs/` as described in `AGENTS.md`.

## Current Project Status

**Phase:** Construction started; modular application foundation is in place.

The initial frontend and backend solution structure has been implemented and builds successfully. Product requirements, architecture and backlog planning remain available under `docs/` and Jira.

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
Epic:    IG-1  — Platform Foundation and Delivery
Story:   IG-16 — Automate build and delivery validation
Subtask: IG-79 — Configure frontend and backend build pipelines
```

Direct links:

- <https://appitometechnologies.atlassian.net/browse/IG-1>
- <https://appitometechnologies.atlassian.net/browse/IG-16>
- <https://appitometechnologies.atlassian.net/browse/IG-79>

## Next Task

`IG-15` (S03) is Done — both its Subtasks (`IG-77`, `IG-78`) are complete. Next Story is `IG-16 — Automate build and delivery validation` (S04), with two To Do Subtasks: `IG-79 — Configure frontend and backend build pipelines` (T007) and `IG-80 — Enforce automated quality gates` (T008).

Before implementation:

1. Check `IG-79`'s live status/assignee/comments first — Codex may have picked it up.
2. Read `IG-79`, its parent `IG-16` and Epic `IG-1` in Jira for live criteria.
3. Re-read `docs/SAD.md`'s CI/CD-relevant sections (build pipeline, quality gates) before choosing a CI provider/config format — this is likely the first Subtask that touches deployment/provider choices, which `AGENTS.md` says should be resolved through their own Jira work rather than invented.
4. Note there is no git repository yet in this working directory (see Blockers) — a build pipeline conventionally lives in a CI config tied to a git host (e.g. `.github/workflows/`), so confirm whether repository initialization is a prerequisite before this Subtask can be meaningfully completed.

The local Postgres container (`docker compose -f infrastructure/docker/docker-compose.yml up -d`, host port 5433 — deliberately not 5432, see Blockers) is no longer needed until a future migration/persistence Subtask.

## Last Execution

**Date:** 2026-08-21 Australia/Sydney

Completed:

- Implemented `IG-78 — Add repeatable migration and seed verification` (T006, S03/`IG-15`), completing S03.
- **Fixed a design/implementation mismatch found while implementing this Subtask**: `docs/DATABASE_SCHEMA.md` (written during `IG-77`) documented `snake_case` columns, but the EF Core configurations never actually enforced that — columns defaulted to PascalCase (matching C# property names), only caught because a raw unquoted `psql` query for `template_code` failed with "column does not exist". Fixed by adding the `EFCore.NamingConventions` package and calling `.UseSnakeCaseNamingConvention()` in both `PersistenceServiceCollectionExtensions` and `ApplicationDbContextDesignTimeFactory`, then regenerating migrations from scratch. Documented the mechanism in `docs/DATABASE_SCHEMA.md` section 2.
- Seeded the three built-in invoice templates (`classic`, `modern`, `minimal`) via `HasData` on `TemplateConfiguration` — `document.templates` had zero rows after `IG-77`, but the Templates page (`docs/FSD.md` section 73) and `Business.DefaultTemplateId`/`Invoice.TemplateId` both assume at least one exists.
- Regenerated migrations in the correct order to produce a genuine two-step upgrade: `InitialCreate` (schema only, matching what `IG-77` actually delivered) then `SeedTemplates` (the `InsertData` for the three templates) — not one migration with everything baked in, so the "upgrade" path is real, not simulated.

Files changed or created:

- `docs/DATABASE_SCHEMA.md` (naming-convention mechanism documented in section 2; reference-data note added to section 9; `HasData` idempotency explanation added to section 12)
- `backend/README.md` ("Database" section extended with naming convention + seeding/idempotency verification)
- `backend/src/InvoiceApp.Infrastructure/InvoiceApp.Infrastructure.csproj` (added `EFCore.NamingConventions` 8.0.3)
- `backend/src/InvoiceApp.Infrastructure/Persistence/PersistenceServiceCollectionExtensions.cs` (`.UseSnakeCaseNamingConvention()`)
- `backend/src/InvoiceApp.Infrastructure/Persistence/ApplicationDbContextDesignTimeFactory.cs` (same, for design-time tooling)
- `backend/src/InvoiceApp.Infrastructure/Persistence/Configurations/TemplateConfiguration.cs` (`HasData` seed)
- `backend/src/InvoiceApp.Infrastructure/Persistence/Migrations/*` (regenerated: `InitialCreate` + `SeedTemplates`)
- `backlog.md`

Verification performed:

- `dotnet build backend/InvoiceApp.sln --configuration Release` — 0 warnings, 0 errors. `dotnet test` — 18/18 passed.
- Dropped the database, applied `InitialCreate` alone, confirmed `document.templates` had 0 rows (proves the seed isn't accidentally baked into the schema migration).
- Applied `SeedTemplates` as a genuine upgrade on top — confirmed exactly 3 rows with the correct data (`classic`/`modern`/`minimal`, correct `sort_order`).
- Reran `dotnet ef database update` a second time: EF Core reported "No migrations were applied. The database is already up to date," and the row count stayed at 3 — concrete proof of idempotency and no duplicate reference data, not just an assertion.
- Checked `__EFMigrationsHistory` directly: both migrations recorded exactly once.
- Real runtime check: ran the Api as Development against the fully migrated + seeded database — started cleanly, `GET /api/v1/health` returned `200`. Stopped the background process afterward.
- Did not re-run the frontend build/lint since no frontend files were touched in this execution.

## Blockers and Open Decisions

No blocker is currently recorded for starting `IG-79`.

`docs/DATABASE_SCHEMA.md` documents the intended design; always verify newly-generated migration SQL/column names actually match it before trusting the doc, per the naming-convention mismatch caught and fixed during `IG-78`.

**Resolved during `IG-77`, flagged to the user first:** the root `NuGet.Config` now has `nuget.org` as a real package source (previously `<clear />` with none). It was needed because `Microsoft.AspNetCore.Identity.EntityFrameworkCore` wasn't cached locally, and unlike EF Core's own packages, ASP.NET Core packages generally don't support running on an older .NET major than they're versioned for — so version 8.0.11 (matching the actual installed .NET 8 SDK) was used throughout the EF Core/Npgsql/Identity stack for consistency, restored fresh from nuget.org rather than mixing in the previously-cached 9.x EF Core packages.

**The invoicing app's Postgres runs on host port 5433, not 5432.** This machine already has an unrelated project's Postgres container (`meetingmind-postgres`) bound to 5432 — `infrastructure/docker/docker-compose.yml` deliberately avoids that port so it can never collide with or need to touch that container/data. Start it with `docker compose -f infrastructure/docker/docker-compose.yml up -d` before running migrations or the Api against a real database.

The `dotnet-ef` global tool is now installed at version 8.0.11 (matching the project's EF Core version) in this environment — a future session/environment without it will need `dotnet tool install --global dotnet-ef --version 8.0.11` before running migration commands.

The installed environment provides .NET SDK 8.0.300. Two approved attempts to install .NET 10 stalled, so the backend currently targets supported .NET 8 to retain a verified clean build. Upgrade the target to .NET 10 when that SDK is reliably available; do not represent the current target as .NET 10.

This directory is not currently a Git repository, so no Git status or commit history is available. Repository initialization should be explicitly handled before relying on source-control workflows.

Both Claude and Codex are authorized to work in this repository and Jira project concurrently but must not work the same Subtask at once. Before starting a Subtask, check its live Jira status/assignee/comments; claim it by transitioning To Do → In Progress with a short comment before beginning implementation.

Provider and deployment choices that are not needed for the current structural task should be resolved through their relevant Jira work before implementation depends on them. Do not invent credentials, production environments or provider contracts.

## Jira Synchronization

**Last synchronized:** 2026-08-21 Australia/Sydney

Jira `IG-15` is Done (closed with a comment recording acceptance-criteria verification). `IG-78` is Done with a claim comment (start) and a verification comment (completion). Next Story `IG-16` is To Do with two To Do Subtasks (`IG-79`, `IG-80`). Jira remains authoritative; refresh live issue state before starting work in a later session — do not assume the next Subtask by number alone.

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
