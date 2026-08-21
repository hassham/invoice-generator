# Agent Operating Guide

## Purpose

This file provides the stable operating context for any agent working in this repository. Read it before inspecting code or changing project state.

The live delivery backlog is managed in Jira. Requirements and architecture are maintained under `docs/`. The current local execution handoff is maintained in `backlog.md`.

## Required Start-Up Sequence

Before beginning work:

1. Read this file completely.
2. Read `backlog.md` for the last execution, current focus, next Jira issue and blockers.
3. Inspect the referenced Jira issue for its live status, parent, acceptance criteria and dependencies.
4. Read the relevant source documents and sections under `docs/`.
5. Inspect the current implementation and tests before proposing or making changes.

Do not assume `backlog.md` replaces Jira or that a local task identifier is a Jira key.

## Product Summary

This product is a SaaS invoice-generation and lightweight billing platform for freelancers, sole traders and small businesses. It prioritises fast invoice creation, professional output, simple language, mobile usability, international configuration and progressive value from anonymous visitor to registered user.

The product is not intended to become a full accounting platform.

## MVP Scope

The MVP includes:

- Public acquisition website
- Anonymous invoice creation and complete live preview
- Account-gated PDF download and printing
- Email/password and Google authentication
- Business profile and onboarding
- Invoice editor, calculations, templates and PDF generation
- Saved invoices and lifecycle management
- Reusable customers and product/service catalogue
- Payment recording and payment-derived invoice status
- Invoice history, search, filters and dashboard summaries
- Responsive, accessible, secure and observable operation

Explicit MVP exclusions include full accounting, payroll, general ledger, bank reconciliation, expense management, inventory management, BAS/tax return filing and complex approval workflows. Post-MVP capabilities must not be pulled into implementation without an approved Jira issue and requirements update.

## Critical Product Decisions

Agents must preserve these decisions unless the user explicitly changes the requirements and the source documents are updated:

- A visitor may create and fully preview an invoice without an account.
- PDF download and printing require registration or sign-in.
- Invoice fields, template choices and the pending Download/Print action must survive authentication.
- After authentication, the invoice is saved and the pending action completes automatically without another click.
- Safe retry must not create duplicate invoices.
- The backend is authoritative for validation, calculations, numbering, persistence, PDF generation, payment state and business rules.
- Frontend calculations exist for immediate UX only; the backend recalculates independently before saving or output.
- An invoice is a document snapshot. Later changes to business, customer or catalogue records must not silently alter historical invoices.
- Customer-facing hosted invoice pages must not require the invoice recipient to create an account when that post-MVP capability is implemented.

## Architecture Summary

The selected architecture is a modular monolith:

- Frontend: Next.js, React, TypeScript and Tailwind CSS
- Backend: ASP.NET Core/C# REST API under `/api/v1`
- Initial backend target: .NET 10, subject to the current supported production version at implementation time
- Persistence: PostgreSQL through infrastructure abstractions/Entity Framework Core
- Deployment: initially one backend deployment with one database and strong internal module boundaries
- Major backend modules: Identity, Businesses, Customers, Catalog, Invoicing, Payments and Documents
- Conceptual layers: API, Application, Domain and Infrastructure

Architecture rules:

- Domain code must not depend on ASP.NET Core, Entity Framework, PostgreSQL, HTTP or external providers.
- Application code coordinates use cases, authorization, validation and transactions through contracts.
- Infrastructure implements replaceable technical/provider concerns.
- API endpoints remain thin and contain minimal business logic.
- Module boundaries must not be bypassed for convenience.
- Authorization is enforced on the backend for every account/business-owned resource.

## Source-of-Truth Documents

Read only the portions relevant to the active Jira issue, but use this order when broader context is needed:

1. `docs/PRD.md` — product vision, users, principles, priorities and roadmap
2. `docs/FSD.md` — detailed functional behaviour, validation and acceptance criteria
3. `docs/SAD.md` — architecture, technology and engineering boundaries
4. `docs/EPICS.md` — local epic catalogue and recommended delivery sequence
5. `docs/STORIES.md` — local User Story catalogue
6. `docs/TASKS.md` — local implementation Subtask catalogue

When sources appear inconsistent:

1. Do not silently choose the easiest interpretation.
2. Check Jira for a later approved clarification.
3. Identify the conflicting sections and ask for a product decision if the conflict changes behaviour or scope.
4. Update all affected source documents after approval.

## Jira and Backlog Policy

Jira project: `IG` — Invoice Generator.

Jira is authoritative for:

- Backlog membership
- Issue hierarchy and dependencies
- Priority
- Assignment
- Workflow status
- Acceptance of work

Current hierarchy:

```text
Epic → Story → Subtask
```

Local catalogue IDs such as `S01` and `T001` support traceability but are not Jira issue keys. Use the Jira keys recorded in `backlog.md` or resolved from Jira.

Do not create, edit, transition, assign or comment on Jira issues unless the user has authorized that external change. When authorized, verify the exact target and preserve a mutation ledger so successful writes are never blindly repeated.

## Development Approach

- Work from the current Jira Subtask and its parent Story/Epic.
- Implement the smallest complete, testable slice that satisfies the issue.
- Inspect existing code and tests before designing new structures.
- Prefer module contracts and existing patterns over new cross-cutting abstractions.
- Keep business invariants in the Domain/Application boundary, not UI components or controllers.
- Treat security, authorization, validation, accessibility, failure states and observability as part of feature completion.
- Use database migrations for schema changes and preserve upgrade compatibility.
- Do not introduce a third-party provider or change a selected technology without an approved architecture decision.
- Do not implement post-MVP work incidentally.

## Definition of Done

Work is complete only when applicable conditions are satisfied:

- Jira acceptance criteria and Subtask completion criteria are met.
- Relevant automated tests or repeatable verification evidence exist.
- Builds and required checks pass.
- Backend authorization and account/business isolation are verified.
- Validation, error, loading and retry behaviour are covered.
- Responsive and accessibility behaviour is verified for affected UI.
- Logs exclude secrets, invoice contents and unnecessary personal data.
- Database changes include migrations and appropriate constraints/indexes.
- Affected documentation is updated.
- `backlog.md` is updated with the execution result and next handoff.
- Jira is updated only when authorized.

## Handoff and Maintenance Rules

`AGENTS.md` should remain stable. Update it only when enduring product, architecture or working rules change.

Update `backlog.md` after every meaningful execution that changes code, tests, documentation, delivery status or the recommended next task. Keep it concise and replace stale current-state information instead of appending an unbounded diary.

Every handoff must state:

- Current focus and exact Jira hierarchy
- What was completed in the last execution
- Files changed
- Verification performed and results
- Remaining work or blockers
- Exact next task
- Jira synchronization state and timestamp

