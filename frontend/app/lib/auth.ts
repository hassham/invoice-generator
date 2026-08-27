export interface LoggedInAccount {
  userId: string;
  email: string;
  name: string | null;
}

export interface RegisterAccountRequest {
  email: string;
  password: string;
  confirmPassword: string;
  name: string | null;
}

export interface RegisterResponse {
  userId: string;
  email: string;
  name: string | null;
  businessId: string;
}

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe: boolean;
}

function baseUrl(): string {
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5094";
}

async function parseErrorDetail(response: Response, fallback: string): Promise<string> {
  const problem = await response.json().catch(() => null);
  return problem?.detail ?? fallback;
}

/**
 * IG-26: every auth call needs credentials: "include" so the browser sends/accepts the
 * ASP.NET Core Identity session cookie cross-origin (backend/src/InvoiceApp.Api/Program.cs's
 * CORS policy allows it for exactly this reason).
 */
export async function registerAccount(request: RegisterAccountRequest): Promise<RegisterResponse> {
  const response = await fetch(`${baseUrl()}/api/v1/auth/register`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(await parseErrorDetail(response, "Failed to create your account."));
  }

  return response.json();
}

export async function login(request: LoginRequest): Promise<LoggedInAccount> {
  const response = await fetch(`${baseUrl()}/api/v1/auth/login`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(await parseErrorDetail(response, "Failed to sign in."));
  }

  return response.json();
}

export async function logout(): Promise<void> {
  await fetch(`${baseUrl()}/api/v1/auth/logout`, { method: "POST", credentials: "include" });
}

/**
 * Returns null for both "not logged in" and "request failed" - callers only ever need to
 * distinguish "show the authenticated header" from "don't", not why it isn't authenticated.
 */
export async function getCurrentSession(): Promise<LoggedInAccount | null> {
  const response = await fetch(`${baseUrl()}/api/v1/auth/me`, { credentials: "include" });

  if (!response.ok) {
    return null;
  }

  return response.json();
}
