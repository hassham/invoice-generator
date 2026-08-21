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

`.github/workflows/ci.yml` (GitHub Actions) restores, builds and publishes `InvoiceApp.Api` on
every push/PR to `main`, uploading the publish output as a workflow artifact (`backend-api`). It
does not run tests or gate merges - that's a separate concern (IG-80/T008) layered onto the same
jobs, not a second workflow. A live example run:
<https://github.com/hassham/invoice-generator/actions/runs/32449842002>.
