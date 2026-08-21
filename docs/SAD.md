# Solution Architecture Document

## 1. Document Purpose

This Solution Architecture Document defines the technical architecture for the Online Invoice Generator & Billing Platform.

The architecture is intentionally designed around the following constraints:

- Initial infrastructure cost should be as close to zero as practical.
- The application architecture should not need to be redesigned when usage grows.
- The solution must remain platform agnostic.
- The backend must be deployable to providers supporting standard Docker containers.
- The application should initially remain operationally simple.
- Microservices are explicitly avoided at this stage.
- Business functionality should remain modular enough to allow selective extraction later if genuinely required.
- PostgreSQL will be used as the primary relational database.
- External infrastructure providers must be hidden behind application abstractions.

The selected architecture is:

> **Containerised ASP.NET Core Modular Monolith + PostgreSQL + Next.js frontend**

---

# 2. Architectural Goals

The architecture must provide:

### Low Initial Cost

The application must be capable of running on free-tier or very-low-cost infrastructure during product validation.

### Platform Independence

The application must not depend directly on:

- Azure-specific application services
- AWS-specific runtime services
- Netlify-specific backend functions
- Supabase-specific SDK behaviour
- Firebase-specific architecture
- Render-specific APIs
- Vendor-specific serverless runtimes

Cloud services may be used through infrastructure adapters.

---

### Scalability

The application should support progression from:

```text
1 Application Instance
```

to:

```text
Multiple Application Instances
```

without architectural redesign.

---

### Maintainability

Business capabilities must be separated into logical modules.

---

### Simplicity

The system will remain one backend deployable until scale or organisational complexity provides a clear reason to separate components.

---

### Testability

Business rules should remain independent from:

- Web controllers
- Database implementation
- Hosting platform
- Email provider
- Payment provider
- File storage provider

---

# 3. Architecture Decision

## 3.1 Architecture Style

Selected:

**Modular Monolith**

Not selected:

- Traditional layered monolith with unrestricted cross-module access
- Microservices
- Serverless-first architecture
- Event-driven distributed architecture
- Backend-as-a-Service architecture

---

# 4. Why Modular Monolith

A modular monolith provides the operational simplicity of a monolithic application while retaining strong internal boundaries.

The complete backend is initially deployed as:

```text
InvoiceApp.Api
```

but internally consists of independent business modules.

Benefits:

- Single deployment
- Single repository
- Single database
- Simple local development
- Simple debugging
- Minimal DevOps
- No distributed transactions
- No network calls between modules
- No service discovery
- No message broker required initially
- Lower infrastructure cost
- Easier testing

At the same time, modular boundaries make future extraction possible.

---

# 5. High-Level Architecture

```text
                         Internet
                            │
                            │ HTTPS
                            ▼
                ┌────────────────────────┐
                │       Frontend         │
                │                        │
                │ Next.js + TypeScript   │
                │                        │
                │ Responsive Web App     │
                └────────────┬───────────┘
                             │
                             │ REST/HTTPS
                             ▼
             ┌─────────────────────────────────┐
             │       ASP.NET Core Backend      │
             │                                 │
             │        Modular Monolith         │
             │                                 │
             │ ┌─────────────────────────────┐ │
             │ │ Identity                    │ │
             │ ├─────────────────────────────┤ │
             │ │ Businesses                  │ │
             │ ├─────────────────────────────┤ │
             │ │ Customers                   │ │
             │ ├─────────────────────────────┤ │
             │ │ Catalog                     │ │
             │ ├─────────────────────────────┤ │
             │ │ Invoicing                   │ │
             │ ├─────────────────────────────┤ │
             │ │ Payments                    │ │
             │ ├─────────────────────────────┤ │
             │ │ Documents                   │ │
             │ ├─────────────────────────────┤ │
             │ │ Notifications               │ │
             │ ├─────────────────────────────┤ │
             │ │ Reporting                   │ │
             │ └─────────────────────────────┘ │
             │                                 │
             │ Application / Domain / Infra    │
             └──────────────┬──────────────────┘
                            │
                            │ EF Core / Npgsql
                            ▼
                 ┌─────────────────────────┐
                 │       PostgreSQL        │
                 │                         │
                 │ Single Logical DB       │
                 └─────────────────────────┘
```

External providers:

```text
ASP.NET Core
     │
     ├──────── File Storage
     │
     ├──────── Email Provider
     │
     ├──────── Payment Provider
     │
     └──────── OAuth Providers
```

All external providers must be accessed through abstractions.

---

# 6. Technology Stack

## Frontend

### Framework

Next.js

### Language

TypeScript

### UI

React

### Styling

Tailwind CSS

### Responsibilities

- UI rendering
- Form handling
- Live invoice preview
- Client-side validation
- Local application state
- Calling backend APIs
- Responsive behaviour
- SEO landing pages

---

# 7. Backend

## Framework

ASP.NET Core

Target:

Current supported .NET LTS/current production version at implementation time.

Initial anticipated target:

.NET 10

---

## Language

C#

---

## API

RESTful HTTP API.

Base route:

```text
/api/v1
```

---

## API Documentation

OpenAPI.

