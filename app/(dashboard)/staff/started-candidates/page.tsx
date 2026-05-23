"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, Banknote, CheckCircle2, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import {
  chargeStaffCandidateFee,
  fetchStaffStartedCandidates,
  type StaffStartedCandidate,
} from "@/lib/staff-crm";

function formatDate(value?: string | null) {
  if (!value) return "-";
  try {
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(value));
  } catch {
    return "-";
  }
}

function formatMoney(value?: number | null, currency = "GBP") {
  if (typeof value !== "number" || Number.isNaN(value)) return "-";
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

export default function StaffStartedCandidatesPage() {
  const [tab, setTab] = useState<"pending_fee" | "completed">("pending_fee");
  const [items, setItems] = useState<StaffStartedCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [chargingId, setChargingId] = useState<number | null>(null);

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetchStaffStartedCandidates(tab);
      setItems(response.items || []);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not load started candidates."
      );
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  const summary = useMemo(() => {
    const totalFee = items.reduce((sum, item) => sum + Number(item.fee_amount || 0), 0);
    return {
      count: items.length,
      totalFee,
    };
  }, [items]);

  async function handleChargeCandidateFee(item: StaffStartedCandidate) {
    setChargingId(item.id);
    setError(null);
    setMessage(null);

    try {
      const response = await chargeStaffCandidateFee(item.id);
      setItems((current) => current.filter((candidate) => candidate.id !== item.id));
      setMessage(
        `Candidate fee queued for ${response.started_candidate.candidate_name}'s next invoice.`
      );
      if (tab === "completed") {
        await loadItems();
      }
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not queue the candidate fee."
      );
    } finally {
      setChargingId(null);
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Hier Staff"
        title="Started candidates"
        description="Track completed starts and queue candidate fees onto customer invoices."
      />

      {error ? (
        <div className="flex items-start gap-3 rounded-[24px] border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">Started candidates unavailable</p>
            <p className="mt-1">{error}</p>
          </div>
        </div>
      ) : null}

      {message ? (
        <div className="flex items-start gap-3 rounded-[24px] border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
          <p>{message}</p>
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-[28px] border border-hier-border bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-hier-muted">
              {tab === "pending_fee" ? "Pending fees" : "Completed fees"}
            </p>
            <div className="rounded-2xl bg-hier-soft p-2 text-hier-primary">
              <Banknote className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-4 text-3xl font-semibold text-hier-text">{summary.count}</p>
        </div>

        <div className="rounded-[28px] border border-hier-border bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-hier-muted">Candidate fee total</p>
          <p className="mt-4 text-3xl font-semibold text-hier-text">
            {formatMoney(summary.totalFee)}
          </p>
        </div>
      </section>

      <section className="space-y-4 rounded-[32px] border border-hier-border bg-white p-5 shadow-card sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-hier-text">Candidates</h2>
            <p className="mt-1 text-sm text-hier-muted">
              Switch between candidate fees awaiting action and the completed pot.
            </p>
          </div>
          <div className="flex rounded-[18px] border border-hier-border bg-hier-panel p-1">
            {[
              ["pending_fee", "Pending fees"],
              ["completed", "Completed"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setTab(value as "pending_fee" | "completed")}
                className={`rounded-[14px] px-4 py-2 text-sm font-semibold ${
                  tab === value ? "bg-white text-hier-text shadow-sm" : "text-hier-muted"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-[240px] items-center justify-center rounded-[24px] border border-hier-border bg-hier-panel">
            <Loader2 className="h-6 w-6 animate-spin text-hier-primary" />
          </div>
        ) : items.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-[0.16em] text-hier-muted">
                <tr>
                  <th className="py-3 pr-4">Candidate</th>
                  <th className="py-3 pr-4">Business</th>
                  <th className="py-3 pr-4">Job</th>
                  <th className="py-3 pr-4">Start</th>
                  <th className="py-3 pr-4">Salary</th>
                  <th className="py-3 pr-4">Candidate fee</th>
                  <th className="py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hier-border">
                {items.map((item) => (
                  <tr key={item.id}>
                    <td className="py-4 pr-4">
                      <p className="font-semibold text-hier-text">{item.candidate_name}</p>
                      <p className="text-xs text-hier-muted">{item.candidate?.email || "No email"}</p>
                    </td>
                    <td className="py-4 pr-4">
                      <Link href={`/staff/accounts/${item.business?.user_id || ""}`} className="font-semibold text-hier-primary">
                        {item.employer_name}
                      </Link>
                      <p className="text-xs text-hier-muted">{item.business?.billing_email || item.business?.email || "No billing email"}</p>
                    </td>
                    <td className="py-4 pr-4 text-hier-text">{item.job_title}</td>
                    <td className="py-4 pr-4 text-hier-muted">{formatDate(item.start_date)}</td>
                    <td className="py-4 pr-4 text-hier-text">{formatMoney(item.salary, item.currency || "GBP")}</td>
                    <td className="py-4 pr-4 font-semibold text-hier-text">
                      {formatMoney(item.fee_amount, item.currency || "GBP")}
                    </td>
                    <td className="py-4 text-right">
                      {tab === "pending_fee" ? (
                        <button
                          type="button"
                          disabled={chargingId === item.id}
                          onClick={() => void handleChargeCandidateFee(item)}
                          className="inline-flex h-10 items-center justify-center rounded-[16px] bg-hier-primary px-4 text-xs font-semibold text-white disabled:opacity-60"
                        >
                          {chargingId === item.id ? "Queuing..." : "Charge fee"}
                        </button>
                      ) : (
                        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                          Complete
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-[24px] border border-dashed border-hier-border bg-hier-panel p-6 text-sm text-hier-muted">
            No started candidates in this tab yet.
          </div>
        )}
      </section>
    </div>
  );
}
