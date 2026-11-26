type TemplateVariant = "classic" | "modern" | "minimal";

const templates: Array<{ code: TemplateVariant; name: string; description: string }> = [
  {
    code: "classic",
    name: "Classic",
    description: "A traditional, business-formal layout that works for any industry.",
  },
  {
    code: "modern",
    name: "Modern",
    description: "Bold header and clear typography for a contemporary brand.",
  },
  {
    code: "minimal",
    name: "Minimal",
    description: "Clean and understated, letting your invoice details speak for themselves.",
  },
];

function InvoiceMockup({ variant }: { variant: TemplateVariant }) {
  const headerClass =
    variant === "modern"
      ? "bg-accent"
      : variant === "minimal"
        ? "bg-paper border-b border-border"
        : "bg-ink";

  const headerBarClass = variant === "minimal" ? "bg-border" : "bg-paper/70";

  return (
    <div
      aria-hidden="true"
      className="overflow-hidden rounded-xl border border-border bg-paper"
    >
      <div className={`h-12 ${headerClass} flex items-center px-4`}>
        <div className={`h-2 w-16 rounded-full ${headerBarClass}`} />
      </div>
      <div className="space-y-2 p-4">
        <div className="h-2 w-3/4 rounded-full bg-border" />
        <div className="h-2 w-1/2 rounded-full bg-border" />
        <div className="mt-4 space-y-1.5">
          <div className="h-1.5 w-full rounded-full bg-canvas" />
          <div className="h-1.5 w-full rounded-full bg-canvas" />
          <div className="h-1.5 w-2/3 rounded-full bg-canvas" />
        </div>
      </div>
    </div>
  );
}

export function TemplatePreviewSection() {
  return (
    <section id="templates" aria-labelledby="templates-heading" className="py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 id="templates-heading" className="text-3xl font-bold tracking-tight text-ink">
            A template for every business
          </h2>
          <p className="mt-4 text-lg text-muted">
            Every template is free to use. Pick the one that fits your brand and switch anytime.
          </p>
        </div>

        <ul className="mt-14 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <li key={template.code}>
              <InvoiceMockup variant={template.code} />
              <h3 className="mt-4 text-base font-semibold text-ink">{template.name}</h3>
              <p className="mt-1 text-sm text-muted">{template.description}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
