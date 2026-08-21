# Product Epic Catalogue

## 1. Purpose

This document translates the PRD, FSD and SAD into Jira-ready product epics.

It defines epic boundaries, intended outcomes, major scope, dependencies and epic-level acceptance criteria. Detailed user stories, technical tasks, estimates and sprint assignments will be created when the epics are prepared for Jira.

The source of truth for detailed behaviour remains:

- `docs/PRD.md`
- `docs/FSD.md`
- `docs/SAD.md`

---

# 2. MVP Epics

## EPIC-01 — Platform Foundation and Delivery

**Priority:** P0

**Outcome:** Establish a secure, maintainable and deployable foundation for the invoicing platform.

### Scope

- Modular monolith solution structure and module boundaries
- Frontend, backend and database foundations
- Environment configuration and secrets handling
- Database migrations and seed/reference data
- Continuous integration and deployment foundations
- Structured logging, monitoring and health checks
- Error-handling conventions
- Core API conventions, validation and pagination

### Epic Acceptance Criteria

- Application environments can be configured without committing secrets.
- Database migrations can create and upgrade the required schema reliably.
- Frontend and backend can be built, tested and deployed through a repeatable process.
- Health, error and operational signals are available without exposing sensitive data.
- Module boundaries follow the architecture defined in the SAD.

### Dependencies

- None

---

## EPIC-02 — Public Website and Acquisition

**Priority:** P0

**Outcome:** Allow prospective users to discover the product and begin creating an invoice with minimal friction.

### Scope

- Public landing page
- Product benefits, feature overview, template previews and FAQ
- Primary Create Invoice calls to action
- Pricing teaser and navigation to authentication
- SEO-ready public structure and metadata
- Acquisition event tracking
- Responsive and accessible public experience

### Epic Acceptance Criteria

- A visitor can understand the product's purpose and start an invoice from the landing page.
- Public pages are responsive, accessible and indexable where appropriate.
- Landing-page visits, acquisition source and invoice-editor starts can be measured.

### Dependencies

- EPIC-01

---

## EPIC-03 — Identity, Authentication and Account Security

**Priority:** P0

**Outcome:** Allow users to securely create, access and recover an account.

### Scope

- Email and password registration
- Email and password login
- Google authentication
- Logout and session management
- Password reset
- Authentication validation and safe error messages
- Login, registration and password-reset rate limiting
- Account settings and account deletion
- Authentication APIs and audit events

### Epic Acceptance Criteria

- A user can register, sign in, remain signed in as configured and sign out.
- A user can securely reset a forgotten password.
- Authentication errors do not disclose whether an account exists.
- Protected functionality cannot be accessed without a valid authenticated session.
- A user can request account deletion with required confirmation and policy handling.

### Dependencies

- EPIC-01

---

## EPIC-04 — Anonymous Invoice Creation and Account Conversion

**Priority:** P0

**Outcome:** Let a visitor create and fully preview an invoice anonymously, then convert that high-intent visitor into an account when Download or Print is requested.

### Scope

- Anonymous invoice editing and full preview
- Temporary local/session persistence and recovery
- Download PDF and Print authentication gate
- Registration and existing-user sign-in options at the gate
- Preservation of invoice data, template customisation and pending action through authentication
- Automatic invoice validation and account association after authentication
- Automatic PDF download or printer-friendly rendering after authentication
- Safe retry and duplicate-invoice prevention
- Conversion funnel and abandonment analytics

### Epic Acceptance Criteria

- An anonymous visitor can complete and preview an invoice without an account.
- Downloading or printing is unavailable until the visitor registers or signs in.
- Authentication does not lose or alter entered invoice information or template choices.
- After authentication, the invoice is saved to the account and the original action completes automatically.
- The user does not need to re-enter data or click Download or Print again.
- Retrying a failed or interrupted handoff does not create duplicate invoices.
- Temporary anonymous data is cleared or expires according to the defined retention policy.

### Dependencies

- EPIC-03
- EPIC-05
- EPIC-06
- EPIC-07

---

## EPIC-05 — Invoice Editor and Calculation Engine

**Priority:** P0

**Outcome:** Allow users to create accurate invoices quickly without requiring accounting expertise.

### Scope

- Responsive invoice editor and mobile Edit/Preview experience
- Seller and customer information
- Invoice identifiers, issue dates and due dates
- Invoice line creation, editing, ordering and removal
- Quantity, unit, price, tax and discount inputs
- Tax-inclusive and tax-exclusive calculation
- Subtotals, totals and rounding
- Notes, terms and payment instructions
- Client-side feedback and authoritative backend validation/calculation
- Unsaved-change handling

