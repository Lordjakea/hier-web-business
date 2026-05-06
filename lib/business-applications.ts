import { apiFetch } from "@/lib/api";
import { resolveHIScore } from "@/lib/hi-score";
import type {
  AnalyticsSummaryResponse,
  ApplicationStage,
  BusinessApplication,
  BusinessApplicationDetailResponse,
  BusinessCandidateProfileResponse,
  CvPreviewResponse,
  LoginResponse,
  PaginatedResponse,
} from "@/lib/types";

type FetchBusinessApplicationsParams = {
  page?: number;
  per_page?: number;
  q?: string;
  stage?: string;
  status?: string;
  job_post_id?: number | null;
  recruiter_id?: number | null;
  owner_recruiter_id?: number | null;
  post_status?: "draft" | "live" | "archived";
  include_archived?: boolean;
};

function normalizeApplication(application: BusinessApplication): BusinessApplication {
  const resolvedScore =
    application.hi_score ??
    application.score ??
    application.ai_score ??
    null;
  const resolvedTone = resolveHIScore({
    ...application,
    hi_score: resolvedScore,
    score: resolvedScore,
    ai_score: resolvedScore,
  });

  return {
    ...application,
    hi_score: resolvedScore,
    score: resolvedScore,
    ai_score: resolvedScore,
    score_band: application.score_band ?? resolvedTone.band,
    score_label: application.score_label ?? resolvedTone.label,
    score_colour: application.score_colour ?? application.score_color ?? resolvedTone.colour,
    score_color: application.score_color ?? application.score_colour ?? resolvedTone.colour,
    reasons: application.reasons || [],
    applicant_summary: application.applicant_summary || null,
    recruiter_tags: application.recruiter_tags || [],
    attachments: application.attachments || [],
  };
}

function normalizeApplicationListResponse(
  response: PaginatedResponse<BusinessApplication>,
): PaginatedResponse<BusinessApplication> {
  return {
    ...response,
    items: (response.items || []).map(normalizeApplication),
  };
}

export async function loginBusinessUser(email: string, password: string) {
  return apiFetch<LoginResponse>("/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function fetchBusinessApplications(
  params?: FetchBusinessApplicationsParams,
) {
  const search = new URLSearchParams();

  search.set("page", String(params?.page || 1));
  search.set("per_page", String(params?.per_page || 100));

  if (params?.q) {
    search.set("q", params.q);
  }

  if (params?.stage) {
    search.set("stage", params.stage);
  }

  if (params?.status) {
    search.set("status", params.status);
  }

  if (params?.recruiter_id) {
    search.set("recruiter_id", String(params.recruiter_id));
  }

  if (params?.owner_recruiter_id) {
    search.set("owner_recruiter_id", String(params.owner_recruiter_id));
  }

  if (params?.post_status) {
    search.set("post_status", params.post_status);
  }

  if (params?.include_archived) {
    search.set("include_archived", "1");
  }

  if (params?.job_post_id) {
    search.set("job_post_id", String(params.job_post_id));
  }

  const response = await apiFetch<PaginatedResponse<BusinessApplication>>(
    `/api/business/applications?${search.toString()}`,
  );

  return normalizeApplicationListResponse(response);
}

export async function fetchBusinessApplicationDetail(appId: number) {
  const response = await apiFetch<BusinessApplicationDetailResponse>(
    `/api/business/applications/${appId}`,
  );

  return {
    ...response,
    application: normalizeApplication(response.application),
    attachments: response.attachments || [],
  };
}

export async function fetchBusinessCandidateProfile(userId: number) {
  return apiFetch<BusinessCandidateProfileResponse>(
    `/api/business/candidates/${userId}`,
  );
}

export async function updateBusinessApplicationStage(
  appId: number,
  stage: ApplicationStage,
) {
  const response = await apiFetch<BusinessApplication>(
    `/api/business/applications/${appId}`,
    {
      method: "PATCH",
      body: JSON.stringify({ stage }),
    },
  );

  return normalizeApplication(response);
}

export async function updateBusinessApplicationNotes(
  appId: number,
  payload: {
    rating?: number | null;
    recruiter_tags?: string[];
    internal_note?: string | null;
  },
) {
  const response = await apiFetch<BusinessApplication>(
    `/api/business/applications/${appId}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );

  return normalizeApplication(response);
}

export async function fetchCvPreviewUrl(downloadPath: string) {
  return apiFetch<CvPreviewResponse>(downloadPath, { method: "GET" });
}

export async function markBusinessCvViewed(appId: number) {
  return apiFetch<{ ok: boolean }>(
    `/api/business/applications/${appId}/cv-viewed`,
    {
      method: "POST",
    },
  );
}

export async function fetchBusinessAnalyticsSummary(
  days: 7 | 30 | 90 | 365 = 30,
  recruiterUserId?: number | null,
) {
  const search = new URLSearchParams();
  search.set("days", String(days));

  if (recruiterUserId) {
    search.set("recruiter_user_id", String(recruiterUserId));
  }

  return apiFetch<AnalyticsSummaryResponse>(
    `/api/business/analytics/summary?${search.toString()}`,
  );
}

type BulkApplicationFilters = {
  stage?: string;
  status?: string;
  job_post_id?: number | null;
  recruiter_id?: number | null;
  owner_recruiter_id?: number | null;
  post_status?: "draft" | "live" | "archived";
  include_archived?: boolean;
};

type BulkApplicationPayload = {
  application_ids?: number[];
  select_all_matching?: boolean;
  filters?: BulkApplicationFilters;
};

type BulkApplicationResponse = {
  ok: boolean;
  mode: "ids" | "filters";
  updated: number;
};

export async function bulkMoveBusinessApplicationsStage(
  payload: BulkApplicationPayload & { stage: ApplicationStage },
) {
  return apiFetch<BulkApplicationResponse>(
    "/api/business/applications/bulk-stage",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export async function bulkRejectBusinessApplications(
  payload: BulkApplicationPayload,
) {
  return apiFetch<BulkApplicationResponse>(
    "/api/business/applications/bulk-reject",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export async function bulkArchiveBusinessApplications(
  payload: BulkApplicationPayload,
) {
  return apiFetch<BulkApplicationResponse>(
    "/api/business/applications/bulk-archive",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}
