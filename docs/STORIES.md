# MVP User Story Catalogue

## 1. Purpose

This document decomposes the 12 MVP epics in `docs/EPICS.md` into Jira-ready User Stories. Implementation Subtasks will be defined and created separately after the Stories are approved.

Each Story is grounded in `docs/PRD.md`, `docs/FSD.md` and `docs/SAD.md`. The Jira parent mapping uses the existing epics in project `IG`.

---

# 2. Stories by Epic

## IG-1 — Platform Foundation and Delivery

### S01 — Establish the modular application foundation

**User Story:** As a delivery team, we want a modular application foundation so that product capabilities can be developed without uncontrolled coupling.

**Acceptance Criteria:**

- Frontend, backend and module boundaries follow the SAD.
- Cross-module access uses defined contracts.
- The solution builds successfully from a clean checkout.

### S02 — Configure secure application environments

**User Story:** As an operator, I want environment-specific configuration and secret handling so that the application can run safely in each environment.

**Acceptance Criteria:**

- Environment configuration is externalized.
- Secrets are not committed to source control or exposed to clients/logs.
- Missing required configuration fails with an actionable, non-sensitive error.

### S03 — Manage database schema evolution

**User Story:** As a delivery team, we want repeatable database migrations so that schema changes are safe and reproducible.

**Acceptance Criteria:**

- A clean database can be initialized through migrations.
- Existing supported schemas can be upgraded without manual edits.
- Required reference data can be seeded idempotently.

### S04 — Automate build and delivery validation

**User Story:** As a delivery team, we want automated build and test validation so that regressions are detected before release.

**Acceptance Criteria:**

- Frontend and backend builds run through a repeatable pipeline.
- Automated tests run and report failures.
- Failed required checks prevent an invalid release artifact.

### S05 — Observe application health and failures

**User Story:** As an operator, I want health checks and structured diagnostics so that service problems can be detected and investigated.

**Acceptance Criteria:**

- Application and dependency health can be queried.
- Errors include useful correlation context without sensitive data.
- Monitoring can distinguish healthy, degraded and failed states.

---

## IG-2 — Public Website and Acquisition

### S06 — Discover the product from the landing page

**User Story:** As a prospective user, I want a clear landing page so that I can understand the product and decide whether to use it.

**Acceptance Criteria:**

- The page communicates the core invoice-generation value.
- Benefits, feature overview, template preview, FAQ and pricing teaser are available.
- Primary calls to action open the invoice generator.

### S07 — Navigate public product pages

**User Story:** As a visitor, I want consistent public navigation so that I can reach invoice creation, authentication and supporting information.

**Acceptance Criteria:**

- Navigation exposes the approved public destinations.
- Authentication and Create Invoice actions reach the correct routes.
- Navigation remains usable on mobile and by keyboard.

### S08 — Find public pages through search engines

**User Story:** As a prospective user, I want relevant product pages to be discoverable through search so that I can find the invoice tool when needed.

**Acceptance Criteria:**

- Indexable pages provide appropriate titles and metadata.
- Public routes support crawlable content where appropriate.
- Private application routes are not presented as public acquisition pages.

### S09 — Measure acquisition activity

**User Story:** As a product owner, I want acquisition events recorded so that I can understand which visitors begin invoice creation.

**Acceptance Criteria:**

- Landing-page visits, source and invoice-editor starts are recorded.
- Events do not include invoice contents or unnecessary personal data.
- Event failures do not block the user journey.

---

## IG-3 — Identity, Authentication and Account Security

### S10 — Register with email and password

**User Story:** As a new user, I want to register with email and password so that I can save and manage invoices.

**Acceptance Criteria:**

- Required fields and password rules follow the FSD.
- Duplicate email registration is handled safely.
- Successful registration creates an account, default business profile and authenticated session.

### S11 — Register or sign in with Google

**User Story:** As a user, I want to authenticate with Google so that I can access the product with fewer steps.

**Acceptance Criteria:**

- Google authentication can create or access the appropriate account.
- Cancellation and provider errors return a safe, actionable state.
- Authentication does not create duplicate accounts for the same verified identity according to the account-linking policy.

### S12 — Sign in and sign out securely

**User Story:** As a registered user, I want to sign in and sign out so that I can control access to my account.

**Acceptance Criteria:**

