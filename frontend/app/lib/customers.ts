export interface Customer {
  id: string;
  businessName: string | null;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  taxNumber: string | null;
  notes: string | null;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerRequest {
  businessName: string | null;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  taxNumber: string | null;
  notes: string | null;
}

function baseUrl(): string {
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5094";
}

async function parseErrorDetail(response: Response, fallback: string): Promise<string> {
  const problem = await response.json().catch(() => null);
  return problem?.detail ?? fallback;
}

/** IG-55: every call needs credentials: "include", same reasoning as lib/auth.ts - these routes
 * are all account-owned and require the session cookie. */
export async function listCustomers(includeArchived = false): Promise<Customer[]> {
  const response = await fetch(`${baseUrl()}/api/v1/customers?includeArchived=${includeArchived}`, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(await parseErrorDetail(response, "Failed to load customers."));
  }

  return response.json();
}

export async function getCustomer(id: string): Promise<Customer> {
  const response = await fetch(`${baseUrl()}/api/v1/customers/${id}`, { credentials: "include" });

  if (!response.ok) {
    throw new Error(await parseErrorDetail(response, "Failed to load this customer."));
  }

  return response.json();
}

export async function createCustomer(request: CustomerRequest): Promise<Customer> {
  const response = await fetch(`${baseUrl()}/api/v1/customers`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(await parseErrorDetail(response, "Failed to create this customer."));
  }

  return response.json();
}

export async function updateCustomer(id: string, request: CustomerRequest): Promise<Customer> {
  const response = await fetch(`${baseUrl()}/api/v1/customers/${id}`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(await parseErrorDetail(response, "Failed to save changes to this customer."));
  }

  return response.json();
}

export async function archiveCustomer(id: string): Promise<void> {
  const response = await fetch(`${baseUrl()}/api/v1/customers/${id}`, {
    method: "DELETE",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(await parseErrorDetail(response, "Failed to archive this customer."));
  }
}
