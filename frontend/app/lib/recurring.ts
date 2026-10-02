export interface CreateRecurringScheduleRequest {
  customerId: string;
  invoiceTemplateId: string;
  frequency: string;
  startDate: string;
  endDate?: string;
  autoSend: boolean;
}

export interface RecurringSchedule {
  id: string;
  customerId: string;
  invoiceTemplateId: string;
  frequency: string;
  startDate: string;
  endDate?: string;
  nextRunDate: string;
  autoSend: boolean;
  isActive: boolean;
  createdAt: string;
}

function baseUrl(): string {
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5094";
}

async function parseErrorDetail(response: Response, fallback: string): Promise<string> {
  const problem = await response.json().catch(() => null);
  return problem?.detail ?? fallback;
}

export async function createRecurringSchedule(
  businessId: string,
  request: CreateRecurringScheduleRequest
): Promise<RecurringSchedule> {
  const response = await fetch(`${baseUrl()}/api/v1/businesses/${businessId}/recurring-schedules`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(await parseErrorDetail(response, "Failed to create recurring schedule."));
  }

  return response.json();
}

export async function listRecurringSchedules(businessId: string): Promise<RecurringSchedule[]> {
  const response = await fetch(`${baseUrl()}/api/v1/businesses/${businessId}/recurring-schedules`, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(await parseErrorDetail(response, "Failed to load recurring schedules."));
  }

  return response.json();
}

export async function getRecurringSchedule(
  businessId: string,
  scheduleId: string
): Promise<RecurringSchedule> {
  const response = await fetch(
    `${baseUrl()}/api/v1/businesses/${businessId}/recurring-schedules/${scheduleId}`,
    { credentials: "include" }
  );

  if (!response.ok) {
    throw new Error(await parseErrorDetail(response, "Failed to load recurring schedule."));
  }

  return response.json();
}
