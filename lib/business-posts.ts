import { apiFetch } from "@/lib/api";
import type { PaginatedResponse } from "@/lib/types";

export type BusinessManagedJobPost = {
  id: number;
  content_type?: "job" | "post" | string | null;
  is_gig?: boolean;
  title?: string | null;
  description?: string | null;
  company_name?: string | null;
  company_avatar_url?: string | null;
  location?: string | null;
  location_text?: string | null;
  sector?: string | null;
  experience?: string | null;
  employment_type?: string | null;
  salary_min?: number | null;
  salary_max?: number | null;
  salary_period?: "yearly" | "hourly" | string | null;
  currency?: string | null;
  budget?: number | null;
  is_remote?: boolean;
  is_active?: boolean;
  applicant_count?: number;
  application_stage_counts?: Record<string, number>;
  tags?: string[];
  application_questions?: string[];
  has_application_questions?: boolean;
  media_type?: "image" | "video" | string | null;
  hero_image_url?: string | null;
  hero_video_url?: string | null;
  created_at?: string | null;
  promoted_active?: boolean;
  promoted_until?: string | null;
};

export type BusinessContentPost = {
  id: number;
  content_post_id?: number;
  job_post_id?: number | null;
  caption?: string | null;
  description?: string | null;
  title?: string | null;
  company_name?: string | null;
  company_avatar_url?: string | null;
  media_type?: "image" | "video" | string | null;
  hero_image_url?: string | null;
  hero_video_url?: string | null;
  is_active?: boolean;
  created_at?: string | null;
  like_count?: number;
  comment_count?: number;
  location?: string | null;
  location_text?: string | null;
  sector?: string | null;
  experience?: string | null;
  employment_type?: string | null;
  salary_min?: number | null;
  salary_max?: number | null;
  salary_period?: "yearly" | "hourly" | string | null;
  currency?: string | null;
  is_remote?: boolean;
  tags?: string[] | null;
  application_questions?: string[] | null;
};

export type ManagedPostItem =
  | ({ kind: "job" } & BusinessManagedJobPost)
  | ({ kind: "content" } & BusinessContentPost);

export type CreateJobPayload = {
  content_type: "job";
  is_gig: boolean;
  title: string;
  description: string;
  location_text: string | null;
  location: string | null;
  is_remote: boolean;
  sector: string | null;
  employment_type: string | null;
  experience: string | null;
  salary_min: number | null;
  salary_max: number | null;
  salary_period: "yearly" | "hourly" | null;
  budget: number | null;
  currency: string;
  tags: string[];
  application_questions: string[];
  media_type: "image" | "video" | null;
  hero_image_url: string | null;
  hero_video_url: string | null;
  is_active: boolean;
};

export type UpdateJobPayload = Partial<CreateJobPayload>;

export type CreateContentPayload = {
  caption: string | null;
  description?: string | null;
  media_type?: "image" | "video" | null;
  hero_image_url?: string | null;
  hero_video_url?: string | null;
  public_url?: string | null;
};

export type UpdateContentPayload = {
  title?: string | null;
  caption?: string | null;
  description?: string | null;
  location_text?: string | null;
  location?: string | null;
  is_remote?: boolean;
  is_active?: boolean;
  sector?: string | null;
  employment_type?: string | null;
  experience?: string | null;
  salary_min?: number | null;
  salary_max?: number | null;
  salary_period?: "yearly" | "hourly" | null;
  currency?: string | null;
  tags?: string[];
  application_questions?: string[];
};

export type UploadableMediaType = "image" | "video";

export type BusinessJobAIShortlistItem = {
  ai_enabled?: boolean;
  ai_summary_available?: boolean;
  application_id: number;
  candidate_avatar_url?: string | null;
  candidate_email?: string | null;
  candidate_headline?: string | null;
  candidate_name: string;
  candidate_user_id: number | null;
  created_at?: string | null;
  cv_last_viewed_at?: string | null;
  cv_view_count?: number | null;
  first_viewed_at?: string | null;
  has_cv?: boolean;
  job_post_id?: number | null;
  job_title?: string | null;
  last_viewed_at?: string | null;
  rating?: number | null;
  reasons: string[];
  recruiter_tags: string[];
  score: number;
  stage?: string | null;
  status?: string | null;
  type?: string | null;
  updated_at?: string | null;
};

export type BusinessJobAIShortlist = {
  ok?: boolean;
  ai_enabled?: boolean;
  job_post_id: number;
  job_title?: string | null;
  items: BusinessJobAIShortlistItem[];
};