Swagger UI may be enabled in:

- Development
- Test

Production Swagger access should be configurable.

---

# 8. Backend Architectural Layers

The backend uses four major conceptual layers:

```text
API
 │
 ▼
Application
 │
 ▼
Domain
 ▲
 │
Infrastructure
```

---

# 9. Domain Layer

The Domain layer contains:

- Entities
- Value Objects
- Domain Rules
- Domain Services
- Domain Events
- Business invariants
- Domain-specific exceptions

It must not depend on:

- Entity Framework
- ASP.NET Core
- PostgreSQL
- HTTP
- Stripe
- AWS
- Azure
- Email providers
- File storage systems

Example entities:

```text
Business
Customer
CatalogItem
Invoice
InvoiceItem
Payment
```

---

# 10. Application Layer

The Application layer coordinates use cases.

Examples:

```text
CreateInvoice
UpdateInvoice
DuplicateInvoice
RecordPayment
CreateCustomer
ArchiveCustomer
GenerateInvoicePdf
```

Responsibilities:

- Use-case orchestration
- Validation
- Authorisation coordination
- Transactions
- Module contracts
- Repository interfaces
- Integration interfaces

The Application layer should not know which infrastructure provider is used.

---

# 11. Infrastructure Layer

Infrastructure implements technical concerns.

Examples:

```text
Entity Framework Core
PostgreSQL
File Storage
Email
PDF generation
Stripe
Authentication infrastructure
Logging
```

Interfaces should be defined in appropriate application/module contracts.

Implementations remain replaceable.

---

# 12. API Layer

Responsibilities:

- HTTP endpoints
- Authentication
- Request parsing
- Input model validation
- Application command/query dispatch
- HTTP responses
- Exception mapping

Controllers/endpoints should contain minimal business logic.

---

# 13. Backend Module Structure

Recommended business modules:

```text
Identity
Businesses
Customers
Catalog
Invoicing
Payments
Documents
Notifications
Reporting
Subscriptions
Audit
```

Some modules will remain dormant until needed.

---

# 14. Identity Module

Responsibilities:

- User registration
- Login
- Logout
- Password management
- Email verification
- Authentication
- Account lifecycle
- External OAuth identities
- Refresh/session management

Initial implementation:

ASP.NET Core Identity.

---

# 15. Businesses Module

Responsibilities:

- Business profile
- Business settings
- Country
- Currency
- Tax settings
- Invoice defaults
- Branding
- Logo metadata
- Invoice numbering configuration

---

# 16. Customers Module

Responsibilities:

- Customer records
- Contact information
- Billing addresses
- Customer search
- Customer archive
- Customer history references

---

# 17. Catalog Module

Responsibilities:

- Products
- Services
- SKU
- Description
- Pricing
- Default units
- Default tax rates
- Archived items

---

# 18. Invoicing Module

The Invoicing module is the central domain module.

Responsibilities:

- Invoice creation
- Invoice editing
- Invoice items
- Calculations
- Tax
- Discounts
- Invoice numbering
- Invoice lifecycle
- Invoice snapshots
- Duplication
- Cancellation
- Status calculation
- Outstanding balance

---

# 19. Payments Module

Responsibilities:

- Manual payments
- Partial payments
- Payment allocation
- Payment references
- Payment method
- Integration with online payments later

The module must not directly depend on Stripe-specific models.

---

# 20. Documents Module

Responsibilities:

- Invoice templates
- PDF generation
- Document rendering
- Generated file metadata
- Document versioning where required

Initial design should allow PDFs to be regenerated from invoice snapshots.

---

# 21. Notifications Module

Future-capable module.

Responsibilities:

- Email invoice
- Payment reminder
- Payment confirmation
- Recurring invoice notification
- System emails

Provider-specific details remain in Infrastructure.

---

# 22. Reporting Module

Responsibilities:

- Revenue summaries
- Paid amount
- Outstanding amount
- Overdue invoices
- Customer reporting
- Tax summaries

Reporting initially queries the same PostgreSQL database.

A separate analytics system is not required.

---

# 23. Subscriptions Module

Future module.

Responsibilities:

- Free/Pro plans
- Subscription state
- Feature entitlements
- Trial periods
- Billing-provider references

Stripe-specific subscription logic should be isolated behind interfaces.

---

# 24. Audit Module

Responsibilities:

Track significant application actions.

Examples:

- Invoice created
- Invoice updated
- Invoice cancelled
- Payment created
- Payment deleted
- Customer archived
- Business configuration changed

---

# 25. Solution Structure

Recommended repository:

```text
/
├── frontend/
│
│   ├── src/
│   ├── public/
│   ├── tests/
│   ├── package.json
│   └── Dockerfile
│
├── backend/
│
│   ├── src/
│   │
│   ├── tests/
│   │
│   ├── InvoiceApp.sln
│   └── Dockerfile
│
├── infrastructure/
│
│   ├── docker/
│   └── scripts/
│
├── docs/
│
│   ├── PRD.md
│   ├── FSD.md
│   ├── SAD.md
│   └── DATABASE_SCHEMA.md
│
└── README.md
```

---

