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
Story:   IG-17 — Observe application health and failures
Subtask: IG-82 — Implement structured error diagnostics
```

Direct links:

- <https://appitometechnologies.atlassian.net/browse/IG-1>
- <https://appitometechnologies.atlassian.net/browse/IG-17>
- <https://appitometechnologies.atlassian.net/browse/IG-82>

## Next Task

`IG-81` is Done. Next is `IG-82 — Implement structured error diagnostics`, the second and last Subtask under `IG-17`/S05.

Before implementation:

1. Check `IG-82`'s live status/assignee/comments first — Codex may have picked it up.
2. Read `IG-82`, its parent `IG-17` and Epic `IG-1` in Jira for live criteria.
3. `docs/SAD.md` section 81 (Error Handling) specifies a central exception-handling middleware mapping exception types to HTTP status codes (`ValidationException`→400, unauthenticated→401, forbidden→403, not-found→404, conflict→409, unexpected→500) and says not to expose internal stack traces in production. Section 78 (context: request/application-operation/logging/external-provider-calls) is about structured logging correlation, which is likely what "structured error diagnostics" actually means — read both before assuming scope.
4. No Domain-level exception types exist yet (no `ValidationException`, etc.) — this Subtask may need to define them, or may only need the middleware if error-throwing code doesn't exist yet either. Confirm scope doesn't silently pull in business-rule validation work that belongs to a later Invoicing/Payments Story.

## Last Execution

**Date:** 2026-08-21 Australia/Sydney

Completed:

- Implemented `IG-81 — Implement application and dependency health checks` (T009, S05/`IG-17`).
- Replaced the `IG-73` placeholder `GET /api/v1/health` with `GET /health/live` and `GET /health/ready`, per `docs/SAD.md` section 80. Liveness has no dependency checks; readiness runs a `"ready"`-tagged database connectivity check.
- Added `InvoiceApp.Infrastructure/HealthChecks/DatabaseHealthCheck.cs`: calls `Database.CanConnectAsync()`, classifies the result as `Unhealthy` (can't connect), `Degraded` (connects but takes >500ms), or `Healthy`. The decision logic (`Evaluate`) is a pure static method, unit-tested without needing a real database.
- Added `InvoiceApp.Api/HealthCheckResponseWriter.cs`: JSON response serializing only check name/status, deliberately never `Description`/`Exception`, so a failure can't leak a connection string or other detail through this endpoint regardless of what a future check's own description text says.

Files changed or created:

- `backend/src/InvoiceApp.Infrastructure/InvoiceApp.Infrastructure.csproj` (added `Microsoft.Extensions.Diagnostics.HealthChecks` 8.0.11)
- `backend/src/InvoiceApp.Infrastructure/HealthChecks/DatabaseHealthCheck.cs`
- `backend/src/InvoiceApp.Infrastructure/HealthChecks/InfrastructureHealthChecksExtensions.cs`
- `backend/src/InvoiceApp.Api/HealthCheckResponseWriter.cs`
- `backend/src/InvoiceApp.Api/Program.cs` (mapped `/health/live`, `/health/ready`; removed `/api/v1/health`)
- `backend/src/InvoiceApp.Api/InvoiceApp.Api.http` (updated from stale template content)
- `backend/tests/InvoiceApp.Infrastructure.Tests/HealthChecks/DatabaseHealthCheckTests.cs`
- `backend/README.md` (new "Health checks" section)
- `backlog.md`

Verification performed:

- `dotnet build`/`dotnet test` — 0 warnings, 24/24 tests passed (10 in `InvoiceApp.Infrastructure.Tests`, up from 4).
- **All three health states verified against the real local Postgres container, not simulated**: `/health/ready` returned `Degraded` on the very first request after app startup (cold connection-pool latency genuinely exceeded 500ms — not forced), then `Healthy` on every request after; `docker stop invoiceapp-postgres` made it return `Unhealthy` with HTTP 503; `/health/live` stayed `Healthy`/200 throughout, confirming liveness is actually independent of dependency health, not just structurally separate in the code. Restarted the container afterward.
- Pushed and watched a real GitHub Actions run to completion (both quality gates from `IG-80` passed): <https://github.com/hassham/invoice-generator/actions/runs/32455961812>.

## Blockers and Open Decisions

No blocker is currently recorded for starting `IG-82`.

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

Jira `IG-81` is Done with a claim comment (start) and a verification comment (completion). Parent Story `IG-17` is In Progress with one remaining Subtask, `IG-82` (To Do). Jira remains authoritative; refresh live issue state before starting work in a later session — do not assume the next Subtask by number alone.

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
