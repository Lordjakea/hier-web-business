import { apiFetch } from "@/lib/api";

export type TeamResponse = {
  ok: boolean;
  is_owner: boolean;
  business_account_id: number;
  members: any[];
  invites: any[];
  seat_usage: {
    total_available_seats: number;
    active_recruiter_seats: number;
    available_seats: number;
    pending_invites: number;
  };
};

export function fetchTeam() {
  return apiFetch<TeamResponse>("/api/business/team");
}

export function inviteTeamMember(email: string) {
  return apiFetch("/api/business/team/invite", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export function removeTeamMember(memberId: number) {
  return apiFetch(`/api/business/team/members/${memberId}`, {
    method: "DELETE",
  });
}

export function cancelInvite(inviteId: number) {
  return apiFetch(`/api/business/team/invites/${inviteId}`, {
    method: "DELETE",
  });
}