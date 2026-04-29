"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Megaphone, RefreshCcw, Sparkles, TriangleAlert, X, Zap } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { createPostBoost, fetchEligibleBoostPosts, fetchBillingStatus } from "@/lib/business-billing";
import type { BoostEligiblePostsResponse, BillingStatusResponse, EligibleBoostPost } from "@/lib/types";

function formatDate(value?: string | null, withTime = false) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", withTime ? {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  } : {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function postType(post: EligibleBoostPost) {
  if (post.is_gig) return "Gig";
  if (post.content_type === "post") return "Post";
  return "Job";
}

function postLocation(post: EligibleBoostPost) {
  return post.is_remote ? "Remote" : post.location_text || post.location || "Location not set";
}

function creditDuration(credits: number) {
  return `${credits * 24} hours`;
}

export default function PromotePage() {
  const [status, setStatus] = useState<BillingStatusResponse | null>(null);
  const [data, setData] = useState<BoostEligiblePostsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [workingKey, setWorkingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pendingBoost, setPendingBoost] = useState<{ post: EligibleBoostPost; credits: number } | null>(null);

  async function loadAll() {
    setError(null);
    const [statusRes, eligibleRes] = await Promise.all([fetchBillingStatus(), fetchEligibleBoostPosts()]);
    setStatus(statusRes);
    setData(eligibleRes);
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        await loadAll();
      } catch (caught) {
        if (!cancelled) setError(caught instanceof Error ? caught.message : "Could not load promotion tools right now.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const allowedCredits = data?.credits?.allowed_credit_pack_sizes?.length ? data.credits.allowed_credit_pack_sizes : [1, 2, 3];
  const monthlyRemaining = Number(data?.credits?.monthly?.remaining ?? 0);
  const paidRemaining = Number(data?.credits?.paid?.remaining ?? 0);
  const totalRemaining = Number(data?.credits?.total_remaining ?? monthlyRemaining + paidRemaining);

  function handleBoost(post: EligibleBoostPost, credits: number) {
    if (credits > totalRemaining) {
      setError(`You only have ${totalRemaining} boost credit${totalRemaining === 1 ? "" : "s"} remaining right now.`);
      return;
    }
    setError(null);
    setPendingBoost({ post, credits });
  }

  async function confirmBoost() {
    if (!pendingBoost) return;
    const { post, credits } = pendingBoost;
    setWorkingKey(`${post.id}-${credits}`);
    setError(null);
    setSuccess(null);
    try {
      const response = await createPostBoost(post.id, credits);
      await loadAll();
      setPendingBoost(null);
      setSuccess(response?.boost?.ends_at ? `Boost applied. This post is now boosted until ${formatDate(response.boost.ends_at, true)}.` : response.message || "Boost applied successfully.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not apply this boost.");
    } finally {
      setWorkingKey(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Promote"
        title="Boost visibility with included credits"
        description="Apply monthly or purchased boost credits to live roles, extend existing boosts, and keep track of what is currently promoted across your business dashboard."
        action={
          <button type="button" onClick={() => void loadAll()} disabled={loading || workingKey !== null} className="inline-flex items-center gap-2 rounded-[20px] border border-hier-border bg-white px-4 py-3 text-sm font-semibold text-hier-text shadow-sm transition hover:bg-hier-soft disabled:opacity-60">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
            Refresh
          </button>
        }
      />

      {error ? <div className="rounded-[24px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">{error}</div> : null}
      {success ? <div className="rounded-[24px] border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700">{success}</div> : null}

      {pendingBoost ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-[2px]">
          <div className="w-full max-w-xl rounded-[32px] border border-hier-border bg-white p-6 shadow-2xl sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-hier-muted">Confirm promotion</p>
                <h2 className="mt-2 text-2xl font-semibold text-hier-text">Boost this role now?</h2>
                <p className="mt-2 text-sm leading-7 text-hier-muted">This will apply visibility credits immediately to the selected live role.</p>
              </div>
              <button
                type="button"
                onClick={() => setPendingBoost(null)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-hier-border bg-white text-hier-muted transition hover:bg-hier-soft hover:text-hier-text"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-[24px] border border-hier-border bg-hier-panel p-4 sm:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-hier-muted">Selected post</p>
                <p className="mt-2 text-lg font-semibold text-hier-text">{pendingBoost.post.title || "Untitled post"}</p>
                <p className="mt-1 text-sm text-hier-muted">{postType(pendingBoost.post)} · {postLocation(pendingBoost.post)}</p>
              </div>
              <div className="rounded-[24px] border border-hier-border bg-hier-panel p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-hier-muted">Credits used</p>
                <p className="mt-2 text-lg font-semibold text-hier-text">{pendingBoost.credits}</p>
              </div>
              <div className="rounded-[24px] border border-hier-border bg-hier-panel p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-hier-muted">Duration added</p>
                <p className="mt-2 text-lg font-semibold text-hier-text">{creditDuration(pendingBoost.credits)}</p>
              </div>
              <div className="rounded-[24px] border border-hier-border bg-amber-50 p-4 sm:col-span-2">
                <div className="flex items-start gap-3">
                  <TriangleAlert className="mt-0.5 h-5 w-5 text-amber-600" />
                  <div>
                    <p className="text-sm font-semibold text-amber-800">Credits remaining after this action</p>
                    <p className="mt-1 text-sm text-amber-700">{Math.max(0, totalRemaining - pendingBoost.credits)} credit{Math.max(0, totalRemaining - pendingBoost.credits) === 1 ? "" : "s"} left after confirming this boost.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setPendingBoost(null)}
                disabled={workingKey !== null}
                className="inline-flex items-center justify-center rounded-[18px] border border-hier-border bg-white px-4 py-3 text-sm font-semibold text-hier-text shadow-sm transition hover:bg-hier-soft disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmBoost}
                disabled={workingKey !== null}
                className="inline-flex items-center justify-center gap-2 rounded-[18px] bg-hier-primary px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-95 disabled:opacity-60"
              >
                {workingKey === `${pendingBoost.post.id}-${pendingBoost.credits}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Confirm boost
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {loading ? (
        <div className="grid gap-5 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, idx) => <div key={idx} className="h-40 animate-pulse rounded-[28px] border border-hier-border bg-white" />)}
        </div>
      ) : (
        <>
          <div className="grid gap-5 md:grid-cols-3">
            <div className="rounded-[28px] border border-hier-border bg-white p-6 shadow-card">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-hier-muted">Included left</p>
              <p className="mt-3 text-3xl font-semibold text-hier-text">{monthlyRemaining}</p>
              <p className="mt-2 text-sm text-hier-muted">Monthly credits remaining this cycle</p>
            </div>
            <div className="rounded-[28px] border border-hier-border bg-white p-6 shadow-card">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-hier-muted">Purchased left</p>
              <p className="mt-3 text-3xl font-semibold text-hier-text">{paidRemaining}</p>
              <p className="mt-2 text-sm text-hier-muted">Extra bought credits still available</p>
            </div>
            <div className="rounded-[28px] border border-hier-border bg-white p-6 shadow-card">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-hier-muted">Total available</p>
              <p className="mt-3 text-3xl font-semibold text-hier-text">{totalRemaining}</p>
              <p className="mt-2 text-sm text-hier-muted">Credits applied as 24-hour visibility blocks</p>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <section className="rounded-[32px] border border-hier-border bg-white p-6 shadow-card sm:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-hier-muted">Eligible posts</p>
                  <h2 className="mt-2 text-2xl font-semibold text-hier-text">Boost live roles now</h2>
                  <p className="mt-2 text-sm leading-7 text-hier-muted">Use 1, 2, or 3 credits at a time. Reapplying a boost stacks additional time onto the same post.</p>
                </div>
                <span className="rounded-full bg-hier-soft px-3 py-1 text-sm font-semibold text-hier-primary">{data?.items?.length || 0} eligible</span>
              </div>

              <div className="mt-8 space-y-4">
                {(data?.items || []).length ? (data?.items || []).map((post) => (
                  <article key={post.id} className="rounded-[26px] border border-hier-border bg-hier-panel p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold text-hier-text">{post.title || "Untitled post"}</h3>
                        <p className="mt-1 text-sm text-hier-muted">{postType(post)} · {postLocation(post)}</p>
                      </div>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-hier-text shadow-sm">{post.application_count || 0} applicants</span>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {allowedCredits.map((credits) => {
                        const actionKey = `${post.id}-${credits}`;
                        const disabled = credits > totalRemaining || workingKey !== null;
                        return (
                          <button
                            key={actionKey}
                            type="button"
                            onClick={() => handleBoost(post, credits)}
                            disabled={disabled}
                            className="inline-flex items-center gap-2 rounded-[18px] border border-hier-border bg-white px-4 py-3 text-sm font-semibold text-hier-text shadow-sm transition hover:bg-hier-soft disabled:opacity-50"
                          >
                            {workingKey === actionKey ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4 text-hier-primary" />}
                            {credits} credit{credits === 1 ? "" : "s"} · {creditDuration(credits)}
                          </button>
                        );
                      })}
                    </div>
                  </article>
                )) : (
                  <div className="rounded-[26px] border border-dashed border-hier-border bg-hier-panel px-5 py-10 text-center">
                    <Megaphone className="mx-auto h-6 w-6 text-hier-muted" />
                    <p className="mt-3 text-lg font-semibold text-hier-text">No eligible posts right now</p>
                    <p className="mt-2 text-sm text-hier-muted">You do not currently have any active roles ready for a new boost.</p>
                  </div>
                )}
              </div>
            </section>

            <section className="space-y-6">
              <div className="rounded-[32px] border border-hier-border bg-white p-6 shadow-card sm:p-8">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-hier-muted">Already boosted</p>
                <h2 className="mt-2 text-2xl font-semibold text-hier-text">Currently promoted roles</h2>
                <div className="mt-6 space-y-3">
                  {(data?.ineligible_items || []).length ? (data?.ineligible_items || []).map((post) => (
                    <div key={post.id} className="rounded-[24px] border border-hier-border bg-hier-panel p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-base font-semibold text-hier-text">{post.title || "Untitled post"}</p>
                          <p className="mt-1 text-sm text-hier-muted">{postType(post)} · {postLocation(post)}</p>
                        </div>
                        <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">Boosted</span>
                      </div>
                      <p className="mt-3 text-sm text-hier-muted">Boost ends {formatDate(post.boosted_until, true)}</p>
                    </div>
                  )) : <p className="text-sm text-hier-muted">No posts are currently boosted.</p>}
                </div>
              </div>

              <div className="rounded-[32px] border border-hier-border bg-white p-6 shadow-card sm:p-8">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-hier-muted">How it works</p>
                <h2 className="mt-2 text-2xl font-semibold text-hier-text">Simple credit-based promotion</h2>
                <div className="mt-5 space-y-3 text-sm leading-7 text-hier-muted">
                  <p>• 1 credit adds 24 hours of extra visibility.</p>
                  <p>• Included monthly credits are consumed first, then purchased credits.</p>
                  <p>• Reapplying a boost stacks extra time onto posts already being promoted.</p>
                  <p>• Live, active, non-archived roles only appear as eligible for new boosts.</p>
                </div>
                <div className="mt-5 rounded-[24px] border border-hier-border bg-hier-soft px-4 py-4 text-sm text-hier-muted">
                  Current plan: <span className="font-semibold text-hier-text">{status?.account?.plan?.name || status?.account?.plan_code || "Starter"}</span>
                </div>
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
