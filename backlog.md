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
Subtask: IG-81 — Implement application and dependency health checks
```

Direct links:

- <https://appitometechnologies.atlassian.net/browse/IG-1>
- <https://appitometechnologies.atlassian.net/browse/IG-17>
- <https://appitometechnologies.atlassian.net/browse/IG-81>

## Next Task

`IG-16` (S04) is Done — both its Subtasks (`IG-79`, `IG-80`) are complete. Next Story is `IG-17 — Observe application health and failures` (S05), with two To Do Subtasks: `IG-81 — Implement application and dependency health checks` and `IG-82 — Implement structured error diagnostics`.

Before implementation:

1. Check `IG-81`'s live status/assignee/comments first — Codex may have picked it up.
2. Read `IG-81`, its parent `IG-17` and Epic `IG-1` in Jira for live criteria.
3. The existing `/api/v1/health` endpoint (`Program.cs`) is a placeholder that always returns `{"status":"healthy"}` regardless of actual state — "dependency health checks" almost certainly means it needs to actually check the database connection (`ApplicationDbContext`/Npgsql), not just liveness. `Microsoft.Extensions.Diagnostics.HealthChecks` + `AspNetCore.HealthChecks.NpgSql` is the conventional ASP.NET Core approach; check package cache/nuget.org availability before assuming a specific package name/version.
4. The local Postgres container (`docker compose -f infrastructure/docker/docker-compose.yml up -d`, host port 5433 — deliberately not 5432, see Blockers) will be needed to verify a real dependency health check actually detects both the healthy and unhealthy (DB down) cases.

## Last Execution

**Date:** 2026-08-21 Australia/Sydney

Completed:

- Implemented `IG-80 — Enforce automated quality gates` (T008, S04/`IG-16`), completing S04.
- Extended `.github/workflows/ci.yml`: added a `Test` step (`dotnet test`) to the `backend` job before `Publish Api`, and a `Lint` step (`npm run lint`) to the `frontend` job before `Build` — ordered so a failure stops the job before the artifact-producing step runs at all.
- **Found and fixed a real, previously-undetected bug** via this pipeline: `ModuleReferenceBoundaryTests` (from `IG-74`) parses `ProjectReference` paths with `Path.GetFileNameWithoutExtension`, which only treats `/` as a separator on non-Windows platforms — the `.csproj` files use Windows-style `\`. This passed on every Windows dev-machine run all session and failed for every single project the moment it ran on the Ubuntu GitHub Actions runner. Fixed in `ProjectFile.cs` by normalizing `\` to `/` first.
- Configured GitHub branch protection on `main` (`gh api .../branches/main/protection`) requiring both `Backend build` and `Frontend build` status checks (up to date with `main`) before a PR can merge, and disallowing force-push/deletion of `main` — confirmed with the user first, since it's a workflow-affecting decision, not just a YAML change.

Files changed or created:

- `.github/workflows/ci.yml` (Test/Lint steps added)
- `backend/tests/InvoiceApp.ArchitectureTests/ProjectFile.cs` (cross-platform path fix)
- `backend/README.md` (documented quality gates, the bug fix, and branch protection)
- GitHub repository setting: branch protection on `main` (not a file in the repo)
- `backlog.md`

Verification performed:

- Ran `dotnet test`/`npm run lint` locally first — both passed.
- **Proved the gate actually gates, not just "should" gate it**: deliberately broke a test assertion, ran the exact step chain locally (`dotnet test && dotnet publish`) — confirmed the chain stopped after the failing test and no `publish/` output was created.
- **Pushed and watched three real GitHub Actions runs**: (1) with the deliberate test break still in the CI-pushed commit, `Test` failed and `Publish Api`/artifact-upload were correctly skipped (run `32450591579`) — this is also where the real cross-platform bug above was discovered, independent of the deliberate break; (2) after fixing both the deliberate break and the real bug, a fully green run with both artifacts produced (run `32450714431`); (3) after the documentation commit, another fully green run (run `32451376565`).
- Verified branch protection is live: `gh api` response confirmed `required_status_checks.contexts = ["Backend build", "Frontend build"]`; the next direct push to `main` was met with GitHub's own message "Bypassed rule violations for refs/heads/main: 2 of 2 required status checks are expected" — confirming the rule exists and is evaluated (bypassed only because the push was made with admin/owner rights and `enforce_admins: false`).
- Did not touch the local Postgres container for this Subtask — not needed.

## Blockers and Open Decisions

No blocker is currently recorded for starting `IG-81`.

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

Jira `IG-16` is Done (closed with a comment recording acceptance-criteria verification). `IG-80` is Done with a claim comment (start) and a verification comment (completion, including all three CI run URLs and the branch-protection API confirmation as evidence). Next Story `IG-17` is To Do with two To Do Subtasks (`IG-81`, `IG-82`). Jira remains authoritative; refresh live issue state before starting work in a later session — do not assume the next Subtask by number alone.

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
