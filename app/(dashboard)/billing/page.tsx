"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  CalendarClock,
  CreditCard,
  Loader2,
  Minus,
  Plus,
  Sparkles,
  TicketPercent,
  UsersRound,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import {
  cancelSubscriptionAtPeriodEnd,
  changeSubscriptionPlan,
  createBillingPortal,
  createSubscriptionCheckout,
  fetchBillingOverview,
  fetchBillingPlans,
  fetchBillingStatus,
  reactivateSubscription,
  selectStarterPlan,
  previewSubscriptionChange,
  updateRecruiterSeats,
} from "@/lib/business-billing";
import type {
  BillingOverviewResponse,
  BillingPlan,
  BillingPreviewChangeResponse,
  BillingStatusResponse,
} from "@/lib/types";

function formatMoney(amount?: number | null, currency?: string | null) {
  const value = Number(amount || 0);
  const code = (currency || "GBP").toUpperCase();
  try {
    return new Intl.NumberFormat("en-GB", { style: "currency", currency: code }).format(value / 100);
  } catch {
    return `£${(value / 100).toFixed(2)}`;
  }
}

function formatMonthlyPrice(amount?: number | null, currency?: string | null) {
  if (!amount && amount !== 0) return "Custom";
  try {
    return new Intl.NumberFormat("en-GB", { style: "currency", currency: (currency || "GBP").toUpperCase(), maximumFractionDigits: 0 }).format(Number(amount));
  } catch {
    return `£${Number(amount).toFixed(0)}`;
  }
}

function formatDate(value?: string | null, includeTime = false) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", includeTime ? {
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