- Valid credentials create an authenticated session.
- Invalid credentials display the generic error defined in the FSD.
- Signing out invalidates the active session and protects authenticated routes.

### S13 — Recover a forgotten password

**User Story:** As a registered user, I want to reset a forgotten password so that I can regain account access.

**Acceptance Criteria:**

- The request does not disclose whether an email exists.
- Reset tokens are random, expiring and single use.
- A successful reset permits login with the new password and rejects the old password.

### S14 — Maintain a secure authenticated session

**User Story:** As a user, I want my session handled securely so that my account remains protected while normal use stays convenient.

**Acceptance Criteria:**

- Protected routes and APIs reject missing, invalid or expired sessions.
- Session expiry displays the defined message and offers sign-in.
- Authentication endpoints apply configured rate limits.

### S15 — Delete my account safely

**User Story:** As an account owner, I want to request account deletion so that I can exercise control over my personal data.

**Acceptance Criteria:**

- Deletion requires authentication and explicit confirmation.
- The outcome follows retention and legal/operational rules.
- The user is signed out and cannot continue using the deleted account.

---

## IG-4 — Anonymous Invoice Creation and Account Conversion

### S16 — Create and preview an invoice anonymously

**User Story:** As a first-time visitor, I want to create and fully preview an invoice without registering so that I can evaluate the product before committing.

**Acceptance Criteria:**

- All supported invoice fields and template choices are available anonymously.
- The complete preview updates from anonymous inputs.
- Anonymous creation does not permanently save an account-owned invoice.

### S17 — Recover an anonymous invoice draft locally

**User Story:** As an anonymous visitor, I want my in-progress invoice restored after an accidental refresh so that I do not lose my work.

**Acceptance Criteria:**

- Supported invoice and template state is stored temporarily in the browser.
- A recoverable draft is restored on return or refresh.
- Temporary data expires or is cleared according to the retention policy.

### S18 — Authenticate when downloading or printing

**User Story:** As an anonymous visitor, I want a clear account gate when I request Download or Print so that I understand how to complete the action.

**Acceptance Criteria:**

- Download and printer-friendly output are not provided before authentication.
- Registration and existing-user sign-in options are displayed.
- The message explains that the invoice will be downloaded and securely saved.

### S19 — Preserve invoice context through authentication

**User Story:** As an anonymous visitor, I want my invoice and requested action preserved during authentication so that I do not need to repeat my work.

**Acceptance Criteria:**

- Invoice fields, template customisation and pending action survive registration, login and Google authentication.
- Cancellation returns to the populated invoice without completing the gated action.
- Authentication failure does not discard recoverable invoice data.

### S20 — Complete the pending invoice action after authentication

**User Story:** As a newly authenticated user, I want my invoice saved and my pending action completed automatically so that the handoff feels continuous.

**Acceptance Criteria:**

- The invoice is validated and saved under the authenticated account.
- The requested download starts or printer-friendly rendering opens without another click.
- Safe retry does not create duplicate invoices.
- Conversion, completion and abandonment events can be measured without recording invoice contents.

---

## IG-5 — Invoice Editor and Calculation Engine

### S21 — Edit an invoice responsively

**User Story:** As an invoice creator, I want a responsive editor and preview layout so that I can work effectively on desktop or mobile.

**Acceptance Criteria:**

- Desktop uses the defined editor/preview layout.
- Mobile provides accessible Edit and Preview modes.
- Entered values remain intact when layout or mode changes.

### S22 — Enter invoice header and party details

**User Story:** As an invoice creator, I want to enter invoice, seller and customer details so that the document identifies the transaction parties and dates.

**Acceptance Criteria:**

- Supported invoice number, dates, seller and customer fields are available.
- Required fields, formats and maximum lengths follow the FSD.
- Invalid values produce field-level feedback without losing valid input.

### S23 — Manage invoice line items

**User Story:** As an invoice creator, I want to add, edit, order and remove line items so that the invoice describes what is being billed.

**Acceptance Criteria:**

- Users can manage one or more line items.
- Description, quantity, unit, unit price, tax and discount inputs follow the FSD.
- Removing or reordering items updates the document consistently.

### S24 — Calculate accurate invoice totals

**User Story:** As an invoice creator, I want totals calculated accurately so that the amount due is trustworthy.

**Acceptance Criteria:**

