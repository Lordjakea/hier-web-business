"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  AlertCircle,
  Lock,
  MessageSquare,
  Pause,
  Play,
  RefreshCw,
  Search,
  Send,
  UserPlus,
} from "lucide-react";
import clsx from "clsx";
import { PageHeader } from "@/components/ui/page-header";
import { fetchBusinessApplications } from "@/lib/business-applications";
import { fetchBillingStatus } from "@/lib/business-billing";
import { hasMessagingAccess } from "@/lib/billing-entitlements";
import {
  createBusinessConversation,
  fetchBusinessConversationMessages,
  fetchBusinessConversations,
  markBusinessConversationRead,
  pauseBusinessConversationContact,
  resumeBusinessConversationContact,
  sendBusinessConversationMessage,
  type BusinessConversation,
  type BusinessMessage,
} from "@/lib/business-messages";
import type { BusinessApplication } from "@/lib/types";

function formatListTime(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const today = new Date();
  if (date.toDateString() === today.toDateString()) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  return date.toLocaleDateString([], { day: "2-digit", month: "short" });
}

function conversationName(conversation?: BusinessConversation | null) {
  return (
    conversation?.other_party?.display_name ||
    conversation?.other_party?.email ||
    "Candidate"
  );
}

export default function MessagesPage() {
  const searchParams = useSearchParams();
  const initialConversationId = Number(searchParams.get("conversationId") || "") || null;
  const initialApplicationId = Number(searchParams.get("applicationId") || "") || null;
  const initialJobPostId = Number(searchParams.get("jobPostId") || "") || null;

  const [conversations, setConversations] = useState<BusinessConversation[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [messages, setMessages] = useState<BusinessMessage[]>([]);
  const [query, setQuery] = useState("");
  const [candidateQuery, setCandidateQuery] = useState("");
  const [candidatePickerOpen, setCandidatePickerOpen] = useState(false);
  const [candidateOptions, setCandidateOptions] = useState<BusinessApplication[]>([]);
  const [candidateOptionsLoading, setCandidateOptionsLoading] = useState(false);
  const [startingApplicationId, setStartingApplicationId] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [threadLoading, setThreadLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [contactBusy, setContactBusy] = useState(false);
  const [billingStatus, setBillingStatus] = useState<any | null>(null);
  const [billingLoading, setBillingLoading] = useState(true);
  const [chatHeight, setChatHeight] = useState(720);
  const [error, setError] = useState<string | null>(null);
  const listEndRef = useRef<HTMLDivElement | null>(null);
  const shouldScrollToBottomRef = useRef(false);
  const hasHandledInitialStartRef = useRef(false);

  const canUseMessaging = useMemo(() => {
    return hasMessagingAccess(billingStatus);
  }, [billingStatus]);

  const selectedConversation = useMemo(
    () => conversations.find((item) => item.id === selectedId) || null,
    [conversations, selectedId],
  );

  const filteredConversations = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return conversations;

    return conversations.filter((conversation) => {
      const name = conversationName(conversation).toLowerCase();
      const headline = String(conversation.other_party?.headline || "").toLowerCase();
      return name.includes(needle) || headline.includes(needle);
    });
  }, [conversations, query]);

  const filteredCandidateOptions = useMemo(() => {
    const needle = candidateQuery.trim().toLowerCase();

    return candidateOptions.filter((application) => {
      const candidateName = [
        application.user?.display_name,
        application.user?.full_name,
        application.user?.email,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const role = String(application.job_post?.title || "").toLowerCase();

      return !needle || candidateName.includes(needle) || role.includes(needle);
    });
  }, [candidateOptions, candidateQuery]);

  const loadConversations = useCallback(
    async (silent = false) => {
      if (billingLoading || !canUseMessaging) {
        setLoading(false);
        return;
      }

      if (!silent) {
        setLoading(true);
        setError(null);
      }

      try {
        const items = await fetchBusinessConversations();
        setConversations(items);
        setSelectedId((current) => {
          if (current && items.some((item) => item.id === current)) return current;
          if (initialConversationId && items.some((item) => item.id === initialConversationId)) {
            return initialConversationId;
          }
          return current || items[0]?.id || null;
        });
      } catch (caughtError) {
        if (!silent) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "Could not load messages.",
          );
        }
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [billingLoading, canUseMessaging, initialConversationId],
  );

  const loadThread = useCallback(
    async (conversationId: number, silent = false) => {
      if (!silent) setThreadLoading(true);

      try {
        if (!silent) shouldScrollToBottomRef.current = true;
        const items = await fetchBusinessConversationMessages(conversationId);
        setMessages(items);
        await markBusinessConversationRead(conversationId);
        await loadConversations(true);
      } catch (caughtError) {
        if (!silent) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "Could not load this conversation.",
          );
        }
      } finally {
        if (!silent) setThreadLoading(false);
      }
    },
    [loadConversations],
  );

  useEffect(() => {
    let cancelled = false;

    async function loadBilling() {
      try {
        const status = await fetchBillingStatus();
        if (!cancelled) setBillingStatus(status);
      } catch (caughtError) {
        if (!cancelled) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "Could not check your current plan.",
          );
        }
      } finally {
        if (!cancelled) setBillingLoading(false);
      }
    }

    void loadBilling();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (billingLoading) return;
    void loadConversations(false);
  }, [billingLoading, loadConversations]);

  useEffect(() => {
    if (!selectedId) return;
    void loadThread(selectedId, false);
  }, [loadThread, selectedId]);

  useEffect(() => {
    if (!selectedId) return;

    const timer = window.setInterval(() => {
      void loadThread(selectedId, true);
    }, 3000);

    return () => window.clearInterval(timer);
  }, [loadThread, selectedId]);

  useEffect(() => {
    if (!shouldScrollToBottomRef.current) return;
    shouldScrollToBottomRef.current = false;
    listEndRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  useEffect(() => {
    if (!candidatePickerOpen || candidateOptions.length) return;

    let cancelled = false;

    async function loadCandidates() {
      setCandidateOptionsLoading(true);
      try {
        const response = await fetchBusinessApplications({
          include_archived: true,
          per_page: 100,
        });
        if (!cancelled) setCandidateOptions(response.items || []);
      } catch (caughtError) {
        if (!cancelled) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "Could not load candidates.",
          );
        }
      } finally {
        if (!cancelled) setCandidateOptionsLoading(false);
      }
    }

    void loadCandidates();

    return () => {
      cancelled = true;
    };
  }, [candidateOptions.length, candidatePickerOpen]);

  useEffect(() => {
    if (
      hasHandledInitialStartRef.current ||
      !canUseMessaging ||
      !initialApplicationId ||
      !initialJobPostId
    ) {
      return;
    }

    hasHandledInitialStartRef.current = true;
    void handleStartConversation({
      id: initialApplicationId,
      job_post: { id: initialJobPostId },
    } as BusinessApplication);
  }, [canUseMessaging, initialApplicationId, initialJobPostId]);

  async function handleSend() {
    const body = draft.trim();
    if (!selectedId || !body) return;

    try {
      setSending(true);
      shouldScrollToBottomRef.current = true;
      const response = await sendBusinessConversationMessage(selectedId, body);
      if (response.message) {
        setMessages((current) => [...current, response.message as BusinessMessage]);
      } else {
        await loadThread(selectedId, true);
      }
      setDraft("");
      await loadConversations(true);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not send this message.",
      );
    } finally {
      setSending(false);
    }
  }

  async function handleContactToggle() {
    if (!selectedConversation) return;

    const contact = selectedConversation.contact_status;
    const paused = contact?.can_send === false;

    try {
      setContactBusy(true);
      const response = paused
        ? await resumeBusinessConversationContact(selectedConversation.id)
        : await pauseBusinessConversationContact(selectedConversation.id);

      if (response.conversation) {
        setConversations((current) =>
          current.map((item) =>
            item.id === response.conversation?.id ? response.conversation : item,
          ),
        );
      } else {
        await loadConversations(true);
      }
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not update contact status.",
      );
    } finally {
      setContactBusy(false);
    }
  }

  async function handleStartConversation(application: BusinessApplication) {
    const applicationId = application.id;
    const jobPostId = application.job_post?.id || application.job_post_id;

    if (!applicationId || !jobPostId) {
      setError("Could not start a conversation for that candidate.");
      return;
    }

    setStartingApplicationId(applicationId);
    setError(null);

    try {
      const response = await createBusinessConversation({
        application_id: applicationId,
        job_post_id: jobPostId,
      });

      const conversation = response.conversation;
      if (conversation) {
        setConversations((current) => {
          const withoutExisting = current.filter((item) => item.id !== conversation.id);
          return [conversation, ...withoutExisting];
        });
        setSelectedId(conversation.id);
        setCandidatePickerOpen(false);
        setCandidateQuery("");
        shouldScrollToBottomRef.current = true;
        await loadThread(conversation.id, false);
      } else {
        await loadConversations(false);
      }
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not start this conversation.",
      );
    } finally {
      setStartingApplicationId(null);
    }
  }

  const roleClosed = selectedConversation?.contact_status?.reason === "role_closed";
  const contactPaused = selectedConversation?.contact_status?.can_send === false;

  return (
    <div className="mx-auto flex max-w-[1800px] flex-col gap-6">
      <PageHeader
        eyebrow="Communications"
        title="Messages"
        description="Send and receive candidate messages from the dashboard. Conversations stay in sync with the mobile app."
        action={
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={() => setCandidatePickerOpen((current) => !current)}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-hier-primary px-4 text-sm font-semibold text-white transition hover:opacity-95"
            >
              <UserPlus className="h-4 w-4" />
              New message
            </button>
            <label className="flex h-10 items-center gap-3 rounded-lg border border-hier-border bg-white px-4 text-sm font-semibold text-hier-ink">
              <span className="whitespace-nowrap">Chat size</span>
              <input
                type="range"
                min="520"
                max="920"
                step="20"
                value={chatHeight}
                onChange={(event) => setChatHeight(Number(event.target.value))}
                className="w-32 accent-hier-primary"
                aria-label="Adjust chat box height"
              />
            </label>
            <button
              type="button"
              onClick={() => void loadConversations(false)}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-hier-border bg-white px-4 text-sm font-semibold text-hier-ink transition hover:bg-hier-panel"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>
        }
      />

      {error ? (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      ) : null}

      {!billingLoading && !canUseMessaging ? (
        <section className="flex min-h-[520px] items-center justify-center rounded-lg border border-hier-border bg-white p-8 text-center shadow-card">
          <div className="max-w-md">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-lg bg-hier-soft text-hier-primary">
              <Lock className="h-6 w-6" />
            </div>
            <h2 className="mt-5 text-2xl font-semibold text-hier-text">
              Add messaging to your package
            </h2>
            <p className="mt-3 text-sm leading-6 text-hier-muted">
              Direct business-to-candidate messaging can be added from Billing
              or included through a plan that already has messaging.
            </p>
            <Link
              href="/billing"
              className="mt-6 inline-flex h-11 items-center justify-center rounded-lg bg-hier-primary px-5 text-sm font-semibold text-white transition hover:opacity-90"
            >
              View billing
            </Link>
          </div>
        </section>
      ) : null}

      {billingLoading || canUseMessaging ? (
      <section
        className="grid overflow-hidden rounded-lg border border-hier-border bg-white shadow-card lg:grid-cols-[360px_1fr]"
        style={{ height: chatHeight }}
      >
        <aside className="flex min-h-0 flex-col border-b border-hier-border lg:border-b-0 lg:border-r">
          <div className="border-b border-hier-border p-4">
            {candidatePickerOpen ? (
              <div className="mb-4 rounded-lg border border-hier-border bg-white p-3 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-hier-text">
                    Start a message
                  </p>
                  <button
                    type="button"
                    onClick={() => setCandidatePickerOpen(false)}
                    className="text-xs font-semibold text-hier-muted hover:text-hier-text"
                  >
                    Close
                  </button>
                </div>

                <div className="mt-3 flex h-10 items-center gap-2 rounded-lg border border-hier-border bg-hier-panel px-3">
                  <Search className="h-4 w-4 text-hier-muted" />
                  <input
                    value={candidateQuery}
                    onChange={(event) => setCandidateQuery(event.target.value)}
                    placeholder="Search candidates"
                    className="h-full min-w-0 flex-1 bg-transparent text-sm text-hier-text outline-none placeholder:text-hier-muted"
                  />
                </div>

                <div className="mt-3 max-h-64 overflow-y-auto overscroll-contain">
                  {candidateOptionsLoading ? (
                    <div className="px-2 py-3 text-sm text-hier-muted">
                      Loading candidates...
                    </div>
                  ) : filteredCandidateOptions.length ? (
                    filteredCandidateOptions.map((application) => {
                      const name =
                        application.user?.display_name ||
                        application.user?.full_name ||
                        application.user?.email ||
                        "Candidate";
                      const busy = startingApplicationId === application.id;

                      return (
                        <button
                          key={application.id}
                          type="button"
                          onClick={() => void handleStartConversation(application)}
                          disabled={busy}
                          className="flex w-full items-start justify-between gap-3 rounded-lg px-2 py-3 text-left transition hover:bg-hier-panel disabled:opacity-60"
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold text-hier-text">
                              {name}
                            </span>
                            <span className="mt-1 block truncate text-xs text-hier-muted">
                              {application.job_post?.title || "Application"}
                            </span>
                          </span>
                          {busy ? (
                            <RefreshCw className="mt-1 h-4 w-4 shrink-0 animate-spin text-hier-primary" />
                          ) : null}
                        </button>
                      );
                    })
                  ) : (
                    <div className="px-2 py-3 text-sm text-hier-muted">
                      No candidates match that search.
                    </div>
                  )}
                </div>
              </div>
            ) : null}

            <div className="flex h-11 items-center gap-2 rounded-lg border border-hier-border bg-hier-panel px-3">
              <Search className="h-4 w-4 text-hier-muted" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search messages"
                className="h-full min-w-0 flex-1 bg-transparent text-sm text-hier-text outline-none placeholder:text-hier-muted"
              />
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain [scrollbar-gutter:stable]">
            {loading ? (
              <div className="p-5 text-sm text-hier-muted">Loading messages...</div>
            ) : filteredConversations.length ? (
              filteredConversations.map((conversation) => {
                const active = conversation.id === selectedId;
                const unread = Number(conversation.unread_count || 0);
                const blocked = conversation.contact_status?.can_send === false;

                return (
                  <button
                    key={conversation.id}
                    type="button"
                    onClick={() => setSelectedId(conversation.id)}
                    className={clsx(
                      "flex w-full items-start gap-3 border-b border-hier-border px-4 py-4 text-left transition",
                      active ? "bg-hier-soft" : "bg-white hover:bg-hier-panel",
                    )}
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-hier-primary text-sm font-bold text-white">
                      {conversationName(conversation).slice(0, 1).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <p className="truncate text-sm font-semibold text-hier-text">
                          {conversationName(conversation)}
                        </p>
                        <span className="shrink-0 text-xs text-hier-muted">
                          {formatListTime(conversation.last_message_at)}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-xs text-hier-muted">
                        {blocked && conversation.contact_status?.reason !== "role_closed"
                          ? "Contact paused"
                          : conversation.contact_status?.reason === "role_closed"
                            ? "Role filled"
                          : conversation.other_party?.headline || "Candidate conversation"}
                      </p>
                    </div>
                    {unread ? (
                      <span className="mt-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-hier-primary px-1.5 text-xs font-bold text-white">
                        {unread}
                      </span>
                    ) : null}
                  </button>
                );
              })
            ) : (
              <div className="p-5 text-sm text-hier-muted">
                No conversations found.
              </div>
            )}
          </div>
        </aside>

        <div className="flex min-h-0 flex-col overflow-hidden">
          {selectedConversation ? (
            <>
              <div className="flex items-center justify-between gap-4 border-b border-hier-border px-5 py-4">
                <div className="min-w-0">
                  <h2 className="truncate text-lg font-semibold text-hier-text">
                    {conversationName(selectedConversation)}
                  </h2>
                  <p className="truncate text-sm text-hier-muted">
                    {selectedConversation.other_party?.headline || "Candidate"}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => void handleContactToggle()}
                  disabled={contactBusy}
                  className={clsx(
                    "inline-flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-semibold transition disabled:opacity-60",
                    contactPaused
                      ? "bg-hier-primary text-white hover:opacity-90"
                      : "border border-hier-border bg-white text-hier-ink hover:bg-hier-panel",
                  )}
                >
                  {contactPaused ? (
                    <Play className="h-4 w-4" />
                  ) : (
                    <Pause className="h-4 w-4" />
                  )}
                  {contactPaused ? "Resume contact" : "Pause contact"}
                </button>
              </div>

              {roleClosed && selectedConversation.contact_status?.can_send !== false ? (
                <div className="flex items-center gap-2 border-b border-hier-border bg-hier-panel px-5 py-3 text-sm font-medium text-hier-muted">
                  <MessageSquare className="h-4 w-4" />
                  This role is filled, but this conversation can continue.
                </div>
              ) : selectedConversation.contact_status?.can_send === false ? (
                <div className="flex items-center gap-2 border-b border-hier-border bg-hier-panel px-5 py-3 text-sm font-medium text-hier-muted">
                  {roleClosed ? <Lock className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                  {roleClosed
                    ? "This conversation was paused when the role was filled. Resume contact to continue."
                    : "Candidate replies are paused for this role."}
                </div>
              ) : null}

              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-[#fbfbfd] px-5 py-5 [scrollbar-gutter:stable]">
                {threadLoading ? (
                  <div className="text-sm text-hier-muted">Loading conversation...</div>
                ) : messages.length ? (
                  <div className="flex flex-col gap-3">
                    {messages.map((message) => {
                      const mine = message.sender?.role === "business_user";
                      return (
                        <div
                          key={message.id}
                          className={clsx(
                            "flex",
                            mine ? "justify-end" : "justify-start",
                          )}
                        >
                          <div
                            className={clsx(
                              "max-w-[76%] rounded-lg px-4 py-3 shadow-card",
                              mine
                                ? "bg-hier-primary text-white"
                                : "border border-hier-border bg-white text-hier-text",
                            )}
                          >
                            <p className="whitespace-pre-wrap text-sm leading-6">
                              {message.body || ""}
                            </p>
                            <p
                              className={clsx(
                                "mt-2 text-xs font-semibold",
                                mine ? "text-white/80" : "text-hier-muted",
                              )}
                            >
                              {formatListTime(message.created_at)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={listEndRef} />
                  </div>
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-hier-muted">
                    <MessageSquare className="h-8 w-8" />
                    <div>
                      <p className="font-semibold text-hier-text">No messages yet</p>
                      <p className="mt-1 text-sm">
                        Send the first message to start this conversation.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t border-hier-border bg-white p-4">
                <div className="flex items-end gap-3">
                  <textarea
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        void handleSend();
                      }
                    }}
                    placeholder="Write a message"
                    rows={2}
                    maxLength={2000}
                    className="min-h-[52px] flex-1 resize-none rounded-lg border border-hier-border bg-white px-4 py-3 text-sm text-hier-text outline-none transition placeholder:text-hier-muted focus:border-hier-primary"
                  />
                  <button
                    type="button"
                    onClick={() => void handleSend()}
                    disabled={!draft.trim() || sending}
                    className="inline-flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-lg bg-hier-primary text-white transition hover:opacity-90 disabled:opacity-50"
                    aria-label="Send message"
                  >
                    <Send className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center text-hier-muted">
              <MessageSquare className="h-9 w-9" />
              <div>
                <p className="font-semibold text-hier-text">No conversation selected</p>
                <p className="mt-1 text-sm">Choose a message thread to open it.</p>
              </div>
            </div>
          )}
        </div>
      </section>
      ) : null}
    </div>
  );
}