# 26. Recommended Backend Project Structure

```text
backend/src/

InvoiceApp.Api

InvoiceApp.Domain

InvoiceApp.Application

InvoiceApp.Infrastructure

InvoiceApp.Modules.Identity

InvoiceApp.Modules.Businesses

InvoiceApp.Modules.Customers

InvoiceApp.Modules.Catalog

InvoiceApp.Modules.Invoicing

InvoiceApp.Modules.Payments

InvoiceApp.Modules.Documents

InvoiceApp.Modules.Notifications

InvoiceApp.Modules.Reporting

InvoiceApp.Modules.Subscriptions

InvoiceApp.Modules.Audit
```

Avoid creating excessive projects simply for architectural purity.

If the number of assemblies becomes cumbersome, some modules may be organised as folders/namespaces while retaining strict dependency rules.

The modular boundary matters more than the number of `.csproj` files.

---

# 27. Module Communication

Modules should communicate using explicit contracts.

Example:

Invoicing requires customer information.

Incorrect:

```text
Invoicing
   │
   ▼
Direct query against Customers tables
```

Preferred:

```text
Invoicing
   │
   ▼
Customer Application Contract
   │
   ▼
Customers Module
```

Example interface:

```csharp
public interface ICustomerLookup
{
    Task<CustomerSnapshot?> GetSnapshotAsync(
        Guid customerId,
        CancellationToken cancellationToken);
}
```

This protects module boundaries.

---

# 28. Avoid Shared-Domain Anti-Pattern

Do not create a large `Common` project containing arbitrary business logic.

Shared components should be limited to genuinely cross-cutting primitives.

Examples:

```text
Result<T>
Money
Pagination
DomainEvent
Clock abstraction
UserContext
```

Customer or invoice business rules must remain within their respective modules.

---

# 29. Database Architecture

Selected:

PostgreSQL.

One database will be used initially.

---

# 30. Database Organisation

Recommended:

Use PostgreSQL schemas to represent logical module ownership.

Example:

```text
identity

business

customer

catalog

invoice

payment

document

subscription

audit
```

Tables:

```text
identity.users
identity.user_sessions

business.businesses

customer.customers

catalog.items

invoice.invoices
invoice.invoice_items

payment.payments

document.generated_documents

subscription.subscriptions

audit.audit_logs
```

---

# 31. Why Single Database

Benefits:

- Simple transactions
- Simple deployment
- Lower infrastructure cost
- No distributed data consistency
- Easier reporting
- Easy backup
- Strong relational integrity

Separate databases are unnecessary for the current product.

---

# 32. Database Migration Strategy

Entity Framework Core migrations.

Requirements:

- Migrations stored in source control.
- Migrations run as controlled deployment operation.
- Production schema should not use automatic destructive migration.
- Data migrations must be independently reviewed.

---

# 33. Database IDs

Recommended primary identifier:

UUID / `Guid`.

Reasons:

- Harder to enumerate publicly
- Suitable across distributed deployment later
- No dependence on sequential database-generated identifiers

Where internal sequential IDs improve performance, they may be added separately.

---

# 34. Monetary Values

All monetary values must use decimal data types.

Never use:

```text
float
double
```

for money.

Recommended:

```text
decimal(19,4)
```

Database precision should be finalised in DATABASE_SCHEMA.md.

---

# 35. Invoice Snapshots

Invoice data must be historically stable.

When an invoice is created, capture:

- Seller snapshot
- Customer snapshot
- Invoice-item snapshots
- Tax configuration
- Template selection
- Payment instructions

Changing a customer or business later must not alter previously issued invoices.

---

# 36. Authentication Architecture

Initial authentication:

ASP.NET Core Identity.

Stored in PostgreSQL.

Architecture:

```text
Browser
   │
   ▼
ASP.NET Core
   │
   ▼
ASP.NET Core Identity
   │
   ▼
PostgreSQL
```

---

# 37. Authentication Method

Preferred for browser application:

Secure HTTP-only authentication cookies.

Alternative:

Short-lived JWT + secure refresh token.

For a browser-only first-party frontend, secure cookies are preferred because they reduce token exposure in JavaScript.

The final authentication transport should be confirmed during implementation based on frontend/backend domain topology.

---

# 38. OAuth

Future providers:

- Google
- Microsoft
- Apple

OAuth integrations should attach external identities to internal application users.

The external identity provider must not become the core user data source.

---

# 39. Authorisation

Authorisation must always be enforced on the backend.

Every business-owned record includes a business/user ownership relationship.

Example:

```text
User A
  │
  └── Business A
        │
        ├── Customers
        ├── Items
        └── Invoices
```

User A cannot access Business B data even if the database identifier is known.

---

# 40. Multi-Business Capability

Although the initial product may support only one business per user, the schema should support:

```text
User
  │
  ├── Business A
  ├── Business B
  └── Business C
```

Do not hard-code:

```text
UserId → exactly one business
```

This prevents a substantial future schema change.

---

# 41. Multi-Tenancy Model

Selected:

Shared application.

Shared database.

Shared schema structure.

Tenant isolation through:

```text
BusinessId
```

This is sufficient for the intended SaaS scale.

