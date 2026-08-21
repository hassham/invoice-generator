# Functional Specification Document

## 1. Document Purpose

This Functional Specification Document defines the detailed functional behaviour of the Online Invoice Generator & Billing Platform described in the PRD.

The purpose of this document is to translate the product requirements into implementable application behaviour for:

- Frontend development
- Backend development
- Database design
- API development
- QA
- UI/UX design
- DevOps
- Future AI-assisted development

This document focuses primarily on the MVP while identifying extension points for later phases.

---

# 2. Product Scope

The MVP will allow users to:

- Create invoices without registration
- Preview invoices in real time
- Generate and download PDFs after registration or login
- Register and log in
- Save business information
- Save customers
- Save reusable products/services
- Save invoices
- Edit invoices
- Duplicate invoices
- Track invoice payment status
- View dashboard summaries
- Search and filter invoices
- Use multiple invoice templates

The MVP will not include:

- Full accounting
- Payroll
- Bank reconciliation
- Expense management
- General ledger
- Inventory management
- BAS filing
- Tax return filing
- Complex approval workflows

---

# 3. User Types

## 3.1 Anonymous User

An anonymous user can:

- Create an invoice
- Enter seller information
- Enter customer information
- Add invoice items
- Select a template
- Preview the invoice
- Request PDF download or printing
- Create an account or sign in to complete the requested download or print action

Anonymous users may create and preview a complete invoice without registration. PDF download and printing require registration or login. After authentication, the invoice is saved to the user's account and the requested action completes automatically.

---

## 3.2 Registered User

A registered user can:

- Perform all anonymous functions
- Save business profile
- Save customers
- Save products/services
- Save invoices
- Edit invoices
- Duplicate invoices
- Track payment status
- Search invoices
- View dashboard
- Configure defaults

---

## 3.3 Pro User

Future phase.

A Pro user can additionally access:

- Email sending
- Recurring invoices
- Automated reminders
- Premium templates
- Hosted invoice pages
- Online payments
- Multiple businesses
- Advanced reports
- Data export

---

# 4. High-Level Application Navigation

Primary navigation for authenticated users:

- Dashboard
- Documents
- Customers
- Items
- Templates
- Reports
- Settings
- Upgrade

Primary global action:

**+ New Invoice**

User profile menu:

- Account
- Subscription
- Logout

---

# 5. Functional Module List

The application consists of the following modules:

1. Public Website
2. Authentication
3. Invoice Generator
4. Invoice Preview
5. Invoice Calculation Engine
6. PDF Generation
7. Dashboard
8. Invoice Management
9. Customer Management
10. Product/Service Management
11. Business Profile
12. Template Management
13. Search and Filtering
14. Settings
15. Payment Tracking
16. Notifications
17. Audit Logging
18. Subscription Management
19. Future Payment Integration
20. Future Email Integration

---

# 6. Public Website

## 6.1 Landing Page

### Purpose

The landing page introduces the product and directs visitors to create an invoice.

### Required Components

Header:

- Logo
- Invoice Generator
- Templates
- Pricing
- Login
- Sign Up

Hero:

- Headline
- Supporting text
- Create Invoice CTA

Supporting sections:

- Product benefits
- Template preview
- How it works
- Feature overview
- Pricing teaser
- FAQ
- Footer

Primary CTA:

**Create Free Invoice**

Action:

Redirect to:

`/invoice/create`

---

# 7. Authentication

## 7.1 Registration

### Route

`/signup`

### Fields

- Email
- Password
- Confirm Password

Optional:

- Name

### Validation

Email:

- Required
- Valid format
- Must not already exist

Password:

- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number

Confirm Password:

- Must match password

### Successful Registration

System shall:

1. Create user account
2. Create default business profile
3. Log user in
4. Redirect to dashboard unless registration was initiated from an invoice action

If registration occurs after anonymous invoice creation:

1. System shall preserve all current invoice data and the selected template.
2. System shall associate and save the invoice under the newly created account.
3. System shall return the user to the invoice context rather than the dashboard.
4. System shall automatically complete the pending download or print action.
5. User shall not need to re-enter invoice data or repeat the requested action.

---

# 8. Login

### Route

`/login`

### Fields

- Email
- Password
- Remember Me

Actions:

- Login
- Forgot Password
- Sign Up
- Login with Google

### Failed Login

Display:

> Incorrect email or password.

Do not expose whether a particular email exists.

### Successful Login

System shall log the user in and redirect to the dashboard unless login was initiated from an invoice action.

If login was initiated after anonymous invoice creation, the system shall follow the preservation, save and automatic action-completion requirements in Section 117.

---

# 9. Password Reset

User enters email.

System sends password reset link.

Reset link must:

- Expire after defined duration
- Be single use
- Use secure random token

---

# 10. Invoice Generator

## 10.1 Route

`/invoice/create`

Authenticated version:

`/documents/invoices/new`

---

# 11. Invoice Editor Layout

Desktop:

Two-column layout.

### Left Column

Invoice form.

### Right Column

Live invoice preview.

Suggested ratio:

55% editor

45% preview

---

Mobile:

Single-column.

Tabs:

- Edit
- Preview

Preview should not require page reload.

---

# 12. Invoice Header Section

Fields:

### Invoice Number

Type:

Text

Default:

Generated automatically for registered users.

Example:

`INV-000001`

Anonymous users:

May use generated temporary invoice number.

Rules:

- Must be unique within business account
- Editable before finalisation
- Maximum 50 characters

---

### Issue Date

Type:

Date

Default:

Current date.

Required:

Yes.

---

### Due Date

Type:

Date

Default:

Issue Date + default payment terms.

Example:

Issue Date:

19 August 2026

Default terms:

14 days

Due Date:

2 September 2026

Validation:

Due date cannot precede issue date unless explicitly allowed through configuration.

---

### Currency

Type:

Dropdown

Default:

Business default currency.

Initial values:

- AUD
- USD
- EUR
- GBP
- CAD
- NZD
- SGD
- AED

System architecture must support additional ISO currencies.

---

### Reference / Purchase Order

Optional free-text field.

Maximum:

100 characters.

---

# 13. Seller Information

Fields:

- Business Name
- Contact Name
- Email
- Phone
- Website
- Address Line 1
- Address Line 2
- City
- State / Province
- Postal Code
- Country
- Registration Number
- Tax Number

For Australian configuration:

Registration label:

ABN

Tax label:

GST Registration / ABN

Fields should support configurable labels.

---

# 14. Business Logo

Accepted formats:

- JPG
- JPEG
- PNG
- WEBP

Maximum upload size:

5 MB

Validation:

- Must be valid image
- Reject executable or renamed files
- Resize for display if required

Recommended output:

Maximum width 600px.

---

# 15. Customer Information

Fields:

- Business / Customer Name
- Contact Name
- Email
- Phone
- Address Line 1
- Address Line 2
- City
- State / Province
- Postal Code
- Country
- Tax Number

Customer Name:

Required.

Other fields:

Optional.

---

# 16. Registered Customer Lookup

When registered user types into Customer Name:

System should search saved customers.

Search begins after:

2 characters.

Dropdown should display:

- Customer name
- Contact
- Email

Selecting customer populates saved customer fields.

User can overwrite populated values on the invoice.

Invoice data should be stored as a snapshot, so later changes to the customer record do not alter historical invoices.

---

# 17. Invoice Items

Each invoice shall support one or more items.

Fields per item:

- Description
- Quantity
- Unit
- Unit Price
- Tax Rate
- Discount
- Line Total

---

# 18. Item Description

Required.

Maximum:

500 characters.

Supports multiline text.

---

# 19. Quantity

Data type:

Decimal.

Default:

1.

Rules:

- Greater than 0
- Maximum precision configurable
- Example accepted values:

1

2

1.5

10.25

---

# 20. Unit

Optional dropdown.

Examples:

- Item
- Hour
- Day
- Week
- Month
- Project
- Kg
- Km
- Service

User should eventually be able to define custom units.

---

# 21. Unit Price

Required.

Data type:

Decimal.

Rules:

- Greater than or equal to 0
- Currency formatting applied
- Store monetary values safely using decimal data type

---

# 22. Tax Rate

Optional.

Possible values:

- 0%
- 5%
- 10%
- 15%
- 20%
- Custom

Australian default:

10% GST.

Business settings determine default tax rate.

---

# 23. Discount

Discount type:

- Percentage
- Fixed amount

Discount can exist at:

- Line level
- Invoice level

MVP recommendation:

Support invoice-level discount first.

Line-level discounts may be included if implementation complexity remains low.

---

# 24. Add / Remove Invoice Items

Actions:

- Add Item
- Remove Item
- Duplicate Item

Minimum:

At least one item row.

If only one row exists and user attempts removal:

Clear fields rather than remove row.

---

# 25. Item Catalogue Lookup

For registered users:

Typing into item description searches saved products/services.

Display:

- Name
- Price
- Unit

Selecting an item populates:

- Description
- Unit
- Unit Price
- Tax Rate

Invoice stores a snapshot.

Later catalogue modifications must not alter historical invoices.

---

# 26. Invoice Calculation Engine

The system must calculate invoice totals automatically.

Calculation sequence:

1. Calculate line amount
2. Calculate subtotal
3. Apply invoice discount
4. Calculate tax
5. Apply additional charges if applicable
6. Calculate total
7. Subtract recorded payments
8. Calculate amount due

---

# 27. Calculation Formula

For each line:

`Line Amount = Quantity × Unit Price`

If line discount exists:

`Discounted Line Amount = Line Amount - Discount`

Subtotal:

`Subtotal = Sum of Discounted Line Amounts`

Invoice discount:

`Adjusted Subtotal = Subtotal - Invoice Discount`

Tax:

`Tax Amount = Taxable Amount × Tax Rate`

Grand total:

`Grand Total = Adjusted Subtotal + Tax + Additional Charges`

Amount due:

`Amount Due = Grand Total - Payments Received`

---

# 28. Rounding

Currency calculations should use decimal arithmetic.

Default:

2 decimal places.

Example:

10.555

May display:

10.56

Rounding method should be consistent across:

- UI
- Backend
- Database
- PDF

Backend calculation result should be authoritative.

Frontend calculations may be used for immediate preview.

---

# 29. Tax Inclusive Pricing

Business setting:

Tax calculation method.

Options:

- Tax Exclusive
- Tax Inclusive

Example:

Price:

$110

Tax Inclusive:

10%

System calculates:

Subtotal ex tax:

$100

Tax:

$10

Total:

$110

---

# 30. Invoice Notes

Optional.

Maximum:

2,000 characters.

Use cases:

- Thank-you messages
- Service notes
- Additional instructions

---

# 31. Terms and Conditions

Optional.

Maximum:

5,000 characters.

May contain:

- Payment terms
- Late fee language
- Refund terms

Plain text in MVP.

Rich text may be future enhancement.

---

# 32. Payment Instructions

Optional fields:

- Bank Name
- Account Name
- BSB / Routing Number
- Account Number
- IBAN
- SWIFT
- Payment Reference
- Custom Instructions

Only relevant fields should be displayed based on configuration.

---

# 33. Template Selection

Users can select a template.

MVP target:

10 templates.

Each template has:

- Template ID
- Name
- Preview image
- Layout definition
- Font selection
- Colour configuration

---

# 34. Template Customisation

User can customise:

- Primary colour
- Accent colour
- Logo
- Font
- Optional header style

Changes should update preview immediately.

---

# 35. Invoice Preview

Preview must show:

- Logo
- Seller details
- Customer details
- Invoice number
- Issue date
- Due date
- Items
- Tax
- Discounts
- Totals
- Notes
- Terms
- Payment instructions

Preview should resemble final PDF as closely as technically possible.

---

# 36. Save Invoice

Authenticated users:

Save button stores invoice.

Possible statuses:

- Draft
- Sent
- Viewed
- Partially Paid
- Paid
- Overdue
- Cancelled

Initial status:

Draft.

---

# 37. Anonymous Invoice Behaviour

Anonymous invoice data may temporarily persist using:

- Browser local storage
- Session storage

Recommended:

Local storage.

Benefits:

If browser refreshes accidentally, invoice can be restored.

Do not treat local storage as permanent user storage.

Anonymous users may create and preview an invoice but may not download its PDF or open its printer-friendly rendering until they register or sign in.

When an anonymous user requests either action, the system shall preserve:

- All invoice fields
- Selected template and customisation
- The requested action

The preserved data shall survive the authentication flow. It shall be cleared from temporary storage after it has been successfully associated with the authenticated account, subject to normal recovery handling.

---

# 38. PDF Generation

Action:

**Download PDF**

For an authenticated user, system shall:

1. Validate invoice
2. Save or update the invoice under the user's account
3. Render selected template
4. Generate PDF
5. Return PDF to browser and start the download
6. Store the generated copy where required by the document-storage policy

For an anonymous user, system shall initiate the conversion flow defined in Section 117. After successful registration or login, the system shall perform the authenticated flow automatically without requiring another click.

---

# 39. PDF File Naming

Default format:

`Invoice-{InvoiceNumber}.pdf`

Example:

`Invoice-INV-000123.pdf`

Unsafe filename characters must be removed.

---

# 40. Print Invoice

Action:

**Print**

For an authenticated user, system saves or updates the invoice and opens the printer-friendly rendering.

For an anonymous user, system initiates the conversion flow defined in Section 117. After successful registration or login, the system shall open the printer-friendly rendering automatically without requiring another click.

No navigation elements should appear in print output.

---

# 41. Invoice Validation

Before PDF generation or final save:

Required:

- Seller/business name
- Customer name
- Invoice number
- Issue date
- Due date
- Currency
- At least one valid invoice item

Each invoice item requires:

- Description
- Quantity
- Unit Price

Validation messages must appear next to relevant fields.

---

# 42. Dashboard

## Route

`/dashboard`

Dashboard contains:

### Financial Summary Cards

- Total Invoiced
- Total Paid
- Outstanding
- Overdue

Default period:

Current month.

Optional period selector:

- This Month
- Last Month
- This Quarter
- This Year
- Custom

---

# 43. Recent Invoices

Display latest invoices.

Columns:

- Invoice Number
- Customer
- Issue Date
- Due Date
- Amount
- Amount Due
- Status
- Actions

Actions:

- View
- Edit
- Duplicate
- Download PDF
- Mark Paid

---

# 44. Dashboard Empty State

If no invoices exist:

Display:

> Create your first invoice.

CTA:

**Create Invoice**

---

# 45. Invoice List

## Route

`/documents/invoices`

