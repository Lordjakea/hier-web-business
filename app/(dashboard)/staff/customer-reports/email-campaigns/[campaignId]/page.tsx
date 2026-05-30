"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Search,
  XCircle,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import {
  fetchStaffMarketingCampaign,
  syncStaffMarketingCampaignMetrics,
  type StaffMarketingCampaignDetail,
} from "@/lib/staff-crm";

function formatPercent(value?: number | null) {
  if (typeof value !== "number" || Number.isNaN(value)) return "0%";
  const percent = value > 1 ? value : value * 100;
  return `${Math.round(percent)}%`;
}

function statusText(value?: string | null) {
  return value ? "Yes" : "No";
}

export default function EmailCampaignDetailPage() {
  const params = useParams<{ campaignId: string }>();
  const campaignId = params.campaignId;
  const [campaign, setCampaign] = useState<StaffMarketingCampaignDetail | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCampaign = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetchStaffMarketingCampaign(campaignId);
      setCampaign(response.campaign);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not load this campaign."
      );
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    void loadCampaign();
  }, [loadCampaign]);

  async function syncCampaign() {
    setSyncing(true);
    setError(null);

    try {
      await syncStaffMarketingCampaignMetrics(campaignId);
      await loadCampaign();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not sync campaign metrics."
      );
    } finally {
      setSyncing(false);
    }
  }

  const filteredRecipients = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) return campaign?.recipients || [];

    return (campaign?.recipients || []).filter((recipient) =>
      [
        recipient.email,
        recipient.first_name,
        recipient.last_name,
        recipient.company_name,
        recipient.job_title,
        recipient.city,
        recipient.signup_status,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(search))
    );
  }, [campaign?.recipients, query]);

  const funnel = campaign?.funnel;

  return (
    <div className="space-y-8">
      <Link
        href="/staff/customer-reports"
        className="inline-flex items-center gap-2 text-sm font-medium text-hier-muted hover:text-hier-text"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Customer Reporting
      </Link>

      <PageHeader
        eyebrow="Email Campaigns"
        title={campaign?.name || "Campaign detail"}
        description={campaign?.slug || "Lead engagement, signup attribution and paid conversion."}
        action={
          <button
            type="button"
            disabled={syncing}
            onClick={() => void syncCampaign()}
            className="inline-flex items-center gap-2 rounded-[20px] border border-hier-border bg-white px-4 py-2 text-sm font-semibold text-hier-text shadow-sm hover:bg-hier-soft disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
            Sync Resend
          </button>
        }
      />

      {error ? (
        <div className="flex items-start gap-3 rounded-[24px] border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <p>{error}</p>
        </div>
      ) : null}

      {loading ? (
        <div className="flex min-h-[280px] items-center justify-center rounded-[32px] border border-hier-border bg-white">
          <Loader2 className="h-6 w-6 animate-spin text-hier-primary" />
        </div>
      ) : campaign ? (
        <>
          <section className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
            {[
              ["Leads", campaign.funnel?.leads_imported ?? campaign.lead_count ?? 0, "#373643"],
              ["Delivered", campaign.delivered_count, "#91A6EB"],
              ["Opened", campaign.open_count, "#5D894A"],
              ["Clicked", campaign.click_count, "#E18851"],
              ["Signed Up", campaign.business_signups_attributed, "#373643"],
              ["Paid", campaign.paid_businesses ?? 0, "#5D894A"],
            ].map(([label, value, color]) => (
              <div key={label} className="rounded-[28px] border border-hier-border bg-white p-5 shadow-sm">
                <p className="text-sm font-medium text-hier-muted">{label}</p>
                <p className="mt-3 text-3xl font-semibold" style={{ color: String(color) }}>
                  {value}
                </p>
              </div>
            ))}
          </section>

          {funnel ? (
            <section className="grid gap-4 md:grid-cols-4">
              {[
                ["Open Rate", funnel.open_rate],
                ["CTR", funnel.ctr],
                ["Signup Rate", funnel.signup_rate],
                ["Paid Conversion", funnel.paid_conversion_rate],
              ].map(([label, value]) => (
                <div key={label} className="rounded-[24px] border border-hier-border bg-white p-5 shadow-sm">
                  <p className="text-sm font-medium text-hier-muted">{label}</p>
                  <p className="mt-2 text-2xl font-semibold text-hier-text">
                    {formatPercent(Number(value))}
                  </p>
                </div>
              ))}
            </section>
          ) : null}

          <section className="rounded-[32px] border border-hier-border bg-white p-5 shadow-card sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold text-hier-text">Campaign leads</h2>
                <p className="mt-1 text-sm text-hier-muted">
                  {filteredRecipients.length} of {campaign.recipients.length} leads shown.
                </p>
              </div>
              <label className="block w-full max-w-md">
                <span className="sr-only">Search campaign leads</span>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-hier-muted" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search email, company, city or status"
                    className="h-11 w-full rounded-[18px] border border-hier-border bg-hier-panel pl-11 pr-4 text-sm text-hier-text outline-none transition focus:border-hier-primary focus:bg-white"
                  />
                </div>
              </label>
            </div>

            <div className="mt-5 overflow-x-auto rounded-[24px] border border-hier-border">
              <table className="min-w-[1120px] w-full text-left text-sm">
                <thead className="bg-hier-panel text-xs uppercase tracking-[0.12em] text-hier-muted">
                  <tr>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Company</th>
                    <th className="px-4 py-3">Job Title</th>
                    <th className="px-4 py-3">City</th>
                    <th className="px-3 py-3 text-center">Delivered</th>
                    <th className="px-3 py-3 text-center">Opened</th>
                    <th className="px-3 py-3 text-center">Clicked</th>
                    <th className="px-4 py-3">Signed Up</th>
                    <th className="px-4 py-3">Business Account</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hier-border bg-white">
                  {filteredRecipients.map((recipient) => (
                    <tr key={`${recipient.lead_id || recipient.id}-${recipient.email}`}>
                      <td className="px-4 py-3 font-semibold text-hier-text">{recipient.email}</td>
                      <td className="px-4 py-3 text-hier-text">
                        {[recipient.first_name, recipient.last_name].filter(Boolean).join(" ") || "-"}
                      </td>
                      <td className="px-4 py-3 text-hier-text">{recipient.company_name || "-"}</td>
                      <td className="px-4 py-3 text-hier-text">{recipient.job_title || "-"}</td>
                      <td className="px-4 py-3 text-hier-text">{recipient.city || "-"}</td>
                      <td className="px-3 py-3 text-center">{statusText(recipient.delivered_at)}</td>
                      <td className="px-3 py-3 text-center">{statusText(recipient.opened_at)}</td>
                      <td className="px-3 py-3 text-center">{statusText(recipient.clicked_at)}</td>
                      <td className="px-4 py-3">
                        {recipient.signup_status === "converted" ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-[#5D894A]">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Converted Business
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-hier-panel px-3 py-1 text-xs font-semibold text-hier-muted">
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
                  {!filteredRecipients.length ? (
                    <tr>
                      <td colSpan={10} className="px-4 py-10 text-center text-sm text-hier-muted">
                        No leads match this campaign view.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}

