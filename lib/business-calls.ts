import { apiFetch } from "@/lib/api";

export type CallActivity = {
  id: number;
  business_user_id?: number | null;
  recruiter_user_id?: number | null;
  candidate_user_id?: number | null;
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

export async function fetchApplicationCallActivities(applicationId: number) {
  return apiFetch<{ ok: boolean; items: CallActivity[] }>(
    `/api/business/calls/application/${applicationId}`
  );
}

export async function updateCallActivity(
  callId: number,
  payload: { notes?: string | null; outcome?: string | null }
) {
  return apiFetch<{ ok: boolean; call: CallActivity }>(`/api/business/calls/${callId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}
