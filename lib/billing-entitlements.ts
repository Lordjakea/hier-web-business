import type { BillingStatusResponse } from "@/lib/types";

export type BillingAddonCode =
  | "extra_active_job_advert"
  | "analytics"
  | "messaging"
  | "interview_scheduling"
  | "onboarding_employee_management"
  | "candidate_library"
  | "hier_intelligence"
  | "hier_intelligence_pro";

export const CUSTOM_PACKAGE_ADDONS: Array<{
  code: BillingAddonCode;
  name: string;
  description: string;
  priceMonthly: number;
  unlocks: string;
  planFeatures: string[];
  quantityEnabled?: boolean;
}> = [
  {
    code: "extra_active_job_advert",
    name: "Extra active job advert",
    description: "Add one more live job advert to your current plan limit.",
    priceMonthly: 59.99,
    unlocks: "Job posting capacity",
    planFeatures: [],
    quantityEnabled: true,
  },
  {
    code: "analytics",
    name: "Access Analytics",
    description: "Recruitment performance, funnel and role insights.",
    priceMonthly: 74.99,
    unlocks: "Analytics dashboard",
    planFeatures: ["has_analytics", "has_analytics_pro"],
  },
  {
    code: "messaging",
    name: "Messaging",
    description: "Business-to-candidate inbox and conversation tools.",
    priceMonthly: 99.99,
    unlocks: "Messages",
    planFeatures: ["has_messaging"],
  },
  {
    code: "interview_scheduling",
    name: "In-app interview scheduling",
    description: "Schedule interviews from the app workflow.",
    priceMonthly: 49.99,
    unlocks: "Interview scheduling",
    planFeatures: ["has_interview_scheduling"],
  },
  {
    code: "onboarding_employee_management",
    name: "Onboarding and Employee Management",
    description: "Onboarding journeys, employee records and document workflows.",
    priceMonthly: 199.99,
    unlocks: "Onboarding and employee records",
    planFeatures: ["has_onboarding", "has_onboarding_pro", "has_employee_management"],
  },
  {
    code: "candidate_library",
    name: "Candidate Library",
    description: "Search, score and reuse previous applicants across roles.",
    priceMonthly: 99.99,
    unlocks: "Candidate Library",
    planFeatures: ["has_candidate_library"],
  },
  {
    code: "hier_intelligence",
    name: "Hier AI",
    description: "Core intelligence tools for hiring decisions.",
    priceMonthly: 49.99,
    unlocks: "Hier AI",
    planFeatures: ["has_hier_intelligence"],
  },
  {
    code: "hier_intelligence_pro",
    name: "Hier AI Pro",
    description: "Advanced AI hiring support with richer applicant summaries.",
    priceMonthly: 149.99,
    unlocks: "Hier AI Pro",
    planFeatures: ["has_hier_intelligence_pro"],
  },
];

function activeAddonCodes(status?: BillingStatusResponse | null) {
  const direct = status?.active_package_addons || status?.account?.active_package_addons || [];
  const fromAddons = [
    ...(status?.package_addons || []),
    ...(status?.account?.package_addons || []),
  ]
    .filter((addon) => addon.enabled || addon.is_active)
    .map((addon) => addon.code);

  return new Set([...direct, ...fromAddons].map((code) => String(code).toLowerCase()));
}

function planCode(status?: BillingStatusResponse | null) {
  return String(status?.account?.plan_code || status?.plan?.code || "")
    .trim()
    .toLowerCase();
}

export function hasBillingAddon(
  status: BillingStatusResponse | null | undefined,
  code: BillingAddonCode,
) {
  return activeAddonCodes(status).has(code);
}

export function hasMessagingAccess(status?: BillingStatusResponse | null) {
  const code = planCode(status);
  return (
    Boolean(status?.plan?.has_messaging) ||
    ["pro", "hier", "hier_pro"].includes(code) ||
    hasBillingAddon(status, "messaging")
  );
}

export function hasCandidateLibraryAccess(status?: BillingStatusResponse | null) {
  const code = planCode(status);
  return ["pro", "hier", "hier_pro"].includes(code) || hasBillingAddon(status, "candidate_library");
}

export function hasAnalyticsAccess(status?: BillingStatusResponse | null) {
  return Boolean(status?.plan?.has_analytics || status?.plan?.has_analytics_pro) || hasBillingAddon(status, "analytics");
}

export function hasOnboardingAccess(status?: BillingStatusResponse | null) {
  const code = planCode(status);
  return ["hier", "hier_pro"].includes(code) || hasBillingAddon(status, "onboarding_employee_management");
}
