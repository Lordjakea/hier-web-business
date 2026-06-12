"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  Loader2,
  MessageSquarePlus,
  Send,
  Sparkles,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import {
  createStaffCaseNote,
  fetchStaffAssignees,
  fetchStaffCase,
  updateStaffCase,
  type StaffCase,
  type StaffTeamUser,
} from "@/lib/staff-crm";
import {
  addStaffCaseMessage,
  suggestStaffReply,
  type CaseMessage,
} from "@/lib/support";

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

// ---------------------------------------------------------------------------
// Customer message thread
// ---------------------------------------------------------------------------

function MessageBubble({ message }: { message: CaseMessage }) {
  const isCustomer = message.author_type === "customer";
  const isAI = message.author_type === "ai";
  return (
    <div className={`flex ${isCustomer ? "justify-start" : "justify-end"}`}>
      <div
        className={`max-w-[80%] rounded-[20px] px-4 py-3 text-sm leading-relaxed ${
          isCustomer
            ? "bg-hier-soft border border-hier-border text-hier-ink rounded-bl-[6px]"
            : isAI
            ? "border border-hier-primary/30 bg-hier-primary/5 text-hier-ink rounded-br-[6px]"
            : "bg-hier-primary text-white rounded-br-[6px]"
        }`}
      >
        <p
          className={`mb-1 text-xs font-semibold ${
            isCustomer
              ? "text-hier-muted"
              : isAI
              ? "text-hier-primary"
              : "text-white/80"
          }`}
        >
          {isCustomer ? "Customer" : isAI ? "Claude AI (draft)" : "Support Team"}
        </p>
        <p className="whitespace-pre-wrap">{message.body}</p>
        <p
          className={`mt-1.5 text-right text-[10px] ${
            isCustomer || isAI ? "text-hier-muted" : "text-white/70"
          }`}
        >
          {formatDate(message.created_at)}
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function StaffCaseDetailPage() {
  const params = useParams<{ caseId: string }>();
  const caseId = params?.caseId;

  const [item, setItem] = useState<StaffCase | null>(null);
  const [staffUsers, setStaffUsers] = useState<StaffTeamUser[]>([]);
  const [messages, setMessages] = useState<CaseMessage[]>([]);

  // Internal note form
  const [note, setNote] = useState("");
  const [mentionedStaffUserIds, setMentionedStaffUserIds] = useState<string[]>([]);

  // Staff reply to customer
  const [reply, setReply] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);

  // Claude suggest
  const [suggesting, setSuggesting] = useState(false);
  const [suggestError, setSuggestError] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const messageEndRef = useRef<HTMLDivElement>(null);

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
      // messages come back on the case when include_thread=true
      setMessages((caseResponse.case as any).messages ?? []);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not load case.");
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => { void loadCase(); }, [loadCase]);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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

  async function handleSendReply() {
    if (!item || !reply.trim() || sendingReply) return;
    setSendingReply(true);
    setReplyError(null);
    try {
      const msg = await addStaffCaseMessage(item.id, reply.trim());
      setMessages((prev) => [...prev, msg]);
      setReply("");
    } catch (err: unknown) {
      setReplyError(err instanceof Error ? err.message : "Failed to send reply.");
    } finally {
      setSendingReply(false);
    }
  }

  async function handleSuggestReply() {
    if (!item || suggesting) return;
    setSuggesting(true);
    setSuggestError(null);
    try {
      const suggestion = await suggestStaffReply(item.id);
      setReply(suggestion);
    } catch (err: unknown) {
      setSuggestError(err instanceof Error ? err.message : "Could not generate suggestion.");
    } finally {
      setSuggesting(false);
    }
  }

  // -------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="rounded-[28px] border border-hier-border bg-white p-8 text-sm text-hier-muted">
        <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
        Loading case...
      </div>
    );
  }

  if (!item) {
    return (
      <div className="rounded-[28px] border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {error || "Case not found."}
      </div>
    );
  }

  const isCustomerTicket = (item as any).source === "customer";

  return (
    <div className="space-y-8">
      <Link
        href="/staff/cases"
        className="inline-flex items-center gap-2 text-sm font-medium text-hier-muted hover:text-hier-text"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to cases
      </Link>

      <PageHeader
        eyebrow={`Case #${item.id}${isCustomerTicket ? " · Customer ticket" : ""}`}
        title={item.title}
        description={item.account_name || `Account #${item.account_user_id}`}
      />

      {error && (
        <div className="flex items-start gap-3 rounded-[24px] border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <section className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-6">

          {/* ----------------------------------------------------------------
              Customer message thread (only for customer-sourced tickets)
          ---------------------------------------------------------------- */}
          {isCustomerTicket && (
            <div className="rounded-[28px] border border-hier-border bg-white p-5 shadow-card">
              <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-hier-text">
                <MessageSquarePlus className="h-4 w-4" />
                Customer thread
              </h2>

              <div className="max-h-96 overflow-y-auto space-y-3 mb-5 px-1">
                {messages.length === 0 ? (
                  <p className="text-center text-sm text-hier-muted py-6">No messages yet.</p>
                ) : (
                  messages.map((m) => <MessageBubble key={m.id} message={m} />)
                )}
                <div ref={messageEndRef} />
              </div>

              {/* Claude suggest */}
              <div className="mb-3">
                <button
                  type="button"
                  onClick={handleSuggestReply}
                  disabled={suggesting}
                  className="inline-flex items-center gap-2 rounded-[18px] border border-hier-primary/40 bg-hier-primary/5 px-4 py-2 text-sm font-medium text-hier-primary hover:bg-hier-primary/10 transition disabled:opacity-50"
                >
                  {suggesting ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Sparkles size={14} />
                  )}
                  {suggesting ? "Generating…" : "Suggest reply with Claude"}
                </button>
                {suggestError && (
                  <p className="mt-1.5 text-xs text-red-600">{suggestError}</p>
                )}
              </div>

              {/* Reply compose */}
              {replyError && (
                <div className="mb-2 flex items-center gap-2 rounded-[14px] bg-red-50 px-4 py-2 text-xs text-red-700">
                  <AlertCircle size={13} />
                  {replyError}
                </div>
              )}
              <div className="flex gap-3 items-end">
                <textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault();
                      handleSendReply();
                    }
                  }}
                  rows={3}
                  placeholder="Reply to customer… (⌘↵ to send)"
                  disabled={sendingReply}
                  className="flex-1 resize-none rounded-[18px] border border-hier-border bg-hier-panel px-4 py-3 text-sm text-hier-ink placeholder:text-hier-muted focus:border-hier-primary focus:bg-white outline-none disabled:opacity-60"
                />
                <button
                  onClick={handleSendReply}
                  disabled={!reply.trim() || sendingReply}
                  className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-hier-primary text-white hover:opacity-90 transition disabled:opacity-40"
                >
                  {sendingReply ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Send size={16} />
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ----------------------------------------------------------------
              Internal staff notes
          ---------------------------------------------------------------- */}
          <div className="space-y-4">
            {(item.thread || []).map((entry) => (
              <div
                key={entry.id}
                className="rounded-[24px] border border-hier-border bg-white p-5 shadow-sm"
              >
                <p className="whitespace-pre-wrap text-sm leading-6 text-hier-text">
                  {entry.note}
                </p>
                <p className="mt-3 text-xs text-hier-muted">
                  {entry.author_name || entry.author_email || "Staff"} /{" "}
                  {formatDate(entry.created_at)}
                </p>
              </div>
            ))}

            <form
              onSubmit={addNote}
              className="rounded-[28px] border border-hier-border bg-white p-5 shadow-card"
            >
              <h2 className="flex items-center gap-2 text-base font-semibold text-hier-text">
                <MessageSquarePlus className="h-4 w-4" />
                Add internal note
              </h2>
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Add investigation update (internal only)..."
                rows={5}
                className="mt-4 w-full resize-none rounded-[18px] border border-hier-border bg-hier-panel p-4 text-sm outline-none focus:border-hier-primary focus:bg-white"
              />
              <select
                multiple
                value={mentionedStaffUserIds}
                onChange={(event) =>
                  setMentionedStaffUserIds(
                    Array.from(event.target.selectedOptions).map((option) => option.value)
                  )
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
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                Save note
              </button>
            </form>
          </div>
        </div>

        {/* Sidebar */}
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
            <label className="mt-4 block text-sm font-semibold text-hier-text">
              Case owner
            </label>
            <select
              value={item.owner_staff_user_id || ""}
              onChange={(event) =>
                void updateCase({ owner_staff_user_id: Number(event.target.value) })
              }
              disabled={saving}
              className="mt-2 h-11 w-full rounded-[18px] border border-hier-border bg-hier-panel px-4 text-sm outline-none"
            >
              {staffUsers.map((staff) => (
                <option key={staff.id} value={staff.id}>
                  {staff.full_name || staff.email}
                </option>
              ))}
            </select>
            <Link
              href={`/staff/accounts/${item.account_user_id}`}
              className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-[18px] border border-hier-border bg-white px-4 text-sm font-semibold text-hier-text"
            >
              Open account
            </Link>
          </section>

          {isCustomerTicket && (item as any).category && (
            <section className="rounded-[28px] border border-hier-border bg-white p-5 shadow-card">
              <p className="text-xs font-semibold uppercase tracking-wide text-hier-muted mb-1">
                Category
              </p>
              <p className="text-sm font-medium text-hier-ink capitalize">
                {String((item as any).category).replace("_", " ")}
              </p>
            </section>
          )}
        </aside>
      </section>
    </div>
  );
}
