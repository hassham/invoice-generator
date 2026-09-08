export type PaymentMethod = "Cash" | "BankTransfer" | "Card" | "PayPal" | "Cheque" | "Other";

export const PAYMENT_METHODS: PaymentMethod[] = ["Cash", "BankTransfer", "Card", "PayPal", "Cheque", "Other"];

export interface Payment {
  id: string;
  invoiceId: string;
  paymentDate: string;
  amount: number;
  paymentMethod: PaymentMethod;
  reference: string | null;
  notes: string | null;
  createdAt: string;
}

export interface PaymentRequest {
  paymentDate: string;
  amount: number;
  paymentMethod: PaymentMethod;
  reference: string | null;
  notes: string | null;
}

/** Subset of InvoiceDto returned alongside a payment write - enough to merge the recalculated
 * status/balance into already-loaded detail state (same convention as InvoiceSummary in
 * lib/invoiceDetail.ts) without a second GET. */
export interface InvoicePaymentSummary {
  id: string;
  status: string;
  amountPaid: number;
  amountDue: number;
  updatedAt: string;
}

export interface RecordPaymentResult {
  payment: Payment;
  invoice: InvoicePaymentSummary;
}

function baseUrl(): string {
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5094";
}

async function parseErrorDetail(response: Response, fallback: string): Promise<string> {
  const problem = await response.json().catch(() => null);
  return problem?.detail ?? fallback;
}

/** FSD sections 66-72: account-owned sub-resource of an invoice, same credentials:"include"
 * convention as lib/invoiceDetail.ts. */
export async function listPayments(invoiceId: string): Promise<Payment[]> {
  const response = await fetch(`${baseUrl()}/api/v1/invoices/${invoiceId}/payments`, { credentials: "include" });

  if (!response.ok) {
    throw new Error(await parseErrorDetail(response, "Failed to load payments for this invoice."));
  }

  return response.json();
}

/** FSD sections 69-71: rejects overpayment (400) and payments against a Cancelled invoice (409) -
 * surfaced via the thrown error's message, same pattern as cancelInvoice. */
export async function recordPayment(invoiceId: string, request: PaymentRequest): Promise<RecordPaymentResult> {
  const response = await fetch(`${baseUrl()}/api/v1/invoices/${invoiceId}/payments`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(await parseErrorDetail(response, "Failed to record this payment."));
  }

  return response.json();
}

/** FSD section 72: allowed regardless of the invoice's current status - a correction, not a new
 * payment. */
export async function removePayment(invoiceId: string, paymentId: string): Promise<InvoicePaymentSummary> {
  const response = await fetch(`${baseUrl()}/api/v1/invoices/${invoiceId}/payments/${paymentId}`, {
    method: "DELETE",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(await parseErrorDetail(response, "Failed to remove this payment."));
  }

  return response.json();
}
