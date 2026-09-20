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

async function parseErrorDetail(response: Response, fallback: string): Promise<string> {
  const problem = await response.json().catch(() => null);
  return problem?.detail ?? fallback;
}

/** IG-222: the customer's Accept action on the hosted page - anonymous, the token is the
 * authorization (same as getHostedEstimate). Returns the updated estimate so the caller can update
 * its status badge without a second round trip. */
export async function acceptEstimate(token: string): Promise<HostedEstimate> {
  const response = await fetch(`${baseUrl()}/api/v1/public/estimates/${encodeURIComponent(token)}/accept`, { method: "POST" });

  if (!response.ok) {
    throw new Error(await parseErrorDetail(response, "This estimate can't be accepted right now."));
  }

  return response.json();
}

/** IG-222: mirror of acceptEstimate - same shape, opposite action. */
export async function declineEstimate(token: string): Promise<HostedEstimate> {
  const response = await fetch(`${baseUrl()}/api/v1/public/estimates/${encodeURIComponent(token)}/decline`, { method: "POST" });

  if (!response.ok) {
    throw new Error(await parseErrorDetail(response, "This estimate can't be declined right now."));
  }

  return response.json();
}
