# Product Requirements Document

## 1. Product Overview

### Working Product Name
TBD

### Product Type
SaaS invoicing and billing platform

### Product Vision

Build a fast, simple and professional invoicing platform for freelancers, sole traders and small businesses.

The product should allow a user to create a professional invoice in under two minutes, download or send it to a customer, track its payment status, and reuse customer and product information for future invoices.

The initial product will compete with products such as Invoice Home by prioritising:

- Simplicity
- Fast invoice generation
- Professional templates
- Generous free usage
- No accounting knowledge required
- Mobile-friendly experience
- Strong SEO acquisition through free invoice tools
- Affordable premium plan

The system should be designed so additional financial tools can later be added without turning the application into a full accounting platform.

---

# 2. Problem Statement

Small businesses and freelancers frequently need to create professional invoices but:

- Do not need complex accounting software.
- Find products such as Xero and QuickBooks excessive for simple invoicing.
- Create invoices manually in Word or Excel.
- Repeatedly type customer and item information.
- Have difficulty tracking unpaid invoices.
- Want professional-looking invoices without designing them.
- Need invoices that work across different countries, currencies and tax systems.

The product should provide the convenience of an invoice generator while gradually becoming a lightweight billing system as users create more documents.

---

# 3. Target Users

## Primary Users

### Freelancer
Examples:

- Developer
- Designer
- Consultant
- Photographer
- Writer
- Contractor

Needs:

- Create invoices quickly.
- Maintain client information.
- Download/send PDFs.
- Know which invoices are unpaid.

### Sole Trader

Examples:

- Electrician
- Plumber
- Cleaner
- Landscaper
- Carpenter

Needs:

- Create invoices from mobile.
- Store regular customers.
- Reuse services and prices.
- Track payments.

### Small Business

Typically:

- 1–20 employees
- Limited accounting requirements
- Sends tens or hundreds of invoices each month

Needs:

- Business branding
- Customer database
- Invoice history
- Payment tracking
- Recurring invoices
- Reports

---

# 4. Product Principles

### Fast

A first-time visitor should be able to create an invoice without creating an account.

### Simple

Users should not need accounting terminology to understand the product.

### Progressive

A casual user can use the invoice generator.

A registered user gains document history and reusable data.

A paying user gains automation and advanced business features.

### Professional

Documents should look suitable for sending directly to customers.

### International

The system should support multiple:

- currencies
- date formats
- tax formats
- number formats
- languages eventually

---

# 5. Core User Journey

## Anonymous User

Landing Page

→ Create Invoice

→ Enter Seller Details

→ Enter Customer Details

→ Add Invoice Items

→ Configure Tax / Discount

→ Select Template

→ Preview Invoice

→ Click Download PDF or Print

→ Create Account or Sign In

→ Invoice Saved and Requested Action Completes Automatically

---

## Registered User

Login

→ Dashboard

→ Create Invoice

→ Select Existing Customer

→ Select Saved Products/Services

→ Send Invoice

→ Invoice Stored

→ Monitor Payment Status

→ Duplicate / Edit / Convert Document

---

## Returning Business User

Dashboard

→ Review Outstanding Invoices

→ Send Reminder

→ Create New Invoice

→ Reuse Customer

→ Reuse Items

→ Send Invoice

→ Record Payment

---

# 6. MVP Scope

The MVP should focus on six primary capabilities.

## 6.1 Invoice Generator

Users must be able to create an invoice containing:

### Seller Information

- Business name
- Contact name
- Email
- Phone
- Address
- Website
- Business registration number
- Tax registration number
- Logo

Labels should be configurable to accommodate country-specific identifiers such as:

- ABN
- VAT Number
- GST Number
- EIN

---

### Customer Information

- Customer/company name
- Contact name
- Email
- Phone
- Billing address
- Tax/business number

---

### Invoice Information

- Invoice number
- Issue date
- Due date
- Purchase order/reference
- Currency
- Payment terms

Example numbering:

INV-000001

Users should eventually be able to configure numbering prefixes.

---

### Invoice Items

Each row contains:

| Field | Requirement |
|---|---|
| Description | Required |
| Quantity | Required |
| Unit Price | Required |
| Tax | Optional |
| Discount | Optional |

