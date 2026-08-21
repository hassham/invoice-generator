const steps = [
  {
    step: "1",
    title: "Add your details",
    description: "Enter your business and customer information — or pick a saved customer once you're signed in.",
  },
  {
    step: "2",
    title: "List what you're billing for",
    description: "Add line items with quantity and price. Tax and totals are calculated for you automatically.",
  },
  {
    step: "3",
    title: "Download or print",
    description: "Preview the finished invoice, then download it as a PDF or print it — ready to send.",
  },
];

export function HowItWorksSection() {
  return (
    <section aria-labelledby="how-it-works-heading" className="bg-slate-50 py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 id="how-it-works-heading" className="text-3xl font-bold tracking-tight text-slate-950">
            How it works
          </h2>
        </div>

        <ol className="mt-14 grid grid-cols-1 gap-10 sm:grid-cols-3">
          {steps.map((item) => (
            <li key={item.step} className="text-center sm:text-left">
              <span
                aria-hidden="true"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-950 text-sm font-semibold text-white sm:mx-0 mx-auto"
              >
                {item.step}
              </span>
              <h3 className="mt-4 text-base font-semibold text-slate-950">{item.title}</h3>
              <p className="mt-2 text-sm text-slate-600">{item.description}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
