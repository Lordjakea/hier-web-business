"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AlertCircle, ArrowLeft, CheckCircle2, Megaphone, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import {
  fetchFilteredStaffCrmReports,
  fetchStaffCrmReports,
  getMarketingOptInsCsvUrl,
  type StaffCrmReportResponse,
} from "@/lib/staff-crm";
import { getAuthToken } from "@/lib/auth";

export default function StaffCustomerReportsPage() {
  const [reports, setReports] = useState<StaffCrmReportResponse | null>(null);
  const [reportFilter, setReportFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
            onClick={() => void loadReports()}
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
    </div>
  );
}
