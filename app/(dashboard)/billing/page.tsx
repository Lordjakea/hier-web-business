"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  CreditCard,
  Loader2,
  Minus,
  PackagePlus,
  Plus,
  ShoppingBasket,
  Sparkles,
  TicketPercent,
  UsersRound,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import {
  cancelSubscriptionAtPeriodEnd,
  changeSubscriptionPlan,
  createBillingPortal,
  createBoostCheckout,
  createSubscriptionCheckout,
  fetchBillingOverview,
  fetchBillingPlans,
  fetchBillingStatus,
  previewSubscriptionChange,
  reactivateSubscription,
  selectStarterPlan,
  updateCustomPackage,
  updateRecruiterSeats,
} from "@/lib/business-billing";
import { CUSTOM_PACKAGE_ADDONS, type BillingAddonCode } from "@/lib/billing-entitlements";
import type {
  BillingOverviewResponse,
  BillingPlan,
  BillingPreviewChangeResponse,
  BillingStatusResponse,
} from "@/lib/types";
import { formatCurrency } from "@/lib/currency";

function formatMonthlyPrice(amount?: number | null, currency?: string | null) {
  if (!amount && amount !== 0) return "Custom";
  const isFree = Number(amount) === 0;
  return formatCurrency(amount, {
    currency,
    maximumFractionDigits: isFree ? 0 : 2,
    minimumFractionDigits: isFree ? 0 : 2,
  });
}

function formatDate(value?: string | null, includeTime = false) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(
    "en-GB",
    includeTime
      ? {
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }
      : {
          day: "numeric",
          month: "short",
          year: "numeric",
        }
  ).format(date);
}

