# Current Delivery Handoff

## Authority

Jira project `IG` is the authoritative delivery backlog. This file is a local handoff summary only; it does not replace Jira status, priority, assignment, hierarchy or acceptance criteria.

Requirements and architecture are authoritative under `docs/` as described in `AGENTS.md`.

## Current Project Status

**Synced 2026-09-09 (no new commit - this update is Jira-only).** This section (and "Current Focus"/"Next Task" below) is kept current against Jira as work lands — prior versions of this doc had drifted roughly 26 commits and 5 Epics behind actual `HEAD` as of 2026-09-03; treat everything below as authoritative, not the older narrative it replaced (still preserved in "Last Execution" history further down).

**Every single issue in Jira project `IG` is Done as of 2026-09-09 - confirmed by a fresh `project = IG AND status != Done` query returning zero results.** Epics `IG-1` through `IG-12` (all 12) closed with `IG-72` ("Meet operational performance and release quality targets" - every FSD performance target verified with 10-100x margin, full launch-readiness report at `qa-reports/2026-09-09-launch-readiness.md`); the 4 regression-found bugs (`IG-194`-`IG-197`) are all fixed (see "Prior execution" below). **Everything from here (including the SMTP email work in "Last Execution" just below) is new scope beyond the tracked backlog - the user delegated "what to do next" rather than naming a specific Jira issue, so none of it has its own Jira issue yet.**

**Second Jira reconciliation performed 2026-09-09** (the user spotted this directly via Jira's own List view, not found by an audit this time): 8 Subtasks under `IG-11`'s 4 Stories (`IG-175`-`IG-182`, under `IG-64`-`IG-67`) were still sitting at To Do despite their parent Stories (and the whole Epic) being Done - the same class of gap as the 2026-09-03 reconciliation below, just missed when `IG-11` itself was closed earlier this session. Confirmed each Subtask's own summary described work genuinely completed and verified as part of `IG-11` (cited the specific test/code evidence per-Subtask in Jira comments), got the user's explicit confirmation, then transitioned all 8 to Done. A project-wide re-query afterward confirmed zero non-Done issues remain anywhere in `IG`.

**First Jira reconciliation performed 2026-09-03**: an audit flagged that 38 Subtasks across all 19 then-Done Stories (spanning both this session's own work and earlier work done under the name "Codex") were still sitting at To Do despite their parent Stories being Done and their own summaries ("Implement X" / "Verify Y") describing work that was genuinely completed and verified as part of delivering those Stories. All 38 were confirmed against the actual Jira data and transitioned to Done — see git/Jira history around 2026-09-03 for the full list.

**Also resolved 2026-09-03, same audit**: a real `next build` failure (`useSearchParams()` without a Suspense boundary on `/documents/invoices`, never caught because `next build` had never actually been run this session despite several prior commits) and a genuine frontend test-suite flakiness root cause (a second unprotected `vi.useFakeTimers()`/`vi.useRealTimers()` pair in `CreateInvoiceEditor.test.tsx` that could leak fake timers into later tests in the same file if an assertion threw first) were both fixed at the root cause, not papered over. `vitest.config.ts`'s `testTimeout` was empirically re-measured (not just bumped again) and settled at 10000ms, down from the prior 15000ms — see that file's own comment for the measurement methodology if it ever needs revisiting.

Product requirements, architecture and backlog planning remain available under `docs/` and Jira.

Jira backlog created and verified:

- Epics: `IG-1` through `IG-12` — 12 total
- Stories: `IG-13` through `IG-72` — 60 total
- Subtasks: `IG-73` through `IG-192`, plus later additions through `IG-174` — 120+ total
- All Stories have Epic parents.
- All Subtasks have Story parents.
- Created issues were configured as Highest priority and Unassigned.
- Epic dependency links were created using Jira's Blocks relationship.

Jira project: <https://appitometechnologies.atlassian.net/jira/software/projects/IG>

## Current Focus

**Nothing is currently open.** The tracked MVP backlog (all 12 Epics) and every bug found across this session's regression/compatibility/accessibility passes are Done; real SMTP password-reset email delivery (untracked new scope, see "Last Execution") is also done, tested, and committed. Whoever picks this file up next needs a fresh instruction from the user - there is no default "next item" to assume.

## Next Task

**Ask the user what they want next** - new feature work, a fresh regression/audit pass, addressing something in `qa-reports/2026-09-09-launch-readiness.md`'s "accepted residual risks" section (real mobile/Safari device testing, screen-reader verification, load/concurrency testing), filing a Jira issue retroactively for the SMTP email work, or something else entirely. Don't assume.

Standing notes that still apply:

1. **Standing four-command verification gate, use before every push**: `cd backend && dotnet test`, `cd frontend && npx eslint .`, `npm test -- --run`, `npm run build`. All four must be clean — `next build` was skipped for several prior Stories and let a real production-build failure ship unnoticed (fixed 2026-09-03); don't repeat that.
2. **Local-commit-only workflow, unchanged**: commit but do not push to GitHub — the user pushes manually. Verification evidence in Jira comments should cite the local commit hash, not a CI run URL, unless a push just happened.
3. **Google OAuth credentials are configured locally** (`dotnet user-secrets`, `Authentication:Google:ClientId`/`ClientSecret`, in `InvoiceApp.Api`'s user-secrets store, ID `1bb70798-d419-459c-9213-a684a846ba1a`) — not committed, never will be (see `backend/README.md`'s Secrets section). Used to verify `IG-196`'s fix (the real `client_id` shows up in the live redirect).
4. **Password-reset email delivery now supports real SMTP** (`SmtpPasswordResetEmailSender`, added this execution) alongside the original dev-only `LoggingPasswordResetEmailSender` stub - `AddInfrastructureAuthentication` picks whichever based on whether `Email:Host` is configured, so every environment without real credentials keeps behaving exactly as before. `IG-195`'s `/reset-password` page still keeps `email`/`token` editable rather than fully hidden - now that a real link is sent, this is a deliberate defensive default (a user who edits/loses the link, or copies just the token from an email client that mangles the URL, can still complete the flow) rather than a gap to close.
5. **A real Postgres-backed test path exists** (`backend/tests/InvoiceApp.Infrastructure.Tests/Businesses/PostgresAvailabilityFixture.cs`, added for `IG-46`), reusing the existing `invoiceapp-postgres` docker container (port 5433) rather than Testcontainers. Reuse this fixture rather than building a parallel one if a future Story needs real-database behavior the InMemory provider can't prove.
6. **Real server-side file storage exists** (`IBusinessLogoStorage`/`BusinessLogoStorage`, local disk under `App_Data/business-logos`, added for `IG-52`) - the first (and so far only) file storage in this app. Reuse the same pattern if a future Story needs file storage again.
7. **Keep `CreateInvoiceEditor.tsx` changes narrowly scoped if touching it at all** — the file is already 1,000+ lines with 16 extracted components and 15 extracted lib modules and its own comments explicitly reject a bigger rewrite as disproportionate. `IG-194`'s own fix (done) was a single small change inside one existing handler - the same discipline applies to any future change here.
8. **When testing in a real browser, remember the auth rate limiter is real** (10 requests/60s/IP on `/api/v1/auth/register` and `/login`) - confirmed genuinely firing during the 2026-09-07/08 regression pass under rapid automated testing. Space out repeated register/login calls in any future browser-driven verification script, or expect 429s.
9. **Real Firefox and WebKit engines are now cached locally** (`ms-playwright/firefox-1543`, `ms-playwright/webkit-2359`, downloaded for `IG-68`) alongside the pre-existing pinned Chromium (`ms-playwright/chromium-1234`) - reuse these for any future cross-browser verification rather than re-downloading. **WebKit-specific Playwright quirk found**: `.fill()` doesn't reliably trigger this app's React `onChange` handlers under this WebKit build (the DOM value sets but React state doesn't update, so a submitted form sends stale/empty values) - use `.click()` then `.pressSequentially()` (real keystroke simulation) instead when driving WebKit. Chromium/Firefox aren't affected.
10. **`SiteHeader`'s authenticated desktop nav now switches on at the `xl` breakpoint (1280px), not `md` (768px)** (fixed in `IG-68`, see commit `b3ccb22`) - if adding more authenticated nav items in the future, re-measure the required content width (was ~1104px for 8 links + account email + Log out) rather than assuming `xl` has unlimited headroom.
11. **Any future modal must trap Tab/Shift+Tab within its own focusable elements** (fixed in `IG-69` for `ConfirmDialog`/`AccountGateModal`, see commit `685af58`) - the pattern (query focusable descendants, wrap at the first/last on Tab/Shift+Tab) is duplicated inline in both components rather than a shared hook, matching this codebase's existing convention of duplicating small per-component effect logic (e.g. each dialog's own Escape handler) rather than extracting one. Copy the same block into any new modal.
12. **A custom dropdown/autocomplete must never close on blur without checking `event.relatedTarget`** (fixed in `IG-69` for `CustomerPicker`/`ItemPicker`) - a plain `onBlur` + `setTimeout` closes the list out from under a keyboard user the moment Tab moves focus onto one of its own option buttons. Check the list wrapper's own `contains(relatedTarget)` instead, and wire dropdown options to `onClick` (fires for both mouse and keyboard activation), not `onMouseDown` alone.
13. **Rate limiting now covers the 4 auth endpoints plus PDF generation**, all sharing `RateLimitingOptions.AuthPolicyName` (fixed in `IG-71`, see commit `8125484`) - the policy is partitioned by IP only, not by endpoint, so a client's auth attempts and PDF-generation attempts share one combined budget per IP. This was a deliberate, pre-existing design choice (the options class's own doc comment anticipated exactly this), not something introduced casually - keep it in mind if a future endpoint's traffic pattern makes that sharing too aggressive.
14. **`GlobalExceptionHandler` now logs the acting user's id (or "anonymous") alongside every rejected request** (400/401/404/409, added in `IG-70`) - if adding a new exception type to its `Map` switch, no extra work is needed, the user-id logging wraps all of them uniformly.
15. **File-upload security (business logo) was audited in `IG-71` and found already fully compliant** with FSD section 87/89 (MIME whitelist, magic-byte signature check, server-generated filename, no static-file middleware anywhere in the app, Guid-constrained safe URL) - no changes were needed. If a future Story adds a second upload surface, mirror `BusinessLogoValidator`/`BusinessLogoStorage`'s exact approach rather than inventing a new one.
16. **Every request (success and failure) is now logged** via ASP.NET Core's `HttpLogging` middleware (added in `IG-72`), scoped to method/path/status/duration only. If adding a new log-level override to `appsettings*.json`, remember the app's blanket `Microsoft.AspNetCore: Warning` default suppresses anything under that prefix unless a more specific override (like `Microsoft.AspNetCore.HttpLogging: Information`) is added too - this cost real debugging time to discover the first time.
17. **The frontend's own origin is now a backend config value** (`Frontend:BaseUrl` in `appsettings.json`, defaulting to `http://localhost:3000`, added in `IG-196` for the Google OAuth callback's redirect target) - CORS's own allowed-origins list in `Program.cs` is still a separate hardcoded string, not yet consolidated onto this same value (left alone to keep `IG-196`'s fix narrowly scoped) - worth unifying if a production frontend URL is ever configured, so the two can't drift apart.
18. **A server-side OAuth redirect can never read the frontend's own localStorage** (confirmed while fixing `IG-196`) - `GoogleCallbackAsync`'s 302 redirect lands on a small frontend page (`/auth/google/callback`) that resolves the actual pending-gate-action destination client-side instead, mirroring `LoginForm`'s own post-login redirect logic. Any future server-initiated redirect that needs to honor localStorage-backed state will need the same two-hop pattern.
19. **Every FSD performance target was verified with 10-100x margin** (`IG-72`) - API endpoints (<500ms target) even at 150 seeded invoices/30 customers, PDF generation (<3s), dashboard initial render against a **production** frontend build (<2s), invoice editor preview (near-instant). No performance remediation was needed anywhere. Full numbers in `qa-reports/2026-09-09-launch-readiness.md` - reuse that methodology (seed representative data, use a production frontend build, measure steady-state not just the first cold call) if performance is ever re-verified.
20. **PDFs generated from the Invoice Detail Page never include the business's saved logo** (`logo: null` in `buildInvoicePdfPayloadFromEditable`, `IG-197`) - a deliberate scope boundary, not a bug: the anonymous creation flow's own PDF generation only ever includes a logo manually attached within that same session too, never an account's persisted logo (`BusinessProfileDto.LogoUrl`) automatically. Wiring that up (fetch the logo, convert to the base64 data-URL `InvoicePdfRequest.Logo` expects) would be a real, separate enhancement if ever wanted.
21. **When closing a Story or Epic, transition its own Subtasks too, not just the Story/Epic itself** - `IG-11`'s 4 Stories and the Epic were correctly closed earlier this session, but the 8 Subtasks underneath them (`IG-175`-`IG-182`) were missed and sat at To Do until the user spotted them directly in Jira's List view 2026-09-09 (see the second reconciliation note in "Current Project Status" above). Double-check subtask status specifically when marking a parent Done, not just the parent's own transition.

## Last Execution

**Date:** 2026-09-09 (the latest one)

Completed: real SMTP password-reset email delivery - **new scope, not a tracked Jira issue.** With the entire tracked backlog Done, the user was asked "what do you think should be the next steps?", pushed back with "tell me what to do then?" (twice) when offered options instead of a decision, so this was chosen and built directly: `LoggingPasswordResetEmailSender` only ever logs the reset token to the console, meaning password reset has never actually been usable by a real end user outside this dev environment.

- **Added `SmtpPasswordResetEmailSender`** (MailKit 4.17.0, `backend/src/InvoiceApp.Infrastructure/Authentication/`), sending both a plain-text and HTML reset email over standard SMTP (STARTTLS on 587 by default, implicit TLS on 465 via `Email:UseStartTls = false`). Its own `BuildMessageContent` is a pure static method, tested without a real SMTP connection.
- **`AddInfrastructureAuthentication` now conditionally registers it** in place of `LoggingPasswordResetEmailSender`, only when `Email:Host` is actually configured (blank/whitespace still falls back to the log stub) - every environment without real credentials (local dev, CI, tests) keeps working completely unchanged, matching `GoogleAuthenticationOptions`' own established "optional, blank by default" precedent.
- **Config section deliberately named `Email`, not `Smtp`**: `docs/SAD.md` section 67 already anticipates an `Email__Provider` config path for this exact concern, and `InvoiceApp.Infrastructure.Tests.Configuration.SecretsHygieneTests` already has an automated, enforced check against `appsettings.json` ever committing a section named `Email` - naming it this way gets that guard for free instead of needing a new one. Kept the existing narrow `IPasswordResetEmailSender` interface as-is rather than building out `docs/SAD.md` section 48's broader multi-provider `IEmailSender`/`EmailMessage` abstraction - that's a real but much larger, never-requested undertaking for a future "Email Architecture" epic, not something this ask called for.
- **Documented the new config keys** in `backend/README.md`'s Secrets section (`Email:Host`/`Port`/`Username`/`Password`/`FromAddress`/`FromName`/`UseStartTls`), same style as the existing Secrets guidance.

