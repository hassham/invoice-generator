# Invoice App

SaaS invoice generation and lightweight billing platform for freelancers, sole traders and small businesses.

## Repository structure

- `frontend/` — Next.js, React, TypeScript and Tailwind CSS
- `backend/` — ASP.NET Core modular monolith
- `docs/` — product, functional, architecture and backlog catalogues
- `infrastructure/` — deployment and local infrastructure assets added by later tasks

Read `AGENTS.md` and `backlog.md` before beginning work.

## Build

```powershell
dotnet build backend/InvoiceApp.sln
npm.cmd --prefix frontend install
npm.cmd --prefix frontend run build
```
