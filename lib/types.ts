export type ApplicationStage =
  | "applied"
  | "shortlisted"
  | "interview_offered"
  | "interview_booked"
  | "offered"
  | "started"
  | "rejected"
  | "withdrawn";

export type BusinessApplicationUser = {
  id: number | null;
  first_name?: string | null;
  last_name?: string | null;
  full_name?: string | null;
  display_name?: string | null;
  email?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
  address_text?: string | null;
};

export type RawApplicationQuestion =
  | string
  | {
      id?: string | number | null;
      key?: string | null;
      question?: string | null;
      label?: string | null;
      prompt?: string | null;
      text?: string | null;
      required?: boolean | null;
    };

export type BusinessJobPost = {
  id: number;
  title?: string | null;
  company_name?: string | null;
  location?: string | null;
  location_text?: string | null;
  employment_type?: string | null;
  sector?: string | null;
  is_active?: boolean;
  archived_at?: string | null;
  application_questions?: RawApplicationQuestion[] | null;
  has_application_questions?: boolean | null;
};

export type ApplicationAttachment = {
  id: number;
  kind?: string | null;
  filename?: string | null;
  content_type?: string | null;
  size_bytes?: number | null;
  download_url?: string | null;
  delete_url?: string | null;
};

export type ApplicantSummary = {
  candidate_name?: string | null;
  job_title?: string | null;
  stage?: string | null;
  status?: string | null;
  has_cv?: boolean;
  rating?: number | null;
  recruiter_tags?: string[];
  strengths?: string[];
  flags?: string[];
  recommended_next_action?: string | null;
  summary?: string | null;
};

export type BusinessApplication = {
  id: number;
  user_id?: number | null;
  job_post_id?: number | null;
  stage: ApplicationStage;
  status?: string | null;
  stage_reason?: string | null;
  rating?: number | null;
  recruiter_tags?: string[];
  internal_note?: string | null;
  candidate_hidden?: boolean;
  cv_view_count?: number;
  cv_last_viewed_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  shortlisted_at?: string | null;
  rejected_at?: string | null;
  offered_at?: string | null;
  hired_at?: string | null;
  withdrawn_at?: string | null;

  score?: number | null;
  ai_score?: number | null;
  hi_score?: number | null;
  score_band?: string | null;
  score_label?: string | null;
  score_colour?: string | null;
  score_color?: string | null;
  reasons?: string[] | null;
  applicant_summary?: ApplicantSummary | null;

  cover_letter?: string | null;
  application_answers?: unknown;

  user?: BusinessApplicationUser | null;
  candidate_email?: string | null;
  first_cv_download_url?: string | null;
  attachments?: ApplicationAttachment[];
  job_post?: BusinessJobPost | null;
};

export type PaginatedResponse<T> = {
  items: T[];
  page: number;
  per_page: number;
  total: number;
  pages: number;
};

export type CandidateExperienceItem = {
  id: string | number;
  title?: string | null;
  company?: string | null;
  period?: string | null;
  description?: string | null;
};

export type CandidateShowcaseItem = {
  id: string | number;
  title?: string | null;
  media_type?: string | null;
  public_url?: string | null;
  thumbnail_url?: string | null;
};

export type BusinessCandidate = {
  id: number;
  email?: string | null;
  phone?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  full_name?: string | null;
  name?: string | null;
  headline?: string | null;
  summary?: string | null;
  about?: string | null;
  avatar_url?: string | null;
  address_text?: string | null;
  hasCv?: boolean;
  cvFileName?: string | null;
  cvUpdatedAt?: string | null;
  cvDownloadUrl?: string | null;
  experience?: CandidateExperienceItem[];
  showcase?: CandidateShowcaseItem[];
  showcaseCount?: number;
  applicationsCount?: number;
};

export type BusinessCandidateProfileResponse = {
  candidate: BusinessCandidate;
  applications: Array<{
    id: number;
    job_post_id?: number | null;
    stage?: string | null;
    status?: string | null;
    applicant_summary?: ApplicantSummary | null;
    created_at?: string | null;
    job?: {
      id: number;
      title?: string | null;
      company_name?: string | null;
      location?: string | null;
    } | null;
  }>;
};

export type BusinessApplicationDetailResponse = {
  application: BusinessApplication;
  attachments: ApplicationAttachment[];
};

export type LoginResponse = {
  access_token?: string;
  token?: string;
  access?: string;
  user?: {
    id?: number;
    email?: string | null;
    full_name?: string | null;
    role?: string | null;
  };
};

export type CvPreviewResponse = {
  ok: boolean;
  url?: string | null;
  expires_in?: number;
};