Files changed or created:

- `backend/src/InvoiceApp.Infrastructure/InvoiceApp.Infrastructure.csproj` (MailKit 4.17.0 package reference)
- `backend/src/InvoiceApp.Infrastructure/Configuration/SmtpOptions.cs` (new)
- `backend/src/InvoiceApp.Infrastructure/Authentication/SmtpPasswordResetEmailSender.cs` (new)
- `backend/src/InvoiceApp.Infrastructure/Authentication/InfrastructureAuthenticationExtensions.cs` (conditional registration)
- `backend/tests/InvoiceApp.Infrastructure.Tests/Authentication/SmtpPasswordResetEmailSenderTests.cs` (new, 4 tests)
- `backend/tests/InvoiceApp.Infrastructure.Tests/Authentication/PasswordResetEmailSenderRegistrationTests.cs` (new, 3 tests)
- `backend/README.md` (Secrets section)
- `backlog.md`

Verification performed:

- Full backend suite: 313/313 passing (140 in `InvoiceApp.Infrastructure.Tests`, up from 133 - 7 new). Full frontend suite unaffected: 558/558 passing; `npx eslint .` and `npm run build` both clean (backend-only change, ran the full four-command gate anyway per standing practice).
- **Not live-tested against a real SMTP provider** - the user hasn't supplied real credentials yet. `backend/README.md` now documents exactly what to `dotnet user-secrets set` to enable it; until then, every environment keeps using the unchanged `LoggingPasswordResetEmailSender` stub.
- Committed locally only (`070c4f1`) - not pushed by default (standing workflow).
- **No Jira issue exists for this work** - it's new scope the user delegated ("tell me what to do") rather than named specifically. Worth asking whether to retroactively file one.

Prior execution, still relevant context (superseded by the "Current Project Status"/"Current Focus"/"Next Task" sections above, kept here as project history only):

**Date:** 2026-09-09 (the last one that day)

Completed: `IG-197` (Invoice Detail Page missing its Download PDF action) - the fourth and final bug found across earlier regression/compatibility passes. **This closed the entire tracked backlog - every Epic and every found bug in Jira project `IG` was Done as of this point.**

