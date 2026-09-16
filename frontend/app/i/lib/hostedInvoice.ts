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
  hasStripeAccount: boolean;
}

export interface CheckoutSession {
  url: string;
}

export interface CheckoutConfirmation {
  paid: boolean;
  invoice: HostedInvoice;
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

/** IG-216: opens a Stripe Checkout Session for this invoice's exact outstanding amount. Anonymous,
 * same precedent as getHostedInvoice - any failure (already paid, cancelled, no Stripe account
 * connected) surfaces as one generic message, since the caller can't act differently on the
 * specifics anyway. */
export async function createCheckoutSession(token: string): Promise<CheckoutSession> {
  const response = await fetch(`${baseUrl()}/api/v1/public/invoices/${encodeURIComponent(token)}/checkout-session`, { method: "POST" });

  if (!response.ok) {
    throw new Error("This invoice can't be paid online right now. Please contact the business directly.");
  }

  return response.json();
}

/** IG-216: verifies a Checkout Session's outcome server-side (never trusts the redirect-back URL
 * alone) and returns the invoice's post-payment state. Safe to call more than once for the same
 * sessionId - the backend records the underlying payment at most once. */
export async function confirmCheckoutSession(token: string, sessionId: string): Promise<CheckoutConfirmation> {
  const response = await fetch(`${baseUrl()}/api/v1/public/invoices/${encodeURIComponent(token)}/checkout-session/${encodeURIComponent(sessionId)}`);

  if (!response.ok) {
    throw new Error("We couldn't confirm your payment. Please contact the business directly.");
  }

  return response.json();
}
