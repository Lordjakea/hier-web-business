"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CandidateBoard } from "@/components/board/board-board";
import { ApplicationDetailDrawer } from "@/components/board/application-detail-drawer";
import { BoardToolbar } from "@/components/board/board-toolbar";
import { PageHeader } from "@/components/ui/page-header";
import {
  fetchBusinessApplicationDetail,
  fetchBusinessApplications,
  fetchBusinessCandidateProfile,
  fetchCvPreviewUrl,
  markBusinessCvViewed,
  updateBusinessApplicationNotes,
  updateBusinessApplicationStage,
  bulkArchiveBusinessApplications,
  bulkMoveBusinessApplicationsStage,
  bulkRejectBusinessApplications,
  completeStartedCandidate,
} from "@/lib/business-applications";
import { startOnboarding } from "@/lib/business-onboarding";
import { createBusinessConversation } from "@/lib/business-messages";
import { resolveHIScore } from "@/lib/hi-score";
import { boardColumns } from "@/lib/theme";
import type {
  ApplicationStage,
  BusinessApplication,
  BusinessCandidate,
} from "@/lib/types";

function isClosedApplication(application: BusinessApplication) {
  const post = application.job_post;
  return (
    post?.post_status === "archived" ||
    Boolean(post?.archived_at) ||
    Boolean(post?.shadow_hidden)
  );
}

