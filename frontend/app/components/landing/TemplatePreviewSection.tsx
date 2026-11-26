import { SampleInvoice } from "./SampleInvoice";

const templates = [
  { code: "classic", name: "Classic", description: "A dark header and a traditional layout." },
  { code: "modern", name: "Modern", description: "A bold colour bar and a crisp layout." },
  { code: "minimal", name: "Minimal", description: "A pared-back, paper-first design." },
] as const;

export function TemplatePreviewSection() {
  return (
    <section id="templates" aria-labelledby="templates-heading" className="scroll-mt-20 py-14 sm:py-20">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <p className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-muted">02 / Invoice templates</p>
        <h2 id="templates-heading" className="mt-3 max-w-3xl font-display text-[clamp(2.25rem,5vw,3.5rem)] font-bold leading-[1.03] tracking-[-0.05em] text-ink">Make it look like you.</h2>
        <p className="mt-3 max-w-lg text-base leading-relaxed text-muted sm:text-lg">Start with a free template, then add your own branding.</p>
        <ul className="mt-8 grid items-start gap-5 md:grid-cols-3">
          {templates.map((template) => (
            <li key={template.code} className="min-w-0 rounded-3xl border border-ink bg-paper p-3 sm:p-4">
              <details className="group">
                <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 rounded-lg px-2 py-2 marker:content-none focus-visible:outline-2 focus-visible:outline-ink">
                  <span><strong className="block font-display text-xl text-ink">{template.name}</strong><span className="mt-1 block text-sm text-muted">{template.description}</span></span>
                  <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center rounded-full border border-ink bg-paper text-lg group-open:rotate-45">+</span>
                </summary>
                <div className="mt-3"><SampleInvoice variant={template.code} /></div>
              </details>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
