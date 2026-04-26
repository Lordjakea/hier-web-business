import { apiFetch } from "@/lib/api";

export type StaffMe = {
  id: number;
  email: string;
  full_name?: string | null;
  role?: string | null;
  staff_role?: string | null;
  email_verified?: boolean | null;
  is_staff?: boolean | null;
};

export type StaffAccountSearchItem = {
  id: number;
  user_id: number;
  account_type: "business" | "candidate" | string;
  display_name: string;
  email?: string | null;
  phone?: string | null;
  role?: string | null;
  is_active?: boolean | null;
  email_verified?: boolean | null;
  company_name?: string | null;
  company_number?: string | null;
  business_verified?: boolean | null;
  plan_code?: string | null;
  billing_status?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type StaffNote = {
  id: number;
  entity_type: string;
  entity_id: number;
  note: string;
  is_private: boolean;
  author_user_id?: number | null;
  author_name?: string | null;
  author_email?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type StaffAccountDetail = {
  account_type: "business" | "candidate" | string;
  basic: {
    id: number;
    role?: string | null;
    staff_role?: string | null;
    email?: string | null;
    phone?: string | null;
    full_name?: string | null;
    display_name?: string | null;
    is_active?: boolean | null;
    email_verified?: boolean | null;
    phone_verified?: boolean | null;
    created_at?: string | null;
    updated_at?: string | null;
  } | null;
  user_profile?: Record<string, any> | null;
  business_profile?: Record<string, any> | null;
  business_account?: Record<string, any> | null;
  metrics: {
    total_posts?: number;
    live_posts?: number;
    archived_posts?: number;
    applications_total?: number;
  };
  recent_posts: Array<Record<string, any>>;
  recent_applications: Array<Record<string, any>>;
  notes: StaffNote[];
};

export type StaffInvite = {
  id: number;
  email: string;
  staff_role: string;
  status: "pending" | "accepted" | "expired" | "revoked" | string;
  invited_by_email?: string | null;
  accepted_by_user_id?: number | null;
  accepted_at?: string | null;
  expires_at?: string | null;
  revoked_at?: string | null;
  created_at?: string | null;
};

export type StaffTeamUser = {
  id: number;
  email: string;
  full_name?: string | null;
  role?: string | null;
  staff_role?: string | null;
  is_active?: boolean | null;
  email_verified?: boolean | null;
  created_at?: string | null;
};

export type StaffBillingPlan = {
  id: number;
  code: string;
  name: string;
  price_monthly?: number | null;
  currency?: string | null;
  is_active?: boolean | null;
};

export type StaffBilling = {
  id: number;
  owner_user_id: number;
  status?: string | null;
  plan_code?: string | null;
  trial_ends_at?: string | null;
  stripe_customer_id?: string | null;
  subscription_status?: string | null;
  subscription_current_period_end?: string | null;
  subscription_cancel_at_period_end?: boolean | null;
  monthly_boost_credits?: number | null;
  monthly_boost_credits_used?: number | null;
  monthly_boost_credits_remaining?: number | null;
  paid_boost_credits?: number | null;
  paid_boost_credits_used?: number | null;
  paid_boost_credits_remaining?: number | null;
  boost_credits_reset_at?: string | null;
  subscription?: Record<string, any> | null;
};

export type StaffBillingResponse = {
  ok: boolean;
  billing: StaffBilling;
  plans: StaffBillingPlan[];
  allowed_statuses: string[];
};

export async function fetchStaffMe() {
  return apiFetch<{ ok: boolean; staff: StaffMe }>("/api/staff/me");
}

export async function searchStaffAccounts(params?: {
  q?: string;
  role?: string;
  per_page?: number;
}) {
  const search = new URLSearchParams();

  if (params?.q?.trim()) search.set("q", params.q.trim());
  if (params?.role && params.role !== "all") search.set("role", params.role);
  if (params?.per_page) search.set("per_page", String(params.per_page));

  const query = search.toString();

  return apiFetch<{
    ok: boolean;
    items: StaffAccountSearchItem[];
    total?: number;
    page?: number;
    per_page?: number;
    pages?: number;
  }>(`/api/staff/accounts/search${query ? `?${query}` : ""}`);
}

export async function fetchStaffAccount(userId: number | string) {
  return apiFetch<{ ok: boolean; account: StaffAccountDetail }>(
    `/api/staff/accounts/${userId}`
  );
}

export async function fetchStaffAccountBilling(userId: number | string) {
  return apiFetch<StaffBillingResponse>(`/api/staff/accounts/${userId}/billing`);
}

export async function updateStaffAccountBilling(
  userId: number | string,
  payload: {
    plan_code?: string;
    status?: string;
    trial_ends_at?: string | null;
    boost_credits_reset_at?: string | null;
    monthly_boost_credits?: number;
    monthly_boost_credits_used?: number;
    paid_boost_credits?: number;
    paid_boost_credits_used?: number;
    reason: string;
  }
) {
  return apiFetch<{
    ok: boolean;
    billing: StaffBilling;
    changes: Array<{ field: string; old_value: any; new_value: any }>;
  }>(`/api/staff/accounts/${userId}/billing`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function createStaffAccountNote(
  userId: number | string,
  note: string
) {
  return apiFetch<{ ok: boolean; note: StaffNote }>(
    `/api/staff/accounts/${userId}/notes`,
    {
      method: "POST",
      body: JSON.stringify({ note }),
    }
  );
}

export async function updateStaffAccountIdentity(
  userId: number | string,
  payload: {
    email?: string | null;
    phone?: string | null;
    full_name?: string | null;
    reason: string;
  }
) {
  return apiFetch<{
    ok: boolean;
    account: StaffAccountDetail["basic"];
    changes: Array<{
      field: string;
      old_value: any;
      new_value: any;
    }>;
  }>(`/api/staff/accounts/${userId}/identity`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function markStaffAccountEmailVerified(
  userId: number | string,
  reason: string
) {
  return apiFetch<{
    ok: boolean;
    account: StaffAccountDetail["basic"];
  }>(`/api/staff/accounts/${userId}/mark-email-verified`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

export async function resendStaffAccountVerificationEmail(
  userId: number | string,
  reason: string
) {
  return apiFetch<{
    ok: boolean;
    message?: string;
    dev_code?: string;
  }>(`/api/staff/accounts/${userId}/resend-verification-email`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

export async function updateStaffBusinessProfile(
  userId: number | string,
  payload: {
    company_name?: string | null;
    company_number?: string | null;
    address_text?: string | null;
    contact_email?: string | null;
    contact_phone?: string | null;
    bio?: string | null;
    verified?: boolean;
    reason: string;
  }
) {
  return apiFetch<{
    ok: boolean;
    business_profile: Record<string, any> | null;
    changes: Array<{
      field: string;
      old_value: any;
      new_value: any;
    }>;
  }>(`/api/staff/accounts/${userId}/business-profile`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function fetchStaffTeam() {
  return apiFetch<{ ok: boolean; staff: StaffTeamUser[]; invites: StaffInvite[] }>(
    "/api/staff/team"
  );
}

export async function createStaffInvite(email: string, staffRole: string) {
  return apiFetch<{
    ok: boolean;
    invite: StaffInvite;
    invite_url?: string;
    warning?: string;
  }>("/api/staff/invites", {
    method: "POST",
    body: JSON.stringify({ email, staff_role: staffRole }),
  });
}

export async function inspectStaffInvite(token: string) {
  return apiFetch<{
    ok: boolean;
    invite: { email: string; staff_role: string; expires_at?: string | null };
  }>(`/api/staff/invites/${token}`);
}

export async function acceptStaffInvite(
  token: string,
  payload: { full_name: string; password: string; confirm_password: string }
) {
  return apiFetch<{
    ok: boolean;
    access_token: string;
    refresh_token: string;
    user: StaffMe;
  }>(`/api/staff/invites/${token}/accept`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export const fetchStaffAccountDetail = fetchStaffAccount;

export async function fetchStaffAccountPosts(userId: number | string) {
  return apiFetch<{ ok: boolean; items: any[] }>(
    `/api/staff/accounts/${userId}/posts`
  );
}

export async function removeStaffPost(postId: number | string, reason: string) {
  return apiFetch<{
    ok: boolean;
    post?: any;
    note?: StaffNote;
    warning?: string;
  }>(`/api/staff/posts/${postId}/remove`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}