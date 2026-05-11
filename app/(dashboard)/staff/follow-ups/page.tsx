"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, CalendarClock, Check, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import {
  fetchStaffFollowUps,
  updateStaffFollowUp,
  type StaffFollowUp,
} from "@/lib/staff-crm";

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  try {
    return new Intl.DateTimeFormat("en-GB", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return "-";
  }
}

export default function StaffFollowUpsPage() {
  const [items, setItems] = useState<StaffFollowUp[]>([]);
  const [status, setStatus] = useState("scheduled");
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchStaffFollowUps({ status });
      setItems(response.items || []);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not load follow-ups.");
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  const grouped = useMemo(() => {
    const now = Date.now();
    return {
      overdue: items.filter((item) => item.status === "scheduled" && item.due_at && new Date(item.due_at).getTime() < now),
      upcoming: items.filter((item) => item.status !== "completed" && (!item.due_at || new Date(item.due_at).getTime() >= now)),
      completed: items.filter((item) => item.status === "completed"),
    };
  }, [items]);

  async function completeFollowUp(item: StaffFollowUp) {
    setSavingId(item.id);
    setError(null);
    try {
      const response = await updateStaffFollowUp(item.id, { status: "completed" });
      setItems((current) => current.map((entry) => (entry.id === item.id ? response.follow_up : entry)));
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not complete follow-up.");
    } finally {
      setSavingId(null);
    }
  }

  function FollowUpCard({ item }: { item: StaffFollowUp }) {
    const href =
      item.entity_type === "account"
        ? `/staff/accounts/${item.entity_id}`
        : item.entity_type === "lead"
          ? "/staff/leads"
          : "#";

    return (
      <div className="rounded-[24px] border border-hier-border bg-white p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-semibold text-hier-text">{item.title}</p>
            <p className="mt-1 text-sm text-hier-muted">{formatDateTime(item.due_at)}</p>
          </div>
          {item.status !== "completed" ? (
            <button
              type="button"
              onClick={() => void completeFollowUp(item)}
              disabled={savingId === item.id}
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-hier-primary text-white disabled:opacity-50"
              aria-label="Complete follow-up"
            >
              {savingId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            </button>
          ) : null}
        </div>
        {item.note ? <p className="mt-3 text-sm text-hier-muted">{item.note}</p> : null}
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-hier-muted">
          <span className="rounded-full bg-hier-panel px-3 py-1">{item.entity_type}</span>
          <span className="rounded-full bg-hier-panel px-3 py-1">{item.status}</span>
          <Link href={href} className="rounded-full bg-hier-panel px-3 py-1 text-hier-primary">
            Open
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Hier staff"
        title="Follow-ups"
        description="Scheduled callbacks and support reminders for leads and customer accounts."
      />

      {error ? (
        <div className="flex items-start gap-3 rounded-[24px] border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{error}</p>
        </div>
      ) : null}

      <section className="flex flex-wrap gap-2 rounded-[28px] border border-hier-border bg-white p-3 shadow-card">
        {["scheduled", "completed", "cancelled", "all"].map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setStatus(value)}
            className={`rounded-[18px] px-4 py-2 text-sm font-semibold capitalize ${
              status === value ? "bg-hier-primary text-white" : "bg-hier-panel text-hier-muted"
            }`}
          >
            {value}
          </button>
        ))}
      </section>

      {loading ? (
        <div className="rounded-[28px] border border-hier-border bg-white p-8 text-sm text-hier-muted">
          Loading follow-ups...
        </div>
      ) : (
        <section className="grid gap-6 xl:grid-cols-2">
          <div className="space-y-3">
            <h2 className="flex items-center gap-2 text-base font-semibold text-hier-text">
              <CalendarClock className="h-4 w-4" />
              Overdue
            </h2>
            {grouped.overdue.length ? grouped.overdue.map((item) => <FollowUpCard key={item.id} item={item} />) : (
              <p className="rounded-[24px] border border-hier-border bg-white p-5 text-sm text-hier-muted">No overdue follow-ups.</p>
            )}
          </div>

          <div className="space-y-3">
            <h2 className="flex items-center gap-2 text-base font-semibold text-hier-text">
              <CalendarClock className="h-4 w-4" />
              Upcoming
            </h2>
            {grouped.upcoming.length ? grouped.upcoming.map((item) => <FollowUpCard key={item.id} item={item} />) : (
              <p className="rounded-[24px] border border-hier-border bg-white p-5 text-sm text-hier-muted">No upcoming follow-ups.</p>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
