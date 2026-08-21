const features = [
  "Multiple currencies and international formatting",
  "Tax-inclusive or tax-exclusive pricing",
  "Save customers and items for faster reuse",
  "Automatic subtotal, tax and total calculations",
  "Track payments and see what's still outstanding",
  "Duplicate an existing invoice in one click",
];

export function FeatureOverviewSection() {
  return (
    <section aria-labelledby="features-heading" className="py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:items-center">
          <div>
            <h2 id="features-heading" className="text-3xl font-bold tracking-tight text-slate-950">
              Built for how you actually invoice
            </h2>
            <p className="mt-4 text-lg text-slate-600">
              From your first invoice to your hundredth, the details that matter are handled
              automatically so you can focus on the work.
            </p>
          </div>

          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {features.map((feature) => (
              <li key={feature} className="flex items-start gap-3">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="mt-0.5 h-5 w-5 flex-none text-blue-600"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="text-sm text-slate-700">{feature}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
