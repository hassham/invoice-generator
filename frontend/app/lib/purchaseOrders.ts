export interface PurchaseOrder {
  id: string;
  businessId: string;
  businessName: string;
  supplierId: string;
  supplierName: string;
  poNumber: string;
  issueDate: string;
  dueDate: string;
  currency: string;
  reference: string | null;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  notes: string | null;
  terms: string | null;
  deliveryInstructions: string | null;
  createdAt: string;
  updatedAt: string;
}

function baseUrl(): string {
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5094";
}

async function parseErrorDetail(response: Response, fallback: string): Promise<string> {
  const problem = await response.json().catch(() => null);
  return problem?.detail ?? fallback;
}

export async function listPurchaseOrders(businessId: string): Promise<PurchaseOrder[]> {
  const response = await fetch(`${baseUrl()}/api/v1/businesses/${businessId}/purchase-orders`, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(await parseErrorDetail(response, "Failed to load your purchase orders."));
  }

  return response.json();
}

export async function getPurchaseOrder(businessId: string, purchaseOrderId: string): Promise<PurchaseOrder> {
  const response = await fetch(
    `${baseUrl()}/api/v1/businesses/${businessId}/purchase-orders/${purchaseOrderId}`,
    { credentials: "include" }
  );

  if (!response.ok) {
    throw new Error(await parseErrorDetail(response, "Failed to load this purchase order."));
  }

  return response.json();
}

export async function deletePurchaseOrder(businessId: string, purchaseOrderId: string): Promise<void> {
  const response = await fetch(
    `${baseUrl()}/api/v1/businesses/${businessId}/purchase-orders/${purchaseOrderId}`,
    { method: "DELETE", credentials: "include" }
  );

  if (!response.ok) {
    throw new Error(await parseErrorDetail(response, "Failed to delete this purchase order."));
  }
}
