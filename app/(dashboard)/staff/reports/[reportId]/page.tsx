"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Flag,
  Loader2,
  ShieldAlert,
  XCircle,
} from "lucide-react";

import {
  dismissStaffReport,
  fetchStaffReport,
  resolveAndArchiveReportedPost,
  resolveAndHideContentPost,
  resolveStaffReport,
  updateStaffReport,
  type StaffReport,
} from "@/lib/staff-crm";

function formatDate(value?: string | null) {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return "—";
  }
}

function reasonLabel(reason?: string | null) {
  return (reason || "unknown")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function statusClass(status: string) {
  if (status === "open") return "bg-red-50 text-red-700 border-red-200";
  if (status === "reviewing") return "bg-amber-50 text-amber-700 border-amber-200";
  if (status === "resolved") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (status === "dismissed") return "bg-hier-panel text-hier-muted border-hier-border";
  return "bg-hier-panel text-hier-text border-hier-border";
}

function mediaUrl(post: any) {
  const firstMedia = Array.isArray(post?.media) ? post.media[0] : null;
  return (
    post?.hero_image_url ||
    post?.hero_video_url ||
    firstMedia?.display_url ||
    firstMedia?.processed_public_url ||
    firstMedia?.public_url ||
    null
  );
}

export default function StaffReportDetailPage({
  params,
}: {
  params: { reportId: string };
}) {
  const [report, setReport] = useState<StaffReport | null>(null);
  const [post, setPost] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetchStaffReport(params.reportId);
      setReport(res.report);
      setPost(res.post || res.content_post || res.job_post || null);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not load report."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [params.reportId]);

  async function runAction(action: () => Promise<any>) {
    setBusy(true);
    setError(null);

    try {
      await action();
      await load();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Report action failed."
      );
    } finally {
      setBusy(false);
    }
  }

  const previewUrl = useMemo(() => mediaUrl(post), [post]);
  const isVideo = String(previewUrl || "").includes(".mp4") || post?.media_type === "video";

  if (loading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-hier-primary" />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="space-y-6">
        <Link href="/staff/reports" className="inline-flex items-center gap-2 text-sm font-medium text-hier-muted hover:text-hier-text">
          <ArrowLeft className="h-4 w-4" />
          Back to reports
        </Link>

        <div className="rounded-[28px] border border-red-200 bg-red-50 p-5 text-red-800">
          Report not found.
        </div>
      </div>
    );
  }

  const canArchive = report.entity_type === "job_post";
  const canHideContent = report.entity_type === "content_post";

  return (
    <div className="space-y-8">
      <Link href="/staff/reports" className="inline-flex items-center gap-2 text-sm font-medium text-hier-muted hover:text-hier-text">
        <ArrowLeft className="h-4 w-4" />
        Back to reports
      </Link>

      {error ? (
        <div className="flex items-start gap-3 rounded-[24px] border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">Action failed</p>
            <p className="mt-1">{error}</p>
          </div>
        </div>
      ) : null}

      <section className="rounded-[32px] border border-hier-border bg-white p-6 shadow-card">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusClass(report.status)}`}>
                {report.status}
              </span>
              <span className="rounded-full border border-hier-border bg-hier-panel px-3 py-1 text-xs font-semibold text-hier-muted">
                {report.entity_type.replaceAll("_", " ")} #{report.entity_id}
              </span>
            </div>

            <h1 className="mt-4 text-2xl font-semibold text-hier-text">
              Report #{report.id}: {reasonLabel(report.reason)}
            </h1>

            <p className="mt-2 text-sm text-hier-muted">
              Reporter user #{report.reporter_user_id} · {formatDate(report.created_at)}
            </p>

            <p className="mt-4 max-w-3xl text-sm leading-6 text-hier-muted">
              {report.details || "No extra details were provided by the reporter."}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void runAction(() => updateStaffReport(report.id, { status: "reviewing" }))}
              className="inline-flex items-center gap-2 rounded-[18px] border border-hier-border bg-white px-4 py-2 text-sm font-semibold text-hier-text hover:bg-hier-soft disabled:opacity-60"
            >
              <ShieldAlert className="h-4 w-4" />
              Reviewing
            </button>

            <button
              type="button"
              disabled={busy}
              onClick={() => void runAction(() => resolveStaffReport(report.id))}
              className="inline-flex items-center gap-2 rounded-[18px] border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 disabled:opacity-60"
            >
              <CheckCircle2 className="h-4 w-4" />
              Resolve
            </button>

            <button
              type="button"
              disabled={busy}
              onClick={() => void runAction(() => dismissStaffReport(report.id))}
              className="inline-flex items-center gap-2 rounded-[18px] border border-hier-border bg-hier-panel px-4 py-2 text-sm font-semibold text-hier-muted disabled:opacity-60"
            >
              <XCircle className="h-4 w-4" />
              Dismiss
            </button>

            {canArchive ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  if (!window.confirm("Archive this reported job post?")) return;
                  void runAction(() => resolveAndArchiveReportedPost(report.id));
                }}
                className="inline-flex items-center gap-2 rounded-[18px] bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-60"
              >
                <Flag className="h-4 w-4" />
                Archive post
              </button>
            ) : null}

            {canHideContent ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  if (!window.confirm("Hide this reported content post?")) return;
                  void runAction(() => resolveAndHideContentPost(report.id));
                }}
                className="inline-flex items-center gap-2 rounded-[18px] bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-60"
              >
                <Flag className="h-4 w-4" />
                Hide content
              </button>
            ) : null}
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <div className="rounded-[32px] border border-hier-border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-hier-text">Reported post preview</h2>

          {post ? (
            <div className="mt-5 overflow-hidden rounded-[28px] border border-hier-border bg-hier-panel">
              {previewUrl ? (
                isVideo ? (
                  <video src={previewUrl} controls className="max-h-[520px] w-full bg-black object-contain" />
                ) : (
                  <img src={previewUrl} alt="" className="max-h-[520px] w-full object-cover" />
                )
              ) : (
                <div className="flex min-h-[240px] items-center justify-center text-sm text-hier-muted">
                  No media preview available.
                </div>
              )}

              <div className="space-y-3 p-5">
                {post.title ? (
                  <h3 className="text-xl font-semibold text-hier-text">{post.title}</h3>
                ) : null}

                <p className="whitespace-pre-wrap text-sm leading-6 text-hier-text">
                  {post.caption || post.description || "No caption or description."}
                </p>

                <div className="flex flex-wrap gap-2 text-xs text-hier-muted">
                  {post.company_name ? <span>{post.company_name}</span> : null}
                  {post.location_text || post.location ? <span>· {post.location_text || post.location}</span> : null}
                  {post.is_active === false ? <span>· Hidden/inactive</span> : <span>· Active</span>}
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-5 rounded-[28px] border border-dashed border-hier-border bg-hier-panel p-8 text-sm text-hier-muted">
              The reported post could not be found. It may already have been deleted.
            </div>
          )}
        </div>

        <div className="rounded-[32px] border border-hier-border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-hier-text">Post details</h2>

          <dl className="mt-5 space-y-4 text-sm">
            <div>
              <dt className="font-medium text-hier-muted">Entity</dt>
              <dd className="mt-1 text-hier-text">{report.entity_type} #{report.entity_id}</dd>
            </div>

            <div>
              <dt className="font-medium text-hier-muted">Owner user ID</dt>
              <dd className="mt-1 text-hier-text">{post?.business_user_id || "—"}</dd>
            </div>

            <div>
              <dt className="font-medium text-hier-muted">Likes</dt>
              <dd className="mt-1 text-hier-text">{post?.like_count ?? "—"}</dd>
            </div>

            <div>
              <dt className="font-medium text-hier-muted">Comments</dt>
              <dd className="mt-1 text-hier-text">{post?.comment_count ?? "—"}</dd>
            </div>

            <div>
              <dt className="font-medium text-hier-muted">Created</dt>
              <dd className="mt-1 text-hier-text">{formatDate(post?.created_at)}</dd>
            </div>
          </dl>
        </div>
      </section>
    </div>
  );
}