Columns:

- Invoice Number
- Customer
- Date
- Due Date
- Amount
- Amount Due
- Status

Actions menu:

- View
- Edit
- Duplicate
- Download
- Mark Paid
- Cancel
- Delete

---

# 46. Invoice Search

Search fields:

- Invoice number
- Customer name
- Customer email
- Reference

Search should support partial text matching.

---

# 47. Invoice Filters

Filters:

### Status

- Draft
- Sent
- Paid
- Partially Paid
- Overdue
- Cancelled

### Date

- This Month
- Last Month
- This Quarter
- This Year
- Custom

### Customer

Dropdown.

---

# 48. Invoice Sorting

Sort options:

- Newest
- Oldest
- Amount Highest
- Amount Lowest
- Due Date

---

# 49. Invoice Detail Page

## Route

`/documents/invoices/{id}`

Display:

- Invoice preview
- Invoice metadata
- Payment history
- Status
- Activity

Actions:

- Edit
- Duplicate
- Download PDF
- Record Payment
- Mark Paid
- Cancel

Future:

- Send
- Send Reminder
- Copy Public Link

---

# 50. Invoice Edit

Editable when:

- Draft
- Sent
- Overdue

Paid invoice:

Editable restrictions should be considered.

Recommended MVP behaviour:

Allow editing but display warning.

Future accounting-oriented versions may lock paid invoices and require credit notes.

---

# 51. Duplicate Invoice

Action:

Duplicate.

System creates a new draft invoice.

Copied:

- Customer
- Items
- Tax settings
- Notes
- Terms
- Template

Not copied:

- Invoice number
- Issue date
- Due date
- Payments
- Status

New invoice number generated.

Issue date:

Current date.

Due date:

Calculated using current default terms.

---

# 52. Cancel Invoice

User confirms cancellation.

Status becomes:

Cancelled.

Cancelled invoice:

- Remains visible
- Not included in outstanding amount
- Cannot be marked overdue
- Payments cannot be added without reactivation

---

# 53. Delete Invoice

MVP behaviour:

Draft invoices can be deleted.

Sent/Paid invoices:

Prefer soft deletion or archival.

Do not permanently remove financial history without explicit design decision.

---

# 54. Overdue Status

Invoice becomes overdue automatically when:

Current Date > Due Date

AND

Amount Due > 0

AND

Status is not:

- Paid
- Cancelled

System may compute overdue dynamically or via scheduled background job.

Recommended:

Dynamic status calculation combined with scheduled maintenance.

---

# 55. Customer Management

## Route

`/customers`

List columns:

- Customer Name
- Contact
- Email
- Phone
- Outstanding Amount
- Last Invoice Date

Actions:

- View
- Edit
- Create Invoice
- Archive

---

# 56. Create Customer

## Route

`/customers/new`

Fields:

- Business Name
- Contact Name
- Email
- Phone
- Address
- Tax Number
- Notes

Required:

Customer name.

---

# 57. Customer Details

Page shows:

- Customer information
- Total invoiced
- Total paid
- Outstanding
- Invoice history

Action:

**Create Invoice**

Invoice opens with customer preselected.

---

# 58. Customer Archive

Customers should preferably be archived rather than permanently deleted when invoices reference them.

Archived customers:

- Hidden from active lists
- Historical invoices remain unchanged
- Can be restored

---

# 59. Product / Service Management

## Route

`/items`

Columns:

- Name
- Description
- Unit
- Price
- Tax
- Status

Actions:

- Edit
- Duplicate
- Archive

---

# 60. Create Product / Service

Fields:

- Name
- Description
- SKU
- Unit
- Unit Price
- Tax Rate

Required:

- Name
- Unit Price

---

# 61. Item Archive

Archived items:

- Do not appear in invoice autocomplete by default
- Remain visible on historical invoices
- Can be restored

---

# 62. Business Profile

## Route

`/settings/business`

Fields:

- Business Name
- Legal Name
- Email
- Phone
- Website
- Address
- Country
- Registration Number
- Tax Number
- Logo

User should configure once and reuse on all invoices.

---

# 63. Business Defaults

Settings include:

- Default Currency
- Default Tax Rate
- Tax Inclusive / Exclusive
- Default Payment Terms
- Default Invoice Notes
- Default Terms & Conditions
- Default Template
- Invoice Prefix

---

# 64. Invoice Numbering

Fields:

Prefix:

Example:

INV-

Next Number:

Example:

1001

Number Padding:

Example:

4

Generated result:

INV-1001

Optional configuration:

Start:

1

Padding:

6

Result:

INV-000001

---

# 65. Number Uniqueness

Invoice number must be unique per business.

If duplicate:

Display:

> This invoice number is already in use.

---

# 66. Payment Terms

Predefined:

- Due on Receipt
- 7 Days
- 14 Days
- 30 Days
- 60 Days
- 90 Days
- Custom

Selecting terms automatically calculates due date.

---

# 67. Payment Tracking