Calculated values:

Subtotal

Discount

Tax

Additional Charges

Amount Paid

Total Due

---

### Additional Information

Invoice should support:

- Notes
- Terms & conditions
- Payment instructions
- Bank details
- Thank-you message

---

# 6.2 Live Invoice Preview

Invoice editor should use a split-screen experience on desktop.

LEFT

Invoice Form

RIGHT

Live Document Preview

Changes made to the form should immediately update the preview.

Mobile should switch between:

Edit

and

Preview.

---

# 6.3 Invoice Templates

MVP target:

**10 professionally designed templates**

Template categories:

- Minimal
- Modern
- Corporate
- Professional
- Creative
- Simple

Users should be able to customise:

- Template
- Primary colour
- Logo
- Font from approved options
- Accent colour

Premium templates can later become part of monetisation.

The product should create original templates rather than copying Invoice Home designs.

---

# 6.4 PDF Generation

Users must be able to:

- Preview invoice
- Generate PDF
- Download PDF
- Print invoice

Users may create and preview an invoice anonymously. Downloading or printing requires a free account or an existing authenticated session. When authentication is completed from one of these actions, the system must preserve and save the invoice, then automatically complete the requested download or print action.

Generated PDFs must:

- Match the preview
- Be A4 compatible
- Be US Letter compatible where appropriate
- Preserve formatting
- Support selectable text
- Produce reasonable file sizes

---

# 6.5 Account System

Users can create an account using:

- Email/password
- Google authentication

Later:

- Microsoft
- Apple

Anonymous users must create an account or sign in when they request PDF download or printing. Invoice creation and full preview remain available without an account.

Example:

> Create a free account to download and securely save your invoice.

The authentication flow must preserve all invoice data and the pending action. After authentication, the invoice is saved and the requested action completes without another click.

---

# 6.6 Dashboard

Dashboard should display:

### Summary

Total invoiced

Total paid

Total outstanding

Total overdue

### Recent Documents

Invoice Number

Customer

Date

Amount

Status

Actions

Statuses:

- Draft
- Sent
- Viewed
- Partially Paid
- Paid
- Overdue
- Cancelled

---

# 7. Customer Management

Registered users can maintain customers.

Customer fields:

- Customer ID
- Business name
- Contact name
- Email
- Phone
- Billing address
- Shipping address
- Business/tax number
- Notes

Functions:

- Create customer
- Edit customer
- Delete/archive customer
- Search customers
- View customer invoice history

While creating an invoice, entering an existing customer's name should offer autocomplete.

Selecting the customer automatically fills their details.

---

# 8. Product / Service Catalogue

Users can save commonly invoiced items.

Fields:

- Name
- Description
- SKU/code
- Unit price
- Default tax rate
- Unit type

Example units:

- Item
- Hour
- Day
- Project
- Kg
- Quantity

While creating an invoice:

Typing an item name should display saved items.

Selecting one automatically populates:

Description

Price

Tax

Unit.

---

# 9. Document Management

MVP:

### Invoice

Post-MVP:

- Estimate
- Quote
- Receipt
- Credit Note
- Purchase Order
- Delivery Note

Documents should share the same underlying document engine wherever possible.

---

# 10. Estimates and Quotes

Phase 2 functionality.

Users create an estimate using the same editor.

Actions:

Send Estimate

↓

Customer Accepts

↓

Convert to Invoice

Conversion must retain:

- Customer
- Items
- Pricing
- Tax
- Notes

Invoice Home currently supports converting estimates into invoices, making this an important parity feature after the initial invoice workflow is stable.

---

# 11. Invoice Sending

Registered users should be able to send invoices by email.

User enters:

Recipient

CC

Subject

Message

System attaches PDF and provides a hosted invoice link.

Email history should record:

- Sent timestamp
- Recipient
- Delivery status
- Opened status where technically possible

---

# 12. Payment Tracking

Users must be able to manually mark invoices as:

Paid

or record:

Partial Payment

Payment fields:

- Amount
- Date
- Payment method
- Reference
- Notes

Remaining balance should automatically update.

