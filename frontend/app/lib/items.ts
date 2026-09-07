export interface CatalogItem {
  id: string;
  name: string;
  description: string | null;
  sku: string | null;
  unit: string | null;
  unitPrice: number;
  taxRate: number | null;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CatalogItemRequest {
  name: string;
  description: string | null;
  sku: string | null;
  unit: string | null;
  unitPrice: number;
  taxRate: number | null;
}

function baseUrl(): string {
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5094";
}

async function parseErrorDetail(response: Response, fallback: string): Promise<string> {
  const problem = await response.json().catch(() => null);
  return problem?.detail ?? fallback;
}

/** IG-57: every call needs credentials: "include", same convention as lib/customers.ts - these
 * routes are all account-owned and require the session cookie. */
export async function listItems(includeArchived = false): Promise<CatalogItem[]> {
  const response = await fetch(`${baseUrl()}/api/v1/items?includeArchived=${includeArchived}`, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(await parseErrorDetail(response, "Failed to load items."));
  }

  return response.json();
}

export async function getItem(id: string): Promise<CatalogItem> {
  const response = await fetch(`${baseUrl()}/api/v1/items/${id}`, { credentials: "include" });

  if (!response.ok) {
    throw new Error(await parseErrorDetail(response, "Failed to load this item."));
  }

  return response.json();
}

export async function createItem(request: CatalogItemRequest): Promise<CatalogItem> {
  const response = await fetch(`${baseUrl()}/api/v1/items`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(await parseErrorDetail(response, "Failed to create this item."));
  }

  return response.json();
}

export async function updateItem(id: string, request: CatalogItemRequest): Promise<CatalogItem> {
  const response = await fetch(`${baseUrl()}/api/v1/items/${id}`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(await parseErrorDetail(response, "Failed to save changes to this item."));
  }

  return response.json();
}

export async function archiveItem(id: string): Promise<void> {
  const response = await fetch(`${baseUrl()}/api/v1/items/${id}`, {
    method: "DELETE",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(await parseErrorDetail(response, "Failed to archive this item."));
  }
}

/** FSD section 59's "Duplicate" list action. */
export async function duplicateItem(id: string): Promise<CatalogItem> {
  const response = await fetch(`${baseUrl()}/api/v1/items/${id}/duplicate`, {
    method: "POST",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(await parseErrorDetail(response, "Failed to duplicate this item."));
  }

  return response.json();
}