Dedicated tenant databases are not required.

---

# 42. File Storage Architecture

Application code must never directly depend on S3, Azure Blob or another provider.

Interface:

```csharp
public interface IFileStorage
{
    Task<FileReference> SaveAsync(
        Stream stream,
        string contentType,
        CancellationToken cancellationToken);

    Task<Stream> OpenReadAsync(
        string fileId,
        CancellationToken cancellationToken);

    Task DeleteAsync(
        string fileId,
        CancellationToken cancellationToken);
}
```

---

# 43. Storage Implementations

Potential implementations:

```text
LocalFileStorage
S3FileStorage
CloudflareR2FileStorage
AzureBlobFileStorage
```

Initial provider can be selected based on free-tier availability.

No domain/application logic should change when provider changes.

---

# 44. What Should Be Stored

Initial storage requirements:

- Business logos
- Template assets
- Optional generated PDFs

Invoice business data remains in PostgreSQL.

---

# 45. PDF Architecture

PDF generation is hidden behind:

```csharp
public interface IPdfGenerator
{
    Task<byte[]> GenerateInvoiceAsync(
        InvoiceDocument document,
        CancellationToken cancellationToken);
}
```

---

# 46. PDF Rendering Strategy

Preferred:

```text
Invoice Data
     │
     ▼
HTML Template
     │
     ▼
PDF Renderer
     │
     ▼
PDF
```

Potential implementation:

Playwright/Chromium.

Benefits:

- HTML/CSS reused with web templates
- High-quality layout
- Good print control
- Easy template development

However, PDF implementation remains replaceable.

---

# 47. PDF Scalability

Initially:

```text
API
 │
 └── PDF Generation
```

Later, if PDF generation consumes substantial CPU:

```text
API
 │
 ▼
Job Queue
 │
 ▼
PDF Worker
```

This is an extraction of infrastructure workload, not a redesign of the invoicing domain.

---

# 48. Email Architecture

Interface:

```csharp
public interface IEmailSender
{
    Task SendAsync(
        EmailMessage message,
        CancellationToken cancellationToken);
}
```

Potential implementations:

```text
Amazon SES
Postmark
Resend
SendGrid
SMTP
```

No application business rule should contain provider-specific logic.

---

# 49. Payment Architecture

Interface:

```csharp
public interface IPaymentGateway
{
    Task<PaymentSession> CreatePaymentSessionAsync(...);

    Task<PaymentStatus> GetPaymentAsync(...);

    Task HandleWebhookAsync(...);
}
```

Initial future implementation:

Stripe.

Core payment entities remain provider independent.

---

# 50. Frontend Architecture

Recommended structure:

```text
frontend/src/

app/
components/
features/
services/
hooks/
lib/
types/
styles/
```

Feature folders:

```text
features/

auth/
business/
customers/
catalog/
invoices/
payments/
templates/
settings/
```

---

# 51. Frontend-to-Backend Contract

Frontend communicates exclusively through documented APIs.

Frontend must not directly connect to PostgreSQL.

Architecture:

```text
Next.js
   │
   ▼
ASP.NET Core API
   │
   ▼
PostgreSQL
```

This preserves business-rule enforcement and platform independence.

---

# 52. API Design

Use REST.

Example resources:

```text
/api/v1/invoices
/api/v1/customers
/api/v1/items
/api/v1/payments
/api/v1/businesses
/api/v1/templates
```

---

# 53. Versioning

API must be versioned from initial release.

Example:

```text
/api/v1/
```

Breaking changes may later introduce:

```text
/api/v2/
```

---

# 54. API Error Format

Use RFC 7807 Problem Details.

Example:

```json
{
  "type": "validation_error",
  "title": "Invoice validation failed",
  "status": 400,
  "errors": {
    "customerName": [
      "Customer name is required."
    ]
  }
}
```

---

# 55. Validation

Use:

- Client validation for UX
- Backend validation for authority
- Domain validation for invariants

The frontend must never be trusted as the source of business correctness.

---

# 56. Invoice Calculation Authority

Frontend calculates totals for live preview.

Backend recalculates independently.

Example:

```text
Frontend
   │
   ├── Immediate preview
   │
   ▼
API
   │
   ├── Recalculate
   ├── Validate
   └── Save authoritative values
```

This prevents manipulated totals.

---

# 57. Transaction Handling

Database transactions should be used for operations requiring consistency.

Example:

Creating invoice:

```text
Generate invoice number
       +
Create invoice
       +
Create invoice items
       +
Write audit record
```

These should succeed or fail together where appropriate.

---

# 58. Invoice Number Generation

Invoice numbers must remain unique per business.

A concurrency-safe approach is required.

Do not implement:

```text
SELECT MAX(invoice_number) + 1
```

without proper locking.

The database schema should support atomic number generation.

Exact implementation will be defined in DATABASE_SCHEMA.md.

---

# 59. Background Processing

Initially use ASP.NET Core Hosted Services only where genuinely necessary.

Potential jobs:

- Invoice overdue processing
- Recurring invoices
- Reminder processing
- Cleanup tasks

---

# 60. Important Hosting Constraint

