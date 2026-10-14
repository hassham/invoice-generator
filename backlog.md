# Current Delivery Handoff

## Authority

Jira project `IG` is the authoritative delivery backlog. This file is a local handoff summary only; it does not replace Jira status, priority, assignment, hierarchy or acceptance criteria. Requirements and architecture are authoritative under `docs/` as described in `AGENTS.md`.

Jira project: <https://appitometechnologies.atlassian.net/jira/software/projects/IG>

**Compressed 2026-10-15.** The full execution history up to this date (per-issue logs, files changed, verification detail) is preserved verbatim at `archive/backlog-2026-10-15.md`. The earlier pre-2026-09-09 history is at `archive/backlog-2026-09-09.md`. Jira issue comments and git commit messages are the record of *what happened and why*; this file only tracks current state, open decisions and standing lessons.

## Current Status (as of 2026-10-15)

Jira was read on 2026-10-14 (read-only; no Jira writes made).

- Jira project `IG` has **4 non-Done issues**: `IG-211` (Epic, In Progress), `IG-241` (Story, In Progress), `IG-301` (Subtask, To Do), `IG-302` (Subtask, To Do). Everything else is Done in Jira.
- All Done work is committed locally. Latest commit: `d185391` (IG-246 handoff). Commits `e40debb`, `b6c9c51`, `3cc1394` (IG-242, IG-303, IG-304), `a98541b` (IG-240, IG-299, IG-300), `c2dffc6` (IG-297, IG-298) and `f5c19e3` (IG-315) are in `main`.
- Verification run 2026-10-14 (this file's author, on the current tree):
  - Frontend: `tsc --noEmit` clean; `vitest run` 820/820 across 106 files.
  - Backend: `dotnet test InvoiceApp.sln`: Architecture 14/14; Infrastructure 242 passed, 10 skipped; API 468 passed, 4 skipped; no failures.
  - Not run in this pass: `npx eslint .` and `npm run build`.
- Working tree: only `frontend/next-env.d.ts` is modified (a generated Next.js file).

## Open Jira Work

| Jira | Type | Jira status | Code state (verified 2026-10-14) |
|---|---|---|---|
| `IG-211` | Epic | In Progress | Closes after `IG-241` closes. |
| `IG-241` | Story | In Progress | Parked for a later release. Criterion 2 (language per account) is decided as per-account. The second language is not chosen. Message catalogue `app/lib/messages/en.ts` (commit `e40debb`) covers the team, invitation and combined-report pages. |
| `IG-301` | Subtask | To Do | Partly started. The catalogue exists, but the rest of the app has not been audited for hard-coded English. Remaining scope is unknown until audited. |
| `IG-302` | Subtask | To Do | Blocked. Cannot test language switching until a second language exists. |

## Current Focus / Next Task

Focus: `IG-241` is parked. Nothing is claimed.

Exact next steps, in order:

1. **Product decision (blocks `IG-302` and closure of `IG-211`):** which second language to add.
2. Once chosen: audit the app for hard-coded English, move it into the catalogue (`IG-301`), then build `IG-302`.
3. Operational: set `Api:PublicBaseUrl` in each deployment to the public API URL. `appsettings.json` and `InvoiceEmailDispatcher` both default to `http://localhost:5094`, so invoice email open-tracking pixels point nowhere useful in production until it is set.
4. Browser check (not yet done): `/reports/combined`, and the Opened column in invoice email history.
5. Not built: open tracking for estimate emails (`InvoiceEmailLog` covers invoices only).

## Blockers and Decisions

- **Second language** (see step 1 above). Blocks `IG-302`, `IG-211` and therefore the Epic.
- **Privacy disclosure for open tracking.** Recipients are tracked by a 1x1 pixel (`InvoiceEmailLog.OpenToken`, `FirstOpenedAt`, `OpenCount`). Decide whether the emails or the privacy policy must say so.

## Known Gaps (carried forward, not Jira-tracked here)

- No nav entries for Phase 2 surfaces (estimates, receipts, credit notes, recurring, reports, documents, purchase orders). They are URL-only; the header is at its width limit (Engineering Note 27). Belongs with `IG-198`.
- Credit notes and receipts have no detail page; their rows on `/documents` link to their list.
- `Frontend:Custom` recurring frequency behaves as monthly (`CalculateNextRunDate`). No interval field exists.
- `GET /api/v1/documents` merges per-type results in memory (Engineering Note 46). Needs a DB view or raw `UNION ALL` at tens of thousands of documents per account.
- Purchase order PDF does not show delivery instructions (only the `CustomInstructions` slot, which renders under "Payment Instructions").
- Credit note numbers from before `IG-310` (`CN-{guid}{date}{seq}`) coexist with the new `CN-{yyyyMMdd}-{seq:D3}` format. Old numbers are not migrated, by design.
- A new account's default tax rate is 0%, not the FSD's 10% (Engineering Note 45).

## Jira Sync State

Read 2026-10-14 (read-only, `project = IG AND statusCategory != Done`). No Jira writes made. Re-read Jira before claiming any issue.

## Handoff Rules

Update this file after each meaningful execution. Replace stale current-state information rather than appending a diary.

## Deferred Decisions

Things knowingly left undone, with the condition that should bring them back up. Raise each one
when its trigger fires rather than acting on it unprompted.

- **`main` branch protection — raise when the current Jira set closes out.** `main` requires the
  "Backend build" and "Frontend build" checks (`strict: true`, `enforce_admins: false`), so every
  direct push logs "Bypassed rule violations ... 2 of 2 required status checks are expected". The
  checks only start after the ref moves, so a direct push can never satisfy them; no repo change
  removes the warning. CI is healthy and passes on every push — the gate is cosmetic, not broken.
  The user decided 2026-10-11 to defer this and be reminded once the remaining Jira items are done,
  intending then to implement the checks properly via a PR-based flow rather than removing them.
  Until then: keep pushing to `main` on request, and do not alter branch protection.

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
23. **A `CountAsync() + 1` document-number sequence races** — two documents created for one business on the same day can silently receive the same number. Back any such sequence with a unique index on (business_id, number) so a loser fails loudly rather than duplicating an accounting number (receipts `IG-289`, purchase orders `IG-291`, credit notes `IG-234` — **all three now have the index**). Two further traps, both hit by purchase orders in `IG-291` and fixed in `IG-292`: (a) **the date used to filter the sequence must be the same date embedded in the number** — counting rows by "today" while numbering by the caller's issue date made every backdated document `PO-{today}-001`, so the second one hit the unique index as an unhandled 500, deterministically rather than only under concurrency; (b) **count-based sequences reuse numbers after a soft delete** — derive the next value from the max sequence already present in the stored numbers instead, so a deleted accounting number is never issued twice. Critically, **EF Core InMemory does not enforce unique indexes**, so `dotnet test` can never prove any of this — it happily inserts the duplicate Postgres rejects. The same blind spot as Note 21's migrations: verify a numbering fix against real Postgres (Note 7's fixture, or a live server), which is how `IG-292`'s fix was actually confirmed rather than by the green suite alone.
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
44. **Confirm a PID's actual command line before killing it to free a port/lock** (e.g. `Get-CimInstance Win32_Process -Filter 'ProcessId = <pid>'` on Windows) — this machine has had unrelated processes on ports that look like a stale dev-server lock at a glance; a misread has killed the wrong process before. Port 3000 in particular may already be occupied by an unrelated project (Next.js auto-selects the next free port on its own). A second `next dev` against the same repo also fails outright with "Unable to acquire lock at `frontend/generated/dev/lock`" — check for an already-running dev server before starting one.
45. **A freshly registered account's `defaultTaxRate` is `0`, not the FSD's "Australian default: 10% GST"** — that 10% is `DEFAULT_TAX_RATE_PRESET`, which applies to *anonymous* invoice drafts only. Any authenticated create flow resolves the rate from the business profile (`resolveTaxRateDefault`, IG-203), so a brand-new account's first line starts at 0%. A verification script that assumes 10% for a just-registered user reports false failures (four of them in `IG-307`, all of which were the script being wrong, not the form). Either set the profile's rate first or choose the rate explicitly in the form.
46. **EF Core cannot union projections, and cannot filter over one** — two separate limits that both bite any "one list across several tables" query. `a.Select(...).Concat(b.Select(...))` fails with *"Unable to translate set operation after client projection has been applied"*, and there is no shared entity type to `Concat` before projecting when the tables are unrelated. Applying `.Where(row => row.SomeProjectedProperty == x)` to a projected queryable fails too (*"The LINQ expression could not be translated"*). So: push every filter into each source query against **real columns**, then merge the materialised results in memory. Hit twice in `IG-237`; `DocumentListService`'s own doc comment carries the detail.
47. **An enum persisted with `HasConversion<string>()` must never be cast to `int` in a projection** — the column holds `'Draft'`, so Postgres raises `22P02: invalid input syntax for type integer: "Draft"` at read time. Project the enum property itself (EF converts it back), or give each enum its own field when several must share a row shape. The InMemory provider has no column type and passes happily, so `dotnet test` stays green and only a real database shows it — the same trap as Note 23. Both `Invoice.Status` and `Estimate.Status` are string-converted.

## Handoff Update Template

Keep "Current Status"/"Current Focus / Next Task" current as work lands; add new lessons to "Engineering Notes" only if they're non-obvious and durable (not "what I did today" — that belongs in the Jira comment and commit message). Prune a note once it's fully superseded rather than layering a correction on top.

```text
Current Status: <what changed since the last update, in 1-3 bullets>
Current Focus / Next Task: <what's claimed/next, or "nothing claimed">
New Engineering Notes (if any): <non-obvious, durable lessons only>
```