Invoice Home currently distinguishes Paid, Unpaid, Partially Paid and Overdue documents and supports partial-payment tracking, making these useful baseline behaviours.

---

# 13. Online Payments

Phase 2.

Integrations:

### Stripe

Primary payment provider.

Potential later integrations:

- PayPal
- Square

Invoice contains:

**Pay Now**

Customer opens hosted invoice.

↓

Selects payment method.

↓

Stripe Checkout.

↓

Payment completed.

↓

Webhook received.

↓

Invoice automatically marked Paid.

↓

Receipt emailed.

---

# 14. Recurring Invoices

Phase 2 / Premium.

Users create recurring invoice schedules.

Frequency:

- Weekly
- Fortnightly
- Monthly
- Quarterly
- Annually
- Custom

User defines:

Start Date

End Date

Frequency

Automatic Send: ON/OFF

The system generates invoices automatically.

Invoice Home currently provides editable recurring invoices, so this is useful competitive parity but does not need to block the MVP.

---

# 15. Invoice Reminders

Premium feature.

Rules:

3 days before due date

On due date

3 days overdue

7 days overdue

14 days overdue

Users can customise reminder emails.

Example flow:

Invoice Sent

↓

Invoice Due

↓

Not Paid

↓

Reminder Sent

↓

Payment Received

↓

Reminder Sequence Stops

---

# 16. Business Profiles

Phase 2.

A single account may operate multiple businesses.

Example:

Hasham Consulting

ABC Software Pty Ltd

XYZ Digital

Each business has independent:

- Logo
- Contact details
- Tax number
- Bank details
- Invoice numbering
- Customers
- Documents
- Reports

Invoice Home currently supports multiple businesses within one account, including business-specific reporting.

---

# 17. Reports

Phase 2.

Initial reports:

### Revenue

Revenue by:

- Month
- Quarter
- Year

### Outstanding Invoices

### Overdue Invoices

### Customers

Revenue by customer.

### Tax Summary

Tax collected within selected period.

Exports:

CSV

PDF

Invoice Home currently offers reporting/export functionality, so this becomes useful once sufficient transaction data exists.

---

# 18. Search and Filtering

Users should be able to search by:

- Invoice number
- Customer
- Amount
- Description

Filters:

- Date range
- Status
- Customer
- Business
- Document type

Sort:

- Newest
- Oldest
- Highest amount
- Lowest amount
- Due date

---

# 19. Hosted Invoice Page

Every sent invoice should optionally receive a secure public URL.

Example:

app.example.com/i/a8F4kP2

Customer sees:

Business Logo

Invoice

Amount Due

Payment Status

Download PDF

Pay Now

No customer account should be required.

URLs must use secure non-sequential tokens.

---

# 20. Dashboard UX

Primary navigation:

Dashboard

Documents

Customers

Items

Reports

Templates

Settings

Upgrade

Primary CTA:

**+ New Invoice**

Creating an invoice should always remain accessible within one click.

---

# 21. Settings

## Business Settings

- Business profile
- Logo
- Tax details
- Address
- Contact information

## Invoice Settings

- Invoice prefix
- Next invoice number
- Default currency
- Default tax
- Default due period
- Default notes
- Default terms

## Email Settings

- Sender name
- Default email message
- Reminder messages

## Payment Settings

- Stripe
- Bank details

## Account Settings

- Email
- Password
- Subscription
- Delete account

---

# 22. Internationalisation

Architecture should support internationalisation from the beginning.

Configurable:

Currency

Date format

Number formatting

Tax labels

Address structure

Language

MVP languages:

English only.

Priority currencies:

- AUD
- USD
- EUR
- GBP
- CAD
- NZD
- SGD
- AED

The database should not restrict currencies to this list.

---

# 23. Australian Market Support

Because Australia can be an initial target market, provide explicit support for:

- ABN
- GST
- AUD
- GST-inclusive pricing
- GST-exclusive pricing
- Australian date formatting

Invoice templates should allow users to produce invoices containing the information normally required for an Australian tax invoice.

Legal/accounting validation should be completed before marketing the documents as compliant tax invoices.

---

# 24. Freemium Model

## Free

Target:

Acquire users aggressively.

Includes:

