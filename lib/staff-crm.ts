import { apiFetch, resolveApiUrl } from "@/lib/api";
import { getAuthToken } from "@/lib/auth";

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
  marketing_opt_in?: boolean | null;
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
    marketing_opt_in?: boolean | null;
    marketing_opt_in_at?: string | null;
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
  billing_provider?: string | null;
  stripe_management_available?: boolean | null;
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
  coupons?: Array<{
    code?: string | null;
    promotion_code_id?: string | null;
    coupon_id?: string | null;
    source?: string | null;
    created_at?: string | null;
  }>;
  subscription?: Record<string, any> | null;
};

export type StaffBillingResponse = {
  ok: boolean;
  billing: StaffBilling;
  plans: StaffBillingPlan[];
  allowed_statuses: string[];
};

export type StaffBillingPreview = {
  ok: boolean;
  mode: string;
  direction?: string | null;
  current_plan_code?: string | null;
  target_plan_code?: string | null;
  message?: string | null;
  currency?: string | null;
  amount_due_now?: number | null;
  total?: number | null;
  subtotal?: number | null;
  current_period_end?: string | null;
  lines?: Array<{
    id?: string | null;
    description?: string | null;
    amount?: number | null;
    currency?: string | null;
    proration?: boolean | null;
    type?: string | null;
    period?: Record<string, any>;
  }>;
};

export type StaffCrmReportResponse = {
  ok: boolean;
  period: { from?: string | null; to?: string | null; label?: string | null };
  summary: {
    total_businesses: number;
    total_candidates: number;
    new_businesses_30d: number;
    new_candidates_30d: number;
    cancellations: number;
    pending_subscriptions: number;
    marketing_opted_in: number;
  };
  business_statuses: Record<string, number>;
  subscription_statuses: Record<string, number>;
  filtered_accounts: StaffAccountSearchItem[];
  plans: StaffBillingPlan[];
  marketing_opted_in_preview: Array<{
    id: number;
    account_type: string;
    display_name: string;
    email?: string | null;
    phone?: string | null;
    company_name?: string | null;
    marketing_opt_in_at?: string | null;
    created_at?: string | null;
  }>;
};

export type StaffLead = {
  id: number;
  name: string;
  phone?: string | null;
  email: string;
  business_name?: string | null;
  job_title?: string | null;
  contacts?: Array<{
    name?: string | null;
    job_title?: string | null;
    email?: string | null;
    phone?: string | null;
  }>;
  lead_type?: "business" | "candidate" | string | null;
  website_url?: string | null;
  address?: string | null;
  address_line_1?: string | null;
  address_line_2?: string | null;
  town?: string | null;
  city?: string | null;
  postcode?: string | null;
  marketing_opt_in?: boolean | null;
  marketing_opt_in_at?: string | null;
  status?: string | null;
  source?: string | null;
  owner_staff_user_id?: number | null;
  created_by_staff_user_id?: number | null;
  converted_user_id?: number | null;
  notes?: StaffNote[];
  follow_ups?: StaffFollowUp[];
  created_at?: string | null;
  updated_at?: string | null;
};

