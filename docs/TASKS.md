# MVP Implementation Subtask Catalogue

## 1. Purpose

This document decomposes the 60 User Stories in `docs/STORIES.md` into Jira-ready implementation Subtasks. Jira requires these work items to use the **Subtask** issue type beneath their Story parent.

Each Subtask is grounded in `docs/PRD.md`, `docs/FSD.md`, `docs/SAD.md`, `docs/EPICS.md` and `docs/STORIES.md`.

## 2. Common Definition of Done

Every Subtask must:

- Implement only the stated scope and preserve account/business authorization boundaries.
- Include appropriate automated tests or repeatable verification evidence.
- Handle loading, validation and failure behavior relevant to its scope.
- Avoid exposing secrets, invoice contents or unnecessary personal data in logs.
- Update affected technical or user documentation when behavior or contracts change.
- Pass required build, test and review checks.

---

# 3. Subtasks by User Story

## S01 — Establish the modular application foundation

### T001 — Create the modular solution structure

**Completion Criteria:** Frontend, backend and named modules build from a clean checkout with boundaries matching the SAD.

### T002 — Add architecture-boundary verification

**Completion Criteria:** Automated checks or tests detect prohibited module references and pass for the intended structure.

## S02 — Configure secure application environments

### T003 — Implement environment configuration loading

**Completion Criteria:** Required settings load per environment and missing settings fail with actionable, non-sensitive errors.

### T004 — Protect and verify application secrets

**Completion Criteria:** Secrets remain outside source control, client bundles and logs; configuration tests cover safe failure behavior.

## S03 — Manage database schema evolution

### T005 — Create the initial database migration set

**Completion Criteria:** A clean database can be created with the required MVP schema and constraints.

### T006 — Add repeatable migration and seed verification

**Completion Criteria:** Upgrade and idempotent seed checks pass without manual schema edits or duplicate reference data.

## S04 — Automate build and delivery validation

### T007 — Configure frontend and backend build pipelines

**Completion Criteria:** A clean pipeline run restores dependencies and produces both build artifacts.

### T008 — Enforce automated quality gates

**Completion Criteria:** Required test or build failures are reported and prevent an invalid release artifact.

## S05 — Observe application health and failures

### T009 — Implement application and dependency health checks

**Completion Criteria:** Health responses distinguish healthy, degraded and failed dependencies without disclosing secrets.

### T010 — Implement structured error diagnostics

**Completion Criteria:** Errors carry correlation context, exclude sensitive values and can be investigated through configured monitoring.

## S06 — Discover the product from the landing page

### T011 — Build the responsive landing-page content

**Completion Criteria:** Approved headline, benefits, templates, FAQ and pricing teaser render accessibly across target layouts.

### T012 — Connect landing-page creation calls to action

**Completion Criteria:** Every primary Create Invoice action opens the correct generator route and passes navigation tests.

## S07 — Navigate public product pages

### T013 — Build accessible public navigation

**Completion Criteria:** Approved public, authentication and invoice-creation destinations are reachable by pointer and keyboard.

### T014 — Verify responsive navigation states

**Completion Criteria:** Desktop and mobile navigation, focus behavior and active routes pass interaction tests.

## S08 — Find public pages through search engines

### T015 — Add public-page SEO metadata

**Completion Criteria:** Indexable pages expose appropriate titles, descriptions and canonical metadata.

### T016 — Control public and private route indexing

**Completion Criteria:** Public content is crawlable where intended and authenticated application routes are excluded.

## S09 — Measure acquisition activity

### T017 — Instrument acquisition funnel events

**Completion Criteria:** Landing visits, approved source context and editor starts emit the defined events.

### T018 — Verify privacy-safe analytics behavior

**Completion Criteria:** Events exclude invoice contents and unnecessary personal data, and analytics failures do not block navigation.

## S10 — Register with email and password

### T019 — Implement email registration workflow

**Completion Criteria:** Field validation, password rules, duplicate handling, account creation and default business creation follow the FSD.

### T020 — Test registration security and outcomes

**Completion Criteria:** Successful and rejected registration cases verify session creation, safe errors and no partial account state.

## S11 — Register or sign in with Google

