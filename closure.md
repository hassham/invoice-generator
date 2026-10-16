# Closure Checklist

Items still open before the project can be considered closed. Tick an item when it is done and verified, and add the commit hash or Jira key beside it. This file is the tracking list; `backlog.md` remains the handoff summary.

Last reviewed: 2026-10-16. Latest pushed commit on `origin/main`: `0a12584`.

## Delivery

- [x] Push local commit `422e0dc` (handoff update) to `origin/main`. Done in `0a12584`.
- [ ] Set `Api:PublicBaseUrl` in every deployment to the public API URL. The default is `http://localhost:5094`, so open-tracking pixels do not work in production until this is set.
- [ ] Browser-check `/reports/combined` and the Opened column in invoice email history.

## Decisions

- [ ] Decide whether the invoice emails or the privacy policy must disclose the 1x1 open-tracking pixel. (Recipients are tracked via `InvoiceEmailLog.OpenToken`, `FirstOpenedAt` and `OpenCount`.)

## Features

- [ ] Open tracking for estimate emails. Not built; `InvoiceEmailLog` covers invoices only.

## Known gaps (not tracked in Jira)

- [ ] Navigation entries for Phase 2 pages (estimates, receipts, credit notes, recurring, reports, documents, purchase orders). They are reachable only by URL because the header is at its width limit. Belongs with `IG-198`.
- [ ] Credit notes and receipts have no detail page. Their rows on `/documents` link to their list instead.
- [ ] Recurring schedules set to "Custom" frequency behave as monthly (`CalculateNextRunDate`). There is no interval field.
- [ ] `GET /api/v1/documents` merges per-type results in memory. Needs a database view or a raw `UNION ALL` for accounts with tens of thousands of documents.
- [ ] Purchase order PDF does not show delivery instructions. The only free-text slot renders under "Payment Instructions".
- [ ] Credit note numbers issued before `IG-310` keep the old format alongside the new one. Old numbers are not migrated, by design. Decide whether to document this for accountants.
- [ ] A new account's default tax rate is 0%, not the 10% in the FSD. Decide whether onboarding should set it.

## Engineering

- [ ] Branch protection on `main`: the "Backend build" and "Frontend build" checks are required but bypassed on direct pushes. Revisit once the current Jira set closes, then move to a PR-based flow.
- [ ] `frontend/next-env.d.ts` is generated, and it is now tracked (committed in `0a12584` as a local change). Decide whether to stop tracking it.

## On hold (language, by product decision 2026-10-16)

Do not start these until the `on-hold` label is removed in Jira.

- [ ] Choose the second language to add. Blocks `IG-302` and closure of the epic `IG-211`.
- [ ] `IG-301`: finish moving user-facing text into the catalogue. Reports views are done; documents, forms, hosted pages and `lib/*.ts` error strings remain.
- [ ] `IG-302`: test language selection and switching.
- [ ] `IG-241` and `IG-211`: close after the items above.
