export interface HostedEstimate {
  businessName: string;
  logoUrl: string | null;
  estimateNumber: string;
  status: string;
  issueDate: string;
  expiryDate: string;
  currency: string;
  totalAmount: number;
}

function baseUrl(): string {
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5094";
}

/** IG-221: mirrors frontend/app/i/lib/hostedInvoice.ts's getHostedInvoice exactly - anonymous by
 * design, no credentials:"include", the token itself is the authorization. Any failure (unknown/
 * invalid/deleted token) surfaces as the same generic message, matching the backend's own
 * indistinguishable-404 behavior. */
export async function getHostedEstimate(token: string): Promise<HostedEstimate> {
  const response = await fetch(`${baseUrl()}/api/v1/public/estimates/${encodeURIComponent(token)}`);

  if (!response.ok) {
    throw new Error("This estimate could not be found. The link may be incorrect or the estimate may no longer be available.");
  }

  return response.json();
}

/** Same reasoning as hostedInvoicePdfUrl - a plain anchor href, not a fetch+blob download. */
export function hostedEstimatePdfUrl(token: string): string {
  return `${baseUrl()}/api/v1/public/estimates/${encodeURIComponent(token)}/pdf`;
}
