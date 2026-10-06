# Current Delivery Handoff

## Authority

Jira project `IG` is the authoritative delivery backlog. This file is a local handoff summary only; it does not replace Jira status, priority, assignment, hierarchy or acceptance criteria. Requirements and architecture are authoritative under `docs/` as described in `AGENTS.md`.

**This file was compressed 2026-09-09.** The full pre-compression history (every Story's execution log, files-changed lists, verification detail, back to the start of the project) is preserved verbatim at `archive/backlog-2026-09-09.md`. Going forward, Jira issue comments and git commit messages are the record of *what happened and why* for any given piece of work — this file only tracks current state and standing lessons that aren't obvious from re-reading the code.

Jira project: <https://appitometechnologies.atlassian.net/jira/software/projects/IG>

## Current Status (as of 2026-10-06)

- **Original MVP backlog is Done**: Epics `IG-1`-`IG-12` (all 12), their Stories (`IG-13`-`IG-72`, 60) and Subtasks (`IG-73`-`IG-192`, 120+) are all Done.
- **Phase 2 delivery progressing**: `IG-205`-`IG-208` (Email, Payments, Estimates, Reporting) all Done. `IG-209` (Recurring Invoices) **COMPLETE END-TO-END**, now moving to `IG-210` (Billing Documents).
- **IG-209 epic fully complete** (2026-10-06): All 5 stories delivered and integrated end-to-end. Daily background jobs for invoice generation and payment reminders. Email integration wired. Failure tracking with bounded retries. Tests passing, no build errors.
- **IG-234 (Credit Notes) API layer complete** (2026-10-06): Domain, service, and CRUD endpoints ready. Frontend components still needed.
- **107+ backlog issues created in Phase 2+ roadmap**:
  - `IG-198` (new Epic, "In-App Navigation and Layout UX Polish") with `IG-199`-`IG-202` under it (fixed top bar, Invoice Generator back button + fixed preview panel, fixed action buttons, hide public nav links once authenticated); `IG-203` under existing `IG-8` (default tax setting); `IG-204` under existing `IG-6` (dedicated Templates view). User-requested UI/UX items, "we will pick those later." No Subtasks decomposed under these 7 yet.
  - `IG-205`-`IG-211`: PRD Phase 2+ roadmap Epics — `docs/PRD.md` §34's own "Phase 2 — SaaS" is already fully delivered by the original backlog; these 7 are what `docs/EPICS.md` §3 already had scoped as the genuinely-next phase (`EPIC-13`-`EPIC-19`), just never published to Jira before now: `IG-205` Email Delivery and Hosted Invoice Experience (P1), `IG-206` Online Payments/Stripe (P1, depends on `IG-205`), `IG-207` Estimates and Estimate Conversion (P1), `IG-208` Reporting and Data Export (P1), `IG-209` Recurring Invoices and Payment Reminders (P2), `IG-210` Expanded Billing Documents (P2), `IG-211` Multi-Business/Teams/International (P2). Recommended starting point: `IG-205`.
  - `IG-212`-`IG-242` (31 Stories decomposed under `IG-205`-`IG-211`, same "User Story"/"Acceptance Criteria" format as the original `docs/STORIES.md`, each grounded in the same PRD sections cited on its parent Epic): `IG-205` → `IG-212`-`IG-215` (send by email, email history, hosted page, secure tokens); `IG-206` → `IG-216`-`IG-219` (Stripe Checkout, webhook reconciliation, receipt, per-business Stripe config); `IG-207` → `IG-220`-`IG-223` (create/send/accept estimate, convert to invoice); `IG-208` → `IG-224`-`IG-228` (revenue, outstanding/overdue, by-customer, tax summary, CSV/PDF export); `IG-209` → `IG-229`-`IG-233` (create/generate/pause schedule, configure reminders, safe reminder failure handling); `IG-210` → `IG-234`-`IG-237` (credit note, receipt, purchase order, document-type filtering); `IG-211` → `IG-238`-`IG-242` (multi-business switching, team invites, role restrictions, language selection, cross-business reports).
  - `IG-243`-`IG-304` (62 Subtasks, 2 per Story, same "Implement X" / "Test Y" split and "Completion Criteria" format as the original `docs/TASKS.md`) — every one of `IG-212`-`IG-242`'s 31 Stories now has exactly 2 Subtasks. This is now decomposed to the same depth as the original `IG-1`-`IG-12` backlog (Epic → Story → Subtask), ready to be picked up and claimed directly.

## Current Focus / Next Task

**IG-234: Credit notes (FEATURE COMPLETE 2026-10-06)**

**IG-234 API work** (commits 16d3a7d + 0addc76):
- Domain: CreditNote entity (references InvoiceId, CustomerId, tracks Amount, Reason, seller/customer snapshots)
- Service: ICreditNoteService (CreateAsync validates amount ≤ invoice due, ListByInvoiceAsync, ListByBusinessAsync, GetAsync, DeleteAsync)
- API: POST create, GET list/by-invoice/detail, DELETE
  - All endpoints require authorization with proper error handling
  - Generates numbers: "CN-{BusinessId}{Date}{Sequence}"
  - Amount validation: credit amount cannot exceed invoice amount due
- Migration: 20261006103443_AddCreditNotes.cs added

Backend builds ✓, 236 tests pass ✓

**IG-234 Frontend work** (commit 04fe150):
- API library (lib/creditNotes.ts): CRUD operations with error handling
- CreateCreditNoteForm: Invoice selection, amount validation (≤ invoice due), reason, optional notes
- CreditNoteList: Table view with delete confirmation
- CreditNoteContent: Tab-based management (list/create)
- Page route at /credit-notes (accessible via businessId query param)
- Follows recurring schedules pattern for consistency

Frontend build ✓, ESLint ✓

**IG-235 (Receipts) — PARTIALLY COMPLETE 2026-10-07**

`IG-289` (Implement receipt generation) is **Done**; `IG-290` (Test receipt sending) is **still To Do**.

Delivered (commits 1b423f6, e409d5f, abd9d01):
- Domain/service/API: `Receipt` + `IReceiptService`, CRUD endpoints under
  `/api/v1/businesses/{businessId}/receipts`, plus `GET .../{id}/pdf`
- `ReceiptPdfDocument` (QuestPDF, same engine as invoices); numbers are `RCP-{yyyyMMdd}-{seq:D3}`
- Table `payment.receipts` (migration `20261006143930_AddReceipts`), unique on (business_id, receipt_number)
- Frontend `/receipts`: API lib, invoice→payment cascade create form, list with PDF download/delete

**IG-235 is NOT fully done**: its third AC — "can be emailed using the existing send capability
(IG-212)" — is **not implemented**. There is no send-email endpoint for receipts. `IG-290` should
cover that plus its own testing before `IG-235` is closed.

Verified empirically against a live server + real Postgres (not just InMemory) and in a browser:
register→invoice→payment→receipt→PDF download, 400/401/204 on the invalid paths, sequence 001→002,
and the `/receipts` page creating a receipt end to end.

**Next**: `IG-290` — receipt emailing (the missing AC) + tests
**Then**: `IG-236` (Purchase Orders), `IG-237` (Document filtering) under the `IG-210` epic

**Epic progress**:
- IG-205 (Email Delivery): ✅ Done (all 4 stories)
- IG-206 (Online Payments): ✅ Done (all 4 stories)
- IG-207 (Estimates): ✅ Done (all 4 stories)
- IG-208 (Reporting): ✅ Done (all 5 stories)
- IG-209 (Recurring Invoices): ✅ **DONE** (all 5 stories, end-to-end)
  - ✅ IG-229: Create recurring schedule (Jira: Done)
  - ✅ IG-230: Generate invoices on schedule (background job, daily)
  - ✅ IG-231: Pause or cancel schedule (Jira: Done)
  - ✅ IG-232: Configure reminders (complete, emails sending daily)
  - ✅ IG-233: Safe failure handling (complete, failures tracked & surfaced)

**IG-209 Summary**: Entirely feature-complete and end-to-end functional.
- Daily background job generates new invoices from recurring schedules
- Daily background job sends payment reminders based on configurable rules
- Failures tracked with bounded retries (max 3 attempts)
- Business owner can view/manage reminder rules and see failed reminders
- All acceptance criteria met

**Next task**: Move to IG-210 (Expanded Billing Documents) or another epic?

## Engineering Notes

Standing lessons and conventions, most still directly actionable, none requiring re-reading old execution history to understand:

**Workflow**
1. **Local-commit-only by default** — commit but do not push to GitHub; the user pushes manually. Verification evidence in Jira comments should cite the local commit hash, not a CI run URL, unless a push just happened.
2. **Standing four-command verification gate before every push**: `cd backend && dotnet test`, `cd frontend && npx eslint .`, `npm test -- --run`, `npm run build`. All four must be clean — skipping `next build` once let a real production-build failure ship unnoticed (fixed 2026-09-03).
3. **Both Claude and Codex work this repo/Jira project concurrently** — claim a Subtask by transitioning To Do → In Progress with a comment before starting; check live Jira status/assignee first to avoid collisions.
4. **Ask before inventing credentials, a provider, or a third-party integration** — this has recurred for Google OAuth (`IG-23`), analytics sink, and the email provider; always surface the decision to the user rather than picking one silently. Relevant again for `IG-206` (Stripe) and `IG-205` (transactional email/hosted-page infra) if picked up.
5. **Empirical end-to-end verification (real browser/curl against a live server) keeps catching real bugs unit tests miss** — always do this for user-facing changes even when automated tests are green, and specifically try invalid/boundary input a well-behaved user wouldn't type.

**Backend architecture**
6. **Layering convention for a new backend feature**: `Application/{Module}/I{UseCase}Service.cs` (interface) → `Infrastructure` (EF Core/Identity implementation) → `Modules.*` (framework-free validation/orchestration) → `Api` (Minimal API endpoint). Test against EF Core InMemory in CI; verify manually against real Postgres for anything InMemory can't prove (concurrency, raw SQL, transactions).
7. **A real Postgres-backed test path exists** (`backend/tests/InvoiceApp.Infrastructure.Tests/Businesses/PostgresAvailabilityFixture.cs`) reusing the `invoiceapp-postgres` docker container (port 5433) — reuse it rather than building a parallel fixture or Testcontainers.
8. **Real server-side file storage exists** (`IBusinessLogoStorage`/`BusinessLogoStorage`, local disk under `App_Data/business-logos`) — reuse this pattern for any future upload surface; it was already audited against FSD's MIME/magic-byte/safe-filename requirements and found compliant.
9. **Password-reset email now supports real SMTP** (`SmtpPasswordResetEmailSender`) alongside the dev-only `LoggingPasswordResetEmailSender` stub — `AddInfrastructureAuthentication` picks whichever based on whether `Email:Host` is configured. Config lives in a gitignored `.env` in `backend/src/InvoiceApp.Api` (copy `.env.example`), loaded via `DotNetEnv` at the top of `Program.cs`, using ASP.NET Core's `__` nesting (`Email__Host` → `Email:Host`). No `.env` present is a silent no-op. Section is named `Email`, not `Smtp`, so it's automatically covered by `SecretsHygieneTests`' guard against committing secrets.
10. **`IHttpContextAccessor` must stay registered** in `AddInfrastructureAuthentication()` — `SignInManager` requires it and nothing else registers it; removing the call breaks `SignInManager` resolution at first use.
11. **`InvoiceApp.Infrastructure.csproj` needs `<FrameworkReference Include="Microsoft.AspNetCore.App" />`** since it uses plain `Microsoft.NET.Sdk`, not `Sdk.Web` — Identity's NuGet packages alone don't pull in `SignInManager`/cookie auth/`Microsoft.AspNetCore.Http`.
12. **Rate limiting covers the 4 auth endpoints plus PDF generation**, all sharing one `RateLimitingOptions.AuthPolicyName` partition keyed by IP only (10 requests/60s/IP, confirmed genuinely firing under rapid automated testing) — a client's auth attempts and PDF-generation attempts share one combined budget. Deliberate, not accidental; revisit if a future endpoint's traffic pattern makes the sharing too aggressive.
13. **`GlobalExceptionHandler` logs the acting user's id (or "anonymous") on every rejected request** (400/401/404/409) — adding a new exception type to its `Map` switch gets this for free.
14. **Logging config has a sharp edge**: a blanket `Microsoft.AspNetCore: Warning` override in `appsettings*.json` silently suppresses any more-specific category (e.g. `Microsoft.AspNetCore.HttpLogging`) unless an explicit override is added too. Separately, `builder.Logging.AddSimpleConsole(options => options.IncludeScopes = true)` is what makes correlation IDs/`BeginScope` visible at all — a different/additional log provider must be confirmed to still surface scopes.
15. **`Frontend:BaseUrl` in `appsettings.json`** (default `http://localhost:3000`) is the backend's config value for the frontend's own origin (used by the Google OAuth callback redirect) — CORS's allowed-origins list in `Program.cs` is still a separate hardcoded string, not yet consolidated onto it.
16. **A server-side OAuth redirect can never read the frontend's own localStorage** — the two-hop pattern (redirect to a small frontend landing page that resolves the real destination client-side) is the fix; reuse it for any future server-initiated redirect needing localStorage-backed state.
17. **Every FSD performance target was verified with 10-100x margin** (`IG-72`) using representative seeded data and a **production** frontend build, not the dev server — reuse that methodology if performance is ever re-verified. No remediation was needed anywhere.
18. **Currency PDFs from the Invoice Detail Page never include the business's saved logo** — deliberate scope boundary matching the anonymous flow's own behavior, not a bug.
19. **When closing a Story or Epic, transition its own Subtasks too** — this was missed twice (2026-09-03, 38 Subtasks; 2026-09-09, 8 more) and only caught by audits/the user checking Jira's List view directly. Double-check subtask status specifically when marking a parent Done.
20. **`main` has branch protection** (Backend build + Frontend build required, no force-push/delete) but `enforce_admins` is off and no PR-review count is required — direct pushes to `main` by an authenticated owner still work; only PR merges are gated.
21. **Never hand-write an EF migration — always `dotnet ef migrations add`.** EF identifies a migration by the `[Migration("...")]` attribute that lives in its generated `.Designer.cs`, so a hand-written `.cs` alone is invisible to EF and leaves `ApplicationDbContextModelSnapshot` stale (the next generated migration then re-creates the same table). `dotnet test` will **not** catch this — tests run on EF Core InMemory, which bypasses migrations entirely (note 6). Generating it also gets `EnsureSchema` and this context's PascalCase→snake_case column mapping right, both of which are easy to miss by hand. Cost a full rollback/regenerate cycle on `IG-289` (2026-10-07).
22. **Check which schema a new table belongs in before adding one.** Schemas here are singular and per-module (`invoice`, `payment`, `business`, `customer`, `estimate`); `invoicing` is an existing Phase-2 inconsistency, not a precedent to copy. `IG-289` initially created a `payments` schema one character off the existing `payment` one — `payment.payments` beside `payments.receipts` is a genuine foot-gun for anyone writing SQL.
23. **A `CountAsync() + 1` document-number sequence races** — two documents created for one business on the same day can silently receive the same number. Back any such sequence with a unique index on (business_id, number) so a loser fails loudly rather than duplicating an accounting number (added for receipts in `IG-289`; **credit notes (`IG-234`) still have this unguarded** and should get the same treatment).
24. **Architecture-boundary tests (`InvoiceApp.ArchitectureTests`) must be validated against Linux CI, not just a Windows dev machine** — a real cross-platform bug in `ProjectFile.cs` sat undetected for several Subtasks because it only manifested on the Ubuntu runner.

**Frontend**
25. **Keep `CreateInvoiceEditor.tsx` changes narrowly scoped** — 1,000+ lines, 16 extracted components, 15 extracted lib modules, and its own comments explicitly reject a bigger rewrite as disproportionate. Any fix here should be a small, targeted change inside one existing handler, not a restructuring.
26. **`SiteHeader`'s authenticated desktop nav switches on at the `xl` breakpoint (1280px), not `md`** — measured minimum content width was ~1104px for 8 links + account email + Log out; re-measure before assuming `xl` has unlimited headroom if adding nav items.
27. **Any modal must trap Tab/Shift+Tab within its own focusable elements** — pattern (query focusables, wrap at first/last) is duplicated inline per-component (`ConfirmDialog`, `AccountGateModal`), matching this codebase's convention of not extracting small per-component effect logic into a shared hook.
28. **A custom dropdown/autocomplete must never close on blur without checking `event.relatedTarget`** — a plain `onBlur` + `setTimeout` closes the list out from under a keyboard user tabbing onto one of its own option buttons. Check the wrapper's `contains(relatedTarget)` instead, and wire options to `onClick` (fires for mouse and keyboard), not `onMouseDown` alone.
29. **Frontend state lifted to one top-level component means every keystroke anywhere re-renders and re-derives everything** — `CreateInvoiceEditor` memoizes totals (`useMemo` keyed only on what actually feeds the calculation) after an unmemoized version caused test timeouts under CPU load. Watch for the same pattern with any future expensive derived computation.
30. **JS floating-point arithmetic silently breaks naive 2-decimal currency rounding** — `10.555 * 100` in a JS `number` is `1055.4999999999998`, not `1055.5`. A backend `decimal` calculation ported faithfully to TypeScript will look correct in review and be wrong at runtime. Fix: a small documented epsilon before rounding — see `frontend/app/invoice/create/lib/invoiceTotals.ts`'s `round()`.
31. **`vitest.config.ts`'s `testTimeout` is 10000ms**, empirically re-measured (not a guess) — Vitest's 5s default is unreliable once many test files run in parallel under CPU contention on this machine. If a test seems to hang or produce garbled/interleaved text rather than failing cleanly, suspect a leaked fake-timer or the timeout before assuming a logic bug; prefer `user.paste()` over `user.type()` when only the final value matters.
32. **RTL's automatic `afterEach(cleanup)` never self-registers** since `vitest.config.ts` doesn't set `test.globals: true` — `vitest.setup.ts` calls `cleanup()` explicitly; preserve this in any future config change or multi-`it()` files will leak DOM state between tests.
33. **Next.js 16.1.6's root-layout title template doesn't apply to a page's own `title` string** — confirmed genuine framework behavior, not a stale-cache artifact. Set the full title explicitly (e.g. `` `${pageTitle} | Invoice App` ``) rather than relying on the layout's `template`.
34. **`IG-21` (acquisition analytics) is not truly end-to-end complete** — events (`landing_page_view`, `invoice_editor_start`) are emitted correctly to `ConsoleAnalyticsSink` but nothing durably captures them yet. `setAnalyticsSink()` (`frontend/lib/analytics/track.ts`) is the swap point once a real provider is chosen — raise this if analytics work comes up.

**Local environment**
35. **Postgres runs on host port 5433, not 5432** (`infrastructure/docker/docker-compose.yml`) — this machine has another project's Postgres container on 5432; start with `docker compose -f infrastructure/docker/docker-compose.yml up -d`.
36. **`dotnet-ef` global tool must be at version 8.0.11** (matching this project's EF Core version) — `dotnet tool install --global dotnet-ef --version 8.0.11` in a fresh environment.
37. **Target framework is .NET 8 (SDK 8.0.300), not .NET 10** — two approved .NET 10 install attempts stalled; don't represent the current target as .NET 10 until the SDK is reliably available and the upgrade is actually done.
38. **Real Firefox and WebKit engines are cached locally** (`ms-playwright/firefox-1543`, `ms-playwright/webkit-2359`) alongside Chromium — reuse for cross-browser verification. **WebKit quirk**: `.fill()` doesn't reliably trigger this app's React `onChange` under this build (DOM value sets, React state doesn't) — use `.click()` + `.pressSequentially()` instead. Chromium/Firefox unaffected.
39. **No project skill exists for browser verification** — an ad-hoc Playwright script in a scratch directory (`npm install --no-save playwright@<version>`, plain `.mjs`, `page.goto`/`getByRole`/`.screenshot()`) is the established approach; Chromium is already downloaded locally so `npx playwright install chromium` is a no-op check.
40. **`waitForLoadState("networkidle")` is unreliable in Next.js dev mode** (HMR/websocket activity keeps it from settling) — prefer `page.waitForURL(pattern)` for cross-page checks and a short fixed `waitForTimeout` for same-page state changes.
41. **Confirm a PID's actual command line before killing it to free a port/lock** (e.g. `Get-CimInstance Win32_Process -Filter 'ProcessId = <pid>'` on Windows) — this machine has had unrelated processes on ports that look like a stale dev-server lock at a glance; a misread has killed the wrong process before. Port 3000 in particular may already be occupied by an unrelated project (Next.js auto-selects the next free port on its own).

## Handoff Update Template

Keep "Current Status"/"Current Focus / Next Task" current as work lands; add new lessons to "Engineering Notes" only if they're non-obvious and durable (not "what I did today" — that belongs in the Jira comment and commit message). Prune a note once it's fully superseded rather than layering a correction on top.

```text
Current Status: <what changed since the last update, in 1-3 bullets>
Current Focus / Next Task: <what's claimed/next, or "nothing claimed">
New Engineering Notes (if any): <non-obvious, durable lessons only>
```