function formatStatus(value?: string | null) {
  const text = String(value || "not_started").replace(/_/g, " ").trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function billingAddonCodes(status?: BillingStatusResponse | null, overview?: BillingOverviewResponse | null) {
  const direct = [
    ...(status?.active_package_addons || []),
    ...(status?.account?.active_package_addons || []),
    ...(overview?.overview.active_package_addons || []),
  ];
  const fromAddons = [
    ...(status?.package_addons || []),
    ...(status?.account?.package_addons || []),
    ...(overview?.overview.package_addons || []),
  ]
    .filter((addon) => addon.enabled || addon.is_active)
    .map((addon) => addon.code);

  return Array.from(new Set([...direct, ...fromAddons].map((code) => String(code).toLowerCase()))) as BillingAddonCode[];
}

function billingAddonQuantities(status?: BillingStatusResponse | null, overview?: BillingOverviewResponse | null) {
  const quantities: Partial<Record<BillingAddonCode, number>> = {};
  const addons = [
    ...(status?.package_addons || []),
    ...(status?.account?.package_addons || []),
    ...(overview?.overview.package_addons || []),
  ];

  addons.forEach((addon) => {
    const code = String(addon.code || "").toLowerCase() as BillingAddonCode;
    if (!code) return;
    const quantity = Number(addon.quantity || 0);
    if (Number.isFinite(quantity) && quantity > 0) {
      quantities[code] = Math.max(1, Math.floor(quantity));
    }
  });

  return quantities;
}

function addonPrice(code: BillingAddonCode) {
  return CUSTOM_PACKAGE_ADDONS.find((addon) => addon.code === code)?.priceMonthly || 0;
}

function planIncludesAddon(addon: (typeof CUSTOM_PACKAGE_ADDONS)[number], planCode: string, plan?: BillingPlan | null) {
  const code = String(planCode || "starter").toLowerCase();
  if (code === "hier" || code === "hier_pro") return true;
  if (addon.code === "extra_active_job_advert") return plan?.job_post_limit === null;
  if (addon.code === "candidate_library") return code === "pro";
  if (addon.code === "hier_intelligence_pro") return false;
  if (addon.code === "hier_intelligence") return false;
  return addon.planFeatures.some((feature) => Boolean((plan as Record<string, unknown> | null | undefined)?.[feature]));
}

function addonQuantityLabel(quantity: number) {
  return quantity === 1 ? "1 item" : `${quantity} items`;
}

function planBullets(plan: BillingPlan) {
  const jobPostLimit =
    typeof plan.job_post_limit === "number" && plan.job_post_limit > 0
      ? `${plan.job_post_limit} active job post${plan.job_post_limit === 1 ? "" : "s"}`
      : "Unlimited job posts";
  const applicantLimit =
    typeof plan.application_limit_per_post === "number" &&
    plan.application_limit_per_post > 0
      ? `${plan.application_limit_per_post} applicants max limit`
      : "Unlimited applicants per post";
  const boostCredits = Number(plan.monthly_boost_credits || 0);

  return [
    jobPostLimit,
    applicantLimit,
    boostCredits > 0 ? `${boostCredits} boost credit${boostCredits === 1 ? "" : "s"}` : null,
    plan.has_pipeline_tools ? "Pipeline tools included" : null,
    plan.has_applicant_rating ? "Applicant rating included" : null,
    plan.code === "pro" || plan.code === "hier" ? "Candidate library included" : null,
    plan.has_analytics ? "Analytics included" : null,
    plan.has_analytics_pro ? "Advanced analytics included" : null,
    plan.has_messaging ? "Messaging included" : null,
    plan.has_interview_scheduling ? "Interview scheduling included" : null,
    plan.code === "hier" ? "Onboarding journey included" : null,
    plan.code === "hier" ? "Employee management system included" : null,
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
  const [packageDraft, setPackageDraft] = useState<BillingAddonCode[]>([]);
  const [packageQuantities, setPackageQuantities] = useState<Partial<Record<BillingAddonCode, number>>>({});
  const [preview, setPreview] = useState<BillingPreviewChangeResponse | null>(null);
  const [previewPlanCode, setPreviewPlanCode] = useState<string | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
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
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : "Could not load billing right now.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const extraSeats = Number(
      overview?.overview.extra_recruiter_seats ??
        status?.account?.extra_recruiter_seats ??
        0
    );

    setSeatDraft(Math.max(0, extraSeats));
  }, [overview?.overview.extra_recruiter_seats, status?.account?.extra_recruiter_seats]);

  const currentPackageAddons = useMemo(
    () => billingAddonCodes(status, overview),
    [status, overview]
  );
  const currentPackageQuantities = useMemo(
    () => billingAddonQuantities(status, overview),
    [status, overview]
  );
  const currentPlanCode = status?.account?.plan_code || "starter";
  const currentPlan = plans.find((plan) => plan.code === currentPlanCode) || status?.plan || null;

  useEffect(() => {
    const purchasable = currentPackageAddons.filter((code) => {
      const addon = CUSTOM_PACKAGE_ADDONS.find((item) => item.code === code);
      return addon ? !planIncludesAddon(addon, currentPlanCode, currentPlan) : true;
    });
    setPackageDraft(purchasable);
    setPackageQuantities({
      ...currentPackageQuantities,
      extra_active_job_advert: currentPackageQuantities.extra_active_job_advert || 0,
    });
  }, [currentPackageAddons, currentPackageQuantities, currentPlan, currentPlanCode]);

  const currentPeriodEnd = overview?.overview.current_period_end || status?.account?.subscription_current_period_end;
  const cancelAtPeriodEnd = Boolean(overview?.overview.cancel_at_period_end || status?.account?.subscription_cancel_at_period_end);
  const currentPaidSubscription = Boolean(status?.flags?.subscription_active);
  const currentPackageTotal = useMemo(
    () =>
      currentPackageAddons.reduce((total, code) => {
        const quantity = code === "extra_active_job_advert"
          ? Math.max(1, Number(currentPackageQuantities[code] || 1))
          : 1;
        return total + addonPrice(code) * quantity;
      }, 0),
    [currentPackageAddons, currentPackageQuantities]
  );
  const packageBasket = useMemo(() => {
    const selected = new Set(packageDraft);
    const current = new Set(currentPackageAddons);
    const added = packageDraft.filter((code) => !current.has(code));
    const removed = currentPackageAddons.filter((code) => !selected.has(code));
    const monthlyTotal = packageDraft.reduce((total, code) => {
      const quantity = code === "extra_active_job_advert"
        ? Math.max(1, Number(packageQuantities[code] || 0))
        : 1;
      return total + addonPrice(code) * quantity;
    }, 0);
    const quantityChanged = packageDraft.some((code) => {
      if (code !== "extra_active_job_advert") return false;
      return Math.max(1, Number(packageQuantities[code] || 0)) !== Math.max(1, Number(currentPackageQuantities[code] || 0));
    });

    return {
      added,
      removed,
      monthlyTotal,
      delta: monthlyTotal - currentPackageTotal,
      changed: added.length > 0 || removed.length > 0 || quantityChanged,
    };
  }, [currentPackageAddons, currentPackageQuantities, currentPackageTotal, packageDraft, packageQuantities]);

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
    const seatPriceMonthly =
      overview?.overview.recruiter_seat_price_monthly ??
      status?.account?.recruiter_seat_price_monthly ??
      null;
    const seatPriceCurrency =
      overview?.overview.recruiter_seat_price_currency ??
      status?.account?.recruiter_seat_price_currency ??
      "GBP";

    return { included, extra, total, active, available, seatPriceMonthly, seatPriceCurrency };
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

  async function handleBuyBoostCredits(creditsToBuy: number) {
    const res = await withAction(`boost-checkout-${creditsToBuy}`, () =>
      createBoostCheckout(creditsToBuy)
    );

    if (res.checkout_url) {
      openUrl(res.checkout_url);
    }
  }

  function togglePackageAddon(code: BillingAddonCode) {
    if (code === "extra_active_job_advert") {
      setPackageQuantities((current) => {
        const nextQuantity = Math.max(0, Number(current.extra_active_job_advert || 0) > 0 ? 0 : 1);
        setPackageDraft((draft) =>
          nextQuantity > 0
            ? Array.from(new Set([...draft, "extra_active_job_advert"]))
            : draft.filter((item) => item !== "extra_active_job_advert")
        );
        return { ...current, extra_active_job_advert: nextQuantity };
      });
      return;
    }

    setPackageDraft((current) =>
      current.includes(code)
        ? current.filter((item) => item !== code)
        : [...current, code]
    );
  }

  function updatePackageQuantity(code: BillingAddonCode, quantity: number) {
    const nextQuantity = Math.max(0, Math.min(99, Math.floor(Number(quantity) || 0)));
    setPackageQuantities((current) => ({ ...current, [code]: nextQuantity }));
    setPackageDraft((current) => {
      const withoutCode = current.filter((item) => item !== code);
      return nextQuantity > 0 ? [...withoutCode, code] : withoutCode;
    });
  }

  async function handleSaveCustomPackage() {
    const addonQuantities = {
      extra_active_job_advert: Number(packageQuantities.extra_active_job_advert || 0),
    };
    const res = await withAction("custom-package", () =>
      updateCustomPackage(packageDraft, promoCode, addonQuantities)
    );

    if (res.checkout_url) {
      openUrl(res.checkout_url);
      return;
    }

    await loadAll();
    setSuccess("Custom package updated. Your dashboard access and monthly billing have been refreshed.");
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

  const packageAddonsWithPlanState = CUSTOM_PACKAGE_ADDONS.map((addon) => ({
    ...addon,
    includedInPlan: planIncludesAddon(addon, currentPlanCode, currentPlan),
  }));
  const purchasablePackageAddons = packageAddonsWithPlanState.filter((addon) => !addon.includedInPlan);
  const includedPackageAddons = packageAddonsWithPlanState.filter((addon) => addon.includedInPlan);
  const selectedPackageCount = packageDraft.reduce((total, code) => {
    if (code === "extra_active_job_advert") {
      return total + Math.max(0, Number(packageQuantities.extra_active_job_advert || 0));
    }
    return total + 1;
  }, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Billing"
        title="Plans, subscription, and billing"
        description="Manage your current Hier plan, upgrade or downgrade cleanly, apply promo codes, and keep track of subscription status, recruiter seats, and boost credits."
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
          {Array.from({ length: 3 }).map((_, idx) => (
            <div key={idx} className="h-48 animate-pulse rounded-[28px] border border-hier-border bg-white" />
          ))}
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
                    {currentPlan ? `${formatMonthlyPrice(currentPlan.price_monthly, currentPlan.currency)} / month ex VAT` : "Plan details unavailable right now."}
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

              <div className="mt-6 rounded-[24px] border border-hier-border bg-hier-panel p-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-hier-muted">
                      Boost credits
                    </p>
                    <h3 className="mt-2 text-lg font-semibold text-hier-text">
                      Add extra post boosts
                    </h3>
                    <p className="mt-1 text-sm text-hier-muted">
                      Monthly remaining:{" "}
                      <span className="font-semibold text-hier-text">
                        {credits.monthlyRemaining}
                      </span>{" "}
                      · Extra purchased:{" "}
                      <span className="font-semibold text-hier-text">
                        {credits.paidRemaining}
                      </span>
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {[1, 2, 3].map((creditsToBuy) => (
                      <button
                        key={creditsToBuy}
                        type="button"
                        onClick={() => handleBuyBoostCredits(creditsToBuy)}
                        disabled={workingKey !== null}
                        className="inline-flex items-center gap-2 rounded-[18px] bg-hier-primary px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-95 disabled:opacity-60"
                      >
                        {workingKey === `boost-checkout-${creditsToBuy}` ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Sparkles className="h-4 w-4" />
                        )}
                        Buy {creditsToBuy}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {cancelAtPeriodEnd ? (
                <div className="mt-6 rounded-[24px] border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-800">
                  Your paid subscription remains active until <span className="font-semibold">{formatDate(currentPeriodEnd)}</span>, then the account returns to Starter unless you reactivate it first.
                </div>
              ) : null}

              {cancelAtPeriodEnd ? (
                <div className="mt-6">
                  <button
                    type="button"
                    onClick={handleReactivate}
                    disabled={workingKey !== null}
                    className="inline-flex items-center gap-2 rounded-[20px] bg-hier-primary px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-95 disabled:opacity-60"
                  >
                    {workingKey === "reactivate" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    Keep subscription active
                  </button>
                </div>
              ) : null}
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

              <div className="mt-5 grid gap-2 sm:grid-cols-3">
                {[1, 2, 3].map((creditsToBuy) => (
                  <button
                    key={creditsToBuy}
                    type="button"
                    onClick={() => handleBuyBoostCredits(creditsToBuy)}
                    disabled={workingKey !== null}
                    className="inline-flex items-center justify-center gap-2 rounded-[18px] bg-hier-primary px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-95 disabled:opacity-60"
                  >
                    {workingKey === `boost-checkout-${creditsToBuy}` ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                    Buy {creditsToBuy}
                  </button>
                ))}
              </div>

              <div className="mt-3">
                <Link
                  href="/promote"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-[18px] border border-hier-border bg-white px-4 py-3 text-sm font-semibold text-hier-text shadow-sm transition hover:bg-hier-soft"
                >
                  Use existing credits on a post
                </Link>
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
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-hier-text">Purchased extra recruiter seats</p>
                  <p className="mt-2 text-sm leading-6 text-hier-muted">
                    Increase or reduce extra seat capacity. You cannot reduce below the number of seats already in use.
                  </p>
                </div>
                {recruiterSeats.seatPriceMonthly !== null && recruiterSeats.seatPriceMonthly !== undefined ? (
                  <div className="rounded-[18px] border border-hier-border bg-white px-4 py-3 text-right">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-hier-muted">Extra seat price</p>
                    <p className="mt-1 text-lg font-semibold text-hier-text">
                      {formatCurrency(recruiterSeats.seatPriceMonthly, {
                        currency: recruiterSeats.seatPriceCurrency,
                        maximumFractionDigits: 2,
                        minimumFractionDigits: 2,
                      })}
                      <span className="text-xs font-semibold text-hier-muted"> / month ex VAT</span>
                    </p>
                  </div>
                ) : null}
              </div>

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
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-hier-muted">Customise your package</p>
                <h2 className="mt-2 text-2xl font-semibold text-hier-text">Build the monthly add-ons you need</h2>
                <p className="mt-2 max-w-3xl text-sm leading-7 text-hier-muted">
                  Select products to add them to your subscription basket. Confirming updates Stripe billing immediately and syncs the selected features across the dashboard and app.
                </p>
              </div>

              <span className="inline-flex items-center gap-2 rounded-full bg-hier-soft px-3 py-1.5 text-sm font-semibold text-hier-primary">
                <PackagePlus className="h-4 w-4" />
                {selectedPackageCount} selected
              </span>
            </div>

            {includedPackageAddons.length ? (
              <div className="mt-5 rounded-[22px] border border-hier-border bg-hier-panel px-5 py-4">
                <p className="text-sm font-semibold text-hier-text">
                  Already included in your {currentPlan?.name || currentPlanCode} plan
                </p>
                <p className="mt-2 text-sm leading-6 text-hier-muted">
                  These products are already unlocked through your subscription, so they are not offered as custom add-ons.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {includedPackageAddons.map((addon) => (
                    <span
                      key={addon.code}
                      className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-semibold text-hier-text shadow-sm"
                    >
                      <BadgeCheck className="h-3.5 w-3.5 text-hier-primary" />
                      {addon.name}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="mt-6 grid gap-5 xl:grid-cols-[1fr_360px]">
              <div className="grid gap-3 md:grid-cols-2">
                {purchasablePackageAddons.length ? purchasablePackageAddons.map((addon) => {
                  const selected = packageDraft.includes(addon.code);
                  const active = currentPackageAddons.includes(addon.code);
                  const quantity = addon.code === "extra_active_job_advert"
                    ? Math.max(0, Number(packageQuantities.extra_active_job_advert || 0))
                    : 1;
                  const displayQuantity = addon.code === "extra_active_job_advert" ? quantity : 1;

                  return (
                    <div
                      key={addon.code}
                      onClick={() => {
                        if (workingKey !== null) return;
                        if (addon.quantityEnabled && quantity <= 0) {
                          updatePackageQuantity(addon.code, 1);
                          return;
                        }
                        if (!addon.quantityEnabled) togglePackageAddon(addon.code);
                      }}
                      className={`flex min-h-[158px] flex-col justify-between rounded-[24px] border p-4 text-left shadow-sm transition ${
                        selected
                          ? "border-hier-primary bg-hier-soft"
                          : "border-hier-border bg-white hover:bg-hier-panel"
                      } ${workingKey !== null ? "opacity-60" : ""} ${addon.quantityEnabled ? "" : "cursor-pointer"}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-base font-semibold text-hier-text">{addon.name}</h3>
                            <span className="rounded-full border border-hier-border bg-white px-2.5 py-1 text-xs font-semibold text-hier-text shadow-sm">
                              {formatCurrency(addon.priceMonthly, {
                                currency: "GBP",
                                maximumFractionDigits: 2,
                                minimumFractionDigits: 2,
                              })}
                              <span className="text-hier-muted"> / month</span>
                            </span>
                          </div>
                          <p className="mt-2 text-sm leading-6 text-hier-muted">{addon.description}</p>
                        </div>

                        <span
                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
                            selected
                              ? "border-hier-primary bg-hier-primary text-white"
                              : "border-hier-border bg-white text-transparent"
                          }`}
                          aria-hidden="true"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </span>
                      </div>

                      <div className="mt-4 flex items-end justify-between gap-3">
                        <div>
                          <p className="text-lg font-semibold text-hier-text">
                            {formatCurrency(addon.priceMonthly * displayQuantity, {
                              currency: "GBP",
                              maximumFractionDigits: 2,
                              minimumFractionDigits: 2,
                            })}
                            <span className="text-xs font-semibold text-hier-muted"> / month ex VAT</span>
                          </p>
                          <p className="mt-1 text-xs font-semibold text-hier-muted">
                            {addon.quantityEnabled
                              ? `${formatCurrency(addon.priceMonthly, {
                                  currency: "GBP",
                                  maximumFractionDigits: 2,
                                  minimumFractionDigits: 2,
                                })} each. Unlocks: ${addon.unlocks}`
                              : `Unlocks: ${addon.unlocks}`}
                          </p>
                        </div>

                        {addon.quantityEnabled ? (
                          <div
                            className="flex shrink-0 flex-wrap items-center justify-end gap-2"
                            onClick={(event) => event.stopPropagation()}
                          >
                            {quantity <= 0 ? (
                              <button
                                type="button"
                                onClick={() => updatePackageQuantity(addon.code, 1)}
                                disabled={workingKey !== null}
                                className="inline-flex h-9 items-center justify-center rounded-[14px] bg-hier-primary px-3 text-xs font-semibold text-white shadow-sm transition hover:opacity-95 disabled:opacity-50"
                              >
                                Add
                              </button>
                            ) : null}
                            <button
                              type="button"
                              onClick={() => updatePackageQuantity(addon.code, quantity - 1)}
                              disabled={workingKey !== null || quantity <= 0}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-[14px] border border-hier-border bg-white text-hier-text shadow-sm transition hover:bg-hier-soft disabled:opacity-50"
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                            <span className="min-w-10 rounded-[14px] border border-hier-border bg-white px-3 py-2 text-center text-sm font-semibold text-hier-text">
                              {quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => updatePackageQuantity(addon.code, quantity + 1)}
                              disabled={workingKey !== null}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-[14px] border border-hier-border bg-white text-hier-text shadow-sm transition hover:bg-hier-soft disabled:opacity-50"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              togglePackageAddon(addon.code);
                            }}
                            disabled={workingKey !== null}
                            className={`inline-flex shrink-0 items-center justify-center rounded-[14px] px-3 py-2 text-xs font-semibold shadow-sm transition disabled:opacity-50 ${
                              selected
                                ? "border border-hier-border bg-white text-hier-text hover:bg-hier-panel"
                                : "bg-hier-primary text-white hover:opacity-95"
                            }`}
                          >
                            {selected ? "Remove" : "Add"}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                }) : (
                  <div className="rounded-[24px] border border-hier-border bg-hier-panel px-5 py-8 text-sm leading-6 text-hier-muted md:col-span-2">
                    Your current plan already includes the custom package products, so there is nothing extra to add here.
                  </div>
                )}
              </div>

              <aside className="rounded-[24px] border border-hier-border bg-hier-panel p-5">
                <div className="flex items-center gap-2">
                  <ShoppingBasket className="h-5 w-5 text-hier-primary" />
                  <h3 className="text-lg font-semibold text-hier-text">Basket</h3>
                </div>

                <div className="mt-5 space-y-3">
                  {packageDraft.length ? (
                    packageDraft.map((code) => {
                      const addon = CUSTOM_PACKAGE_ADDONS.find((item) => item.code === code);
                      if (!addon) return null;
                      const quantity = code === "extra_active_job_advert"
                        ? Math.max(1, Number(packageQuantities.extra_active_job_advert || 1))
                        : 1;
                      const lineTotal = addon.priceMonthly * quantity;

                      return (
                        <div key={code} className="flex items-start justify-between gap-3 rounded-[18px] border border-hier-border bg-white px-4 py-3">
                          <div>
                            <p className="text-sm font-semibold text-hier-text">{addon.name}</p>
                            <p className="mt-1 text-xs text-hier-muted">
                              {currentPackageAddons.includes(code) ? "Already in your subscription" : "New add-on"}
                              {code === "extra_active_job_advert" ? ` - ${addonQuantityLabel(quantity)}` : ""}
                            </p>
                          </div>
                          <p className="whitespace-nowrap text-sm font-semibold text-hier-text">
                            {formatCurrency(lineTotal, {
                              currency: "GBP",
                              maximumFractionDigits: 2,
                              minimumFractionDigits: 2,
                            })}
                          </p>
                        </div>
                      );
                    })
                  ) : (
                    <div className="rounded-[18px] border border-hier-border bg-white px-4 py-5 text-sm text-hier-muted">
                      No add-ons selected.
                    </div>
                  )}
                </div>

                <div className="mt-5 rounded-[18px] border border-hier-border bg-white px-4 py-4">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-hier-muted">Current add-ons</span>
                    <span className="font-semibold text-hier-text">
                      {formatCurrency(currentPackageTotal, {
                        currency: "GBP",
                        maximumFractionDigits: 2,
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3 text-sm">
                    <span className="text-hier-muted">New add-on total</span>
                    <span className="font-semibold text-hier-text">
                      {formatCurrency(packageBasket.monthlyTotal, {
                        currency: "GBP",
                        maximumFractionDigits: 2,
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                  <div className="mt-3 border-t border-hier-border pt-3">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="font-semibold text-hier-text">Monthly change</span>
                      <span className={`font-semibold ${packageBasket.delta >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                        {packageBasket.delta >= 0 ? "+" : ""}
                        {formatCurrency(packageBasket.delta, {
                          currency: "GBP",
                          maximumFractionDigits: 2,
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                {packageBasket.added.length || packageBasket.removed.length ? (
                  <div className="mt-4 space-y-2 text-xs leading-5 text-hier-muted">
                    {packageBasket.added.length ? (
                      <p>
                        Adding:{" "}
                        <span className="font-semibold text-hier-text">
                          {packageBasket.added
                            .map((code) => CUSTOM_PACKAGE_ADDONS.find((addon) => addon.code === code)?.name)
                            .filter(Boolean)
                            .join(", ")}
                        </span>
                      </p>
                    ) : null}
                    {packageBasket.removed.length ? (
                      <p>
                        Removing:{" "}
                        <span className="font-semibold text-hier-text">
                          {packageBasket.removed
                            .map((code) => CUSTOM_PACKAGE_ADDONS.find((addon) => addon.code === code)?.name)
                            .filter(Boolean)
                            .join(", ")}
                        </span>
                      </p>
                    ) : null}
                  </div>
                ) : null}

                <button
                  type="button"
                  onClick={handleSaveCustomPackage}
                  disabled={workingKey !== null || !packageBasket.changed}
                  className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-[20px] bg-hier-primary px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-95 disabled:opacity-60"
                >
                  {workingKey === "custom-package" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                  Confirm package
                </button>

                <p className="mt-3 text-xs leading-5 text-hier-muted">
                  Confirming charges any immediate prorated amount through Stripe and applies the selected add-ons to future monthly renewals.
                </p>
              </aside>
            </div>
          </section>

          <section className="rounded-[32px] border border-hier-border bg-white p-6 shadow-card sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-hier-muted">Available plans</p>
                <h2 className="mt-2 text-2xl font-semibold text-hier-text">Choose the right plan for your team</h2>
                <p className="mt-2 max-w-3xl text-sm leading-7 text-hier-muted">
                  Starter stays free, new paid plans go through Stripe checkout, upgrades can apply immediately, and downgrades are scheduled for your next renewal.
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {plans.map((plan) => {
                const current = plan.code === currentPlanCode;
                const isStarter = plan.code === "starter";
                const bullets = planBullets(plan);
                const previewOpen = previewPlanCode === plan.code && preview;

                return (
                  <article
                    key={plan.id}
                    className={`rounded-[24px] border p-4 shadow-sm transition ${current ? "border-hier-primary bg-hier-soft" : "border-hier-border bg-white"}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-base font-semibold text-hier-text">{plan.name}</h3>
                        <p className="mt-2 text-2xl font-semibold tracking-tight text-hier-text">
                          {formatMonthlyPrice(plan.price_monthly, plan.currency)}
                          <span className="ml-1 text-xs font-medium text-hier-muted">/ month ex VAT</span>
                        </p>
                      </div>
                      {current ? <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-hier-primary shadow-sm">Current</span> : null}
                    </div>

                    <div className="mt-4 space-y-1.5 text-xs text-hier-muted">
                      {bullets.map((bullet) => (
                        <p key={bullet} className="leading-5">• {bullet}</p>
                      ))}
                    </div>

                    <div className="mt-5 flex gap-3">
                      {!current && !isStarter ? (
                        <button
                          type="button"
                          onClick={() => handleSelectPlan(plan.code || "starter")}
                          disabled={workingKey !== null}
                          className="inline-flex w-full items-center justify-center gap-2 rounded-[14px] bg-hier-primary px-3 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:opacity-95 disabled:opacity-60"
                        >
                          {workingKey && workingKey.includes(plan.code || "") ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                          {currentPaidSubscription ? `Switch to ${plan.name}` : `Choose ${plan.name}`}
                        </button>
                      ) : (
                        <div className="inline-flex w-full items-center justify-center rounded-[14px] border border-hier-border bg-white px-3 py-2.5 text-xs font-semibold text-hier-text">
                          {current ? "Already active" : "Starter downgrade below"}
                        </div>
                      )}
                    </div>

                    {previewOpen ? (
                      <div className="mt-5 rounded-[22px] border border-hier-border bg-white p-4">
                        <p className="text-sm font-semibold text-hier-text">Change preview</p>

                        {preview.mode === "immediate_upgrade" ? (
                          <>
                            <p className="mt-2 text-sm text-hier-muted">This upgrade applies immediately.</p>
                            <p className="mt-3 text-lg font-semibold text-hier-text">Due now: {formatCurrency(preview.amount_due_now, { currency: preview.currency, minorUnits: true })}</p>
                            <div className="mt-3 space-y-2 text-sm text-hier-muted">
                              {(preview.lines || []).slice(0, 4).map((line, index) => (
                                <div key={line.id || index} className="flex items-start justify-between gap-3">
                                  <span className="leading-5">{line.description || (line.proration ? "Proration" : "Plan adjustment")}</span>
                                  <span className="font-medium text-hier-text">{formatCurrency(line.amount, { currency: line.currency || preview.currency, minorUnits: true })}</span>
                                </div>
                              ))}
                            </div>
                          </>
                        ) : null}

                        {preview.mode === "scheduled_downgrade" ? (
                          <p className="mt-2 text-sm text-hier-muted">
                            This downgrade stays on your current paid plan until <span className="font-semibold text-hier-text">{formatDate(preview.current_period_end)}</span>, then changes at renewal.
                          </p>
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
                            <button
                              type="button"
                              onClick={() => {
                                setPreview(null);
                                setPreviewPlanCode(null);
                              }}
                              className="rounded-[18px] border border-hier-border bg-white px-4 py-3 text-sm font-semibold text-hier-text"
                            >
                              Close
                            </button>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </section>

          <section className="rounded-[32px] border border-rose-100 bg-white shadow-card">
            <button
              type="button"
              onClick={() => setCancelOpen((value) => !value)}
              className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left sm:px-8"
            >
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-rose-500">Subscription cancellation</p>
                <h2 className="mt-2 text-xl font-semibold text-hier-text">Return to Starter</h2>
                <p className="mt-1 text-sm text-hier-muted">
                  Keep cancellation controls separate from normal billing actions.
                </p>
              </div>
              <ChevronDown className={`h-5 w-5 text-hier-muted transition ${cancelOpen ? "rotate-180" : ""}`} />
            </button>

            {cancelOpen ? (
              <div className="border-t border-rose-100 px-6 pb-6 pt-5 sm:px-8">
                <p className="max-w-3xl text-sm leading-7 text-hier-muted">
                  Cancel your paid subscription and keep access until the end of your current billing period. After that, your account will return to Starter.
                </p>

                <div className="mt-5 rounded-[24px] border border-hier-border bg-hier-panel px-4 py-4 text-sm text-hier-muted">
                  Current period ends: <span className="font-semibold text-hier-text">{formatDate(currentPeriodEnd)}</span>
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  {!cancelAtPeriodEnd && currentPaidSubscription ? (
                    <button
                      type="button"
                      onClick={() => handleSelectPlan("starter")}
                      disabled={workingKey !== null}
                      className="inline-flex items-center gap-2 rounded-[20px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 shadow-sm transition hover:bg-rose-100 disabled:opacity-60"
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

                  {!currentPaidSubscription && currentPlanCode === "starter" ? (
                    <div className="rounded-[20px] border border-hier-border bg-hier-panel px-4 py-3 text-sm font-semibold text-hier-muted">
                      You are already on Starter.
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
          </section>
        </>
      )}
    </div>
  );
}
