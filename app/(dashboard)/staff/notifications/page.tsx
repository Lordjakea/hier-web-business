"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AlertCircle, Bell, Check, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import {
  fetchStaffNotifications,
  updateStaffNotification,
  type StaffNotification,
} from "@/lib/staff-crm";

function formatDate(value?: string | null) {
  if (!value) return "-";
  try {
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return "-";
  }
}

export default function StaffNotificationsPage() {
  const [items, setItems] = useState<StaffNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadItems = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchStaffNotifications();
      setItems(response.items || []);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not load notifications.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  async function markRead(item: StaffNotification) {
    setSavingId(item.id);
    setError(null);
    try {
      const response = await updateStaffNotification(item.id, true);
      setItems((current) =>
        current.map((entry) => (entry.id === item.id ? response.notification : entry))
      );
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not update notification.");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Hier staff"
        title="Notifications"
        description="Mentions, assigned cases and follow-up alerts."
      />

      {error ? (
        <div className="flex items-start gap-3 rounded-[24px] border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{error}</p>
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-[28px] border border-hier-border bg-white p-8 text-sm text-hier-muted">
          <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
          Loading notifications...
        </div>
      ) : items.length ? (
        <section className="space-y-3">
          {items.map((item) => {
            const href = item.meta?.href || "#";
            return (
              <div
                key={item.id}
                className={`rounded-[24px] border p-5 shadow-sm ${
                  item.is_read ? "border-hier-border bg-white" : "border-hier-primary bg-hier-soft"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-hier-text">{item.title}</p>
                    {item.body ? <p className="mt-2 text-sm text-hier-muted">{item.body}</p> : null}
                    <p className="mt-3 text-xs text-hier-muted">{formatDate(item.created_at)}</p>
                  </div>
                  {!item.is_read ? (
                    <button
                      type="button"
                      onClick={() => void markRead(item)}
                      disabled={savingId === item.id}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-hier-primary disabled:opacity-50"
                      aria-label="Mark read"
                    >
                      {savingId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    </button>
                  ) : null}
                </div>
                {href !== "#" ? (
                  <Link href={href} className="mt-4 inline-flex rounded-full bg-white px-4 py-2 text-sm font-semibold text-hier-primary">
                    Open
                  </Link>
                ) : null}
              </div>
            );
          })}
        </section>
      ) : (
        <div className="rounded-[28px] border border-hier-border bg-white p-8 text-sm text-hier-muted">
          <Bell className="mb-3 h-5 w-5 text-hier-primary" />
          No notifications yet.
        </div>
      )}
    </div>
  );
}