Invoice can have zero or more payment records.

Payment fields:

- Payment Date
- Amount
- Payment Method
- Reference
- Notes

---

# 68. Payment Methods

Initial options:

- Cash
- Bank Transfer
- Card
- PayPal
- Cheque
- Other

---

# 69. Record Payment

User selects:

**Record Payment**

Form:

Amount:

Default = outstanding balance.

Date:

Default = current date.

Payment method:

Required.

Reference:

Optional.

---

# 70. Payment Validation

Amount must:

- Be greater than zero
- Not exceed outstanding balance unless overpayment support exists

MVP recommendation:

Reject overpayment.

---

# 71. Payment Status Update

If payments total:

0

Status remains previous unpaid status.

If:

Payments > 0

and

Payments < Total

Status:

Partially Paid.

If:

Payments = Total

Status:

Paid.

---

# 72. Remove Payment

Registered user may remove incorrect manually entered payment.

System must recalculate status and amount due.

Deletion should be audit logged.

---

# 73. Templates Page

## Route

`/templates`

Display card grid.

Each card contains:

- Template preview
- Template name
- Free / Pro label

Actions:

- Preview
- Use Template

MVP templates:

All free or selected premium-ready templates.

---

# 74. Settings Navigation

Settings sections:

- Business
- Invoice Defaults
- Payments
- Email
- Account
- Subscription

Some pages may be placeholders until post-MVP features are enabled.

---

# 75. Account Settings

Fields:

- Name
- Email
- Password

Actions:

- Change Password
- Logout All Sessions
- Delete Account

Future:

- Two-factor authentication

---

# 76. Account Deletion

Deletion flow:

1. User clicks Delete Account
2. Warning displayed
3. Password confirmation required
4. User confirms
5. Account scheduled or permanently deleted according to retention policy

Recommended:

Soft-delete initially, then permanently purge after retention period.

---

# 77. Subscription Management

Future MVP+.

Plans:

- Free
- Pro

Subscription page displays:

- Current plan
- Billing cycle
- Renewal date
- Upgrade
- Cancel subscription

Stripe Billing recommended.

---

# 78. Free Plan Restrictions

Potential restrictions:

- Limited templates
- Branding on hosted invoice
- No automated reminders
- No recurring invoices
- Basic reports only

Do not unnecessarily restrict core invoice creation during early growth.

---

# 79. Pro Feature Handling

If Free user clicks Pro feature:

Display upgrade modal.

Example:

> Recurring invoices are available on Pro.

Buttons:

- Upgrade
- Not Now

Do not navigate user away unexpectedly.

---

# 80. Error Handling

Error types:

### Validation Error

Example:

> Customer name is required.

### Business Rule Error

Example:

> Invoice number already exists.

### Server Error

Example:

> Something went wrong. Please try again.

### Authentication Error

Example:

> Your session has expired. Please sign in again.

---

# 81. Unsaved Changes Handling

If user attempts to leave invoice editor with unsaved changes:

Display confirmation:

> You have unsaved changes. Leave without saving?

Buttons:

- Stay
- Leave

For anonymous users using local storage:

Auto-save locally where possible.

---

# 82. Auto-Save

Recommended for registered users.

Behaviour:

Auto-save invoice draft after approximately:

2–5 seconds of inactivity.

Display:

Saving...

then:

Saved

Auto-save should not trigger on every keystroke.

---

# 83. Audit Logging

Audit significant actions:

- Account created
- Invoice created
- Invoice updated
- Invoice deleted
- Invoice cancelled
- Payment created
- Payment removed
- Business settings changed
- Subscription changed

Audit record:

- User ID
- Entity
- Entity ID
- Action
- Timestamp
- IP where appropriate
- Metadata

---

# 84. Notifications

MVP:

In-app toast notifications.

Examples:

> Invoice saved.

> Customer created.

> Payment recorded.

> Invoice duplicated.

Error:

> Invoice could not be saved.

Future:

Email notifications.

---

# 85. Responsive Behaviour

Application must support:

- Desktop
- Tablet
- Mobile

Minimum target width:

320px.

Mobile invoice editor should remain fully usable.

Important actions should remain accessible without horizontal scrolling.

---

# 86. Accessibility

Target:

WCAG 2.1 AA where feasible.

Requirements:

- Keyboard navigation
- Accessible labels
- Form validation announcements
- Proper colour contrast
- Focus states
- Semantic HTML
- Alt text for meaningful images

---

# 87. Security Requirements

System shall implement:

- HTTPS
- Secure cookies
- CSRF protection
- XSS protection
- SQL injection prevention
- Password hashing
- Rate limiting
- Input sanitisation
- File validation
- Access control
- Audit logging

---

# 88. Authorisation

Every protected business entity must belong to an authenticated user/business.

Backend must verify ownership.

Example:

User A must never access:

`/api/invoices/{UserBInvoiceId}`

even if ID is known.

---

# 89. File Upload Security

