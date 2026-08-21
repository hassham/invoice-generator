# Frontend

Next.js (App Router), React, TypeScript and Tailwind CSS.

```
npm install
npm run dev     # starts on :3000, or the next free port if that's taken
npm run build   # production build; also runs TypeScript type-checking
npm run lint    # eslint
```

## Landing page

`app/page.tsx` composes the sections in `app/components/landing/` per
`docs/FSD.md` section 6.1: `SiteHeader`, `Hero`, `BenefitsSection`,
`TemplatePreviewSection`, `HowItWorksSection`, `FeatureOverviewSection`,
`PricingTeaserSection`, `FaqSection`, `SiteFooter`. The three template
previews (`classic`/`modern`/`minimal`) intentionally match the codes
seeded in `document.templates` by the backend (`docs/DATABASE_SCHEMA.md`
section 9) rather than inventing separate names. `/login`, `/signup` and
`/invoice/create` are linked but don't exist as pages yet - they belong
to later Epics (Authentication, Invoice Generator).

Verified with a real headless-browser run (Playwright), not just
`npm run build` succeeding: all section headings render, the FAQ
disclosure widget (`<details>`/`<summary>`, no JS state needed) opens on
click, zero console errors, and no horizontal overflow at 1440px, 375px
or 320px (`docs/FSD.md` section 85's minimum supported width) -
screenshots reviewed at all three. No project skill covered "run this
app in a browser" yet; the driver script isn't part of the repo (built
ad hoc in a scratch directory with `chromium-cli` unavailable on this
machine, so a small local Playwright script was used instead) - a
future session could turn that into a proper skill via
`/run-skill-generator` if browser verification becomes a recurring need
for frontend Subtasks.

## Gotcha: port 3000 may already be in use

This machine can have an unrelated project's dev server already bound
to port 3000. `npm run dev` handles this fine on its own (Next.js
detects the conflict and picks the next free port, e.g. 3002) - but if
you're scripting against `localhost:3000` assuming that's this app,
check the dev server's own startup log for the port it actually chose
first.
