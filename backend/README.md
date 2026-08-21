# Backend

The backend is an ASP.NET Core modular monolith. `InvoiceApp.Api` is the composition root and deployment unit.

## Dependency direction

- `InvoiceApp.Domain` has no project dependencies.
- `InvoiceApp.Application` depends only on Domain.
- `InvoiceApp.Infrastructure` implements Application/Domain contracts.
- Business modules depend on Application and Domain, not on other modules.
- `InvoiceApp.Api` composes Infrastructure and the business modules.

The initial MVP modules are Identity, Businesses, Customers, Catalog, Invoicing, Payments, Documents and Audit.

## Architecture-boundary verification

`tests/InvoiceApp.ArchitectureTests` asserts the dependency direction above against the declared
`<ProjectReference>`/`<PackageReference>` elements of each project (not compiled-assembly metadata,
since an unused reference produces no AssemblyRef). It fails if a module references another module,
if anything outside Infrastructure references Infrastructure, or if Domain/Application take a
dependency on ASP.NET Core, Entity Framework Core, Npgsql or `System.Net.Http`. Run it with:

```
dotnet test backend/tests/InvoiceApp.ArchitectureTests/InvoiceApp.ArchitectureTests.csproj
```

`ProjectFile.cs` normalizes `\` to `/` before extracting a project name from a `ProjectReference`
path - `.csproj` files here use Windows-style backslashes, and `Path.GetFileNameWithoutExtension`
only treats `/` as a separator on non-Windows platforms. This passed on Windows and failed on
every project when CI (Ubuntu) first ran it under IG-80 - a concrete reason this suite is run in
CI on Linux, not only locally on Windows.

## Environment configuration

Infrastructure-owned settings are bound through the `Microsoft.Extensions.Options` pattern and
registered with `ValidateOnStart()`, so a missing required setting fails host startup immediately
with an actionable, non-sensitive message instead of failing later or silently defaulting. See
`InvoiceApp.Infrastructure/Configuration/InfrastructureConfigurationExtensions.cs`, wired in
`InvoiceApp.Api/Program.cs`. `ConnectionStrings:Default` (env var `ConnectionStrings__Default`) is
the first setting handled this way; new provider-specific option types (Storage, Email, Payments,
Authentication) should follow the same `Options` + `IValidateOptions<T>` pattern when their owning
modules are implemented. A local-only development connection string is committed in
`appsettings.Development.json`; Production/Test must supply a real value via environment
configuration, never a committed file.

## Secrets

`InvoiceApp.Api` has a `UserSecretsId`, so any real local secret should be set with
`dotnet user-secrets set "Section:Key" "value"` from `backend/src/InvoiceApp.Api` - ASP.NET Core
loads it automatically in Development and it overrides `appsettings.Development.json`, never
touching source control (verified: removing the connection string from
`appsettings.Development.json` and setting it only via user-secrets still started the app
successfully). The base `appsettings.json` (shipped to every environment, including Production)
must never define a secret-shaped section (`ConnectionStrings`, `Authentication`, `Storage`,
`Email`, `Payments`) - `InvoiceApp.Infrastructure.Tests.Configuration.SecretsHygieneTests` enforces
this automatically. Deployed environments must supply real secrets through hosting-environment
configuration (docs/SAD.md section 73), not a committed file.

## Database

The schema is designed in `docs/DATABASE_SCHEMA.md` and implemented as EF Core migrations owned by
`InvoiceApp.Infrastructure/Persistence` (`ApplicationDbContext`, entity configurations under
`Persistence/Configurations`, migrations under `Persistence/Migrations`). Domain entities are plain
POCOs in `InvoiceApp.Domain`; `ApplicationUser` (ASP.NET Core Identity) lives in Infrastructure
instead, since Identity is an authentication/infrastructure concern, not a Domain one.

Local Postgres, via Docker Compose (`infrastructure/docker/docker-compose.yml`):

```
docker compose -f infrastructure/docker/docker-compose.yml up -d
```

This binds Postgres to host port **5433**, not 5432, so it never collides with an unrelated
Postgres instance/container that might already be running on this machine.
`appsettings.Development.json`'s connection string already points at 5433.

Migration tooling requires the `dotnet-ef` global tool (`dotnet tool install --global dotnet-ef
--version 8.0.11`, matching the EF Core package version used here) and is always run with the Api
as the startup project, from `backend/`:

```
dotnet ef migrations add <Name> --project src/InvoiceApp.Infrastructure --startup-project src/InvoiceApp.Api --output-dir Persistence/Migrations
dotnet ef database update --project src/InvoiceApp.Infrastructure --startup-project src/InvoiceApp.Api
```

`ApplicationDbContextDesignTimeFactory` lets this work outside the running host by reading
configuration directly (appsettings + user secrets + environment variables) rather than through the
host's `ValidateOnStart()` pipeline, which design-time tooling doesn't run.

Tables/columns are `snake_case` (`EFCore.NamingConventions`'
`UseSnakeCaseNamingConvention()`), not the EF Core default of matching C# property names verbatim.

### Reference data / seeding

Fixed reference data (currently: the three built-in invoice templates in `document.templates` -
`docs/DATABASE_SCHEMA.md` section 9) is seeded via `HasData` in the owning
`IEntityTypeConfiguration<T>`, which becomes an `InsertData` operation in a migration rather than a
separate runtime seeding routine. This was verified to be a genuine, idempotent upgrade, not just a
single-shot create: dropped the database, applied only `InitialCreate` (0 template rows), applied
`SeedTemplates` on top (3 rows, matching `docs/DATABASE_SCHEMA.md`), then reran `dotnet ef database
update` again - EF Core reported "already up to date" and the row count stayed at 3 (no duplicate
reference data).

## CI

`.github/workflows/ci.yml` (GitHub Actions) runs on every push/PR to `main`. Each job orders its
steps so a quality-gate failure stops the job before the artifact-producing step ever runs -
`dotnet test`/`npm run lint` come before `dotnet publish`/`next build`'s artifact upload:

- `backend`: restore -> build -> **test** -> publish `InvoiceApp.Api` -> upload `backend-api`.
- `frontend`: install -> **lint** -> build (`next build`, which also type-checks) -> upload
  `frontend-build`.

Verified both directions for real, not just written and assumed correct: a genuine backend test
failure (a real cross-platform bug in `ProjectFile.cs`, caught by this very pipeline - see
"Architecture-boundary verification" above) produced a run where `Test` failed and `Publish
Api`/the artifact upload were skipped entirely; after fixing it, the same run type passed cleanly
with both artifacts produced. Example runs:
<https://github.com/hassham/invoice-generator/actions/runs/32450591579> (blocked, as intended) and
<https://github.com/hassham/invoice-generator/actions/runs/32450714431> (green).

`main` has branch protection requiring both `Backend build` and `Frontend build` to pass (and be
up to date with `main`) before a PR can merge, and disallows force-pushes/deletion of `main`. This
is a GitHub repository setting (`gh api repos/hassham/invoice-generator/branches/main/protection`),
not something the workflow YAML itself can express. `enforce_admins` is off and no PR-review count
is required, so the existing direct-push workflow (used throughout this project's early
development) still works - only *merging a PR* into `main` is actually gated by the checks.

## Health checks

`GET /health/live` and `GET /health/ready` (`docs/SAD.md` section 80) are unversioned - not under
`/api/v1` - since health checks are infrastructure-level, not part of the public API surface.

- `/health/live`: process is running. No dependency checks (`Predicate = _ => false` in
  `Program.cs`) - a database outage must never make liveness probes think the process itself needs
  restarting.
- `/health/ready`: dependencies required to serve requests. Currently one check, `database`
  (`InvoiceApp.Infrastructure/HealthChecks/DatabaseHealthCheck.cs`), tagged `"ready"`.

Both return JSON (`{"status": "...", "checks": [{"name": "...", "status": "..."}]}`) with exactly
three possible per-check/overall statuses - `Healthy`, `Degraded`, `Unhealthy` - satisfying IG-81's
completion criteria. The response writer (`HealthCheckResponseWriter.cs`) deliberately serializes
only check name and status, never `HealthReportEntry.Description`/`Exception`, so a failure can
never leak a connection string or other sensitive detail even if some future check's own
description text isn't as careful.

`DatabaseHealthCheck` calls `Database.CanConnectAsync()` and classifies the result:
`Unhealthy` if it throws or returns false, `Degraded` if it succeeds but takes longer than 500ms,
else `Healthy`. The decision logic (`Evaluate`) is a pure static method, unit-tested directly in
`InvoiceApp.Infrastructure.Tests.HealthChecks.DatabaseHealthCheckTests` without needing a real
database connection.

All three states were also verified against the real local Postgres container, not only unit
tests: `/health/ready` returned `Degraded` on the very first request after the app started (cold
connection-pool latency exceeded 500ms) and `Healthy` on every request after that; stopping the
container (`docker stop invoiceapp-postgres`) made it return `Unhealthy` with HTTP 503, while
`/health/live` stayed `Healthy` with HTTP 200 throughout - confirming liveness is genuinely
independent of dependency health, not just structurally separate in the code.

## Error diagnostics

Per `docs/SAD.md` sections 76-78 (structured `ILogger` logging, log fields, correlation IDs) and
81 (central exception handling, no stack traces to the client):

- `CorrelationIdMiddleware` (`InvoiceApp.Api/Diagnostics`) uses `HttpContext.TraceIdentifier`
  (already unique per request) as the correlation ID rather than inventing a second one. It's
  echoed in the `X-Correlation-Id` response header and wraps the rest of the pipeline in a logging
  scope (`logger.BeginScope("CorrelationId:{CorrelationId}", ...)`) so every log statement made
  while handling the request - including `GlobalExceptionHandler`'s own - carries it.
- `GlobalExceptionHandler` (`IExceptionHandler`, registered via `AddExceptionHandler`/
  `UseExceptionHandler`) maps typed `InvoiceApp.Application.Exceptions` types to HTTP status codes:
  `ValidationException`→400, `NotFoundException`→404, `ConflictException`→409, anything else→500.
  The full exception is always logged server-side; the client response only ever gets the message
  from a *known, typed* exception (written to be client-safe by the code that throws it) or, for
  anything unexpected, a generic message with **no** detail at all - so an internal exception's
  message (which could contain a connection string or other implementation detail) can never reach
  the client, regardless of what that message says.

**Middleware order matters and was gotten wrong once, then fixed and verified**:
`CorrelationIdMiddleware` must be registered *before* `UseExceptionHandler()`, not after. Both
orders let `UseExceptionHandler` catch downstream exceptions either way, but only this order keeps
the correlation logging scope active while `GlobalExceptionHandler` itself logs - with the other
order, an exception unwinds past (and disposes) the scope before the handler runs, so its own log
entry silently loses the `CorrelationId` enrichment every other log statement gets. Confirmed by
running the app and checking actual console log output before and after reordering, not by
reasoning about it in the abstract.

Verified against the running app for all three mapped cases plus one deliberately "sensitive"
message, using temporary endpoints removed before committing:
`{"title":"Validation failed.","status":400,"detail":"Email is required.","correlationId":"..."}`,
a matching 404/409 shape, and for an `InvalidOperationException("Host=db.internal;Password=...")`:
`{"title":"An unexpected error occurred.","status":500,"correlationId":"..."}` - no `detail` field
at all on the client response, while the server console log for that same request showed the full
exception (including the connection-like message) tagged with the identical `CorrelationId`,
confirming a caller can report the ID and an operator can find the real cause in logs without the
client ever seeing it.
