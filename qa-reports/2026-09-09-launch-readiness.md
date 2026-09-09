# Launch Readiness Report — 2026-09-09

## Summary

Completes `IG-72` ("Meet operational performance and release quality targets", S60), the final Story in the MVP backlog. Verifies the FSD's performance targets (section 125) under representative conditions, confirms monitoring/diagnostics support detecting launch-critical failures (section 124), summarizes the automated test coverage backing every Story's acceptance criteria, and documents known release blockers and accepted residual risks.

No fixes were needed to meet the performance targets themselves — every measurement below cleared its target with a wide margin. Two small monitoring gaps were found and fixed (see "Monitoring and diagnostics").

## Performance verification (FSD section 125)

Measured against a running backend (`dotnet run`, Debug configuration — a real deployment would be faster still under Release) and a **production** frontend build (`next build && next start`; dev-mode timings are not representative and were deliberately not used for this check).

| Target (FSD §125) | Measured | Result |
|---|---|---|
| API common endpoints: <500ms | GET /invoices, /customers, /items, /dashboard/summary, /business: **7–40ms** steady-state (5 reps each, near-empty account). POST /invoices (create): **20–28ms** steady-state, 376ms on the very first call (JIT warm-up). | Comfortably within target |
| API endpoints at representative scale | Re-measured GET /invoices (default page, `pageSize=100`, and `?search=`) and GET /dashboard/summary against a seeded account with **150 invoices across 30 customers**: all remained **9–25ms**, no meaningful degradation vs. the near-empty baseline. | Comfortably within target |
| PDF generation: <3 seconds | **726ms** on the first call (QuestPDF/font-metrics initialization), **~11ms** on subsequent calls. Confirmed each response was a genuine rendered PDF (`%PDF-1.4` header, ~47KB), not a fast error path. | Comfortably within target |
| Dashboard initial render: <2 seconds | **174ms** (production build, fresh navigation to the point real content — not the "Loading dashboard…" placeholder — is visible), against an account seeded with 15 invoices. | Comfortably within target |
| Invoice editor: preview reflects changes "near instantly" | **64ms** from typing a line item's unit price to the live preview showing the updated total. Structural reason this holds: the preview renders from the same lifted React state the form writes to (confirmed in code, `IG-36`) — no network round-trip is ever in the path between a keystroke and the preview updating. | Near-instant, confirmed both by measurement and by why it's structurally true |

All five targets are met with substantial margin (in most cases 10–100x). No performance remediation was necessary this Story.

## Monitoring and diagnostics (FSD section 124)

| Requirement | Status |
|---|---|
| API health | `/health/live` (process liveness, no dependency checks) and `/health/ready` (dependency checks, currently database connectivity) already existed (`IG-82`) — both verified live, both return `Healthy`. |
| Database connectivity | Covered by `/health/ready`'s `DatabaseHealthCheck`. Verified live. |
| Error rate | `GlobalExceptionHandler` logs every failed request (400/401/404/409/500) with status code, method, path, and — since `IG-70` — the acting user's id, all inside a correlation-id-scoped log entry. An external log aggregator can compute error rate per endpoint/status/user from this today. |
| PDF generation success / Login success-failure trends | **Gap found and fixed**: nothing previously logged *successful* requests at all, only failures — so there was no way to compute a success/failure ratio or trend for anything, including the two cases FSD names explicitly. Added ASP.NET Core's built-in `HttpLogging` middleware, configured to log only `RequestMethod`, `RequestPath`, `ResponseStatusCode` and `Duration` for every request (deliberately excluding headers/bodies/cookies, which the framework's own defaults would otherwise include — those would have leaked the session cookie and the register/login endpoints' own password fields straight into the log, violating FSD section 123's "do not log passwords/sensitive credentials"). Verified live: confirmed log lines appear for every request with exactly those four fields and nothing else, correctly nested inside the existing correlation-id scope. |
| Storage | Business logo storage failures (disk write errors, etc.) would surface as unhandled exceptions today, caught and logged the same as any other 500 by `GlobalExceptionHandler`. No dedicated storage health check exists (the app has no cloud storage dependency to check — logo storage is local disk under the API's own content root, which is available whenever the process itself is). Considered sufficient for this MVP's single-server deployment model; revisit if cloud object storage is ever introduced. |

## Test coverage backing launch-critical acceptance criteria

- **Backend**: 306 tests (14 architecture + 133 infrastructure + 159 API-pipeline), covering every Story's own AC at the real HTTP level where applicable — auth/ownership, validation, cross-account rejection, calculation correctness, payment status transitions, rate limiting, and (this Story's own audit, `IG-70`) unsafe-input handling.
- **Frontend**: 552 tests across 71 files, covering component behavior, client-side validation/calculation, and keyboard/focus-management fixes made during `IG-69`.
- Every Epic in the MVP backlog (`IG-1` through `IG-12`) has at least one Story with dedicated test coverage; there is no Epic whose only verification is manual/anecdotal.
- This coverage is exercised on every push via the repository's CI workflow (`.github/workflows/ci.yml`), not just locally.