export type StaffHiringIntelligenceLead = {
  id: number;
  company_name: string;
  website_url?: string | null;
  lead_id?: number | null;
  job_title?: string | null;
  job_location?: string | null;
  job_platform?: string | null;
  job_url?: string | null;
  job_posted_at?: string | null;
  job_detected_at?: string | null;
  last_seen_hiring_at?: string | null;
  contact_name?: string | null;
  contact_role?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  contact_linkedin_url?: string | null;
  contact_source_url?: string | null;
  contact_confidence?: "high" | "medium" | "low" | string | null;
  hiring_signal_score?: number | null;
  intelligence_status?: "new" | "reviewed" | "approved" | "converted" | "ignored" | string | null;
  source_count?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type StaffHiringIntelligenceSource = {
  id: number;
  company_name: string;
  website_url?: string | null;
  careers_url: string;
  platform?: string | null;
  location_hint?: string | null;
  is_enabled?: boolean | null;
  last_scanned_at?: string | null;
  last_scan_status?: string | null;
  last_scan_error?: string | null;
  last_jobs_found_count?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type StaffHiringIntelligenceDiscoveryQuery = {
  id: number;
  query: string;
  location_hint?: string | null;
  platform_hint?: string | null;
  is_enabled?: boolean | null;
  last_run_at?: string | null;
  last_run_status?: string | null;
  last_run_error?: string | null;
  last_results_count?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type StaffHiringIntelligenceSearchUsage = {
  provider: "brave" | string;
  monthly_limit: number;
  monthly_used: number;
  monthly_remaining: number;
  per_scan_limit: number;
  configured: boolean;
};

export type StaffFollowUp = {
  id: number;
  entity_type: "lead" | "account" | string;
  entity_id: number;
  title: string;
  note?: string | null;
  due_at?: string | null;
  status?: "scheduled" | "completed" | "cancelled" | string;
  assigned_staff_user_id?: number | null;
  created_by_staff_user_id?: number | null;
  assigned_staff_name?: string | null;
  created_by_staff_name?: string | null;
  completed_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type StaffNotification = {
  id: number;
  user_id: number;
  kind: string;
  title: string;
  body?: string | null;
  meta?: Record<string, any> | null;
  is_read?: boolean | null;
  read_at?: string | null;
  created_at?: string | null;
};

export type StaffCase = {
  id: number;
  account_user_id: number;
  title: string;
  summary?: string | null;
  status: "open" | "pending" | "closed" | string;
  owner_staff_user_id?: number | null;
  created_by_staff_user_id?: number | null;
  owner_staff_name?: string | null;
  created_by_staff_name?: string | null;
  account_name?: string | null;
  closed_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  thread?: StaffNote[];
};

export type StaffPolicyLink = {
  key: string;
  title: string;
  description: string;
  href: string;
};

export async function fetchStaffMe() {
  return apiFetch<{ ok: boolean; staff: StaffMe }>("/api/staff/me");
}

export async function fetchPolicyLinks() {
  return apiFetch<{ ok: boolean; policies: Record<string, StaffPolicyLink> }>(
    "/api/staff/policies"
  );
}

export async function updatePolicyLinks(policies: Record<string, { href: string }>) {
  return apiFetch<{ ok: boolean; policies: Record<string, StaffPolicyLink> }>(
    "/api/staff/policies",
    {
      method: "PATCH",
      body: JSON.stringify({ policies }),
    }
  );
}

export async function fetchStaffCrmReports() {
  return apiFetch<StaffCrmReportResponse>("/api/staff/crm-reports");
}

export async function fetchFilteredStaffCrmReports(filter: string) {
  const query = filter && filter !== "all" ? `?filter=${encodeURIComponent(filter)}` : "";
  return apiFetch<StaffCrmReportResponse>(`/api/staff/crm-reports${query}`);
}

export function getMarketingOptInsCsvUrl() {
  return resolveApiUrl("/api/staff/crm-reports/marketing-opt-ins.csv");
}

export async function createStaffAccount(payload: {
  role: "user" | "business_user";
  email: string;
  phone?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  full_name?: string | null;
  company_name?: string | null;
  company_number?: string | null;
  address?: string | null;
  marketing_opt_in?: boolean;
  accepted_terms?: boolean;
  plan_code?: string | null;
  billing_email?: string | null;
  billing_name?: string | null;
  trial_ends_at?: string | null;
}) {
  return apiFetch<{
    ok: boolean;
    account: Partial<StaffAccountDetail> & {
      basic?: StaffAccountDetail["basic"];
    };
    warnings?: string[];
  }>("/api/staff/accounts", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function createStaffBillingCheckout(
  userId: number | string,
  planCode: string
) {
  return apiFetch<{
    ok: boolean;
    checkout_url?: string;
    checkout_session_id?: string;
    plan?: StaffBillingPlan;
    billing?: StaffBilling;
  }>(`/api/staff/accounts/${userId}/billing-checkout`, {
    method: "POST",
    body: JSON.stringify({ plan_code: planCode }),
  });
}

export async function createStaffBillingPortal(userId: number | string) {
  return apiFetch<{
    ok: boolean;
    portal_url?: string;
    billing?: StaffBilling;
  }>(`/api/staff/accounts/${userId}/billing-portal`, {
    method: "POST",
  });
}

export async function resumeStaffBillingSubscription(userId: number | string) {
  return apiFetch<{
    ok: boolean;
    message?: string;
    billing?: StaffBilling;
  }>(`/api/staff/accounts/${userId}/billing-resume`, {
    method: "POST",
  });
}

export async function previewStaffBillingChange(
  userId: number | string,
  planCode: string
) {
  return apiFetch<StaffBillingPreview>(`/api/staff/accounts/${userId}/billing-preview`, {
    method: "POST",
    body: JSON.stringify({ plan_code: planCode }),
  });
}

export async function createStaffBillingCredit(
  userId: number | string,
  payload: { amount: number; currency?: string; reason: string }
) {
  return apiFetch<{
    ok: boolean;
    transaction?: Record<string, any>;
    billing?: StaffBilling;
  }>(`/api/staff/accounts/${userId}/billing-credit`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function createStaffSupportSession(userId: number | string) {
  return apiFetch<{
    ok: boolean;
    access_token: string;
    refresh_token: string;
    user: any;
  }>(`/api/staff/accounts/${userId}/support-session`, {
    method: "POST",
  });
}

export async function searchStaffAccounts(params?: {
  q?: string;
  role?: string;
  per_page?: number;
  include_test?: boolean;
}) {
  const search = new URLSearchParams();

  if (params?.q?.trim()) search.set("q", params.q.trim());
  if (params?.role && params.role !== "all") search.set("role", params.role);
  if (params?.per_page) search.set("per_page", String(params.per_page));
  search.set("include_test", params?.include_test === false ? "false" : "true");

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

export async function fetchStaffLeads(params?: {
  q?: string;
  status?: string;
  lead_type?: string;
  city?: string;
}) {
  const search = new URLSearchParams();
  if (params?.q?.trim()) search.set("q", params.q.trim());
  if (params?.status && params.status !== "all") search.set("status", params.status);
  if (params?.lead_type && params.lead_type !== "all") search.set("lead_type", params.lead_type);
  if (params?.city?.trim()) search.set("city", params.city.trim());
  const query = search.toString();
  return apiFetch<{ ok: boolean; items: StaffLead[] }>(
    `/api/staff/leads${query ? `?${query}` : ""}`
  );
}

export async function fetchStaffHiringIntelligenceLeads(params?: {
  q?: string;
  platform?: string;
  status?: string;
  confidence?: string;
  location?: string;
}) {
  const search = new URLSearchParams();
  if (params?.q?.trim()) search.set("q", params.q.trim());
  if (params?.platform?.trim() && params.platform !== "all") search.set("platform", params.platform.trim());
  if (params?.status?.trim() && params.status !== "all") search.set("status", params.status.trim());
  if (params?.confidence?.trim() && params.confidence !== "all") search.set("confidence", params.confidence.trim());
  if (params?.location?.trim()) search.set("location", params.location.trim());
  const query = search.toString();

  return apiFetch<{
    ok: boolean;
    items: StaffHiringIntelligenceLead[];
    total?: number;
  }>(`/api/staff/leads/intelligence${query ? `?${query}` : ""}`);
}

export async function runStaffHiringIntelligenceScan() {
  return apiFetch<{
    ok: boolean;
    message?: string;
    scan_id?: number | string;
    sources_scanned?: number;
    jobs_found?: number;
  }>("/api/staff/leads/intelligence/run-scan", {
    method: "POST",
  });
}

export async function fetchStaffHiringIntelligenceSources() {
  return apiFetch<{
    ok: boolean;
    items: StaffHiringIntelligenceSource[];
  }>("/api/staff/leads/intelligence/sources");
}

export async function fetchStaffHiringIntelligenceDiscoveryQueries() {
  return apiFetch<{
    ok: boolean;
    items: StaffHiringIntelligenceDiscoveryQuery[];
    usage: StaffHiringIntelligenceSearchUsage;
  }>("/api/staff/leads/intelligence/discovery");
}

export async function createStaffHiringIntelligenceDiscoveryQuery(payload: {
  query: string;
  location_hint?: string | null;
  platform_hint?: string | null;
  is_enabled?: boolean;
}) {
  return apiFetch<{
    ok: boolean;
    query: StaffHiringIntelligenceDiscoveryQuery;
  }>("/api/staff/leads/intelligence/discovery", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateStaffHiringIntelligenceDiscoveryQuery(
  id: number | string,
  payload: Partial<Pick<
    StaffHiringIntelligenceDiscoveryQuery,
    "query" | "location_hint" | "platform_hint" | "is_enabled"
  >>
) {
  return apiFetch<{
    ok: boolean;
    query: StaffHiringIntelligenceDiscoveryQuery;
  }>(`/api/staff/leads/intelligence/discovery/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function createStaffHiringIntelligenceSource(payload: {
  company_name: string;
  website_url?: string | null;
  careers_url: string;
  platform?: string | null;
  location_hint?: string | null;
  is_enabled?: boolean;
}) {
  return apiFetch<{
    ok: boolean;
    source: StaffHiringIntelligenceSource;
  }>("/api/staff/leads/intelligence/sources", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateStaffHiringIntelligenceSource(
  id: number | string,
  payload: Partial<Pick<
    StaffHiringIntelligenceSource,
    "company_name" | "website_url" | "careers_url" | "platform" | "location_hint" | "is_enabled"
  >>
) {
  return apiFetch<{
    ok: boolean;
    source: StaffHiringIntelligenceSource;
  }>(`/api/staff/leads/intelligence/sources/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteStaffHiringIntelligenceSource(id: number | string) {
  return apiFetch<{
    ok: boolean;
    deleted: boolean;
    source_id: number | string;
  }>(`/api/staff/leads/intelligence/sources/${id}`, {
    method: "DELETE",
  });
}

export async function approveStaffHiringIntelligenceLead(id: number | string) {
  return apiFetch<{
    ok: boolean;
    item?: StaffHiringIntelligenceLead;
    lead?: StaffHiringIntelligenceLead;
  }>(`/api/staff/leads/intelligence/${id}/approve`, {
    method: "POST",
  });
}

export async function ignoreStaffHiringIntelligenceLead(id: number | string) {
  return apiFetch<{
    ok: boolean;
    item?: StaffHiringIntelligenceLead;
    lead?: StaffHiringIntelligenceLead;
  }>(`/api/staff/leads/intelligence/${id}/ignore`, {
    method: "POST",
  });
}

export async function deleteStaffHiringIntelligenceLead(id: number | string) {
  return apiFetch<{
    ok: boolean;
    deleted: boolean;
    item_id: number | string;
  }>(`/api/staff/leads/intelligence/${id}`, {
    method: "DELETE",
  });
}

export async function convertStaffHiringIntelligenceLeadToLead(id: number | string) {
  return apiFetch<{
    ok: boolean;
    item?: StaffHiringIntelligenceLead;
    intelligence_lead?: StaffHiringIntelligenceLead;
    lead?: StaffLead;
  }>(`/api/staff/leads/intelligence/${id}/convert-to-lead`, {
    method: "POST",
  });
}

export async function createStaffLead(payload: {
  name: string;
  phone?: string | null;
  email: string;
  business_name?: string | null;
  job_title?: string | null;
  contacts?: Array<{
    name?: string | null;
    job_title?: string | null;
    email?: string | null;
    phone?: string | null;
  }>;
  lead_type?: "business" | "candidate" | string | null;
  website_url?: string | null;
  address?: string | null;
  address_line_1?: string | null;
  address_line_2?: string | null;
  town?: string | null;
  city?: string | null;
  postcode?: string | null;
  source?: string | null;
  marketing_opt_in?: boolean;
}) {
  return apiFetch<{ ok: boolean; lead: StaffLead }>("/api/staff/leads", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateStaffLead(
  leadId: number | string,
  payload: Partial<
    Pick<
      StaffLead,
      | "name"
      | "phone"
      | "email"
      | "business_name"
      | "job_title"
      | "contacts"
      | "lead_type"
      | "website_url"
      | "address"
      | "address_line_1"
      | "address_line_2"
      | "town"
      | "city"
      | "postcode"
      | "source"
      | "marketing_opt_in"
      | "status"
    >
  >
) {
  return apiFetch<{ ok: boolean; lead: StaffLead }>(`/api/staff/leads/${leadId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteStaffLead(leadId: number | string) {
  return apiFetch<{ ok: boolean; deleted: boolean; lead_id: number }>(
    `/api/staff/leads/${leadId}`,
    { method: "DELETE" }
  );
}

export async function convertStaffLead(
  leadId: number | string,
  payload: { role?: "user" | "business_user"; company_number?: string | null; plan_code?: string | null } = {}
) {
  return apiFetch<{
    ok: boolean;
    lead: StaffLead;
    account: StaffAccountDetail;
  }>(`/api/staff/leads/${leadId}/convert`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function createStaffLeadNote(leadId: number | string, note: string) {
  return apiFetch<{ ok: boolean; note: StaffNote }>(`/api/staff/leads/${leadId}/notes`, {
    method: "POST",
    body: JSON.stringify({ note }),
  });
}

export async function fetchStaffFollowUps(params?: {
  entity_type?: "lead" | "account" | string;
  entity_id?: number | string;
  status?: string;
  assigned_staff_user_id?: number | string;
}) {
  const search = new URLSearchParams();
  if (params?.entity_type) search.set("entity_type", params.entity_type);
  if (params?.entity_id) search.set("entity_id", String(params.entity_id));
  if (params?.status && params.status !== "all") search.set("status", params.status);
  if (params?.assigned_staff_user_id) search.set("assigned_staff_user_id", String(params.assigned_staff_user_id));
  const query = search.toString();
  return apiFetch<{ ok: boolean; items: StaffFollowUp[] }>(
    `/api/staff/follow-ups${query ? `?${query}` : ""}`
  );
}

export async function createStaffFollowUp(payload: {
  entity_type: "lead" | "account" | string;
  entity_id: number | string;
  title: string;
  note?: string | null;
  due_at: string;
  assigned_staff_user_id?: number | string | null;
}) {
  return apiFetch<{ ok: boolean; follow_up: StaffFollowUp }>("/api/staff/follow-ups", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateStaffFollowUp(
  followUpId: number | string,
  payload: Partial<Pick<StaffFollowUp, "title" | "note" | "due_at" | "status" | "assigned_staff_user_id">>
) {
  return apiFetch<{ ok: boolean; follow_up: StaffFollowUp }>(
    `/api/staff/follow-ups/${followUpId}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    }
  );
}

export async function createStaffAccountNote(
  userId: number | string,
  note: string,
  mentionedStaffUserIds: Array<number | string> = []
) {
  return apiFetch<{ ok: boolean; note: StaffNote }>(
    `/api/staff/accounts/${userId}/notes`,
    {
      method: "POST",
      body: JSON.stringify({ note, mentioned_staff_user_ids: mentionedStaffUserIds }),
    }
  );
}

export async function fetchStaffNotifications() {
  return apiFetch<{ ok: boolean; items: StaffNotification[]; unread_count: number }>(
    "/api/staff/notifications"
  );
}

export async function updateStaffNotification(notificationId: number | string, isRead = true) {
  return apiFetch<{ ok: boolean; notification: StaffNotification }>(
    `/api/staff/notifications/${notificationId}`,
    { method: "PATCH", body: JSON.stringify({ is_read: isRead }) }
  );
}

export async function updateStaffAccountIdentity(
  userId: number | string,
  payload: {
    email?: string | null;
    phone?: string | null;
    full_name?: string | null;
    marketing_opt_in?: boolean;
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

export async function verifyStaffAccountEmailCode(
  userId: number | string,
  code: string,
  reason: string
) {
  return apiFetch<{
    ok: boolean;
    account: StaffAccountDetail["basic"];
    message?: string;
  }>(`/api/staff/accounts/${userId}/verify-email-code`, {
    method: "POST",
    body: JSON.stringify({ code, reason }),
  });
}

export async function sendStaffAccountPasswordReset(
  userId: number | string,
  reason: string,
  email?: string | null
) {
  const normalizedEmail = email?.trim().toLowerCase();

  if (!normalizedEmail) {
    throw new Error("This account does not have an email address for password reset.");
  }

  const token = getAuthToken();
  const response = await fetch(`/api/staff-password-reset-link/${userId}`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ email: normalizedEmail, reason }),
    cache: "no-store",
  });

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message =
      typeof payload === "string"
        ? payload
        : payload?.msg || payload?.error || payload?.message || "Could not send password reset link.";

    throw new Error(message);
  }

  return payload as {
    ok: boolean;
    message?: string;
  };
}

export async function deleteStaffAccount(
  userId: number | string,
  reason: string,
  options?: {
    confirm_delete?: boolean;
    cancel_stripe_subscription?: boolean;
  }
) {
  const token = getAuthToken();

  const response = await fetch(`/api/staff-account-delete/${userId}`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      reason,
      confirm_delete: Boolean(options?.confirm_delete),
      cancel_stripe_subscription: Boolean(options?.cancel_stripe_subscription),
    }),
    cache: "no-store",
  });

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message =
      typeof payload === "string"
        ? payload
        : payload?.msg || payload?.error || payload?.message || "Could not delete this account.";

    throw new Error(message);
  }

  return payload as {
    ok: boolean;
    deleted?: boolean;
    account?: StaffAccountDetail["basic"];
    note?: StaffNote;
  };
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

export async function fetchStaffAssignees() {
  return apiFetch<{ ok: boolean; staff: StaffTeamUser[] }>("/api/staff/assignees");
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

export async function fetchStaffCases(params?: {
  status?: string;
  owner_staff_user_id?: number | string;
  account_user_id?: number | string;
}) {
  const search = new URLSearchParams();
  if (params?.status && params.status !== "all") search.set("status", params.status);
  if (params?.owner_staff_user_id) search.set("owner_staff_user_id", String(params.owner_staff_user_id));
  if (params?.account_user_id) search.set("account_user_id", String(params.account_user_id));
  const query = search.toString();
  return apiFetch<{ ok: boolean; items: StaffCase[] }>(
    `/api/staff/cases${query ? `?${query}` : ""}`
  );
}

export async function fetchStaffCase(caseId: number | string) {
  return apiFetch<{ ok: boolean; case: StaffCase }>(`/api/staff/cases/${caseId}`);
}

export async function createStaffCase(payload: {
  account_user_id: number | string;
  title: string;
  summary?: string | null;
  status?: string;
  owner_staff_user_id?: number | string | null;
}) {
  return apiFetch<{ ok: boolean; case: StaffCase }>("/api/staff/cases", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateStaffCase(
  caseId: number | string,
  payload: Partial<Pick<StaffCase, "title" | "summary" | "status" | "owner_staff_user_id">>
) {
  return apiFetch<{ ok: boolean; case: StaffCase }>(`/api/staff/cases/${caseId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function createStaffCaseNote(
  caseId: number | string,
  note: string,
  mentionedStaffUserIds: Array<number | string> = []
) {
  return apiFetch<{ ok: boolean; note: StaffNote }>(`/api/staff/cases/${caseId}/notes`, {
    method: "POST",
    body: JSON.stringify({ note, mentioned_staff_user_ids: mentionedStaffUserIds }),
  });
}

export async function updateStaffTeamMember(
  staffUserId: number | string,
  payload: { full_name?: string | null; staff_role?: string; is_active?: boolean }
) {
  return apiFetch<{ ok: boolean; staff: StaffTeamUser }>(
    `/api/staff/team/${staffUserId}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    }
  );
}

export async function deleteStaffTeamMember(staffUserId: number | string) {
  return apiFetch<{ ok: boolean; removed: boolean; staff: StaffTeamUser }>(
    `/api/staff/team/${staffUserId}`,
    { method: "DELETE" }
  );
}

export async function issueStaffTeamTemporaryPassword(
  staffUserId: number | string,
  reason = "Staff team temporary password reset requested from CRM."
) {
  return apiFetch<{ ok: boolean; message?: string; staff: StaffTeamUser }>(
    `/api/staff/team/${staffUserId}/temporary-password`,
    {
      method: "POST",
      body: JSON.stringify({ reason }),
    }
  );
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

export type StaffWaitlistEmail = {
  id: number;
  email: string;
  source?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export async function fetchStaffWaitlist() {
  return apiFetch<{
    ok: boolean;
    items: StaffWaitlistEmail[];
    total: number;
  }>("/api/waitlist/admin");
}

export function getStaffWaitlistExportUrl() {
  return resolveApiUrl("/api/waitlist/export.csv");
}

export type StaffReport = {
  id: number;
  reporter_user_id: number;
  entity_type: "content_post" | "job_post" | string;
  entity_id: number;
  reason: string;
  details?: string | null;
  status: "open" | "reviewing" | "resolved" | "dismissed" | string;
  admin_user_id?: number | null;
  admin_note?: string | null;
  resolved_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export async function fetchStaffReports(params?: {
  status?: string;
  entity_type?: string;
  reason?: string;
  page?: number;
  per_page?: number;
}) {
  const search = new URLSearchParams();

  if (params?.status && params.status !== "all") search.set("status", params.status);
  if (params?.entity_type && params.entity_type !== "all") search.set("entity_type", params.entity_type);
  if (params?.reason && params.reason !== "all") search.set("reason", params.reason);
  if (params?.page) search.set("page", String(params.page));
  if (params?.per_page) search.set("per_page", String(params.per_page));

  const query = search.toString();

  return apiFetch<{
    items: StaffReport[];
    page: number;
    per_page: number;
    total: number;
    pages: number;
  }>(`/api/admin/reports${query ? `?${query}` : ""}`);
}

export async function updateStaffReport(
  reportId: number | string,
  payload: { status?: string; admin_note?: string }
) {
  return apiFetch<{ ok: boolean; report: StaffReport }>(
    `/api/admin/reports/${reportId}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    }
  );
}

export async function resolveStaffReport(reportId: number | string) {
  return apiFetch<{ ok: boolean; report: StaffReport }>(
    `/api/admin/reports/${reportId}/resolve`,
    { method: "PATCH" }
  );
}

export async function dismissStaffReport(reportId: number | string) {
  return apiFetch<{ ok: boolean; report: StaffReport }>(
    `/api/admin/reports/${reportId}/dismiss`,
    { method: "PATCH" }
  );
}

export async function resolveAndArchiveReportedPost(reportId: number | string) {
  return apiFetch<{ ok: boolean; report: StaffReport; post?: any }>(
    `/api/admin/reports/${reportId}/resolve-and-archive`,
    { method: "PATCH" }
  );
}

export async function resolveAndHideContentPost(reportId: number | string) {
  return apiFetch<{ ok: boolean; report: StaffReport; post?: any }>(
    `/api/admin/reports/${reportId}/resolve-and-hide-content`,
    { method: "PATCH" }
  );
}

export type StaffReportDetailResponse = {
  ok: boolean;
  report: StaffReport;
  post?: any | null;
  job_post?: any | null;
  content_post?: any | null;
};

export async function fetchStaffReport(reportId: number | string) {
  return apiFetch<StaffReportDetailResponse>(`/api/admin/reports/${reportId}`);
}