### T021 — Integrate Google authentication flow

**Completion Criteria:** Approved provider responses create or access the correct account and return a valid session.

### T022 — Handle Google authentication edge cases

**Completion Criteria:** Cancellation, provider failure and identity-linking cases return safe results without unintended duplicate accounts.

## S12 — Sign in and sign out securely

### T023 — Implement credential login and session logout

**Completion Criteria:** Valid credentials create a session, logout invalidates it and protected routes respond appropriately.

### T024 — Test safe authentication errors

**Completion Criteria:** Invalid credential and session cases use generic messages and do not reveal account existence.

## S13 — Recover a forgotten password

### T025 — Implement password-reset request and completion

**Completion Criteria:** Reset requests, expiring single-use tokens and password replacement follow the FSD.

### T026 — Test password-reset security boundaries

**Completion Criteria:** Unknown email, reused, expired and invalid token cases remain safe and leave credentials consistent.

## S14 — Maintain a secure authenticated session

### T027 — Enforce authenticated route and API access

**Completion Criteria:** Missing, invalid and expired sessions cannot access protected application resources.

### T028 — Implement session expiry and rate-limit handling

**Completion Criteria:** Users receive the defined recovery experience and sensitive endpoints enforce configured limits.

## S15 — Delete my account safely

### T029 — Implement confirmed account-deletion workflow

**Completion Criteria:** Only the authenticated owner can confirm deletion and the operation follows retention rules.

### T030 — Verify post-deletion access and audit behavior

**Completion Criteria:** The session is invalidated, deleted access is rejected and required audit/retention evidence remains.

## S16 — Create and preview an invoice anonymously

### T031 — Enable anonymous invoice editing

**Completion Criteria:** All approved invoice fields and template choices work without an authenticated session.

### T032 — Verify anonymous preview and storage boundaries

**Completion Criteria:** Preview updates correctly and no permanent account-owned invoice is created anonymously.

## S17 — Recover an anonymous invoice draft locally

### T033 — Persist recoverable anonymous draft state

**Completion Criteria:** Supported invoice and template state is stored locally without server-side permanent ownership.

### T034 — Restore and expire anonymous drafts safely

**Completion Criteria:** Refresh/return restoration works and expiry or clearing follows the retention policy.

## S18 — Authenticate when downloading or printing

### T035 — Build the Download and Print authentication gate

**Completion Criteria:** Anonymous output requests display registration and login options with approved value messaging.

### T036 — Prevent unauthenticated output bypass

**Completion Criteria:** PDF and printer-friendly endpoints reject anonymous access and tests cover direct-request attempts.

## S19 — Preserve invoice context through authentication

### T037 — Carry invoice and pending-action state through authentication

**Completion Criteria:** Invoice fields, template customisation and requested output survive supported authentication methods.

### T038 — Handle authentication cancellation and failure

**Completion Criteria:** Recoverable data remains populated and no gated action completes when authentication is cancelled or fails.

## S20 — Complete the pending invoice action after authentication

### T039 — Convert and save the authenticated invoice

**Completion Criteria:** The handoff validates, associates and saves one invoice under the authenticated account.

### T040 — Resume output idempotently and measure conversion

**Completion Criteria:** Download/print resumes without another click, retries avoid duplicates and privacy-safe funnel events are emitted.

## S21 — Edit an invoice responsively

### T041 — Build desktop and mobile editor layouts

**Completion Criteria:** Desktop split view and mobile Edit/Preview modes preserve the same invoice state.

### T042 — Verify responsive editor accessibility

**Completion Criteria:** Supported viewport, keyboard, focus and mode-switching tests pass without lost input.

## S22 — Enter invoice header and party details

### T043 — Implement invoice, seller and customer fields

**Completion Criteria:** All approved fields, formats, lengths and required indicators follow the FSD.

### T044 — Validate party and header inputs

**Completion Criteria:** Field-level errors identify corrections and valid values survive rejected submissions.

## S23 — Manage invoice line items

### T045 — Implement invoice line-item interactions

**Completion Criteria:** Users can add, edit, order and remove supported item fields without inconsistent state.

