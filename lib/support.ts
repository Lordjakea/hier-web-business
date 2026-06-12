import { apiFetch } from "@/lib/api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TicketCategory =
  | "bug_report"
  | "billing"
  | "account_issue"
  | "feature_request"
  | "general";

export interface CategoryOption {
  value: TicketCategory;
  label: string;
}

export interface CaseMessage {
  id: number;
  case_id: number;
  author_user_id: number | null;
  author_type: "customer" | "staff" | "ai";
  body: string;
  created_at: string;
  updated_at: string;
}

export interface SupportTicket {
  id: number;
  title: string;
  summary: string | null;
  status: "open" | "pending" | "closed";
  category: TicketCategory | null;
  category_label: string;
  source: "customer" | "staff";
  created_at: string;
  updated_at: string;
  messages?: CaseMessage[];
}

// ---------------------------------------------------------------------------
// Category list
// ---------------------------------------------------------------------------

export async function fetchSupportCategories(): Promise<CategoryOption[]> {
  const res = await apiFetch<{ ok: boolean; categories: CategoryOption[] }>(
    "/api/support/categories"
  );
  return res.categories;
}

// ---------------------------------------------------------------------------
// Customer ticket CRUD
// ---------------------------------------------------------------------------

export async function createSupportTicket(payload: {
  title: string;
  description: string;
  category: TicketCategory;
}): Promise<SupportTicket> {
  const res = await apiFetch<{ ok: boolean; ticket: SupportTicket }>(
    "/api/support/tickets",
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );
  return res.ticket;
}

export async function fetchSupportTickets(
  status: "all" | "open" | "pending" | "closed" = "all"
): Promise<SupportTicket[]> {
  const params = status !== "all" ? `?status=${status}` : "";
  const res = await apiFetch<{ ok: boolean; tickets: SupportTicket[] }>(
    `/api/support/tickets${params}`
  );
  return res.tickets;
}

export async function fetchSupportTicket(id: number): Promise<SupportTicket> {
  const res = await apiFetch<{ ok: boolean; ticket: SupportTicket }>(
    `/api/support/tickets/${id}`
  );
  return res.ticket;
}

export async function addTicketMessage(
  ticketId: number,
  body: string
): Promise<CaseMessage> {
  const res = await apiFetch<{ ok: boolean; message: CaseMessage }>(
    `/api/support/tickets/${ticketId}/messages`,
    {
      method: "POST",
      body: JSON.stringify({ body }),
    }
  );
  return res.message;
}

// ---------------------------------------------------------------------------
// Staff-facing helpers (called from staff pages)
// ---------------------------------------------------------------------------

export async function addStaffCaseMessage(
  caseId: number,
  body: string
): Promise<CaseMessage> {
  const res = await apiFetch<{ ok: boolean; message: CaseMessage }>(
    `/api/staff/cases/${caseId}/messages`,
    {
      method: "POST",
      body: JSON.stringify({ body }),
    }
  );
  return res.message;
}

export async function fetchStaffCaseMessages(
  caseId: number
): Promise<CaseMessage[]> {
  const res = await apiFetch<{ ok: boolean; messages: CaseMessage[] }>(
    `/api/staff/cases/${caseId}/messages`
  );
  return res.messages;
}

export async function suggestStaffReply(caseId: number): Promise<string> {
  const res = await apiFetch<{ ok: boolean; suggestion: string }>(
    `/api/staff/cases/${caseId}/suggest-reply`,
    { method: "POST" }
  );
  return res.suggestion;
}

// ---------------------------------------------------------------------------
// Status helpers
// ---------------------------------------------------------------------------

export const STATUS_LABELS: Record<string, string> = {
  open: "Open",
  pending: "Pending reply",
  closed: "Closed",
};

export const STATUS_COLOURS: Record<string, string> = {
  open: "bg-green-100 text-green-800",
  pending: "bg-yellow-100 text-yellow-800",
  closed: "bg-hier-soft text-hier-muted",
};