- Unlimited draft invoices
- Core invoice templates
- PDF download
- Customer storage
- Item storage
- Basic invoice tracking
- Product branding on hosted invoices

Possible fair-use limits can later be introduced based on actual infrastructure cost and abuse.

---

## Pro

Indicative price:

**US$5–7/month**

or

**US$49–59/year**

Includes:

- No product branding
- Premium templates
- Email invoices
- Automated reminders
- Recurring invoices
- Online payments
- Multiple businesses
- Advanced reports
- Data export
- Custom invoice numbering

The exact pricing should be tested rather than permanently fixed in the PRD.

Invoice Home currently advertises Unlimited at US$9/month, creating room for a lower-cost challenger if infrastructure economics support it.

---

# 25. SEO Acquisition Strategy

SEO should be treated as a product feature rather than purely marketing.

Create indexable landing pages such as:

/invoice-generator

/free-invoice-generator

/invoice-template

/pdf-invoice-generator

/freelancer-invoice-template

/contractor-invoice-template

/consultant-invoice-template

/australian-tax-invoice-template

/gst-invoice-template

/abn-invoice-template

/receipt-generator

/quote-generator

/estimate-generator

Each landing page leads into the same document-generation engine.

This creates a scalable acquisition funnel:

Google Search

↓

Free Tool

↓

Invoice Generated

↓

Account Creation

↓

Repeat Usage

↓

Premium Upgrade

---

# 26. Non-Functional Requirements

## Performance

Initial page load:

Target <2 seconds on normal broadband.

Editor actions:

Target <200 ms perceived response where processing is local.

PDF generation:

Target <3 seconds under normal load.

---

## Availability

Production target:

99.9% uptime.

---

## Security

Requirements:

- HTTPS everywhere
- Password hashing using modern approved algorithms
- OAuth 2.0 / OIDC
- Encryption in transit
- Encryption at rest
- Secure document URLs
- Rate limiting
- CSRF protection
- XSS prevention
- SQL injection protection
- Audit logging for sensitive operations

Payment card details must never be stored directly by the application.

Use payment-provider-hosted/tokenised mechanisms.

---

## Privacy

Users must be able to:

- Export their data
- Delete their account
- Delete customers
- Delete documents where legally/operationally appropriate

Privacy architecture should support requirements relevant to the countries in which the service is offered.

---

# 27. Suggested Technical Architecture

## Frontend

Recommended:

Next.js

TypeScript

Tailwind CSS

Benefits:

- SEO
- Server rendering
- Fast UI
- Large ecosystem
- Responsive design

---

## Backend

Recommended based on development capability:

ASP.NET Core Web API

.NET 10+

Clean Architecture

Alternative:

Next.js backend/API layer for a smaller initial system.

For a long-term SaaS product, separating frontend and backend provides greater architectural flexibility.

---

## Database

PostgreSQL

Core entities:

User

Business

Customer

Item

Document

DocumentItem

Payment

Template

RecurringSchedule

Email

Subscription

AuditLog

---

## Object Storage

Use:

AWS S3

or

Azure Blob Storage

For:

- Logos
- PDFs
- Attachments
- Export files

---

## Authentication

Options:

- Auth0
- Clerk
- Firebase Auth
- ASP.NET Core Identity

For cost control and ownership:

ASP.NET Core Identity + external OAuth providers is suitable.

---

## Email

Use transactional email provider:

- Amazon SES
- Postmark
- Resend
- SendGrid

---

## PDF Engine

Preferred architecture:

HTML/CSS Invoice

↓

Server-side rendering

↓

PDF

Possible technologies:

- Playwright
- Puppeteer
- QuestPDF

HTML-based templates provide strong reuse between web preview and PDF output.

---

## Payments

Stripe.

Functions:

- Subscription billing
- Customer invoice payments
- Webhooks
- Payment status synchronisation

---

# 28. High-Level Data Model

User

1:N

Business

Business

1:N Customers

1:N Items

1:N Documents

Document

1:N DocumentItems

1:N Payments

Customer

1:N Documents

User

1:N Subscriptions

Business

1:N RecurringSchedules

RecurringSchedule

1:N Documents

---

