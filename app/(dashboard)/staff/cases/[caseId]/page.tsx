"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AlertCircle, ArrowLeft, Check, Loader2, MessageSquarePlus } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import {
  createStaffCaseNote,
  fetchStaffAssignees,
  fetchStaffCase,
  updateStaffCase,
  type StaffCase,
  type StaffTeamUser,
} from "@/lib/staff-crm";

function formatDate(value?: string | null) {
  if (!value) return "-";
  try {
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return "-";
  }
}

export default function StaffCaseDetailPage() {
  const params = useParams<{ caseId: string }>();
  const caseId = params?.caseId;
  const [item, setItem] = useState<StaffCase | null>(null);
  const [staffUsers, setStaffUsers] = useState<StaffTeamUser[]>([]);
  const [note, setNote] = useState("");
  const [mentionedStaffUserIds, setMentionedStaffUserIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCase = useCallback(async () => {
    if (!caseId) return;
    setLoading(true);
    setError(null);
    try {
      const [caseResponse, staffResponse] = await Promise.all([
        fetchStaffCase(caseId),
        fetchStaffAssignees(),
      ]);
      setItem(caseResponse.case);
      setStaffUsers(staffResponse.staff || []);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not load case.");
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    void loadCase();
  }, [loadCase]);

  async function updateCase(payload: Partial<Pick<StaffCase, "status" | "owner_staff_user_id">>) {
    if (!item) return;
    setSaving(true);
    setError(null);
    try {
      const response = await updateStaffCase(item.id, payload);
      setItem(response.case);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not update case.");
    } finally {
      setSaving(false);
    }
  }

  async function addNote(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!item || !note.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const response = await createStaffCaseNote(item.id, note.trim(), mentionedStaffUserIds);
      setItem((current) =>
        current ? { ...current, thread: [...(current.thread || []), response.note] } : current
      );
      setNote("");
      setMentionedStaffUserIds([]);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not add case note.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-[28px] border border-hier-border bg-white p-8 text-sm text-hier-muted">
        <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
        Loading case...
      </div>
    );
  }

  if (!item) {
    return <div className="rounded-[28px] border border-red-200 bg-red-50 p-6 text-sm text-red-700">{error || "Case not found."}</div>;
  }

  return (
    <div className="space-y-8">
      <Link href="/staff/cases" className="inline-flex items-center gap-2 text-sm font-medium text-hier-muted hover:text-hier-text">
        <ArrowLeft className="h-4 w-4" />
        Back to cases
      </Link>

      <PageHeader
        eyebrow={`Case #${item.id}`}
        title={item.title}
        description={item.account_name || `Account #${item.account_user_id}`}
      />

      {error ? (
        <div className="flex items-start gap-3 rounded-[24px] border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{error}</p>
        </div>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          {(item.thread || []).map((entry) => (
            <div key={entry.id} className="rounded-[24px] border border-hier-border bg-white p-5 shadow-sm">
              <p className="whitespace-pre-wrap text-sm leading-6 text-hier-text">{entry.note}</p>
              <p className="mt-3 text-xs text-hier-muted">
                {entry.author_name || entry.author_email || "Staff"} / {formatDate(entry.created_at)}
              </p>
            </div>
          ))}

          <form onSubmit={addNote} className="rounded-[28px] border border-hier-border bg-white p-5 shadow-card">
            <h2 className="flex items-center gap-2 text-base font-semibold text-hier-text">
              <MessageSquarePlus className="h-4 w-4" />
              Add case note
            </h2>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Add investigation update..."
              rows={5}
              className="mt-4 w-full resize-none rounded-[18px] border border-hier-border bg-hier-panel p-4 text-sm outline-none focus:border-hier-primary focus:bg-white"
            />
            <select
              multiple
              value={mentionedStaffUserIds}
              onChange={(event) =>
                setMentionedStaffUserIds(Array.from(event.target.selectedOptions).map((option) => option.value))
              }
              className="mt-3 min-h-24 w-full rounded-[18px] border border-hier-border bg-hier-panel px-4 py-3 text-sm outline-none focus:border-hier-primary focus:bg-white"
            >
              {staffUsers.map((staff) => (
                <option key={staff.id} value={staff.id}>
                  @{staff.full_name || staff.email}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={saving || !note.trim()}
              className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-[18px] bg-hier-primary px-4 text-sm font-semibold text-white disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Save note
            </button>
          </form>
        </div>

        <aside className="space-y-4">
          <section className="rounded-[28px] border border-hier-border bg-white p-5 shadow-card">
            <label className="text-sm font-semibold text-hier-text">Status</label>
            <select
              value={item.status}
              onChange={(event) => void updateCase({ status: event.target.value })}
              disabled={saving}
              className="mt-2 h-11 w-full rounded-[18px] border border-hier-border bg-hier-panel px-4 text-sm outline-none"
            >
              <option value="open">Open</option>
              <option value="pending">Pending</option>
              <option value="closed">Closed</option>
            </select>
            <label className="mt-4 block text-sm font-semibold text-hier-text">Case owner</label>
            <select
              value={item.owner_staff_user_id || ""}
              onChange={(event) => void updateCase({ owner_staff_user_id: Number(event.target.value) })}
              disabled={saving}
              className="mt-2 h-11 w-full rounded-[18px] border border-hier-border bg-hier-panel px-4 text-sm outline-none"
            >
              {staffUsers.map((staff) => (
                <option key={staff.id} value={staff.id}>
                  {staff.full_name || staff.email}
                </option>
              ))}
            </select>
            <Link href={`/staff/accounts/${item.account_user_id}`} className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-[18px] border border-hier-border bg-white px-4 text-sm font-semibold text-hier-text">
              Open account
            </Link>
          </section>
        </aside>
      </section>
    </div>
  );
}