type PresignPayload = {
  media_type: UploadableMediaType;
  mime_type: string;
  ext?: string | null;
  filename?: string | null;
};

type PresignResponse = {
  ok: boolean;
  storage_key: string;
  upload_url: string;
  public_url: string;
  expires_in: number;
  content_type?: string | null;
};

export async function fetchBusinessJobs(options?: { includeArchived?: boolean }) {
  const qs = new URLSearchParams({ content_type: "job" });

  if (options?.includeArchived) {
    qs.set("include_archived", "1");
    qs.set("include_hidden", "1");
  }

  return apiFetch<PaginatedResponse<BusinessManagedJobPost>>(
    `/api/business/posts?${qs.toString()}`,
  );
}

export async function fetchBusinessContent(options?: { includeInactive?: boolean }) {
  const qs = new URLSearchParams();

  if (options?.includeInactive) {
    qs.set("include_inactive", "1");
  }

  const suffix = qs.toString();

  return apiFetch<PaginatedResponse<BusinessContentPost>>(
    `/api/business/content${suffix ? `?${suffix}` : ""}`,
  );
}

export async function fetchBusinessPostDetail(postId: number) {
  const response = await apiFetch<{ ok: boolean; post: BusinessManagedJobPost }>(
    `/api/business/posts/${postId}`,
  );
  return response.post;
}

export async function fetchBusinessContentDetail(postId: number) {
  const list = await fetchBusinessContent({ includeInactive: true });

  const item = (list.items || []).find(
    (entry) => entry.id === postId || entry.content_post_id === postId,
  );

  if (!item) {
    throw new Error("Content post not found.");
  }

  return item;
}

export async function fetchBusinessJobAIShortlist(postId: number) {
  const response = await apiFetch<any>(
    `/api/business/jobs/${postId}/ai-shortlist`,
  );

  if (response?.shortlist) {
    return response.shortlist as BusinessJobAIShortlist;
  }

  if (response?.job_post_id || Array.isArray(response?.items)) {
    return response as BusinessJobAIShortlist;
  }

  return null;
}

export async function createBusinessJobPost(payload: CreateJobPayload) {
  return apiFetch<{ ok: boolean; post: BusinessManagedJobPost }>(
    "/api/business/posts",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export async function createBusinessContentPost(payload: CreateContentPayload) {
  return apiFetch<{ ok: boolean; post: BusinessContentPost }>(
    "/api/business/content",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export async function updateBusinessJobPost(postId: number, payload: UpdateJobPayload) {
  return apiFetch<{ ok: boolean; post: BusinessManagedJobPost }>(
    `/api/business/posts/${postId}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
}

export async function updateBusinessContentPost(
  postId: number,
  payload: UpdateContentPayload,
) {
  return apiFetch<{ ok: boolean; post: BusinessContentPost }>(
    `/api/business/content/${postId}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
}

export async function archiveBusinessPost(postId: number) {
  return apiFetch<{ ok: boolean; post: BusinessManagedJobPost }>(
    `/api/business/posts/${postId}/archive`,
    {
      method: "PATCH",
    },
  );
}

export async function archiveBusinessContentPost(postId: number) {
  return apiFetch<{ ok: boolean; post: BusinessContentPost }>(
    `/api/business/content/${postId}`,
    {
      method: "PATCH",
      body: JSON.stringify({ is_active: false }),
    },
  );
}

export async function deleteBusinessContentPost(postId: number) {
  return apiFetch<{ ok: boolean; deleted: boolean }>(
    `/api/business/content/${postId}`,
    {
      method: "DELETE",
    },
  );
}

export async function presignBusinessContentMedia(
  postId: number,
  payload: PresignPayload,
) {
  return apiFetch<PresignResponse>(
    `/api/business/content/${postId}/media/presign`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export async function attachBusinessContentMedia(
  postId: number,
  payload: {
    media_type: UploadableMediaType;
    storage_key: string;
    public_url: string;
    mime_type?: string | null;
    order_index?: number;
  },
) {
  return apiFetch<{ ok: boolean; media: unknown }>(
    `/api/business/content/${postId}/media`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export async function presignBusinessJobMedia(
  postId: number,
  payload: PresignPayload,
) {
  return apiFetch<PresignResponse>(
    `/api/business/posts/${postId}/media/presign`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export async function attachBusinessJobMedia(
  postId: number,
  payload: {
    media_type: UploadableMediaType;
    storage_key: string;
    public_url: string;
    mime_type?: string | null;
  },
) {
  return apiFetch<{ ok: boolean; post: BusinessManagedJobPost }>(
    `/api/business/posts/${postId}/media`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}