# 29. Analytics

Track:

### Acquisition

- Landing page visits
- Invoice editor starts
- SEO landing page source

### Activation

- First invoice created
- First PDF downloaded
- First account created
- First invoice sent

### Engagement

- Invoices per user
- Customers saved
- Returning users
- Monthly active users

### Revenue

- Free → Pro conversion
- MRR
- ARR
- Churn
- ARPU

### North Star Metric

**Monthly active businesses sending invoices**

Secondary metric:

**Invoices successfully created per month**

---

# 30. MVP Success Criteria

Initial validation targets:

1,000 registered users

25%+ registered-user monthly retention

30%+ of newly registered users create an invoice

15%+ create a second invoice

5%+ free-to-paid conversion eventually

PDF generation success >99%

Invoice creation completion rate >70%

These are product hypotheses and should be adjusted once real usage data exists.

---

# 31. MVP Feature Priorities

## P0 — Required for Launch

- Landing page
- Invoice generator
- Live preview
- Invoice calculations
- 10 templates
- PDF generation
- Authentication
- Business profile
- Customers
- Saved items
- Invoice storage
- Invoice history
- Duplicate invoice
- Payment status
- Mobile responsive UI
- Basic dashboard

---

## P1 — Shortly After Launch

- Email invoices
- Hosted invoice page
- Stripe payments
- Estimates
- Estimate → Invoice
- Partial payments
- Reports
- CSV export
- More templates

---

## P2 — Growth

- Recurring invoices
- Payment reminders
- Multiple businesses
- Credit notes
- Receipts
- Quotes
- Purchase orders
- Multi-language
- Team accounts
- Advanced reports

---

# 32. Explicitly Out of Scope for MVP

Do NOT initially build:

- Full accounting system
- General ledger
- Payroll
- Bank reconciliation
- Expense management
- Inventory management
- Bookkeeping
- BAS filing
- Tax return preparation
- CRM
- Project management
- Complex approval workflows

These would move the product into direct competition with Xero, QuickBooks and similar platforms and significantly increase development complexity.

---

# 33. Competitive Differentiation

Simply creating an Invoice Home replica provides little reason for customers to switch.

The product should therefore eventually differentiate around:

## 1. Faster Invoice Creation

Remember previous selections and intelligently prefill invoices.

## 2. Smart Invoice Assistant

Example:

User types:

"Website design for ABC Plumbing, $2,500 + GST, due in 14 days."

System generates the invoice automatically.

## 3. Invoice from Text

Paste:

John Smith
Logo design
$800
GST
Due Friday

↓

Invoice generated.

## 4. Invoice from Voice

User says:

"Invoice Acme Plumbing twelve hundred dollars for website maintenance, due in fourteen days."

↓

Invoice generated.

Useful especially for tradespeople using mobile devices.

## 5. Payment Intelligence

Dashboard shows:

$12,430 outstanding

$3,200 overdue

Average payment time: 17 days

Customer most likely to pay late: ABC Ltd

## 6. Simple Australian Experience

Provide an especially good experience for Australian:

- freelancers
- contractors
- sole traders
- tradespeople

with ABN/GST-first configuration.

---

# 34. Recommended Release Strategy

## Phase 1 — Generator

Build:

Invoice form

↓

Preview

↓

PDF

No authentication required.

Purpose:

Validate demand and build SEO pages.

---

## Phase 2 — SaaS

Add:

Accounts

Customers

Items

Saved invoices

Dashboard

Payment status

---

## Phase 3 — Getting Paid

Add:

Email

Hosted invoice pages

Stripe

Reminders

Partial payments

---

## Phase 4 — Automation

Add:

Recurring invoices

Quotes

Estimates

Reports

Multiple businesses

---

## Phase 5 — Differentiation

Add:

Natural-language invoice creation

Voice invoices

Invoice intelligence

Payment predictions

Automation

---

# 35. Product End State

The long-term product should evolve from:

**Free Invoice Generator**

into:

**Simple billing operating system for freelancers and small businesses.**

The goal should not be to become another full accounting package.

The strongest positioning is:

> Create it. Send it. Get paid.

with the product doing everything possible to reduce the work between those three actions.
