import { apiFetch } from "@/lib/api";

export type BusinessTeamUser = {
  id?: number;
  email?: string | null;
  full_name?: string | null;
  role?: string | null;
  is_active?: boolean;
};

export type BusinessTeamMember = {
  id: number;
  business_account_id?: number;
  user_id?: number;
  role?: string | null;
  status?: string | null;
  invited_at?: string | null;
  joined_at?: string | null;
  removed_at?: string | null;
  user?: BusinessTeamUser | null;
  created_at?: string | null;
};

export type BusinessTeamInvite = {
  id: number;
  business_account_id?: number;
  email?: string | null;
  role?: string | null;
  status?: string | null;
  expires_at?: string | null;
  created_at?: string | null;
};

export type BusinessSeatUsage = {
  included_recruiter_seats?: number;
  extra_recruiter_seats?: number;
  total_available_seats?: number;
  active_members?: number;
  active_recruiter_seats?: number;
  pending_invites?: number;
  used_or_pending?: number;
  available_seats?: number;
  available_seats_after_pending?: number;
};

export type BusinessTeamResponse = {
  ok: boolean;
  is_owner?: boolean;
  business_account_id?: number;
  members?: BusinessTeamMember[];
  invites?: BusinessTeamInvite[];
  seat_usage?: BusinessSeatUsage;
  generated_at?: string | null;
};

export type BusinessInviteResponse = {
  ok: boolean;
  already_exists?: boolean;
  invite?: BusinessTeamInvite;
  invite_url?: string | null;
  seat_usage?: BusinessSeatUsage;
};

export function fetchTeam() {
  return apiFetch<BusinessTeamResponse>("/api/business/team");
}

export function inviteTeamMember(email: string, role = "recruiter") {
  return apiFetch<BusinessInviteResponse>("/api/business/team/invite", {
    method: "POST",
    body: JSON.stringify({ email, role }),
  });
}

export function removeTeamMember(memberId: number) {
  return apiFetch<BusinessInviteResponse>(`/api/business/team/members/${memberId}`, {
    method: "DELETE",
  });
}

export function cancelInvite(inviteId: number) {
  return apiFetch<BusinessInviteResponse>(`/api/business/team/invites/${inviteId}`, {
    method: "DELETE",
  });
}