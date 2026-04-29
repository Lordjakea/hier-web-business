"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
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
} from "@/lib/business-applications";
import { boardColumns } from "@/lib/theme";
import type {
  ApplicationStage,
  BusinessApplication,
  BusinessCandidate,
} from "@/lib/types";

export default function CandidatesPage() {
  const searchParams = useSearchParams();

  const initialJobId = Number(searchParams.get("jobId") || "") || null;
  const initialApplicationId =
    Number(searchParams.get("applicationId") || "") || null;

  const [applications, setApplications] = useState<BusinessApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
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

  const hasAutoOpenedRef = useRef(false);

  const loadApplications = useCallback(
    async (options?: { searchText?: string; jobPostId?: number | null }) => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetchBusinessApplications({
          q: options?.searchText || undefined,
          job_post_id: options?.jobPostId ?? undefined,
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
    []
  );

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadApplications({ searchText: query, jobPostId: selectedJobId });
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [loadApplications, query, selectedJobId]);

  const visibleApplications = useMemo(() => {
    const filtered = applications.filter(
      (application) => application.stage !== "withdrawn"
    );
    return [...filtered].sort((a, b) => {
      const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
      return sort === "newest" ? bTime - aTime : aTime - bTime;
    });
  }, [applications, sort]);

  const jobOptions = useMemo(() => {
    const seen = new Map<number, string>();
    applications.forEach((application) => {
      const id = application.job_post?.id;
      if (!id || seen.has(id)) return;
      seen.set(id, application.job_post?.title || `Job #${id}`);
    });
    return Array.from(seen.entries())
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [applications]);

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
      } else {
        const result = await bulkMoveBusinessApplicationsStage({
          application_ids: idsThatNeedMoving,
          stage,
        });

        setSelectedIds([]);
        showToast(
          `Moved ${result.updated || idsThatNeedMoving.length} candidates successfully.`
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

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 3000);
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

      setSelectedIds([]);
      showToast(
        `Moved ${result.updated || selectedCount} candidate${
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
          onMoveCandidate={moveApplication}
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
      />
    </div>
  );
}