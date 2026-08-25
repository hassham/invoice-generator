export interface Template {
  id: string;
  name: string;
  templateCode: string;
  previewImage: string | null;
  isPremium: boolean;
  sortOrder: number;
}

/**
 * IG-39: first frontend-to-backend fetch call in this app - no HTTP client or env-var convention
 * existed yet, so this deliberately stays a plain fetch() rather than adding a dependency
 * (axios/react-query) for a single simple GET. NEXT_PUBLIC_API_BASE_URL mirrors how
 * NEXT_PUBLIC_SITE_URL is already read in app/layout.tsx; the default matches the backend's
 * actual local dev port (backend/src/InvoiceApp.Api/Properties/launchSettings.json).
 */
export async function fetchTemplates(): Promise<Template[]> {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5094";
  const response = await fetch(`${baseUrl}/api/v1/templates`);

  if (!response.ok) {
    throw new Error("Failed to load templates");
  }

  return response.json();
}
