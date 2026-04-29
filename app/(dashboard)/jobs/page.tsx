"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BriefcaseBusiness,
  Eye,
  FileText,
  Image as ImageIcon,
  Megaphone,
  PenSquare,
  Plus,
  RefreshCw,
  Video,
} from "lucide-react";

import { PageHeader } from "@/components/ui/page-header";
import { ApiError } from "@/lib/api";
import {
  archiveBusinessContentPost,
  archiveBusinessPost,
  fetchBusinessContent,
  fetchBusinessJobs,
  type ManagedPostItem,
} from "@/lib/business-posts";

type KindTab = "all" | "job" | "content";
type StatusTab = "live" | "draft" | "archived";

function formatDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatSalary(item: ManagedPostItem) {
  if (item.kind !== "job") return null;

  if (item.is_gig && item.budget) {
    return `${item.currency || "GBP"} ${item.budget}`;
  }

  if (item.salary_min && item.salary_max) {
    return `${item.currency || "GBP"} ${item.salary_min.toLocaleString()}-${item.salary_max.toLocaleString()} ${
      item.salary_period === "hourly" ? "/ hr" : "/ yr"
    }`;
  }

  return null;
}

function mediaPreview(item: ManagedPostItem) {
  if (item.media_type === "video" && item.hero_video_url) {
    return { type: "video" as const, url: item.hero_video_url };
  }

  if (item.hero_image_url) {
    return { type: "image" as const, url: item.hero_image_url };
  }

  return null;
}

function getPostStatus(item: ManagedPostItem): StatusTab {
  if (item.kind === "job") {
    const status = String(item.post_status || "").toLowerCase();

    if (status === "draft" || status === "archived" || status === "live") {
      return status;
    }
  }

  return item.is_active === false ? "archived" : "live";
}

function statusLabel(status: StatusTab) {
  if (status === "draft") return "Draft";
  if (status === "archived") return "Archived";
  return "Live";
}

function statusClass(status: StatusTab) {
  if (status === "live") return "bg-emerald-50 text-emerald-700";
  if (status === "draft") return "bg-amber-50 text-amber-700";
  return "bg-zinc-100 text-zinc-600";
}