export default function CandidatesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialQuery = searchParams.get("q") || "";
  const initialJobId = Number(searchParams.get("jobId") || "") || null;
  const initialApplicationId =
    Number(searchParams.get("applicationId") || "") || null;
  const initialRecruiterId =
    Number(searchParams.get("recruiter_id") || "") || null;
  const initialStage = searchParams.get("stage") as ApplicationStage | null;
  const initialViewed = searchParams.get("viewed");
  const initialMissingRating = searchParams.get("missing_rating") === "1";
  const initialMissingTags = searchParams.get("missing_tags") === "1";
  const initialHasRating = searchParams.get("has_rating") === "1";
  const initialHasTags = searchParams.get("has_tags") === "1";
  const initialHasCvViews = searchParams.get("has_cv_views") === "1";
  const initialIncludeArchived = searchParams.get("includeArchived") === "1";

  const [applications, setApplications] = useState<BusinessApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState(initialQuery);
  const [selectedJobId, setSelectedJobId] = useState<number | null>(
    initialJobId
  );
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const [selectedApplication, setSelectedApplication] =
    useState<BusinessApplication | null>(null);
  const [selectedCandidate, setSelectedCandidate] =
    useState<BusinessCandidate | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draggingApplicationId, setDraggingApplicationId] = useState<
    number | null
  >(null);
  const [cvPreviewUrl, setCvPreviewUrl] = useState<string | null>(null);
  const [cvPreviewLoading, setCvPreviewLoading] = useState(false);
  const [cvPreviewError, setCvPreviewError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [bulkStage, setBulkStage] = useState<ApplicationStage>("shortlisted");
  const [bulkBusy, setBulkBusy] = useState(false);
  const [shortlistMode, setShortlistMode] = useState<"broad" | "balanced" | "strict">("balanced");
  const [shortlistPreviewOpen, setShortlistPreviewOpen] = useState(false);
  const [completionApplication, setCompletionApplication] = useState<BusinessApplication | null>(null);
  const [completionStep, setCompletionStep] = useState<"details" | "close">("details");
  const [completionSaving, setCompletionSaving] = useState(false);
  const [completionForm, setCompletionForm] = useState({
    candidate_name: "",
    employer_name: "",
    job_title: "",
    start_date: "",
    salary: "",
  });

  const hasAutoOpenedRef = useRef(false);

  const loadApplications = useCallback(
    async (options?: {
      searchText?: string;
      jobPostId?: number | null;
      recruiterId?: number | null;
    }) => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetchBusinessApplications({
          q: options?.searchText || undefined,
          job_post_id: options?.jobPostId ?? undefined,
          recruiter_id: options?.recruiterId ?? undefined,
          include_archived: initialIncludeArchived,
          per_page: 100,
        });
        setApplications(response.items || []);
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Could not load business applications."
        );
      } finally {
        setLoading(false);
      }
    },
    [initialIncludeArchived]
  );

  // Keep the board search in sync when a global header search updates the URL.
  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadApplications({
        searchText: query,
        jobPostId: selectedJobId,
        recruiterId: initialRecruiterId,
      });
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [initialRecruiterId, loadApplications, query, selectedJobId]);

  const visibleApplications = useMemo(() => {
    const filtered = applications.filter((application) => {
      if (application.stage === "withdrawn") return false;
      if (!initialIncludeArchived && isClosedApplication(application)) return false;

      const viewed =
        Boolean((application as BusinessApplication & { is_viewed?: boolean }).is_viewed) ||
        Boolean((application as BusinessApplication & { first_viewed_at?: string | null }).first_viewed_at) ||
        Boolean((application as BusinessApplication & { viewed_at?: string | null }).viewed_at) ||
        Boolean((application as BusinessApplication & { last_viewed_at?: string | null }).last_viewed_at);

      const hasRating = typeof application.rating === "number";
      const hasTags = Boolean(application.recruiter_tags?.length);
      const hasCvViews = Number(application.cv_view_count || 0) > 0;

      if (initialStage && application.stage !== initialStage) return false;
      if (initialViewed === "1" && !viewed) return false;
      if (initialViewed === "0" && viewed) return false;
      if (initialMissingRating && hasRating) return false;
      if (initialMissingTags && hasTags) return false;
      if (initialHasRating && !hasRating) return false;
      if (initialHasTags && !hasTags) return false;
      if (initialHasCvViews && !hasCvViews) return false;

      return true;
    });

    return [...filtered].sort((a, b) => {
      const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
      return sort === "newest" ? bTime - aTime : aTime - bTime;
    });
  }, [
    applications,
    initialHasCvViews,
    initialHasRating,
    initialHasTags,
    initialIncludeArchived,
    initialMissingRating,
    initialMissingTags,
    initialStage,
    initialViewed,
    sort,
  ]);

  const jobOptions = useMemo(() => {
    const seen = new Map<number, string>();
    applications.forEach((application) => {
      const id = application.job_post?.id;
      if (!id || seen.has(id)) return;
      if (!initialIncludeArchived && isClosedApplication(application)) return;
      seen.set(id, application.job_post?.title || `Job #${id}`);
    });
    return Array.from(seen.entries())
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [applications, initialIncludeArchived]);

  const stats = useMemo(() => {
    const activeApplicants = visibleApplications.length;
    const openRoles = new Set(
      visibleApplications
        .map((application) => application.job_post?.id)
        .filter(Boolean)
    ).size;
    const interviews = visibleApplications.filter((application) =>
      ["interview_offered", "interview_booked"].includes(application.stage)
    ).length;
    const offers = visibleApplications.filter(
      (application) => application.stage === "offered"
    ).length;

    return [
      {
        label: "Open roles",
        value: String(openRoles),
        sublabel: "Distinct active job posts",
      },
      {
        label: "Active applicants",
        value: String(activeApplicants),
        sublabel: "Live applications in pipeline",
      },
      {
        label: "Interviews live",
        value: String(interviews),
        sublabel: "Offered or booked",
      },
      {
        label: "Offers sent",
        value: String(offers),
        sublabel: "Currently in offer stage",
      },
    ];
  }, [visibleApplications]);

  async function openApplication(application: BusinessApplication) {
    setSelectedApplication(application);
    setSelectedCandidate(null);
    setCvPreviewUrl(null);
    setCvPreviewError(null);
    setDetailLoading(true);

    try {
      const detail = await fetchBusinessApplicationDetail(application.id);
      setSelectedApplication({
        ...detail.application,
        attachments: detail.attachments || [],
      });

      const userId = detail.application.user?.id;
      if (userId) {
        const candidate = await fetchBusinessCandidateProfile(userId);
        setSelectedCandidate(candidate.candidate);
      }
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not load candidate detail."
      );
    } finally {
      setDetailLoading(false);
    }
  }

  useEffect(() => {
    if (!initialApplicationId || loading || hasAutoOpenedRef.current) return;

    const matchedApplication = applications.find(
      (application) => application.id === initialApplicationId
    );

    if (!matchedApplication) return;

    hasAutoOpenedRef.current = true;
    void openApplication(matchedApplication);
  }, [applications, initialApplicationId, loading]);

  async function moveApplication(
    applicationId: number,
    stage: ApplicationStage
  ) {
    const idsToMove =
      selectedIds.includes(applicationId) && selectedIds.length > 1
        ? [...selectedIds]
        : [applicationId];

    const matchingApplications = applications.filter((item) =>
      idsToMove.includes(item.id)
    );

    if (!matchingApplications.length) {
      setDraggingApplicationId(null);
      return;
    }

    const idsThatNeedMoving = matchingApplications
      .filter((item) => item.stage !== stage)
      .map((item) => item.id);

    if (!idsThatNeedMoving.length) {
      setDraggingApplicationId(null);
      return;
    }

    const previous = applications;

    setApplications((current) =>
      current.map((item) =>
        idsThatNeedMoving.includes(item.id) ? { ...item, stage } : item
      )
    );

    setDraggingApplicationId(null);
    setError(null);

    try {
      if (idsThatNeedMoving.length === 1) {
        const updated = await updateBusinessApplicationStage(
          idsThatNeedMoving[0],
          stage
        );

        setApplications((current) =>
          current.map((item) =>
            item.id === updated.id ? { ...item, ...updated } : item
          )
        );

        if (selectedApplication?.id === updated.id) {
          setSelectedApplication((current) =>
            current ? { ...current, ...updated } : current
          );
        }

        if (stage === "offered") {
          const failedCount = await startOnboardingForOfferedApplications([
            updated.id,
          ]);

          if (!failedCount) {
            showToast("Candidate moved to Offered and onboarding started.");
          }
        }
      } else {
        const result = await bulkMoveBusinessApplicationsStage({
          application_ids: idsThatNeedMoving,
          stage,
        });

        let onboardingFailed = 0;
        if (stage === "offered") {
          onboardingFailed = await startOnboardingForOfferedApplications(
            idsThatNeedMoving,
          );
        }

        setSelectedIds([]);
        showToast(
          stage === "offered" && !onboardingFailed
            ? `Moved ${result.updated || idsThatNeedMoving.length} candidates and started onboarding.`
            : `Moved ${result.updated || idsThatNeedMoving.length} candidates successfully.`
        );
      }
    } catch (caughtError) {
      setApplications(previous);
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not move candidate right now."
      );
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
        latest = await updateBusinessApplicationStage(
          selectedApplication.id,
          payload.stage
        );
      }

      latest = await updateBusinessApplicationNotes(selectedApplication.id, {
        rating: payload.rating,
        recruiter_tags: payload.recruiter_tags,
        internal_note: payload.internal_note,
      });

      setSelectedApplication(latest);
      setApplications((current) =>
        current.map((item) => (item.id === latest.id ? { ...item, ...latest } : item))
      );

      if (
        payload.stage === "offered" &&
        payload.stage !== selectedApplication.stage
      ) {
        const failedCount = await startOnboardingForOfferedApplications([
          latest.id,
        ]);

        if (!failedCount) {
          showToast("Candidate moved to Offered and onboarding started.");
        }
      }
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not save recruiter updates."
      );
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
      const preview = await fetchCvPreviewUrl(
        selectedApplication.first_cv_download_url
      );
      setCvPreviewUrl(preview.url || null);

      await markBusinessCvViewed(selectedApplication.id);

      setSelectedApplication((current) =>
        current ? { ...current, cv_view_count: (current.cv_view_count || 0) + 1 } : current
      );

      setApplications((current) =>
        current.map((item) =>
          item.id === selectedApplication.id
            ? { ...item, cv_view_count: (item.cv_view_count || 0) + 1 }
            : item
        )
      );
    } catch (caughtError) {
      setCvPreviewError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not load CV preview right now."
      );
    } finally {
      setCvPreviewLoading(false);
    }
  }

  function toggleSelected(id: number, checked: boolean) {
    setSelectedIds((current) =>
      checked
        ? Array.from(new Set([...current, id]))
        : current.filter((item) => item !== id)
    );
  }

  function selectMany(ids: number[]) {
    setSelectedIds((current) => Array.from(new Set([...current, ...ids])));
  }

  function clearMany(ids: number[]) {
    setSelectedIds((current) => current.filter((id) => !ids.includes(id)));
  }

  async function rejectSingleCandidate(applicationId: number) {
    await moveApplication(applicationId, "rejected" as ApplicationStage);
  }

  async function startMessageForApplication(application: BusinessApplication | null) {
    if (!application?.id || !application.job_post?.id) {
      setError("Could not start a message for this candidate.");
      return;
    }

    setError(null);

    try {
      const response = await createBusinessConversation({
        application_id: application.id,
        job_post_id: application.job_post.id,
      });

      const conversationId = response.conversation?.id;
      router.push(
        conversationId
          ? `/messages?conversationId=${conversationId}`
          : `/messages?applicationId=${application.id}&jobPostId=${application.job_post.id}`,
      );
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not start this conversation.",
      );
    }
  }

  async function openCvPreviewForCard(application: BusinessApplication) {
    if (!application.first_cv_download_url) {
      setError("No CV is available for this candidate yet.");
      return;
    }

    const popup = window.open("", "_blank", "noopener,noreferrer");
    setError(null);

    try {
      const preview = await fetchCvPreviewUrl(application.first_cv_download_url);
      if (popup && preview.url) {
        popup.location.href = preview.url;
      } else if (preview.url) {
        window.open(preview.url, "_blank", "noopener,noreferrer");
      }

      await markBusinessCvViewed(application.id);

      setApplications((current) =>
        current.map((item) =>
          item.id === application.id
            ? { ...item, cv_view_count: (item.cv_view_count || 0) + 1 }
            : item
        )
      );
    } catch (caughtError) {
      popup?.close();
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not load CV preview right now."
      );
    }
  }

  function openStartedCompletion(application: BusinessApplication) {
    const candidateName =
      application.user?.display_name ||
      application.user?.full_name ||
      application.applicant_summary?.candidate_name ||
      "Candidate";

    setCompletionApplication(application);
    setCompletionStep("details");
    setCompletionForm({
      candidate_name: candidateName,
      employer_name: application.job_post?.company_name || "",
      job_title: application.job_post?.title || application.applicant_summary?.job_title || "",
      start_date: "",
      salary: "",
    });
  }

  async function submitStartedCompletion(closePost: boolean) {
    if (!completionApplication) return;

    setCompletionSaving(true);
    setError(null);

    try {
      const response = await completeStartedCandidate(completionApplication.id, {
        ...completionForm,
        currency: "GBP",
        close_post: closePost,
      });
      const updated = response.application;

      setApplications((current) => {
        const next = current.map((item) => (item.id === updated.id ? { ...item, ...updated } : item));
        return closePost
          ? next.map((item) =>
              item.job_post_id === updated.job_post_id && item.id !== updated.id
                ? { ...item, stage: "rejected" as ApplicationStage, status: "rejected" }
                : item
            )
          : next;
      });

      if (selectedApplication?.id === updated.id) {
        setSelectedApplication((current) => (current ? { ...current, ...updated } : current));
      }

      setCompletionApplication(null);
      setCompletionStep("details");
      showToast(closePost ? "Candidate completed and post closed." : "Candidate completed.");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not complete started candidate."
      );
    } finally {
      setCompletionSaving(false);
    }
  }

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 3000);
  }

  async function startOnboardingForOfferedApplications(
    applicationIds: number[],
  ) {
    if (!applicationIds.length) return 0;

    const results = await Promise.allSettled(
      applicationIds.map((applicationId) => startOnboarding(applicationId)),
    );

    const failedCount = results.filter((result) => result.status === "rejected").length;

    if (failedCount) {
      setError(
        failedCount === 1
          ? "Candidate moved to Offered, but onboarding could not be started automatically."
          : `${failedCount} candidates moved to Offered, but onboarding could not be started automatically for them.`,
      );
    }

    return failedCount;
  }

  async function runBulkStageMove() {
    if (!selectedIds.length) return;

    const previous = applications;
    const idsToUpdate = [...selectedIds];
    const selectedCount = idsToUpdate.length;

    setBulkBusy(true);
    setError(null);

    setApplications((current) =>
      current.map((app) =>
        idsToUpdate.includes(app.id) ? { ...app, stage: bulkStage } : app
      )
    );

    try {
      const result = await bulkMoveBusinessApplicationsStage({
        application_ids: idsToUpdate,
        stage: bulkStage,
      });

      let onboardingFailed = 0;
      if (bulkStage === "offered") {
        onboardingFailed = await startOnboardingForOfferedApplications(idsToUpdate);
      }

      setSelectedIds([]);
      showToast(
        bulkStage === "offered" && !onboardingFailed
          ? `Moved ${result.updated || selectedCount} candidate${
              (result.updated || selectedCount) === 1 ? "" : "s"
            } and started onboarding.`
          : `Moved ${result.updated || selectedCount} candidate${
              (result.updated || selectedCount) === 1 ? "" : "s"
            } successfully.`
      );
    } catch (caughtError) {
      setApplications(previous);
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not update selected candidates."
      );
    } finally {
      setBulkBusy(false);
    }
  }

  async function runBulkReject() {
    if (!selectedIds.length) return;

    const previous = applications;
    const idsToUpdate = [...selectedIds];
    const selectedCount = idsToUpdate.length;

    setBulkBusy(true);
    setError(null);

    setApplications((current) =>
      current.map((app) =>
        idsToUpdate.includes(app.id)
          ? { ...app, stage: "rejected" as ApplicationStage, status: "rejected" }
          : app
      )
    );

    try {
      const result = await bulkRejectBusinessApplications({
        application_ids: idsToUpdate,
      });

      setSelectedIds([]);
      showToast(
        `Rejected ${result.updated || selectedCount} candidate${
          (result.updated || selectedCount) === 1 ? "" : "s"
        } successfully.`
      );
    } catch (caughtError) {
      setApplications(previous);
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not reject selected candidates."
      );
    } finally {
      setBulkBusy(false);
    }
  }

  async function runBulkArchive() {
    if (!selectedIds.length) return;

    const previous = applications;
    const idsToUpdate = [...selectedIds];
    const selectedCount = idsToUpdate.length;

    setBulkBusy(true);
    setError(null);

    setApplications((current) =>
      current.filter((app) => !idsToUpdate.includes(app.id))
    );

    try {
      const result = await bulkArchiveBusinessApplications({
        application_ids: idsToUpdate,
      });

      setSelectedIds([]);
      showToast(
        `Archived ${result.updated || selectedCount} candidate${
          (result.updated || selectedCount) === 1 ? "" : "s"
        } successfully.`
      );
    } catch (caughtError) {
      setApplications(previous);
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not archive selected candidates."
      );
    } finally {
      setBulkBusy(false);
    }
  }

  const shortlistThresholds = {
    broad: 38,
    balanced: 58,
    strict: 78,
  };

  const shortlistThreshold = shortlistThresholds[shortlistMode];

  const shortlistPreview = visibleApplications.filter((app) => {
    const { score } = resolveHIScore(app);

    return (
      score !== null &&
      score >= shortlistThreshold &&
      app.stage === "applied"
    );
  });

  const shortlistAverageScore =
    shortlistPreview.length > 0
      ? shortlistPreview.reduce((sum, app) => {
          const { score } = resolveHIScore(app);
          return sum + Number(score || 0);
        }, 0) / shortlistPreview.length
      : 0;

  async function runAutoShortlist() {
    const candidatesToMove = shortlistPreview.map((app) => app.id);

    if (!candidatesToMove.length) {
      showToast("No applied candidates currently match this shortlist setting.");
      return;
    }

    const previous = applications;

    setBulkBusy(true);
    setError(null);
    setShortlistPreviewOpen(false);

    setApplications((current) =>
      current.map((app) =>
        candidatesToMove.includes(app.id)
          ? { ...app, stage: "shortlisted" as ApplicationStage }
          : app
      )
    );

    try {
      const result = await bulkMoveBusinessApplicationsStage({
        application_ids: candidatesToMove,
        stage: "shortlisted" as ApplicationStage,
      });

      showToast(
        `Hier AI shortlisted ${result.updated || candidatesToMove.length} candidate${
          (result.updated || candidatesToMove.length) === 1 ? "" : "s"
        }.`
      );
    } catch (caughtError) {
      setApplications(previous);
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not run Hier AI shortlist."
      );
    } finally {
      setBulkBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Candidates"
        title="Candidate management board"
        description="Your live Hier business pipeline, driven by real applications, stage updates, and recruiter notes. Drag cards across stages or open a candidate to review details."
      />

      {error ? (
        <div className="rounded-[24px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {toast ? (
        <div className="rounded-[24px] border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-semibold text-emerald-700">
          {toast}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-[28px] border border-hier-border bg-white p-5 shadow-card"
          >
            <p className="text-sm text-hier-muted">{stat.label}</p>
            <p className="mt-3 text-3xl font-semibold tracking-tight text-hier-text">
              {stat.value}
            </p>
            <p className="mt-2 text-sm text-hier-muted">{stat.sublabel}</p>
          </div>
        ))}
      </section>

      <BoardToolbar
        query={query}
        onQueryChange={setQuery}
        total={visibleApplications.length}
        loading={loading}
        selectedJobId={selectedJobId}
        onJobChange={setSelectedJobId}
        jobOptions={jobOptions}
        sort={sort}
        onSortChange={setSort}
      />

      <section className="rounded-[28px] border border-hier-border bg-white p-5 shadow-card">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-hier-primary">
              Hier AI Shortlist
            </p>
            <h3 className="mt-1 text-xl font-semibold text-hier-text">
              Find strong applicants still in Applied
            </h3>
            <p className="mt-1 text-sm text-hier-muted">
              Only candidates currently in Applied are included, so nobody further down the pipeline gets moved backwards.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={shortlistMode}
              onChange={(event) =>
                setShortlistMode(event.target.value as "broad" | "balanced" | "strict")
              }
              className="h-10 rounded-2xl border border-hier-border bg-white px-3 text-sm font-semibold text-hier-text"
            >
              <option value="broad">Broad · HI Score 38+</option>
              <option value="balanced">Balanced · HI Score 58+</option>
              <option value="strict">Strict · HI Score 78+</option>
            </select>

            <button
              type="button"
              disabled={bulkBusy || !visibleApplications.length}
              onClick={() => setShortlistPreviewOpen((current) => !current)}
              className="h-10 rounded-2xl border border-hier-border bg-white px-4 text-sm font-semibold text-hier-text transition hover:bg-hier-soft disabled:opacity-50"
            >
              Preview shortlist
            </button>

            <button
              type="button"
              disabled={bulkBusy || shortlistPreview.length === 0}
              onClick={() => void runAutoShortlist()}
              className="h-10 rounded-2xl bg-hier-primary px-4 text-sm font-semibold text-white shadow-card transition hover:opacity-95 disabled:opacity-50"
            >
              Move {shortlistPreview.length} to Shortlisted
            </button>
          </div>
        </div>

        {shortlistPreviewOpen ? (
          <div className="mt-5 rounded-[24px] border border-hier-border bg-hier-panel/60 p-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-hier-muted">
                  Matching candidates
                </p>
                <p className="mt-2 text-2xl font-semibold text-hier-text">
                  {shortlistPreview.length}
                </p>
              </div>

              <div className="rounded-2xl bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-hier-muted">
                  Threshold
                </p>
                <p className="mt-2 text-2xl font-semibold text-hier-text">
                  {shortlistThreshold}+
                </p>
              </div>

              <div className="rounded-2xl bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-hier-muted">
                  Average HI Score
                </p>
                <p className="mt-2 text-2xl font-semibold text-hier-text">
                  {shortlistAverageScore ? shortlistAverageScore.toFixed(1) : "—"}
                </p>
              </div>
            </div>

            <div className="mt-4">
              {shortlistPreview.length ? (
                <div className="space-y-2">
                  {shortlistPreview.slice(0, 5).map((app) => {
                    const scoreMeta = resolveHIScore(app);
                    const score = scoreMeta.score;
                    const name =
                      app.user?.display_name ||
                      app.user?.full_name ||
                      app.user?.email ||
                      "Candidate";

                    return (
                      <div
                        key={app.id}
                        className="flex items-center justify-between rounded-2xl bg-white px-4 py-3"
                      >
                        <div>
                          <p className="text-sm font-semibold text-hier-text">
                            {name}
                          </p>
                          <p className="text-xs text-hier-muted">
                            {app.job_post?.title || "Application"}
                          </p>
                        </div>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${scoreMeta.badgeClass}`}
                          title={scoreMeta.label || "Hier AI Score"}
                        >
                          HI {typeof score === "number" ? score.toFixed(1) : "—"}
                        </span>
                      </div>
                    );
                  })}

                  {shortlistPreview.length > 5 ? (
                    <p className="pt-2 text-xs font-medium text-hier-muted">
                      + {shortlistPreview.length - 5} more candidates will be moved.
                    </p>
                  ) : null}
                </div>
              ) : (
                <p className="text-sm text-hier-muted">
                  No applied candidates match this shortlist setting yet.
                </p>
              )}
            </div>
          </div>
        ) : null}
      </section>

      {selectedIds.length > 0 ? (
        <div className="flex flex-col gap-3 rounded-[24px] border border-hier-border bg-white p-4 shadow-card md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold text-hier-text">
              {selectedIds.length} candidate{selectedIds.length === 1 ? "" : "s"} selected
            </p>
            <p className="mt-1 text-xs text-hier-muted">
              Move, reject, or archive selected candidates in bulk.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={bulkStage}
              onChange={(event) => setBulkStage(event.target.value as ApplicationStage)}
              className="h-10 rounded-2xl border border-hier-border bg-white px-3 text-sm font-semibold text-hier-text"
            >
              {boardColumns.map((column) => (
                <option key={column.id} value={column.id}>
                  Move to {column.title}
                </option>
              ))}
            </select>

            <button
              type="button"
              disabled={bulkBusy}
              onClick={() => void runBulkStageMove()}
              className="h-10 rounded-2xl bg-hier-primary px-4 text-sm font-semibold text-white disabled:opacity-50"
            >
              Move
            </button>

            <button
              type="button"
              disabled={bulkBusy}
              onClick={() => void runBulkReject()}
              className="h-10 rounded-2xl border border-rose-100 bg-rose-50 px-4 text-sm font-semibold text-rose-700 disabled:opacity-50"
            >
              Reject
            </button>

            <button
              type="button"
              disabled={bulkBusy}
              onClick={() => void runBulkArchive()}
              className="h-10 rounded-2xl border border-hier-border bg-white px-4 text-sm font-semibold text-hier-muted disabled:opacity-50"
            >
              Archive
            </button>

            <button
              type="button"
              disabled={bulkBusy || visibleApplications.length === 0}
              onClick={() => setSelectedIds(visibleApplications.map((app) => app.id))}
              className="h-10 rounded-2xl border border-hier-border bg-white px-4 text-sm font-semibold text-hier-text disabled:opacity-50"
            >
              Select all filtered
            </button>

            <button
              type="button"
              disabled={bulkBusy}
              onClick={() => setSelectedIds([])}
              className="h-10 rounded-2xl border border-hier-border bg-white px-4 text-sm font-semibold text-hier-text disabled:opacity-50"
            >
              Clear
            </button>
          </div>
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-[28px] border border-hier-border bg-white p-10 text-sm text-hier-muted shadow-card">
          Loading applications…
        </div>
      ) : visibleApplications.length === 0 ? (
        <div className="rounded-[28px] border border-hier-border bg-white p-10 text-sm text-hier-muted shadow-card">
          No candidates match this filter yet.
        </div>
      ) : (
        <CandidateBoard
          columns={boardColumns}
          candidates={visibleApplications}
          selectedIds={selectedIds}
          maxVisibleColumns={6}
          onOpenCandidate={openApplication}
          onOpenCandidateCv={openCvPreviewForCard}
          onMoveCandidate={moveApplication}
          onCompleteStarted={openStartedCompletion}
          onRejectCandidate={rejectSingleCandidate}
          onDragCandidate={setDraggingApplicationId}
          onToggleSelect={toggleSelected}
          onSelectMany={selectMany}
          onClearMany={clearMany}
          draggingApplicationId={draggingApplicationId}
        />
      )}

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
        onStartMessage={() => void startMessageForApplication(selectedApplication)}
      />

      {completionApplication ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-hier-text/40 p-4">
          <div className="w-full max-w-xl rounded-[28px] border border-hier-border bg-white p-6 shadow-panel">
            {completionStep === "details" ? (
              <>
                <h2 className="text-xl font-semibold text-hier-text">Complete started candidate</h2>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  {[
                    ["Name", "candidate_name", "text"],
                    ["Employer", "employer_name", "text"],
                    ["Job title", "job_title", "text"],
                    ["Start date", "start_date", "date"],
                    ["Salary", "salary", "number"],
                  ].map(([label, field, type]) => (
                    <label key={field} className="space-y-2 text-sm font-medium text-hier-text">
                      {label}
                      <input
                        type={type}
                        value={String(completionForm[field as keyof typeof completionForm] || "")}
                        onChange={(event) =>
                          setCompletionForm((current) => ({ ...current, [field]: event.target.value }))
                        }
                        required={field === "start_date" || field === "salary"}
                        className="h-12 w-full rounded-[18px] border border-hier-border bg-hier-panel px-4 text-sm outline-none focus:border-hier-primary focus:bg-white"
                      />
                    </label>
                  ))}
                </div>
                <div className="mt-6 flex flex-wrap justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setCompletionApplication(null)}
                    className="h-11 rounded-[18px] border border-hier-border px-4 text-sm font-semibold text-hier-text"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!completionForm.start_date || !completionForm.salary) {
                        setError("Start date and salary are required.");
                        return;
                      }
                      setCompletionStep("close");
                    }}
                    className="h-11 rounded-[18px] bg-hier-primary px-5 text-sm font-semibold text-white"
                  >
                    Next
                  </button>
                </div>
              </>
            ) : (
              <>
                <h2 className="text-xl font-semibold text-hier-text">Close this post?</h2>
                <p className="mt-3 text-sm leading-6 text-hier-muted">
                  You can archive the post and reject all other applicants, or leave the post open.
                </p>
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    disabled={completionSaving}
                    onClick={() => void submitStartedCompletion(true)}
                    className="rounded-[20px] border border-emerald-200 bg-emerald-50 px-4 py-4 text-left text-sm font-semibold text-emerald-800 disabled:opacity-60"
                  >
                    Archive post and reject others
                  </button>
                  <button
                    type="button"
                    disabled={completionSaving}
                    onClick={() => void submitStartedCompletion(false)}
                    className="rounded-[20px] border border-hier-border bg-white px-4 py-4 text-left text-sm font-semibold text-hier-text disabled:opacity-60"
                  >
                    Leave post open
                  </button>
                </div>
                <button
                  type="button"
                  disabled={completionSaving}
                  onClick={() => setCompletionStep("details")}
                  className="mt-4 text-sm font-semibold text-hier-muted"
                >
                  Back
                </button>
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
