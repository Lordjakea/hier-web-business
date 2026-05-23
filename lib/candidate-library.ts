import { apiFetch } from "@/lib/api";

export type CandidateLibraryJob = {
  id: number;
  title?: string | null;
  location?: string | null;
};

export type CandidateLibraryEntry = {
  id: number;
  candidate_user_id: number;
  source_job_post_id?: number | null;
  source_application_id?: number | null;
  last_stage?: string | null;
  candidate: {
    id?: number | null;
    name?: string | null;
    email?: string | null;
    headline?: string | null;
    avatar_url?: string | null;
    has_cv?: boolean;
    active_looking_for_work?: boolean;
  };
  source_job?: CandidateLibraryJob | null;
  hi_score?: {
    score: number;
    score_band?: string | null;
    score_label?: string | null;
    score_colour?: string | null;
    score_color?: string | null;
    reasons?: string[];
  } | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export async function fetchCandidateLibrary(params?: {
  jobPostId?: number | null;
  q?: string;
}) {
  const search = new URLSearchParams();
  if (params?.jobPostId) search.set("job_post_id", String(params.jobPostId));
  if (params?.q) search.set("q", params.q);

  const suffix = search.toString();
  return apiFetch<{
    ok: boolean;
    items: CandidateLibraryEntry[];
    jobs: CandidateLibraryJob[];
  }>(`/api/business/candidate-library${suffix ? `?${suffix}` : ""}`);
}

export async function shortlistCandidateLibrary(payload: {
  job_post_id: number;
  entry_ids: number[];
}) {
  return apiFetch<{
    ok: boolean;
    moved: number;
    not_actively_looking: number;
    already_applied: number;
  }>("/api/business/candidate-library/shortlist", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