- Subtotal, discount, tax and total follow the formulas in the FSD.
- Tax-inclusive and tax-exclusive behavior follows business settings.
- Rounding is consistent across UI, backend and PDF.
- Backend calculation is authoritative.

### S25 — Add notes, terms and payment instructions

**User Story:** As an invoice creator, I want to add supporting instructions so that the customer knows the terms and how to pay.

**Acceptance Criteria:**

- Notes, terms and payment instructions accept the supported content and lengths.
- Optional empty sections do not create misleading output.
- Entered content appears consistently in preview and final output.

### S26 — Validate and protect unsaved invoice changes

**User Story:** As an invoice creator, I want clear validation and unsaved-change protection so that I can correct errors without accidentally losing work.

**Acceptance Criteria:**

- Validation identifies the field and correction needed.
- Invalid invoices cannot be finalized or output.
- Leaving with unsaved changes triggers the defined warning.

---

## IG-6 — Templates, Live Preview, PDF and Print

### S27 — Select an invoice template

**User Story:** As an invoice creator, I want to choose from the launch templates so that my invoice has an appropriate professional style.

**Acceptance Criteria:**

- Ten original launch templates are available.
- Selecting a template retains all invoice data.
- Free/Pro handling follows the applicable entitlement rules.

### S28 — Customise invoice appearance

**User Story:** As an invoice creator, I want supported visual customisation so that invoices reflect my business identity.

**Acceptance Criteria:**

- Supported colors, fonts and header options can be changed.
- Invalid customisation values are rejected or normalized safely.
- Customisation is preserved with the invoice where required.

### S29 — Preview the final invoice live

**User Story:** As an invoice creator, I want a near-instant preview so that I can see how changes affect the final document.

**Acceptance Criteria:**

- All required invoice content appears in the preview.
- Supported changes update near instantly.
- Preview and server-generated output remain materially consistent.

### S30 — Upload and render a business logo safely

**User Story:** As an invoice creator, I want to add a logo so that the invoice represents my business professionally.

**Acceptance Criteria:**

- Only supported file types and sizes are accepted.
- Uploaded content is validated and stored using safe file handling.
- The logo renders appropriately in preview, PDF and print output.

### S31 — Download a professional invoice PDF

**User Story:** As an authenticated user, I want to download a professional PDF so that I can send or retain the invoice.

**Acceptance Criteria:**

- The backend validates and renders the authoritative invoice.
- Output supports required page formats, selectable text and reasonable file size.
- The safe filename follows the FSD convention.
- Generation errors provide recovery guidance without exposing sensitive details.

### S32 — Print an invoice cleanly

**User Story:** As an authenticated user, I want printer-friendly output so that I can print or use supported system print options.

**Acceptance Criteria:**

- Printer output contains the complete invoice without application navigation.
- The printed layout remains consistent with the preview.
- Anonymous users follow the authentication gate before print rendering.

---

## IG-7 — Invoice Persistence and Lifecycle Management

### S33 — Save and auto-save invoice drafts

**User Story:** As an authenticated user, I want invoices saved while I work so that my progress is protected.

**Acceptance Criteria:**

- Manual save stores a valid account-owned invoice.
- Auto-save runs after the configured inactivity interval without saving every keystroke.
- Saving, saved and failure states are visible and recoverable.

### S34 — Assign unique invoice numbers

**User Story:** As a business user, I want unique invoice numbers so that documents can be reliably identified.

**Acceptance Criteria:**

- Numbers are unique within the business account.
- Configured prefix, sequence and editing rules follow the FSD.
- Concurrent creation cannot produce duplicate numbers.

### S35 — View and edit a saved invoice

**User Story:** As an authenticated user, I want to reopen and edit my invoice so that I can maintain accurate billing information.

**Acceptance Criteria:**

- The detail page displays invoice content, metadata, status and activity.
- Authorized users can edit and save permitted fields.
- Editing a paid invoice follows the warning behavior in the FSD.

### S36 — Duplicate an existing invoice

**User Story:** As an authenticated user, I want to duplicate an invoice so that I can create similar documents faster.

**Acceptance Criteria:**

- Duplication copies the approved fields defined in the FSD.
- The new invoice has an independent identifier and appropriate initial state.
- Changes to the duplicate do not alter the source invoice.