### Epic Acceptance Criteria

- A user can enter all information required for a professional invoice.
- Calculations follow the formulas, rounding and tax rules defined in the FSD.
- The backend independently validates and recalculates authoritative totals.
- Invalid or incomplete data produces clear, field-level feedback.
- The editor works across supported desktop and mobile browsers.

### Dependencies

- EPIC-01

---

## EPIC-06 — Templates, Live Preview, PDF and Print

**Priority:** P0

**Outcome:** Produce professional invoice previews and outputs that accurately represent the user's invoice.

### Scope

- Initial set of ten original invoice templates
- Template selection and supported customisation
- Near-instant live preview
- A4 and appropriate US Letter rendering
- Server-authoritative PDF generation
- Selectable PDF text and safe file naming
- Printer-friendly rendering
- Logo upload and output rendering
- PDF-generation performance and failure handling

### Epic Acceptance Criteria

- Users can choose from ten launch templates.
- Preview updates promptly when supported invoice or template values change.
- Generated PDFs closely match the preview and preserve all required content.
- PDFs are readable, reasonably sized and use safe filenames.
- Print output excludes application navigation and controls.
- PDF generation and printing enforce the authentication requirements in EPIC-04.

### Dependencies

- EPIC-05
- EPIC-03

---

## EPIC-07 — Invoice Persistence and Lifecycle Management

**Priority:** P0

**Outcome:** Allow authenticated users to reliably save, retrieve and manage invoices throughout their lifecycle.

### Scope

- Save and auto-save invoice drafts
- Account-scoped invoice numbering and uniqueness
- Invoice detail and metadata
- Invoice editing
- Invoice duplication with safe numbering
- Invoice cancellation and deletion rules
- Invoice statuses and transition rules
- Overdue evaluation
- Invoice audit trail
- Invoice APIs and authorization

### Epic Acceptance Criteria

- An authenticated user can save, reopen and edit an invoice they own.
- Invoice numbers are unique within the applicable business account.
- Duplicating an invoice creates an independent invoice with an appropriate new identity.
- Status changes follow the rules defined in the FSD.
- Users cannot access or change another account's invoices.
- Material invoice operations are recorded in the audit trail.

### Dependencies

- EPIC-03
- EPIC-05

---

## EPIC-08 — Business Profile and Onboarding

**Priority:** P0

**Outcome:** Let users configure reusable business identity, numbering and invoice defaults.

### Scope

- Default business profile creation
- Guided but skippable onboarding
- Business identity and contact information
- Tax registration and logo
- Currency, tax and date defaults
- Default payment terms and instructions
- Invoice numbering configuration
- Business profile APIs and authorization

### Epic Acceptance Criteria

- Registration creates a usable default business profile.
- A user can complete or skip onboarding.
- Saved business values can populate new invoices.
- Invoice numbering settings maintain uniqueness.
- Business data is accessible only to authorized users.

### Dependencies

- EPIC-03
- EPIC-01

---

## EPIC-09 — Customer and Item Catalogue Management

**Priority:** P0

**Outcome:** Reduce repeated data entry through reusable customer and product/service records.

### Scope

- Create, view, update and archive customers
- Customer search and selection in the invoice editor
- Create, view, update and archive products/services
- Item search and selection in the invoice editor
- Copy reusable values into invoice snapshots
- Empty, loading and validation states
- Customer and item APIs and authorization

### Epic Acceptance Criteria

- Users can manage account-scoped customers and catalogue items.
- Matching records appear when users search from an invoice.
- Selecting a record populates the relevant invoice fields.
- Later changes to a catalogue record do not silently alter historical invoices.
- Archived records are excluded from normal selection while historical documents remain intact.

### Dependencies

- EPIC-03
- EPIC-08
- EPIC-05

---

## EPIC-10 — Invoice History, Search and Dashboard

**Priority:** P0

**Outcome:** Give users a useful overview of their invoicing activity and fast access to documents.

### Scope

- Dashboard summary cards and calculation rules
- Recent invoices
- Dashboard and list empty states
- Invoice list with pagination
- Search, filtering and sorting
- Navigation to invoice details and common actions
- Loading and error states
- Dashboard APIs and performance targets

### Epic Acceptance Criteria

- Dashboard values are derived using the rules defined in the FSD.
- Users can find invoices through search, filters and sorting.
- Lists remain usable as invoice volume grows through pagination.
- Empty, loading and failure states provide clear next actions.
- Dashboard and invoice records are scoped to the authenticated account/business.

### Dependencies

