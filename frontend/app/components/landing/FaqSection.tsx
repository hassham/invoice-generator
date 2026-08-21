const faqs = [
  {
    question: "Do I need to create an account to make an invoice?",
    answer:
      "No. You can build and fully preview an invoice without signing up. You'll only need an account when you're ready to download or print it, and anything you've entered is kept so you don't have to start over.",
  },
  {
    question: "Is it really free?",
    answer:
      "Yes. The free plan includes unlimited draft invoices, core templates, PDF download, and saved customers and items — no credit card required.",
  },
  {
    question: "Can I download my invoice as a PDF?",
    answer: "Yes, PDF download and printing are available once you're signed in.",
  },
  {
    question: "Does it support GST and Australian tax invoices?",
    answer:
      "Yes. You can set GST-inclusive or GST-exclusive pricing, and include the details commonly required on an Australian tax invoice.",
  },
  {
    question: "Can I use it on my phone?",
    answer:
      "Yes. The invoice editor works on mobile, tablet and desktop, so you can create an invoice on the job just as easily as at a desk.",
  },
];

export function FaqSection() {
  return (
    <section aria-labelledby="faq-heading" className="py-20">
      <div className="mx-auto max-w-3xl px-6">
        <h2 id="faq-heading" className="text-center text-3xl font-bold tracking-tight text-slate-950">
          Frequently asked questions
        </h2>

        <div className="mt-12 divide-y divide-slate-200 border-t border-slate-200">
          {faqs.map((faq) => (
            <details key={faq.question} className="group py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-semibold text-slate-950 marker:content-none">
                {faq.question}
                <span aria-hidden="true" className="flex-none text-xl text-slate-400 group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-3 text-sm text-slate-600">{faq.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