### T046 — Validate line-item edge cases

**Completion Criteria:** Minimum items, numeric ranges, removal and reordering behaviors follow the FSD and update totals.

## S24 — Calculate accurate invoice totals

### T047 — Implement authoritative invoice calculations

**Completion Criteria:** Subtotal, discounts, tax, inclusive/exclusive pricing and totals follow the documented formulas.

### T048 — Test calculation and rounding consistency

**Completion Criteria:** Representative and boundary cases match across frontend preview, backend authority and output rendering.

## S25 — Add notes, terms and payment instructions

### T049 — Implement supporting invoice content fields

**Completion Criteria:** Notes, terms and payment instructions enforce supported optionality and lengths.

### T050 — Verify supporting content rendering

**Completion Criteria:** Empty and populated states appear consistently in preview, PDF and print without misleading sections.

## S26 — Validate and protect unsaved invoice changes

### T051 — Implement invoice validation feedback

**Completion Criteria:** Invalid fields show actionable errors and invalid invoices cannot be finalized or output.

### T052 — Implement unsaved-change protection

**Completion Criteria:** Navigation warnings follow the FSD and Stay/Leave behavior preserves or discards state as selected.

## S27 — Select an invoice template

### T053 — Build the launch template selector

**Completion Criteria:** Ten original templates are selectable with approved preview and entitlement information.

### T054 — Verify template switching behavior

**Completion Criteria:** Switching templates retains invoice data and applies entitlement restrictions consistently.

## S28 — Customise invoice appearance

### T055 — Implement supported template customisation

**Completion Criteria:** Approved colors, fonts and header options update the selected template and persist as required.

### T056 — Validate customisation inputs and states

**Completion Criteria:** Unsafe or invalid values are rejected/normalized and reset/default behavior is testable.

## S29 — Preview the final invoice live

### T057 — Build the complete live-preview renderer

**Completion Criteria:** Every required invoice field and visual setting renders in the preview.

### T058 — Verify preview responsiveness and parity

**Completion Criteria:** Updates meet the near-instant target and representative previews materially match server output.

## S30 — Upload and render a business logo safely

### T059 — Implement secure logo upload processing

**Completion Criteria:** Only supported size/type/content passes validation and storage uses safe identifiers.

### T060 — Verify logo rendering and failure states

**Completion Criteria:** Valid logos render in preview/PDF/print and invalid or failed uploads provide safe recovery guidance.

## S31 — Download a professional invoice PDF

### T061 — Implement authoritative PDF generation

**Completion Criteria:** Authenticated requests validate, calculate and render the selected template using backend-authoritative data.

### T062 — Verify PDF quality and error recovery

**Completion Criteria:** Page formats, text selection, filename safety, size, visual parity and generation failures meet the FSD.

## S32 — Print an invoice cleanly

### T063 — Implement authenticated printer-friendly rendering

**Completion Criteria:** Authenticated output contains the complete invoice without application navigation.

### T064 — Verify print layout and authentication enforcement

**Completion Criteria:** Representative page layouts match preview and anonymous direct access remains gated.

## S33 — Save and auto-save invoice drafts

### T065 — Implement manual and inactivity-based invoice saving

**Completion Criteria:** Authorized invoices save manually and after the configured inactivity interval with visible state.

### T066 — Verify save concurrency and recovery

**Completion Criteria:** Rapid edits, failed saves and retries do not overwrite newer data or create duplicate invoices.

## S34 — Assign unique invoice numbers

### T067 — Implement business-scoped invoice number allocation

**Completion Criteria:** Prefix, sequence and edit rules create unique numbers within the business.

### T068 — Test numbering concurrency and conflicts

**Completion Criteria:** Concurrent allocation and invalid/conflicting configuration cannot produce duplicate numbers.

## S35 — View and edit a saved invoice

### T069 — Build invoice detail and edit experiences

**Completion Criteria:** Authorized users see required content, metadata, status and activity and can edit permitted fields.

### T070 — Enforce edit authorization and paid warnings

**Completion Criteria:** Cross-account edits fail and paid-invoice edits display the documented warning before save.

## S36 — Duplicate an existing invoice

### T071 — Implement invoice duplication