export default function JobsPage() {
  const [items, setItems] = useState<ManagedPostItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeKindTab, setActiveKindTab] = useState<KindTab>("all");
  const [activeStatusTab, setActiveStatusTab] = useState<StatusTab>("live");
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load(initial = false) {
    try {
      initial ? setLoading(true) : setRefreshing(true);
      setError(null);

      const includeArchived = activeStatusTab === "archived";

      const [jobs, content] = await Promise.all([
        fetchBusinessJobs({
          postStatus: activeStatusTab,
          includeArchived,
        }),
        fetchBusinessContent({
          includeInactive: includeArchived,
        }),
      ]);

      const merged: ManagedPostItem[] = [
        ...(jobs.items || []).map((item) => ({ ...item, kind: "job" as const })),
        ...(content.items || [])
          .map((item) => ({ ...item, kind: "content" as const }))
          .filter((item) => {
            if (activeStatusTab === "draft") return false;
            if (activeStatusTab === "archived") return item.is_active === false;
            return item.is_active !== false;
          }),
      ].sort((a, b) =>
        String(b.created_at || "").localeCompare(String(a.created_at || "")),
      );

      setItems(merged);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load posts right now.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStatusTab]);

  const filteredItems = useMemo(() => {
    if (activeKindTab === "all") return items;
    return items.filter((item) => item.kind === activeKindTab);
  }, [items, activeKindTab]);

  const kindCounts = useMemo(
    () => ({
      all: items.length,
      job: items.filter((item) => item.kind === "job").length,
      content: items.filter((item) => item.kind === "content").length,
    }),
    [items],
  );

  async function handleArchive(item: ManagedPostItem) {
    try {
      setBusyId(`archive-${item.kind}-${item.id}`);

      if (item.kind === "job") {
        await archiveBusinessPost(item.id);
      } else {
        await archiveBusinessContentPost(item.id);
      }

      await load(false);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not archive post.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Posts"
        title="Create and manage jobs and content"
        description="Manage live roles, drafts, archived posts, candidates, and promotion from one dashboard."
        action={
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => void load(false)}
              className="inline-flex h-11 items-center gap-2 rounded-2xl border border-hier-border bg-white px-4 text-sm font-semibold text-hier-text transition hover:bg-hier-panel"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </button>

            <Link
              href="/jobs/create"
              className="inline-flex h-11 items-center gap-2 rounded-2xl bg-hier-primary px-4 text-sm font-semibold text-white shadow-card transition hover:opacity-95"
            >
              <Plus className="h-4 w-4" />
              Create post
            </Link>
          </div>
        }
      />

      <div className="rounded-[28px] border border-hier-border bg-white p-5 shadow-card">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold text-hier-text">
              Need a new role or content update?
            </p>
            <p className="mt-1 text-sm text-hier-muted">
              Use the web create flow to publish jobs, gigs, and standard content from desktop.
            </p>
          </div>

          <Link
            href="/jobs/create"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-hier-primary px-5 text-sm font-semibold text-white shadow-card transition hover:opacity-95"
          >
            <Plus className="h-4 w-4" />
            Create post
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {(["live", "draft", "archived"] as StatusTab[]).map((tab) => {
          const active = activeStatusTab === tab;

          return (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveStatusTab(tab)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                active
                  ? "bg-hier-primary text-white"
                  : "border border-hier-border bg-white text-hier-text hover:bg-hier-panel"
              }`}
            >
              {statusLabel(tab)}
            </button>
          );
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          ["All posts", kindCounts.all, "all"],
          ["Jobs", kindCounts.job, "job"],
          ["Content", kindCounts.content, "content"],
        ].map(([label, count, key]) => {
          const active = activeKindTab === key;

          return (
            <button
              key={String(key)}
              type="button"
              onClick={() => setActiveKindTab(key as KindTab)}
              className={`rounded-[28px] border p-5 text-left transition ${
                active
                  ? "border-hier-primary bg-hier-soft"
                  : "border-hier-border bg-white hover:bg-hier-panel"
              }`}
            >
              <p className="text-sm font-semibold text-hier-muted">{label}</p>
              <p className="mt-2 text-3xl font-semibold text-hier-text">{count}</p>
            </button>
          );
        })}
      </div>

      {error ? (
        <div className="rounded-[24px] border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      ) : null}

      <div className="rounded-[32px] border border-hier-border bg-white p-4 shadow-panel">
        {loading ? (
          <div className="grid gap-4 xl:grid-cols-2">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div
                key={idx}
                className="h-56 animate-pulse rounded-[28px] border border-hier-border bg-hier-panel"
              />
            ))}
          </div>
        ) : filteredItems.length ? (
          <div className="grid gap-4 xl:grid-cols-2">
            {filteredItems.map((item) => {
              const postStatus = getPostStatus(item);
              const salary = formatSalary(item);
              const preview = mediaPreview(item);
              const isArchived = postStatus === "archived";

              return (
                <article
                  key={`${item.kind}-${item.id}`}
                  className="overflow-hidden rounded-[28px] border border-hier-border bg-hier-panel/55"
                >
                  {preview ? (
                    <div className="relative h-48 w-full overflow-hidden border-b border-hier-border bg-zinc-100">
                      {preview.type === "image" ? (
                        <Image
                          src={preview.url}
                          alt={
                            item.kind === "job"
                              ? item.title || "Post image"
                              : item.caption || "Post image"
                          }
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center gap-3 bg-zinc-900 text-white">
                          <Video className="h-6 w-6" />
                          <span className="text-sm font-semibold">Video attached</span>
                        </div>
                      )}
                    </div>
                  ) : null}

                  <div className="flex flex-col gap-4 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
                              item.kind === "job"
                                ? "bg-white text-hier-text"
                                : "bg-hier-soft text-hier-primary"
                            }`}
                          >
                            {item.kind === "job"
                              ? item.is_gig
                                ? "Gig"
                                : "Job"
                              : "Content"}
                          </span>

                          <span
                            className={`rounded-full px-3 py-1 text-[11px] font-semibold ${statusClass(
                              postStatus,
                            )}`}
                          >
                            {statusLabel(postStatus)}
                          </span>

                          {item.kind === "job" && item.promoted_active ? (
                            <span className="rounded-full bg-amber-50 px-3 py-1 text-[11px] font-semibold text-amber-700">
                              Promoted
                            </span>
                          ) : null}
                        </div>

                        <h3 className="mt-3 line-clamp-2 text-xl font-semibold text-hier-text">
                          {item.kind === "content"
                            ? item.caption || item.title || "Untitled content post"
                            : item.title || "Untitled role"}
                        </h3>

                        <p className="mt-2 line-clamp-3 text-sm leading-6 text-hier-muted">
                          {item.description || "No description added yet."}
                        </p>
                      </div>

                      <div className="shrink-0 rounded-[20px] border border-hier-border bg-white px-3 py-2 text-right">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-hier-muted">
                          Created
                        </p>
                        <p className="mt-2 text-lg font-semibold text-hier-text">
                          {formatDate(item.created_at)}
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-3">
                      <div className="rounded-[20px] border border-hier-border bg-white p-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-hier-muted">
                          Company
                        </p>
                        <p className="mt-2 text-base font-semibold text-hier-text">
                          {item.company_name || "Hier"}
                        </p>
                      </div>

                      <div className="rounded-[20px] border border-hier-border bg-white p-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-hier-muted">
                          Location
                        </p>
                        <p className="mt-2 text-base font-semibold text-hier-text">
                          {item.kind === "job"
                            ? item.location_text ||
                              item.location ||
                              (item.is_remote ? "Remote" : "Not set")
                            : "Standard content"}
                        </p>
                      </div>

                      <div className="rounded-[20px] border border-hier-border bg-white p-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-hier-muted">
                          Value
                        </p>
                        <p className="mt-2 text-base font-semibold text-hier-text">
                          {item.kind === "job"
                            ? salary || `${item.applicant_count || 0} applicants`
                            : `${item.like_count || 0} likes`}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <Link
                        href={`/jobs/${item.id}`}
                        className="inline-flex h-11 items-center gap-2 rounded-2xl bg-white px-4 text-sm font-semibold text-hier-text shadow-card transition hover:bg-hier-soft"
                      >
                        <Eye className="h-4 w-4" />
                        View details
                      </Link>

                      <Link
                        href={`/jobs/${item.id}/edit?kind=${item.kind}`}
                        className="inline-flex h-11 items-center gap-2 rounded-2xl border border-hier-border bg-white px-4 text-sm font-semibold text-hier-text transition hover:bg-hier-soft"
                      >
                        <PenSquare className="h-4 w-4" />
                        Edit
                      </Link>

                      {item.kind === "job" ? (
                        <Link
                          href={`/candidates?jobId=${item.id}${
                            isArchived ? "&includeArchived=1" : ""
                          }`}
                          className="inline-flex h-11 items-center gap-2 rounded-2xl border border-hier-border bg-white px-4 text-sm font-semibold text-hier-text transition hover:bg-hier-soft"
                        >
                          <BriefcaseBusiness className="h-4 w-4" />
                          View candidates
                        </Link>
                      ) : (
                        <div className="inline-flex h-11 items-center gap-2 rounded-2xl bg-white px-4 text-sm font-semibold text-hier-text shadow-card">
                          <FileText className="h-4 w-4" />
                          {item.comment_count || 0} comments
                        </div>
                      )}

                      {item.kind === "job" && !isArchived ? (
                        <Link
                          href="/promote"
                          className="inline-flex h-11 items-center gap-2 rounded-2xl border border-hier-border bg-white px-4 text-sm font-semibold text-hier-text transition hover:bg-hier-soft"
                        >
                          <Megaphone className="h-4 w-4" />
                          Promote
                        </Link>
                      ) : null}

                      <button
                        type="button"
                        disabled={busyId === `archive-${item.kind}-${item.id}` || isArchived}
                        onClick={() => void handleArchive(item)}
                        className="inline-flex h-11 items-center rounded-2xl border border-hier-border bg-white px-4 text-sm font-semibold text-hier-muted transition hover:bg-hier-soft disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isArchived
                          ? "Archived"
                          : busyId === `archive-${item.kind}-${item.id}`
                            ? "Archiving…"
                            : "Archive"}
                      </button>

                      <Link
                        href="/jobs/create"
                        className="ml-auto inline-flex items-center gap-2 text-sm font-semibold text-hier-primary"
                      >
                        Duplicate structure
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="rounded-[28px] border border-dashed border-hier-border bg-hier-panel/40 px-6 py-14 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-card">
              {activeKindTab === "content" ? (
                <ImageIcon className="h-6 w-6 text-hier-primary" />
              ) : activeKindTab === "job" ? (
                <BriefcaseBusiness className="h-6 w-6 text-hier-primary" />
              ) : (
                <FileText className="h-6 w-6 text-hier-primary" />
              )}
            </div>

            <h3 className="mt-5 text-xl font-semibold text-hier-text">
              No {statusLabel(activeStatusTab).toLowerCase()} posts here yet
            </h3>

            <p className="mt-2 text-sm leading-6 text-hier-muted">
              Create a job or content post to start building your business feed and hiring funnel.
            </p>

            <Link
              href="/jobs/create"
              className="mt-6 inline-flex h-11 items-center gap-2 rounded-2xl bg-hier-primary px-4 text-sm font-semibold text-white shadow-card transition hover:opacity-95"
            >
              <Plus className="h-4 w-4" />
              Create first post
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}