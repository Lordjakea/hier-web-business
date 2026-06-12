"use client";

import { useEffect, useMemo, useState } from "react";
import { Brain, CheckCircle2, Loader2, Search, UserRoundCheck, UserSquare2 } from "lucide-react";
import {
  fetchCandidateLibrary,
  shortlistCandidateLibrary,
  type CandidateLibraryEntry,
  type CandidateLibraryJob,
} from "@/lib/candidate-library";
import {
  fetchBusinessApplicationDetail,
  fetchBusinessCandidateProfile,
  fetchCvPreviewUrl,
  markBusinessCvViewed,
  updateBusinessApplicationNotes,
  updateBusinessApplicationStage,
} from "@/lib/business-applications";
import { ApplicationDetailDrawer } from "@/components/board/application-detail-drawer";
import { PageHeader } from "@/components/ui/page-header";
import { resolveHIScore } from "@/lib/hi-score";
import type { ApplicationStage, BusinessApplication, BusinessCandidate } from "@/lib/types";

type LibrarySortMode = "score_desc" | "active_first" | "recent" | "name";
type LibraryMoveStage = "applied" | "shortlisted";

export default function CandidateLibraryPage() {
  const [items, setItems] = useState<CandidateLibraryEntry[]>([]);
  const [jobs, setJobs] = useState<CandidateLibraryJob[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [moveStage, setMoveStage] = useState<LibraryMoveStage>("applied");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [query, setQuery] = useState("");
  const [sortMode, setSortMode] = useState<LibrarySortMode>("score_desc");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [selectedApplication, setSelectedApplication] = useState<BusinessApplication | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<BusinessCandidate | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cvPreviewUrl, setCvPreviewUrl] = useState<string | null>(null);
  const [cvPreviewLoading, setCvPreviewLoading] = useState(false);
  const [cvPreviewError, setCvPreviewError] = useState<string | null>(null);

  async function load(nextJobId: number | null = selectedJobId) {
    setError(null);
    setLoading(true);
    try {
      const response = await fetchCandidateLibrary({
        jobPostId: nextJobId,
        q: query.trim() || undefined,
      });
      setItems(response.items || []);
      setJobs(response.jobs || []);
    } catch (e: any) {
      setError(e?.message || "Could not load candidate library.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedJob = useMemo(
    () => jobs.find((job) => job.id === selectedJobId) || null,
    [jobs, selectedJobId],
  );

  const sortedItems = useMemo(() => {
    const getScore = (item: CandidateLibraryEntry) => {
      const score = resolveHIScore(item.hi_score ? { score: item.hi_score.score } : null).score;
      return score ?? Number.NEGATIVE_INFINITY;
    };

    return items
      .map((item, index) => ({ item, index }))
      .sort((left, right) => {
        if (sortMode === "score_desc") {
          return getScore(right.item) - getScore(left.item) || left.index - right.index;
        }

        if (sortMode === "active_first") {
          const activeDelta =
            Number(!!right.item.candidate.active_looking_for_work) -
            Number(!!left.item.candidate.active_looking_for_work);
          return activeDelta || getScore(right.item) - getScore(left.item) || left.index - right.index;
        }

        if (sortMode === "name") {
          const leftName = left.item.candidate.name || left.item.candidate.email || "";
          const rightName = right.item.candidate.name || right.item.candidate.email || "";
          return leftName.localeCompare(rightName) || left.index - right.index;
        }

        return left.index - right.index;
      })
      .map(({ item }) => item);
  }, [items, sortMode]);

  const selectedCount = selectedIds.length;

  async function handleScoreJob(jobId: number | null) {
    const nextJobId = jobId && jobId > 0 ? jobId : null;
    setSelectedJobId(nextJobId);
    setSelectedIds([]);
    await load(nextJobId);
  }

  async function handleShortlist() {
    if (!selectedJobId || selectedIds.length === 0) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const response = await shortlistCandidateLibrary({
        job_post_id: selectedJobId,
        entry_ids: selectedIds,
        stage: moveStage,
      });
      const stageLabel = moveStage === "shortlisted" ? "Shortlisted" : "Applied";
      setNotice(
        `${response.moved} moved to ${stageLabel}. ${response.not_actively_looking} not moved because they are not marked actively looking. ${response.already_applied} were already in that role.`,
      );
      setSelectedIds([]);
      await load(selectedJobId);
    } catch (e: any) {
      setError(e?.message || "Could not move candidates.");
    } finally {
      setBusy(false);
    }
  }

  function toggleEntry(id: number) {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  async function openCandidateProfile(item: CandidateLibraryEntry) {
    const applicationId = item.source_application_id;
    if (!applicationId) {
      setError("This candidate does not have an application profile to open yet.");
      return;
    }

    setSelectedApplication({
      id: applicationId,
      stage: (item.last_stage as ApplicationStage) || "applied",
      rating: item.previous_review?.rating ?? null,
      recruiter_tags: item.previous_review?.recruiter_tags || [],
      internal_note: item.previous_review?.internal_note || null,
      user: {
        id: item.candidate.id || item.candidate_user_id,
        display_name: item.candidate.name,
        full_name: item.candidate.name,
        email: item.candidate.email,
        avatar_url: item.candidate.avatar_url,
      },
      job_post: item.source_job
        ? {
            id: item.source_job.id,
            title: item.source_job.title,
            location: item.source_job.location,
          }
        : null,
    } as BusinessApplication);
    setSelectedCandidate(null);
    setCvPreviewUrl(null);
    setCvPreviewError(null);
    setDetailLoading(true);
    setError(null);

    try {
      const detail = await fetchBusinessApplicationDetail(applicationId);
      setSelectedApplication({
        ...detail.application,
        attachments: detail.attachments || [],
      });

      const userId = detail.application.user?.id || item.candidate.id || item.candidate_user_id;
      if (userId) {
        const response = await fetchBusinessCandidateProfile(userId);
        setSelectedCandidate(response.candidate);
      }
    } catch (e: any) {
      setError(e?.message || "Could not load candidate profile.");
    } finally {
      setDetailLoading(false);
    }
  }

  async function saveDrawer(payload: {
    stage: ApplicationStage;
    rating: number | null;
    recruiter_tags: string[];
    internal_note: string | null;
  }) {
    if (!selectedApplication) return;
    setSaving(true);
    setError(null);

    try {
      let latest = selectedApplication;

      if (payload.stage !== selectedApplication.stage) {
        latest = await updateBusinessApplicationStage(selectedApplication.id, payload.stage);
      }

      latest = await updateBusinessApplicationNotes(selectedApplication.id, {
        rating: payload.rating,
        recruiter_tags: payload.recruiter_tags,
        internal_note: payload.internal_note,
      });

      setSelectedApplication(latest);
    } catch (e: any) {
      setError(e?.message || "Could not save candidate updates.");
    } finally {
      setSaving(false);
    }
  }

  async function openCvPreview() {
    if (!selectedApplication?.first_cv_download_url) {
      setCvPreviewError("No CV is available for this candidate yet.");
      return;
    }

    setCvPreviewLoading(true);
    setCvPreviewError(null);

    try {
      const preview = await fetchCvPreviewUrl(selectedApplication.first_cv_download_url);
      setCvPreviewUrl(preview.url || null);
      await markBusinessCvViewed(selectedApplication.id);
      setSelectedApplication((current) =>
        current ? { ...current, cv_view_count: (current.cv_view_count || 0) + 1 } : current,
      );
    } catch (e: any) {
      setCvPreviewError(e?.message || "Could not load CV preview right now.");
    } finally {
      setCvPreviewLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Candidate Library"
        title="Your saved CV library"
        description="Candidates who apply to your roles are kept here so Pro and Hier teams can score them against new roles and move suitable active candidates into Applied."
      />

      <section className="rounded-[32px] border border-hier-border bg-white p-5 shadow-card">
        <div className="grid gap-4 lg:grid-cols-[1fr_220px_190px_190px_auto]">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-hier-muted">
              Hiring for
            </span>
            <select
              value={selectedJobId || ""}
              onChange={(event) => void handleScoreJob(Number(event.target.value || 0))}
              className="mt-2 h-12 w-full rounded-[18px] border border-hier-border bg-white px-4 text-sm font-semibold text-hier-text outline-none"
            >
              <option value="">Select a live role</option>
              {jobs.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.title || `Role #${job.id}`}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-hier-muted">
              Search
            </span>
            <div className="mt-2 flex h-12 items-center gap-2 rounded-[18px] border border-hier-border px-4">
              <Search className="h-4 w-4 text-hier-muted" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void load();
                }}
                placeholder="Name, email or headline"
                className="w-full bg-transparent text-sm outline-none"
              />
            </div>
          </label>

          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-hier-muted">
              Sort by
            </span>
            <select
              value={sortMode}
              onChange={(event) => setSortMode(event.target.value as LibrarySortMode)}
              className="mt-2 h-12 w-full rounded-[18px] border border-hier-border bg-white px-4 text-sm font-semibold text-hier-text outline-none"
            >
              <option value="score_desc">Best HI Score</option>
              <option value="active_first">Actively looking</option>
              <option value="recent">Recently added</option>
              <option value="name">Name A-Z</option>
            </select>
          </label>

          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-hier-muted">
              Move to
            </span>
            <select
              value={moveStage}
              onChange={(event) => setMoveStage(event.target.value as LibraryMoveStage)}
              className="mt-2 h-12 w-full rounded-[18px] border border-hier-border bg-white px-4 text-sm font-semibold text-hier-text outline-none"
            >
              <option value="applied">Applied</option>
              <option value="shortlisted">Shortlisted</option>
            </select>
          </label>

          <button
            type="button"
            onClick={() => void handleShortlist()}
            disabled={!selectedJobId || selectedCount === 0 || busy}
            className="mt-6 inline-flex h-12 items-center justify-center gap-2 rounded-[18px] bg-hier-primary px-5 text-sm font-semibold text-white shadow-sm disabled:opacity-50 lg:mt-auto"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserRoundCheck className="h-4 w-4" />}
            Move {selectedCount || ""} to {moveStage === "shortlisted" ? "Shortlisted" : "Applied"}
          </button>
        </div>

        {selectedJob ? (
          <div className="mt-4 rounded-[22px] border border-hier-border bg-hier-panel px-4 py-3 text-sm text-hier-muted">
            Hi Score AI is rating this library against <span className="font-semibold text-hier-text">{selectedJob.title}</span>.
          </div>
        ) : (
          <div className="mt-4 rounded-[22px] border border-hier-border bg-hier-panel px-4 py-3 text-sm text-hier-muted">
            Showing all library candidates. Select a live role to calculate Hi Scores.
          </div>
        )}
      </section>

      {notice ? (
        <div className="rounded-[22px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          {notice}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-[22px] border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-2">
        {loading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-44 animate-pulse rounded-[28px] border border-hier-border bg-white" />
          ))
        ) : sortedItems.length ? (
          sortedItems.map((item) => {
            const checked = selectedIds.includes(item.id);
            const scoreMeta = resolveHIScore(
              item.hi_score
                ? {
                    score: item.hi_score.score,
                    score_band: item.hi_score.score_band,
                    score_label: item.hi_score.score_label,
                    score_colour: item.hi_score.score_colour,
                    score_color: item.hi_score.score_color,
                  }
                : null,
            );
            const activeLooking = !!item.candidate.active_looking_for_work;
            const previousReview = item.previous_review;
            const previousTags = previousReview?.recruiter_tags || [];
            const hasPreviousReview =
              previousReview?.rating != null ||
              previousTags.length > 0 ||
              Boolean(previousReview?.internal_note);
            return (
              <article
                key={item.id}
                className={`rounded-[28px] border bg-white p-5 shadow-card ${checked ? "border-hier-primary" : "border-hier-border"}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-hier-text">
                      {item.candidate.name || "Candidate"}
                    </h2>
                    <p className="mt-1 text-sm text-hier-muted">
                      {item.candidate.headline || item.candidate.email || "No headline yet"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void openCandidateProfile(item)}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-[16px] border border-hier-border text-hier-muted transition hover:bg-hier-panel hover:text-hier-text"
                      aria-label="Open candidate profile"
                    >
                      <UserSquare2 className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleEntry(item.id)}
                      className={`inline-flex h-10 w-10 items-center justify-center rounded-[16px] border ${checked ? "border-hier-primary bg-hier-primary text-white" : "border-hier-border text-hier-muted"}`}
                      aria-label="Select candidate"
                    >
                      <CheckCircle2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${scoreMeta.badgeClass}`}>
                    <Brain className="h-3.5 w-3.5" />
                    {scoreMeta.score !== null ? `HI ${scoreMeta.score.toFixed(1)}` : "Select role to score"}
                  </span>
                  <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${activeLooking ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                    {activeLooking ? "Actively looking" : "Not actively looking"}
                  </span>
                  <span className="rounded-full bg-hier-soft px-3 py-1.5 text-xs font-semibold text-hier-primary">
                    {item.candidate.has_cv ? "CV saved" : "No CV"}
                  </span>
                </div>

                <p className="mt-4 text-sm leading-6 text-hier-muted">
                  From {item.source_job?.title || "an application"}
                  {item.source_job?.location ? ` · ${item.source_job.location}` : ""}
                </p>

                {hasPreviousReview ? (
                  <div className="mt-4 rounded-[20px] border border-hier-border bg-hier-panel p-4 text-sm text-hier-muted">
                    <p className="font-semibold text-hier-text">
                      Previous record{previousReview?.job_title ? ` from ${previousReview.job_title}` : ""}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {previousReview?.rating != null ? (
                        <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                          Rating {previousReview.rating}/5
                        </span>
                      ) : null}
                      {previousTags.map((tag) => (
                        <span key={tag} className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-hier-muted">
                          {tag}
                        </span>
                      ))}
                    </div>
                    {previousReview?.internal_note ? (
                      <p className="mt-2 line-clamp-2 leading-6">{previousReview.internal_note}</p>
                    ) : null}
                  </div>
                ) : null}

                {item.hi_score?.reasons?.length ? (
                  <p className="mt-3 text-sm leading-6 text-hier-muted">
                    {item.hi_score.reasons.join(" · ")}
                  </p>
                ) : null}
              </article>
            );
          })
        ) : (
          <div className="rounded-[28px] border border-hier-border bg-white p-8 text-sm text-hier-muted shadow-card xl:col-span-2">
            No candidates in this library yet. Candidates will appear here as they apply to your roles.
          </div>
        )}
      </section>

      <ApplicationDetailDrawer
        open={Boolean(selectedApplication)}
        application={selectedApplication}
        candidate={selectedCandidate}
        loading={detailLoading}
        saving={saving}
        cvPreviewUrl={cvPreviewUrl}
        cvPreviewLoading={cvPreviewLoading}
        cvPreviewError={cvPreviewError}
        onClose={() => {
          setSelectedApplication(null);
          setSelectedCandidate(null);
          setCvPreviewUrl(null);
          setCvPreviewError(null);
        }}
        onSave={saveDrawer}
        onOpenCv={openCvPreview}
      />
    </div>
  );
}
