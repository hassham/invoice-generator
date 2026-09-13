export interface HostedInvoice {
  businessName: string;
  logoUrl: string | null;
  invoiceNumber: string;
  status: string;
  issueDate: string;
  dueDate: string;
  currency: string;
  totalAmount: number;
  amountDue: number;
}

function baseUrl(): string {
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5094";
}

/** IG-214: anonymous by design - no credentials:"include", the token itself is the
 * authorization. IG-215: any failure (unknown/invalid/deleted token) surfaces as the same generic
 * message, matching the backend's own indistinguishable-404 behavior - never anything more
 * specific about why. */
export async function getHostedInvoice(token: string): Promise<HostedInvoice> {
  const response = await fetch(`${baseUrl()}/api/v1/public/invoices/${encodeURIComponent(token)}`);

  if (!response.ok) {
    throw new Error("This invoice could not be found. The link may be incorrect or the invoice may no longer be available.");
  }

  return response.json();
}

/** The actual Download PDF link target - a plain anchor href, not a fetch+blob download, since
 * this endpoint needs no credentials and a top-level navigation isn't subject to CORS the way a
 * JS-read response would be (unlike the authenticated invoice detail page's download flow). */
export function hostedInvoicePdfUrl(token: string): string {
  return `${baseUrl()}/api/v1/public/invoices/${encodeURIComponent(token)}/pdf`;
}
