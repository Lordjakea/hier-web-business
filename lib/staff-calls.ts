import { apiFetch } from "@/lib/api";

export type CallActivity = {
  id: number;
  business_user_id?: number | null;
  recruiter_user_id?: number | null;
  candidate_user_id?: number | null;
  staff_lead_id?: number | null;
  application_id?: number | null;
  direction?: string | null;
  phone_number?: string | null;
  circleloop_event_type?: string | null;
  circleloop_call_id?: string | null;
  started_at?: string | null;
  ended_at?: string | null;
  duration_seconds?: number | null;
  recording_url?: string | null;
  outcome?: string | null;
  notes?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export async function fetchStaffLeadCallActivities(leadId: number) {
  return apiFetch<{ ok: boolean; items: CallActivity[] }>(
    `/api/staff/calls/lead/${leadId}`
  );
}

export async function fetchStaffAccountCallActivities(userId: number) {
  return apiFetch<{ ok: boolean; items: CallActivity[] }>(
    `/api/staff/calls/account/${userId}`
  );
}

export async function createStaffCallActivity(payload: {
  phone_number: string;
  staff_lead_id?: number | null;
  account_user_id?: number | null;
}) {
  return apiFetch<{ ok: boolean; call: CallActivity }>("/api/staff/calls", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateStaffCallActivity(
  callId: number,
  payload: { notes?: string | null; outcome?: string | null }
) {
  return apiFetch<{ ok: boolean; call: CallActivity }>(`/api/staff/calls/${callId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export type CallAnalyticsPeriod = "day" | "week" | "month" | "year" | "all";

export type CallAnalyticsAdviser = {
  staff_user_id: number | null;
  name: string;
  email?: string | null;
  total: number;
  outcomes: Record<string, number>;
};

export type CallAnalyticsResponse = {
  ok: boolean;
  period: CallAnalyticsPeriod;
  range: { from?: string | null; to?: string | null };
  outcomes: string[];
  extra_buckets: string[];
  advisers: CallAnalyticsAdviser[];
  totals: { total: number; outcomes: Record<string, number> };
};

export async function fetchStaffCallAnalytics(period: CallAnalyticsPeriod = "month") {
  return apiFetch<CallAnalyticsResponse>(
    `/api/staff/calls/analytics?period=${encodeURIComponent(period)}`
  );
}
