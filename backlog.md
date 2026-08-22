# Current Delivery Handoff

## Authority

Jira project `IG` is the authoritative delivery backlog. This file is a local handoff summary only; it does not replace Jira status, priority, assignment, hierarchy or acceptance criteria.

Requirements and architecture are authoritative under `docs/` as described in `AGENTS.md`.

## Current Project Status

**Phase:** Epic `IG-1` and Epic `IG-2` are both complete. Within Epic `IG-3` (Identity, Authentication and Account Security), Story `IG-22` (Register with email and password) is complete — the first real backend API endpoint in the project (`POST /api/v1/auth/register`) is live, tested, and verified against a real Postgres instance. `IG-3` has 5 Stories remaining: `IG-23` (Google sign-in — likely blocked, needs real OAuth credentials), `IG-24` (sign in/out — likely unblocked, builds directly on `IG-22`'s new cookie-auth infrastructure), `IG-25` (password recovery — likely blocked, needs an email-delivery provider), `IG-26` (secure session), `IG-27` (delete account).

**Open follow-up carried over from `IG-21`, not yet resolved:** the acquisition events built in `IG-89`/`IG-90` only reach a console sink so far — nothing durably captures them yet. See "Blockers and Open Decisions" below for the full note; revisit once an analytics provider is chosen so this doesn't get silently forgotten.

Product requirements, architecture and backlog planning remain available under `docs/` and Jira.

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

Continue Epic `IG-3`:

```text
Epic:    IG-3  — Identity, Authentication and Account Security
Story:   IG-24 — Sign in and sign out securely (tentative - confirm live status/order first)
Subtask: (check IG-24's live Subtasks before starting)
```

Direct links:

- <https://appitometechnologies.atlassian.net/browse/IG-3>
- <https://appitometechnologies.atlassian.net/browse/IG-24>

## Next Task

`IG-22` (S10, both Subtasks IG-91/IG-92) is Done. `IG-3` has 5 remaining Stories: `IG-23`, `IG-24`, `IG-25`, `IG-26`, `IG-27`.

Before implementation:

1. Check each remaining Story's Subtasks and their live status/assignee/comments first — Codex may have picked something up.
2. **`IG-23` (Google sign-in) is likely blocked** — needs a real Google Cloud OAuth client ID/secret, which can't be invented. Don't start it without asking the user first (`AskUserQuestion`), same pattern as the analytics-provider decision in `IG-89`/`IG-90`.
3. **`IG-24` (sign in and sign out) is likely the safe next pick** — it builds directly on `IG-22`'s new cookie-auth infrastructure (`IAuthSessionService`, `AddInfrastructureAuthentication`, the `IdentityConstants.ApplicationScheme` cookie scheme already wired in `Program.cs`). A login endpoint (`POST /api/v1/auth/login` per FSD §91) and logout (`POST /api/v1/auth/logout`) are natural extensions of what already exists — check FSD §8 (Login) for the exact fields/behavior (Email, Password, Remember Me) before implementing.
4. **`IG-25` (password recovery) is likely blocked** — needs an email-delivery provider, none chosen anywhere in `docs/`. Same pattern: ask before implementing real delivery.
5. `IG-26` (secure session) and `IG-27` (delete account) haven't been read in detail yet — check their live Jira descriptions before assuming scope.
6. Reuse the architecture pattern established in `IG-91`/`IG-92`: Application-layer interface + Infrastructure implementation + Modules.Identity validation/orchestration + Api Minimal API endpoint, tested against EF Core InMemory plus a real Postgres end-to-end check.

## Last Execution

**Date:** 2026-08-23 Australia/Sydney

Completed:

- Implemented `IG-91 — Implement email registration workflow` and `IG-92 — Test registration security and outcomes` (T019/T020, S10/`IG-22`) **together in a single commit**, per explicit user request. Both Subtasks Done; parent Story `IG-22` closed — the first Story completed in Epic `IG-3`.
- **The first real business API endpoint in the project**: `POST /api/v1/auth/register` (Minimal API — no controllers precedent existed yet). Established an architecture pattern intended for reuse by future backend features: `InvoiceApp.Application` defines use-case interfaces (`IAccountRegistrationService`, `IAuthSessionService`); `InvoiceApp.Infrastructure` implements them against `UserManager`/`SignInManager`/EF Core; `InvoiceApp.Modules.Identity` holds framework-free validation/orchestration (it's barred from referencing `Infrastructure` by the enforced module-boundary test); `InvoiceApp.Api` composes everything.
- Design choices grounded in docs, not invented: password rules from FSD §7.1 exactly (min 8, upper/lower/digit, explicitly no special-character requirement — Identity's own default requires one and had to be overridden); cookie-based auth (not JWT) per SAD §37's explicit preference for a browser-only first-party frontend; default business profile Country=AU/DefaultCurrency=AUD per PRD §23's "Australia can be an initial target market" framing.
- User + default business creation wrapped in one DB transaction, guarded by `Database.IsRelational()` so it still runs correctly under EF Core's InMemory provider in tests while getting real atomicity against Postgres.
- **Real gap found and fixed while wiring this up**: `SignInManager` requires `IHttpContextAccessor`, which nothing in the project had ever registered — would have thrown at first real use in production (DI doesn't validate constructor dependencies for services that are never resolved until a request needs them), not at startup. Fixed in `AddInfrastructureAuthentication`.
- Duplicate email and password-rule failures flow through the existing `ValidationException`/`ConflictException` → `GlobalExceptionHandler` pipeline from `IG-82`, so registration errors get the same `ProblemDetails` shape and correlation ID as every other endpoint.

Files changed or created:

- `backend/src/InvoiceApp.Application/Identity/{IAccountRegistrationService,IAuthSessionService,RegisterAccountRequest,RegisteredAccount}.cs` (new)
- `backend/src/InvoiceApp.Infrastructure/Authentication/{AccountRegistrationService,AuthSessionService,InfrastructureAuthenticationExtensions}.cs` (new)
- `backend/src/InvoiceApp.Modules.Identity/Registration/RegistrationRequestValidator.cs` (new — first real content in a previously-stub module project)
- `backend/src/InvoiceApp.Api/Endpoints/AuthEndpoints.cs` (new)
- `backend/src/InvoiceApp.Api/Program.cs` (wired `AddInfrastructureAuthentication`, `UseAuthentication`/`UseAuthorization`, `MapAuthEndpoints`)
- `backend/src/InvoiceApp.Infrastructure/InvoiceApp.Infrastructure.csproj` (added `FrameworkReference Microsoft.AspNetCore.App` — needed for cookie auth/`SignInManager`, not available via NuGet alone on a non-Web SDK project)
- `backend/src/InvoiceApp.Infrastructure/Persistence/PersistenceServiceCollectionExtensions.cs` (FSD password-rule configuration, `AddSignInManager`, `AddDefaultTokenProviders`)
- `backend/tests/InvoiceApp.Infrastructure.Tests/Authentication/{AccountRegistrationServiceTests,AuthSessionServiceTests,AuthenticationTestHarness}.cs` (new)
- `backend/tests/InvoiceApp.Infrastructure.Tests/Modules/Identity/Registration/RegistrationRequestValidatorTests.cs` (new)
- `backend/tests/InvoiceApp.Infrastructure.Tests/InvoiceApp.Infrastructure.Tests.csproj` (added `Microsoft.EntityFrameworkCore.InMemory`, test-only)
- `backlog.md`

Verification performed:

- 16 new automated tests against a real Identity + EF Core InMemory stack (not mocks — Identity's actual password/uniqueness validators genuinely run): successful registration creates exactly one user and one business; duplicate email rejected with zero partial state (asserted via row counts); each FSD password rule independently enforced; confirmed the *absence* of Identity's default special-character requirement actually took effect; confirm-password mismatch and malformed email rejected; sign-in authenticates the session; unknown user id fails safely.
- **Real end-to-end verification against a live Postgres instance** (not just tests, matching this project's established discipline): registered a real account via curl (200, `Set-Cookie` present), retried with the same email (409), weak password (400 listing which rules failed), mismatched confirm password (400) — then queried Postgres directly and confirmed exactly one row each in `identity.users`/`business.businesses`, correctly linked, with `Country=AU`/`DefaultCurrency=AUD` as designed, and that none of the three rejected attempts left any row. Cleaned up the test data afterward.
- Full solution build and test suite (44 tests: 14 architecture + 30 infrastructure) pass; pushed and watched a real GitHub Actions run to completion, both jobs green: <https://github.com/hassham/invoice-generator/actions/runs/32584330350>.

## Blockers and Open Decisions

**Architecture pattern established during `IG-91`/`IG-92`, reuse for future backend features:** Application defines use-case interfaces (`Application/{Module}/I{UseCase}Service.cs`), Infrastructure implements them against EF Core/Identity/whatever framework technology is needed, the relevant `Modules.*` project holds framework-free validation/orchestration, Api composes and exposes a Minimal API endpoint. Test against EF Core's InMemory provider (real Identity/EF behavior, no live DB needed in CI) plus a real Postgres end-to-end check performed manually by the agent (not wired into CI — see the CI-provider precedent from earlier Subtasks).

**`IHttpContextAccessor` must stay registered.** `AddInfrastructureAuthentication()` (`backend/src/InvoiceApp.Infrastructure/Authentication/InfrastructureAuthenticationExtensions.cs`) now calls `services.AddHttpContextAccessor()` because `SignInManager` requires it and nothing else in the project registers it. If this extension method is ever refactored, keep that call or `SignInManager` resolution will throw at first real use.

**Non-Web-SDK projects need an explicit `FrameworkReference` for ASP.NET Core types beyond what Identity's NuGet packages pull in.** `InvoiceApp.Infrastructure.csproj` uses plain `Microsoft.NET.Sdk` (not `Microsoft.NET.Sdk.Web`), so `Microsoft.AspNetCore.Authentication.Cookies`, `Microsoft.AspNetCore.Http`, and `SignInManager<TUser>` weren't available until `<FrameworkReference Include="Microsoft.AspNetCore.App" />` was added — the `Microsoft.AspNetCore.Identity.EntityFrameworkCore` NuGet package alone only covers `UserManager`/`ApplicationUser`-level types, not the full ASP.NET Core surface.

**Resolved during `IG-89`/`IG-90`, pattern to reuse:** no analytics provider was named in `docs/`; asked the user directly rather than inventing one, and built the instrumentation behind a pluggable sink so a real provider can be wired later without touching call sites. `frontend/lib/analytics/track.ts`'s `setAnalyticsSink()` is the swap point when one is chosen.

**`IG-21` is not truly end-to-end complete yet — open follow-up, do not lose track of this.** The events `IG-89`/`IG-90` built (`landing_page_view`, `invoice_editor_start`) currently only reach the default `ConsoleAnalyticsSink` — they are emitted correctly and safely, but nothing durably captures/stores them yet, so "acquisition activity can be measured" (`IG-21`'s Story-level acceptance criteria) isn't actually satisfiable in practice until a real sink is wired in. This needs its own follow-up once an analytics provider (or a self-hosted capture endpoint) is chosen — call `setAnalyticsSink()` with the real implementation, wire it near app startup, and add verification that events actually land in the chosen destination (not just that `track()` was called). Raise this explicitly with the user when Epic `IG-3`'s provider decisions come up, since it's the same class of "provider not yet chosen" gap — don't let it quietly stay as console-only.

**Expect the same class of decision repeatedly in Epic `IG-3`** (Identity, Authentication and Account Security): a Google OAuth client ID/secret for `IG-23`, and an email-delivery provider for `IG-25` (password recovery) — neither is named anywhere in `docs/`. Ask before implementing real delivery/OAuth; don't invent credentials or a provider.

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

**Last synchronized:** 2026-08-23 Australia/Sydney

`IG-91` and `IG-92` are both Done, each with a claim comment (start, including the design-decision notes) and a verification comment (completion, including both the automated-test and real-Postgres evidence). Parent Story `IG-22` is Done (both Subtasks complete) — closed with a summary comment. Epic `IG-3` has 5 remaining Stories (`IG-23`–`IG-27`), none started; `IG-23` and `IG-25` are expected to need a user decision (OAuth credentials, email provider) before they can be claimed. Jira remains authoritative; refresh live issue state before starting work in a later session — do not assume the next Subtask/Story by number alone.

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
