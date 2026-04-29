"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Eye, PenSquare, Sparkles, Video } from "lucide-react";

import { PageHeader } from "@/components/ui/page-header";
import { ApiError } from "@/lib/api";
import {
  fetchBusinessContentDetail,
  fetchBusinessJobAIShortlist,
  fetchBusinessPostDetail,
  type BusinessJobAIShortlist,
  type ManagedPostItem,
} from "@/lib/business-posts";

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

function formatStageLabel(value?: string | null) {
  if (!value) return "Unknown";
  return value
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function scoreTone(score?: number | null) {
  if ((score || 0) >= 25) {
    return "bg-emerald-50 text-emerald-700";
  }
  if ((score || 0) >= 15) {
    return "bg-amber-50 text-amber-700";
  }
  return "bg-zinc-100 text-zinc-700";
}

function scoreRingTone(score?: number | null) {
  if ((score || 0) >= 25) {
    return "border-emerald-200 bg-emerald-50/40";
  }
  if ((score || 0) >= 15) {
    return "border-amber-200 bg-amber-50/40";
  }
  return "border-hier-border bg-hier-panel";
}

export default function JobDetailPage() {
  const params = useParams<{ id: string }>();
  const search = useSearchParams();

  const kind = (search.get("kind") as "job" | "content" | null) || null;
  const postId = Number(params.id);

  const [item, setItem] = useState<ManagedPostItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [shortlist, setShortlist] = useState<BusinessJobAIShortlist | null>(null);
  const [shortlistLoading, setShortlistLoading] = useState(false);
  const [shortlistError, setShortlistError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);
        setItem(null);

        setShortlist(null);
        setShortlistError(null);
        setShortlistLoading(false);

        if (kind === "content") {
          const content = await fetchBusinessContentDetail(postId);
          setItem({ ...content, kind: "content" });
          return;
        }

        let resolvedItem: ManagedPostItem | null = null;

        try {
          const job = await fetchBusinessPostDetail(postId);
          resolvedItem = { ...job, kind: "job" };
          setItem(resolvedItem);
        } catch {
          const content = await fetchBusinessContentDetail(postId);
          resolvedItem = { ...content, kind: "content" };
          setItem(resolvedItem);
        }

        if (resolvedItem?.kind === "job") {
          try {
            setShortlistLoading(true);
            const shortlistData = await fetchBusinessJobAIShortlist(postId);
            setShortlist(shortlistData);
          } catch (e) {
            setShortlistError(
              e instanceof ApiError
                ? e.message
                : e instanceof Error
                  ? e.message
                  : "Could not load Hier Intelligence."
            );
          } finally {
            setShortlistLoading(false);
          }
        }
      } catch (e) {
        setError(
          e instanceof ApiError
            ? e.message
            : e instanceof Error
              ? e.message
              : "Could not load post details."
        );
      } finally {
        setLoading(false);
      }
    }

    if (!Number.isNaN(postId)) {
      void load();
    }
  }, [postId, kind]);

  const previewType = useMemo(() => {
    if (!item) return null;

    if (item.media_type === "video" && item.hero_video_url) {
      return { type: "video" as const, url: item.hero_video_url };
    }

    if (item.hero_image_url) {
      return { type: "image" as const, url: item.hero_image_url };
    }

    return null;
  }, [item]);

  const topCandidate = useMemo(() => {
    return shortlist?.items?.[0] || null;
  }, [shortlist]);

  const remainingRankedCount = useMemo(() => {
    const total = shortlist?.items?.length || 0;
    return total > 1 ? total - 1 : 0;
  }, [shortlist]);

  const topCandidateHref = useMemo(() => {
    if (!item || item.kind !== "job" || !topCandidate) return null;

    const applicationId =
      (topCandidate as any).application_id ??
      (topCandidate as any).id ??
      null;

    if (!applicationId) {
      return `/candidates?jobId=${item.id}`;
    }

    return `/candidates?jobId=${item.id}&applicationId=${applicationId}`;
  }, [item, topCandidate]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Post details"
        title={
          item
            ? item.kind === "content"
              ? item.caption || item.title || "Untitled content post"
              : item.title || "Untitled role"
            : "Post details"
        }
        description="Review the full post details before editing, promoting, or jumping into candidates."
        action={
          <div className="flex items-center gap-3">
            <Link
              href="/jobs"
              className="inline-flex h-11 items-center gap-2 rounded-2xl border border-hier-border bg-white px-4 text-sm font-semibold text-hier-text transition hover:bg-hier-panel"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to posts
            </Link>

            {item ? (
              <Link
                href={`/jobs/${postId}/edit?kind=${item.kind}`}
                className="inline-flex h-11 items-center gap-2 rounded-2xl bg-hier-primary px-4 text-sm font-semibold text-white shadow-card transition hover:opacity-95"
              >
                <PenSquare className="h-4 w-4" />
                Edit post
              </Link>
            ) : null}
          </div>
        }
      />

      {error ? (
        <div className="rounded-[24px] border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="h-72 animate-pulse rounded-[32px] border border-hier-border bg-white" />
      ) : item ? (
        <div className="grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
          <div className="space-y-6">
            {item.kind === "job" ? (
              <section className="rounded-[32px] border border-hier-border bg-white p-6 shadow-panel">
                <div>
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full bg-hier-soft px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-hier-primary">
                      <Sparkles className="h-3.5 w-3.5" />
                      Hier Intelligence
                    </div>

                    <h3 className="mt-3 text-xl font-semibold text-hier-text">
                      Top candidate for this role
                    </h3>

                    <p className="mt-2 text-sm text-hier-muted">
                      A premium Hier Intelligence spotlight showing the strongest current match.
                    </p>
                  </div>
                </div>

                {shortlistLoading ? (
                  <div className="mt-5">
                    <div className="h-40 animate-pulse rounded-[28px] border border-hier-border bg-hier-panel" />
                  </div>
                ) : shortlistError ? (
                  <div className="mt-5 rounded-[24px] border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                    {shortlistError}
                  </div>
                ) : topCandidate ? (
                  <div
                    className={`mt-5 rounded-[28px] border p-5 shadow-card ${scoreRingTone(
                      topCandidate.score
                    )}`}
                  >
                    <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-lg font-semibold text-hier-text">
                            {topCandidate.candidate_name || "Candidate"}
                          </p>

                          <span
                            className={`rounded-full px-3 py-1 text-[11px] font-semibold ${scoreTone(
                              topCandidate.score
                            )}`}
                          >
                            HI Score {topCandidate.score?.toFixed(1)}
                          </span>

                          <span className="rounded-full border border-hier-border bg-white px-3 py-1 text-[11px] font-semibold text-hier-text">
                            {formatStageLabel(topCandidate.stage)}
                          </span>
                        </div>

                        <p className="mt-2 text-sm text-hier-muted">
                          {topCandidate.candidate_headline || "No headline added yet."}
                        </p>

                        {(topCandidate.reasons || []).length ? (
                          <div className="mt-4 flex flex-wrap gap-2">
                            {topCandidate.reasons.slice(0, 4).map((reason) => (
                              <span
                                key={reason}
                                className="rounded-full border border-hier-border bg-white px-3 py-1 text-[11px] font-semibold text-hier-text"
                              >
                                {reason}
                              </span>
                            ))}
                          </div>
                        ) : null}

                        <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-hier-muted">
                          {remainingRankedCount > 0 ? (
                            <span>
                              + {remainingRankedCount} more ranked candidate
                              {remainingRankedCount === 1 ? "" : "s"}
                            </span>
                          ) : (
                            <span>Only one ranked candidate currently available.</span>
                          )}
                        </div>
                      </div>

                      <div className="shrink-0">
                        <Link
                          href={topCandidateHref || `/candidates?jobId=${item.id}`}
                          className="inline-flex h-11 items-center gap-2 rounded-2xl border border-hier-border bg-white px-4 text-sm font-semibold text-hier-text transition hover:bg-hier-soft"
                        >
                          <Eye className="h-4 w-4" />
                          View candidate profile
                        </Link>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-5 rounded-[24px] border border-dashed border-hier-border bg-hier-panel px-4 py-5 text-sm text-hier-muted">
                    No Hier Intelligence ranking is available for this role yet.
                  </div>
                )}
              </section>
            ) : null}

            <section className="overflow-hidden rounded-[32px] border border-hier-border bg-white shadow-panel">
              {previewType ? (
                <div className="relative h-[320px] w-full bg-zinc-100">
                  {previewType.type === "image" ? (
                    <Image
                      src={previewType.url}
                      alt="Post media"
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center gap-3 bg-zinc-900 text-white">
                      <Video className="h-7 w-7" />
                      <span className="text-base font-semibold">Video attached</span>
                    </div>
                  )}
                </div>
              ) : null}

              <div className="space-y-4 p-6">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
                      item.kind === "job"
                        ? "border border-hier-border bg-white text-hier-text"
                        : "bg-hier-soft text-hier-primary"
                    }`}
                  >
                    {item.kind === "job"
                      ? (item as any).is_gig
                        ? "Gig"
                        : "Job"
                      : "Content"}
                  </span>

                  <span
                    className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
                      item.is_active
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-zinc-100 text-zinc-600"
                    }`}
                  >
                    {item.is_active ? "Live" : "Inactive"}
                  </span>
                </div>

                <h2 className="text-3xl font-semibold text-hier-text">
                  {item.kind === "content"
                    ? item.caption || item.title || "Untitled content post"
                    : item.title || "Untitled role"}
                </h2>

                <p className="text-sm leading-7 text-hier-muted">
                  {item.description || "No description added yet."}
                </p>
              </div>
            </section>

            <section className="rounded-[32px] border border-hier-border bg-white p-6 shadow-panel">
              <h3 className="text-xl font-semibold text-hier-text">Core details</h3>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div className="rounded-[22px] border border-hier-border bg-hier-panel p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-hier-muted">
                    Company
                  </p>
                  <p className="mt-2 text-base font-semibold text-hier-text">
                    {item.company_name || "Hier"}
                  </p>
                </div>

                <div className="rounded-[22px] border border-hier-border bg-hier-panel p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-hier-muted">
                    Created
                  </p>
                  <p className="mt-2 text-base font-semibold text-hier-text">
                    {formatDate(item.created_at)}
                  </p>
                </div>

                <div className="rounded-[22px] border border-hier-border bg-hier-panel p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-hier-muted">
                    Location
                  </p>
                  <p className="mt-2 text-base font-semibold text-hier-text">
                    {item.kind === "job"
                      ? item.location_text ||
                        item.location ||
                        ((item as any).is_remote ? "Remote" : "Not set")
                      : "Standard content"}
                  </p>
                </div>

                <div className="rounded-[22px] border border-hier-border bg-hier-panel p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-hier-muted">
                    Value
                  </p>
                  <p className="mt-2 text-base font-semibold text-hier-text">
                    {item.kind === "job"
                      ? (item as any).salary_min && (item as any).salary_max
                        ? `${(item as any).currency || "GBP"} ${(item as any).salary_min?.toLocaleString()}-${(item as any).salary_max?.toLocaleString()} / ${
                            (item as any).salary_period === "hourly" ? "hr" : "yr"
                          }`
                        : `${(item as any).applicant_count || 0} applicants`
                      : `${item.like_count || 0} likes`}
                  </p>
                </div>
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <section className="rounded-[32px] border border-hier-border bg-white p-6 shadow-panel">
              <h3 className="text-xl font-semibold text-hier-text">Actions</h3>

              <div className="mt-5 flex flex-col gap-3">
                <Link
                  href={`/jobs/${postId}/edit?kind=${item.kind}`}
                  className="inline-flex h-11 items-center gap-2 rounded-2xl bg-hier-primary px-4 text-sm font-semibold text-white shadow-card transition hover:opacity-95"
                >
                  <PenSquare className="h-4 w-4" />
                  Edit post
                </Link>

                {item.kind === "job" ? (
                  <Link
                    href={`/candidates?jobId=${item.id}`}
                    className="inline-flex h-11 items-center gap-2 rounded-2xl border border-hier-border bg-white px-4 text-sm font-semibold text-hier-text transition hover:bg-hier-soft"
                  >
                    <Eye className="h-4 w-4" />
                    View candidates
                  </Link>
                ) : null}

                {item.kind === "job" ? (
                  <Link
                    href="/promote"
                    className="inline-flex h-11 items-center gap-2 rounded-2xl border border-hier-border bg-white px-4 text-sm font-semibold text-hier-text transition hover:bg-hier-soft"
                  >
                    <Eye className="h-4 w-4" />
                    Go to promote
                  </Link>
                ) : null}
              </div>
            </section>

            {item.kind === "job" ? (
              <section className="rounded-[32px] border border-hier-border bg-white p-6 shadow-panel">
                <h3 className="text-xl font-semibold text-hier-text">Hiring details</h3>

                <div className="mt-5 space-y-4 text-sm text-hier-text">
                  <p>
                    <span className="font-semibold">Sector:</span>{" "}
                    {(item as any).sector || "—"}
                  </p>
                  <p>
                    <span className="font-semibold">Employment type:</span>{" "}
                    {(item as any).employment_type || "—"}
                  </p>
                  <p>
                    <span className="font-semibold">Experience:</span>{" "}
                    {(item as any).experience || "—"}
                  </p>
                  <p>
                    <span className="font-semibold">Questions:</span>{" "}
                    {((item as any).application_questions || []).length
                      ? ((item as any).application_questions || []).join(" • ")
                      : "No screening questions"}
                  </p>
                </div>
              </section>
            ) : (
              <section className="rounded-[32px] border border-hier-border bg-white p-6 shadow-panel">
                <h3 className="text-xl font-semibold text-hier-text">
                  Engagement snapshot
                </h3>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-[22px] border border-hier-border bg-hier-panel p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-hier-muted">
                      Likes
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-hier-text">
                      {item.like_count || 0}
                    </p>
                  </div>

                  <div className="rounded-[22px] border border-hier-border bg-hier-panel p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-hier-muted">
                      Comments
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-hier-text">
                      {item.comment_count || 0}
                    </p>
                  </div>
                </div>
              </section>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}