# Current Delivery Handoff

## Authority

Jira project `IG` is the authoritative delivery backlog. This file is a local handoff summary only; it does not replace Jira status, priority, assignment, hierarchy or acceptance criteria.

Requirements and architecture are authoritative under `docs/` as described in `AGENTS.md`.

## Current Project Status

**Phase:** Epic `IG-1` and Epic `IG-2` are both complete. Within Epic `IG-3` (Identity, Authentication and Account Security), Stories `IG-22` (register), `IG-24` (login/logout), `IG-27` (delete account), `IG-23` (Google sign-in) and `IG-25` (password recovery) are all complete. Story `IG-26` (secure session) has both its Subtasks Done but **the Story itself is deliberately left In Progress, not Done** — its "offers sign-in" acceptance criterion can't be satisfied yet because no frontend auth UI exists anywhere in `frontend/` (only the Epic IG-2 landing page). Same class of gap as `IG-21`. `IG-3` has **no remaining unclaimed Stories** — the only open item left in the Epic is `IG-26`'s frontend-UI gap.

**Epic `IG-5` (Invoice Editor and Calculation Engine) is now the active Epic**, picked over `IG-4` because `IG-4`'s own Jira description lists `IG-5`/`IG-6`/`IG-7` as dependencies and none of those exist yet, while `IG-5` only depends on the already-Done `IG-1`. `IG-5` has 6 Stories (`IG-33`-`IG-38`, S21-S26). `IG-33` (S21, layout), `IG-34` (S22, header/seller/customer fields), `IG-35` (S23, line items) and `IG-36` (S24, calculate accurate invoice totals) are all Done. `IG-36` genuinely needed backend work as predicted - see "Last Execution" below; the previously-empty `InvoiceApp.Modules.Invoicing` project now has its first real code. `IG-37` (S25, notes/terms/payment instructions) is next.

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

Epic `IG-5`'s next unclaimed Story is `IG-37` (S25, add notes, terms and payment instructions) — check its live Subtasks before claiming, Codex may have picked something up:

```text
Epic:    IG-5  — Invoice Editor and Calculation Engine
Story:   IG-37 — Add notes, terms and payment instructions
Subtask: IG-121 (implement), IG-122 (verify rendering) — check live status before claiming
```

Direct links:

- <https://appitometechnologies.atlassian.net/browse/IG-5>
- <https://appitometechnologies.atlassian.net/browse/IG-37>

## Next Task

`IG-119`/`IG-120` (T047/T048, both Subtasks of `IG-36`) are Done; `IG-36` itself is Done — the fourth Story in Epic `IG-5`.

Before implementation:

1. Check `IG-37`'s Subtasks (`IG-121`, `IG-122`) and their live status/assignee/comments first.
2. This should be frontend-only again, like `IG-33`-`IG-35` (Notes max 2,000 chars, Terms and Conditions max 5,000 chars per FSD §30/31, both optional, plain text/multiline) - unlike `IG-36`, nothing here obviously implies backend work, but confirm from the Subtask descriptions rather than assuming.
3. **Extend `CreateInvoiceEditor.tsx`** (the client component composing the whole editor) and `InvoiceEditorLayout`'s editor pane, following the same `lib/` (pure validation) + component pattern as every prior Story in this Epic. Consider whether Notes/Terms belong in `InvoicePreview.tsx` too (FSD doesn't explicitly say, but the preview has shown everything else entered so far).
4. Continue the pattern established in `IG-33`-`IG-36`: colocate `*.test.tsx` next to the component being tested, verify with `npm test`/`npm run lint`/`npm run build`, and do a **real-browser pass** (Playwright/Chromium via `npx`, already installed at `~/AppData/Local/ms-playwright`) for anything jsdom can't actually verify - this has caught real bugs in every Story so far (see "Blockers and Open Decisions" below), most recently a negative-totals bug in `IG-36` from an unclamped discount percentage.
5. **A doc mismatch was flagged during `IG-34`/`IG-115`, not yet resolved**: FSD §13 lists "Contact Name" as a Seller field but `docs/DATABASE_SCHEMA.md`'s `business.businesses` table has no `contact_name` column (it has an unrelated `legal_name` column instead). Doesn't block frontend work, but flag it again if a backend Invoice Persistence Story (`IG-7`) picks this up before it's reconciled.
6. **`IG-36` added the first backend code in Epic `IG-5`**: `POST /api/v1/invoices/calculate` (`InvoiceApp.Modules.Invoicing/Calculations/InvoiceCalculator.cs`, stateless, no persistence, no auth). If `IG-38` (S26, the last Story in this Epic - validation/unsaved-change protection) or anything later needs to call it, it's already there; don't rebuild it.
7. **Remember the open frontend-auth-UI gap** (see "Open follow-up carried over from `IG-26`" below) — if `IG-31` (preserve invoice context through authentication, later in Epic `IG-4`) or any other Epic IG-3 revisit needs frontend sign-in UI, flag it the same way rather than silently building only a backend endpoint.
8. **Local-commit-only workflow as of 2026-08-25**: commit but do not push to GitHub — the user pushes manually at the end of the day. Don't watch GitHub Actions after a commit; there's nothing to watch until the user pushes. Verification evidence in Jira comments should cite the local commit hash, not a CI run URL, until this changes.
9. **Google OAuth credentials are configured locally** (`dotnet user-secrets`, `Authentication:Google:ClientId`/`ClientSecret`, in `InvoiceApp.Api`'s user-secrets store, ID `1bb70798-d419-459c-9213-a684a846ba1a`) — not committed, never will be (see `backend/README.md`'s Secrets section).
10. **Password-reset email delivery is a dev-only log stub as of 2026-08-25** (`IPasswordResetEmailSender` → `LoggingPasswordResetEmailSender`) — the user explicitly chose this over SMTP/a transactional API for now. Swapping in a real provider (SendGrid/SES/etc.) is a follow-up, not yet a Jira item.

## Last Execution

**Date:** 2026-08-25 Australia/Sydney

Completed:

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

`IG-119` and `IG-120` are both Done, each with a claim comment (start) and a verification comment (completion, including automated-test, real-Postgres and real-browser/Playwright evidence). Parent Story `IG-36` is Done — the fourth Story in Epic `IG-5`, and the first to need real backend work (confirmed, not just predicted). `IG-117`/`IG-118` remain Done, parent Story `IG-35` Done. `IG-115`/`IG-116` remain Done, parent Story `IG-34` Done. `IG-113`/`IG-114` remain Done, parent Story `IG-33` Done — Epic `IG-5` (Invoice Editor and Calculation Engine) is the active Epic. `IG-97`/`IG-98` remain Done, parent Story `IG-25` Done — the last remaining Story in Epic `IG-3`. `IG-93`/`IG-94` remain Done, parent Story `IG-23` Done. `IG-101`/`IG-102` remain Done, parent Story `IG-27` Done. `IG-99`/`IG-100` remain Done; parent Story `IG-26` remains explicitly **not** Done (In Progress, frontend gap — the only open item left anywhere in Epic `IG-3`). `IG-95`/`IG-96` remain Done, parent Story `IG-24` Done. Epic `IG-3` has no remaining unclaimed Stories. Epic `IG-5` has 2 remaining unclaimed Stories (`IG-37`, `IG-38`); `IG-121`/`IG-122` (Subtasks of `IG-37`) confirmed To Do/unassigned as of this sync. Jira remains authoritative; refresh live issue state before starting work in a later session.

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
