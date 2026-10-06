export interface CreateReceiptRequest {
  paymentId: string;
}

export interface Receipt {
  id: string;
  paymentId: string;
  invoiceId: string;
  receiptNumber: string;
  issueDate: string;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  currency: string;
  createdAt: string;
  invoiceNumber: string;
  businessName: string;
  businessEmail?: string;
}

function baseUrl(): string {
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5094";
}

async function parseErrorDetail(response: Response, fallback: string): Promise<string> {
  const problem = await response.json().catch(() => null);
  return problem?.detail ?? fallback;
}

export async function createReceipt(
  businessId: string,
  request: CreateReceiptRequest
): Promise<Receipt> {
  const response = await fetch(`${baseUrl()}/api/v1/businesses/${businessId}/receipts`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(await parseErrorDetail(response, "Failed to create receipt."));
  }

  return response.json();
}

export async function listByInvoice(businessId: string, invoiceId: string): Promise<Receipt[]> {
  const response = await fetch(
    `${baseUrl()}/api/v1/businesses/${businessId}/invoices/${invoiceId}/receipts`,
    { credentials: "include" }
  );

  if (!response.ok) {
    throw new Error(await parseErrorDetail(response, "Failed to load receipts."));
  }

  return response.json();
}

export async function listByBusiness(businessId: string): Promise<Receipt[]> {
  const response = await fetch(`${baseUrl()}/api/v1/businesses/${businessId}/receipts`, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(await parseErrorDetail(response, "Failed to load receipts."));
  }

  return response.json();
}

export async function getReceipt(businessId: string, receiptId: string): Promise<Receipt> {
  const response = await fetch(
    `${baseUrl()}/api/v1/businesses/${businessId}/receipts/${receiptId}`,
    { credentials: "include" }
  );

  if (!response.ok) {
    throw new Error(await parseErrorDetail(response, "Failed to load receipt."));
  }

  return response.json();
}

export async function deleteReceipt(businessId: string, receiptId: string): Promise<void> {
  const response = await fetch(
    `${baseUrl()}/api/v1/businesses/${businessId}/receipts/${receiptId}`,
    {
      method: "DELETE",
      credentials: "include",
    }
  );

  if (!response.ok) {
    throw new Error(await parseErrorDetail(response, "Failed to delete receipt."));
  }
}

export async function downloadReceiptPdf(
  businessId: string,
  receiptId: string,
  receiptNumber: string
): Promise<void> {
  const response = await fetch(
    `${baseUrl()}/api/v1/businesses/${businessId}/receipts/${receiptId}/pdf`,
    { credentials: "include" }
  );

  if (!response.ok) {
    throw new Error(await parseErrorDetail(response, "Failed to download receipt PDF."));
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${receiptNumber}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