Multiple web instances running the same background service can execute the same job multiple times.

Therefore scheduled processing must eventually use:

- database-backed distributed locking
- job leasing
- or a dedicated worker mode

Initial implementation should anticipate this.

---

# 61. Recommended Background Job Evolution

Stage 1:

```text
Single API Instance

API
 ├── HTTP
 └── Background Jobs
```

Stage 2:

```text
Multiple API Instances
       │
       ▼
Database-backed Job Coordination
```

Stage 3:

```text
API Containers
      │
      ▼
Queue
      │
      ▼
Worker Containers
```

Business logic remains unchanged.

---

# 62. Caching

No distributed cache initially.

Use in-memory caching for safe, non-critical reference data such as:

- template metadata
- currency lists

Avoid storing:

- sessions
- payment state
- critical invoice state

in local memory.

---

# 63. Future Cache

If required:

```text
Redis
```

can later be added behind abstractions.

Examples:

- distributed caching
- rate limits
- ephemeral locks

Redis is not part of MVP architecture infrastructure.

---

# 64. Stateless Backend Requirement

The API must remain stateless between requests.

Do not depend on:

- local process memory for user sessions
- local filesystem for permanent files
- sticky sessions

This allows horizontal scaling.

---

# 65. Horizontal Scaling

Initial:

```text
              API #1
                │
                ▼
            PostgreSQL
```

Scale:

```text
             Load Balancer
                   │
      ┌────────────┼────────────┐
      ▼            ▼            ▼
    API #1       API #2       API #3
      │            │            │
      └────────────┼────────────┘
                   ▼
              PostgreSQL
```

No application architecture change is required.

---

# 66. Containerisation

Backend must include a Dockerfile.

Example architecture:

```text
Source
   │
   ▼
Docker Build
   │
   ▼
Immutable Image
   │
   ├── Render
   ├── Koyeb
   ├── Azure
   ├── AWS
   ├── Google Cloud
   ├── Kubernetes
   └── VPS
```

---

# 67. Configuration

Use environment variables and standard .NET configuration.

Examples:

```text
ConnectionStrings__Default

Authentication__Google__ClientId

Storage__Provider

Email__Provider

Payments__Provider
```

No production secrets committed into repository.

---

# 68. Environment Configuration

Required environments:

```text
Development
Test
Production
```

Optional:

```text
Staging
```

Environment differences should be configuration only.

---

# 69. Local Development

Recommended:

Docker Compose.

Local environment:

```text
Frontend
Backend
PostgreSQL
```

Optional developer services can be mocked.

Example:

```text
Email → Local/Mailpit
Storage → Local filesystem
Payments → Stripe test mode
```

---

# 70. Suggested Docker Compose

```text
docker compose up
```

starts:

```text
invoice-web
invoice-api
postgres
```

This prevents developers from needing cloud infrastructure for normal development.

---

# 71. Platform Agnosticism Rules

The following rules are mandatory.

### Rule 1

No cloud SDK references inside Domain or Application layers.

### Rule 2

No business logic inside cloud functions.

### Rule 3

No direct database access from frontend.

### Rule 4

No permanent file storage on application container filesystem.

### Rule 5

No infrastructure provider IDs used as primary domain identifiers.

### Rule 6

All external services use interfaces/adapters.

### Rule 7

Application must build and run through Docker independently of hosting provider.

---

# 72. Security Architecture

Requirements:

- HTTPS only
- Secure headers
- HTTP-only authentication cookies where applicable
- CSRF protection
- Rate limiting
- Input validation
- Output encoding
- SQL injection prevention
- File validation
- Secure password hashing
- Least-privilege database access
- Secure secrets management
- Tenant isolation
- Audit logging

---

# 73. Secrets

Secrets must be provided through hosting environment secret configuration.

Examples:

```text
Database password
OAuth secrets
Stripe keys
Email API keys
Storage credentials
```

Never commit `.env` production files.

---

# 74. Database Security

Production application database user should not have unnecessary administrative permissions.

Use separate credentials for:

- migrations/deployment
- runtime application

when practical.

---

# 75. File Security

Logo uploads must validate:

- content type
- extension
- file signature
- maximum size

File names must not be trusted.

Generate internal storage keys.

---

# 76. Logging

Use structured logging.

Recommended abstraction:

Microsoft `ILogger`.

Potential provider later:

- Seq
- Application Insights
- Datadog
- OpenTelemetry backend
- Grafana/Loki

Application code should not depend directly on these platforms.

---

# 77. Log Fields

Where appropriate:

```text
Timestamp
Level
CorrelationId
UserId
BusinessId
RequestPath
EntityId
Event
Duration
```

Do not log:

- passwords
- authentication tokens
- complete bank details
- payment card data
- secrets

---

# 78. Correlation IDs

Each request should have a correlation identifier.

This should propagate through:

```text
Request
Application operation
Logging
External provider calls
```

Useful for debugging production issues.

---

# 79. Observability

Initial monitoring:

- Application health
- HTTP error rate
- API response time
- database connectivity
- PDF errors

Later:

OpenTelemetry.

This allows switching observability providers.

---

# 80. Health Checks

