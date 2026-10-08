export interface CreateCreditNoteRequest {
  invoiceId: string;
  amount: number;
  reason: string;
  notes?: string;
}

export interface CreditNote {
  id: string;
  invoiceId: string;
  customerId: string;
  creditNoteNumber: string;
  issueDate: string;
  reason: string;
  currency: string;
  amount: number;
  notes: string;
  createdAt: string;
}

function baseUrl(): string {
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5094";
}

async function parseErrorDetail(response: Response, fallback: string): Promise<string> {
  const problem = await response.json().catch(() => null);
  return problem?.detail ?? fallback;
}

export async function createCreditNote(
  businessId: string,
  request: CreateCreditNoteRequest
): Promise<CreditNote> {
  const response = await fetch(`${baseUrl()}/api/v1/businesses/${businessId}/credit-notes`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(await parseErrorDetail(response, "Failed to create credit note."));
  }

  return response.json();
}

export async function listByInvoice(
  businessId: string,
  invoiceId: string
): Promise<CreditNote[]> {
  const response = await fetch(
    `${baseUrl()}/api/v1/businesses/${businessId}/invoices/${invoiceId}/credit-notes`,
    { credentials: "include" }
  );

  if (!response.ok) {
    throw new Error(await parseErrorDetail(response, "Failed to load credit notes."));
  }

  return response.json();
}

export async function listByBusiness(businessId: string): Promise<CreditNote[]> {
  const response = await fetch(
    `${baseUrl()}/api/v1/businesses/${businessId}/credit-notes`,
    { credentials: "include" }
  );

  if (!response.ok) {
    throw new Error(await parseErrorDetail(response, "Failed to load credit notes."));
  }

  return response.json();
}

export async function getCreditNote(
  businessId: string,
  creditNoteId: string
): Promise<CreditNote> {
  const response = await fetch(
    `${baseUrl()}/api/v1/businesses/${businessId}/credit-notes/${creditNoteId}`,
    { credentials: "include" }
  );

  if (!response.ok) {
    throw new Error(await parseErrorDetail(response, "Failed to load credit note."));
  }

  return response.json();
}

/** IG-308: same blob-download approach as downloadPurchaseOrderPdf. */
export async function downloadCreditNotePdf(
  businessId: string,
  creditNoteId: string,
  creditNoteNumber: string
): Promise<void> {
  const response = await fetch(
    `${baseUrl()}/api/v1/businesses/${businessId}/credit-notes/${creditNoteId}/pdf`,
    { credentials: "include" }
  );

  if (!response.ok) {
    throw new Error(await parseErrorDetail(response, "Failed to download this credit note."));
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${creditNoteNumber}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function deleteCreditNote(
  businessId: string,
  creditNoteId: string
): Promise<void> {
  const response = await fetch(
    `${baseUrl()}/api/v1/businesses/${businessId}/credit-notes/${creditNoteId}`,
    {
      method: "DELETE",
      credentials: "include",
    }
  );

  if (!response.ok) {
    throw new Error(await parseErrorDetail(response, "Failed to delete credit note."));
  }
}
