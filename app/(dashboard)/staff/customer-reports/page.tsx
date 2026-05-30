"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  MailCheck,
  Megaphone,
  MousePointerClick,
  PhoneCall,
  RefreshCw,
  Search,
  Upload,
  XCircle,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import {
  fetchFilteredStaffCrmReports,
  fetchStaffMarketingCampaign,
  fetchStaffMarketingCampaigns,
  fetchStaffCrmReports,
  getMarketingOptInsCsvUrl,
  syncStaffMarketingCampaignMetrics,
  type StaffMarketingCampaignDetail,
  type StaffMarketingCampaignSummary,
  type StaffCrmReportResponse,
} from "@/lib/staff-crm";
import {
  fetchStaffCallAnalytics,
  type CallAnalyticsPeriod,
  type CallAnalyticsResponse,
} from "@/lib/staff-calls";
import { getAuthToken } from "@/lib/auth";

const CALL_PERIOD_OPTIONS: Array<{ value: CallAnalyticsPeriod; label: string }> = [
  { value: "day", label: "Daily" },
  { value: "week", label: "Weekly" },
  { value: "month", label: "Monthly" },
  { value: "year", label: "Yearly" },
  { value: "all", label: "All time" },
];

function formatDate(value?: string | null) {
  if (!value) return "Not sent";
  try {
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(value));
  } catch {
    return "Not sent";
  }
}

function formatPercent(value?: number | null) {
  if (typeof value !== "number" || Number.isNaN(value)) return "0%";
  const percent = value > 1 ? value : value * 100;
  return `${Math.round(percent)}%`;
}

function statusText(value?: string | null) {
  return value ? "Yes" : "No";
}