Uploaded logos:

- Validate MIME type
- Validate file signature
- Rename on storage
- Prevent executable files
- Store outside executable web directory
- Generate safe URL

---

# 90. API Overview

Suggested API base:

`/api/v1`

---

# 91. Authentication APIs

### POST

`/api/v1/auth/register`

### POST

`/api/v1/auth/login`

### POST

`/api/v1/auth/logout`

### POST

`/api/v1/auth/forgot-password`

### POST

`/api/v1/auth/reset-password`

---

# 92. Invoice APIs

### GET

`/api/v1/invoices`

### GET

`/api/v1/invoices/{id}`

### POST

`/api/v1/invoices`

### PUT

`/api/v1/invoices/{id}`

### DELETE

`/api/v1/invoices/{id}`

### POST

`/api/v1/invoices/{id}/duplicate`

### POST

`/api/v1/invoices/{id}/cancel`

### POST

`/api/v1/invoices/{id}/pdf`

---

# 93. Customer APIs

### GET

`/api/v1/customers`

### GET

`/api/v1/customers/{id}`

### POST

`/api/v1/customers`

### PUT

`/api/v1/customers/{id}`

### DELETE / Archive

`/api/v1/customers/{id}`

---

# 94. Item APIs

### GET

`/api/v1/items`

### GET

`/api/v1/items/{id}`

### POST

`/api/v1/items`

### PUT

`/api/v1/items/{id}`

### DELETE / Archive

`/api/v1/items/{id}`

---

# 95. Business APIs

### GET

`/api/v1/business`

### PUT

`/api/v1/business`

### POST

`/api/v1/business/logo`

---

# 96. Payment APIs

### GET

`/api/v1/invoices/{invoiceId}/payments`

### POST

`/api/v1/invoices/{invoiceId}/payments`

### DELETE

`/api/v1/invoices/{invoiceId}/payments/{paymentId}`

---

# 97. Template APIs

### GET

`/api/v1/templates`

### GET

`/api/v1/templates/{id}`

---

# 98. Dashboard APIs

### GET

`/api/v1/dashboard/summary`

Parameters:

- startDate
- endDate

Returns:

- Total invoiced
- Total paid
- Outstanding
- Overdue
- Recent invoices

---

# 99. Core Entity Model

## User

Fields:

- Id
- Name
- Email
- PasswordHash
- Status
- CreatedAt
- UpdatedAt
- LastLoginAt

---

# 100. Business

Fields:

- Id
- UserId
- BusinessName
- LegalName
- Email
- Phone
- Website
- Address fields
- Country
- RegistrationNumber
- TaxNumber
- DefaultCurrency
- DefaultTaxRate
- TaxCalculationMethod
- InvoicePrefix
- NextInvoiceNumber
- DefaultPaymentTerms
- DefaultTemplateId
- LogoUrl
- CreatedAt
- UpdatedAt

---

# 101. Customer

Fields:

- Id
- BusinessId
- BusinessName
- ContactName
- Email
- Phone
- Address fields
- TaxNumber
- Notes
- IsArchived
- CreatedAt
- UpdatedAt

---

# 102. Item

Fields:

- Id
- BusinessId
- Name
- Description
- SKU
- Unit
- UnitPrice
- TaxRate
- IsArchived
- CreatedAt
- UpdatedAt

---

# 103. Invoice

Fields:

- Id
- BusinessId
- CustomerId
- InvoiceNumber
- Status
- IssueDate
- DueDate
- Currency
- Reference
- CustomerSnapshot
- SellerSnapshot
- Subtotal
- DiscountAmount
- TaxAmount
- TotalAmount
- AmountPaid
- AmountDue
- Notes
- Terms
- PaymentInstructions
- TemplateId
- TemplateSettings
- CreatedAt
- UpdatedAt

---

# 104. Invoice Item

Fields:

- Id
- InvoiceId
- SourceItemId
- Description
- Quantity
- Unit
- UnitPrice
- TaxRate
- Discount
- LineSubtotal
- TaxAmount
- LineTotal
- SortOrder

---

# 105. Payment

Fields:

- Id
- InvoiceId
- PaymentDate
- Amount
- PaymentMethod
- Reference
- Notes
- CreatedAt
- CreatedBy

---

# 106. Template

Fields:

- Id
- Name
- TemplateCode
- PreviewImage
- IsPremium
- IsActive
- SortOrder

---

# 107. Audit Log

Fields:

- Id
- UserId
- BusinessId
- EntityType
- EntityId
- Action
- Metadata
- Timestamp

---

# 108. Invoice Status Rules

## Draft

Invoice created but not finalised/sent.

## Sent

Invoice has been sent to customer.

Future phase.

## Viewed

Hosted invoice page viewed.

Future phase.

## Partially Paid

Payment received but balance remains.

## Paid

Amount Due = 0.

## Overdue

Due date passed and balance remains.

## Cancelled

Invoice intentionally voided.

---

# 109. Dashboard Calculation Rules

