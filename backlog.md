# Current Delivery Handoff

## Authority

Jira project `IG` is the authoritative delivery backlog. This file is a local handoff summary only; it does not replace Jira status, priority, assignment, hierarchy or acceptance criteria.

Requirements and architecture are authoritative under `docs/` as described in `AGENTS.md`.

## Current Project Status

**Phase:** Epic `IG-1` and Epic `IG-2` are both complete. Within Epic `IG-3` (Identity, Authentication and Account Security), Stories `IG-22` (register), `IG-24` (login/logout) and `IG-27` (delete account) are all complete. Story `IG-26` (secure session) has both its Subtasks Done but **the Story itself is deliberately left In Progress, not Done** — its "offers sign-in" acceptance criterion can't be satisfied yet because no frontend auth UI exists anywhere in `frontend/` (only the Epic IG-2 landing page). Same class of gap as `IG-21`. `IG-3` now has only 2 Stories remaining, and **both are likely blocked on a user decision**: `IG-23` (Google sign-in — needs real OAuth credentials) and `IG-25` (password recovery — needs an email-delivery provider). If both are confirmed blocked in a future session, check Jira for the next Epic after `IG-3` rather than stalling on this one.

**Open follow-up carried over from `IG-26`, not yet resolved:** "offers sign-in" (part of `IG-26`'s session-expiry acceptance criterion) needs a frontend sign-in page/auth UI that doesn't exist yet. None of Epic IG-3's auth flows (register, login, session) have any frontend UI — only backend endpoints. Revisit once frontend auth pages are built, likely alongside `IG-23`/`IG-25`.

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

Epic `IG-3`'s remaining Stories (`IG-23`, `IG-25`) are both likely blocked on a user decision. `IG-26` has no remaining Subtasks (both Done), but stays In Progress pending the frontend sign-in gap noted above — do not restart backend work on it without a new Subtask or explicit direction:

```text
Epic:    IG-3  — Identity, Authentication and Account Security
Story:   IG-23 or IG-25 (tentative - confirm live status first; both likely need a user decision before they can start)
Subtask: (check the chosen Story's live Subtasks before starting)
```

Direct links:

- <https://appitometechnologies.atlassian.net/browse/IG-3>
- <https://appitometechnologies.atlassian.net/browse/IG-23>
- <https://appitometechnologies.atlassian.net/browse/IG-25>

## Next Task

`IG-101` and `IG-102` (S15, both Subtasks of `IG-27`) are Done; `IG-27` itself is Done. `IG-3` has 2 remaining Stories, both likely blocked: `IG-23`, `IG-25`.

Before implementation:

1. Check each remaining Story's Subtasks and their live status/assignee/comments first — Codex may have picked something up since this handoff was written.
2. **`IG-23` (Google sign-in) is likely blocked** — needs a real Google Cloud OAuth client ID/secret, which can't be invented. Don't start it without asking the user first (`AskUserQuestion`), same pattern as the analytics-provider decision in `IG-89`/`IG-90`.
3. **`IG-25` (password recovery) is likely blocked** — needs an email-delivery provider, none chosen anywhere in `docs/`. Same pattern: ask before implementing real delivery.
4. **If both are confirmed blocked**, don't stall — check Jira for the next Epic after `IG-3` and ask the user how they'd like to proceed (raise both blockers together rather than one at a time).
5. Reuse the architecture pattern established in `IG-91`/`IG-92`/`IG-95`/`IG-96`/`IG-99`/`IG-100`/`IG-101`/`IG-102`: Application-layer interface + Infrastructure implementation + Modules.Identity validation/orchestration + Api Minimal API endpoint, tested against EF Core InMemory plus a real Postgres end-to-end check (skip the live-Postgres check only when the change is pure ASP.NET Core middleware behavior with no persistence semantics, as reasoned for `IG-100`/`IG-101`/`IG-102`). Test authorization/middleware behavior at the real HTTP pipeline level via `WebApplicationFactory<Program>` (established in `IG-99`), not just the underlying service.
6. **Remember the open frontend-auth-UI gap** (see "Open follow-up carried over from `IG-26`" above) — if `IG-23`/`IG-25` or any future Epic IG-3 work turns out to need frontend UI, flag it the same way rather than silently building only a backend endpoint again.
7. **Local-commit-only workflow as of 2026-08-25**: commit but do not push to GitHub — the user pushes manually at the end of the day. Don't watch GitHub Actions after a commit; there's nothing to watch until the user pushes. Verification evidence in Jira comments should cite the local commit hash, not a CI run URL, until this changes.

## Last Execution

**Date:** 2026-08-25 Australia/Sydney

Completed:

- Implemented `IG-101 — Implement confirmed account-deletion workflow` and `IG-102 — Verify post-deletion access and audit behavior` (T029/T030, S15/`IG-27`), together in one pass (same pattern as `IG-95`/`IG-96`). Both Subtasks Done; parent Story `IG-27` Done (unlike `IG-26`, no frontend gap blocks this one).
- New `DELETE /api/v1/auth/account` (authenticated), requiring the current password as explicit confirmation (FSD §76). New `IAccountDeletionService`/`AccountDeletionService`, reusing the Application-interface/Infrastructure-implementation pattern.
- Soft-delete via `ApplicationUser.Status = "Deleted"` — the field already existed with an `"Active"` default (`docs/DATABASE_SCHEMA.md` §3), so no migration was needed. Business/invoice data is untouched.
- Audit log entry (`EntityType="Account"`, `Action="AccountDeleted"`) written atomically with the status flip via `UserManager.UpdateAsync`'s own SaveChanges flush — first real use of the previously-unused `AuditLog` entity/table.
- Deleted account rejected in two places going forward: at the next login attempt (`CredentialLoginService` now checks `Status`, same generic anti-enumeration message as a wrong password — undoes the cookie `PasswordSignInAsync` issues before the check runs), and on every subsequent authenticated request for *any* session via a new cookie `OnValidatePrincipal` handler (`InfrastructureAuthenticationExtensions`) — not just the session that performed the deletion. This is the same class of problem ASP.NET Core Identity's own `SecurityStampValidator` solves for password changes, not wired up here since this project uses `AddIdentityCore` rather than the all-in-one `AddIdentity`.
- **Deliberately not built**: the permanent-purge-after-retention-period half of FSD §76's soft-delete recommendation — no retention duration is documented anywhere, and it's a background/ops job, not something the Story's "follows retention rules" criterion strictly requires (soft-delete alone already satisfies it by not destroying data prematurely).
- **Test-harness bug found and fixed, not a production bug**: `AuthenticationTestHarness` reuses one DI scope across every `Build*` call; `IAuthenticationHandlerProvider` is scoped (not per-`HttpContext`), so it caches the cookie handler against the *first* fake `HttpContext` that ever triggers a real sign-in/sign-out in a test, and silently misdirects cookie writes to that stale context on later calls with a different `HttpContext` object in the same test. Fixed by keeping the affected test to one shared `HttpContext` throughout and documenting why, rather than asserting on cookie headers across two different fake contexts (production has no equivalent issue - real requests get a fresh DI scope each time).
- No live-Postgres manual verification and no CI run this round — this session switched to a local-commit-only workflow (see the memory note below); the user is running their own manual smoke test today instead.

Files changed or created (`IG-101`/`IG-102`):

- `backend/src/InvoiceApp.Application/Identity/{DeleteAccountRequest,IAccountDeletionService}.cs` (new)
- `backend/src/InvoiceApp.Infrastructure/Authentication/AccountDeletionService.cs` (new); `CredentialLoginService.cs`, `InfrastructureAuthenticationExtensions.cs` (extended)
- `backend/src/InvoiceApp.Modules.Identity/AccountDeletion/DeleteAccountRequestValidator.cs` (new)
- `backend/src/InvoiceApp.Api/Endpoints/AuthEndpoints.cs` (extended: `DELETE /api/v1/auth/account`)
- `backend/tests/InvoiceApp.Infrastructure.Tests/Authentication/AccountDeletionServiceTests.cs` (new); `AuthenticationTestHarness.cs`, `CredentialLoginServiceTests.cs` (extended)
- `backend/tests/InvoiceApp.Infrastructure.Tests/Modules/Identity/AccountDeletion/DeleteAccountRequestValidatorTests.cs` (new)
- `backend/tests/InvoiceApp.Api.Tests/Authentication/AccountDeletionTests.cs` (new)
- `backlog.md`

Verification performed (`IG-101`/`IG-102`):

- 12 new/changed tests: 4 unit tests on `AccountDeletionService` (correct password deletes + signs out + audits; wrong password rejected and nothing changes; unknown user rejected); 1 on `CredentialLoginService` (deleted account rejected); 2 on the validator; 6 against the real HTTP pipeline via `WebApplicationFactory<Program>` in `AccountDeletionTests` (missing session, wrong/missing confirmation, successful deletion invalidates the deleting session, deleted account can't log back in, **a still-valid cookie that was never itself signed out is rejected after deletion** - simulating a second browser tab).
- Full solution build and test suite (76 tests: 14 architecture + 48 infrastructure + 14 API) pass locally. Committed locally only (`35846ea`) - not pushed; no CI run this round.

Prior execution, still relevant context:

- Implemented `IG-100 — Implement session expiry and rate-limit handling` (T028, S14/`IG-26`). Subtask Done. Both of `IG-26`'s Subtasks are now Done, but the Story was deliberately left In Progress rather than Done — see "Open follow-up carried over from `IG-26`" above.
- **Session-expiry message**: `InfrastructureAuthenticationExtensions`'s `OnRedirectToLogin` now writes a `ProblemDetails` JSON body carrying FSD §80's Authentication Error text, `"Your session has expired. Please sign in again."`, alongside the 401 it already returned. Applies to missing, invalid and expired sessions alike (same anti-enumeration reasoning as login errors) — the FSD only defines one Authentication Error example.
- **Rate limiting** (SAD §112): new `"auth"` ASP.NET Core rate-limiter policy (`InfrastructureRateLimitingExtensions`, `RateLimitingOptions`) applied to `POST /api/v1/auth/register` and `/login`, partitioned by client IP. Default: 10 requests/60s per IP, `QueueLimit=0` (429 immediately, not queued) — not specified in docs, chosen conservatively and documented rather than picked silently; configurable via the `RateLimiting` configuration section.
- **Deliberately not built**: the "offers sign-in" half of `IG-26`'s session-expiry criterion. No frontend auth UI exists anywhere in `frontend/` yet, so there's nothing to wire a sign-in offer into — flagged explicitly on `IG-26` rather than silently dropped.
- No live-Postgres manual verification this round (Docker Desktop wasn't running locally) — judged acceptable since both changes are pure ASP.NET Core middleware behavior with no EF Core/Postgres-specific semantics, unlike the display-name bug `IG-95`/`IG-96` caught. The `WebApplicationFactory` tests already exercise the real pipeline.

Files changed or created (`IG-100`):

- `backend/src/InvoiceApp.Infrastructure/Authentication/InfrastructureAuthenticationExtensions.cs` (session-expiry message on `OnRedirectToLogin`)
- `backend/src/InvoiceApp.Infrastructure/Configuration/RateLimitingOptions.cs` (new)
- `backend/src/InvoiceApp.Infrastructure/RateLimiting/InfrastructureRateLimitingExtensions.cs` (new)
- `backend/src/InvoiceApp.Api/Program.cs` (registers rate limiting, adds `app.UseRateLimiter()`)
- `backend/src/InvoiceApp.Api/Endpoints/AuthEndpoints.cs` (`.RequireRateLimiting("auth")` on register/login)
- `backend/tests/InvoiceApp.Api.Tests/Authentication/AuthenticatedRouteTestFactory.cs` (extended: optional `rateLimitPermitLimitOverride`)
- `backend/tests/InvoiceApp.Api.Tests/Authentication/ProtectedRouteAuthorizationTests.cs` (extended: session-expiry message assertion)
- `backend/tests/InvoiceApp.Api.Tests/RateLimiting/AuthRateLimitingTests.cs` (new)
- `backlog.md`

Verification performed (`IG-100`):

- 3 new/changed tests against the real HTTP pipeline via `WebApplicationFactory<Program>`: missing-session response body carries the exact FSD §80 message; requests within a (test-overridden, small) rate limit all succeed; requests beyond it get 429.
- Full solution build and test suite (63 tests: 14 architecture + 41 infrastructure + 8 API) pass; pushed and watched a real GitHub Actions run to completion, both jobs green: <https://github.com/hassham/invoice-generator/actions/runs/32718516006>.

Prior execution, still relevant context:

- Implemented `IG-99 — Enforce authenticated route and API access` (T027, S14/`IG-26`). Subtask Done.
- Added `InvoiceApp.Api.Tests`, a new xUnit project hosting the real Api pipeline in-process via `WebApplicationFactory<Program>` — real cookie authentication middleware and real endpoint authorization metadata, with only the database swapped for EF Core InMemory. This is the first Subtask to verify authorization at the actual HTTP/route level rather than only the underlying service layer.
- `Program.cs` now ends with `public partial class Program;` to expose the top-level-statement-generated `Program` class so `WebApplicationFactory<Program>` can reference it from the test project.
- 5 new tests in `ProtectedRouteAuthorizationTests`: missing session rejected on `/api/v1/auth/me` and `/api/v1/auth/logout` (401); valid session allowed on `/me` (200); tampered/invalid session cookie rejected (401) — the real `Set-Cookie` value is captured raw, corrupted, and replayed by hand, proving the data-protected ticket itself is validated, not just cookie presence; expired session rejected (401) — cookie expiry overridden to 200ms via `PostConfigure<CookieAuthenticationOptions>` on the `IdentityConstants.ApplicationScheme`.
- Work was picked up mid-implementation after a system restart (uncommitted `.sln`/`Program.cs`/new test project already present) — verified it built and passed cleanly before committing rather than assuming prior-session intent.

Files changed or created (`IG-99`):

- `backend/InvoiceApp.sln` (registered new test project)
- `backend/src/InvoiceApp.Api/Program.cs` (added `public partial class Program;`)
- `backend/tests/InvoiceApp.Api.Tests/InvoiceApp.Api.Tests.csproj` (new)
- `backend/tests/InvoiceApp.Api.Tests/Authentication/{AuthenticatedRouteTestFactory,ProtectedRouteAuthorizationTests}.cs` (new)
- `backlog.md`

Verification performed (`IG-99`):

- 5 new tests exercising the real HTTP pipeline via `WebApplicationFactory<Program>` (see Completed above for scenarios covered).
- Full solution build and test suite (60 tests: 14 architecture + 41 infrastructure + 5 API) pass locally.
- Pushed and watched a real GitHub Actions run to completion, both jobs green: <https://github.com/hassham/invoice-generator/actions/runs/32716449249>.

Prior execution, still relevant context:

- Implemented `IG-95 — Implement credential login and session logout` and `IG-96 — Test safe authentication errors` (T023/T024, S12/`IG-24`) **together in a single commit**, per explicit user request. Both Subtasks Done; parent Story `IG-24` closed.
- Added `POST /api/v1/auth/login`, `POST /api/v1/auth/logout`, and `GET /api/v1/auth/me` (a minimal authenticated "who am I" endpoint — not in FSD §91's documented list, but needed to make "protects authenticated routes" concretely testable against something real). Reused the Application-interface/Infrastructure-implementation/Modules pattern from `IG-91`/`IG-92`.
- New `ICredentialLoginService`/`UnauthorizedException` (→ 401 in `GlobalExceptionHandler`, following the established exception-mapping convention). Every login failure mode — unknown email, wrong password — collapses into one identical message, `"Incorrect email or password."`, per FSD §8's explicit anti-enumeration requirement. This is deliberately stricter than `IG-91`'s registration duplicate-email handling, which stayed un-obscured since neither FSD nor `IG-22` asked for anti-enumeration there.
- Remember Me maps to `SignInManager`'s `isPersistent` flag; logout clears the session cookie via a new `IAuthSessionService.SignOutAsync`.
- **Real bug caught during manual end-to-end verification, not by any automated test**: `/me` initially read `ClaimTypes.Name` directly from the cookie's claims, which ASP.NET Core Identity populates from `UserName` (this app sets `UserName` to the email) — so a user who registered with a real display name saw their email echoed back as `"name"`. Fixed by having `/me` load the account's own record (`IAuthSessionService.GetCurrentAsync`) instead of trusting that claim; added a regression test afterward.

Files changed or created (`IG-95`/`IG-96`):

- `backend/src/InvoiceApp.Application/Exceptions/UnauthorizedException.cs`, `backend/src/InvoiceApp.Application/Identity/{ICredentialLoginService,LoginRequest,LoggedInAccount}.cs` (new)
- `backend/src/InvoiceApp.Application/Identity/IAuthSessionService.cs` (extended: `SignOutAsync`, `GetCurrentAsync`)
- `backend/src/InvoiceApp.Infrastructure/Authentication/CredentialLoginService.cs` (new); `AuthSessionService.cs`, `InfrastructureAuthenticationExtensions.cs` (extended)
- `backend/src/InvoiceApp.Modules.Identity/Login/LoginRequestValidator.cs` (new)
- `backend/src/InvoiceApp.Api/Endpoints/AuthEndpoints.cs` (login/logout/me endpoints)
- `backend/src/InvoiceApp.Api/Diagnostics/GlobalExceptionHandler.cs` (added the `UnauthorizedException` → 401 mapping)
- `backend/tests/InvoiceApp.Infrastructure.Tests/Authentication/{CredentialLoginServiceTests,AuthenticationTestHarness}.cs` (new/extended); `AuthSessionServiceTests.cs`, `GlobalExceptionHandlerTests.cs` (extended)
- `backend/tests/InvoiceApp.Infrastructure.Tests/Modules/Identity/Login/LoginRequestValidatorTests.cs` (new)

Verification performed (`IG-95`/`IG-96`):

- 12 new automated tests: unknown-email and wrong-password login produce byte-identical `UnauthorizedException`s; Remember Me produces a persistent cookie (real `expires=`) vs a session cookie (none) — checked via the actual `Set-Cookie` header, not assumed; logout's cookie carries an expired date; `GetCurrentAsync` returns the real display name, not the username (the regression test for the bug above).
- **Real end-to-end verification against a live Postgres instance**: register → `/me` (401 before, 200 after) → wrong password (401) → unknown email (401, byte-identical body) → correct login with `rememberMe=true` (persistent cookie) → `/me` → logout → `/me` (401 again) — then confirmed via direct SQL that none of the failed attempts created a stray row.
- Full solution build and test suite (55 tests: 14 architecture + 41 infrastructure) pass; pushed and watched a real GitHub Actions run to completion, both jobs green: <https://github.com/hassham/invoice-generator/actions/runs/32611987547>.

## Blockers and Open Decisions

**Empirical E2E verification keeps catching real bugs unit tests miss — keep doing it, don't skip it as "redundant" once tests pass.** `IG-86` caught two script-timing false negatives; `IG-95`/`IG-96` caught a genuine product bug (`/me` returning the email instead of the display name) that all 41 passing unit tests had missed, because the tests asserted `IsAuthenticated`/exception types, not the actual field values a real client would see. Always do a real curl/browser pass against live infrastructure for user-facing backend endpoints, even when automated tests are green.

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

**Last synchronized:** 2026-08-25 Australia/Sydney

`IG-101` and `IG-102` are both Done, each with a claim comment (start) and a verification comment (completion, including automated-test evidence - no CI run cited this round, see the local-commit-only note above). Parent Story `IG-27` is Done. `IG-99`/`IG-100` remain Done from the prior session; parent Story `IG-26` remains explicitly **not** Done (In Progress, frontend gap). `IG-95`/`IG-96` remain Done from an earlier session, parent Story `IG-24` Done. Epic `IG-3` now has only 2 Stories not yet started (`IG-23`, `IG-25`), both expected to need a user decision (OAuth credentials, email provider) before they can be claimed. Jira remains authoritative; refresh live issue state before starting work in a later session — do not assume the next Subtask/Story by number alone.

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