- EPIC-07
- EPIC-03

---

## EPIC-11 — Payment Recording and Invoice Status

**Priority:** P0

**Outcome:** Let users record offline payments and understand what remains outstanding.

### Scope

- Supported payment methods
- Record full and partial payments
- Payment amount and date validation
- Payment history
- Remove or reverse recorded payments according to policy
- Automatic Unpaid, Partially Paid and Paid status updates
- Outstanding-balance calculation
- Payment APIs, authorization and audit events

### Epic Acceptance Criteria

- Users can record valid payments against invoices they own.
- Partial and full payments update outstanding balances and statuses correctly.
- Invalid amounts or dates are rejected with clear feedback.
- Removing a payment recalculates balances and status.
- Payment changes are auditable.

### Dependencies

- EPIC-07

---

## EPIC-12 — Product Quality, Security and Operational Readiness

**Priority:** P0

**Outcome:** Ensure the MVP is safe, accessible, performant and supportable at launch.

### Scope

- Responsive behavior across supported browsers
- WCAG-aligned accessibility implementation and testing
- Authentication, authorization and input-security verification
- Secure logo/file upload controls
- Rate limiting for sensitive or expensive endpoints
- Privacy-aware logging and audit coverage
- Performance targets for editor, API, dashboard and PDF generation
- Monitoring, alerting and operational diagnostics
- End-to-end acceptance and regression coverage

### Epic Acceptance Criteria

- Supported browsers and mobile layouts pass agreed critical journeys.
- Critical workflows are keyboard accessible and meet agreed accessibility checks.
- Cross-account access, unsafe inputs and unsafe file uploads are prevented.
- Sensitive information is excluded from logs and user-facing errors.
- Performance targets in the FSD are verified under representative conditions.
- Launch-critical acceptance criteria have automated or documented repeatable tests.

### Dependencies

- All P0 feature epics

---

# 3. Post-MVP Roadmap Epics

These epics are retained for roadmap visibility but should not be included in the initial MVP Jira release unless explicitly approved.

## EPIC-13 — Email Delivery and Hosted Invoice Experience

**Priority:** P1

Enable users to email invoices and provide customers with secure hosted invoice pages that do not require customer accounts.

## EPIC-14 — Online Payments

**Priority:** P1

Integrate Stripe so customers can pay hosted invoices and successful payments update invoice balances and statuses.

## EPIC-15 — Estimates and Estimate Conversion

**Priority:** P1

Allow users to create and manage estimates, then convert accepted estimates into invoices without re-entering data.

## EPIC-16 — Reporting and Data Export

**Priority:** P1

Provide initial financial/activity reports and CSV exports using account-scoped data.

## EPIC-17 — Recurring Invoices and Payment Reminders

**Priority:** P2

Support recurring invoice schedules and configurable reminder sequences with safe retry, failure and cancellation handling.

## EPIC-18 — Expanded Billing Documents

**Priority:** P2

Add credit notes, receipts, quotes and purchase orders using shared document capabilities where appropriate.

## EPIC-19 — Multi-Business, Teams and International Growth

**Priority:** P2

Support multiple businesses per account, team access, multi-language experiences and advanced reporting.

---

# 4. Suggested MVP Delivery Sequence

1. EPIC-01 — Platform Foundation and Delivery
2. EPIC-03 — Identity, Authentication and Account Security
3. EPIC-05 — Invoice Editor and Calculation Engine
4. EPIC-06 — Templates, Live Preview, PDF and Print
5. EPIC-07 — Invoice Persistence and Lifecycle Management
6. EPIC-04 — Anonymous Invoice Creation and Account Conversion
7. EPIC-08 — Business Profile and Onboarding
8. EPIC-09 — Customer and Item Catalogue Management
9. EPIC-11 — Payment Recording and Invoice Status
10. EPIC-10 — Invoice History, Search and Dashboard
11. EPIC-02 — Public Website and Acquisition
12. EPIC-12 — Product Quality, Security and Operational Readiness

EPIC-12 is listed last as a release gate, but its work must run continuously across all implementation epics.

---

# 5. Jira Preparation Notes

Before publishing these epics to Jira:

- Confirm the target Jira project and issue-type configuration.
- Confirm whether EPIC identifiers should be retained as labels or replaced by Jira keys.
- Decompose each approved epic into user stories, technical tasks and test tasks.
- Add source-document links and relevant FSD section references to each Jira issue.
- Agree on ownership, estimates, release/sprint allocation and Definition of Done.
- Keep post-MVP epics outside the MVP release unless their priority is explicitly changed.