export type AnalyticsSummaryResponse = {
  ok: boolean;
  range_days: 7 | 30 | 90 | 365;
  summary: {
    total_posts: number;
    active_posts: number;
    total_applicants: number;
    viewed_applicants: number;
    unviewed_applicants: number;
    cv_views: number;
    rated_applicants: number;
    tagged_applicants: number;
    noted_applicants: number;
    shortlisted: number;
    interview_booked: number;
    offered: number;
    started: number;
    total_post_views: number;
    total_likes: number;
    total_comments: number;
    total_saves: number;
    total_shares: number;
    total_followers: number;
    follower_growth: number;
    unique_viewers: number;
  };
  needs_attention: {
    unviewed_applicants: number;
    applicants_without_rating: number;
    applicants_without_tags: number;
  };
  rates: {
    view_rate: number;
    shortlist_rate: number;
    interview_rate: number;
    offer_rate: number;
    start_rate: number;
    engagement_rate: number;
    like_rate: number;
    comment_rate: number;
    follower_conversion_rate: number;
  };
  funnel: Array<{
    key: string;
    label: string;
    count: number;
  }>;
  top_posts: Array<{
    job_post_id: number;
    title: string;
    applicants: number;
    viewed_applicants: number;
    shortlisted: number;
    view_rate: number;
    post_views: number;
    likes: number;
    comments: number;
    saves: number;
    shares: number;
    engagement_rate: number;
  }>;
  engagement: {
    post_views: number;
    likes: number;
    comments: number;
    saves: number;
    shares: number;
    followers: number;
    follower_growth: number;
    engagement_rate: number;
  };
  trends: {
    views_delta: number;
    likes_delta: number;
    comments_delta: number;
    followers_delta: number;
    applicants_delta: number;
  };
  meta: {
    mobile_optimized: boolean;
    detailed_dashboard_available: boolean;
    post_views_supported: boolean;
    shares_supported: boolean;
    unique_viewers_supported: boolean;
  };
  debug?: {
    applications_by_status?: Record<string, number>;
    applications_by_stage?: Record<string, number>;
  };
};

export type BillingPlan = {
  id: number;
  code?: string | null;
  name?: string | null;
  price_monthly?: number | null;
  currency?: string | null;
  is_active?: boolean;
  job_post_limit?: number | null;
  application_limit_per_post?: number | null;
  promoted_posts_included?: number | null;
  team_member_limit?: number | null;
  monthly_boost_credits?: number | null;
  has_pipeline_tools?: boolean;
  has_applicant_rating?: boolean;
  has_analytics?: boolean;
  has_analytics_pro?: boolean;
  has_messaging?: boolean;
  has_interview_scheduling?: boolean;
  has_recruiter_performance?: boolean;
  stripe_price_id?: string | null;
  sort_order?: number | null;
  features?: Record<string, unknown>;
  created_at?: string | null;
  updated_at?: string | null;
};

export type BillingSubscription = {
  id: number;
  business_account_id?: number;
  provider?: string | null;
  provider_customer_id?: string | null;
  provider_subscription_id?: string | null;
  provider_price_id?: string | null;
  plan_code?: string | null;
  status?: string | null;
  currency?: string | null;
  amount?: number | null;
  interval?: string | null;
  started_at?: string | null;
  current_period_start?: string | null;
  current_period_end?: string | null;
  cancel_at_period_end?: boolean;
  trial_start?: string | null;
  trial_end?: string | null;
  cancelled_at?: string | null;
  ended_at?: string | null;
  metadata_json?: Record<string, unknown>;
  created_at?: string | null;
  updated_at?: string | null;
};