### S37 — Cancel or delete an invoice safely

**User Story:** As an authenticated user, I want controlled cancellation and deletion so that I can manage invoices without accidental data loss.

**Acceptance Criteria:**

- Cancellation and deletion follow status and confirmation rules.
- Unauthorized or disallowed operations are rejected.
- Historical/audit requirements are preserved where deletion is restricted.

### S38 — Maintain invoice status and audit history

**User Story:** As an authenticated user, I want accurate invoice status and activity so that I can understand each invoice's lifecycle.

**Acceptance Criteria:**

- Status transitions follow the FSD rules.
- Overdue status is determined from due date, balance and eligible current state.
- Material create, update, duplicate, cancel and delete actions are auditable.

---

## IG-8 — Business Profile and Onboarding

### S39 — Start with a default business profile

**User Story:** As a new account owner, I want a default business profile so that I can begin configuring invoices immediately.

**Acceptance Criteria:**

- Registration creates one default business profile.
- The profile is owned by and accessible to the authenticated account.
- New invoice creation can use available profile values.

### S40 — Complete or skip guided onboarding

**User Story:** As a new user, I want guided setup that I can skip so that I can choose how quickly to begin.

**Acceptance Criteria:**

- Onboarding covers the fields and steps defined in the FSD.
- Users can skip optional steps without being blocked.
- Saved steps populate the business profile.

### S41 — Maintain business identity and defaults

**User Story:** As a business owner, I want to maintain reusable identity and invoice defaults so that new invoices require less data entry.

**Acceptance Criteria:**

- Users can update supported identity, contact, tax and logo fields.
- Currency, tax, date, payment-term and instruction defaults can be saved.
- New invoices use current defaults without silently rewriting historical invoices.

### S42 — Configure invoice numbering

**User Story:** As a business owner, I want to configure invoice numbering so that documents follow my business convention.

**Acceptance Criteria:**

- Supported prefix and next-number settings can be configured.
- Invalid or conflicting settings are rejected clearly.
- Generated numbers remain unique within the business.

---

## IG-9 — Customer and Item Catalogue Management

### S43 — Manage customer records

**User Story:** As a business user, I want to create and maintain customers so that their information can be reused.

**Acceptance Criteria:**

- Authorized users can create, view and update supported customer fields.
- Validation and account ownership are enforced.
- Customer lists provide appropriate loading, empty and error states.

### S44 — Select a saved customer on an invoice

**User Story:** As an invoice creator, I want to search and select a saved customer so that invoice details populate quickly.

**Acceptance Criteria:**

- Matching account-owned customers appear during search.
- Selecting a customer populates the supported invoice fields.
- The saved invoice retains a historical customer snapshot.

### S45 — Manage product and service records

**User Story:** As a business user, I want to maintain reusable products and services so that common line items can be added quickly.

**Acceptance Criteria:**

- Authorized users can create, view and update the supported catalogue fields.
- Price, unit, tax and description validation follows the FSD.
- Catalogue lists provide appropriate loading, empty and error states.

### S46 — Select a saved item on an invoice

**User Story:** As an invoice creator, I want to search and select a saved product or service so that line-item details populate quickly.

**Acceptance Criteria:**

- Matching active account-owned items appear during search.
- Selecting an item populates the supported line fields.
- Users can adjust the invoice copy without silently changing the catalogue record.

### S47 — Archive reusable records safely

**User Story:** As a business user, I want to archive customers and items so that obsolete records no longer clutter selection while history remains accurate.

**Acceptance Criteria:**

- Archived records are excluded from normal new-invoice selection.
- Existing invoices continue to display their historical snapshots.
- Authorized users can identify archived state where management views require it.

---

## IG-10 — Invoice History, Search and Dashboard

### S48 — View billing summary metrics

**User Story:** As a business user, I want dashboard summaries so that I can quickly understand invoiced, paid, outstanding and overdue amounts.

**Acceptance Criteria:**

- Values follow the dashboard calculation rules in the FSD.
- Values include only the authorized business scope.
- Empty and failure states do not display misleading totals.

### S49 — Access recent invoices and useful empty states

**User Story:** As a business user, I want recent activity and clear empty states so that I can continue work or create my first invoice.

**Acceptance Criteria:**

- Recent invoices are ordered and limited according to the FSD.
- Entries link to authorized invoice details.
- Empty states explain the condition and provide an appropriate action.

