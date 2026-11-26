const steps = [
  { number: "01", title: "Quote accepted.", description: "Send a quote your client can accept online. Turn it into an invoice without retyping the details.", colour: "bg-yellow", stamp: "Quote approved", icon: "quote" },
  { number: "02", title: "Invoice sent.", description: "Create a branded invoice, email it to your client or share a payment link.", colour: "bg-lavender", stamp: "Invoice sent", icon: "invoice" },
  { number: "03", title: "Payment received.", description: "See what’s paid and what’s outstanding. Set reminders for the invoices you’re still waiting on.", colour: "bg-mint", stamp: "Paid", icon: "payment" },
] as const;

function StepIcon({ icon }: { icon: (typeof steps)[number]["icon"] }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 80 68" className="h-16 w-20 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      {icon === "quote" ? (
        <><path d="m13 10 38-4 5 54-38 4z" className="fill-paper" /><path d="m23 23 19-2m-18 10 19-2m-18 10 11-1" /><circle cx="55" cy="48" r="14" className="fill-yellow" /><path d="m49 48 4 4 8-9" /></>
      ) : icon === "invoice" ? (
        <><path d="m8 28 31-20 32 20v32H8z" className="fill-paper" /><path d="M22 14h34v29H22z" className="fill-lavender" /><path d="M30 22h18m-18 8h18M8 28l31 22 32-22M8 60l23-17m40 17L48 43" /></>
      ) : (
        <><rect x="8" y="15" width="53" height="34" rx="6" className="fill-paper" /><path d="M8 26h53m-45 13h12" /><circle cx="59" cy="46" r="15" className="fill-mint" /><path d="m52 46 5 5 9-10" /></>
      )}
    </svg>
  );
}

export function BenefitsSection() {
  return (
    <section id="how-it-works" aria-labelledby="benefits-heading" className="scroll-mt-20 border-y border-ink/15 bg-paper py-14 sm:py-20">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <p className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-muted">01 / How it works</p>
        <h2 id="benefits-heading" className="mt-3 max-w-3xl font-display text-[clamp(2.25rem,5vw,3.5rem)] font-bold leading-[1.03] tracking-[-0.05em] text-ink">
          From quote to paid.
        </h2>
        <p className="mt-3 max-w-lg text-base leading-relaxed text-muted sm:text-lg">One place for the paperwork between winning the work and getting paid.</p>
        <ol className="mt-8 grid gap-5 text-ink md:grid-cols-3 md:items-start md:gap-6">
          {steps.map((step) => (
            <li key={step.number} className={`rounded-[1.65rem] border-2 border-ink p-5 shadow-[3px_3px_0_var(--color-ink)] sm:p-6 md:even:mt-5 ${step.colour}`}>
              <div className="flex items-start justify-between gap-2">
                <span aria-hidden="true" className="font-mono text-xs font-bold tracking-widest">{step.number}</span>
                <StepIcon icon={step.icon} />
              </div>
              <h3 className="mt-2 font-display text-2xl font-bold tracking-tight">{step.title}</h3>
              <p className="mt-2 max-w-sm text-sm leading-relaxed">{step.description}</p>
              <span aria-hidden="true" className="mt-5 inline-flex rounded-full border border-ink bg-paper px-2.5 py-1 font-mono text-[0.625rem] font-bold uppercase tracking-wider">{step.stamp}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