export default function StaffCustomerReportsPage() {
  const [reports, setReports] = useState<StaffCrmReportResponse | null>(null);
  const [reportFilter, setReportFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [callAnalytics, setCallAnalytics] = useState<CallAnalyticsResponse | null>(null);
  const [callPeriod, setCallPeriod] = useState<CallAnalyticsPeriod>("month");
  const [callLoading, setCallLoading] = useState(true);
  const [callError, setCallError] = useState<string | null>(null);
  const [campaigns, setCampaigns] = useState<StaffMarketingCampaignSummary[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<number | null>(null);
  const [campaignDetail, setCampaignDetail] = useState<StaffMarketingCampaignDetail | null>(null);
  const [campaignsLoading, setCampaignsLoading] = useState(true);
  const [campaignDetailLoading, setCampaignDetailLoading] = useState(false);
  const [campaignSyncing, setCampaignSyncing] = useState(false);
  const [campaignSearch, setCampaignSearch] = useState("");
  const [campaignError, setCampaignError] = useState<string | null>(null);

  const loadCallAnalytics = useCallback(async () => {
    setCallLoading(true);
    setCallError(null);

    try {
      const response = await fetchStaffCallAnalytics(callPeriod);
      setCallAnalytics(response);
    } catch (caughtError) {
      setCallError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not load call analytics."
      );
    } finally {
      setCallLoading(false);
    }
  }, [callPeriod]);

  useEffect(() => {
    void loadCallAnalytics();
  }, [loadCallAnalytics]);

  const loadCampaigns = useCallback(async () => {
    setCampaignsLoading(true);
    setCampaignError(null);

    try {
      const response = await fetchStaffMarketingCampaigns();
      const nextCampaigns = response.campaigns || [];
      setCampaigns(nextCampaigns);

      if (!selectedCampaignId && nextCampaigns[0]) {
        setSelectedCampaignId(nextCampaigns[0].id);
      }
    } catch (caughtError) {
      setCampaignError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not load email campaigns."
      );
    } finally {
      setCampaignsLoading(false);
    }
  }, [selectedCampaignId]);

  useEffect(() => {
    void loadCampaigns();
  }, [loadCampaigns]);

  useEffect(() => {
    if (!selectedCampaignId) {
      setCampaignDetail(null);
      return;
    }

    let cancelled = false;
    const campaignId = selectedCampaignId;

    async function loadCampaignDetail() {
      setCampaignDetailLoading(true);
      setCampaignError(null);

      try {
        const response = await fetchStaffMarketingCampaign(campaignId);
        if (!cancelled) setCampaignDetail(response.campaign);
      } catch (caughtError) {
        if (!cancelled) {
          setCampaignError(
            caughtError instanceof Error
              ? caughtError.message
              : "Could not load campaign detail."
          );
        }
      } finally {
        if (!cancelled) setCampaignDetailLoading(false);
      }
    }

    void loadCampaignDetail();

    return () => {
      cancelled = true;
    };
  }, [selectedCampaignId]);

  const loadReports = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response =
        reportFilter === "all"
          ? await fetchStaffCrmReports()
          : await fetchFilteredStaffCrmReports(reportFilter);
      setReports(response);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not load customer reporting."
      );
    } finally {
      setLoading(false);
    }
  }, [reportFilter]);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  async function exportMarketingOptIns() {
    const token = getAuthToken();
    const response = await fetch(getMarketingOptInsCsvUrl(), {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      cache: "no-store",
    });

    if (!response.ok) {
      setError("Could not export marketing opt-ins.");
      return;
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "marketing-opt-ins.csv";
    link.click();
    window.URL.revokeObjectURL(url);
  }

  async function syncCampaignMetrics() {
    setCampaignSyncing(true);
    setCampaignError(null);

    try {
      await syncStaffMarketingCampaignMetrics(selectedCampaignId || undefined);
      await loadCampaigns();
      if (selectedCampaignId) {
        const response = await fetchStaffMarketingCampaign(selectedCampaignId);
        setCampaignDetail(response.campaign);
      }
    } catch (caughtError) {
      setCampaignError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not sync campaign metrics."
      );
    } finally {
      setCampaignSyncing(false);
    }
  }

  const summary = reports?.summary;
  const summaryTiles = summary
    ? [
        { label: "New businesses", value: summary.new_businesses_30d, filter: "new_businesses" },
        { label: "New candidates", value: summary.new_candidates_30d, filter: "new_candidates" },
        { label: "Pending subscriptions", value: summary.pending_subscriptions, filter: "pending_subscriptions" },
        { label: "Cancellations", value: summary.cancellations, filter: "cancellations" },
        { label: "Marketing opted in", value: summary.marketing_opted_in, filter: "marketing_opt_ins" },
        { label: "Total businesses", value: summary.total_businesses, filter: "all" },
      ]
    : [];
  const campaignFunnel = campaignDetail?.funnel;
  const filteredCampaignRecipients = (campaignDetail?.recipients || []).filter((recipient) => {
    const query = campaignSearch.trim().toLowerCase();
    if (!query) return true;

    return [
      recipient.email,
      recipient.first_name,
      recipient.last_name,
      recipient.company_name,
      recipient.job_title,
      recipient.city,
      recipient.signup_status,
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query));
  });

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
        eyebrow="Reporting"
        title="Customer reporting"
        description="Track customer growth, subscription risk, cancellations and marketing opt-ins."
        action={
          <button
            type="button"
            onClick={() => {
              void loadReports();
              void loadCampaigns();
              void loadCallAnalytics();
            }}
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
          <p>{error}</p>
        </div>
      ) : null}

      {summary ? (
        <section className="grid gap-4 xl:grid-cols-[1fr_360px]">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {summaryTiles.map(({ label, value, filter }) => (
              <button
                key={label}
                type="button"
                onClick={() => setReportFilter(filter)}
                className={`rounded-[28px] border p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-hier-primary ${
                  reportFilter === filter
                    ? "border-hier-primary bg-hier-soft"
                    : "border-hier-border bg-white"
                }`}
              >
                <p className="text-sm font-medium text-hier-muted">{label}</p>
                <p className="mt-3 text-3xl font-semibold text-hier-text">{value}</p>
              </button>
            ))}
          </div>

          <div className="rounded-[28px] border border-hier-border bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-hier-text">Marketing opt-in</h2>
                <p className="mt-1 text-sm text-hier-muted">Customers available for email campaigns.</p>
              </div>
              <div className="rounded-2xl bg-hier-soft p-2 text-hier-primary">
                <Megaphone className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-5 text-4xl font-semibold text-hier-text">
              {summary.marketing_opted_in}
            </p>
            <button
              type="button"
              onClick={() => void exportMarketingOptIns()}
              className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-[16px] border border-hier-border bg-hier-panel px-3 text-sm font-semibold text-hier-text transition hover:bg-hier-soft"
            >
              Export CSV
            </button>
          </div>
        </section>
      ) : null}

      <section className="rounded-[32px] border border-hier-border bg-white p-5 shadow-card sm:p-6">
        <div className="grid gap-4 lg:grid-cols-[280px_1fr] lg:items-start">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-hier-text">Reporting filter</span>
            <select
              value={reportFilter}
              onChange={(event) => setReportFilter(event.target.value)}
              className="h-12 w-full rounded-[18px] border border-hier-border bg-hier-panel px-4 text-sm text-hier-text outline-none transition focus:border-hier-primary focus:bg-white"
            >
              <option value="all">All customers</option>
              <option value="pending_subscriptions">Pending subscriptions</option>
              <option value="cancellations">Cancellations</option>
              <option value="new_businesses">New businesses</option>
              <option value="new_candidates">New candidates</option>
              <option value="marketing_opt_ins">Marketing opt-ins</option>
            </select>
          </label>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-hier-text">Filtered report</h2>
              <span className="text-sm text-hier-muted">
                {reports?.filtered_accounts.length || 0} accounts
              </span>
            </div>

            {loading ? (
              <div className="rounded-[20px] border border-hier-border bg-hier-panel p-4 text-sm text-hier-muted">
                Loading report...
              </div>
            ) : reports?.filtered_accounts.length ? (
              <div className="grid gap-3 lg:grid-cols-2">
                {reports.filtered_accounts.slice(0, 16).map((account) => (
                  <Link
                    key={`customer-report-${account.user_id}`}
                    href={`/staff/accounts/${account.user_id}`}
                    className="rounded-[20px] border border-hier-border bg-hier-panel p-4 transition hover:border-hier-primary"
                  >
                    <p className="truncate text-sm font-semibold text-hier-text">{account.display_name}</p>
                    <p className="mt-1 truncate text-xs text-hier-muted">{account.email || "No email"}</p>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="rounded-[20px] border border-dashed border-hier-border bg-hier-panel p-4 text-sm text-hier-muted">
                No accounts match this report filter.
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-[32px] border border-hier-border bg-white p-5 shadow-card sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-hier-soft p-2 text-hier-primary">
              <MailCheck className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-hier-text">Email Campaigns</h2>
              <p className="mt-1 text-sm text-hier-muted">
                Resend delivery, click attribution and business signup conversion.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void loadCampaigns()}
            className="inline-flex h-10 items-center gap-2 rounded-[16px] border border-hier-border bg-hier-panel px-3 text-sm font-semibold text-hier-text transition hover:bg-hier-soft"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          <Link
            href="/staff/customer-reports/email-campaigns/import"
            className="inline-flex h-10 items-center gap-2 rounded-[16px] bg-hier-primary px-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
          >
            <Upload className="h-4 w-4" />
            Import Leads
          </Link>
          <button
            type="button"
            onClick={() => void syncCampaignMetrics()}
            disabled={campaignSyncing}
            className="inline-flex h-10 items-center gap-2 rounded-[16px] border border-hier-border bg-white px-3 text-sm font-semibold text-hier-text transition hover:bg-hier-soft disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${campaignSyncing ? "animate-spin" : ""}`} />
            Sync Resend
          </button>
        </div>

        {campaignError ? (
          <div className="mt-4 flex items-start gap-3 rounded-[20px] border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{campaignError}</p>
          </div>
        ) : null}

        {campaignsLoading ? (
          <div className="mt-4 rounded-[20px] border border-hier-border bg-hier-panel p-4 text-sm text-hier-muted">
            Loading email campaigns...
          </div>
        ) : campaigns.length ? (
          <div className="mt-5 space-y-5">
            <div className="overflow-x-auto">
              <table className="min-w-[1080px] w-full text-left text-sm">
                <thead className="bg-hier-panel text-xs uppercase tracking-[0.12em] text-hier-muted">
                  <tr>
                    <th className="px-4 py-3">Campaign</th>
                    <th className="px-4 py-3">Subject</th>
                    <th className="px-3 py-3 text-center">Leads</th>
                    <th className="px-3 py-3 text-center">Sent</th>
                    <th className="px-3 py-3 text-center">Delivered</th>
                    <th className="px-3 py-3 text-center">Opened</th>
                    <th className="px-3 py-3 text-center">Clicked</th>
                    <th className="px-3 py-3 text-center">Signups</th>
                    <th className="px-3 py-3 text-center">Paid</th>
                    <th className="px-4 py-3 text-center">Conversion</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hier-border">
                  {campaigns.map((campaign) => (
                    <tr
                      key={campaign.id}
                      className={
                        selectedCampaignId === campaign.id
                          ? "bg-hier-soft"
                          : "bg-white"
                      }
                    >
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => setSelectedCampaignId(campaign.id)}
                          className="text-left"
                        >
                          <Link
                            href={`/staff/customer-reports/email-campaigns/${campaign.id}`}
                            className="font-semibold text-hier-text hover:text-hier-primary"
                            onClick={(event) => event.stopPropagation()}
                          >
                            {campaign.name}
                          </Link>
                          <span className="mt-1 block text-xs text-hier-muted">
                            {campaign.slug} - {formatDate(campaign.sent_at)}
                          </span>
                        </button>
                      </td>
                      <td className="max-w-[260px] truncate px-4 py-3 text-hier-text">
                        {campaign.subject || "-"}
                      </td>
                      <td className="px-3 py-3 text-center text-hier-text">{campaign.lead_count ?? campaign.sent_count}</td>
                      <td className="px-3 py-3 text-center text-hier-text">{campaign.emails_sent ?? campaign.sent_count}</td>
                      <td className="px-3 py-3 text-center text-hier-text">{campaign.delivered_count}</td>
                      <td className="px-3 py-3 text-center text-hier-text">{campaign.open_count}</td>
                      <td className="px-3 py-3 text-center text-hier-text">{campaign.click_count}</td>
                      <td className="px-3 py-3 text-center font-semibold text-hier-text">
                        {campaign.business_signups_attributed}
                      </td>
                      <td className="px-3 py-3 text-center font-semibold text-hier-text">
                        {campaign.paid_businesses ?? 0}
                      </td>
                      <td className="px-4 py-3 text-center font-semibold text-hier-text">
                        {formatPercent(campaign.conversion_rate)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="rounded-[24px] border border-hier-border bg-hier-panel p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-hier-text">
                    {campaignDetail?.name || "Campaign detail"}
                  </h3>
                  <p className="mt-1 text-xs text-hier-muted">
                    Recipient engagement, clicked UTM content and linked business accounts.
                  </p>
                </div>
                {campaignDetail ? (
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-semibold text-hier-text">
                      <MousePointerClick className="h-3.5 w-3.5 text-hier-primary" />
                      {campaignDetail.click_count} clicks
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-semibold text-hier-text">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      {campaignDetail.business_signups_attributed} signups
                    </span>
                  </div>
                ) : null}
              </div>

              {campaignFunnel ? (
                <div className="mt-4 grid gap-3 md:grid-cols-3 xl:grid-cols-6">
                  {[
                    ["Leads Imported", campaignFunnel.leads_imported, "#373643"],
                    ["Delivered", campaignFunnel.emails_delivered, "#91A6EB"],
                    ["Opened", campaignFunnel.emails_opened, "#5D894A"],
                    ["Clicked", campaignFunnel.emails_clicked, "#E18851"],
                    ["Signed Up", campaignFunnel.businesses_signed_up, "#373643"],
                    ["Paid", campaignFunnel.paid_businesses, "#5D894A"],
                  ].map(([label, value, color]) => (
                    <div key={label} className="rounded-[18px] bg-white p-3">
                      <p className="text-xs font-medium text-hier-muted">{label}</p>
                      <p className="mt-1 text-2xl font-semibold" style={{ color: String(color) }}>
                        {value}
                      </p>
                    </div>
                  ))}
                </div>
              ) : null}

              {campaignFunnel ? (
                <div className="mt-3 grid gap-3 md:grid-cols-4">
                  {[
                    ["Open Rate", campaignFunnel.open_rate],
                    ["CTR", campaignFunnel.ctr],
                    ["Signup Rate", campaignFunnel.signup_rate],
                    ["Paid Conversion", campaignFunnel.paid_conversion_rate],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-[18px] border border-hier-border bg-white p-3">
                      <p className="text-xs font-medium text-hier-muted">{label}</p>
                      <p className="mt-1 text-lg font-semibold text-hier-text">
                        {formatPercent(Number(value))}
                      </p>
                    </div>
                  ))}
                </div>
              ) : null}

              <label className="mt-4 block max-w-md">
                <span className="sr-only">Search campaign recipients</span>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-hier-muted" />
                  <input
                    value={campaignSearch}
                    onChange={(event) => setCampaignSearch(event.target.value)}
                    placeholder="Search email, company, city or status"
                    className="h-11 w-full rounded-[18px] border border-hier-border bg-white pl-11 pr-4 text-sm text-hier-text outline-none transition focus:border-hier-primary"
                  />
                </div>
              </label>

              {campaignDetailLoading ? (
                <div className="mt-4 rounded-[18px] border border-hier-border bg-white p-4 text-sm text-hier-muted">
                  Loading campaign detail...
                </div>
              ) : filteredCampaignRecipients.length ? (
                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-[1040px] w-full text-left text-sm">
                    <thead className="bg-white text-xs uppercase tracking-[0.12em] text-hier-muted">
                      <tr>
                        <th className="px-4 py-3">Recipient</th>
                        <th className="px-4 py-3">Company</th>
                        <th className="px-4 py-3">Job Title</th>
                        <th className="px-4 py-3">City</th>
                        <th className="px-3 py-3 text-center">Delivered</th>
                        <th className="px-3 py-3 text-center">Opened</th>
                        <th className="px-3 py-3 text-center">Clicked</th>
                        <th className="px-4 py-3">UTM content</th>
                        <th className="px-4 py-3">Signup</th>
                        <th className="px-4 py-3">Business account</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-hier-border bg-white">
                      {filteredCampaignRecipients.map((recipient) => (
                        <tr key={recipient.id}>
                          <td className="px-4 py-3">
                            <p className="font-semibold text-hier-text">{recipient.email}</p>
                            <p className="mt-1 text-xs text-hier-muted">
                              {[recipient.first_name, recipient.last_name].filter(Boolean).join(" ") ||
                                "No name"}
                            </p>
                          </td>
                          <td className="px-4 py-3 text-hier-text">
                            {recipient.company_name || "-"}
                          </td>
                          <td className="px-4 py-3 text-hier-text">
                            {recipient.job_title || "-"}
                          </td>
                          <td className="px-4 py-3 text-hier-text">
                            {recipient.city || "-"}
                          </td>
                          <td className="px-3 py-3 text-center">{statusText(recipient.delivered_at)}</td>
                          <td className="px-3 py-3 text-center">{statusText(recipient.opened_at)}</td>
                          <td className="px-3 py-3 text-center">{statusText(recipient.clicked_at)}</td>
                          <td className="px-4 py-3 text-hier-text">
                            {recipient.utm_content_clicked || "-"}
                          </td>
                          <td className="px-4 py-3">
                            {recipient.signup_status === "converted" ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Converted
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-semibold text-hier-muted">
                                <XCircle className="h-3.5 w-3.5" />
                                Not yet
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {recipient.linked_business_account?.user_id ? (
                              <Link
                                href={`/staff/accounts/${recipient.linked_business_account.user_id}`}
                                className="font-semibold text-hier-primary hover:underline"
                              >
                                {recipient.linked_business_account.name ||
                                  recipient.linked_business_account.email ||
                                  `Account #${recipient.linked_business_account.user_id}`}
                              </Link>
                            ) : (
                              <span className="text-hier-muted">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="mt-4 rounded-[18px] border border-dashed border-hier-border bg-white p-4 text-sm text-hier-muted">
                  No leads match this campaign view.
                </p>
              )}
            </div>
          </div>
        ) : (
          <p className="mt-4 rounded-[20px] border border-dashed border-hier-border bg-hier-panel p-4 text-sm text-hier-muted">
            No email campaign data yet. Once the Resend campaign is sent, delivery, click and signup attribution will appear here.
          </p>
        )}
      </section>

      <section className="rounded-[32px] border border-hier-border bg-white p-5 shadow-card sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-hier-soft p-2 text-hier-primary">
              <PhoneCall className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-hier-text">Call analytics</h2>
              <p className="mt-1 text-sm text-hier-muted">
                Call outcomes by adviser. Switch between daily, weekly, monthly and yearly views.
              </p>
            </div>
          </div>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-hier-text">Period</span>
            <select
              value={callPeriod}
              onChange={(event) => setCallPeriod(event.target.value as CallAnalyticsPeriod)}
              className="h-11 w-44 rounded-[18px] border border-hier-border bg-hier-panel px-4 text-sm text-hier-text outline-none transition focus:border-hier-primary focus:bg-white"
            >
              {CALL_PERIOD_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {callError ? (
          <div className="mt-4 flex items-start gap-3 rounded-[20px] border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{callError}</p>
          </div>
        ) : null}

        {callLoading ? (
          <div className="mt-4 rounded-[20px] border border-hier-border bg-hier-panel p-4 text-sm text-hier-muted">
            Loading call analytics...
          </div>
        ) : callAnalytics && callAnalytics.totals.total > 0 ? (
          <div className="mt-5 overflow-x-auto">
            {(() => {
              const columns = [...callAnalytics.outcomes, ...callAnalytics.extra_buckets];
              return (
                <table className="min-w-[820px] w-full text-left text-sm">
                  <thead className="bg-hier-panel text-xs uppercase tracking-[0.12em] text-hier-muted">
                    <tr>
                      <th className="px-4 py-3">Adviser</th>
                      {columns.map((column) => (
                        <th key={column} className="px-3 py-3 text-center">{column}</th>
                      ))}
                      <th className="px-4 py-3 text-center">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hier-border">
                    {callAnalytics.advisers.map((adviser) => (
                      <tr key={adviser.staff_user_id ?? "unattributed"}>
                        <td className="px-4 py-3">
                          <p className="font-semibold text-hier-text">{adviser.name}</p>
                          {adviser.email ? (
                            <p className="mt-0.5 truncate text-xs text-hier-muted">{adviser.email}</p>
                          ) : null}
                        </td>
                        {columns.map((column) => (
                          <td key={column} className="px-3 py-3 text-center text-hier-text">
                            {adviser.outcomes[column] ?? 0}
                          </td>
                        ))}
                        <td className="px-4 py-3 text-center font-semibold text-hier-text">
                          {adviser.total}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-hier-border bg-hier-panel font-semibold text-hier-text">
                      <td className="px-4 py-3">All advisers</td>
                      {columns.map((column) => (
                        <td key={column} className="px-3 py-3 text-center">
                          {callAnalytics.totals.outcomes[column] ?? 0}
                        </td>
                      ))}
                      <td className="px-4 py-3 text-center">{callAnalytics.totals.total}</td>
                    </tr>
                  </tfoot>
                </table>
              );
            })()}
          </div>
        ) : (
          <p className="mt-4 rounded-[20px] border border-dashed border-hier-border bg-hier-panel p-4 text-sm text-hier-muted">
            No calls recorded for this period.
          </p>
        )}
      </section>
    </div>
  );
}