### Total Invoiced

Sum invoice totals excluding:

- Draft
- Cancelled

### Total Paid

Sum payments received.

### Outstanding

Sum Amount Due for valid unpaid invoices.

### Overdue

Sum Amount Due where:

DueDate < CurrentDate

and

AmountDue > 0

---

# 110. Empty States

Application should define useful empty states.

Customers:

> No customers yet.

CTA:

Add Customer

Items:

> No saved items yet.

CTA:

Add Item

Invoices:

> No invoices yet.

CTA:

Create Invoice

---

# 111. Loading States

Use skeleton/loading states for:

- Dashboard
- Invoice lists
- Customers
- Items
- Templates

Buttons performing server operations should display disabled loading state.

Example:

Saving...

---

# 112. Pagination

Invoice list:

Default:

25 records per page.

Options:

25

50

100

Customer and item lists:

Same approach.

Future:

Cursor-based pagination for larger datasets.

---

# 113. Date Formatting

User-facing date formatting should follow business locale.

Australian example:

19/08/2026

Database:

Use standard date/time representation.

Store timestamps in UTC.

Business date fields should be treated carefully to avoid timezone shift.

---

# 114. Currency Formatting

Examples:

AUD:

$1,250.00

EUR:

€1,250.00

Currency symbol alone may be ambiguous.

Invoice should optionally display currency code:

AUD $1,250.00

---

# 115. Timezone

Business profile should store timezone.

Default determined during onboarding.

All audit/system timestamps stored in UTC.

Displayed using business/user timezone.

---

# 116. Onboarding

After registration:

Optional short onboarding wizard.

Step 1:

Business Name

Step 2:

Country

Step 3:

Currency

Step 4:

Tax Registration

Step 5:

Upload Logo

Button:

Start Creating Invoices

Skip option should be available.

---

# 117. Anonymous-to-Registered Conversion

Important acquisition flow.

Anonymous user creates invoice.

Clicks:

**Download PDF** or **Print**

System displays:

> Create a free account to download and securely save your invoice.

The authentication screen shall also allow an existing user to sign in.

During authentication:

- Current invoice data, template selection and pending action shall remain preserved.
- User shall not have to re-enter invoice details.

After successful registration or login:

1. System associates and saves the invoice under the authenticated account.
2. System automatically generates the PDF.
3. System automatically starts the download or opens the printer-friendly rendering, according to the pending action.
4. System returns the user to the saved invoice context.

The user shall not have to click the original action again.

---

# 118. Future Email Module

Post-MVP.

Invoice actions:

**Send Invoice**

Modal:

- To
- CC
- Subject
- Message
- Attach PDF

Default recipient:

Customer email.

---

# 119. Future Hosted Invoice Page

URL:

`/i/{secureToken}`

Customer can:

- View invoice
- Download PDF
- See balance
- Pay online

No login required.

Secure token must be high entropy.

---

# 120. Future Online Payment Module

Payment provider:

Stripe.

Flow:

Customer opens hosted invoice.

Clicks:

Pay Now.

Stripe Checkout opens.

Payment completed.

Stripe webhook received.

System records payment.

Invoice status updated.

Receipt/confirmation displayed.

---

# 121. Future Recurring Invoice Module

Fields:

- Customer
- Invoice template
- Frequency
- Start Date
- End Date
- Next Run Date
- Auto Send

System job runs scheduled recurrence.

Creates invoice.

Generates invoice number.

Optional email send.

---

# 122. Future Reminder Module

Reminder rules:

- Before Due Date
- Due Date
- X Days Overdue

A reminder shall not send if:

- Invoice Paid
- Invoice Cancelled

User may disable reminders per invoice.

---

# 123. Logging

Application logging should include:

- Request errors
- Authentication failures
- PDF generation failures
- Storage errors
- External provider errors

Do not log:

- Passwords
- Card data
- Sensitive credentials

---

# 124. Monitoring

Production should monitor:

- API health
- Error rate
- Database connectivity
- PDF generation success
- Login success/failure trends
- Storage
- Email provider future health

---

# 125. Performance Requirements

Invoice editor:

User changes should reflect in preview near instantly.

API common endpoints:

Target:

<500ms under normal operating conditions.

PDF generation:

Target:

<3 seconds under normal operating conditions.

Dashboard:

Target initial render:

<2 seconds with normal account sizes.

---

# 126. Browser Support

Target latest two major versions of:

- Chrome
- Edge
- Safari
- Firefox

Mobile:

- Safari iOS
- Chrome Android

---

# 127. Acceptance Criteria — Anonymous Invoice Creation and Conversion

Given an anonymous visitor

When they open invoice generator

Then they must be able to:

- Enter seller details
- Enter customer details
- Add items
- Select tax
- See live preview

Without creating an account.

When the anonymous user clicks Download PDF or Print:

- Registration and sign-in options are displayed
- Current invoice data and selected template remain preserved
- No PDF download or printer-friendly rendering is provided before authentication

