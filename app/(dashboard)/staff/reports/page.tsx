"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Flag,
  Loader2,
  RefreshCw,
  ShieldAlert,
  XCircle,
} from "lucide-react";

import { PageHeader } from "@/components/ui/page-header";
import {
  dismissStaffReport,
  fetchStaffReports,
  resolveAndArchiveReportedPost,
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

function reasonLabel(reason: string) {
  return reason
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

export default function StaffReportsPage() {
  const [items, setItems] = useState<StaffReport[]>([]);
  const [status, setStatus] = useState("open");
  const [entityType, setEntityType] = useState("all");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetchStaffReports({
        status,
        entity_type: entityType,
        per_page: 50,
      });

      setItems(res.items || []);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not load reports."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [status, entityType]);

  async function runAction(reportId: number, action: () => Promise<any>) {
    setBusyId(reportId);
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
      setBusyId(null);
    }
  }

  const stats = useMemo(() => {
    return {
      total: items.length,
      open: items.filter((item) => item.status === "open").length,
      reviewing: items.filter((item) => item.status === "reviewing").length,
    };
  }, [items]);

  return (
    <div className="space-y-8">
      <Link
        href="/staff"
        className="inline-flex items-center gap-2 text-sm font-medium text-hier-muted hover:text-hier-text"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Staff CRM
      </Link>

      <PageHeader
        eyebrow="Trust & Safety"
        title="Reports"
        description="Review posts reported from the candidate and business feeds, update status, dismiss false reports, or archive harmful content."
        action={
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex items-center gap-2 rounded-[20px] border border-hier-border bg-white px-4 py-2 text-sm font-semibold text-hier-text shadow-sm hover:bg-hier-soft"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        }
      />

      {error ? (
        <div className="flex items-start gap-3 rounded-[24px] border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">Reports unavailable</p>
            <p className="mt-1">{error}</p>
          </div>
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-[28px] border border-hier-border bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-hier-muted">Visible reports</p>
          <p className="mt-3 text-3xl font-semibold text-hier-text">{stats.total}</p>
        </div>
        <div className="rounded-[28px] border border-hier-border bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-hier-muted">Open</p>
          <p className="mt-3 text-3xl font-semibold text-red-600">{stats.open}</p>
        </div>
        <div className="rounded-[28px] border border-hier-border bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-hier-muted">Reviewing</p>
          <p className="mt-3 text-3xl font-semibold text-amber-600">{stats.reviewing}</p>
        </div>
      </section>

      <section className="rounded-[32px] border border-hier-border bg-white p-5 shadow-card">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-medium text-hier-text">Status</span>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="h-12 w-full rounded-[18px] border border-hier-border bg-hier-panel px-4 text-sm outline-none focus:border-hier-primary"
            >
              <option value="open">Open</option>
              <option value="reviewing">Reviewing</option>
              <option value="resolved">Resolved</option>
              <option value="dismissed">Dismissed</option>
              <option value="all">All</option>
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-sm font-medium text-hier-text">Content type</span>
            <select
              value={entityType}
              onChange={(event) => setEntityType(event.target.value)}
              className="h-12 w-full rounded-[18px] border border-hier-border bg-hier-panel px-4 text-sm outline-none focus:border-hier-primary"
            >
              <option value="all">All</option>
              <option value="content_post">Feed posts</option>
              <option value="job_post">Job posts</option>
            </select>
          </label>
        </div>
      </section>

      <section className="space-y-3">
        {loading ? (
          <div className="flex min-h-[260px] items-center justify-center rounded-[32px] border border-hier-border bg-white">
            <Loader2 className="h-6 w-6 animate-spin text-hier-primary" />
          </div>
        ) : items.length ? (
          items.map((report) => {
            const isBusy = busyId === report.id;
            const canArchive = report.entity_type === "job_post";

            return (
              <div
                key={report.id}
                className="rounded-[28px] border border-hier-border bg-white p-5 shadow-sm"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusClass(report.status)}`}>
                        {report.status}
                      </span>

                      <span className="rounded-full border border-hier-border bg-hier-panel px-3 py-1 text-xs font-semibold text-hier-muted">
                        {report.entity_type.replaceAll("_", " ")} #{report.entity_id}
                      </span>
                    </div>

                    <h2 className="mt-3 text-base font-semibold text-hier-text">
                      {reasonLabel(report.reason)}
                    </h2>

                    <p className="mt-2 text-sm leading-6 text-hier-muted">
                      {report.details || "No extra details provided."}
                    </p>

                    <p className="mt-3 text-xs text-hier-muted">
                      Report #{report.id} · Reporter user #{report.reporter_user_id} · {formatDate(report.created_at)}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() =>
                        void runAction(report.id, () =>
                          updateStaffReport(report.id, { status: "reviewing" })
                        )
                      }
                      className="inline-flex items-center gap-2 rounded-[18px] border border-hier-border bg-white px-4 py-2 text-sm font-semibold text-hier-text hover:bg-hier-soft disabled:opacity-60"
                    >
                      <ShieldAlert className="h-4 w-4" />
                      Reviewing
                    </button>

                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() =>
                        void runAction(report.id, () => resolveStaffReport(report.id))
                      }
                      className="inline-flex items-center gap-2 rounded-[18px] border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 disabled:opacity-60"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Resolve
                    </button>

                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() =>
                        void runAction(report.id, () => dismissStaffReport(report.id))
                      }
                      className="inline-flex items-center gap-2 rounded-[18px] border border-hier-border bg-hier-panel px-4 py-2 text-sm font-semibold text-hier-muted disabled:opacity-60"
                    >
                      <XCircle className="h-4 w-4" />
                      Dismiss
                    </button>

                    {canArchive ? (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => {
                          if (!window.confirm("Archive this reported job post?")) return;
                          void runAction(report.id, () =>
                            resolveAndArchiveReportedPost(report.id)
                          );
                        }}
                        className="inline-flex items-center gap-2 rounded-[18px] bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm disabled:opacity-60"
                      >
                        {isBusy ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Flag className="h-4 w-4" />
                        )}
                        Archive post
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="rounded-[32px] border border-dashed border-hier-border bg-white p-10 text-center">
            <p className="text-base font-semibold text-hier-text">No reports found</p>
            <p className="mt-2 text-sm text-hier-muted">
              New reports from the app will appear here.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}