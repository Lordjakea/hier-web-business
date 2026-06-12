"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ChevronRight,
  Loader2,
  Plus,
  X,
  LifeBuoy,
  AlertCircle,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import {
  addTicketMessage,
  createSupportTicket,
  fetchSupportCategories,
  fetchSupportTickets,
  STATUS_COLOURS,
  STATUS_LABELS,
  type CategoryOption,
  type SupportTicket,
  type TicketCategory,
} from "@/lib/support";

function formatDate(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const today = new Date();
  if (d.toDateString() === today.toDateString()) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString([], { day: "2-digit", month: "short", year: "numeric" });
}

// ---------------------------------------------------------------------------
// New ticket modal
// ---------------------------------------------------------------------------

interface NewTicketModalProps {
  categories: CategoryOption[];
  onClose: () => void;
  onCreated: (ticket: SupportTicket) => void;
}

function NewTicketModal({ categories, onClose, onCreated }: NewTicketModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<TicketCategory | "">("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!category) { setError("Please choose a category."); return; }
    setError(null);
    setSubmitting(true);
    try {
      const ticket = await createSupportTicket({
        title: title.trim(),
        description: description.trim(),
        category: category as TicketCategory,
      });
      onCreated(ticket);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Something went wrong. Please try again.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-[24px] bg-white p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-hier-ink">Submit a support ticket</h2>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-hier-muted hover:bg-hier-soft transition"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Category */}
          <div>
            <label className="mb-1 block text-sm font-medium text-hier-ink">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as TicketCategory)}
              required
              className="w-full rounded-[18px] border border-hier-border bg-white px-4 py-2.5 text-sm text-hier-ink focus:outline-none focus:ring-2 focus:ring-hier-primary/30"
            >
              <option value="">Select a category…</option>
              {categories.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div>
            <label className="mb-1 block text-sm font-medium text-hier-ink">
              Subject
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={255}
              placeholder="Brief summary of your issue"
              className="w-full rounded-[18px] border border-hier-border bg-white px-4 py-2.5 text-sm text-hier-ink placeholder:text-hier-muted focus:outline-none focus:ring-2 focus:ring-hier-primary/30"
            />
          </div>

          {/* Description */}
          <div>
            <label className="mb-1 block text-sm font-medium text-hier-ink">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={5}
              placeholder="Describe the issue in detail…"
              className="w-full rounded-[18px] border border-hier-border bg-white px-4 py-2.5 text-sm text-hier-ink placeholder:text-hier-muted focus:outline-none focus:ring-2 focus:ring-hier-primary/30 resize-none"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-[14px] bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertCircle size={15} />
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-[18px] border border-hier-border px-5 py-2.5 text-sm font-medium text-hier-muted hover:bg-hier-soft transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 rounded-[18px] bg-hier-primary px-5 py-2.5 text-sm font-medium text-white hover:opacity-90 transition disabled:opacity-60"
            >
              {submitting ? <Loader2 size={14} className="animate-spin" /> : null}
              Submit ticket
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function SupportPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "pending" | "closed">("all");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [t, c] = await Promise.all([
        fetchSupportTickets(statusFilter),
        categories.length ? Promise.resolve(categories) : fetchSupportCategories(),
      ]);
      setTickets(t);
      if (c !== categories) setCategories(c);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load support tickets.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  function handleCreated(ticket: SupportTicket) {
    setShowModal(false);
    setTickets((prev) => [ticket, ...prev]);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <PageHeader
        title="Support"
        description="Submit and track your support requests."
        action={
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 rounded-[18px] bg-hier-primary px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 transition"
          >
            <Plus size={15} />
            New ticket
          </button>
        }
      />

      {/* Filter tabs */}
      <div className="mt-6 mb-4 flex gap-2">
        {(["all", "open", "pending", "closed"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              statusFilter === s
                ? "bg-hier-primary text-white"
                : "border border-hier-border text-hier-muted hover:bg-hier-soft"
            }`}
          >
            {s === "all" ? "All" : STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={22} className="animate-spin text-hier-muted" />
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 rounded-[18px] bg-red-50 px-5 py-4 text-sm text-red-700">
          <AlertCircle size={15} />
          {error}
        </div>
      ) : tickets.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-center text-hier-muted">
          <LifeBuoy size={36} strokeWidth={1.5} />
          <p className="text-sm">
            {statusFilter === "all"
              ? "You haven't submitted any tickets yet."
              : `No ${STATUS_LABELS[statusFilter]?.toLowerCase()} tickets.`}
          </p>
          {statusFilter === "all" && (
            <button
              onClick={() => setShowModal(true)}
              className="mt-1 rounded-[18px] border border-hier-border px-4 py-2 text-sm hover:bg-hier-soft transition"
            >
              Submit your first ticket
            </button>
          )}
        </div>
      ) : (
        <ul className="space-y-3">
          {tickets.map((ticket) => (
            <li key={ticket.id}>
              <Link
                href={`/support/${ticket.id}`}
                className="flex items-center gap-4 rounded-[24px] border border-hier-border bg-white px-5 py-4 hover:shadow-sm transition group"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLOURS[ticket.status]}`}
                    >
                      {STATUS_LABELS[ticket.status]}
                    </span>
                    <span className="text-xs text-hier-muted">{ticket.category_label}</span>
                  </div>
                  <p className="truncate text-sm font-medium text-hier-ink">{ticket.title}</p>
                  <p className="text-xs text-hier-muted mt-0.5">
                    {formatDate(ticket.updated_at)}
                  </p>
                </div>
                <ChevronRight
                  size={16}
                  className="text-hier-muted group-hover:text-hier-ink transition"
                />
              </Link>
            </li>
          ))}
        </ul>
      )}

      {showModal && (
        <NewTicketModal
          categories={categories}
          onClose={() => setShowModal(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  );
}
