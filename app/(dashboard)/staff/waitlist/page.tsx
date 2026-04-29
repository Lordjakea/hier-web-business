"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  Download,
  Loader2,
  Mail,
  RefreshCw,
  Users,
} from "lucide-react";

import { PageHeader } from "@/components/ui/page-header";
import {
  fetchStaffWaitlist,
  getStaffWaitlistExportUrl,
  type StaffWaitlistEmail,
} from "@/lib/staff-crm";

function formatDate(value?: string | null) {
  if (!value) return "—";

  try {
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return "—";
  }
}

export default function StaffWaitlistPage() {
  const [items, setItems] = useState<StaffWaitlistEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load(isRefresh = false) {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError(null);

    try {
      const res = await fetchStaffWaitlist();
      setItems(res.items || []);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not load the waitlist."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const exportUrl = getStaffWaitlistExportUrl();
  const latestSignup = items[0];

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
        eyebrow="Growth"
        title="Waitlist"
        description="View and export everyone who has signed up to the Hier waitlist."
        action={
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void load(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-[20px] border border-hier-border bg-white px-4 py-2 text-sm font-semibold text-hier-text shadow-sm hover:bg-hier-soft disabled:cursor-not-allowed disabled:opacity-60"
            >
              {refreshing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Refresh
            </button>

            <a
              href={exportUrl}
              className="inline-flex items-center gap-2 rounded-[20px] bg-hier-primary px-4 py-2 text-sm font-semibold text-white shadow-card hover:opacity-90"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </a>
          </div>
        }
      />

      {error ? (
        <div className="flex items-start gap-3 rounded-[24px] border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">Could not load waitlist</p>
            <p className="mt-1">{error}</p>
          </div>
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-[28px] border border-hier-border bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-hier-muted">Total signups</p>
            <Users className="h-4 w-4 text-hier-primary" />
          </div>

          <p className="mt-3 text-3xl font-semibold text-hier-text">
            {items.length}
          </p>
        </div>

        <div className="rounded-[28px] border border-hier-border bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-hier-muted">Latest signup</p>
            <Mail className="h-4 w-4 text-hier-primary" />
          </div>

          <p className="mt-3 truncate text-sm font-semibold text-hier-text">
            {latestSignup?.email || "—"}
          </p>

          <p className="mt-1 text-xs text-hier-muted">
            {formatDate(latestSignup?.created_at)}
          </p>
        </div>
      </section>

      <section className="overflow-hidden rounded-[32px] border border-hier-border bg-white shadow-card">
        {loading ? (
          <div className="flex min-h-[260px] items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-hier-primary" />
          </div>
        ) : items.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-hier-panel text-left text-xs uppercase tracking-[0.18em] text-hier-muted">
                <tr>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">Source</th>
                  <th className="px-6 py-4">Date joined</th>
                </tr>
              </thead>

              <tbody>
                {items.map((item) => (
                  <tr
                    key={item.id}
                    className="border-t border-hier-border transition hover:bg-hier-soft"
                  >
                    <td className="px-6 py-4 font-semibold text-hier-text">
                      {item.email}
                    </td>

                    <td className="px-6 py-4 text-hier-muted">
                      {item.source || "—"}
                    </td>

                    <td className="px-6 py-4 text-hier-muted">
                      {formatDate(item.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-10 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-hier-soft text-hier-primary">
              <Mail className="h-5 w-5" />
            </div>

            <p className="mt-4 text-base font-semibold text-hier-text">
              No waitlist signups yet
            </p>

            <p className="mt-2 text-sm text-hier-muted">
              New registrations will appear here once the public waitlist form
              is connected and submissions are saved.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}