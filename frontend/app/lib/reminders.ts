export interface ReminderRule {
  id: string;
  triggerType: string;
  triggerValue: number;
  emailSubject: string;
  emailBody: string;
  isActive: boolean;
  createdAt: string;
}

export interface UpdateReminderRuleRequest {
  emailSubject: string;
  emailBody: string;
  isActive: boolean;
}

function baseUrl(): string {
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5094";
}

async function parseErrorDetail(response: Response, fallback: string): Promise<string> {
  const problem = await response.json().catch(() => null);
  return problem?.detail ?? fallback;
}

export async function listReminderRules(businessId: string): Promise<ReminderRule[]> {
  const response = await fetch(
    `${baseUrl()}/api/v1/businesses/${businessId}/reminder-rules`,
    { credentials: "include" }
  );

  if (!response.ok) {
    throw new Error(await parseErrorDetail(response, "Failed to load reminder rules."));
  }

  return response.json();
}

export async function getReminderRule(
  businessId: string,
  ruleId: string
): Promise<ReminderRule> {
  const response = await fetch(
    `${baseUrl()}/api/v1/businesses/${businessId}/reminder-rules/${ruleId}`,
    { credentials: "include" }
  );

  if (!response.ok) {
    throw new Error(await parseErrorDetail(response, "Failed to load reminder rule."));
  }

  return response.json();
}

export async function updateReminderRule(
  businessId: string,
  ruleId: string,
  request: UpdateReminderRuleRequest
): Promise<ReminderRule> {
  const response = await fetch(
    `${baseUrl()}/api/v1/businesses/${businessId}/reminder-rules/${ruleId}`,
    {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    }
  );

  if (!response.ok) {
    throw new Error(await parseErrorDetail(response, "Failed to update reminder rule."));
  }

  return response.json();
}

export async function initializeDefaultReminderRules(businessId: string): Promise<ReminderRule[]> {
  const response = await fetch(
    `${baseUrl()}/api/v1/businesses/${businessId}/reminder-rules/initialize-defaults`,
    {
      method: "POST",
      credentials: "include",
    }
  );

  if (!response.ok) {
    throw new Error(await parseErrorDetail(response, "Failed to initialize default rules."));
  }

  return response.json();
}