When registration or sign-in succeeds:

- The invoice is saved under the authenticated account
- The pending PDF download or print action completes automatically
- The user does not need to re-enter invoice details or click the action again

---

# 128. Acceptance Criteria — Registered Invoice

Given an authenticated user

When they create a valid invoice

And click Save

Then:

- Invoice is stored
- Unique invoice number is assigned
- Invoice appears in invoice list
- Dashboard values update

---

# 129. Acceptance Criteria — Customer Selection

Given saved customer exists

When user types customer name

Then matching customers display.

When user selects one

Then saved customer data populates invoice form.

---

# 130. Acceptance Criteria — Saved Item

Given saved item exists

When user searches invoice item

And selects an item

Then:

- Description populates
- Unit populates
- Price populates
- Tax populates

---

# 131. Acceptance Criteria — Calculation

Given:

Quantity = 2

Unit Price = $100

Tax = 10%

Then:

Subtotal = $200

Tax = $20

Total = $220

---

# 132. Acceptance Criteria — Partial Payment

Given invoice total is:

$1,000

And user records:

$400 payment

Then:

Amount Paid = $400

Amount Due = $600

Status = Partially Paid

---

# 133. Acceptance Criteria — Full Payment

Given invoice amount due is:

$600

When user records:

$600

Then:

Amount Due = $0

Status = Paid

---

# 134. Acceptance Criteria — Overdue Invoice

Given:

Invoice due date is earlier than today

And:

Amount Due > 0

Then:

Invoice should display:

Overdue.

---

# 135. Acceptance Criteria — Duplicate

Given an existing invoice

When Duplicate is selected

Then new invoice:

- Copies customer
- Copies items
- Copies template
- Receives new invoice number
- Uses current issue date
- Becomes Draft

---

# 136. MVP Screen List

Public:

1. Home
2. Invoice Generator
3. Template Gallery
4. Pricing
5. Login
6. Registration
7. Forgot Password

Authenticated:

8. Dashboard
9. Invoice List
10. Invoice Create
11. Invoice Edit
12. Invoice Detail
13. Customer List
14. Customer Create/Edit
15. Customer Detail
16. Item List
17. Item Create/Edit
18. Templates
19. Business Settings
20. Invoice Settings
21. Account Settings

---

# 137. Recommended MVP Development Order

## Sprint 1

Foundation:

- Application shell
- Database
- Authentication
- Business entity
- Basic navigation

## Sprint 2

Invoice editor:

- Seller
- Customer
- Items
- Calculations

## Sprint 3

Templates:

- Preview engine
- Template system
- PDF generation

## Sprint 4

Persistence:

- Invoice saving
- Invoice list
- Invoice detail
- Editing
- Duplication

## Sprint 5

Customer and item management:

- Customers
- Items
- Autocomplete

## Sprint 6

Payments and dashboard:

- Payment recording
- Status handling
- Dashboard metrics
- Filters

## Sprint 7

Polish:

- Mobile responsive
- Validation
- Error handling
- Security
- QA
- Production deployment

---

# 138. Recommended Architecture Boundary

Frontend should not contain authoritative business rules.

Frontend responsibilities:

- Form state
- Immediate preview
- Client validation
- UX

Backend responsibilities:

- Authorisation
- Invoice numbering
- Final calculations
- Data validation
- Persistence
- PDF generation
- Payment state
- Business rules

Frontend may calculate totals for UX.

Backend must independently recalculate before saving.

---

# 139. Key Technical Design Principle

The invoice itself should be treated as a document snapshot.

When an invoice is created:

Customer details are copied onto the invoice.

Seller details are copied onto the invoice.

Item details are copied onto invoice lines.

Therefore:

Changing customer records later must not change old invoices.

Changing product prices later must not change old invoices.

Changing business address later must not change previously issued invoices.

This is essential for document integrity.

---

# 140. Definition of MVP Done

The MVP is considered functionally complete when:

- Anonymous users can create invoices
- PDF output is professional and reliable
- Users can create accounts
- Business profiles can be saved
- Customers can be managed
- Items can be managed
- Invoices can be saved
- Invoices can be edited
- Invoices can be duplicated
- Payments can be recorded
- Invoice statuses update correctly
- Dashboard displays accurate totals
- Templates work across desktop and mobile
- Data is secure and isolated between users
- Core functionality passes automated and manual QA

---

# 141. Recommended Next Documentation

After this FSD, development documentation should be produced in this order:

1. `SAD.md` — Solution Architecture Document
2. `DATABASE_SCHEMA.md` — complete relational schema
3. `API_SPECIFICATION.md`
4. `UI_SCREEN_SPECIFICATION.md`
5. `USER_STORIES.md`
6. `ACCEPTANCE_TESTS.md`
7. `BACKLOG.md`
8. `DEPLOYMENT_ARCHITECTURE.md`

These documents together should provide sufficient detail for AI-assisted or traditional implementation.
