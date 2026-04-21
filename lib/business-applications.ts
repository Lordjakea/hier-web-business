import { apiFetch } from "@/lib/api";
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
  job_post_id?: number | null;
};

function normalizeApplication(application: BusinessApplication): BusinessApplication {
  const resolvedScore =
    application.hi_score ??
    application.score ??
    application.ai_score ??
    null;

  return {
    ...application,
    hi_score: resolvedScore,
    score: resolvedScore,
    ai_score: resolvedScore,
    reasons: application.reasons || [],
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
) {
  return apiFetch<AnalyticsSummaryResponse>(
    `/api/business/analytics/summary?days=${days}`,
  );
}