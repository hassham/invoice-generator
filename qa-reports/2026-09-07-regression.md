# Regression Test Report — 2026-09-07

**Scope:** Full-depth regression across all Epics with built functionality (`IG-1` through the Done parts of `IG-9`).
**Method:** Automated suites (backend xUnit, frontend Vitest) as a baseline, plus four real-browser regression scripts (Playwright, against the actual dev servers and Postgres — not mocks) covering integration paths the automated suites can't exercise together. Scripts were written, debugged, and discarded after use; they are not part of the repo.

## Summary

**Automated suites:** Backend 277/277 (confirmed via CI run [34095200551](https://github.com/hassham/invoice-generator/actions/runs/34095200551) on the current commit — a local re-run was skipped since the backend dev server needed for the browser pass was holding a file lock). Frontend 539/539, lint clean, production build clean.

**Real-browser regression:** 49/50 scripted checks passed across 4 scenario scripts (core authenticated journey, anonymous flow + auth edge cases, saved-invoice lifecycle, account deletion + console-error sweep). The 1 failure is a confirmed pre-existing gap, not a new regression (see below).

**Bugs found:** 1 real, reproducible bug (confirmed 3/3, root-caused to an exact line).
**Gaps found:** 2 pre-existing, already-documented UI gaps (not regressions — the code's own comments already flagged them as deliberate follow-ups, never done).
**False alarms:** several test-script bugs along the way (wrong locators, timing assumptions, a field-name typo) — traced to root cause and confirmed as script issues, not app issues, before being ruled out. Listed briefly at the end for transparency.

## Results by area

| Area (Epic) | Scenario | Result |
|---|---|---|
| IG-2 Public site | Landing page loads | PASS |
| IG-3 Auth | Register → onboarding redirect | PASS |
| IG-3 Auth | Duplicate email registration → safe generic error | PASS |
| IG-3 Auth | Invalid login → safe generic error | PASS |
| IG-3 Auth | Logout → session cleared, protected routes reject | PASS |
| IG-3 Auth | Password reset (request → dev-stub token → reset → new password works → old password rejected) | PASS (full backend round trip) |
| IG-3 Auth | Password reset UI entry point | **FAIL — confirmed gap, see Findings #2** |
| IG-3 Auth | Google sign-in redirect shape (real `accounts.google.com` redirect, correct client_id) | PASS |
| IG-3 Auth | Google sign-in UI entry point / callback landing | **Gap, see Findings #3** (not separately scripted — confirmed by code read) |
| IG-3 Auth | Account deletion (API) → session invalidated → cannot log back in | PASS |
| IG-3 Auth | Auth rate limiting | PASS — confirmed *working* (my own rapid test traffic tripped it) |
| IG-4 Anonymous | Anonymous invoice creation, draft persists across reload | PASS |
| IG-4 Anonymous | Download PDF gate modal appears for anonymous visitor | PASS |
| IG-4 Anonymous | Signup-from-gate returns to editor (not onboarding), invoice data preserved | PASS |
| IG-5 Editor | Header/party/line-item fields, totals | PASS |
| IG-5 Editor | Issue Date/Due Date default to today | **FAIL — real bug, see Findings #1** |
| IG-6 Templates/PDF | Template selector switches selection | PASS |
| IG-6 Templates/PDF | Download PDF produces a real file | PASS |
| IG-7 Persistence | Save (authenticated) | PASS |
| IG-7 Persistence | Invoice appears in list; search filters correctly | PASS |
| IG-7 Persistence | View/edit saved invoice | PASS |
| IG-7 Persistence | Duplicate saved invoice | PASS |
| IG-7 Persistence | Cancel invoice, status reflected in list | PASS |
| IG-8 Onboarding/Profile | Onboarding wizard (all steps, skip, logo upload) | PASS (re-verified) |
| IG-8 Onboarding/Profile | Business settings edit | PASS |
| IG-9 Catalogue | Customer create, picker-fills-Bill-To, archive, excluded from picker once archived | PASS |
| IG-9 Catalogue | Item create, picker-fills-line-fields, duplicate, archive, excluded from default list | PASS |
| IG-10 Dashboard | New invoice appears in dashboard's recent list | PASS |
| Cross-cutting | Console-error sweep across 9 authenticated pages | PASS (0 unexpected errors) |

## Findings

### 1. Bug — Issue Date/Due Date silently cleared if a header field is edited immediately on page load ([IG-194](https://appitometechnologies.atlassian.net/browse/IG-194))

**Severity:** Medium. Confusing (validation blames fields the user never touched), affects both anonymous and authenticated invoice creation, but the window is narrow.

**Reproduction (3/3):**
1. Load `/invoice/create` fresh.
2. Immediately (no delay) fill in "Invoice Number" (or "Reference / Purchase Order").
3. Observe: "Issue Date" and "Due Date" — which should default to today's date — are empty.
4. Click "Save", "Download PDF", or "Print": validation fails with "Issue Date is required." / "Due Date is required.", even though the user never touched those fields.

**Root cause:** `frontend/app/invoice/create/components/CreateInvoiceEditor.tsx:427-433`

```tsx
const handleHeaderChange = (name: string, value: string) => {
  const nextHeader: FieldValues = { ...draft.header, [name]: value };
  setDraft((current) => ({ ...current, header: nextHeader }));
  ...
};
```

`nextHeader` is computed by spreading `draft.header` from the render-scope closure, not from `current` inside the functional updater. The component's mount effect (`CreateInvoiceEditor.tsx:167-190`) separately sets `issueDate`/`dueDate` to today via `setDraft(current => ...)` shortly after mount. If a header field is edited before that effect's update has been applied to the `draft` this handler closes over, `nextHeader` is built from the *pre-default* (empty-dates) snapshot and silently overwrites the mount effect's update when its own `setDraft` call is applied — a classic stale-closure race, not a `current`-based read.

**Confirmed via direct testing** (not assumed): filling "Invoice Number" 1 second after page load never triggers this; filling it with zero delay reproduces it every time (3/3). A real user typing at normal human speed is unlikely to hit this, but a fast device/script, browser autofill, or a very quick keyboard-driven user plausibly could.

**Suggested fix (not applied — this was a QA pass, not a fix pass):** compute the merge inside the functional updater, e.g. `setDraft((current) => ({ ...current, header: { ...current.header, [name]: value } }))`, removing the outer `nextHeader` variable's dependency on the closure's `draft`.

### 2. Gap — No discoverable "Forgot password" UI, despite a fully working backend ([IG-195](https://appitometechnologies.atlassian.net/browse/IG-195))

The backend (`POST /api/v1/auth/forgot-password`, `POST /api/v1/auth/reset-password`) works correctly end-to-end — verified directly in this pass: request → dev-stub-logged token → reset with token → login with new password succeeds → login with old password rejected (401). But there is no link to it anywhere in the UI. `frontend/app/login/components/LoginForm.tsx`'s own comment confirms this is deliberate, not an oversight:

> "Login with Google" and "Forgot Password" are FSD-listed actions this page doesn't wire up yet: ... no `/forgot-password` page exists — both documented gaps, not oversights, left for a follow-up once those destinations exist.

**Practical effect:** a real user who forgets their password has no way to discover or use the reset flow, despite `IG-25` ("Recover a forgotten password") showing as Done in Jira.

### 3. Gap — No discoverable "Sign in with Google" UI, and the callback has nowhere to land ([IG-196](https://appitometechnologies.atlassian.net/browse/IG-196))

Confirmed via direct API check: `GET /api/v1/auth/google/login` issues a real, correctly-formed redirect to `accounts.google.com` with the app's real registered `client_id`. But:
- No link/button to it exists anywhere in the frontend.
- Per the same `LoginForm.tsx` comment, the backend's own Google callback "currently just returns raw JSON" with "no frontend route to redirect back to" — so even a user who found the URL directly would land on a bare JSON API response after completing Google's consent screen, not a logged-in session in the app.

**Practical effect:** `IG-23` ("Register or sign in with Google") shows as Done in Jira, but the flow is not actually completable by a real user end to end.

## Not bugs (ruled out during this pass, listed for transparency)

- **401s in the browser console on every anonymous page load** — expected: `SiteHeader` probes `/api/v1/auth/me` on mount to determine login state; a 401 is the correct anonymous response, just noisy in devtools' own network-error logging.
- **One 404 on the landing page, once** — did not reproduce on 2 immediate retries; consistent with a Next.js dev-server first-request compile artifact, not present in the already-confirmed-clean production build.
- **429s on login/register during the account-deletion + console-sweep script** — this was *my own* rapid automated test traffic tripping the real "auth" rate-limit policy (10 requests/60s/IP). Confirms the rate limiter works; re-ran after the window cleared and all checks passed.
- Several apparent failures during scripting turned out to be script bugs, not app bugs, and were fixed and re-verified before being ruled out: ambiguous locators (invoice number text vs. its "View" link; two "Duplicate" buttons on one page), a `role="alert"` check that unknowingly matched Next.js's own empty-text route announcer, a wrong field name in a direct API call (`confirmNewPassword` vs. the real `confirmPassword`; `password` vs. the real `currentPassword`), and one single non-reproducing flake on a save action (0/4 on retry, not filed).

## Requirement completeness (Epics touched by this session's work)

| Epic | Status |
|---|---|
| IG-1 Platform Foundation | Done |
| IG-2 Public Website | Done |
| IG-3 Identity/Auth | Done in Jira; **2 stories (IG-23, IG-25) have working backends with no UI entry point — see Findings #2/#3** |
| IG-4 Anonymous Creation | Done, verified |
| IG-5 Invoice Editor | Done; **1 reproducible bug — Findings #1** |
| IG-6 Templates/PDF/Print | Done, verified (Print button not independently verified — `window.print()` isn't observable headless; not re-tested this pass) |
| IG-7 Invoice Persistence | Done, verified |
| IG-8 Business Profile/Onboarding | Done, verified |
| IG-9 Customer/Item Catalogue | `IG-55`-`IG-58` Done, verified; `IG-59` (archive safety) not yet claimed |
| IG-10 History/Dashboard | Done, verified (dashboard/list only; search/sort not exhaustively re-verified this pass beyond one search check) |
| IG-11 Payments | Not started |
| IG-12 Quality/Security/Ops | Not started |

## Recommendation

Findings #1, #2 and #3 have been filed in Jira: [IG-194](https://appitometechnologies.atlassian.net/browse/IG-194) (bug, parented to `IG-5`), [IG-195](https://appitometechnologies.atlassian.net/browse/IG-195) and [IG-196](https://appitometechnologies.atlassian.net/browse/IG-196) (gaps, both parented to `IG-3`). #1 is a real, fixable bug; #2/#3 are pre-existing, already-self-documented gaps now tracked as issues rather than staying only as code comments, especially since the parent Stories (`IG-25`, `IG-23`) currently read as Done in Jira despite them.
