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
Subtask: IG-80 — Enforce automated quality gates
```

Direct links:

- <https://appitometechnologies.atlassian.net/browse/IG-1>
- <https://appitometechnologies.atlassian.net/browse/IG-16>
- <https://appitometechnologies.atlassian.net/browse/IG-80>

## Next Task

`IG-79` is Done. Next is `IG-80 — Enforce automated quality gates` (T008), the second and last Subtask under `IG-16`/S04.

Before implementation:

1. Check `IG-80`'s live status/assignee/comments first — Codex may have picked it up.
2. Read `IG-80`, its parent `IG-16` and Epic `IG-1` in Jira for live criteria.
3. `IG-79` built `.github/workflows/ci.yml` with `backend`/`frontend` build jobs (restore, build, publish/build, upload artifact) deliberately scoped to *building*, not testing. `IG-80` most likely means: (a) add `dotnet test`/`npm run lint` (and `next build`'s own type-check, already implicit) as steps in those same jobs, and (b) configure the `main` branch as protected with those checks marked required in GitHub, so a failing check actually blocks merge — extend the existing workflow rather than creating a second one.
4. Branch protection (required status checks) is a GitHub repository *setting*, not a file in the repo — it has to be configured via `gh api`/the GitHub UI/`gh ruleset`, not just by editing YAML. Confirm this is in scope before skipping it.

The local Postgres container (`docker compose -f infrastructure/docker/docker-compose.yml up -d`, host port 5433 — deliberately not 5432, see Blockers) is not needed for `IG-80` unless test execution requires a live database.

## Last Execution

**Date:** 2026-08-21 Australia/Sydney

Completed:

- Initialized this directory as a git repository (it was not one before) and created a new public GitHub repository, **<https://github.com/hassham/invoice-generator>**, at the user's explicit direction ("we will be using github for pipelines"). Pushed the full platform-foundation snapshot (`IG-73` through `IG-78`) as the initial commit.
- Implemented `IG-79 — Configure frontend and backend build pipelines` (T007, S04/`IG-16`).
- Added `.github/workflows/ci.yml`: two parallel jobs on push/PR to `main` — `backend` (`dotnet restore`/`build`/`publish` for `InvoiceApp.Api`) and `frontend` (`npm ci`/`next build`) — each uploading its output as a workflow artifact. Deliberately scoped to build-only; test execution and required-check enforcement are `IG-80`'s job, to be layered onto these same jobs rather than a second workflow.
- Fixed the frontend artifact path bug caught during local verification: `next.config.ts` sets `distDir: "generated"`, so the build output is `frontend/generated`, not the Next.js default `frontend/.next` — using the wrong path would have silently uploaded nothing.
- Added `/publish/` to `.gitignore` (the local `dotnet publish` output directory used to test the same command the workflow runs).

Files changed or created:

- `.git/` (repository initialized), pushed to `https://github.com/hassham/invoice-generator`
- `.github/workflows/ci.yml`
- `.gitignore` (added `/publish/`)
- `README.md` (CI badge)
- `backend/README.md` (new "CI" section)
- `backlog.md`

Verification performed:

- Ran the exact backend commands locally first (`dotnet restore`/`build`/`publish`) and the exact frontend commands (`npm ci`/`npm run build`) — both succeeded before trusting the workflow.
- **Pushed and watched a real GitHub Actions run to completion** (`gh run watch`, run ID `32449842002`), not just written-and-assumed-correct YAML: both `Frontend build` (31s) and `Backend build` (37s) jobs passed every step, and `gh run view` confirmed both `backend-api` and `frontend-build` artifacts were actually produced — the literal wording of `IG-79`'s completion criteria, verified rather than asserted.
- Full run: <https://github.com/hassham/invoice-generator/actions/runs/32449842002>.

## Blockers and Open Decisions

No blocker is currently recorded for starting `IG-80`.

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

Jira `IG-79` is Done with a claim comment (start) and a verification comment (completion, including the live GitHub Actions run URL as evidence). Parent Story `IG-16` is In Progress with one remaining Subtask, `IG-80` (To Do). Jira remains authoritative; refresh live issue state before starting work in a later session — do not assume the next Subtask by number alone.

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