## Known release blockers and accepted residual risks

**Open bugs (filed in Jira, not yet fixed):**

- [IG-194](https://appitometechnologies.atlassian.net/browse/IG-194) — Issue Date/Due Date silently cleared if a header field is edited before the page-load date-default effect commits (stale-closure race in `CreateInvoiceEditor.tsx`). Small, well-understood, not yet fixed.
- [IG-195](https://appitometechnologies.atlassian.net/browse/IG-195) — No UI entry point for password reset, despite a fully working backend.
- [IG-196](https://appitometechnologies.atlassian.net/browse/IG-196) — No UI entry point for Google sign-in; its callback also has nowhere to redirect back to.
- [IG-197](https://appitometechnologies.atlassian.net/browse/IG-197) — The Invoice Detail Page has no Download PDF action, despite FSD section 49 explicitly requiring one there.

None of these block the *performance/security/accessibility* readiness this Story verifies — they're feature-completeness gaps in already-"Done" Stories, tracked separately. Whether they block an actual launch decision is a product call for the user, not this report.

**Accepted residual risks / environmental limitations (verified only as far as this sandboxed environment allows):**

- **No real mobile device or Safari testing.** `IG-68` verified Chromium, Firefox and WebKit (a proxy for Safari's engine) at three viewport sizes, but no physical iOS/Android device and no real macOS Safari were reachable in this environment. Recommend a manual pass on at least one real iOS and one real Android device before launch, given FSD section 126 names them explicitly.
- **No screen-reader verification.** `IG-69` relied on axe-core (automated, 0 violations) plus manual keyboard-only testing (which found and fixed 2 real bugs) — no screen-reader automation was available to confirm actual announced output, only that the ARIA roles/labels/live-regions a screen reader depends on are present and correctly used.
- **Rate-limit policy sharing.** `IG-71` put PDF generation on the same IP-partitioned rate-limit bucket as register/login/password-reset (by design — see `RateLimitingOptions`' own doc comment). A client that exhausts the auth quota also loses PDF-generation ability for the rest of that window, and vice versa. Accepted as a reasonable small-business-scale tradeoff rather than building a second policy/config section for one endpoint; revisit if usage patterns show this coupling causing real false-positive throttling.
- **Load/concurrency testing was not performed at this pass.** The performance numbers above are single-request timings, not a load test under concurrent traffic. `IG-46`'s own concurrency test (30 simultaneous invoice-number allocations, zero duplicates) is the one place in this codebase genuine concurrency has been verified; general concurrent-load behavior under many simultaneous users has not been measured.

## Recommendation

Every FSD-specified performance target is met with wide margin, and the monitoring gap found (no success-side logging) is now fixed. Recommend proceeding with `IG-72` as Done; the 4 open bugs above and the residual risks are launch-decision inputs for the user, not blockers to this Story's own completion criteria.
