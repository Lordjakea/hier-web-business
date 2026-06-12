"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  Loader2,
  Send,
} from "lucide-react";
import {
  addTicketMessage,
  fetchSupportTicket,
  STATUS_COLOURS,
  STATUS_LABELS,
  type CaseMessage,
  type SupportTicket,
} from "@/lib/support";

function formatTime(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const today = new Date();
  if (d.toDateString() === today.toDateString()) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return (
    d.toLocaleDateString([], { day: "2-digit", month: "short", year: "numeric" }) +
    " · " +
    d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  );
}

interface MessageBubbleProps {
  message: CaseMessage;
}

function MessageBubble({ message }: MessageBubbleProps) {
  const isCustomer = message.author_type === "customer";
  const isAI = message.author_type === "ai";

  return (
    <div className={`flex ${isCustomer ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[75%] rounded-[20px] px-4 py-3 text-sm leading-relaxed ${
          isCustomer
            ? "bg-hier-primary text-white rounded-br-[6px]"
            : isAI
            ? "border border-hier-border bg-hier-soft text-hier-ink rounded-bl-[6px]"
            : "bg-white border border-hier-border text-hier-ink rounded-bl-[6px]"
        }`}
      >
        {!isCustomer && (
          <p
            className={`mb-1 text-xs font-semibold ${
              isAI ? "text-hier-primary" : "text-hier-muted"
            }`}
          >
            {isAI ? "Hier Support AI" : "Support Team"}
          </p>
        )}
        <p className="whitespace-pre-wrap">{message.body}</p>
        <p
          className={`mt-1.5 text-right text-[10px] ${
            isCustomer ? "text-white/70" : "text-hier-muted"
          }`}
        >
          {formatTime(message.created_at)}
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function SupportTicketPage() {
  const params = useParams();
  const router = useRouter();
  const ticketId = Number(params.id);

  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<CaseMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const load = useCallback(async () => {
    if (!ticketId) return;
    setLoading(true);
    setError(null);
    try {
      const t = await fetchSupportTicket(ticketId);
      setTicket(t);
      setMessages(t.messages ?? []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load ticket.");
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (messages.length) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  async function handleSend() {
    const body = draft.trim();
    if (!body || sending) return;
    setSendError(null);
    setSending(true);
    try {
      const msg = await addTicketMessage(ticketId, body);
      setMessages((prev) => [...prev, msg]);
      setDraft("");
      textareaRef.current?.focus();
    } catch (err: unknown) {
      setSendError(err instanceof Error ? err.message : "Failed to send message.");
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSend();
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center py-24">
        <Loader2 size={22} className="animate-spin text-hier-muted" />
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="flex items-center gap-2 rounded-[18px] bg-red-50 px-5 py-4 text-sm text-red-700">
          <AlertCircle size={15} />
          {error ?? "Ticket not found."}
        </div>
      </div>
    );
  }

  const isClosed = ticket.status === "closed";

  return (
    <div className="mx-auto flex max-w-3xl flex-col px-4 py-8" style={{ height: "calc(100vh - 64px)" }}>
      {/* Header */}
      <div className="mb-5 flex-shrink-0">
        <Link
          href="/support"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-hier-muted hover:text-hier-ink transition"
        >
          <ArrowLeft size={14} />
          Back to tickets
        </Link>

        <div className="rounded-[24px] border border-hier-border bg-white p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-base font-semibold text-hier-ink truncate">
                {ticket.title}
              </h1>
              <p className="mt-0.5 text-xs text-hier-muted">
                {ticket.category_label} · Ticket #{ticket.id}
              </p>
            </div>
            <span
              className={`flex-shrink-0 rounded-full px-3 py-1 text-xs font-medium ${STATUS_COLOURS[ticket.status]}`}
            >
              {STATUS_LABELS[ticket.status]}
            </span>
          </div>
        </div>
      </div>

      {/* Message thread */}
      <div className="flex-1 overflow-y-auto rounded-[24px] border border-hier-border bg-hier-panel p-5 space-y-4 mb-4">
        {messages.length === 0 ? (
          <p className="text-center text-sm text-hier-muted py-8">No messages yet.</p>
        ) : (
          messages.map((m) => <MessageBubble key={m.id} message={m} />)
        )}
        <div ref={bottomRef} />
      </div>

      {/* Compose */}
      {isClosed ? (
        <div className="flex-shrink-0 rounded-[18px] border border-hier-border bg-hier-soft px-5 py-3 text-center text-sm text-hier-muted">
          This ticket is closed. Please{" "}
          <Link href="/support" className="text-hier-primary hover:underline">
            open a new ticket
          </Link>{" "}
          if you need further help.
        </div>
      ) : (
        <div className="flex-shrink-0 rounded-[24px] border border-hier-border bg-white p-4">
          {sendError && (
            <div className="mb-3 flex items-center gap-2 rounded-[14px] bg-red-50 px-4 py-2 text-xs text-red-700">
              <AlertCircle size={13} />
              {sendError}
            </div>
          )}
          <div className="flex gap-3 items-end">
            <textarea
              ref={textareaRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={3}
              placeholder="Add a reply… (⌘↵ to send)"
              disabled={sending}
              className="flex-1 resize-none rounded-[18px] border border-hier-border bg-hier-soft px-4 py-3 text-sm text-hier-ink placeholder:text-hier-muted focus:outline-none focus:ring-2 focus:ring-hier-primary/30 disabled:opacity-60"
            />
            <button
              onClick={handleSend}
              disabled={!draft.trim() || sending}
              className="flex-shrink-0 flex h-11 w-11 items-center justify-center rounded-full bg-hier-primary text-white hover:opacity-90 transition disabled:opacity-40"
            >
              {sending ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Send size={16} />
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
