# Current Delivery Handoff

## Authority

Jira project `IG` is the authoritative delivery backlog. This file is a local handoff summary only; it does not replace Jira status, priority, assignment, hierarchy or acceptance criteria. Requirements and architecture are authoritative under `docs/` as described in `AGENTS.md`.

**This file was compressed 2026-09-09.** The full pre-compression history (every Story's execution log, files-changed lists, verification detail, back to the start of the project) is preserved verbatim at `archive/backlog-2026-09-09.md`. Going forward, Jira issue comments and git commit messages are the record of *what happened and why* for any given piece of work — this file only tracks current state and standing lessons that aren't obvious from re-reading the code.

Jira project: <https://appitometechnologies.atlassian.net/jira/software/projects/IG>

## Current Status (as of 2026-10-07)

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

**IG-292: Purchase order list/detail distinguishability — COMPLETE 2026-10-07 (awaiting Jira transition)**

Claimed To Do → In Progress with a scoping comment. `IG-291` had delivered the purchase order
backend only — no frontend, no PDF and **no tests at all** — so meeting this subtask's criterion
meant building the list and detail surfaces rather than asserting against existing ones.

Delivered:

- Backend: purchase order read model now surfaces `SupplierName`/`BusinessName` (deserialised from
  the stored snapshots); list endpoints order newest issue date first; soft-deleted purchase orders
  are no longer retrievable via detail or re-deletable.
- Frontend: `app/lib/purchaseOrders.ts`, `/documents/purchase-orders` list and
  `/documents/purchase-orders/[id]` detail, both labelling the document type explicitly and naming
  the counterparty "Supplier"/"Ordered by" rather than "Customer".
- Tests: 13 backend endpoint tests (`InvoiceApp.Api.Tests/Purchasing`) + 14 frontend component
  tests. Backend 434 pass (249 API, up from 236).

**Two `IG-291` defects found and handled:**

1. *Numbering was broken, not merely racy* — the sequence counted rows whose `IssueDate` was today
   while storing the caller's `IssueDate` and embedding today's date in the number, so any
   backdated purchase order numbered `PO-{today}-001` every time and the second collided with the
   unique index as an unhandled 500. **Fixed under IG-292** (see Engineering Note 23).
2. *Line items are never persisted* — accepted on create, used for totals, then discarded; no
   `purchase_order_items` table exists. Blocks the PDF, so split out to **`IG-306`** by product
   decision.

Verified empirically against a live server and real Postgres in Chromium (31 checks, all passing):
two backdated purchase orders numbering 001/002 with the real unique index in play, per-date
sequences, no number reuse after deletion, 400 on an unknown supplier, 404 on a missing purchase
order rendering an error state rather than crashing, correct document-type labelling on both
surfaces, and no horizontal overflow at 390px.

**Not done / known gaps:**

- No purchase order create UI — purchase orders are created via API only. The list has no "New
  Purchase Order" action.
- No nav entry, consistent with estimates/receipts/credit-notes/recurring/reports, which are all
  reachable by URL only (Engineering Note 27 warns the header has no headroom).
- Line items and the PDF were still missing at this point; both landed in `IG-306` below.

**IG-306: Purchase order line items + PDF — COMPLETE 2026-10-07**

- `PurchaseOrderItem` entity + `purchasing.purchase_order_items` (migration
  `20261007043005_AddPurchaseOrderItems`, generated, cascade FK). Items are persisted on create
  with their own line subtotal/tax/total, loaded on every read and surfaced on the read model.
- PDF renders through the **existing** `InvoicePdfDocument`, not a bespoke document — the `IG-220`
  precedent, where an estimate shares the invoice document via `DocumentTypeLabel`. Added a
  matching `CounterpartyLabel` (default `"Bill to"`, `"Supplier"` for purchase orders) because
  "Bill to" is simply wrong on a document addressed to a supplier. Purchase orders therefore
  inherit template customisation for free.
- `GET /api/v1/businesses/{businessId}/purchase-orders/{id}/pdf`; detail view gained the line-item
  table and a Download PDF button.
- Tests: backend 442 pass (257 API, up from 249), frontend 17 purchase order component tests.

Verified against live Postgres: three line items with mixed discount/tax round-tripping exactly
(subtotal 360, tax 32, total 392), null unit preserved, order preserved, 404 on a deleted purchase
order's PDF. The generated PDF's **text was extracted with `pdftotext`** and confirmed to read
"PURCHASE ORDER" and "Supplier" — not "Invoice"/"Bill to" — with all three lines and correct
totals. That is the only real proof of the labelling AC, since this codebase asserts PDFs by magic
bytes and cannot otherwise see rendered text.

**Known gap carried forward**: `DeliveryInstructions` is deliberately **not** on the PDF. The only
free-text slot in the shared document (`CustomInstructions`) renders under a "Payment
Instructions" heading, so putting delivery instructions there would mislabel them. They show on the
detail page. Needs its own section in the shared document if it is wanted on the PDF.

**`IG-236` is not closeable yet** despite `IG-291`/`IG-292`/`IG-306` all being Done. Its three ACs
are met, but its User Story — "As a registered user, I want to create a purchase order… using the
same tool I use for invoicing" — is not: there is still **no create UI**, so purchase orders can
only be created through the API. Raised as **`IG-307`**, which `IG-236` now waits on.

**Next**: `IG-307` — purchase order create UI. Note its open question: every Phase 2 document
surface is URL-only and absent from the nav, which is already at its width limit (Note 27), so a
create form nobody can navigate to is only a partial fix. That part may belong with `IG-198`.
**Then**: `IG-237` (document-type filtering) closes out the `IG-210` epic

**Two pre-existing frontend test failures, unrelated to this work, currently break the four-command
gate:**

- `app/documents/estimates/[id]/components/ConvertToInvoiceDialog.test.tsx` uses `beforeEach`
  without importing it from vitest (`globals: true` is not set — Engineering Note 33), so the file
  fails to collect. Broken since `IG-223` (2026-09-22).
- `app/reports/components/RevenueReportView.test.tsx` is a date time-bomb: it hard-codes
  `2026-Q3` and a quarter start matching `/2026-0[1-9]-01/`, which started failing on 2026-10-01.

(`app/settings/business/components/BusinessProfileSettings.test.tsx` also failed in the full run but
passes in isolation — CPU-contention flake, Engineering Note 32.)

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

**IG-235 (Receipts) — COMPLETE 2026-10-07** (`IG-289` and `IG-290` both Done)

Delivered (commits 1b423f6, e409d5f, abd9d01, 24da479):
- Domain/service/API: `Receipt` + `IReceiptService`, CRUD endpoints under
  `/api/v1/businesses/{businessId}/receipts`, plus `GET .../{id}/pdf`
- `ReceiptPdfDocument` (QuestPDF, same engine as invoices); numbers are `RCP-{yyyyMMdd}-{seq:D3}`
- Table `payment.receipts` (migration `20261006143930_AddReceipts`), unique on (business_id, receipt_number)
- Frontend `/receipts`: API lib, invoice→payment cascade create form, list with PDF download/delete

- Receipt emailing via the existing send capability (`IG-290`, commit 24da479), completing the
  third AC

Verified empirically against a live server + real Postgres (not just InMemory) and in a browser:
register→invoice→payment→receipt→PDF download, 400/401/204 on the invalid paths, sequence 001→002,
and the `/receipts` page creating a receipt end to end.

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

- IG-210 (Expanded Billing Documents): 🔄 **in progress**
  - ✅ IG-234: Credit note (API + frontend; still needs the Note 23 unique index)
  - ✅ IG-235: Receipt (create, PDF, email)
  - 🔄 IG-236: Purchase order — `IG-291` ✅, `IG-292` ✅, `IG-306` ✅; blocked on a create UI
  - ⬜ IG-237: Document-type filtering

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
23. **A `CountAsync() + 1` document-number sequence races** — two documents created for one business on the same day can silently receive the same number. Back any such sequence with a unique index on (business_id, number) so a loser fails loudly rather than duplicating an accounting number (added for receipts in `IG-289`; **credit notes (`IG-234`) still have this unguarded** and should get the same treatment). Two further traps, both hit by purchase orders in `IG-291` and fixed in `IG-292`: (a) **the date used to filter the sequence must be the same date embedded in the number** — counting rows by "today" while numbering by the caller's issue date made every backdated document `PO-{today}-001`, so the second one hit the unique index as an unhandled 500, deterministically rather than only under concurrency; (b) **count-based sequences reuse numbers after a soft delete** — derive the next value from the max sequence already present in the stored numbers instead, so a deleted accounting number is never issued twice. Critically, **EF Core InMemory does not enforce unique indexes**, so `dotnet test` can never prove any of this — it happily inserts the duplicate Postgres rejects. The same blind spot as Note 21's migrations: verify a numbering fix against real Postgres (Note 7's fixture, or a live server), which is how `IG-292`'s fix was actually confirmed rather than by the green suite alone.
24. **A new itemised document type reuses `InvoicePdfDocument` — do not write a bespoke QuestPDF document.** `InvoicePdfRequest` carries per-document-type labels appended last with defaults (`DocumentTypeLabel = "Invoice"`, `CounterpartyLabel = "Bill to"`), so every existing positional caller is unaffected; the service maps its stored entity onto `InvoicePdfRequest` and passes its own labels (`EstimateService` → `"Estimate"`, `PurchaseOrderService` → `"Purchase Order"`/`"Supplier"`). This is what satisfies "reuses the shared document engine and templates", and it gets template customisation for free. `ReceiptPdfDocument` is **not** the precedent to copy — a receipt is not itemised and genuinely needed its own layout. Caveat: the only free-text slot, `CustomInstructions`, renders under a **"Payment Instructions"** heading, so it cannot carry anything else (purchase order delivery instructions are left off the PDF for this reason) without adding a new section.
25. **Architecture-boundary tests (`InvoiceApp.ArchitectureTests`) must be validated against Linux CI, not just a Windows dev machine** — a real cross-platform bug in `ProjectFile.cs` sat undetected for several Subtasks because it only manifested on the Ubuntu runner.

**Frontend**
26. **Keep `CreateInvoiceEditor.tsx` changes narrowly scoped** — 1,000+ lines, 16 extracted components, 15 extracted lib modules, and its own comments explicitly reject a bigger rewrite as disproportionate. Any fix here should be a small, targeted change inside one existing handler, not a restructuring.
27. **`SiteHeader`'s authenticated desktop nav switches on at the `xl` breakpoint (1280px), not `md`** — measured minimum content width was ~1104px for 8 links + account email + Log out; re-measure before assuming `xl` has unlimited headroom if adding nav items.
28. **Any modal must trap Tab/Shift+Tab within its own focusable elements** — pattern (query focusables, wrap at first/last) is duplicated inline per-component (`ConfirmDialog`, `AccountGateModal`), matching this codebase's convention of not extracting small per-component effect logic into a shared hook.
29. **A custom dropdown/autocomplete must never close on blur without checking `event.relatedTarget`** — a plain `onBlur` + `setTimeout` closes the list out from under a keyboard user tabbing onto one of its own option buttons. Check the wrapper's `contains(relatedTarget)` instead, and wire options to `onClick` (fires for mouse and keyboard), not `onMouseDown` alone.
30. **Frontend state lifted to one top-level component means every keystroke anywhere re-renders and re-derives everything** — `CreateInvoiceEditor` memoizes totals (`useMemo` keyed only on what actually feeds the calculation) after an unmemoized version caused test timeouts under CPU load. Watch for the same pattern with any future expensive derived computation.
31. **JS floating-point arithmetic silently breaks naive 2-decimal currency rounding** — `10.555 * 100` in a JS `number` is `1055.4999999999998`, not `1055.5`. A backend `decimal` calculation ported faithfully to TypeScript will look correct in review and be wrong at runtime. Fix: a small documented epsilon before rounding — see `frontend/app/invoice/create/lib/invoiceTotals.ts`'s `round()`.
32. **`vitest.config.ts`'s `testTimeout` is 10000ms**, empirically re-measured (not a guess) — Vitest's 5s default is unreliable once many test files run in parallel under CPU contention on this machine. If a test seems to hang or produce garbled/interleaved text rather than failing cleanly, suspect a leaked fake-timer or the timeout before assuming a logic bug; prefer `user.paste()` over `user.type()` when only the final value matters.
33. **RTL's automatic `afterEach(cleanup)` never self-registers** since `vitest.config.ts` doesn't set `test.globals: true` — `vitest.setup.ts` calls `cleanup()` explicitly; preserve this in any future config change or multi-`it()` files will leak DOM state between tests.
34. **Next.js 16.1.6's root-layout title template doesn't apply to a page's own `title` string** — confirmed genuine framework behavior, not a stale-cache artifact. Set the full title explicitly (e.g. `` `${pageTitle} | Invoice App` ``) rather than relying on the layout's `template`.
35. **`IG-21` (acquisition analytics) is not truly end-to-end complete** — events (`landing_page_view`, `invoice_editor_start`) are emitted correctly to `ConsoleAnalyticsSink` but nothing durably captures them yet. `setAnalyticsSink()` (`frontend/lib/analytics/track.ts`) is the swap point once a real provider is chosen — raise this if analytics work comes up.

**Local environment**
36. **Postgres runs on host port 5433, not 5432** (`infrastructure/docker/docker-compose.yml`) — this machine has another project's Postgres container on 5432; start with `docker compose -f infrastructure/docker/docker-compose.yml up -d`.
37. **`dotnet-ef` global tool must be at version 8.0.11** (matching this project's EF Core version) — `dotnet tool install --global dotnet-ef --version 8.0.11` in a fresh environment.
38. **Target framework is .NET 8 (SDK 8.0.300), not .NET 10** — two approved .NET 10 install attempts stalled; don't represent the current target as .NET 10 until the SDK is reliably available and the upgrade is actually done.
39. **Real Firefox and WebKit engines are cached locally** (`ms-playwright/firefox-1543`, `ms-playwright/webkit-2359`) alongside Chromium — reuse for cross-browser verification. **WebKit quirk**: `.fill()` doesn't reliably trigger this app's React `onChange` under this build (DOM value sets, React state doesn't) — use `.click()` + `.pressSequentially()` instead. Chromium/Firefox unaffected.
40. **No project skill exists for browser verification** — an ad-hoc Playwright script in a scratch directory (`npm install --no-save playwright@<version>`, plain `.mjs`, `page.goto`/`getByRole`/`.screenshot()`) is the established approach; Chromium is already downloaded locally so `npx playwright install chromium` is a no-op check.
41. **`waitForLoadState("networkidle")` is unreliable in Next.js dev mode** (HMR/websocket activity keeps it from settling) — prefer `page.waitForURL(pattern)` for cross-page checks and a short fixed `waitForTimeout` for same-page state changes.
42. **Tailwind's `uppercase` class is reflected in Playwright's `innerText`** — a `<dt class="uppercase">Supplier</dt>` comes back as `"SUPPLIER"`, so a verification script asserting `innerText.includes("Supplier")` fails against correct markup. Match case-insensitively for any CSS-upper-cased label. Equally, assert "this page never says Customer" against the specific table/article, not `body` — `SiteHeader`'s nav has a "Customers" link that makes a whole-page check always fail. Both produced false failures in `IG-292` before the real behaviour was confirmed correct.
43. **The backend needs `ASPNETCORE_ENVIRONMENT=Development` when started without a launch profile** — the connection string lives only in `appsettings.Development.json`, so `dotnet run --no-launch-profile` dies on startup with "ConnectionStrings:Default is required". Use `ASPNETCORE_ENVIRONMENT=Development dotnet run --no-launch-profile --urls http://localhost:5094`. Migrations are **not** applied at startup, so run `dotnet ef database update` first if a migration has just been added.
44. **Confirm a PID's actual command line before killing it to free a port/lock** (e.g. `Get-CimInstance Win32_Process -Filter 'ProcessId = <pid>'` on Windows) — this machine has had unrelated processes on ports that look like a stale dev-server lock at a glance; a misread has killed the wrong process before. Port 3000 in particular may already be occupied by an unrelated project (Next.js auto-selects the next free port on its own).

## Handoff Update Template

Keep "Current Status"/"Current Focus / Next Task" current as work lands; add new lessons to "Engineering Notes" only if they're non-obvious and durable (not "what I did today" — that belongs in the Jira comment and commit message). Prune a note once it's fully superseded rather than layering a correction on top.

```text
Current Status: <what changed since the last update, in 1-3 bullets>
Current Focus / Next Task: <what's claimed/next, or "nothing claimed">
New Engineering Notes (if any): <non-obvious, durable lessons only>
```