### S50 — Browse paginated invoice history

**User Story:** As a business user, I want a paginated invoice list so that I can navigate a growing document history.

**Acceptance Criteria:**

- The list displays the required invoice summary fields.
- Pagination is stable and retains the active view state.
- Loading and API failures provide usable feedback.

### S51 — Search, filter and sort invoices

**User Story:** As a business user, I want to search, filter and sort invoices so that I can find specific documents efficiently.

**Acceptance Criteria:**

- Supported search fields, filters and sort options follow the FSD.
- Multiple active criteria produce consistent account-scoped results.
- Users can clear criteria and return to the default list.

---

## IG-11 — Payment Recording and Invoice Status

### S52 — Record a full or partial payment

**User Story:** As a business user, I want to record payments against an invoice so that the outstanding balance is accurate.

**Acceptance Criteria:**

- Amount, date, method and reference fields follow the FSD.
- Full and partial payments can be recorded against eligible invoices.
- Cross-account or ineligible invoice payments are rejected.

### S53 — Validate payment entries

**User Story:** As a business user, I want invalid payment entries prevented so that invoice balances remain trustworthy.

**Acceptance Criteria:**

- Non-positive and excessive payments are rejected according to the FSD.
- Invalid dates and required-field failures provide clear feedback.
- Failed submissions do not partially update invoice or payment state.

### S54 — Review and remove recorded payments

**User Story:** As a business user, I want to review and remove an incorrect payment so that I can correct invoice records.

**Acceptance Criteria:**

- Payment history displays required payment details.
- Removal requires authorization and confirmation where defined.
- Removal recalculates balance and status and creates an audit event.

### S55 — Update invoice payment status automatically

**User Story:** As a business user, I want invoice status derived from recorded payments so that I can see whether money remains due.

**Acceptance Criteria:**

- No qualifying payment produces the appropriate unpaid state.
- A payment below the total produces Partially Paid.
- Fully settled balance produces Paid.
- Status and outstanding balance remain consistent after add/remove operations.

---

## IG-12 — Product Quality, Security and Operational Readiness

### S56 — Use critical journeys across supported devices and browsers

**User Story:** As a user, I want the application to work across supported devices and browsers so that I can invoice from my preferred environment.

**Acceptance Criteria:**

- Critical MVP journeys pass on the browser versions defined in the FSD.
- Desktop and mobile layouts remain usable at supported sizes.
- Compatibility failures have documented severity and release handling.

### S57 — Use the product with accessible interactions

**User Story:** As a user with accessibility needs, I want accessible navigation, forms and feedback so that I can complete invoice workflows.

**Acceptance Criteria:**

- Critical workflows are keyboard operable.
- Form controls, errors, focus and semantic structure support assistive technology.
- Color and visible-state treatment meet the agreed accessibility standard.

### S58 — Protect account and business data

**User Story:** As an account owner, I want strict authorization and input security so that other accounts cannot access or alter my data.

**Acceptance Criteria:**

- APIs enforce authentication and ownership/business authorization.
- Cross-account access attempts are rejected and safely logged.
- Input handling protects defined application boundaries from unsafe content.

### S59 — Protect uploads and expensive endpoints

**User Story:** As an operator, I want upload controls and rate limiting so that abuse cannot undermine platform security or availability.

**Acceptance Criteria:**

- File type, size and content checks follow the FSD.
- Sensitive and expensive endpoints use configurable rate limits.
- Rejections are observable and return safe user-facing errors.

### S60 — Meet operational performance and release quality targets

**User Story:** As a product owner, I want performance and regression evidence so that the MVP can be released with confidence.

**Acceptance Criteria:**

- Editor, API, PDF and dashboard targets in the FSD are tested under representative conditions.
- Launch-critical acceptance criteria have automated or repeatable test coverage.
- Monitoring and diagnostics support detection of launch-critical failures.
- Known release blockers and accepted residual risks are documented.

---

# 3. Jira Creation Defaults

- Project: `IG` — Invoice Generator
- Issue type: Story
- Parent: the mapped Jira Epic shown above
- Assignee: Unassigned
- Labels: None
- Priority: Highest, reflecting MVP P0 priority
- Status: Project default
- Implementation Subtasks: Not created in this stage