export type BillingAccount = {
  id: number;
  owner_user_id?: number;
  business_profile_id?: number | null;
  status?: string | null;
  plan_code?: string | null;
  trial_ends_at?: string | null;
  activated_at?: string | null;
  cancelled_at?: string | null;
  suspended_at?: string | null;
  pricing_selected_at?: string | null;
  internal_notes?: string | null;
  stripe_customer_id?: string | null;
  stripe_default_payment_method_id?: string | null;
  billing_email?: string | null;
  billing_name?: string | null;
  current_subscription_id?: number | null;
  subscription_status?: string | null;
  subscription_current_period_start?: string | null;
  subscription_current_period_end?: string | null;
  subscription_cancel_at_period_end?: boolean;
  monthly_boost_credits?: number | null;
  monthly_boost_credits_used?: number | null;
  boost_credits_reset_at?: string | null;
  paid_boost_credits?: number | null;
  paid_boost_credits_used?: number | null;
  included_recruiter_seats?: number | null;
  extra_recruiter_seats?: number | null;
  total_recruiter_seats?: number | null;
  active_recruiter_seats?: number | null;
  available_recruiter_seats?: number | null;
  stripe_seat_subscription_item_id?: string | null;
  plan?: BillingPlan | null;
  subscription?: BillingSubscription | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type BillingFlags = {
  is_trial?: boolean;
  trial_expired?: boolean;
  is_active?: boolean;
  is_past_due?: boolean;
  is_cancelled?: boolean;
  is_suspended?: boolean;
  subscription_active?: boolean;
  subscription_cancel_at_period_end?: boolean;
  subscription_period_live?: boolean;
  pricing_selected?: boolean;
};

export type BillingStatusResponse = {
  ok: boolean;
  account?: BillingAccount | null;
  plan?: BillingPlan | null;
  subscription?: BillingSubscription | null;
  flags?: BillingFlags;
  generated_at?: string | null;
};

export type BillingOverviewResponse = {
  ok: boolean;
  overview: {
    account_status?: string | null;
    plan_code?: string | null;
    plan_name?: string | null;
    price_monthly?: number | null;
    currency?: string | null;
    subscription_status?: string | null;
    trial_ends_at?: string | null;
    current_period_start?: string | null;
    current_period_end?: string | null;
    cancel_at_period_end?: boolean;
    stripe_customer_id?: string | null;
    monthly_boost_credits?: number | null;
    monthly_boost_credits_used?: number | null;
    boost_credits_reset_at?: string | null;
    paid_boost_credits?: number | null;
    paid_boost_credits_used?: number | null;
    included_recruiter_seats?: number | null;
    extra_recruiter_seats?: number | null;
    total_recruiter_seats?: number | null;
    active_recruiter_seats?: number | null;
    available_recruiter_seats?: number | null;
    stripe_seat_subscription_item_id?: string | null;
    pricing_selected_at?: string | null;
    flags?: BillingFlags;
  };
  generated_at?: string | null;
};

export type BillingPlansResponse = {
  ok: boolean;
  items: BillingPlan[];
};

export type BillingPortalResponse = {
  ok: boolean;
  portal_url?: string | null;
};

export type BillingPreviewLine = {
  id?: string | null;
  description?: string | null;
  amount?: number | null;
  currency?: string | null;
  period?: Record<string, unknown>;
  proration?: boolean;
  type?: string | null;
};

export type BillingPreviewChangeResponse = {
  ok: boolean;
  mode?:
    | "new_checkout"
    | "no_change"
    | "immediate_upgrade"
    | "scheduled_downgrade";
  direction?: "same" | "upgrade" | "downgrade";
  current_plan_code?: string | null;
  target_plan_code?: string | null;
  message?: string | null;
  amount_due_now?: number | null;
  total?: number | null;
  currency?: string | null;
  current_period_end?: string | null;
  lines?: BillingPreviewLine[];
};

export type BillingMutationResponse = {
  ok?: boolean;
  message?: string | null;
  checkout_url?: string | null;
  checkout_session_id?: string | null;
  account?: BillingAccount | null;
  subscription?: BillingSubscription | null;
  plan?: BillingPlan | null;
  effective_at?: string | null;
  current_period_end?: string | null;
  mode?: string | null;
  already_cancelled?: boolean;
  already_scheduled?: boolean;
};

export type BoostCredits = {
  monthly?: {
    total?: number | null;
    used?: number | null;
    remaining?: number | null;
    reset_at?: string | null;
  } | null;
  paid?: {
    total?: number | null;
    used?: number | null;
    remaining?: number | null;
  } | null;
  total_remaining?: number | null;
  allowed_credit_pack_sizes?: number[] | null;
};

export type EligibleBoostPost = {
  id: number;
  title?: string | null;
  content_type?: string | null;
  is_gig?: boolean | null;
  location_text?: string | null;
  location?: string | null;
  is_remote?: boolean | null;
  is_active?: boolean | null;
  archived_at?: string | null;
  is_boosted?: boolean | null;
  boosted_until?: string | null;
  boost_score?: number | null;
  already_boosted?: boolean | null;
  company_name?: string | null;
  application_count?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type BoostEligiblePostsResponse = {
  ok: boolean;
  items?: EligibleBoostPost[] | null;
  ineligible_items?: EligibleBoostPost[] | null;
  credits?: BoostCredits | null;
  generated_at?: string | null;
};

export type CreateBoostResponse = {
  ok?: boolean;
  message?: string | null;
  boost?: {
    id?: number;
    duration_hours?: number | null;
    ends_at?: string | null;
    metadata_json?: Record<string, unknown>;
  } | null;
  job_post?: EligibleBoostPost | null;
  credits?: BoostCredits | null;
};

export type BusinessOnboardingStatus =
  | "not_started"
  | "in_progress"
  | "awaiting_candidate"
  | "awaiting_employer"
  | "compliant_pending_start"
  | "started"
  | "completed"
  | "archived"
  | "removed";

export type BusinessOnboardingTaskStatus =
  | "draft"
  | "sent"
  | "viewed"
  | "submitted"
  | "reviewed"
  | "approved"
  | "rejected"
  | "waived";

export type BusinessOnboardingDocumentDeliveryStatus =
  | "draft"
  | "sent"
  | "viewed"
  | "submitted"
  | "approved"
  | "rejected";

export type BusinessOnboardingTask = {
  id: number;
  onboarding_id: number;
  task_key: string;
  title?: string | null;
  description?: string | null;
  phase?: string | null;
  owner_type?: string | null;
  status: BusinessOnboardingTaskStatus;
  required: boolean;
  due_at?: string | null;
  requested_at?: string | null;
  viewed_at?: string | null;
  submitted_at?: string | null;
  reviewed_at?: string | null;
  completed_at?: string | null;
  country_code?: string | null;
  metadata?: Record<string, unknown>;
  created_at?: string | null;
  updated_at?: string | null;
};

export type BusinessOnboardingDocument = {
  id: number;
  onboarding_id: number;
  task_id?: number | null;
  document_type: string;
  title?: string | null;
  storage_key?: string | null;
  original_filename?: string | null;
  mime_type?: string | null;
  file_size?: number | null;
  uploaded_by_user_id?: number | null;
  visible_to_candidate: boolean;
  review_status?: "pending" | "reviewed" | "approved" | "rejected";
  delivery_status?: BusinessOnboardingDocumentDeliveryStatus | null;
  sent_at?: string | null;
  viewed_at?: string | null;
  submitted_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  metadata?: Record<string, unknown>;
};

export type BusinessOnboardingContract = {
  id: number;
  onboarding_id: number;
  template_name?: string | null;
  title: string;
  status: "draft" | "sent" | "viewed" | "signed" | "approved" | "rejected";
  storage_key?: string | null;
  signed_storage_key?: string | null;
  sent_at?: string | null;
  viewed_at?: string | null;
  signed_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  metadata?: Record<string, unknown>;
};

export type BusinessOnboardingAuditEvent = {
  id: number;
  onboarding_id: number;
  actor_user_id?: number | null;
  actor_type?: string | null;
  event_type?: string | null;
  payload?: Record<string, unknown>;
  created_at?: string | null;
  updated_at?: string | null;
};

export type BusinessOnboarding = {
  id: number;
  application_id: number;
  candidate_user_id?: number;
  business_user_id?: number;
  business_account_id?: number | null;
  country_code: string;
  worker_type?: string | null;
  employing_entity_name?: string | null;
  start_date?: string | null;
  status: BusinessOnboardingStatus | string;
  plan_code_snapshot?: string | null;
  pack_version?: string | null;
  completed_at?: string | null;
  archived_at?: string | null;
  removed_at?: string | null;
  removal_reason?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  candidate?: {
    id: number;
    display_name?: string | null;
    email?: string | null;
    phone?: string | null;
    avatar_url?: string | null;
    headline?: string | null;
  } | null;
  application?: {
    id: number;
    job_post_id?: number | null;
    user_id?: number | null;
    stage?: ApplicationStage | string | null;
    status?: string | null;
    rating?: number | null;
    created_at?: string | null;
    updated_at?: string | null;
  } | null;
  job_post?: {
    id: number;
    title?: string | null;
    company_name?: string | null;
    location?: string | null;
    employment_type?: string | null;
    sector?: string | null;
    is_active?: boolean;
  } | null;
  country_pack?: {
    code?: string | null;
    name?: string | null;
    version?: string | null;
    required_tasks?: unknown[];
    optional_tasks?: unknown[];
  } | null;
  tasks?: BusinessOnboardingTask[];
  documents?: BusinessOnboardingDocument[];
  contracts?: BusinessOnboardingContract[];
  audit_events?: BusinessOnboardingAuditEvent[];
};

export type OnboardingEligibility = {
  eligible: boolean;
  plan_code?: string;
  status?: string | null;
  features?: {
    onboarding?: boolean;
    onboarding_pro?: boolean;
    messaging?: boolean;
  };
};
