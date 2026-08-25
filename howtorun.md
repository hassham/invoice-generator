# How to Run

Instructions for running the Invoice App locally for manual smoke testing — backend API and
frontend, separately (they aren't wired together yet; see "Current limitations" below).

## Prerequisites

Already installed and verified in this environment:

- .NET SDK 8.0.300
- `dotnet-ef` global tool 8.0.11 (`dotnet tool install --global dotnet-ef --version 8.0.11` if missing)
- Docker Desktop (for local Postgres)
- Node.js 24.x, npm 11.x

## 1. Start the database

```
docker compose -f infrastructure/docker/docker-compose.yml up -d
```

Binds Postgres to host port **5433**, not 5432 — deliberate, so it never collides with an
unrelated project's Postgres container that might already be running on this machine.
`appsettings.Development.json` already points at 5433, so no extra configuration is needed.

Check it's up:

```
docker ps --filter "name=invoiceapp-postgres"
```

## 2. Apply database migrations

From `backend/`:

```
dotnet ef database update --project src/InvoiceApp.Infrastructure --startup-project src/InvoiceApp.Api
```

Only needs re-running after a new migration is added; safe to re-run any time (idempotent).

## 3. Run the backend API

From `backend/`:

```
dotnet run --project src/InvoiceApp.Api
```

Starts on **http://localhost:5094** (`ASPNETCORE_ENVIRONMENT=Development`, set automatically via
`Properties/launchSettings.json`). The terminal will print the actual bound URL — use that if it
differs.

A browser tab may auto-open to `http://localhost:5094/swagger` — **ignore the 404 there**,
Swagger/OpenAPI isn't wired up in `Program.cs` yet; that's a stale default from the project
template, not a bug. Use the health checks or `curl` below instead.

### Check it's alive

```
curl http://localhost:5094/health/live
curl http://localhost:5094/health/ready
```

Both return JSON like `{"status":"Healthy","checks":[...]}`. `/health/ready` may show `Degraded`
on the very first request after startup (cold DB connection-pool latency) — that's expected, not
a failure; it settles to `Healthy` on subsequent requests.

### Smoke-test the auth API

All auth endpoints are under `/api/v1/auth`. Session is a cookie, so use `curl`'s cookie jar
(`-c`/`-b`) to carry it between requests:

```
# Register (also signs you in — cookie is saved to cookies.txt)
curl -i -c cookies.txt -X POST http://localhost:5094/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"smoke@example.com","password":"Password1","confirmPassword":"Password1","name":"Smoke Test"}'

# Who am I (should be 200, with your account details)
curl -i -b cookies.txt http://localhost:5094/api/v1/auth/me

# Log out
curl -i -b cookies.txt -X POST http://localhost:5094/api/v1/auth/logout

# /me again (should now be 401, with a "session has expired" message body)
curl -i -b cookies.txt http://localhost:5094/api/v1/auth/me

# Log back in
curl -i -c cookies.txt -X POST http://localhost:5094/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"smoke@example.com","password":"Password1","rememberMe":false}'

# Delete the account (requires current password as confirmation)
curl -i -b cookies.txt -X DELETE http://localhost:5094/api/v1/auth/account \
  -H "Content-Type: application/json" \
  -d '{"currentPassword":"Password1"}'

# /me again (should now be 401 — account is deleted)
curl -i -b cookies.txt http://localhost:5094/api/v1/auth/me

# Logging back in with the same credentials should now fail (401, generic "incorrect email or
# password" message — a deleted account's state is never revealed)
curl -i -X POST http://localhost:5094/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"smoke@example.com","password":"Password1","rememberMe":false}'
```

Registering/logging in more than 10 times within 60 seconds from the same client will start
returning `429 Too Many Requests` (rate limiting) — expected, not a bug; wait a minute or use a
different email if you hit it while testing repeatedly.

### Smoke-test password recovery

