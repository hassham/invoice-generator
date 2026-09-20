import type { InvoiceEmailLog, InvoiceEmailRequest } from "./invoiceEmail";

export type { InvoiceEmailLog as EstimateEmailLog, InvoiceEmailRequest as EstimateEmailRequest } from "./invoiceEmail";

function baseUrl(): string {
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5094";
}

async function parseErrorDetail(response: Response, fallback: string): Promise<string> {
  const problem = await response.json().catch(() => null);
  return problem?.detail ?? fallback;
}

/** IG-221: reuses InvoiceEmailRequest/InvoiceEmailLog directly (invoiceEmail.ts) - both are
 * already fully generic (To/Cc/Subject/Message, Sent/Failed) with no invoice-specific fields, same
 * reasoning the backend applies to InvoiceEmailRequest/InvoiceEmailStatus. */
export async function sendEstimateEmail(estimateId: string, request: InvoiceEmailRequest): Promise<void> {
  const response = await fetch(`${baseUrl()}/api/v1/estimates/${estimateId}/send-email`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(await parseErrorDetail(response, "Failed to send this estimate."));
  }
}

export async function getEstimateEmailHistory(estimateId: string): Promise<InvoiceEmailLog[]> {
  const response = await fetch(`${baseUrl()}/api/v1/estimates/${estimateId}/email-history`, { credentials: "include" });

  if (!response.ok) {
    throw new Error(await parseErrorDetail(response, "Failed to load the email history for this estimate."));
  }

  return response.json();
}
