export interface InvoiceEmailRequest {
  to: string[];
  cc: string[];
  subject: string;
  message: string;
}

/** Splits a comma/newline-separated block of addresses into a clean list - lets the compose form
 * use one free-text field per Recipient/CC instead of a chip-input widget, matching this app's
 * general preference for plain text fields over bespoke input controls. */
export function parseEmailList(value: string): string[] {
  return value
    .split(/[,\n]/)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function baseUrl(): string {
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5094";
}

async function parseErrorDetail(response: Response, fallback: string): Promise<string> {
  const problem = await response.json().catch(() => null);
  return problem?.detail ?? fallback;
}

/** IG-212: account-owned, same credentials:"include" convention as every other authenticated
 * lib/*.ts fetch wrapper. The backend attaches the PDF and hosted invoice link automatically -
 * this only ever sends what the compose form's fields hold. */
export async function sendInvoiceEmail(invoiceId: string, request: InvoiceEmailRequest): Promise<void> {
  const response = await fetch(`${baseUrl()}/api/v1/invoices/${invoiceId}/send-email`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(await parseErrorDetail(response, "Failed to send this invoice."));
  }
}