**Completion Criteria:** Approved source fields copy into an independent invoice with a new identity and initial state.

### T072 — Verify duplicate isolation and authorization

**Completion Criteria:** Source changes are impossible through the duplicate and unauthorized sources cannot be copied.

## S37 — Cancel or delete an invoice safely

### T073 — Implement invoice cancellation and deletion rules

**Completion Criteria:** Allowed operations require confirmation and enforce status, ownership and retention restrictions.

### T074 — Verify lifecycle and audit outcomes

**Completion Criteria:** Disallowed actions fail safely and successful operations preserve required historical/audit evidence.

## S38 — Maintain invoice status and audit history

### T075 — Implement invoice status transitions and overdue evaluation

**Completion Criteria:** Status changes and overdue calculation follow eligible state, due date and balance rules.

### T076 — Record and verify invoice audit events

**Completion Criteria:** Material lifecycle actions store actor, time and action context without sensitive payload leakage.

## S39 — Start with a default business profile

### T077 — Create the default business profile during registration

**Completion Criteria:** Exactly one usable profile is associated with the new account without partial state.

### T078 — Apply available profile values to new invoices

**Completion Criteria:** Authorized new invoices use saved profile values while anonymous and other-account data remain isolated.

## S40 — Complete or skip guided onboarding

### T079 — Build the guided onboarding flow

**Completion Criteria:** Defined business, tax and logo steps save progress and populate the profile.

### T080 — Support safe onboarding skip and resume

**Completion Criteria:** Optional steps can be skipped without blocking product use and saved steps remain consistent.

## S41 — Maintain business identity and defaults

### T081 — Implement business profile and default settings

**Completion Criteria:** Authorized users can update supported identity, contact, tax, currency, date and payment defaults.

### T082 — Verify default propagation and historical isolation

**Completion Criteria:** New invoices use current defaults and existing invoices do not change silently.

## S42 — Configure invoice numbering

### T083 — Build invoice numbering settings

**Completion Criteria:** Authorized users can configure supported prefix and next-number values with clear validation.

### T084 — Prevent numbering collisions

**Completion Criteria:** Conflicting and invalid settings are rejected and subsequent invoice allocation remains unique.

## S43 — Manage customer records

### T085 — Implement customer create, view and update operations

**Completion Criteria:** Supported fields validate and all operations remain scoped to the authorized business.

### T086 — Build customer list states and tests

**Completion Criteria:** Loading, empty, success and failure states work and cross-account access is rejected.

## S44 — Select a saved customer on an invoice

### T087 — Implement account-scoped customer search and selection

**Completion Criteria:** Matching active customers appear and selection populates approved invoice fields.

### T088 — Preserve historical customer snapshots

**Completion Criteria:** Saved invoices retain their copied customer values when the source customer later changes.

## S45 — Manage product and service records

### T089 — Implement catalogue create, view and update operations

**Completion Criteria:** Description, price, unit and tax fields validate within the authorized business.

### T090 — Build catalogue list states and tests

**Completion Criteria:** Loading, empty, success and failure states work and cross-account access is rejected.

## S46 — Select a saved item on an invoice

### T091 — Implement account-scoped item search and selection

**Completion Criteria:** Matching active items populate approved invoice line fields.

### T092 — Separate invoice copies from catalogue records

**Completion Criteria:** Editing the selected invoice line does not silently change its catalogue source.

## S47 — Archive reusable records safely

### T093 — Implement customer and item archiving

**Completion Criteria:** Authorized users can archive eligible records and archived entries leave normal selection results.

### T094 — Verify historical record integrity

**Completion Criteria:** Existing invoices retain snapshot values and management views identify archived state where required.

## S48 — View billing summary metrics

### T095 — Implement dashboard aggregation rules

**Completion Criteria:** Invoiced, paid, outstanding and overdue values follow the FSD and authorized business scope.

### T096 — Verify dashboard accuracy and safe states

**Completion Criteria:** Representative datasets, empty data and failures never display misleading totals.

## S49 — Access recent invoices and useful empty states

### T097 — Build the recent-invoices dashboard component

