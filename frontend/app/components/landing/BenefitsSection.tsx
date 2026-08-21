const benefits = [
  {
    title: "Invoice in under two minutes",
    description: "Fill in your details, add your items, and you're ready to send — no learning curve.",
  },
  {
    title: "Professional templates",
    description: "Choose a clean, ready-made template. Your invoices look right the first time.",
  },
  {
    title: "Know who owes you money",
    description: "Record payments as they arrive and see at a glance which invoices are still unpaid.",
  },
  {
    title: "No accounting knowledge required",
    description: "Built for freelancers and small businesses, not accountants — plain language throughout.",
  },
  {
    title: "Works on any device",
    description: "Create and send invoices just as easily from your phone on a job site as from a desktop.",
  },
  {
    title: "Generous free plan",
    description: "Start creating invoices immediately. No credit card, and no account required to try it.",
  },
];

export function BenefitsSection() {
  return (
    <section aria-labelledby="benefits-heading" className="bg-slate-50 py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 id="benefits-heading" className="text-3xl font-bold tracking-tight text-slate-950">
            Everything you need, nothing you don&apos;t
          </h2>
          <p className="mt-4 text-lg text-slate-600">
            A billing tool that respects your time, built around how freelancers and small
            businesses actually get paid.
          </p>
        </div>

        <ul className="mt-14 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {benefits.map((benefit) => (
            <li key={benefit.title} className="rounded-2xl border border-slate-200 bg-white p-6">
              <span
                aria-hidden="true"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-700"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
                  <path
                    fillRule="evenodd"
                    d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                    clipRule="evenodd"
                  />
                </svg>
              </span>
              <h3 className="mt-4 text-base font-semibold text-slate-950">{benefit.title}</h3>
              <p className="mt-2 text-sm text-slate-600">{benefit.description}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