Backend endpoints:

```text
/health/live
/health/ready
```

Liveness:

Application running.

Readiness:

Dependencies required to serve requests are available.

---

# 81. Error Handling

Central exception middleware.

Map:

```text
ValidationException        → 400
Unauthenticated            → 401
Forbidden                  → 403
NotFound                   → 404
Conflict                   → 409
Unexpected                 → 500
```

Do not expose internal stack traces in production.

---

# 82. Testing Architecture

Required levels:

### Unit Tests

Business calculations and domain rules.

### Application Tests

Use-case behaviour.

### Integration Tests

PostgreSQL + EF Core.

### API Tests

HTTP endpoint behaviour.

### Frontend Tests

Important UI logic.

### End-to-End Tests

Critical workflows.

---

# 83. Critical Automated Test Areas

Highest priority:

- Invoice calculation
- Tax calculations
- Invoice numbering
- Partial payments
- Payment status
- Tenant isolation
- Invoice snapshots
- Duplicate invoice
- Authentication
- Authorisation

---

# 84. Database Integration Testing

Prefer testing against real PostgreSQL, not an incompatible in-memory provider.

Use containerised PostgreSQL for integration tests where practical.

---

# 85. CI/CD

Source control:

GitHub.

Recommended pipeline:

```text
Commit / Pull Request
       │
       ▼
Restore Dependencies
       │
       ▼
Build
       │
       ▼
Unit Tests
       │
       ▼
Integration Tests
       │
       ▼
Frontend Tests
       │
       ▼
Docker Build
       │
       ▼
Deploy
```

Hosting provider should consume standard Docker images/artifacts.

---

# 86. Deployment Architecture — Initial

The architecture does not require these exact providers, but the initial deployment may use free tiers.

Example:

```text
                    Cloudflare DNS
                          │
            ┌─────────────┴─────────────┐
            │                           │
            ▼                           ▼
     Frontend Hosting              API Hosting
      Free Tier                     Free Tier
            │                           │
        Next.js                     Docker
                                        │
                                        ▼
                                  PostgreSQL
                                   Free Tier
```

Possible providers:

Frontend:

- Netlify
- Cloudflare Pages
- Vercel
- Static/container hosting

Backend:

- Render
- Koyeb
- any Docker-compatible platform

Database:

- Neon
- Supabase PostgreSQL
- any hosted PostgreSQL

These are deployment choices, not architecture dependencies.

---

# 87. Deployment Architecture — Growth

When usage increases:

```text
                   CDN / DNS
                      │
         ┌────────────┴────────────┐
         ▼                         ▼
      Frontend                Load Balancer
                                   │
                    ┌──────────────┼──────────────┐
                    ▼              ▼              ▼
                 API #1         API #2         API #3
                    │              │              │
                    └──────────────┼──────────────┘
                                   │
                                   ▼
                           Managed PostgreSQL
                                   │
                         ┌─────────┴─────────┐
                         ▼                   ▼
                    File Storage       Optional Queue
```

The backend remains the same modular monolith.

---

# 88. Deployment Architecture — High Scale

Only when justified:

```text
                        CDN
                         │
                         ▼
                    Load Balancer
                         │
              ┌──────────┼──────────┐
              ▼          ▼          ▼
            API        API        API
              │          │          │
              └──────────┼──────────┘
                         │
               ┌─────────┴─────────┐
               ▼                   ▼
          PostgreSQL            Queue
                                    │
                         ┌──────────┴──────────┐
                         ▼                     ▼
                    PDF Worker           Email Worker
```

Still no requirement to decompose the core application into microservices.

---

# 89. When Microservices Would Be Considered

Microservices should only be considered if one or more conditions appear:

- Independent teams own different domains.
- A module has dramatically different scaling requirements.
- Deployment independence becomes necessary.
- A module requires different technology.
- Reliability boundaries justify separate processes.
- Monolith deployment has become an organisational bottleneck.

User count alone is not sufficient reason.

---

# 90. Potential Future Extraction

Most likely candidates:

### PDF Generation

CPU-intensive.

### Notifications

Background workload.

### Recurring Invoice Processing

Scheduled workload.

### Analytics

Read-heavy.

These can be extracted without changing core invoice APIs if module contracts are maintained.

---

# 91. Feature Flags

Feature flags should be supported for future functionality.

Examples:

```text
OnlinePayments
RecurringInvoices
PremiumTemplates
MultipleBusinesses
EmailSending
```

Initial implementation can be configuration/database driven.

A specialised feature-flag provider is unnecessary initially.

---

# 92. Soft Deletion

Recommended for business records such as:

- Customers
- Catalog items
- Sent invoices where deletion is inappropriate

Use explicit statuses or archive flags where business semantics are clearer.

Do not apply soft-delete globally without domain reason.

---

# 93. Concurrency

Optimistic concurrency should be supported for sensitive mutable entities.

Example:

Invoice edited simultaneously in multiple tabs.

Possible implementation:

PostgreSQL concurrency token / version field.

Detailed design belongs in DATABASE_SCHEMA.md.

---

# 94. Idempotency

Operations that can be retried or triggered externally should support idempotency where appropriate.