**Completion Criteria:** Authorized recent documents use defined ordering, fields, limits and detail links.

### T098 — Implement actionable dashboard empty states

**Completion Criteria:** Each defined empty condition explains the state and offers the appropriate permitted action.

## S50 — Browse paginated invoice history

### T099 — Implement account-scoped paginated invoice retrieval

**Completion Criteria:** Stable pages return required summary fields for only the authorized business.

### T100 — Build invoice-list loading and failure states

**Completion Criteria:** Navigation retains view state and slow/failed requests remain usable and retryable.

## S51 — Search, filter and sort invoices

### T101 — Implement invoice query criteria

**Completion Criteria:** Documented search fields, filters and sort options combine consistently on account-scoped data.

### T102 — Build query controls and reset behavior

**Completion Criteria:** Applied criteria are visible, retained during paging and can be cleared to the default view.

## S52 — Record a full or partial payment

### T103 — Implement authorized payment recording

**Completion Criteria:** Eligible invoices accept valid amount, date, method and reference values atomically.

### T104 — Test full and partial payment outcomes

**Completion Criteria:** Balances, histories and statuses update correctly and cross-account attempts fail.

## S53 — Validate payment entries

### T105 — Enforce payment domain validation

**Completion Criteria:** Non-positive, excessive, invalid-date and missing-field payments are rejected according to the FSD.

### T106 — Verify atomic payment failures

**Completion Criteria:** Rejected and failed requests leave both payment and invoice state unchanged with actionable safe errors.

## S54 — Review and remove recorded payments

### T107 — Build payment history and authorized removal

**Completion Criteria:** Required payment details display and eligible removal follows confirmation and ownership rules.

### T108 — Recalculate and audit payment removal

**Completion Criteria:** Balance/status recalculate correctly and removal produces the required audit event.

## S55 — Update invoice payment status automatically

### T109 — Implement payment-derived status rules

**Completion Criteria:** Unpaid, Partially Paid and Paid states derive consistently from total and recorded payments.

### T110 — Test payment status reconciliation

**Completion Criteria:** Add/remove sequences and boundary amounts keep balance and status synchronized.

## S56 — Use critical journeys across supported devices and browsers

### T111 — Execute the supported browser compatibility suite

**Completion Criteria:** Critical MVP journeys pass on browser/version targets defined in the FSD.

### T112 — Verify responsive device journeys

**Completion Criteria:** Desktop and mobile workflows remain usable and identified compatibility failures receive release severity.

## S57 — Use the product with accessible interactions

### T113 — Implement keyboard and assistive-technology support

**Completion Criteria:** Critical navigation, forms, errors and focus behavior use accessible semantics.

### T114 — Run accessibility verification

**Completion Criteria:** Keyboard, automated checks and representative manual checks meet the agreed standard or document blockers.

## S58 — Protect account and business data

### T115 — Enforce tenant authorization across APIs

**Completion Criteria:** Every protected operation verifies authentication and account/business ownership.

### T116 — Test cross-account and unsafe-input defenses

**Completion Criteria:** Isolation and input-security tests reject prohibited access/content and generate safe diagnostics.

## S59 — Protect uploads and expensive endpoints

### T117 — Enforce upload security controls

**Completion Criteria:** File size, type and content checks reject unsafe uploads using safe user responses.

### T118 — Configure and test endpoint rate limits

**Completion Criteria:** Sensitive and expensive endpoints enforce configurable limits with observable, non-sensitive rejection behavior.

## S60 — Meet operational performance and release quality targets

### T119 — Execute representative performance verification

**Completion Criteria:** Editor, common API, PDF and dashboard behavior meet documented FSD targets or produce recorded blockers.

### T120 — Complete launch regression and readiness evidence

**Completion Criteria:** Critical acceptance tests, monitoring coverage, release blockers and accepted residual risks are documented.

---

# 4. Jira Creation Defaults

- Project: `IG` — Invoice Generator
- Issue type: Subtask
- Parent: Jira Story created from the mapped local Story ID
- Assignee: Unassigned
- Labels: None
- Priority: Inherit the parent Story priority unless Jira requires an explicit value
- Status: Project default
- Total planned Subtasks: 120