function formatStatus(value?: string | null) {
  const text = String(value || "not_started").replace(/_/g, " ").trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function planBullets(plan: BillingPlan) {
  return [
    typeof plan.job_post_limit === "number" ? `${plan.job_post_limit === 0 ? "Unlimited" : plan.job_post_limit} live job posts` : null,
    `${Number(plan.monthly_boost_credits || 0)} monthly boost credits`,
    plan.has_pipeline_tools ? "Pipeline tools included" : null,
    plan.has_applicant_rating ? "Applicant rating included" : null,
    plan.has_analytics ? "Analytics included" : null,
    plan.has_analytics_pro ? "Advanced analytics included" : null,
    plan.has_messaging ? "Messaging included" : null,
    plan.has_interview_scheduling ? "Interview scheduling included" : null,
  ].filter(Boolean) as string[];
}

function openUrl(url: string) {
  window.open(url, "_blank", "noopener,noreferrer");
}

export default function BillingPage() {
  const [status, setStatus] = useState<BillingStatusResponse | null>(null);
  const [overview, setOverview] = useState<BillingOverviewResponse | null>(null);
  const [plans, setPlans] = useState<BillingPlan[]>([]);
  const [promoCode, setPromoCode] = useState("");
  const [seatDraft, setSeatDraft] = useState(0);
  const [preview, setPreview] = useState<BillingPreviewChangeResponse | null>(null);
  const [previewPlanCode, setPreviewPlanCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [workingKey, setWorkingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function loadAll() {
    setError(null);
    const [statusRes, overviewRes, plansRes] = await Promise.all([
      fetchBillingStatus(),
      fetchBillingOverview(),
      fetchBillingPlans(),
    ]);
    setStatus(statusRes);
    setOverview(overviewRes);
    setPlans((plansRes.items || []).slice().sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0)));
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        await loadAll();
      } catch (caught) {
        if (!cancelled) setError(caught instanceof Error ? caught.message : "Could not load billing right now.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
      const extraSeats = Number(
        overview?.overview.extra_recruiter_seats ??
        status?.account?.extra_recruiter_seats ??
        0
      );

      setSeatDraft(Math.max(0, extraSeats));
    }, [overview?.overview.extra_recruiter_seats, status?.account?.extra_recruiter_seats]);

  const currentPlanCode = status?.account?.plan_code || "starter";
  const currentPeriodEnd = overview?.overview.current_period_end || status?.account?.subscription_current_period_end;
  const cancelAtPeriodEnd = Boolean(overview?.overview.cancel_at_period_end || status?.account?.subscription_cancel_at_period_end);
  const currentPaidSubscription = Boolean(status?.flags?.subscription_active);

  const recruiterSeats = useMemo(() => {
    const included = Number(
      overview?.overview.included_recruiter_seats ??
      status?.account?.included_recruiter_seats ??
      1
    );
    const extra = Number(
      overview?.overview.extra_recruiter_seats ??
      status?.account?.extra_recruiter_seats ??
      0
    );
    const total = Number(
      overview?.overview.total_recruiter_seats ??
      status?.account?.total_recruiter_seats ??
      included + extra
    );
    const active = Number(
      overview?.overview.active_recruiter_seats ??
      status?.account?.active_recruiter_seats ??
      1
    );
    const available = Number(
      overview?.overview.available_recruiter_seats ??
      status?.account?.available_recruiter_seats ??
      Math.max(0, total - active)
    );

    return { included, extra, total, active, available };
  }, [overview, status]);

  const credits = useMemo(() => {
    const monthlyTotal = Number(overview?.overview.monthly_boost_credits ?? status?.account?.monthly_boost_credits ?? 0);
    const monthlyUsed = Number(overview?.overview.monthly_boost_credits_used ?? status?.account?.monthly_boost_credits_used ?? 0);
    const paidTotal = Number(overview?.overview.paid_boost_credits ?? status?.account?.paid_boost_credits ?? 0);
    const paidUsed = Number(overview?.overview.paid_boost_credits_used ?? status?.account?.paid_boost_credits_used ?? 0);
    return {
      monthlyTotal,
      monthlyUsed,
      monthlyRemaining: Math.max(0, monthlyTotal - monthlyUsed),
      paidTotal,
      paidUsed,
      paidRemaining: Math.max(0, paidTotal - paidUsed),
    };
  }, [overview, status]);

  async function withAction<T>(key: string, action: () => Promise<T>) {
    setWorkingKey(key);
    setError(null);
    setSuccess(null);
    try {
      return await action();
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Something went wrong.";
      setError(message);
      throw caught;
    } finally {
      setWorkingKey(null);
    }
  }

  async function handleSaveRecruiterSeats() {
    await withAction("recruiter-seats", () => updateRecruiterSeats(seatDraft));
    await loadAll();
    setSuccess("Recruiter seats updated.");
  }

  async function handlePortal() {
    const res = await withAction("portal", () => createBillingPortal());
    if (res.portal_url) openUrl(res.portal_url);
  }

  async function handleSelectPlan(planCode: string) {
    if (planCode === currentPlanCode) return;

    if (planCode === "starter") {
      if (currentPaidSubscription) {
        const confirmed = window.confirm(
          currentPeriodEnd
            ? `Your paid subscription will stay active until ${formatDate(currentPeriodEnd)} and then return to Starter. Continue?`
            : "Your paid subscription will remain active until the end of the current billing cycle and then return to Starter. Continue?"
        );
        if (!confirmed) return;
        await withAction(`cancel-${planCode}`, () => cancelSubscriptionAtPeriodEnd());
        await loadAll();
        setSuccess("Cancellation scheduled. Your account will return to Starter at the end of the current billing period.");
        return;
      }
      await withAction(`starter-${planCode}`, () => selectStarterPlan());
      await loadAll();
      setSuccess("Starter plan activated.");
      return;
    }

    if (!currentPaidSubscription) {
      const res = await withAction(`checkout-${planCode}`, () => createSubscriptionCheckout(planCode, promoCode));
      if (res.checkout_url) openUrl(res.checkout_url);
      return;
    }

    const previewRes = await withAction(`preview-${planCode}`, () => previewSubscriptionChange(planCode));
    setPreview(previewRes);
    setPreviewPlanCode(planCode);
  }

  async function applyPreviewedChange() {
    if (!previewPlanCode || !preview) return;
    if (preview.mode === "new_checkout") {
      const res = await withAction(`checkout-${previewPlanCode}`, () => createSubscriptionCheckout(previewPlanCode, promoCode));
      if (res.checkout_url) openUrl(res.checkout_url);
      return;
    }

    await withAction(`change-${previewPlanCode}`, () => changeSubscriptionPlan(previewPlanCode, promoCode));
    await loadAll();
    setSuccess(
      preview.mode === "scheduled_downgrade"
        ? `Downgrade scheduled for ${formatDate(preview.current_period_end)}.`
        : "Plan updated successfully."
    );
    setPreview(null);
    setPreviewPlanCode(null);
  }

  async function handleReactivate() {
    await withAction("reactivate", () => reactivateSubscription());
    await loadAll();
    setSuccess("Subscription reactivated and set to renew normally.");
  }

  const currentPlan = plans.find((plan) => plan.code === currentPlanCode) || status?.plan || null;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Billing"
        title="Plans, subscription, and billing"
        description="Manage your current Hier plan, upgrade or downgrade cleanly, apply promo codes, and keep track of subscription status and included boost credits."
        action={
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handlePortal}
              disabled={workingKey !== null}
              className="inline-flex items-center gap-2 rounded-[20px] border border-hier-border bg-white px-4 py-3 text-sm font-semibold text-hier-text shadow-sm transition hover:bg-hier-soft disabled:opacity-60"
            >
              {workingKey === "portal" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
              Open billing portal
            </button>
          </div>
        }
      />

      {error ? <div className="rounded-[24px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">{error}</div> : null}
      {success ? <div className="rounded-[24px] border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700">{success}</div> : null}

      {loading ? (
        <div className="grid gap-5 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, idx) => <div key={idx} className="h-48 animate-pulse rounded-[28px] border border-hier-border bg-white" />)}
        </div>
      ) : (
        <>
          <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
            <section className="rounded-[32px] border border-hier-border bg-white p-6 shadow-card sm:p-8">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-hier-muted">Current plan</p>
                  <h2 className="mt-2 text-2xl font-semibold text-hier-text">{currentPlan?.name || formatStatus(currentPlanCode)}</h2>
                  <p className="mt-2 text-sm leading-7 text-hier-muted">
                    {currentPlan ? `${formatMonthlyPrice(currentPlan.price_monthly, currentPlan.currency)} / month Ex VAT` : "Plan details unavailable right now."}
                  </p>
                </div>
                <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold ${cancelAtPeriodEnd ? "bg-amber-50 text-amber-700" : "bg-hier-soft text-hier-primary"}`}>
                  <BadgeCheck className="h-4 w-4" />
                  {cancelAtPeriodEnd ? "Ending at period end" : formatStatus(overview?.overview.subscription_status || status?.account?.subscription_status || status?.account?.status)}
                </span>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-12">
                <div className="rounded-[24px] border border-hier-border bg-hier-panel p-4 xl:col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-hier-muted">Period start</p>
                  <p className="mt-2 text-lg font-semibold text-hier-text">{formatDate(overview?.overview.current_period_start || status?.account?.subscription_current_period_start)}</p>
                </div>
                <div className="rounded-[24px] border border-hier-border bg-hier-panel p-4 xl:col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-hier-muted">Period end</p>
                  <p className="mt-2 text-lg font-semibold text-hier-text">{formatDate(currentPeriodEnd)}</p>
                </div>
                <div className="rounded-[24px] border border-hier-border bg-hier-panel p-4 xl:col-span-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-hier-muted">Billing email</p>
                  <p className="mt-2 break-all text-lg font-semibold text-hier-text">{status?.account?.billing_email || "—"}</p>
                </div>
                <div className="rounded-[24px] border border-hier-border bg-hier-panel p-4 xl:col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-hier-muted">Pricing selected</p>
                  <p className="mt-2 text-lg font-semibold text-hier-text">{formatDate(overview?.overview.pricing_selected_at || status?.account?.pricing_selected_at)}</p>
                </div>
              </div>

              {cancelAtPeriodEnd ? (
                <div className="mt-6 rounded-[24px] border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-800">
                  Your paid subscription remains active until <span className="font-semibold">{formatDate(currentPeriodEnd)}</span>, then the account returns to Starter unless you reactivate it first.
                </div>
              ) : null}

              <div className="mt-6 flex flex-wrap gap-3">
                {!cancelAtPeriodEnd && currentPaidSubscription ? (
                  <button
                    type="button"
                    onClick={() => handleSelectPlan("starter")}
                    disabled={workingKey !== null}
                    className="inline-flex items-center gap-2 rounded-[20px] border border-hier-border bg-white px-4 py-3 text-sm font-semibold text-hier-text shadow-sm transition hover:bg-hier-soft disabled:opacity-60"
                  >
                    {workingKey === "cancel-starter" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarClock className="h-4 w-4" />}
                    Cancel and return to Starter
                  </button>
                ) : null}
                {cancelAtPeriodEnd ? (
                  <button
                    type="button"
                    onClick={handleReactivate}
                    disabled={workingKey !== null}
                    className="inline-flex items-center gap-2 rounded-[20px] bg-hier-primary px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-95 disabled:opacity-60"
                  >
                    {workingKey === "reactivate" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    Keep subscription active
                  </button>
                ) : null}
              </div>
            </section>

            <section className="rounded-[32px] border border-hier-border bg-white p-6 shadow-card sm:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-hier-muted">Boost credit balance</p>
              <h2 className="mt-2 text-2xl font-semibold text-hier-text">Usage and remaining credits</h2>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-[24px] border border-hier-border bg-hier-panel p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-hier-muted">Monthly included</p>
                  <p className="mt-2 text-2xl font-semibold text-hier-text">{credits.monthlyRemaining}</p>
                  <p className="mt-2 text-sm text-hier-muted">{credits.monthlyUsed} used of {credits.monthlyTotal}</p>
                </div>
                <div className="rounded-[24px] border border-hier-border bg-hier-panel p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-hier-muted">Extra purchased</p>
                  <p className="mt-2 text-2xl font-semibold text-hier-text">{credits.paidRemaining}</p>
                  <p className="mt-2 text-sm text-hier-muted">{credits.paidUsed} used of {credits.paidTotal}</p>
                </div>
              </div>
              <div className="mt-5 rounded-[24px] border border-hier-border bg-hier-soft px-4 py-4 text-sm text-hier-muted">
                Reset date: <span className="font-semibold text-hier-text">{formatDate(overview?.overview.boost_credits_reset_at || status?.account?.boost_credits_reset_at)}</span>
              </div>
              <div className="mt-5 rounded-[24px] border border-hier-border bg-hier-panel p-4">
                <p className="text-sm font-semibold text-hier-text">Promo code</p>
                <p className="mt-2 text-sm text-hier-muted">Apply a promo code before a new paid checkout or plan change.</p>
                <div className="mt-4 flex items-center gap-3">
                  <div className="relative flex-1">
                    <TicketPercent className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-hier-muted" />
                    <input
                      value={promoCode}
                      onChange={(event) => setPromoCode(event.target.value.toUpperCase())}
                      placeholder="Enter promo code"
                      className="h-12 w-full rounded-[18px] border border-hier-border bg-white pl-11 pr-4 text-sm text-hier-text outline-none transition focus:border-hier-primary"
                    />
                  </div>
                </div>
              </div>
            </section>
          </div>

          <section className="rounded-[32px] border border-hier-border bg-white p-6 shadow-card sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-hier-muted">Recruiter seats</p>
                <h2 className="mt-2 text-2xl font-semibold text-hier-text">Manage team capacity</h2>
                <p className="mt-2 max-w-3xl text-sm leading-7 text-hier-muted">
                  Your plan includes recruiter seats. Extra seats increase the number of active recruiters your business can invite later.
                </p>
              </div>
              <span className="inline-flex items-center gap-2 rounded-full bg-hier-soft px-3 py-1.5 text-sm font-semibold text-hier-primary">
                <UsersRound className="h-4 w-4" />
                {recruiterSeats.total} total seats
              </span>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-[24px] border border-hier-border bg-hier-panel p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-hier-muted">Included</p>
                <p className="mt-2 text-2xl font-semibold text-hier-text">{recruiterSeats.included}</p>
              </div>
              <div className="rounded-[24px] border border-hier-border bg-hier-panel p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-hier-muted">Extra seats</p>
                <p className="mt-2 text-2xl font-semibold text-hier-text">{recruiterSeats.extra}</p>
              </div>
              <div className="rounded-[24px] border border-hier-border bg-hier-panel p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-hier-muted">In use</p>
                <p className="mt-2 text-2xl font-semibold text-hier-text">{recruiterSeats.active}</p>
              </div>
              <div className="rounded-[24px] border border-hier-border bg-hier-panel p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-hier-muted">Available</p>
                <p className="mt-2 text-2xl font-semibold text-hier-text">{recruiterSeats.available}</p>
              </div>
            </div>

            <div className="mt-6 rounded-[24px] border border-hier-border bg-hier-panel p-4">
              <p className="text-sm font-semibold text-hier-text">Purchased extra recruiter seats</p>
              <p className="mt-2 text-sm leading-6 text-hier-muted">
                Increase or reduce extra seat capacity. You cannot reduce below the number of seats already in use.
              </p>

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSeatDraft((value) => Math.max(0, value - 1))}
                  disabled={workingKey !== null || seatDraft <= 0}
                  className="inline-flex h-12 w-12 items-center justify-center rounded-[18px] border border-hier-border bg-white text-hier-text shadow-sm transition hover:bg-hier-soft disabled:opacity-50"
                >
                  <Minus className="h-4 w-4" />
                </button>

                <div className="min-w-[120px] rounded-[18px] border border-hier-border bg-white px-5 py-3 text-center text-lg font-semibold text-hier-text">
                  {seatDraft}
                </div>

                <button
                  type="button"
                  onClick={() => setSeatDraft((value) => value + 1)}
                  disabled={workingKey !== null}
                  className="inline-flex h-12 w-12 items-center justify-center rounded-[18px] border border-hier-border bg-white text-hier-text shadow-sm transition hover:bg-hier-soft disabled:opacity-50"
                >
                  <Plus className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  onClick={handleSaveRecruiterSeats}
                  disabled={workingKey !== null || seatDraft === recruiterSeats.extra}
                  className="inline-flex items-center gap-2 rounded-[20px] bg-hier-primary px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-95 disabled:opacity-60"
                >
                  {workingKey === "recruiter-seats" ? <Loader2 className="h-4 w-4 animate-spin" /> : <UsersRound className="h-4 w-4" />}
                  Save seats
                </button>
              </div>

              <p className="mt-4 text-xs leading-5 text-hier-muted">
                Stripe seat quantity syncs from purchased extra seats. Team invites will use this capacity in the next step.
              </p>
            </div>
          </section>

          <section className="rounded-[32px] border border-hier-border bg-white p-6 shadow-card sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-hier-muted">Available plans</p>
                <h2 className="mt-2 text-2xl font-semibold text-hier-text">Choose the right plan for your team</h2>
                <p className="mt-2 max-w-3xl text-sm leading-7 text-hier-muted">Starter stays free, new paid plans go through Stripe checkout, upgrades can apply immediately, and downgrades are scheduled for your next renewal.</p>
              </div>
            </div>

            <div className="mt-8 grid gap-5 xl:grid-cols-3">
              {plans.map((plan) => {
                const current = plan.code === currentPlanCode;
                const bullets = planBullets(plan);
                const previewOpen = previewPlanCode === plan.code && preview;
                return (
                  <article key={plan.id} className={`rounded-[28px] border p-5 shadow-sm transition ${current ? "border-hier-primary bg-hier-soft" : "border-hier-border bg-white"}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-xl font-semibold text-hier-text">{plan.name}</h3>
                        <p className="mt-2 text-3xl font-semibold tracking-tight text-hier-text">{formatMonthlyPrice(plan.price_monthly, plan.currency)}<span className="ml-1 text-sm font-medium text-hier-muted">/ month Ex VAT</span></p>
                      </div>
                      {current ? <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-hier-primary shadow-sm">Current</span> : null}
                    </div>

                    <div className="mt-5 space-y-2 text-sm text-hier-muted">
                      {bullets.map((bullet) => (
                        <p key={bullet} className="leading-6">• {bullet}</p>
                      ))}
                    </div>

                    <div className="mt-6 flex gap-3">
                      {!current ? (
                        <button
                          type="button"
                          onClick={() => handleSelectPlan(plan.code || "starter")}
                          disabled={workingKey !== null}
                          className="inline-flex w-full items-center justify-center gap-2 rounded-[18px] bg-hier-primary px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-95 disabled:opacity-60"
                        >
                          {workingKey && (workingKey.includes(plan.code || "") || workingKey === `starter-${plan.code}`) ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                          {plan.code === "starter" ? (currentPaidSubscription ? "Return to Starter" : "Choose Starter") : currentPaidSubscription ? `Switch to ${plan.name}` : `Choose ${plan.name}`}
                        </button>
                      ) : (
                        <div className="inline-flex w-full items-center justify-center rounded-[18px] border border-hier-border bg-white px-4 py-3 text-sm font-semibold text-hier-text">Already active</div>
                      )}
                    </div>

                    {previewOpen ? (
                      <div className="mt-5 rounded-[22px] border border-hier-border bg-white p-4">
                        <p className="text-sm font-semibold text-hier-text">Change preview</p>
                        {preview.mode === "immediate_upgrade" ? (
                          <>
                            <p className="mt-2 text-sm text-hier-muted">This upgrade applies immediately.</p>
                            <p className="mt-3 text-lg font-semibold text-hier-text">Due now: {formatMoney(preview.amount_due_now, preview.currency)}</p>
                            <div className="mt-3 space-y-2 text-sm text-hier-muted">
                              {(preview.lines || []).slice(0, 4).map((line, index) => (
                                <div key={line.id || index} className="flex items-start justify-between gap-3">
                                  <span className="leading-5">{line.description || (line.proration ? "Proration" : "Plan adjustment")}</span>
                                  <span className="font-medium text-hier-text">{formatMoney(line.amount, line.currency || preview.currency)}</span>
                                </div>
                              ))}
                            </div>
                          </>
                        ) : null}
                        {preview.mode === "scheduled_downgrade" ? (
                          <p className="mt-2 text-sm text-hier-muted">This downgrade stays on your current paid plan until <span className="font-semibold text-hier-text">{formatDate(preview.current_period_end)}</span>, then changes at renewal.</p>
                        ) : null}
                        {preview.mode === "no_change" ? <p className="mt-2 text-sm text-hier-muted">You are already on this plan.</p> : null}
                        {preview.message && preview.mode === "new_checkout" ? <p className="mt-2 text-sm text-hier-muted">{preview.message}</p> : null}
                        {preview.mode !== "no_change" ? (
                          <div className="mt-4 flex gap-3">
                            <button
                              type="button"
                              onClick={applyPreviewedChange}
                              disabled={workingKey !== null}
                              className="inline-flex items-center gap-2 rounded-[18px] bg-hier-primary px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-95 disabled:opacity-60"
                            >
                              {workingKey === `change-${previewPlanCode}` || workingKey === `checkout-${previewPlanCode}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                              {preview.mode === "scheduled_downgrade" ? "Schedule downgrade" : preview.mode === "immediate_upgrade" ? "Upgrade now" : "Continue"}
                            </button>
                            <button type="button" onClick={() => { setPreview(null); setPreviewPlanCode(null); }} className="rounded-[18px] border border-hier-border bg-white px-4 py-3 text-sm font-semibold text-hier-text">Close</button>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
