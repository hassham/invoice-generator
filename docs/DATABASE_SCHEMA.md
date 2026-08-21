# Database Schema

## 1. Purpose

This document is the source of truth for the initial PostgreSQL schema. It translates the Core
Entity Model in `docs/FSD.md` sections 99-107 and the database rules in `docs/SAD.md` sections
29-34 into concrete tables, columns, types and constraints, so migrations are generated from an
agreed design rather than invented ad hoc.

Scope is the MVP only. `docs/AGENTS.md` prohibits pulling post-MVP capabilities into
implementation without an approved Jira issue, so the following are explicitly **excluded** from
this schema even though they appear in illustrative examples elsewhere in `docs/SAD.md`:

- Subscriptions/billing (`docs/FSD.md` section 77 - "Future MVP+"; `docs/SAD.md` section 23 -
  "Future module").
- Notifications and Reporting modules (`docs/SAD.md` sections 21-22 - both "Future-capable").
- Hosted invoice pages, online payments, recurring invoices, reminders (`docs/FSD.md` sections
  118-122 - all "Future").

## 2. Conventions

- **Database:** PostgreSQL, one database, `Npgsql.EntityFrameworkCore.PostgreSQL`.
- **Schemas:** one PostgreSQL schema per module, per `docs/SAD.md` section 30: `identity`,
  `business`, `customer`, `catalog`, `invoice`, `payment`, `document`, `audit`.
- **Naming:** tables/columns are `snake_case`, applied model-wide by `EFCore.NamingConventions`'
  `UseSnakeCaseNamingConvention()` rather than per-property `HasColumnName()` calls - this also
  converts ASP.NET Core Identity's own default columns (e.g. `UserName` -> `user_name`), which a
  per-table approach would otherwise miss.
- **Primary keys:** `uuid` (`Guid`), generated application-side (`Guid.CreateVersion7()` /
  `Guid.NewGuid()`), per `docs/SAD.md` section 33.
- **Money:** `decimal(19,4)`, per `docs/SAD.md` section 34. Never `float`/`double`.
- **Rates/percentages** (tax rate, discount percentage): `decimal(9,4)`.
- **Quantities:** `decimal(18,4)`.
- **Timestamps:** `timestamptz` (UTC). Every table has `created_at`; mutable tables have
  `updated_at`.
- **Currency:** ISO 4217 3-letter code (`varchar(3)`), per `docs/SAD.md` section "Currency should
  be stored as ISO 4217 currency code."
- **Country:** ISO 3166-1 alpha-2 code (`varchar(2)`).
- **Enums:** stored as `varchar` via an EF Core string value converter, not native PostgreSQL
  `enum` types - simpler migrations, readable data, no type-alteration friction when a new value
  is added later.
- **Soft delete:** used only where the FSD explicitly calls for it (customer/catalog archiving,
  invoice archival for non-draft invoices). Draft invoices are hard-deleted per `docs/FSD.md`
  section 53.
- **Snapshots:** per `docs/SAD.md` section 35, invoices store `jsonb` snapshots of seller,
  customer and template settings at issue time, so later changes to a business/customer profile
  never alter a previously issued invoice.

## 3. Identity (`identity` schema)