- **Implemented per this issue's own suggested fix**: reused `IG-43`'s existing stateless PDF endpoint and download logic (`downloadInvoicePdf`) rather than building a new one. Added `buildInvoicePdfPayloadFromEditable` (`frontend/app/lib/invoiceDetailPdf.ts`) to map the detail page's own `EditableInvoice` state into the same request shape the creation flow already builds, since the endpoint takes a full payload rather than an invoice reference - the free-text Payment Instructions field rides in as `customInstructions` with the structured field left `null`, mirroring `buildInvoiceUpdatePayload`'s own precedent for the save flow. Added a "Download PDF" button to the action row (between Duplicate and Cancel Invoice, matching FSD section 49's own listed order).
- **Verified end-to-end against a real backend**, not just the mapping in isolation: created and saved a real invoice, opened its detail page, clicked Download PDF, and confirmed a genuine ~48KB PDF downloaded with the correct filename matching the saved invoice number - 3/3 checks passed.
- **Deliberately did not include the business's saved logo** on these PDFs (see item 20 above) - out of this bug's own suggested scope, and consistent with how the anonymous creation flow's PDF generation has always worked.

Files changed or created (`IG-197`):

- `frontend/app/lib/invoiceDetailPdf.ts` (new)
- `frontend/app/lib/invoiceDetailPdf.test.ts` (new, 4 tests)
- `frontend/app/documents/invoices/[id]/components/InvoiceDetail.tsx` (extended: Download PDF button + handler)
- `frontend/app/documents/invoices/[id]/components/InvoiceDetail.test.tsx` (extended: 2 new tests)
- `backlog.md`

Verification performed (`IG-197`):

- Full backend suite: 306/306 passing (unaffected, no backend changes). Full frontend suite: 558/558 passing (up from 552 - 6 new); `npx eslint .` and `npm run build` both clean.
- Real end-to-end browser verification against a real running backend (see Completed above) - 3/3 checks passed.
- Committed locally only (`d52fb60`) - not pushed by default (standing workflow).

Prior execution, still relevant context (superseded by the "Current Project Status"/"Current Focus"/"Next Task" sections above, kept here as project history only):

**Date:** 2026-09-09 (even later still again)

Completed: `IG-196` (no completable Google sign-in flow) - the third of the 4 bugs found across earlier regression/compatibility passes.

- **Implemented exactly the scope the issue itself suggested**: `GoogleCallbackAsync` now redirects (302) to a new frontend page (`/auth/google/callback`) instead of returning the account as raw JSON - the session cookie is already set by that point via the same `IAuthSessionService.SignInAsync` every other login path uses. That page resolves where to land client-side using the same pending-gate-action check `LoginForm` already runs after a normal password sign-in (a server-side redirect can't read the frontend's own localStorage). Added "Continue with Google" links (plain `<a href>`, not a click handler - must be a genuine full-page navigation to trigger the 302 challenge redirect) to both `LoginForm` and `RegisterForm`.
- **The frontend origin used for the redirect is now a config value** (`Frontend:BaseUrl` in `appsettings.json`) rather than a second hardcoded string alongside CORS's own - though CORS's own allowed-origins list wasn't consolidated onto it too, to keep this fix narrowly scoped (see item 17 above).
- **Verified everything actually reachable in this environment** - a full Google consent-screen round trip isn't automatable here, matching this same endpoint's own existing test suite's documented precedent ("a real end-to-end pass needs a manual browser check"): re-confirmed `GET /api/v1/auth/google/login` still issues a real 302 to `accounts.google.com` with the app's actual registered `client_id`; confirmed both new "Continue with Google" links render with the correct `href`; confirmed the new callback page correctly resolves to `/` or `/invoice/create` depending on whether a gate action is pending - 6/6 checks passed. All 3 existing `GoogleAuthenticationTests` still pass unaffected.

Files changed or created (`IG-196`):

- `backend/src/InvoiceApp.Api/Endpoints/AuthEndpoints.cs` (`GoogleCallbackAsync` now redirects instead of returning JSON)
- `backend/src/InvoiceApp.Api/appsettings.json` (new `Frontend:BaseUrl` config value)
- `frontend/app/lib/auth.ts` (extended: `googleLoginUrl`)
- `frontend/app/auth/google/callback/page.tsx` (new)
- `frontend/app/login/components/LoginForm.tsx`, `frontend/app/signup/components/RegisterForm.tsx` (extended: "Continue with Google" links)
- `backlog.md`

Verification performed (`IG-196`):

- Full backend suite: 306/306 passing (all 3 existing `GoogleAuthenticationTests` confirmed unaffected). Full frontend suite: 552/552 passing (unaffected - same precedent as `IG-195` of relying on real-browser verification over a unit test for this class of auth-flow page); both new/changed routes build cleanly; `npx eslint .` and `npm run build` both clean.
- Real-browser and live-server verification (see Completed above) - 6/6 checks passed.
- Committed locally only (`5565d27`) - not pushed by default (standing workflow).

Prior execution, still relevant context (superseded by the "Current Project Status"/"Current Focus"/"Next Task" sections above, kept here as project history only):

**Date:** 2026-09-09 (even later still)

Completed: `IG-195` (no discoverable UI for password reset) - the second of the 4 bugs found across earlier regression/compatibility passes.

- **Implemented exactly the scope the issue itself suggested**: a `/forgot-password` page (email input, always the same generic confirmation regardless of whether the account exists - matching the backend's own anti-enumeration behavior) and a `/reset-password` page (reads `email`/`token` from the URL query string, both still editable since the dev-only email stub only logs the raw token rather than a full link; new-password + confirm fields), plus a "Forgot password?" link added to `LoginForm.tsx`.
- **Verified end-to-end against a real running backend**, not just the UI in isolation: registered a fresh account, requested a reset through the new UI, extracted the real token from the backend's own console log output, submitted it through the new reset page, confirmed the old password is then rejected and the new one logs in successfully - 8/8 checks passed.
- No backend changes were needed - `IG-25`'s backend flow was already genuinely complete, confirmed again by this pass; only the missing frontend needed building.

Files changed or created (`IG-195`):

- `frontend/app/lib/auth.ts` (extended: `requestPasswordReset`, `resetPassword`, `ResetPasswordRequest`)
- `frontend/app/forgot-password/{page.tsx,components/ForgotPasswordForm.tsx}` (new)
- `frontend/app/reset-password/{page.tsx,components/ResetPasswordForm.tsx}` (new - `page.tsx` wraps the form in a `Suspense` boundary since it reads the URL query string via `useSearchParams`, same requirement `InvoiceListView`/`ResetPasswordForm`'s own new page already follow)
- `frontend/app/login/components/LoginForm.tsx` (extended: "Forgot password?" link; doc comment updated to note only the Google-sign-in gap remains, `IG-196`)
- `backlog.md`

Verification performed (`IG-195`):

- Full backend suite: 306/306 passing (unaffected, no backend changes). Full frontend suite: 552/552 passing (unaffected - no dedicated unit test was added for either new form, matching the sibling `LoginForm`/`RegisterForm` components' own precedent of relying on real-browser verification rather than a unit test for this class of auth-flow page); both new routes build cleanly; `npx eslint .` and `npm run build` both clean.
- Real end-to-end browser verification (see Completed above) - 8/8 checks passed.
- Committed locally only (`f2cca07`) - not pushed by default (standing workflow).

Prior execution, still relevant context (superseded by the "Current Project Status"/"Current Focus"/"Next Task" sections above, kept here as project history only):

**Date:** 2026-09-09 (later still)

Completed: `IG-194` (Issue Date/Due Date silently cleared by a stale-closure race) - the first of the 4 bugs found across earlier regression/compatibility passes, now that the MVP backlog itself is fully delivered.

- **Fixed exactly as the issue's own description suggested**: `CreateInvoiceEditor.tsx`'s `handleHeaderChange` now merges the header entirely against `current` inside the functional `setDraft` updater, instead of building `nextHeader` from the render-scope `draft` closure (which raced the mount effect that defaults Issue Date/Due Date to today). `nextHeader` is still captured via an outer `let` (React invokes the updater synchronously) so the existing immediate re-validation branch keeps working unchanged.
- **Verified against a real browser, not a unit test** - this class of cross-tick timing race can't naturally reproduce in jsdom/RTL, since `render()` fully flushes effects before returning control, which is also why the original regression pass needed a real browser to find it in the first place. Reverted the fix locally, confirmed the original code reproduces the bug **8/8** times with zero delay after page load, then restored the fix and confirmed **8/8** runs correctly keep both dates populated - proving both that the fix works and that the verification method would have caught the original bug.

Files changed or created (`IG-194`):

- `frontend/app/invoice/create/components/CreateInvoiceEditor.tsx` (`handleHeaderChange` rewritten to merge against `current`)
- `backlog.md`

Verification performed (`IG-194`):

- Full backend suite: 306/306 passing (unaffected, no backend changes). Full frontend suite: 552/552 passing (unaffected - this bug's nature means no new unit test could exercise it, see above); `npx eslint .` and `npm run build` both clean.
- Real-browser before/after verification (see Completed above) - 8/8 reproduced on the original code, 8/8 fixed afterward.
- Committed locally only (`13c29e9`) - not pushed by default (standing workflow).

Prior execution, still relevant context (superseded by the "Current Project Status"/"Current Focus"/"Next Task" sections above, kept here as project history only):

**Date:** 2026-09-09 (later same day)

Completed: `IG-72` ("Meet operational performance and release quality targets", S60, both Subtasks `IG-191`/`IG-192`) — the fifth and final Story in Epic `IG-12`. **This closes Epic `IG-12` and the entire MVP backlog - `IG-1` through `IG-12` are all Done.**

- **Verified every FSD section 125 performance target under representative conditions, not just a trivial empty-account case**: API endpoints stayed 7-40ms steady-state near-empty and 9-25ms after seeding 150 invoices across 30 customers (target <500ms); PDF generation was 726ms cold / ~11ms warm, confirmed as genuine rendered PDFs via the `%PDF` file signature (target <3s); dashboard initial render was 174ms against 15 seeded invoices, measured against a **production** frontend build (`next build && next start`) rather than the unrepresentative dev server (target <2s); invoice editor preview reflected a typed change in 64ms (target "near instantly"), which also holds structurally since the preview renders from the same lifted React state the form writes to - no network round-trip is ever in that path. Every target cleared with wide margin; no performance remediation was needed.
- **Found and fixed a real monitoring gap**: `GlobalExceptionHandler` already logged every *failed* request, but nothing logged *successful* ones - so "login success/failure trends" and "PDF generation success" (both named explicitly in FSD section 124) had no success side to compute a ratio against. Added ASP.NET Core's built-in `HttpLogging` middleware, deliberately scoped to only method/path/status/duration - excluding headers/bodies/cookies, which the framework's own defaults would otherwise include and which would have leaked the session cookie and the register/login endpoints' own password fields straight into the log. Needed an explicit `Microsoft.AspNetCore.HttpLogging` log-level override, since the app's existing blanket `Microsoft.AspNetCore: Warning` default silently suppressed it at first - caught by actually checking the log output, not assumed to work from the code alone.
- **Compiled and verified a test-coverage summary**: 306 backend tests + 552 frontend tests, confirmed (not assumed) every Epic `IG-1`-`IG-12` has dedicated coverage, all exercised on every push via CI.
- **Wrote a full launch-readiness report** (`qa-reports/2026-09-09-launch-readiness.md`): performance evidence, monitoring/diagnostics status, test coverage summary, and known release blockers/residual risks (the 4 open bugs, plus environmental limitations found across Epic `IG-12` - no real mobile/Safari device testing, no screen-reader verification, the shared rate-limit partition design from `IG-71`, no load/concurrency testing beyond `IG-46`'s own) - all documented as launch-decision inputs for the user, not silently resolved or ignored.

Files changed or created (`IG-72`):

- `backend/src/InvoiceApp.Api/Program.cs` (`AddHttpLogging`/`UseHttpLogging`, scoped fields only)
- `backend/src/InvoiceApp.Api/appsettings.json`, `appsettings.Development.json` (added `Microsoft.AspNetCore.HttpLogging: Information` override)
- `qa-reports/2026-09-09-launch-readiness.md` (new)
- `backlog.md`

Verification performed (`IG-72`):

- Full backend suite: 306/306 passing (unaffected by this Story's changes - no test changes were needed, the HttpLogging addition was verified live against a running server instead). Full frontend suite: 552/552 passing (unaffected, no frontend changes this Story); `npx eslint .` and `npm run build` both clean.
- All performance numbers and the HttpLogging fix were verified against real running servers (backend via `dotnet run`, frontend via a genuine `next build && next start` production instance) - not simulated, not assumed from reading code.
- Committed locally only (`7ecb03b`) - not pushed by default (standing workflow).

Prior execution, still relevant context (superseded by the "Current Project Status"/"Current Focus"/"Next Task" sections above, kept here as project history only):

**Date:** 2026-09-09

Completed: `IG-71` ("Protect uploads and expensive endpoints", S59, both Subtasks `IG-189`/`IG-190`) — the fourth Story in Epic `IG-12`.

- **File-upload security audited, found already fully compliant, no changes made**: checked the existing business-logo upload path (`IG-52`) against FSD section 87/89's checklist point by point - MIME whitelist + magic-byte signature verification (`BusinessLogoValidator`), server-generated filename (`{businessId}.{ext}`, never the client's own - no path-traversal surface at all), no `UseStaticFiles()` middleware anywhere in the app (confirmed by grep - `App_Data` is never directly web-accessible regardless of location), and a `{businessId:guid}`-constrained safe URL with no path/filename exposed. `BusinessLogoEndpointsTests.cs` already had 10 tests covering this, including a renamed-executable-style rejection test. Nothing to fix here.
- **Found and fixed the one real gap** (flagged during `IG-70`'s own audit): rate limiting covered only the 4 auth endpoints - `/api/v1/invoices/pdf` (anonymous, computationally expensive QuestPDF rendering, no session to naturally throttle abuse) had none. `RateLimitingOptions`' own doc comment had already anticipated this exact endpoint joining the policy "once built" - wired it up rather than inventing a new policy/config section for one endpoint.
- **New tests**: `PdfRateLimitingTests.cs` (2 tests, mirroring `AuthRateLimitingTests`' exact pattern) - confirmed requests within the configured limit succeed and requests beyond it get a real 429 at the HTTP pipeline level.

Files changed or created (`IG-71`):

- `backend/src/InvoiceApp.Api/Endpoints/DocumentEndpoints.cs` (`.RequireRateLimiting(RateLimitingOptions.AuthPolicyName)` added to the PDF endpoint)
- `backend/src/InvoiceApp.Infrastructure/Configuration/RateLimitingOptions.cs` (doc comment updated to reflect PDF generation has now joined)
- `backend/tests/InvoiceApp.Api.Tests/RateLimiting/PdfRateLimitingTests.cs` (new, 2 tests)
- `backlog.md`

Verification performed (`IG-71`):

- Full backend suite: 306/306 passing (14 architecture + 133 infrastructure + 159 API, up from 304 - 2 new). Full frontend suite: 552/552 passing (unaffected, no frontend changes this Story); `npx eslint .` and `npm run build` both clean.
- Committed locally only (`8125484`) - not pushed by default (standing workflow).

Prior execution, still relevant context (superseded by the "Current Project Status"/"Current Focus"/"Next Task" sections above, kept here as project history only):

**Date:** 2026-09-08 (later still again)

Completed: `IG-70` ("Protect account and business data", S58, both Subtasks `IG-187`/`IG-188`) — the third Story in Epic `IG-12`.

- **Authorization/ownership audit across every endpoint** (`grep` across all `Api/Endpoints/*.cs`, not spot-checked): every account-scoped route carries `.RequireAuthorization()`, and every service resolves the acting business from the authenticated `userId` internally rather than a caller-supplied id (the `ResolveBusinessIdAsync` pattern established since `IG-55`). The handful of routes without `.RequireAuthorization()` were all confirmed to be deliberately, documentedly public with no cross-account data surface (`/invoices/calculate`, `/invoices/pdf` - both stateless, render only what's posted; `/business/logo/{businessId}` GET - an invoice recipient needs it without a session; the auth/OAuth endpoints themselves). No gaps found.
- **Cross-account test coverage audit**: every resource type already had dedicated "another account's X is invisible" tests written as part of its own originating Story (Invoices, Customers, Items, Payments) - confirmed by grep across `backend/tests`, not assumed. `InvoiceSaveEndpointsTests` even covers the subtler IDOR case of attaching *another account's customer id* to your own invoice, not just accessing another account's own primary resource.
- **New: user-attributed rejection logging.** `GlobalExceptionHandler` now logs the acting authenticated user's id (or "anonymous") alongside every 400/401/404/409 it maps - verified live against a running server, not just read in code: an authenticated cross-account GET produced a log line reading `UserId: <the real guid>`. The HTTP response itself is unchanged (still a plain 404 - anti-enumeration is about what the *client* sees, this is a server-side-only addition for operators to review probing/compromise patterns).
- **New: unsafe-input handling test coverage** (`UnsafeInputTests.cs`, 5 tests, none existed before this Story) - SQL-injection-style (`Robert'); DROP TABLE customer.customers;--`) and XSS-style (`<script>alert('xss')</script>...`) payloads through every major free-text field (customer, invoice, catalog item, business profile) round-trip verbatim with no crash/corruption, and the underlying table stays queryable afterward. Confirmed this holds structurally, not by luck: EF Core parameterizes every query (the one raw-SQL statement in the codebase, `BusinessService.GenerateNextInvoiceNumberAsync`, uses EF's interpolated-parameter syntax, not string concatenation), and there is no `dangerouslySetInnerHTML`/`.innerHTML =`/`document.write` anywhere in the frontend.
- **Found, not fixed, out of this Story's own scope**: rate limiting only covers the 4 auth endpoints today - `/api/v1/invoices/pdf` (anonymous, computationally expensive, no auth to throttle abuse) has none. This is `IG-71`'s scope, not `IG-70`'s (authz/input safety vs. rate-limiting/uploads) - flagged for that Story rather than fixed here.

Files changed or created (`IG-70`):

- `backend/src/InvoiceApp.Api/Diagnostics/GlobalExceptionHandler.cs` (extended: user-id-attributed logging)
- `backend/tests/InvoiceApp.Api.Tests/Security/UnsafeInputTests.cs` (new, 5 tests)
- `backlog.md`

Verification performed (`IG-70`):

- Full backend suite: 304/304 passing (14 architecture + 133 infrastructure + 157 API, up from 299 - 5 new). Full frontend suite: 552/552 passing (unaffected, no frontend changes this Story); `npx eslint .` and `npm run build` both clean.
- Live-verified the new logging behavior against a running server (registered account, cross-account GET, confirmed the log line's `UserId` matched the real account id; confirmed a no-session 401 - a routine case, not a probing signal - correctly produces no such log line since it's handled by the auth middleware itself, not a thrown exception).
- Committed locally only (`ae7d012`) - not pushed by default (standing workflow).

Prior execution, still relevant context (superseded by the "Current Project Status"/"Current Focus"/"Next Task" sections above, kept here as project history only):

**Date:** 2026-09-08 (even later still)

Completed: `IG-69` ("Use the product with accessible interactions", S57, both Subtasks `IG-185`/`IG-186`) — the second Story in Epic `IG-12`.

- **Automated axe-core scan (WCAG 2.1 A/AA rules) across 13 critical pages** (landing, signup, login, onboarding, dashboard, invoice list/create/detail, customers list/new, items list, business settings; both anonymous and authenticated) — **0 violations**, both before and after the fixes below. Confirms labels, roles, color contrast and semantic structure were already solid, built in incrementally as each prior Story shipped.
- **Automated scanning can't catch keyboard/focus-management gaps that don't show up in the accessibility tree**, so followed up with manual keyboard-driven Playwright scripts - this is what actually found 2 real bugs:
  1. `ConfirmDialog`/`AccountGateModal` had no focus trap - Tab from the last button escaped past the dialog into page content hidden behind the overlay. Fixed with Tab/Shift+Tab cycling within each dialog's own focusable elements (verified both directions).
  2. `CustomerPicker`/`ItemPicker` dropdowns were effectively mouse-only - their `onBlur` closed the list ~150ms after ANY blur, including a keyboard Tab onto one of the dropdown's own option buttons, unmounting it and dropping focus to `<body>` with the option gone. Fixed with a `relatedTarget` check on the wrapper (only close when focus actually leaves the whole picker); also added `onClick` to the option buttons (previously only `onMouseDown`), since Enter/Space on a focused button did nothing without it.
- **Verified end-to-end after fixing**: Tab into a picker's dropdown, confirm it stays open, press Enter, confirm the field actually populates - for both CustomerPicker (Bill To) and ItemPicker (line item fields); Tab/Shift+Tab cycling confirmed on both dialogs; re-ran the full axe-core pass, still 0 violations.
- **Not independently verified with a real screen reader** - no screen-reader automation available in this environment; relied on the ARIA roles/labels/live-region patterns already in place, which is the standard mechanism screen readers use, but actual AT output wasn't listened to directly. Documented as a limitation, not claimed as covered.

Files changed or created (`IG-69`):

- `frontend/app/documents/invoices/[id]/components/ConfirmDialog.tsx` (Tab/Shift+Tab focus trap added to the existing keydown handler)
- `frontend/app/invoice/create/components/AccountGateModal.tsx` (same fix)
- `frontend/app/invoice/create/components/CustomerPicker.tsx` (`relatedTarget`-based blur check on the wrapper; `onClick` added to option buttons)
- `frontend/app/invoice/create/components/ItemPicker.tsx` (same fix)
- `frontend/app/documents/invoices/[id]/components/ConfirmDialog.test.tsx`, `frontend/app/invoice/create/components/{AccountGateModal,CustomerPicker,ItemPicker}.test.tsx` (extended: 1 new test each, 4 total)
- `backlog.md`

Verification performed (`IG-69`):

- Full backend suite: 299/299 passing (unaffected, no backend changes). Full frontend suite: 552/552 passing (up from 548 - 4 new); `npx eslint .` and `npm run build` both clean.
- Real keyboard-driven Playwright verification (see Completed above) confirmed both bugs before fixing and both fixes after.
- Committed locally only (`685af58`) - not pushed by default (standing workflow).

Prior execution, still relevant context (superseded by the "Current Project Status"/"Current Focus"/"Next Task" sections above, kept here as project history only):

**Date:** 2026-09-08 (later still)

Completed: `IG-68` ("Use critical journeys across supported devices and browsers", S56, both Subtasks `IG-183`/`IG-184`) — the first Story in Epic `IG-12`.

- **Real cross-engine, cross-viewport verification, not just Chromium at one size**: downloaded Firefox and WebKit via `playwright install` (WebKit as the closest available proxy for Safari - no real macOS/Safari reachable in this sandbox), then ran the critical journey (signup → onboarding → create/save invoice → invoice list → dashboard) across Chromium/Firefox/WebKit at the FSD's own three breakpoints (320px mobile, 768px tablet, 1440px desktop), measuring `document.documentElement.scrollWidth` vs `clientWidth` on every page rather than eyeballing screenshots.
- **Found and fixed 2 real, reproducible responsive bugs** (not filed as separate issues - directly in this Story's own scope, so fixed here): `SiteHeader.tsx`'s desktop nav switched on at Tailwind's `md` breakpoint (768px), but the authenticated nav (8 links + account email + Log out) needs ~1104px of content width (measured directly via `getBoundingClientRect()`) - caused genuine page-level horizontal scroll on every authenticated page at exactly the FSD's mandated tablet width. Moved to `xl` (1280px). `InvoiceDetail.tsx`'s action-button row (Duplicate/Cancel Invoice/Delete/Save) didn't wrap at 320px mobile, overflowing horizontally - added `flex-wrap`.
- **Found and diagnosed a Playwright/WebKit-specific automation quirk** (not an app bug, confirmed via isolated debugging): `.fill()` sets a form field's DOM value but doesn't reliably trigger this app's React `onChange` handlers under the cached WebKit build, so a submitted form silently sent stale/empty values. `.click()` + `.pressSequentially()` (real keystrokes) fixed it - documented for future cross-browser scripts.
- **Found, but did not fix, a real out-of-scope gap**: the Invoice Detail Page has no Download PDF action at all, despite FSD section 49 explicitly listing it as a required action - PDF/print functionality only exists on the anonymous creation flow (IG-43's scope). Confirmed via direct code inspection. Filed as [IG-197](https://appitometechnologies.atlassian.net/browse/IG-197) against parent Epic `IG-7`, with the user's explicit approval before filing.
- **Real device testing (Safari iOS, Chrome Android per FSD section 126) is not available in this environment** - documented as a known limitation of this pass rather than claimed as covered, per S56's own "compatibility failures have documented severity and release handling" AC.

Files changed or created (`IG-68`):

- `frontend/app/components/landing/SiteHeader.tsx` (breakpoint `md` → `xl` on 4 classes, with a comment documenting the measured minimum content width)
- `frontend/app/documents/invoices/[id]/components/InvoiceDetail.tsx` (`flex-wrap` added to the action-button row)
- `backlog.md`

Verification performed (`IG-68`):

- Full backend suite: 299/299 passing (unaffected, no backend changes - re-confirmed per the standing four-command gate). Full frontend suite: 548/548 passing (unaffected - these were pure CSS/className fixes, no new tests needed); `npx eslint .` and `npm run build` both clean.
- Re-ran the full cross-engine/cross-viewport pass after both fixes: 0 horizontal-scroll failures remaining across Chromium/Firefox/WebKit at all three breakpoints (41/41 checks passed, plus 12/12 on a separate WebKit-specific pass once the `.fill()` quirk was worked around).
- Committed locally only (`b3ccb22`) - not pushed by default (standing workflow).

Prior execution, still relevant context (superseded by the "Current Project Status"/"Current Focus"/"Next Task" sections above, kept here as project history only):

**Date:** 2026-09-08 (later same day)

Completed: `IG-11` ("Payment Recording and Invoice Status", all 4 Stories `IG-64`-`IG-67`) — the last Epic in the MVP backlog with any pre-existing Story-level scope. **Epic `IG-11` closing means Epics `IG-1` through `IG-11` are all Done** - only `IG-12` (quality/security/ops) remains.

- **Wired up the pre-scaffolded `Payment` domain model end-to-end** — `Payment`/`PaymentMethod`/`PaymentConfiguration` (table `payment.payments`) already existed but had never been wired to any service or endpoint, the same pattern `CatalogItem` was in before `IG-57`. Added `Application/Payments/{PaymentDto,PaymentRequest,IPaymentService}.cs`, `Infrastructure/Payments/{PaymentService,PaymentsServiceCollectionExtensions}.cs`, `Modules.Payments/PaymentRequestValidator.cs`, `Api/Endpoints/PaymentEndpoints.cs` (`GET`/`POST /api/v1/invoices/{id}/payments`, `DELETE /api/v1/invoices/{id}/payments/{paymentId}`) — mirroring `CustomerService`/`CatalogItemService`'s exact account-ownership pattern.
- **Status derivation follows FSD section 71 exactly**: AmountPaid = 0 keeps the prior status (resolved to Draft specifically, since grep confirmed `Sent`/`Viewed`/`PartiallyPaid` are never actually assigned anywhere else in this codebase - documented as an assumption to revisit if those statuses are ever built), `0 < AmountPaid < Total` → PartiallyPaid, `AmountPaid = Total` → Paid. Overdue stays a separately-computed condition (`InvoiceStatusRules`), unaffected by payment status either way.
- **Validation split between the endpoint-layer static validator and the service**, deliberately: `PaymentRequestValidator.Validate(request)` (called from `PaymentEndpoints`, same convention as every other validator) checks Amount > 0 and Reference's DB column length - pure request-shape, no DB access. The other half of FSD section 70 (amount can't exceed the outstanding balance) needs the loaded invoice's current `AmountDue`, so it lives inline in `PaymentService.RecordAsync` instead, alongside its other invoice-state business rules - same precedent as `InvoiceService.SaveAsync` checking invoice-number uniqueness inline rather than via a static validator.
- **Cancelled-invoice rule resolved deliberately asymmetric, per FSD section 52**: recording a *new* payment against a Cancelled invoice is a hard 409 (no reactivation flow exists to build against), but *removing* an existing payment is still allowed regardless of status - it's a correction, not a new payment. Removal still recalculates AmountPaid/AmountDue (factual correction) but never overwrites an already-Cancelled stored Status.
- **Frontend**: new `frontend/app/lib/payments.ts` client plus a `PaymentsSection` component added to the invoice detail page - payment history table (Date/Amount/Method/Reference/Remove) and a Record Payment form pre-filled with the invoice's current outstanding balance and today's date (both freely editable), hidden once the invoice is Cancelled or fully Paid.
- **Real end-to-end browser verification** (Playwright, ad-hoc script, cleaned up afterward): registered an account, created a 100 AUD invoice, recorded a 40 partial payment (confirmed PartiallyPaid + 60 due), attempted a 61 overpayment (rejected inline, balance unchanged), paid the remaining 60 exactly (confirmed Paid, form hides), then removed both payments in sequence confirming the reverse transitions Paid → PartiallyPaid → Draft - 17/17 checks passed.

Files changed or created (`IG-11`):

- `backend/src/InvoiceApp.Application/Payments/{PaymentDto,PaymentRequest,IPaymentService}.cs` (new)
- `backend/src/InvoiceApp.Infrastructure/Payments/{PaymentService,PaymentsServiceCollectionExtensions}.cs` (new)
- `backend/src/InvoiceApp.Modules.Payments/PaymentRequestValidator.cs` (new)
- `backend/src/InvoiceApp.Api/Endpoints/PaymentEndpoints.cs` (new); `Program.cs` (extended: `AddInfrastructurePayments`, `MapPaymentEndpoints`)
- `backend/tests/InvoiceApp.Infrastructure.Tests/Modules/Payments/PaymentRequestValidatorTests.cs` (new, 4 tests)
- `backend/tests/InvoiceApp.Api.Tests/Payments/PaymentEndpointsTests.cs` (new, 21 tests)
- `frontend/app/lib/payments.ts` (new)
- `frontend/app/documents/invoices/[id]/components/{PaymentsSection,PaymentsSection.test}.tsx` (new, 9 tests)
- `frontend/app/documents/invoices/[id]/components/InvoiceDetail.tsx` (extended: renders `PaymentsSection`, merges its invoice-summary updates into detail state)
- `frontend/app/documents/invoices/[id]/components/InvoiceDetail.test.tsx` (extended: `listPayments` stubbed to `[]` so pre-existing tests aren't broken by the new section's own fetch/alert)
- `backlog.md`

Verification performed (`IG-11`):

- Full backend suite: 299/299 passing (14 architecture + 133 infrastructure + 152 API, up from 277 - 25 new: 21 endpoint + 4 validator). Full frontend suite: 548/548 passing (up from 539 - 9 new); `npx eslint .` and `npm run build` both clean.
- Real-browser verification via Playwright (see Completed above) - 17/17 checks passed.
- Committed locally only (`c6db36d`) - not pushed by default (standing workflow).

Prior execution, still relevant context (superseded by the "Current Project Status"/"Current Focus"/"Next Task" sections above, kept here as project history only):

**Date:** 2026-09-08

Completed: a full-depth regression test pass, followed by `IG-59` ("Archive reusable records safely", S47) — the last Story in Epic `IG-9`, which is now Done. **Epic `IG-9` closing means Epics `IG-1` through `IG-10` are all Done** - only `IG-11`/`IG-12` remain in the entire MVP backlog.

- **Regression pass** (requested explicitly by the user, scoped to "full depth, all Epics"): ran the existing automated suites fresh (backend 277/277, frontend 539/539, lint/build clean), then four real-browser Playwright scripts (written, debugged, and discarded - not part of the repo) covering integration paths across every built Epic: core authenticated journey (onboarding → business settings → customer/item CRUD → invoice creation with both pickers → save → PDF → list/search → edit/duplicate/cancel → dashboard), anonymous flow + auth edge cases (draft persistence, download gate, signup-preserves-context, duplicate email, invalid login, password reset full round trip via direct API since no UI link exists, Google OAuth redirect shape, rate limiting), saved-invoice lifecycle (duplicate, cancel, template switching), and account deletion + a console-error sweep across 9 authenticated pages. 49/50 scripted checks passed. Full report: `qa-reports/2026-09-07-regression.md`.
- **Found and filed 3 real issues**, all confirmed with the user before filing: [IG-194](https://appitometechnologies.atlassian.net/browse/IG-194) (a genuine bug - Issue Date/Due Date silently cleared if a header field is edited before the page-load date-default effect commits, root-caused to `CreateInvoiceEditor.tsx`'s `handleHeaderChange` reading a stale closure instead of the functional `setDraft` pattern, confirmed reproducible 3/3 with no delay and 0/3 with a 1s delay) and [IG-195](https://appitometechnologies.atlassian.net/browse/IG-195)/[IG-196](https://appitometechnologies.atlassian.net/browse/IG-196) (pre-existing, already-self-documented UI gaps - no Forgot Password or Sign in with Google entry point anywhere, despite both backends working, confirmed by direct API testing). None were fixed this pass - this was a QA/report pass, not a fix pass, per the user's own framing of the request.
- **`IG-59` turned out to need zero new code**, confirmed by direct investigation rather than assumed: `Invoice.CustomerSnapshot`/`SellerSnapshot` and `InvoiceItem`'s own Description/Quantity/UnitPrice/TaxRate columns are self-contained copies taken at save time (archiving a Customer or CatalogItem only sets `IsArchived=true`, which no historical invoice ever re-reads for display); the one live join against `Customers` (`InvoiceService`'s list/search query) is an inner join on `Id`, unaffected by archival since archived rows are never deleted. Verified end-to-end in a real browser (not just by reading code): created a customer + item, used both on an invoice, archived both, confirmed the invoice list still showed the archived customer's name, the invoice detail page still showed the exact historical Bill To text and line description, and both were excluded from a fresh invoice's pickers - 8/8 checks passed.

Files changed or created (this session):

- `qa-reports/2026-09-07-regression.md` (new)
- `backlog.md`
- No source files changed for `IG-59` (verification-only) or for the regression pass itself (all test scripts were temporary and removed after use).

Verification performed:

- See the regression pass bullet above for the full-suite results. `IG-59` verification: 8/8 real-browser checks passed (see above).
- Committed locally only (`5c3c69c`, `633eeb9`) - pushed at the user's explicit request; CI green on both. `IG-59` itself has no commit (nothing to commit).

Prior execution, still relevant context (superseded by the "Current Project Status"/"Current Focus"/"Next Task" sections above, kept here as project history only):

**Date:** 2026-09-07 (later still)

Completed: `IG-58` ("Select a saved item on an invoice", S46).

- **New `ItemPicker` component**, one per invoice line (unlike `CustomerPicker`, which appears once above Bill To) - each line can be populated from a different catalogue item. Mirrors `CustomerPicker`'s exact structure (client-side filter over the account's active items, 2+ character threshold, `onMouseDown`-before-`onBlur` dropdown-click handling).
- **`applyCatalogItemToLineItem` (FSD section 25)**: selecting an item fills Description/Unit/Unit Price/Tax Rate on that line only - Quantity and Discount are left untouched, since they're properties of the invoice line, not the catalogue record. Description falls back to the item's Name when its own Description is blank (Name is required, Description isn't - this can never leave an invalid empty description). A catalogue tax rate that doesn't match one of the line's fixed presets (0/5/10/15/20) maps onto "Custom" with the exact value; a missing tax rate maps to 0%, not whatever the line had before.
- **"Invoice stores a snapshot" (FSD section 25 / IG-58 AC) holds by construction, not new code**: `LineItem` has never carried an id or reference back to any source record - selecting an item is a one-time copy of field values, confirmed in a real browser by editing a populated line's description and checking the catalogue record itself was unaffected.
- **`LineItemsSection`/`LineItemRow`'s new item-picker props are optional, defaulting to off** - `InvoiceDetail.tsx` (`IG-47`'s saved-invoice edit page) reuses `LineItemsSection` too, but never wired up `IG-56`'s `CustomerPicker` there either; this Story's scope is invoice *creation*, so that page needed no changes.
- No backend changes - `GET /api/v1/items` (from `IG-57`) already returns exactly what this Story needs (active, account-owned items).

Files changed or created (`IG-58`):

- `frontend/app/invoice/create/lib/{itemPicker,itemPicker.test}.ts` (new)
- `frontend/app/invoice/create/components/{ItemPicker,ItemPicker.test}.tsx` (new)
- `frontend/app/invoice/create/components/{LineItemRow,LineItemsSection,CreateInvoiceEditor}.tsx` (extended: wiring, `handleSelectCatalogItem`, catalogue-items fetch)
- `frontend/app/invoice/create/components/CreateInvoiceEditor.test.tsx` (extended: 5 new integration tests)
- `backlog.md`

Verification performed (`IG-58`):

- Frontend suite: 539/539 passing (17 new: pure mapping/filtering logic, the picker component, editor-integration coverage). `npx eslint .` and `npm run build` both clean. Backend suite re-confirmed unaffected at 277/277 (no backend changes).
- Real-browser verification via Playwright: created a catalogue item, selected it on an invoice line, confirmed all four fields populated and Quantity stayed at its default, then confirmed editing the line's description afterward left the catalogue record itself unchanged - 7/7 checks passed.
- Committed locally only (`93d766a`) - not pushed by default (standing workflow).

Prior execution, still relevant context (superseded by the "Current Project Status"/"Current Focus"/"Next Task" sections above, kept here as project history only):

**Date:** 2026-09-07 (later same day)

Completed: `IG-57` ("Manage product and service records", S45).

- **Full CRUD for `catalog.items`**, mirroring `CustomerService`'s account-ownership pattern exactly (never a caller-supplied business id) - the `CatalogItem` domain entity and its EF configuration already existed (scaffolded early, never wired up); this added everything above them: `CatalogItemDto`/`CatalogItemRequest`, `ICatalogItemService`/`CatalogItemService`, `CatalogItemRequestValidator`, and `CatalogEndpoints` (`GET`/`POST`/`PUT`/`DELETE /api/v1/items`).
- **Validation follows FSD section 60 exactly**: Name and Unit Price are the only required fields. Tax rate is bounded 0-100, the same bound `InvoiceCalculationRequestValidator` already enforces on line items - a catalogue item's tax rate feeds directly into that same calculation once selected on an invoice, so it can't be a value the calculator would itself reject.
- **`POST /api/v1/items/{id}/duplicate` added** for FSD section 59's Duplicate list action (not in `IG-57`'s own Jira AC, but present in the FSD's fuller feature description, matching how `IG-55`'s "Create Invoice" row action also went beyond `IG-55`'s own bare AC) - creates a real independent copy (own id, `"{name} (Copy)"`), not a reference, confirmed by editing the duplicate and checking the original is untouched.
- **Frontend**: `/items` (list - Name/Description/Unit/Price/Tax/Status per FSD section 59, with Edit/Duplicate/Archive), `/items/new`, `/items/[id]` (view/edit/archive - no restore, same documented limitation as `CustomerDetail`, no unarchive endpoint exists yet). Added an "Items" link to `SiteHeader`'s signed-in navigation.
- **Real end-to-end browser verification** (Playwright, ad-hoc script, cleaned up afterward): created an item, edited its price, duplicated it, archived the original - confirmed the archived original disappears from the default list while the untouched duplicate remains visible.

Files changed or created (`IG-57`):

- `backend/src/InvoiceApp.Application/Catalog/{CatalogItemDto,CatalogItemRequest,ICatalogItemService}.cs` (new)
- `backend/src/InvoiceApp.Infrastructure/Catalog/{CatalogItemService,CatalogServiceCollectionExtensions}.cs` (new)
- `backend/src/InvoiceApp.Modules.Catalog/CatalogItemRequestValidator.cs` (new)
- `backend/src/InvoiceApp.Api/Endpoints/CatalogEndpoints.cs` (new); `Program.cs` (extended: `AddInfrastructureCatalog`, `MapCatalogEndpoints`)
- `backend/tests/InvoiceApp.Infrastructure.Tests/Modules/Catalog/CatalogItemRequestValidatorTests.cs` (new, 8 tests)
- `backend/tests/InvoiceApp.Api.Tests/Catalog/CatalogEndpointsTests.cs` (new, 10 tests)
- `frontend/app/lib/items.ts` (new)
- `frontend/app/items/{page.tsx,components/{ItemForm,ItemListView}.tsx,new/{page.tsx,components/CreateItemForm.tsx},[id]/{page.tsx,components/ItemDetail.tsx}}` (new, plus one `.test.tsx` per component, 21 tests total)
- `frontend/app/components/landing/SiteHeader.tsx` (extended: Items nav link)
- `backlog.md`

Verification performed (`IG-57`):

- Full backend suite: 277/277 passing (14 architecture + 128 infrastructure + 135 API, up from 258 - 18 new). Full frontend suite: 521/521 passing (up from 500 - 21 new); `npx eslint .` and `npm run build` both clean.
- Real-browser verification via Playwright (see Completed above) - 9/9 checks passed.
- Committed locally only (`26588bc`) - not pushed by default (standing workflow).

Prior execution, still relevant context (superseded by the "Current Project Status"/"Current Focus"/"Next Task" sections above, kept here as project history only):

**Date:** 2026-09-07

Completed: `IG-52` ("Complete or skip guided onboarding", S40) — the last Story in Epic `IG-8`, which is now Done.

- **Real server-side file storage added, the first in this app**: `IBusinessLogoStorage`/`BusinessLogoStorage` (local disk under `App_Data/business-logos`, keyed by business id, extension implied by content type). Backs a genuine "Upload Logo" onboarding step (FSD section 116) that had been deferred twice before (`IG-42`, `IG-53`) for lacking exactly this. `BusinessProfileDto` now includes `LogoUrl`.
- **New endpoints**: `POST`/`DELETE /api/v1/business/logo` (authenticated, server-side validated via `BusinessLogoValidator` - same MIME/5MB/magic-byte-signature rules as the frontend's existing `invoice/create/lib/logoUpload.ts`, defense in depth) and an anonymous `GET /api/v1/business/logo/{businessId}` - deliberately keyed by id rather than session, since a logo must render in `<img>` tags and PDF/print output an unauthenticated invoice recipient can view (same reasoning `IG-28` established for anonymous invoice creation). `POST` needed `.DisableAntiforgery()` - ASP.NET Core 8 auto-requires an antiforgery token on any `IFormFile`-binding endpoint, and this app has no antiforgery middleware anywhere (confirmed by actually hitting the endpoint and getting a 500 first, not assumed).
- **5-step onboarding wizard** at `/onboarding` (Business Name, Country, Currency, Tax Registration, Upload Logo), shown after registration instead of the homepage - `IG-31`'s pending-Download/Print-gate redirect to `/invoice/create` still takes priority. "Tax Registration" is read as covering both Registration Number and Tax Number together (FSD names one step, the Business entity has always had both as separate fields since `IG-53`).
- **"Skip" genuinely skips, not just advances**: every step (Skip or Save & Continue) persists via the same `PUT /api/v1/business` call, but Skip specifically reverts only *that step's own* field(s) to their last-saved value first - a user who types something then clicks Skip doesn't have it silently saved anyway, which would have made the label dishonest. Other steps' already-saved edits are carried forward regardless. A separate, persistent "Skip onboarding" link exits immediately from any step with no further save.
- **Shared `BusinessLogoUpload` component** (`frontend/app/components/business/`) used by both the wizard and the existing Business Profile settings page - reuses `IG-42`'s exact validation/resize logic (`invoice/create/lib/logoUpload.ts`) rather than duplicating it, only adding the actual upload call that logic never had a server to talk to before now.
- **Real end-to-end browser verification** (Playwright, ad-hoc script, cleaned up afterward): registered a fresh account, confirmed the `/onboarding` redirect, saved the business name, skipped Country and Currency, filled and saved Tax Registration, uploaded a real PNG, confirmed the thumbnail appeared, finished to `/invoice/create`, then independently reloaded `/settings/business` and confirmed the saved name/tax number/logo were all actually persisted (not just reflected in in-memory state) - including fetching the logo URL directly and checking its content-type.

Files changed or created (`IG-52`):

- `backend/src/InvoiceApp.Application/Businesses/{IBusinessLogoStorage,IBusinessService,BusinessProfileDto}.cs` (new/extended)
- `backend/src/InvoiceApp.Infrastructure/Businesses/{BusinessLogoStorage,BusinessService,BusinessesServiceCollectionExtensions}.cs` (new/extended)
- `backend/src/InvoiceApp.Modules.Businesses/BusinessLogoValidator.cs` (new)
- `backend/src/InvoiceApp.Api/Endpoints/BusinessEndpoints.cs` (extended: logo upload/remove/get)
- `backend/tests/InvoiceApp.Api.Tests/Businesses/BusinessLogoEndpointsTests.cs` (new, 10 tests)
- `backend/tests/InvoiceApp.Infrastructure.Tests/Businesses/BusinessServiceConcurrencyTests.cs` (extended: `NoopBusinessLogoStorage` test double for the new constructor parameter)
- `frontend/app/components/business/{BusinessLogoUpload,BusinessLogoUpload.test}.tsx` (new)
- `frontend/app/onboarding/{page.tsx,components/OnboardingWizard.tsx,components/OnboardingWizard.test.tsx,lib/onboarding.ts,lib/onboarding.test.ts}` (new)
- `frontend/app/lib/business.ts` (extended: `logoUrl`, `uploadBusinessLogo`, `removeBusinessLogo`, `resolveLogoUrl`)
- `frontend/app/settings/business/components/BusinessProfileSettings.tsx` (extended: renders `BusinessLogoUpload`)
- `frontend/app/signup/components/RegisterForm.tsx` (redirect target `/` → `/onboarding`)
- `.gitignore` (extended: `**/App_Data/`, `*.tsbuildinfo`)
- `backlog.md`

Verification performed (`IG-52`):

- Full backend suite: 258/258 passing (14 architecture + 119 infrastructure + 125 API, up from 248 - 10 new logo endpoint tests). Full frontend suite: 500/500 passing (up from 484 - 16 new tests across the wizard, its lib, and the shared logo component); `npx eslint .` and `npm run build` both clean.
- Real-browser verification via Playwright (see Completed above) - 11/11 checks passed.
- Committed locally only (`998d73e`) - not pushed by default (standing workflow), though the user did ask for a push earlier this session covering the prior Jira-reconciliation/IG-46 commits.

Prior execution, still relevant context (superseded by the "Current Project Status"/"Current Focus"/"Next Task" sections above, kept here as project history only):

**Date:** 2026-09-03 (later same day)

Completed: `IG-46` ("Assign unique invoice numbers", S34) — the last Story in Epic `IG-7`, which is now Done.

- **Real concurrency bug fixed, not just a theoretical one**: `BusinessService.GenerateNextInvoiceNumberAsync` (built in `IG-54`) did a plain read-then-write - read `NextInvoiceNumber`, increment in memory, `SaveChangesAsync`. Replaced with a single `UPDATE business.businesses SET next_invoice_number = next_invoice_number + 1 ... RETURNING next_invoice_number - 1` raw SQL statement, atomic by construction via Postgres's own row-level locking on the row. EF Core's `Database.SqlQueryRaw<T>()` needed `.ToListAsync()` rather than `.SingleAsync()` - the latter tries to compose a row-limit onto the raw SQL as a subquery, which fails since `UPDATE ... RETURNING` isn't composable the way a `SELECT` is (confirmed by actually running it, not assumed).
- **New Postgres-backed test infrastructure**: zero backend tests used a real Postgres provider before this - every test project used EF Core's `UseInMemoryDatabase`, which cannot prove concurrency safety. Added `PostgresAvailabilityFixture` + `BusinessServiceConcurrencyTests` (`backend/tests/InvoiceApp.Infrastructure.Tests/Businesses/`), reusing the existing `invoiceapp-postgres` docker container (port 5433) rather than Testcontainers, per explicit user choice. Isolation is per-test-row (a fresh `Business`/`ApplicationUser` pair created and deleted per test), not a shared rollback transaction - a shared transaction would force "concurrent" calls through one connection, defeating the point.
- **Proved the test actually catches the bug, not just that it passes**: temporarily reverted the fix, ran the new test - 30 concurrent calls produced only 5 distinct numbers. Restored the fix, reran - all 30 distinct.
- **Skip-not-fail decided and documented**: this repo's `.github/workflows/ci.yml` backend job runs `dotnet test` with no Postgres service container, so a hard failure would break every CI run. Both new Postgres-backed tests skip gracefully (via the `Xunit.SkippableFact` package) when unreachable - verified both paths directly (container stopped -> Skipped; container running -> Passed), not just reasoned about.
- **One existing test broke as a direct, necessary consequence, not scope creep**: `BusinessEndpointsTests.Generates_a_formatted_next_invoice_number_and_increments_it` used the shared `AuthenticatedRouteTestFactory`'s InMemory database, which can't execute the new Postgres-specific raw SQL at all. Added an optional Postgres-connection-string override to that factory (defaults to the existing InMemory behavior for every other test, unchanged) and moved just this one test onto the real container, with its own cleanup (deletes the test account/business row it creates).
- **No frontend change needed** - the AC ("concurrent creation cannot produce duplicate numbers") is fully satisfied server-side; the existing `/api/v1/business/next-invoice-number` endpoint and its frontend caller from `IG-54` are unchanged. Kept `CreateInvoiceEditor.tsx` untouched entirely, per the standing caution against unscoped changes to that file.

Files changed or created (`IG-46`):

- `backend/src/InvoiceApp.Infrastructure/Businesses/BusinessService.cs` (`GenerateNextInvoiceNumberAsync` rewritten to the atomic `UPDATE ... RETURNING`)
- `backend/tests/InvoiceApp.Infrastructure.Tests/Businesses/{PostgresAvailabilityFixture,BusinessServiceConcurrencyTests}.cs` (new)
- `backend/tests/InvoiceApp.Infrastructure.Tests/InvoiceApp.Infrastructure.Tests.csproj` (extended: `Xunit.SkippableFact`)
- `backend/tests/InvoiceApp.Api.Tests/Authentication/AuthenticatedRouteTestFactory.cs` (extended: optional `postgresConnectionStringOverride`)
- `backend/tests/InvoiceApp.Api.Tests/Businesses/BusinessEndpointsTests.cs` (`Generates_a_formatted_next_invoice_number_and_increments_it` moved onto the real Postgres container, with cleanup)
- `backend/tests/InvoiceApp.Api.Tests/InvoiceApp.Api.Tests.csproj` (extended: `Xunit.SkippableFact`)
- `backlog.md`

Verification performed (`IG-46`):

- Full backend suite: 248/248 passing (14 architecture + 119 infrastructure + 115 API, up from 247 - the 1 new concurrency test). Frontend: full suite (484 tests), `npx eslint .`, and `npm run build` all clean (frontend wasn't touched, but re-verified per the standing four-command gate).
- Confirmed the new concurrency test fails against the old code and passes against the fix (see Completed above) - not just that it's green now.
- Confirmed both the skip path (Postgres stopped) and the run path (Postgres started) work as intended, by actually stopping and restarting the `invoiceapp-postgres` container mid-session.
- Committed locally only (`cd66f07`) - not pushed (standing workflow, unchanged).

Prior execution, still relevant context (superseded by the "Current Project Status"/"Current Focus"/"Next Task" sections above, kept here as project history only):

**Date:** 2026-09-03

Completed (audit follow-up — paused new feature development to restore a trustworthy baseline, per explicit user instruction):

- **Fixed a real production-build failure**: `frontend/app/documents/invoices/page.tsx`'s `InvoiceListView` calls `useSearchParams()` with no Suspense boundary anywhere in its ancestor tree — Next.js's App Router requires one on a statically-rendered route, or `next build` fails outright. Wrapped it in `<Suspense fallback={...}>`. This had shipped across several prior commits because `next build` had never actually been run this session (only `tsc`/`eslint`/`vitest` were checked before each push) — adopted a standing four-command gate (`dotnet test`, `eslint`, `npm test`, `npm run build`) going forward specifically to prevent a repeat.
- **Fixed the real root cause of frontend test flakiness, not just the symptom**: found and fixed a second unprotected `vi.useFakeTimers()`/`vi.useRealTimers()` pair in `CreateInvoiceEditor.test.tsx` (a draft-retention test) that had no `try/finally` or `afterEach` cleanup net, so a thrown assertion before its own `useRealTimers()` call would leak fake timers into every later test in the file — the same bug class fixed once already earlier this session in the same file. Fixed by moving `vi.useRealTimers()` into the file's `afterEach` (unconditional, harmless no-op if fake timers were never installed), matching the pattern already used in `pendingGateAction.test.ts`/`draftStorage.test.ts`.
- **Empirically re-measured `testTimeout` instead of assuming a value**, per explicit instruction not to treat raising it as the final answer: ran the full suite 3x at the 5000ms default after the fix above — still failed 7-9 tests every run, confirming genuine CPU-contention-driven flakiness under parallel test-file execution independent of the timer-leak bug (matching `IG-37`'s original diagnosis). 10000ms passed 484/484 cleanly across 5 consecutive runs; kept at 10000ms (down from the prior, unverified 15000ms).
- **Reconciled Jira project-wide**: a full paginated audit (all Epics/Stories/Subtasks) found exactly one class of inconsistency — 38 Subtasks across all 19 then-Done Stories still at To Do despite each one's own summary describing work already completed and verified as part of its Done parent Story. Confirmed the pattern held with no exceptions across all 19 Stories (spanning both this session's work and Codex's earlier `IG-28`-`IG-32` work) before proposing the transition list to the user and getting explicit approval; all 38 transitioned to Done. No Epic/Story mismatch, no stray non-standard status, found anywhere else in the project.
- **Rewrote this file** (`backlog.md`) to reflect actual current position — previously synced to commit `df9516a` (2026-08-25, mid-Epic-5), now current through `0b38daa`, roughly 26 commits and 5 Epics of drift corrected. Older narrative preserved below rather than deleted, for history.

Files changed or created (audit follow-up):

- `frontend/app/documents/invoices/page.tsx` (Suspense boundary added around `InvoiceListView`)
- `frontend/app/invoice/create/components/CreateInvoiceEditor.test.tsx` (`afterEach` now unconditionally calls `vi.useRealTimers()`; redundant manual call removed from the one test that already needed it)
- `frontend/vitest.config.ts` (`testTimeout` 15000 → 10000, with a comment documenting the measurement)
- `backlog.md`

Verification performed (audit follow-up):

- `npm run build` succeeds; `/documents/invoices` now listed as `○ (Static)`.
- Full frontend suite (484 tests) run 5 consecutive times at the new 10000ms timeout — clean every time. Backend suite (247 tests), `npx eslint .`, and `npm run build` all clean.
- Committed locally only, not pushed (standing workflow, unchanged).

Prior execution, still relevant context (superseded by the "Current Project Status"/"Current Focus"/"Next Task" sections above, kept here as project history only):

**Date:** 2026-08-25 Australia/Sydney

Completed:

- Implemented `IG-121 — Implement supporting invoice content fields` and `IG-122 — Verify supporting content rendering` (T049/T050, S25/`IG-37`), together in one pass. Both Subtasks Done; parent Story `IG-37` Done — the fifth Story in Epic `IG-5`, leaving only `IG-38` (S26) before the Epic itself is complete.
- Notes (FSD §30, max 2,000 chars) and Terms and Conditions (FSD §31, max 5,000 chars) implemented as multiline fields via a new reusable `TextAreaField` component (sibling to `FormField`, same blur-then-validate contract).
- **FSD §32 turned out to define Payment Instructions as 8 distinct structured fields (Bank Name, Account Name, BSB/Routing Number, Account Number, IBAN, SWIFT, Payment Reference, Custom Instructions), not one free-text block** - built as 7 short optional inputs (reusing `PartyDetailsSection`, data-driven from a `FieldConfig[]` exactly like Seller/Customer) plus a Custom Instructions textarea. Lengths aren't specified by FSD for these; chosen deliberately and documented in `lib/supportingContent.ts` (e.g. IBAN 50 chars, SWIFT 20).
- **Another FSD-vs-schema mismatch flagged, not silently resolved**: `docs/DATABASE_SCHEMA.md`'s `invoice.invoices` table has one flat `payment_instructions` text column, not 8 separate ones - same class of gap as the Seller "Contact Name" mismatch found in `IG-34`/`IG-115`. A future Invoice Persistence Story (`IG-7`) will need to decide how to serialize the 8 structured fields into that column (or add columns).
- The preview only renders each of the three sections (and, within Payment Instructions, each individual sub-field) when it actually has content - IG-122's "optional empty sections do not create misleading output" criterion, satisfied structurally rather than by an extra check bolted on afterward.
- **Found and fixed a real performance bug**: `CreateInvoiceEditor` lifts all state to one component, so typing into Notes/Terms (which don't affect invoice totals at all) was still triggering a full totals recalculation (`calculateInvoiceTotals` over every line item) on every keystroke. Fixed with `useMemo`, keyed only on what actually affects totals (line items, discount type/value) - confirmed via a real-browser pass and by a test that was timing out under load before the fix, passing comfortably after it.
- **Found and fixed suite-wide test flakiness while investigating the above**: Vitest's default 5-second test timeout was occasionally too tight once all 26 test files ran in parallel under CPU contention - re-runs showed it hitting unrelated, untouched tests too, not just the new ones. Raised to 15 seconds in `vitest.config.ts`; confirmed stable across 8 consecutive full-suite runs afterward. Also switched the two slowest new tests from `user.type()` (per-character keystroke simulation) to `user.paste()` (sets the whole value in one operation) since they only cared about the final value, not per-key behaviour.
- One thing intentionally deferred, flagged in the Jira comments rather than silently skipped: "final output" / PDF rendering consistency (IG-122's criterion) can't be checked yet - Epic `IG-6` (Templates, Live Preview, PDF and Print) isn't built.

Files changed or created (`IG-121`/`IG-122`):

- `frontend/app/invoice/create/lib/supportingContent.ts` (new) — NOTES_FIELD, TERMS_FIELD, CUSTOM_INSTRUCTIONS_FIELD, PAYMENT_INSTRUCTION_FIELDS, SupportingContentValues, createEmptySupportingContent, validateSupportingContent, hasAnyPaymentInstructionContent
- `frontend/app/invoice/create/lib/supportingContent.test.ts` (new)
- `frontend/app/invoice/create/components/TextAreaField.tsx` (new); `TextAreaField.test.tsx` (new)
- `frontend/app/invoice/create/components/SupportingContentSection.tsx` (new); `SupportingContentSection.test.tsx` (new)
- `frontend/app/invoice/create/components/CreateInvoiceEditor.tsx` (extended: supporting-content state/handlers, `useMemo` on totals); `CreateInvoiceEditor.test.tsx` (extended: 3 new integration tests, 2 tests switched to `user.paste()`)
- `frontend/app/invoice/create/components/InvoicePreview.tsx` (extended: conditional Notes/Terms/Payment Instructions sections)
- `frontend/vitest.config.ts` (extended: `testTimeout: 15000`)
- `backlog.md`

Verification performed (`IG-121`/`IG-122`):

- 20 new tests (see Completed above for what's covered). Full frontend suite (161 tests) passes reliably - re-run 8+ times after the timeout/performance fixes to confirm stability, not just once; `npm run lint`/`npm run build` clean.
- **Real-browser verification** via an ad-hoc Playwright script: 14/14 checks passed, including empty-vs-populated preview states for all three sections and confirming the browser's own `maxlength` attribute enforces Notes' cap natively.
- Committed locally only - not pushed by default (though the user did explicitly ask for a one-time push earlier in this session, covering commits through `IG-119`/`IG-120` - see git log); no CI run initiated by this round's work specifically.

Prior execution, still relevant context:

- Implemented `IG-119 — Implement authoritative invoice calculations` and `IG-120 — Test calculation and rounding consistency` (T047/T048, S24/`IG-36`), together in one pass. Both Subtasks Done; parent Story `IG-36` Done — the fourth Story in Epic `IG-5`. **This Story genuinely needed backend work**, confirmed by reading FSD §28 ("Backend calculation result should be authoritative") and `docs/SAD.md` §18 (lists "Calculations" as a core Invoicing-module responsibility) before starting, rather than assuming it was frontend-only like `IG-33`-`IG-35`.
- **New backend**: `POST /api/v1/invoices/calculate` - stateless, no auth, no persistence (Epic `IG-7` isn't built - this is calculation only, not `CreateInvoice`). `InvoiceCalculator` (`InvoiceApp.Modules.Invoicing/Calculations/`, static, first real code in that previously-empty project) implements FSD §26's 8-step sequence and §27's formula, with invoice-level discount (FSD §23) pro-rated across lines by their share of the subtotal so multi-rate invoices are handled correctly, and FSD §29's tax-inclusive mode (backs tax out of the entered price) verified exactly against FSD's own worked example ($110 inclusive @ 10% → $100/$10/$110). Rounding (FSD §28) happens once, on output only, using round-half-up to match FSD's own "10.555 → 10.56" example. Enums now serialise as readable JSON strings (`JsonStringEnumConverter` added globally in `Program.cs`).
- **New frontend**: `lib/invoiceTotals.ts` is a deliberate algorithmic mirror of the C# calculator (FSD §28 explicitly allows a frontend calculation for immediate preview), wired into a new Invoice Discount control + Totals section (Subtotal/Discount/Tax/Total/Amount Due) in both `CreateInvoiceEditor` and `InvoicePreview`. Tax-inclusive/exclusive isn't exposed as a per-invoice control - it's a business setting with no settings page yet (Epic `IG-8`), so the frontend always calculates exclusive; the engine itself supports and is tested for both modes.
- **IG-120's "match across frontend and backend" criterion proven via shared test fixtures**, not a live network call: the same 11 representative/boundary cases exist with identical expected numbers in both `InvoiceCalculatorTests.cs` and `invoiceTotals.test.ts` - deliberately, since this page has no Save/Submit action yet to naturally trigger a real call (that's `IG-7`'s job).
- **Real-browser verification (Playwright) caught and fixed a genuine bug**: an invoice discount percentage over 100% was correctly flagged invalid by the validation message, but the calculation itself only clamped the `Fixed` discount type, not `Percentage` - so the Totals section briefly showed negative figures (Subtotal -$50, Total -$55) alongside the error while a user was mid-typing an out-of-range value. Fixed by clamping `Percentage` to 0-100 in both `invoiceTotals.ts` and (for defence-in-depth/symmetry, even though the backend's own validator already rejects this input before `Calculate` runs) `InvoiceCalculator.cs`. Screenshotted before and after; regression tests added on both sides.
- **A real JS floating-point rounding bug was also caught and fixed while implementing the frontend side**: `10.555 * 100` in JS floating point is `1055.4999999999998`, not `1055.5`, so a naive `Math.round` would give `10.55` instead of FSD §28's own stated `10.56` - fixed with a small, documented epsilon nudge in `invoiceTotals.ts`'s `round()` (C#'s `decimal` type doesn't have this problem, being base-10 exact).

Files changed or created (`IG-119`/`IG-120`):

- `backend/src/InvoiceApp.Application/Invoicing/{InvoiceCalculationRequest,InvoiceCalculationResult}.cs` (new)
- `backend/src/InvoiceApp.Modules.Invoicing/Calculations/{InvoiceCalculator,InvoiceCalculationRequestValidator}.cs` (new)
- `backend/src/InvoiceApp.Api/Endpoints/InvoiceEndpoints.cs` (new); `Program.cs` (extended: `MapInvoiceEndpoints`, global `JsonStringEnumConverter`)
- `backend/tests/InvoiceApp.Infrastructure.Tests/Modules/Invoicing/Calculations/{InvoiceCalculatorTests,InvoiceCalculationRequestValidatorTests}.cs` (new)
- `backend/tests/InvoiceApp.Api.Tests/Invoicing/InvoiceCalculationTests.cs` (new)
- `frontend/app/invoice/create/lib/invoiceTotals.ts` (new); `lib/lineItems.ts` (extended: `toCalculationInput`)
- `frontend/app/invoice/create/lib/invoiceTotals.test.ts` (new)
- `frontend/app/invoice/create/components/InvoiceTotalsSection.tsx` (new)
- `frontend/app/invoice/create/components/InvoiceTotalsSection.test.tsx` (new)
- `frontend/app/invoice/create/components/CreateInvoiceEditor.tsx` (extended: discount state/handlers, wires `InvoiceTotalsSection`); `CreateInvoiceEditor.test.tsx` (extended)
- `frontend/app/invoice/create/components/InvoicePreview.tsx` (extended: real Subtotal/Discount/Tax/Total, replacing the `IG-35`-era naive "Items subtotal")
- `frontend/app/invoice/create/components/LineItemsSection.tsx` (extended: removed the now-superseded "Items subtotal" footer); `LineItemsSection.test.tsx` (extended)
- `backlog.md`

Verification performed (`IG-119`/`IG-120`):

- 26 new backend tests + 20 new frontend tests (see Completed above). Full backend suite (140 tests: 14 architecture + 98 infrastructure + 28 API) and frontend suite (144 tests) pass; `npm run lint`/`npm run build` and `dotnet build` all clean.
- **Real end-to-end verification against both a live Postgres-backed API and a real browser**: curl-verified the exact FSD §29 worked example, confirmed a >100% percentage is rejected with 400 by the endpoint's own validator, confirmed a large fixed discount clamps correctly server-side; Playwright-verified the full discount-entry flow in Chromium including the bug found and fixed mid-session (see Completed above).
- Committed locally only - not pushed; no CI run this round (local-commit-only workflow, unchanged from prior sessions).

Prior execution, still relevant context:

- Implemented `IG-117 — Implement invoice line-item interactions` and `IG-118 — Validate line-item edge cases` (T045/T046, S23/`IG-35`), together in one pass. Both Subtasks Done; parent Story `IG-35` Done — the third Story in Epic `IG-5`.
- All fields from FSD §17-23 implemented (Description, Quantity, Unit, Unit Price, Tax Rate with a "Custom" free-entry option, line-level Discount), plus Add/Remove/Duplicate/Move-Up/Move-Down actions (FSD §24) extending `CreateInvoiceEditor.tsx` alongside `IG-34`'s header/party fields. New `lib/lineItems.ts` holds the field defaults, per-line calculation (`computeLineTotals`, `sumLineTotals`) and validation, following the same data-driven pure-function pattern as `lib/fields.ts`.
- **FSD §24's exact "clear instead of remove" rule implemented**: with only one line item left, its "Remove" button relabels to "Clear" and empties the row's fields rather than deleting it, so an invoice always has >= 1 item - structurally guarantees the "minimum items" requirement rather than validating it after the fact.
- **Scope boundary held deliberately**: per-line Line Total (FSD §27's line-level formula) is computed and shown live in both the editor and the preview's new line-items table, explicitly labelled as a frontend-only preview figure - but the invoice-wide Subtotal/Discount/Tax/Total roll-up (FSD §26's full 8-step engine) was NOT built here; that's `IG-36`/S24's job, and the Jira comment on `IG-35` explicitly tells that Story to reuse `computeLineTotals`/`sumLineTotals` rather than re-deriving line math.
- Reordering (Move Up/Down) uses simple buttons, not drag-and-drop - avoids pulling in a DnD library for something two accessible, keyboard-operable buttons already satisfy.
- **Real-browser verification caught and fixed a real polish gap**: the editor's own "Items subtotal" line was missing its currency code (showed a bare "0.00" while the preview correctly showed "AUD 0.00") - fixed by threading `currency` down into `LineItemsSection`, re-verified after the fix.
- One thing intentionally deferred, flagged in the Jira comments rather than silently skipped: Item Catalogue Lookup (FSD §25, typing into description searches saved products) needs saved catalogue records - Epic `IG-9` isn't built yet, same class of gap as `IG-34`'s Registered Customer Lookup deferral.

Files changed or created (`IG-117`/`IG-118`):

- `frontend/app/invoice/create/lib/lineItems.ts` (new) — LineItem type, createEmptyLineItem, cloneLineItem, computeLineTotals, sumLineTotals, validateLineItem(s), UNIT_OPTIONS, TAX_RATE_PRESETS
- `frontend/app/invoice/create/lib/lineItems.test.ts` (new)
- `frontend/app/invoice/create/components/LineItemRow.tsx` (new) — one line item's fields + reorder/duplicate/remove controls
- `frontend/app/invoice/create/components/LineItemsSection.tsx` (new) — the list, Add Item, items subtotal
- `frontend/app/invoice/create/components/LineItemsSection.test.tsx` (new)
- `frontend/app/invoice/create/components/CreateInvoiceEditor.tsx` (extended: line-item state + handlers, wires `LineItemsSection` into the editor pane)
- `frontend/app/invoice/create/components/CreateInvoiceEditor.test.tsx` (extended: 2 new integration tests)
- `frontend/app/invoice/create/components/InvoicePreview.tsx` (extended: real line-items table + items subtotal, replacing the `IG-34`-era static placeholder text)
- `backlog.md`

Verification performed (`IG-117`/`IG-118`):

- 37 new tests: pure calculation/validation unit tests (`lineItems.test.ts`), `LineItemsSection` component tests (add/remove/duplicate/reorder/clear-last-row/validation), 2 new `CreateInvoiceEditor` integration tests. Full frontend suite (121 tests) passes; `npm run lint`/`npm run build` clean.
- **Real-browser verification** via an ad-hoc Playwright script: 17/17 checks passed (add/reorder/duplicate/remove/clear-last-row sequence, preview staying in sync through every structural change, required-description and out-of-range-custom-tax-rate validation) - one real polish gap found and fixed mid-verification (see Completed above), then re-confirmed with a follow-up script pass.
- Committed locally only - not pushed; no CI run this round (local-commit-only workflow, unchanged from prior sessions).

Prior execution, still relevant context:

- Implemented `IG-115 — Implement invoice, seller and customer fields` and `IG-116 — Validate party and header inputs` (T043/T044, S22/`IG-34`), together in one pass. Both Subtasks Done; parent Story `IG-34` Done — the second Story in Epic `IG-5`.
- All fields from FSD §12 (invoice header: number, issue/due date, currency, reference), §13 (seller, 13 fields, AU-labelled registration/tax fields) and §15 (customer, 11 fields) implemented, rendered inside `IG-33`'s `InvoiceEditorLayout`. Field configs (name/label/required/maxLength/type) live in a single data-driven source of truth, `lib/fields.ts`, cross-checked against `docs/DATABASE_SCHEMA.md`'s businesses/customers column lengths.
- Validation: required + maxLength + email/url format per field, plus a cross-field rule (due date can't precede issue date, FSD §12). Shows on blur, then live-revalidates on every keystroke once a section has an error so a correction clears it immediately - no field is ever programmatically cleared, valid or not.
- The `/invoice/create` preview panel (a static placeholder since `IG-33`) now reflects entered header/seller/customer data live, since it's rendered from the same lifted state the form writes to.
- **Client-only date defaulting**: Issue/Due Date default to "today", computed in a `useEffect` after mount rather than during render - this page is statically prerendered, so computing "today" during render would bake in the build date for every visitor rather than their actual today, and would also risk a server/client hydration mismatch. Due Date defaults equal to Issue Date (0-day terms), matching `docs/DATABASE_SCHEMA.md`'s actual `default_payment_terms = DueOnReceipt` default rather than FSD §12's "14 days," which is only an illustrative example of the formula, not a mandated default.
- **Doc mismatch flagged, not silently resolved**: FSD §13 lists "Contact Name" as a Seller field; `docs/DATABASE_SCHEMA.md`'s `business.businesses` table has no such column (it has an unrelated `legal_name` column instead). Doesn't block this frontend-only Story; needs reconciling before a backend Story persists seller data.
- **Real-browser verification caught a genuine, non-bug interaction detail jsdom couldn't show**: Chromium's native `<input type="date">` has internal day/month/year segments, so a single Tab press moves between segments rather than blurring the control - confirmed the validation itself was correct all along by using a real click-away instead, and documented the finding for future date-field UX work.
- Two things intentionally deferred, flagged in the Jira comments rather than silently skipped: Invoice Number uniqueness (needs a backend, `IG-7` isn't built) and Registered Customer Lookup / FSD §16 (needs saved customer records, `IG-9` isn't built).

Files changed or created (`IG-115`/`IG-116`):

- `frontend/app/invoice/create/lib/fields.ts` (new) — FieldConfig type, validateField, HEADER_FIELDS/SELLER_FIELDS/CUSTOMER_FIELDS, CURRENCY_OPTIONS
- `frontend/app/invoice/create/lib/fields.test.ts` (new)
- `frontend/app/invoice/create/lib/invoiceDraft.ts` (new) — InvoiceDraft type, createEmptyDraft, todayIsoDate, validateHeaderFields, hasAnyError
- `frontend/app/invoice/create/lib/invoiceDraft.test.ts` (new)
- `frontend/app/invoice/create/components/FormField.tsx` (new) — generic labelled input with blur-then-live validation
- `frontend/app/invoice/create/components/FormField.test.tsx` (new)
- `frontend/app/invoice/create/components/InvoiceHeaderSection.tsx` (new)
- `frontend/app/invoice/create/components/PartyDetailsSection.tsx` (new) — shared rendering for Seller/Customer
- `frontend/app/invoice/create/components/InvoicePreview.tsx` (new) — now a real live preview, not a placeholder
- `frontend/app/invoice/create/components/CreateInvoiceEditor.tsx` (new) — client component lifting all form state, composing the sections into `InvoiceEditorLayout`
- `frontend/app/invoice/create/components/CreateInvoiceEditor.test.tsx` (new)
- `frontend/app/invoice/create/page.tsx` (extended: renders `CreateInvoiceEditor` instead of the `IG-33` placeholder)
- `frontend/app/invoice/create/page.test.tsx` (updated for the new real content)
- `backlog.md`

Verification performed (`IG-115`/`IG-116`):

- 28 new tests across validator unit tests, `FormField` component tests, and a `CreateInvoiceEditor` integration test (see Completed above for what's covered). Full frontend suite (83 tests) passes; `npm run lint` and `npm run build` both clean.
- **Real-browser verification** via an ad-hoc Playwright script against the live `npm run dev` server: 12/12 checks passed, including hydration-safety (no console errors on load), correct date defaults, live preview updates, required-field error appearing then clearing live, the cross-field due-date rule, and mobile tab-switch preserving entered data with real form fields (not `IG-33`'s synthetic test input). One real browser-behaviour quirk found and confirmed as expected native behaviour, not a defect (see Completed above).
- Committed locally only - not pushed; no CI run this round (local-commit-only workflow, unchanged from prior sessions).

Prior execution, still relevant context:

- Implemented `IG-113 — Build desktop and mobile editor layouts` and `IG-114 — Verify responsive editor accessibility` (T041/T042, S21/`IG-33`), together in one pass. Both Subtasks Done; parent Story `IG-33` Done — the first Story in Epic `IG-5` (Invoice Editor and Calculation Engine), now the active Epic since `IG-3` has no remaining unclaimed Stories.
- New route `/invoice/create` (FSD §10.1) with a reusable `InvoiceEditorLayout` component (`frontend/app/invoice/create/components/InvoiceEditorLayout.tsx`): desktop two-column grid (55% editor / 45% preview per FSD §11), mobile single-column behind ARIA-pattern Edit/Preview tabs (roving `tabindex`, ArrowLeft/ArrowRight navigation, wrapping).
- **Key architecture decision**: both panels stay mounted in the DOM at all times regardless of which is active on mobile - only CSS `hidden`/`block` toggles between them, never a conditional unmount. This makes "entered values remain intact when layout or mode changes" true by construction for whatever real invoice fields land in later Stories, rather than a property each field has to separately guarantee.
- The actual invoice form/preview content doesn't exist yet (that's `IG-34` onward) - the page currently renders labelled placeholder panels ("Invoice details" / "Live preview") so the layout mechanism itself could be built and verified now without inventing fields ahead of their own Story. `IG-34` should replace the editor placeholder with real fields, reusing this same `InvoiceEditorLayout`, not building a parallel layout.
- **Real-browser verification, not just jsdom**: jsdom doesn't evaluate CSS media queries, so responsive/viewport behavior can't actually be proven by component tests alone. Used an ad-hoc Playwright script (Chromium, already installed locally from an earlier session's IG-83/86 work) against the real `npm run dev` server at 1280px and 390px viewports - confirmed the desktop side-by-side split with no tab controls, the mobile tab-gated single panel, and that both click and keyboard (arrow key) tab switching work. Screenshots taken at both sizes and visually reviewed.
- No backend work this round - this Story and its Subtasks are entirely `frontend/`.

Files changed or created (`IG-113`/`IG-114`):

- `frontend/app/invoice/create/page.tsx` (new)
- `frontend/app/invoice/create/page.test.tsx` (new)
- `frontend/app/invoice/create/components/InvoiceEditorLayout.tsx` (new)
- `frontend/app/invoice/create/components/InvoiceEditorLayout.test.tsx` (new)
- `backlog.md`

Verification performed (`IG-113`/`IG-114`):

- 15 new tests: 12 component tests on `InvoiceEditorLayout` (both panels always mounted, correct ARIA roles/attributes, input value survives a tab switch, roving `tabindex`, arrow-key navigation with wraparound, custom tab labels) + 3 page tests (both panels render, tabs render, metadata). Full frontend suite (49 tests) passes; `npm run lint` and `npm run build` both clean.
- **Real-browser verification** via an ad-hoc Playwright script against the live `npm run dev` server (see Completed above for what was checked) - 12/12 checks passed at both a 1280px desktop viewport and a 390px mobile viewport, with screenshots taken and visually reviewed.
- Committed locally only - not pushed; no CI run this round (local-commit-only workflow, unchanged from prior sessions).

Prior execution, still relevant context:

- Implemented `IG-97 — Implement password-reset request and completion` and `IG-98 — Test password-reset security boundaries` (T025/T026, S13/`IG-25`), together in one pass. Both Subtasks Done; parent Story `IG-25` Done — the last remaining Story in Epic `IG-3`.
- User chose a **log-only dev stub** for email delivery (not SMTP, not a transactional API) via `AskUserQuestion` — the reset token is written straight to the app's own log output, with real-provider integration explicitly deferred as a follow-up rather than silently invented or left unimplemented.
- New `POST /api/v1/auth/forgot-password` and `POST /api/v1/auth/reset-password` (FSD §92), both rate-limited under the existing `"auth"` policy. `IPasswordResetService`/`PasswordResetService` reuses `UserManager.GeneratePasswordResetTokenAsync`/`ResetPasswordAsync` rather than a hand-rolled token scheme — tokens are self-contained (data-protected, no new DB table needed), expire (`DataProtectionTokenProviderOptions.TokenLifespan` explicitly set to 1 hour in `PersistenceServiceCollectionExtensions`, down from Identity's 1-day default), and are single-use as a side effect of `ResetPasswordAsync` rotating the account's security stamp on success (any other outstanding token for that user, reused or freshly requested, is bound to the old stamp and fails verification afterward).
- Anti-enumeration (FSD §9) applied at both ends: `/forgot-password` always returns 200 regardless of whether the email matches an account (`PasswordResetService.RequestResetAsync` silently no-ops for unknown/inactive accounts); `/reset-password` collapses unknown email, inactive/deleted account, invalid token and expired token into the same generic message, `"This reset link is invalid or has expired. Please request a new one."` — distinct from the specific message a weak *new* password gets (that case can only be reached with an already-valid token, so it carries no enumeration risk).
- New `IPasswordResetEmailSender` interface with `LoggingPasswordResetEmailSender` as its only implementation — deliberately narrow boundary so a real provider is a drop-in swap later, not a `PasswordResetService` rewrite.
- **Verified for real against a live Postgres instance**, not just automated tests: registered an account, requested a reset for both a known and an unknown email (identical 200s), read the actual token off the running backend's console log, completed the reset, confirmed the old password now fails and the new one works, confirmed reusing the same token fails, and confirmed a malformed token is rejected — all against the real database, not EF Core InMemory.

Files changed or created (`IG-97`/`IG-98`):

- `backend/src/InvoiceApp.Application/Identity/{ForgotPasswordRequest,ResetPasswordRequest,IPasswordResetService,IPasswordResetEmailSender}.cs` (new)
- `backend/src/InvoiceApp.Infrastructure/Authentication/{PasswordResetService,LoggingPasswordResetEmailSender}.cs` (new); `InfrastructureAuthenticationExtensions.cs` (extended: DI registration)
- `backend/src/InvoiceApp.Infrastructure/Persistence/PersistenceServiceCollectionExtensions.cs` (extended: 1-hour `DataProtectionTokenProviderOptions.TokenLifespan`)
- `backend/src/InvoiceApp.Modules.Identity/PasswordReset/{ForgotPasswordRequestValidator,ResetPasswordRequestValidator}.cs` (new)
- `backend/src/InvoiceApp.Api/Endpoints/AuthEndpoints.cs` (extended: `POST /forgot-password`, `POST /reset-password`)
- `backend/tests/InvoiceApp.Infrastructure.Tests/Authentication/{PasswordResetServiceTests,FakePasswordResetEmailSender}.cs` (new); `AuthenticationTestHarness.cs` (extended: fake email sender, optional token-lifespan override)
- `backend/tests/InvoiceApp.Infrastructure.Tests/Modules/Identity/PasswordReset/{ForgotPasswordRequestValidatorTests,ResetPasswordRequestValidatorTests}.cs` (new)
- `backend/tests/InvoiceApp.Api.Tests/Authentication/{PasswordResetTests,FakePasswordResetEmailSender}.cs` (new); `AuthenticatedRouteTestFactory.cs` (extended: fake email sender, optional token-lifespan override)
- `backlog.md`, `howtorun.md`

Verification performed (`IG-97`/`IG-98`):

- 21 new tests: 10 unit tests on `PasswordResetService` (known/unknown/deleted-account request handling, valid reset + login with new password + old password rejected, reused token rejected, malformed token rejected, expired token rejected, unknown-email reset rejected, token-generated-before-deletion rejected, weak new password rejected with a distinct message); 7 validator tests; 7 against the real HTTP pipeline via `WebApplicationFactory<Program>` (known/unknown email identical 200s, full reset-then-login round trip, reused/invalid/expired token rejection, rate limiting).
- Full solution build and test suite (111 tests: 14 architecture + 73 infrastructure + 24 API) pass locally.
- **Real end-to-end verification against a live Postgres instance**, not just automated tests (see Completed above) — including reading the actual token off the running backend's own log output, exactly as a future manual tester would.
- Committed locally only — not pushed; no CI run this round (local-commit-only workflow, unchanged from prior sessions).

Prior execution, still relevant context:

- Implemented `IG-93 — Integrate Google authentication flow` and `IG-94 — Handle Google authentication edge cases` (T021/T022, S11/`IG-23`), together in one pass. Both Subtasks Done; parent Story `IG-23` Done (unlike `IG-26`, no frontend gap blocks this one, even though there's still no frontend "Sign in with Google" button anywhere - the backend endpoint alone satisfies this Story's criteria).
- User provided a real Google Cloud OAuth Client ID/Secret this session, set via `dotnet user-secrets` in `InvoiceApp.Api` (`Authentication:Google:ClientId`/`ClientSecret`) - genuinely unblocked, not invented.
- New `GET /api/v1/auth/google/login` (challenge) and `/api/v1/auth/google/callback`, via ASP.NET Core's `AddGoogle()` bridged through a new short-lived (5 min) `IdentityConstants.ExternalScheme` cookie - not auto-registered here since this project uses `AddIdentityCore` rather than the all-in-one `AddIdentity`.
- New `IExternalLoginService`/`ExternalLoginService` implements the account-linking policy documented in the `IG-93` Jira claim comment: already-linked Google identity signs in directly; a new identity matching an existing account by a Google-*verified* email links to it instead of duplicating; an unverified-email match is rejected rather than silently linked/duplicated; otherwise creates a new **passwordless** account + default business, mirroring `AccountRegistrationService`. A soft-deleted account (`IG-101`) is rejected here too, same treatment as `CredentialLoginService`.
- Provider cancellation/failure: a new `OnRemoteFailure` handler redirects to the callback with a generic error flag rather than the default behavior (throwing, surfacing a raw 500 with the provider's own failure text); the callback returns a clean 400, never echoing the raw reason.
- **Verified for real against the live Google Cloud OAuth client**, not just with dummy test values: started the app with the user's actual configured credentials and confirmed `GET /api/v1/auth/google/login` produces a genuine, correctly-formed redirect to `accounts.google.com` with the real `client_id` and `redirect_uri=http://localhost:5094/signin-google` matching exactly what's registered in Google Cloud Console.
- **What's still unverified, flagged not silently skipped**: the actual token exchange + account creation/linking against a real Google consent click-through (needs a browser, a human clicking "Allow") plus a live Postgres instance (Docker wasn't running this session) - asked the user to include this in their planned manual smoke test alongside `IG-101`/`IG-102`.

Prior execution, still relevant context:

- Implemented `IG-101 — Implement confirmed account-deletion workflow` and `IG-102 — Verify post-deletion access and audit behavior` (T029/T030, S15/`IG-27`), together in one pass (same pattern as `IG-95`/`IG-96`). Both Subtasks Done; parent Story `IG-27` Done (unlike `IG-26`, no frontend gap blocks this one).
- New `DELETE /api/v1/auth/account` (authenticated), requiring the current password as explicit confirmation (FSD §76). New `IAccountDeletionService`/`AccountDeletionService`, reusing the Application-interface/Infrastructure-implementation pattern.
- Soft-delete via `ApplicationUser.Status = "Deleted"` — the field already existed with an `"Active"` default (`docs/DATABASE_SCHEMA.md` §3), so no migration was needed. Business/invoice data is untouched.
- Audit log entry (`EntityType="Account"`, `Action="AccountDeleted"`) written atomically with the status flip via `UserManager.UpdateAsync`'s own SaveChanges flush — first real use of the previously-unused `AuditLog` entity/table.
- Deleted account rejected in two places going forward: at the next login attempt (`CredentialLoginService` now checks `Status`, same generic anti-enumeration message as a wrong password — undoes the cookie `PasswordSignInAsync` issues before the check runs), and on every subsequent authenticated request for *any* session via a new cookie `OnValidatePrincipal` handler (`InfrastructureAuthenticationExtensions`) — not just the session that performed the deletion. This is the same class of problem ASP.NET Core Identity's own `SecurityStampValidator` solves for password changes, not wired up here since this project uses `AddIdentityCore` rather than the all-in-one `AddIdentity`.
- **Deliberately not built**: the permanent-purge-after-retention-period half of FSD §76's soft-delete recommendation — no retention duration is documented anywhere, and it's a background/ops job, not something the Story's "follows retention rules" criterion strictly requires (soft-delete alone already satisfies it by not destroying data prematurely).
- **Test-harness bug found and fixed, not a production bug**: `AuthenticationTestHarness` reuses one DI scope across every `Build*` call; `IAuthenticationHandlerProvider` is scoped (not per-`HttpContext`), so it caches the cookie handler against the *first* fake `HttpContext` that ever triggers a real sign-in/sign-out in a test, and silently misdirects cookie writes to that stale context on later calls with a different `HttpContext` object in the same test. Fixed by keeping the affected test to one shared `HttpContext` throughout and documenting why, rather than asserting on cookie headers across two different fake contexts (production has no equivalent issue - real requests get a fresh DI scope each time).
- No live-Postgres manual verification and no CI run this round — this session switched to a local-commit-only workflow (see the memory note below); the user is running their own manual smoke test today instead.

Files changed or created (`IG-93`/`IG-94`):

- `backend/src/InvoiceApp.Application/Identity/{ExternalLoginRequest,IExternalLoginService}.cs` (new)
- `backend/src/InvoiceApp.Infrastructure/Authentication/ExternalLoginService.cs` (new); `InfrastructureAuthenticationExtensions.cs` (extended: `IConfiguration` param, External cookie scheme, `AddGoogle()`, `OnRemoteFailure`)
- `backend/src/InvoiceApp.Infrastructure/Configuration/GoogleAuthenticationOptions.cs` (new)
- `backend/src/InvoiceApp.Infrastructure/InvoiceApp.Infrastructure.csproj` (new `Microsoft.AspNetCore.Authentication.Google` package reference)
- `backend/src/InvoiceApp.Api/Endpoints/AuthEndpoints.cs` (extended: `/google/login`, `/google/callback`); `Program.cs` (passes `builder.Configuration` to `AddInfrastructureAuthentication`)
- `backend/tests/InvoiceApp.Infrastructure.Tests/Authentication/ExternalLoginServiceTests.cs` (new); `AuthenticationTestHarness.cs` (extended)
- `backend/tests/InvoiceApp.Api.Tests/Authentication/GoogleAuthenticationTests.cs` (new); `AuthenticatedRouteTestFactory.cs` (extended: dummy Google test credentials)
- `backlog.md`

Verification performed (`IG-93`/`IG-94`):

- 9 new tests: 6 unit tests on `ExternalLoginService` (create/link/reject/dedup/deleted-account scenarios - see Completed above); 3 against the real HTTP pipeline (login redirect shape, error passthrough, missing-external-session handling).
- Full solution build and test suite (85 tests: 14 architecture + 54 infrastructure + 17 API) pass locally.
- Manually started the app with the real Google Cloud credentials and confirmed the challenge redirect's exact shape (see Completed above) - not just tested with dummy values.
- Committed locally only (`b913232`) - not pushed; no CI run this round (local-commit-only workflow, see `IG-101`/`IG-102`'s note).

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

**Empirical E2E verification keeps catching real bugs unit tests miss — keep doing it, don't skip it as "redundant" once tests pass.** `IG-86` caught two script-timing false negatives; `IG-95`/`IG-96` caught a genuine product bug (`/me` returning the email instead of the display name) that all 41 passing unit tests had missed, because the tests asserted `IsAuthenticated`/exception types, not the actual field values a real client would see; `IG-36` caught a negative-totals bug from an unclamped discount percentage that the existing unit tests (which only ever fed in *valid* discount values) had no reason to catch. Always do a real curl/browser pass against live infrastructure for user-facing backend endpoints, even when automated tests are green - and specifically try genuinely invalid/boundary input in the real UI, not just values a well-behaved user would type.

**JS floating-point arithmetic silently breaks naive 2-decimal-place rounding for currency - always account for this when porting a C# `decimal`-based calculation to TypeScript.** Found in `IG-36`: `10.555 * 100` in a JS `number` is `1055.4999999999998`, not `1055.5`, because `number` is IEEE-754 binary floating point and 10.555 has no exact binary representation - a plain `Math.round(value * 100) / 100` would silently round `10.555` down to `10.55` instead of the mathematically-correct `10.56` (this is FSD section 28's own worked example, so it's not an edge case anyone can skip). C#'s `decimal` type doesn't have this problem (base-10 exact), so a backend calculator ported faithfully to the frontend will look correct in code review and still be wrong at runtime. Fix: add a small epsilon (documented, e.g. `1e-10`, chosen to be far larger than the ~1e-13 representation error but far smaller than half a cent) before rounding - see `frontend/app/invoice/create/lib/invoiceTotals.ts`'s `round()`.

**Frontend state lifted to one top-level component means EVERY keystroke anywhere re-renders and re-derives EVERYTHING - memoize expensive derived values.** Found in `IG-37`: `CreateInvoiceEditor` holds all editor state (header, seller, customer, line items, discount, supporting content) in one component, so typing in a field that logically has nothing to do with totals (Notes, Terms) was still re-running `calculateInvoiceTotals` over every line item on every keystroke, because that computation wasn't memoized - it just ran fresh on every render regardless of what actually changed. This was slow enough to occasionally time out a test under parallel-suite CPU load, not just a theoretical concern. Fixed with `useMemo` keyed on the specific state that actually feeds the calculation (`[lineItems, invoiceDiscountType, parsedDiscountValue]`), not on every piece of state in the component. Watch for the same pattern if a future Story in this Epic adds another expensive derived computation (e.g. once PDF rendering exists).

**Vitest's default 5-second test timeout is not reliable once the suite runs many test files in parallel on this machine.** Raised to 15 seconds in `frontend/vitest.config.ts` during `IG-37` after a `userEvent`-heavy test flaked under load, and a re-run showed the same 5s ceiling being hit in a completely different, untouched test - confirming it's a suite-wide timing characteristic, not a bug in any specific test. If a test seems to hang or produce garbled/interleaved text content (a stale, not-fully-aborted async `user.type()` bleeding into the next test's freshly-rendered DOM) rather than failing cleanly, suspect this before assuming a logic bug - and prefer `user.paste()` over `user.type()` when a test only needs the final value, not per-keystroke behaviour, since paste sets the whole string in one operation instead of simulating each character.

**Architecture pattern established during `IG-91`/`IG-92`, reuse for future backend features:** Application defines use-case interfaces (`Application/{Module}/I{UseCase}Service.cs`), Infrastructure implements them against EF Core/Identity/whatever framework technology is needed, the relevant `Modules.*` project holds framework-free validation/orchestration, Api composes and exposes a Minimal API endpoint. Test against EF Core's InMemory provider (real Identity/EF behavior, no live DB needed in CI) plus a real Postgres end-to-end check performed manually by the agent (not wired into CI — see the CI-provider precedent from earlier Subtasks).

**`IHttpContextAccessor` must stay registered.** `AddInfrastructureAuthentication()` (`backend/src/InvoiceApp.Infrastructure/Authentication/InfrastructureAuthenticationExtensions.cs`) now calls `services.AddHttpContextAccessor()` because `SignInManager` requires it and nothing else in the project registers it. If this extension method is ever refactored, keep that call or `SignInManager` resolution will throw at first real use.

**Non-Web-SDK projects need an explicit `FrameworkReference` for ASP.NET Core types beyond what Identity's NuGet packages pull in.** `InvoiceApp.Infrastructure.csproj` uses plain `Microsoft.NET.Sdk` (not `Microsoft.NET.Sdk.Web`), so `Microsoft.AspNetCore.Authentication.Cookies`, `Microsoft.AspNetCore.Http`, and `SignInManager<TUser>` weren't available until `<FrameworkReference Include="Microsoft.AspNetCore.App" />` was added — the `Microsoft.AspNetCore.Identity.EntityFrameworkCore` NuGet package alone only covers `UserManager`/`ApplicationUser`-level types, not the full ASP.NET Core surface.

**Resolved during `IG-89`/`IG-90`, pattern to reuse:** no analytics provider was named in `docs/`; asked the user directly rather than inventing one, and built the instrumentation behind a pluggable sink so a real provider can be wired later without touching call sites. `frontend/lib/analytics/track.ts`'s `setAnalyticsSink()` is the swap point when one is chosen.

**`IG-21` is not truly end-to-end complete yet — open follow-up, do not lose track of this.** The events `IG-89`/`IG-90` built (`landing_page_view`, `invoice_editor_start`) currently only reach the default `ConsoleAnalyticsSink` — they are emitted correctly and safely, but nothing durably captures/stores them yet, so "acquisition activity can be measured" (`IG-21`'s Story-level acceptance criteria) isn't actually satisfiable in practice until a real sink is wired in. This needs its own follow-up once an analytics provider (or a self-hosted capture endpoint) is chosen — call `setAnalyticsSink()` with the real implementation, wire it near app startup, and add verification that events actually land in the chosen destination (not just that `track()` was called). Raise this explicitly with the user when Epic `IG-3`'s provider decisions come up, since it's the same class of "provider not yet chosen" gap — don't let it quietly stay as console-only.

**Resolved during `IG-25`:** the email-delivery-provider decision was resolved by asking the user directly (`AskUserQuestion`) rather than inventing one — they chose a log-only dev stub over SMTP/a transactional API for now. `IPasswordResetEmailSender` is the swap point for a real provider later (see `IG-97`/`IG-98`'s Completed notes above); this pattern (Google OAuth for `IG-23`, analytics sink for `IG-89`/`IG-90`, email provider for `IG-25`) has now recurred three times in this project — always ask before implementing real delivery/OAuth/third-party integration, don't invent credentials or a provider.

**Next.js 16.1.6's root-layout title template doesn't apply to a page's own `title` string.** Confirmed with a clean Turbopack cache during `IG-87`, so it's genuine framework behavior in this version, not a project bug or stale cache. If a future page relies on the `%s | Invoice App` suffix appearing automatically, set its title explicitly instead (e.g. `` `${pageTitle} | Invoice App` ``) rather than assuming the layout's `template` will apply it.

**Frontend component tests need explicit RTL cleanup.** `vitest.config.ts` does not set `test.globals: true`, so React Testing Library's automatic `afterEach(cleanup)` never self-registers; `vitest.setup.ts` now calls `cleanup()` in its own `afterEach` to compensate. Any future change to `vitest.config.ts`/`vitest.setup.ts` must preserve this or multi-`it()` test files will silently leak DOM state between tests.

**Playwright verification scripts need explicit waits after client-side navigation.** `waitForLoadState("networkidle")` is unreliable in Next.js dev mode (HMR/websocket activity can keep it from settling, or it can throw `net::ERR_ABORTED` if another navigation is issued too soon after). Prefer `page.waitForURL(pattern)` for cross-page navigation checks and a short fixed `waitForTimeout` for same-page hash/state changes, as used in `IG-86`'s verification script.

**Be careful running process-killing commands to free a port/lock.** This machine has an unrelated app's process on port 3000 (see below) that looks superficially similar to a stale dev-server lock in log output. Always confirm a PID's actual command line (e.g. `Get-CimInstance Win32_Process -Filter 'ProcessId = <pid>'` on Windows) before terminating it — a misread during `IG-86` killed that unrelated process by mistake.

**Port 3000 on this machine may be occupied by an unrelated project's dev server.** Next.js handles this gracefully on its own (auto-selects the next free port, e.g. 3002) — but always check the dev server's own startup log for the actual port before scripting/testing against `localhost:3000`, per the mixup caught during `IG-83`.

**No project skill exists yet for running the frontend in a browser**, and `chromium-cli` isn't available on this machine. `IG-83`/`IG-86`/`IG-113`/`IG-114` all used an ad-hoc Playwright script in a scratch directory instead - confirmed as of `IG-113`/`IG-114` that Chromium is already downloaded locally (`~/AppData/Local/ms-playwright`, from an earlier session), so `npx playwright install chromium` is a no-op check rather than a fresh multi-hundred-MB download; `npm install --no-save playwright@<version>` in a scratch dir plus a plain `.mjs` script (launch, `page.goto`, `getByRole`, `.screenshot()`) is enough, no project dependency needed. Consider `/run-skill-generator` if browser verification becomes routine for future frontend Subtasks (`frontend/README.md` has the detail).

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

`IG-121` and `IG-122` are both Done, each with a claim comment (start) and a verification comment (completion, including automated-test and real-browser/Playwright evidence). Parent Story `IG-37` is Done — the fifth Story in Epic `IG-5`. `IG-119`/`IG-120` remain Done, parent Story `IG-36` Done — the first Story in this Epic to need real backend work. `IG-117`/`IG-118` remain Done, parent Story `IG-35` Done. `IG-115`/`IG-116` remain Done, parent Story `IG-34` Done. `IG-113`/`IG-114` remain Done, parent Story `IG-33` Done — Epic `IG-5` (Invoice Editor and Calculation Engine) is the active Epic, now down to its last Story. `IG-97`/`IG-98` remain Done, parent Story `IG-25` Done — the last remaining Story in Epic `IG-3`. `IG-93`/`IG-94` remain Done, parent Story `IG-23` Done. `IG-101`/`IG-102` remain Done, parent Story `IG-27` Done. `IG-99`/`IG-100` remain Done; parent Story `IG-26` remains explicitly **not** Done (In Progress, frontend gap — the only open item left anywhere in Epic `IG-3`). `IG-95`/`IG-96` remain Done, parent Story `IG-24` Done. Epic `IG-3` has no remaining unclaimed Stories. Epic `IG-5` has 1 remaining unclaimed Story (`IG-38`); `IG-123`/`IG-124` (its Subtasks) confirmed To Do/unassigned as of this sync. **This session's local commits through `IG-119`/`IG-120` were explicitly pushed to `origin/main` at the user's one-time request** (commits `af7eee1..35a6127`) - later commits (`IG-121`/`IG-122` and this sync) remain local-only per the standing default; check `git log`/`git status` for the current push state before assuming either way in a later session. Jira remains authoritative; refresh live issue state before starting work in a later session.

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