Important future examples:

- Stripe webhooks
- recurring invoice generation
- payment events
- email jobs

---

# 95. Date and Time

System timestamps:

UTC.

Business date values such as:

```text
IssueDate
DueDate
PaymentDate
```

must be treated as business dates and not accidentally shifted by timezone conversion.

Business profile stores timezone.

---

# 96. Internationalisation

Frontend strings should eventually support resource-based localisation.

Database should not embed English-only assumptions in core model.

Architecture must support:

- multiple currencies
- different tax labels
- different registration labels
- multiple date formats
- multiple locales

---

# 97. Currency

Invoices use one currency.

Currency should be stored as ISO 4217 currency code.

Example:

```text
AUD
USD
EUR
GBP
```

Do not infer currency purely from symbol.

---

# 98. Tax Architecture

Tax configuration must remain flexible enough for:

- GST
- VAT
- Sales Tax
- no tax

Tax calculations belong to invoicing/domain logic.

Avoid coupling the entire product to Australian GST rules even if Australia is the first target market.

---

# 99. Template Architecture

Templates should have stable identifiers.

An invoice should capture sufficient template/version metadata so later changes to the global template do not unexpectedly corrupt historical rendering.

Long-term approach:

```text
Template
Template Version
Invoice → Template Version
```

The initial implementation may simplify this while preserving an upgrade path.

---

# 100. Data Export

Architecture should support future user data export.

Potential formats:

```text
CSV
JSON
PDF archive
```

Data export should be handled at application level and not rely on direct DB access by the frontend.

---

# 101. Backup Strategy

Production PostgreSQL provider should support backup capability once users begin storing important data.

During the initial free-tier phase:

- verify provider retention behaviour
- avoid using temporary databases for real user data
- establish manual export capability if necessary

Once paying customers exist:

automated backups become mandatory.

---

# 102. Disaster Recovery

Initial recovery requirement:

- database restore
- redeploy Docker image
- restore environment configuration
- reconnect storage

Because application containers are stateless, servers themselves do not require backup.

---

# 103. Data Portability

To maintain platform independence:

PostgreSQL remains the source of relational truth.

Use standard SQL-compatible data types where practical.

Avoid provider-specific database extensions unless justified.

---

# 104. Development Principles

The implementation should follow:

- SOLID where it improves maintainability
- Dependency inversion
- Explicit module boundaries
- Domain-focused naming
- Small application use cases
- Testable business rules
- Infrastructure adapters

Avoid:

- excessive abstractions
- generic repository overengineering
- event-sourcing without need
- CQRS everywhere
- microservice-style complexity inside the monolith

---

# 105. CQRS Decision

Full CQRS architecture is not required.

Commands and queries may be logically separated where useful.

Example:

```text
CreateInvoiceCommand

GetInvoiceQuery
```

but separate read/write databases are not required.

---

# 106. Mediator Pattern

A mediator library may be used, but the architecture must not depend on one.

Use only if it improves organisation.

Avoid creating unnecessary indirection for simple application calls.

---

# 107. Repository Pattern

Repositories should exist where they protect domain/application logic from persistence details.

Do not wrap every EF Core capability in generic repositories merely because of architectural convention.

Module-specific repositories are preferred.

Example:

```csharp
IInvoiceRepository
```

rather than:

```csharp
IGenericRepository<T>
```

everywhere.

---

# 108. Domain Events

Domain events may be used for internal decoupling.

Example:

```text
InvoicePaid
```

can trigger:

```text
Audit
Notification
Analytics
```

Initial handling occurs in-process.

Future external messaging can be added if required.

---

# 109. Transactional Outbox

Not required for initial MVP.

If external asynchronous messaging is introduced later, add an Outbox pattern to ensure reliable event publication.

---

# 110. Search

Initial search should use PostgreSQL.

Examples:

- invoice number
- customer name
- customer email
- reference

Do not introduce Elasticsearch/OpenSearch initially.

PostgreSQL indexes and search capabilities will be sufficient.

---

# 111. Reporting

Initial reports should query PostgreSQL.

Do not create a separate data warehouse.

If reporting eventually becomes expensive:

```text
Primary PostgreSQL
      │
      ▼
Read Replica / Analytics Store
```

can be introduced later.

---

# 112. Rate Limiting

Backend should support rate limiting.

Higher priority endpoints:

- login
- registration
- password reset
- authenticated PDF generation, including post-registration conversion requests
- future email send
- future public invoice lookup

Rate-limit policy should be configurable.

---

# 113. API Security

APIs should not expose internal database implementation details.

Use DTOs.

Example:

Do not return complete EF Core entities directly.

---

# 114. CORS

Configure explicit allowed frontend origins.

Do not use unrestricted:

```text
AllowAnyOrigin
```

in production with credentialed requests.

---

# 115. Domain Names

Recommended separation:

```text
www.example.com
app.example.com
api.example.com
```

Possible initial simplification:

```text
example.com
api.example.com
```

Architecture should not rely on one specific hostname.

---

# 116. Initial MVP Modules

Although the architecture includes future module boundaries, MVP implementation should focus on:

```text
Identity
Businesses
Customers
Catalog
Invoicing
Documents
Payments
Audit
```

Notifications and subscriptions can initially remain minimal or unimplemented.

---

# 117. Architecture Evolution Strategy

## Stage 1 — Validation

```text
1 Frontend
1 API container
1 PostgreSQL database
```

Keep cost minimal.

---

## Stage 2 — Early Traction

```text
Frontend CDN
1–2 API containers
Managed PostgreSQL
Object storage
```

No code redesign.

---

## Stage 3 — Growth

```text
Multiple API containers
Load balancer
Larger PostgreSQL
Backups
Object storage
Monitoring
```

---

## Stage 4 — Significant Scale

Potential:

```text
Queue
Worker containers
Read replicas
Redis
CDN optimisation
```

These are additions.

Core architecture remains intact.

---

# 118. Architectural Constraints

The following decisions are locked unless there is a significant technical reason to revisit them.

### ARC-001

Backend architecture is Modular Monolith.

### ARC-002

Backend technology is ASP.NET Core.

### ARC-003

Frontend technology is Next.js + TypeScript.

### ARC-004

Primary database is PostgreSQL.

### ARC-005

Entity Framework Core is the primary ORM.

### ARC-006

Deployment packaging is Docker.

### ARC-007

Application backend remains stateless.

### ARC-008

External infrastructure is accessed through abstractions.

### ARC-009

Cloud-provider-specific business logic is prohibited.

### ARC-010

One relational database is used initially.

### ARC-011

Multi-tenancy uses BusinessId-based logical isolation.

### ARC-012

Microservices are out of scope unless clear scaling/organisational evidence justifies extraction.

---

# 119. Architecture Decision Records

Important decisions should be tracked through ADRs.

Recommended initial ADRs:

```text
ADR-001 Modular Monolith

ADR-002 PostgreSQL

ADR-003 ASP.NET Core

ADR-004 Next.js Frontend

ADR-005 Docker Deployment

ADR-006 ASP.NET Identity

ADR-007 HTML-Based PDF Generation

ADR-008 Shared Database Multi-Tenancy

ADR-009 Provider Abstraction Strategy
```

---

# 120. Key Risks

## Free-Tier Runtime Constraints

Free API platforms may:

- sleep
- impose CPU limits
- restrict memory
- impose request limits

Mitigation:

Standard Docker deployment allows provider migration without application redesign.

---

## PDF Resource Consumption

Browser rendering can consume substantial CPU/memory.

Mitigation:

Keep PDF generator abstracted and extract into worker process if required.

---

## Free Database Limitations

Free PostgreSQL providers may restrict:

- storage
- compute
- backup retention
- connection count

Mitigation:

Use standard PostgreSQL and EF Core so migration is straightforward.

---

## Modular Boundary Erosion

Over time developers may directly access other modules' tables/services.

Mitigation:

- architecture tests
- code review
- explicit module contracts
- namespace/project boundaries

---

## Background Job Duplication

Scaling API containers can cause duplicate scheduled processing.

Mitigation:

Use database locks/job leases before horizontally scaling scheduled jobs.

---

# 121. Architecture Testing

Add automated architecture tests where useful.

Examples:

- Domain cannot reference Infrastructure.
- Modules cannot directly reference restricted modules.
- API cannot contain persistence logic.
- Infrastructure provider code remains outside Application/Domain.

Libraries such as NetArchTest or equivalent may be considered.

---

# 122. Definition of Architecture Done

Architecture implementation is considered established when:

- Backend runs locally from Docker.
- Frontend runs independently.
- PostgreSQL runs independently.
- API does not depend on hosting provider.
- EF Core migrations work.
- Authentication works.
- Business tenancy isolation exists.
- Module boundaries are established.
- Storage uses abstraction.
- PDF uses abstraction.
- Logging is structured.
- Health checks exist.
- CI builds and tests containers.
- Application can be deployed to any standard Docker-capable platform.

---

# 123. Final Architecture Summary

The Invoice Platform will use:

```text
Frontend
─────────────────────────
Next.js
React
TypeScript
Tailwind CSS


Backend
─────────────────────────
ASP.NET Core
C#
REST API
Modular Monolith
Stateless Container


Persistence
─────────────────────────
PostgreSQL
Entity Framework Core


Authentication
─────────────────────────
ASP.NET Core Identity


Infrastructure
─────────────────────────
Docker
Provider-independent configuration


External Capabilities
─────────────────────────
IFileStorage
IPdfGenerator
IEmailSender
IPaymentGateway


Initial Deployment
─────────────────────────
Free-tier frontend hosting
Free-tier Docker hosting
Free-tier PostgreSQL


Scale Strategy
─────────────────────────
Increase container count
Increase database capacity
Add object storage
Add workers
Add queue/cache only when justified
```

The central architectural principle is:

> **The hosting platform is replaceable infrastructure. The application architecture is not tied to it.**

This allows the same codebase to begin on free-tier infrastructure and later move to paid Render, Azure, AWS, Google Cloud, Kubernetes or another container platform without redesigning the core system.

The application should remain a modular monolith for as long as that model continues to meet operational and organisational requirements.