Uses ASP.NET Core Identity (`docs/SAD.md` sections 14, 36 - "Initial implementation: ASP.NET Core
Identity"), which is an **Infrastructure** concern (`docs/SAD.md` section 11 lists "Authentication
infrastructure" under Infrastructure), not a Domain entity - `ApplicationUser` lives in
`InvoiceApp.Infrastructure`, not `InvoiceApp.Domain`.

`ApplicationUser : IdentityUser<Guid>` adds:

- `Name` (`varchar(200)`, nullable - FSD marks registration Name as optional)
- `Status` (`varchar(20)`, required, default `Active`)
- `CreatedAt`, `UpdatedAt` (`timestamptz`)
- `LastLoginAt` (`timestamptz`, nullable)

Tables (Identity's default set, renamed into the `identity` schema, lowercase/snake_case):
`identity.users`, `identity.roles`, `identity.user_roles`, `identity.user_claims`,
`identity.user_logins`, `identity.user_tokens`, `identity.role_claims`.

Identity's built-in mechanisms cover requirements that would otherwise need bespoke tables:
`user_logins` covers external OAuth identities (Google - `docs/SAD.md` section 38), and
`user_tokens` (with the default token provider) covers single-use, expiring password-reset tokens
(`docs/FSD.md` section 9) - no separate `password_reset_tokens` table is needed for the MVP.

**Deliberately out of scope for this migration:** a dedicated session/refresh-token table
(`docs/SAD.md` section 30's illustrative `identity.user_sessions`). `docs/SAD.md` section 37
explicitly leaves the authentication transport (cookies vs. JWT + refresh token) unresolved
("should be confirmed during implementation") - inventing that table's shape now would guess at an
undecided mechanism. It belongs to the Identity module's own implementation Story.

## 4. Business (`business` schema)

### `business.businesses`

| Column | Type | Nullable | Notes |
|---|---|---|---|
| id | uuid | no | PK |
| user_id | uuid | no | FK -> identity.users.id, `ON DELETE RESTRICT` |
| business_name | varchar(200) | no | |
| legal_name | varchar(200) | yes | |
| email | varchar(320) | yes | |
| phone | varchar(50) | yes | |
| website | varchar(300) | yes | |
| address_line1 | varchar(200) | yes | |
| address_line2 | varchar(200) | yes | |
| city | varchar(100) | yes | |
| state | varchar(100) | yes | |
| postal_code | varchar(20) | yes | |
| country | varchar(2) | no | ISO 3166-1 alpha-2 |
| registration_number | varchar(100) | yes | |
| tax_number | varchar(100) | yes | |
| default_currency | varchar(3) | no | ISO 4217 |
| default_tax_rate | decimal(9,4) | no | default 0 |
| tax_calculation_method | varchar(20) | no | `Exclusive` \| `Inclusive`, default `Exclusive` |
| invoice_prefix | varchar(20) | no | default `INV-` |
| next_invoice_number | integer | no | default 1 |
| invoice_number_padding | integer | no | default 4 |
| default_payment_terms | varchar(20) | no | `DueOnReceipt`\|`Net7`\|`Net14`\|`Net30`\|`Net60`\|`Net90`\|`Custom`, default `DueOnReceipt` |
| default_payment_terms_days | integer | yes | used when `default_payment_terms = Custom` |
| default_invoice_notes | text | yes | |
| default_terms_and_conditions | text | yes | |
| default_template_id | uuid | yes | FK -> document.templates.id, `ON DELETE SET NULL` |
| logo_url | varchar(500) | yes | |
| created_at | timestamptz | no | |
| updated_at | timestamptz | no | |

Index: `user_id`.

**Open decision, not enforced by a constraint:** whether a user may own more than one business.
`docs/FSD.md` section 7.1 only says registration creates "a default business profile"; nothing
states one-per-user is a hard rule. Left as a non-unique FK so it doesn't foreclose a future
multi-business feature; enforce uniqueness at the Application layer if product decides it's 1:1.

## 5. Customer (`customer` schema)

### `customer.customers`

| Column | Type | Nullable | Notes |
|---|---|---|---|
| id | uuid | no | PK |
| business_id | uuid | no | FK -> business.businesses.id, `ON DELETE RESTRICT` |
| business_name | varchar(200) | yes | the *customer's* business name (B2B) |
| contact_name | varchar(200) | yes | |
| email | varchar(320) | yes | |
| phone | varchar(50) | yes | |
| address_line1 | varchar(200) | yes | |
| address_line2 | varchar(200) | yes | |
| city | varchar(100) | yes | |
| state | varchar(100) | yes | |
| postal_code | varchar(20) | yes | |
| country | varchar(2) | yes | |
| tax_number | varchar(100) | yes | |
| notes | text | yes | |
| is_archived | boolean | no | default false |
| created_at | timestamptz | no | |
| updated_at | timestamptz | no | |

Index: `business_id`; `(business_id, is_archived)` for list queries.

## 6. Catalog (`catalog` schema)

### `catalog.items`

| Column | Type | Nullable | Notes |
|---|---|---|---|
| id | uuid | no | PK |
| business_id | uuid | no | FK -> business.businesses.id, `ON DELETE RESTRICT` |
| name | varchar(200) | no | |
| description | text | yes | |
| sku | varchar(100) | yes | |
| unit | varchar(50) | yes | |
| unit_price | decimal(19,4) | no | >= 0 |
| tax_rate | decimal(9,4) | yes | null = fall back to business default |
| is_archived | boolean | no | default false |
| created_at | timestamptz | no | |
| updated_at | timestamptz | no | |

Index: `business_id`.

## 7. Invoicing (`invoice` schema)

### `invoice.invoices`

| Column | Type | Nullable | Notes |
|---|---|---|---|
| id | uuid | no | PK |
| business_id | uuid | no | FK -> business.businesses.id, `ON DELETE RESTRICT` |
| customer_id | uuid | no | FK -> customer.customers.id, `ON DELETE RESTRICT` |
| invoice_number | varchar(50) | no | unique per business |
| status | varchar(20) | no | `Draft`\|`Sent`\|`Viewed`\|`PartiallyPaid`\|`Paid`\|`Overdue`\|`Cancelled` |
| issue_date | date | no | |
| due_date | date | no | |
| currency | varchar(3) | no | ISO 4217 |
| reference | varchar(100) | yes | |
| customer_snapshot | jsonb | no | captured at issue time |
| seller_snapshot | jsonb | no | captured at issue time |
| discount_type | varchar(20) | no | `None`\|`Percentage`\|`Fixed`, default `None` |
| discount_value | decimal(19,4) | yes | raw entered value; null when `discount_type = None` |
| subtotal | decimal(19,4) | no | |
| discount_amount | decimal(19,4) | no | default 0 |
| tax_amount | decimal(19,4) | no | default 0 |
| total_amount | decimal(19,4) | no | |
| amount_paid | decimal(19,4) | no | default 0 |
| amount_due | decimal(19,4) | no | |
| notes | text | yes | |
| terms | text | yes | |
| payment_instructions | text | yes | |
| template_id | uuid | yes | FK -> document.templates.id, `ON DELETE SET NULL` |
| template_settings | jsonb | yes | |
| is_deleted | boolean | no | default false - archival for non-Draft invoices (section 53) |
| deleted_at | timestamptz | yes | |
| created_at | timestamptz | no | |
| updated_at | timestamptz | no | |

Unique index: `(business_id, invoice_number)` - per `docs/FSD.md` section 65.
Indexes: `business_id`, `customer_id`, `status`, `due_date`, `is_deleted`.

### `invoice.invoice_items`

| Column | Type | Nullable | Notes |
|---|---|---|---|
| id | uuid | no | PK |
| invoice_id | uuid | no | FK -> invoice.invoices.id, `ON DELETE CASCADE` |
| source_item_id | uuid | yes | FK -> catalog.items.id, `ON DELETE SET NULL` |
| description | varchar(500) | no | |
| quantity | decimal(18,4) | no | > 0 |
| unit | varchar(50) | yes | |
| unit_price | decimal(19,4) | no | >= 0 |
| tax_rate | decimal(9,4) | no | default 0 |
| discount | decimal(19,4) | no | default 0 |
| line_subtotal | decimal(19,4) | no | |
| tax_amount | decimal(19,4) | no | |
| line_total | decimal(19,4) | no | |
| sort_order | integer | no | default 0 |

Index: `invoice_id`.

## 8. Payments (`payment` schema)

### `payment.payments`

| Column | Type | Nullable | Notes |
|---|---|---|---|
| id | uuid | no | PK |
| invoice_id | uuid | no | FK -> invoice.invoices.id, `ON DELETE CASCADE` |
| payment_date | date | no | |
| amount | decimal(19,4) | no | > 0 |
| payment_method | varchar(20) | no | `Cash`\|`BankTransfer`\|`Card`\|`PayPal`\|`Cheque`\|`Other` |
| reference | varchar(200) | yes | |
| notes | text | yes | |
| created_at | timestamptz | no | |
| created_by | uuid | no | FK -> identity.users.id, `ON DELETE RESTRICT` |

Index: `invoice_id`.

## 9. Documents (`document` schema)

### `document.templates`

| Column | Type | Nullable | Notes |
|---|---|---|---|
| id | uuid | no | PK |
| name | varchar(100) | no | |
| template_code | varchar(50) | no | unique |
| preview_image | varchar(500) | yes | |
| is_premium | boolean | no | default false |
| is_active | boolean | no | default true |
| sort_order | integer | no | default 0 |

Unique index: `template_code`.

**Reference data:** `docs/FSD.md` section 73 (Templates Page) and the `business.businesses
.default_template_id`/`invoice.invoices.template_id` foreign keys both assume at least one
template exists - the app has no usable "choose a template" step otherwise. Three free, MVP-ready
templates (`classic`, `modern`, `minimal`) are seeded via EF Core migration `HasData` (see section
12) rather than a runtime seeding routine, so seeding is tied to the migration history and is
idempotent by construction. Their `preview_image` is null - actual template rendering/preview
assets belong to the Documents module's own future implementation Story, not this schema Subtask.

### `document.generated_documents`

Per `docs/SAD.md` section 20 ("Generated file metadata", "Document versioning where required") and
the illustrative table name in section 30. Storage location is an opaque key - the actual
provider (local filesystem in dev, object storage later) stays behind an Infrastructure adapter
per `docs/SAD.md` section 71 Rule 6, never a schema concern.

| Column | Type | Nullable | Notes |
|---|---|---|---|
| id | uuid | no | PK |
| invoice_id | uuid | no | FK -> invoice.invoices.id, `ON DELETE CASCADE` |
| file_name | varchar(255) | no | |
| content_type | varchar(100) | no | default `application/pdf` |
| storage_key | varchar(500) | no | opaque reference into the storage adapter |
| size_in_bytes | bigint | yes | |
| generated_at | timestamptz | no | |
| generated_by_user_id | uuid | yes | FK -> identity.users.id, `ON DELETE SET NULL` |

Index: `invoice_id`.

## 10. Audit (`audit` schema)

### `audit.audit_logs`

| Column | Type | Nullable | Notes |
|---|---|---|---|
| id | uuid | no | PK |
| user_id | uuid | yes | FK -> identity.users.id, `ON DELETE SET NULL` |
| business_id | uuid | yes | FK -> business.businesses.id, `ON DELETE SET NULL` |
| entity_type | varchar(100) | no | |
| entity_id | uuid | yes | |
| action | varchar(100) | no | |
| metadata | jsonb | yes | |
| ip_address | varchar(45) | yes | supports IPv6 |
| timestamp | timestamptz | no | default `now()` |

Indexes: `(business_id, timestamp)`, `(entity_type, entity_id)`.

Audit logs are append-only; no `updated_at`, no delete path.

## 11. Foreign Key Delete Behaviour Summary

`RESTRICT` is the default wherever deleting the parent would silently orphan financial history;
`CASCADE` is used only for records that have no independent meaning without their parent
(invoice items, payments, generated documents belong entirely to one invoice); `SET NULL` is used
for optional, non-financial references (template choice, audit actor/business, generated-document
author, invoice-item's source catalog item).

## 12. Migration Ownership

Everything in this document is implemented as EF Core migrations owned by
`InvoiceApp.Infrastructure` (`docs/SAD.md` section 11: Entity Framework Core/PostgreSQL are
Infrastructure concerns), applied via `InvoiceApp.Api` as the startup/composition-root project.
Domain entities (plain POCOs, no EF/ASP.NET Core dependency) live in `InvoiceApp.Domain`, per the
example entity list in `docs/SAD.md` section 9, except `ApplicationUser` which is an Infrastructure
type as explained in section 3 above.

Fixed reference data (section 9's seeded templates) is seeded via `HasData` in the owning entity's
`IEntityTypeConfiguration<T>`, not a runtime seeding routine. `HasData` becomes part of the
migration itself (an `InsertData` operation), so seeding inherits the same idempotency and upgrade
guarantees as schema changes: applying it twice is a no-op because EF Core tracks which migrations
have already run in `__EFMigrationsHistory`, and there is no separate "has this been seeded"
check to keep in sync by hand.
