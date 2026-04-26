"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Download,
  Loader2,
  Mail,
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

  async function load() {
    setLoading(true);
    try {
      const res = await fetchStaffWaitlist();
      setItems(res.items || []);
    } catch (e) {
      console.error("Failed to load waitlist", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const exportUrl = getStaffWaitlistExportUrl();

  return (
    <div className="space-y-8">
      {/* Back */}
      <Link
        href="/staff"
        className="inline-flex items-center gap-2 text-sm font-medium text-hier-muted hover:text-hier-text"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Staff CRM
      </Link>

      {/* Header */}
      <PageHeader
        eyebrow="Growth"
        title="Waitlist"
        description="View and export all users who have signed up to the Hier waitlist."
        action={
          <a
            href={exportUrl}
            className="inline-flex items-center gap-2 rounded-[20px] bg-hier-primary px-4 py-2 text-sm font-semibold text-white shadow-card hover:opacity-90"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </a>
        }
      />

      {/* Stats */}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-[28px] border border-hier-border bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm text-hier-muted">Total signups</p>
            <Users className="h-4 w-4 text-hier-primary" />
          </div>
          <p className="mt-3 text-3xl font-semibold text-hier-text">
            {items.length}
          </p>
        </div>

        <div className="rounded-[28px] border border-hier-border bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm text-hier-muted">Latest signup</p>
            <Mail className="h-4 w-4 text-hier-primary" />
          </div>
          <p className="mt-3 text-sm font-medium text-hier-text">
            {items[0]?.email || "—"}
          </p>
        </div>
      </section>

      {/* Table */}
      <section className="rounded-[32px] border border-hier-border bg-white shadow-card overflow-hidden">
        {loading ? (
          <div className="flex min-h-[240px] items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-hier-primary" />
          </div>
        ) : items.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-hier-panel text-left text-xs uppercase tracking-wide text-hier-muted">
                <tr>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">Source</th>
                  <th className="px-6 py-4">Date</th>
                </tr>
              </thead>

              <tbody>
                {items.map((item) => (
                  <tr
                    key={item.id}
                    className="border-t border-hier-border hover:bg-hier-soft"
                  >
                    <td className="px-6 py-4 font-medium text-hier-text">
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
          <div className="p-10 text-center text-hier-muted">
            No waitlist signups yet.
          </div>
        )}
      </section>
    </div>
  );
}