Real email delivery isn't wired up yet — by deliberate choice (see `backlog.md`), so this can be
smoke-tested locally without any provider account. Instead, the reset token is written straight to
the **backend's own console/log output** as a plain `Password reset requested for ... Dev-only
reset token (never emailed - log stub only): <token>` line. Watch that terminal after the first
curl below.

```
# Register a fresh account to test against (or reuse one from above)
curl -i -c cookies.txt -X POST http://localhost:5094/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"reset-smoke@example.com","password":"Password1","confirmPassword":"Password1","name":"Reset Smoke"}'

# Request a reset — always 200, whether or not the email exists (does not leak account existence)
curl -i -X POST http://localhost:5094/api/v1/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"reset-smoke@example.com"}'

curl -i -X POST http://localhost:5094/api/v1/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"someone-who-does-not-exist@example.com"}'
```

Now copy the token from the backend's terminal output (the long string after "log stub only): ")
and complete the reset — replace `<TOKEN>` below with it exactly (it may contain `/` and `+`
characters, so paste it as-is inside the quotes):

```
curl -i -X POST http://localhost:5094/api/v1/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{"email":"reset-smoke@example.com","token":"<TOKEN>","newPassword":"NewPassword1","confirmPassword":"NewPassword1"}'

# Old password should now be rejected
curl -i -X POST http://localhost:5094/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"reset-smoke@example.com","password":"Password1","rememberMe":false}'

# New password should work
curl -i -X POST http://localhost:5094/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"reset-smoke@example.com","password":"NewPassword1","rememberMe":false}'

# Reusing the same token again should now fail — it's single-use
curl -i -X POST http://localhost:5094/api/v1/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{"email":"reset-smoke@example.com","token":"<TOKEN>","newPassword":"AnotherPassword1","confirmPassword":"AnotherPassword1"}'
```

Reset tokens expire after 1 hour — no need to test that manually, it's covered by automated tests.

### Smoke-test Google sign-in

Requires the Google Cloud OAuth Client ID/Secret to already be set locally (`dotnet user-secrets`,
`Authentication:Google:ClientId`/`ClientSecret` — see `backend/README.md`'s Secrets section). This
one needs a real browser, not `curl`, since it involves an actual Google consent screen:

1. With the backend running, open **http://localhost:5094/api/v1/auth/google/login** in a browser.
2. You should land on a real Google sign-in/consent screen. Sign in and approve.
3. Google redirects back to the app, which redirects to its own callback and returns a JSON body
   with your new account's `userId`/`email`/`name` — confirms the full round trip worked
   (challenge → Google → token exchange → account created-or-linked → session started).
4. Copy the session cookie the browser now holds (dev tools → Application/Storage → Cookies) into
   a `curl -b` call to `http://localhost:5094/api/v1/auth/me`, or just note that a real account
   now exists — check via `docker exec -it invoiceapp-postgres psql -U invoiceapp -d invoiceapp -c
   'select email, status from identity.users;'`.
5. Repeat step 1 with the **same** Google account — should sign you into the **same** account
   (not create a second one) and return the same `userId`.

If you cancel on Google's consent screen instead of approving, you should land back on
`/api/v1/auth/google/callback?error=remote_failure` with a clean 400 JSON error, not a raw
crash/500.

## 4. Run the frontend

From `frontend/`:

```
npm install
npm run dev
```

Starts on **http://localhost:3000**, or the next free port if 3000 is already taken by another
project on this machine — check the terminal output for the actual port it picked.

Open the printed URL in a browser to see the landing page.

## Current limitations (expected, not bugs)

- **No login/signup pages exist in the frontend yet** — `/login`, `/signup` and `/invoice/create`
  are linked from the landing page but not implemented; only the auth *API* (above) exists so far.
  The frontend and backend aren't wired together yet. There's no "Sign in with Google" button
  anywhere either — only the backend endpoint (`/api/v1/auth/google/login`), tested by opening it
  directly in a browser as described above.
- **Swagger/OpenAPI isn't configured** — use `curl`/Postman/the browser directly against the API.

## Stopping everything

```
docker compose -f infrastructure/docker/docker-compose.yml down
```

(Add `-v` to also delete the database volume, if you want a completely clean slate next time.)
Stop the backend/frontend dev servers with Ctrl+C in their terminals.
