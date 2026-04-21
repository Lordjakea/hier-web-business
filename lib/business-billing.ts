import { apiFetch } from "@/lib/api";
import type {
  BillingOverviewResponse,
  BillingPlansResponse,
  BillingStatusResponse,
  BillingPortalResponse,
  BillingPreviewChangeResponse,
  BillingMutationResponse,
  BoostEligiblePostsResponse,
  CreateBoostResponse,
} from "@/lib/types";

export function fetchBillingStatus() {
  return apiFetch<BillingStatusResponse>("/api/business/billing/status");
}

export function fetchBillingOverview() {
  return apiFetch<BillingOverviewResponse>("/api/business/billing/overview");
}

export function fetchBillingPlans() {
  return apiFetch<BillingPlansResponse>("/api/business/billing/plans");
}

export function selectStarterPlan() {
  return apiFetch<BillingMutationResponse>("/api/business/billing/select-plan", {
    method: "POST",
    body: JSON.stringify({ plan_code: "starter" }),
  });
}

export function createSubscriptionCheckout(planCode: string, promoCode?: string) {
  return apiFetch<BillingMutationResponse>("/api/business/billing/checkout/subscription", {
    method: "POST",
    body: JSON.stringify({
      plan_code: planCode,
      promo_code: promoCode?.trim() || undefined,
    }),
  });
}

export function previewSubscriptionChange(planCode: string) {
  return apiFetch<BillingPreviewChangeResponse>("/api/business/billing/subscription/preview-change", {
    method: "POST",
    body: JSON.stringify({ plan_code: planCode }),
  });
}

export function changeSubscriptionPlan(planCode: string, promoCode?: string) {
  return apiFetch<BillingMutationResponse>("/api/business/billing/subscription/change-plan", {
    method: "POST",
    body: JSON.stringify({
      plan_code: planCode,
      promo_code: promoCode?.trim() || undefined,
    }),
  });
}

export function createBillingPortal() {
  return apiFetch<BillingPortalResponse>("/api/business/billing/portal", {
    method: "POST",
  });
}

export function cancelSubscriptionAtPeriodEnd() {
  return apiFetch<BillingMutationResponse>("/api/business/billing/subscription/cancel", {
    method: "POST",
  });
}

export function reactivateSubscription() {
  return apiFetch<BillingMutationResponse>("/api/business/billing/subscription/reactivate", {
    method: "POST",
  });
}

export function fetchEligibleBoostPosts() {
  return apiFetch<BoostEligiblePostsResponse>("/api/business/billing/boosts/eligible-posts");
}

export function createPostBoost(jobPostId: number, creditsToUse: number) {
  return apiFetch<CreateBoostResponse>("/api/business/billing/boosts", {
    method: "POST",
    body: JSON.stringify({ job_post_id: jobPostId, credits_to_use: creditsToUse }),
  });
}
