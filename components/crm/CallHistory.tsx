"use client";

import { useCallback, useEffect, useState } from "react";
import { ExternalLink, Loader2 } from "lucide-react";

import {
  type CallActivity,
  fetchStaffAccountCallActivities,
  fetchStaffLeadCallActivities,
  updateStaffCallActivity,
} from "@/lib/staff-calls";

export const CALL_OUTCOME_OPTIONS = [
  "Connected",
  "No Answer",
  "Voicemail Left",
  "Invalid Number",
  "Gatekeeper reached",
  "Wrong contact",
  "Call back requested",
] as const;

type CallHistoryScope =
  | { leadId: number; accountUserId?: never }
  | { accountUserId: number; leadId?: never };

type CallHistoryProps = CallHistoryScope & {
  embedded?: boolean;
};

function fmtDateTime(value?: string | null) {
  if (!value) return "No time recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No time recorded";

  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtDuration(seconds?: number | null) {
  if (seconds == null) return "No duration";
  const safeSeconds = Math.max(0, Number(seconds) || 0);
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;

  if (minutes <= 0) return `${remainingSeconds}s`;
  return `${minutes}m ${remainingSeconds}s`;
}

function callLabel(value?: string | null) {
  const text = (value || "").trim();
  return text ? text.replaceAll("_", " ") : "Call";
}

function sameId(left?: number | string | null, right?: number | string | null) {
  if (left === null || left === undefined || right === null || right === undefined) return false;
  return Number(left) === Number(right);
}

export function CallHistory(props: CallHistoryProps) {
  const [items, setItems] = useState<CallActivity[]>([]);
  const [edits, setEdits] = useState<Record<number, { outcome: string; notes: string }>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savingCallId, setSavingCallId] = useState<number | null>(null);
  const [savedCallId, setSavedCallId] = useState<number | null>(null);
  const [saveErrorByCallId, setSaveErrorByCallId] = useState<Record<number, string>>({});
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const leadId = "leadId" in props ? props.leadId : null;
  const accountUserId = "accountUserId" in props ? props.accountUserId : null;

  const loadCalls = useCallback(async () => {
    if (!leadId && !accountUserId) return;

    setLoading(true);
    setError(null);

    try {
      const response = leadId
        ? await fetchStaffLeadCallActivities(leadId)
        : await fetchStaffAccountCallActivities(accountUserId as number);
      const responseItems = Array.isArray(response.items) ? response.items : [];
      const nextItems = responseItems.filter((call) => {
        if (leadId) return sameId(call.staff_lead_id, leadId);
        if (accountUserId) {
          return (
            sameId(call.account_user_id, accountUserId) ||
            sameId(call.business_user_id, accountUserId) ||
            sameId(call.recruiter_user_id, accountUserId) ||
            sameId(call.candidate_user_id, accountUserId)
          );
        }
        return false;
      });
      setItems(nextItems);
      setEdits(
        nextItems.reduce<Record<number, { outcome: string; notes: string }>>((acc, item) => {
          acc[item.id] = { outcome: item.outcome || "", notes: item.notes || "" };
          return acc;
        }, {})
      );
    } catch (caughtError) {
      setItems([]);
      setEdits({});
      setError(caughtError instanceof Error ? caughtError.message : "Could not load calls.");
    } finally {
      setLoading(false);
    }
  }, [leadId, accountUserId]);

  useEffect(() => {
    void loadCalls();
  }, [loadCalls]);

  useEffect(() => {
    function handleCreated(event: Event) {
      const detail = (
        event as CustomEvent<{ leadId?: number | null; accountUserId?: number | null; call?: CallActivity }>
      ).detail;
      const matchesLead = Boolean(leadId && detail?.leadId === leadId);
      const matchesAccount = Boolean(accountUserId && detail?.accountUserId === accountUserId);
      if (!matchesLead && !matchesAccount) return;

      if (detail?.call) {
        setItems((current) => [detail.call as CallActivity, ...current.filter((item) => item.id !== detail.call?.id)]);
        setEdits((current) => ({
          ...current,
          [detail.call!.id]: {
            outcome: detail.call!.outcome || "",
            notes: detail.call!.notes || "",
          },
        }));
      } else {
        void loadCalls();
      }
    }

    window.addEventListener("hier:staff-call-created", handleCreated);
    return () => window.removeEventListener("hier:staff-call-created", handleCreated);
  }, [leadId, accountUserId, loadCalls]);

  function updateEdit(callId: number, patch: Partial<{ outcome: string; notes: string }>) {
    setEdits((current) => ({
      ...current,
      [callId]: {
        outcome: current[callId]?.outcome || "",
        notes: current[callId]?.notes || "",
        ...patch,
      },
    }));
  }

  async function saveCall(call: CallActivity) {
    const edit = edits[call.id] || { outcome: "", notes: "" };
    setSavingCallId(call.id);
    setSaveErrorByCallId((current) => {
      const next = { ...current };
      delete next[call.id];
      return next;
    });

    try {
      const response = await updateStaffCallActivity(call.id, {
        outcome: edit.outcome.trim() || null,
        notes: edit.notes.trim() || null,
      });
      setItems((current) => current.map((item) => (item.id === call.id ? response.call : item)));
      setEdits((current) => ({
        ...current,
        [call.id]: {
          outcome: response.call.outcome || "",
          notes: response.call.notes || "",
        },
      }));
      setStatusMessage("Call saved to account history.");
      setSavedCallId(call.id);
      window.dispatchEvent(
        new CustomEvent("hier:staff-call-updated", {
          detail: { leadId, accountUserId, call: response.call },
        })
      );
      window.setTimeout(() => {
        setSavedCallId((current) => (current === call.id ? null : current));
        setStatusMessage(null);
      }, 1800);
    } catch (caughtError) {
      setSaveErrorByCallId((current) => ({
        ...current,
        [call.id]: caughtError instanceof Error ? caughtError.message : "Could not save call.",
      }));
    } finally {
      setSavingCallId(null);
    }
  }

  const actionableItems = items.filter(
    (call) => !(call.outcome || "").trim() && !(call.notes || "").trim()
  );

  return (
    <section className={props.embedded ? "" : "rounded-[28px] border border-hier-border bg-white p-5 shadow-card"}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-hier-text">Call history</h2>
        {actionableItems.length ? (
          <span className="rounded-full bg-hier-soft px-3 py-1 text-xs font-semibold text-hier-primary">
            {actionableItems.length}
          </span>
        ) : null}
      </div>

      {loading ? (
        <div className="mt-4 inline-flex items-center gap-2 text-sm text-hier-muted">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading calls...
        </div>
      ) : null}

      {error ? (
        <div className="mt-4 rounded-[18px] border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {statusMessage ? (
        <p className="mt-3 rounded-[16px] border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
          {statusMessage}
        </p>
      ) : null}

      {!loading && !error && !items.length ? (
        <p className="mt-3 text-sm text-hier-muted">No call history yet.</p>
      ) : null}

      {items.length ? (
        <div className="mt-4 space-y-4">
          {items.map((call) => {
            const edit = edits[call.id] || { outcome: call.outcome || "", notes: call.notes || "" };
            const saveError = saveErrorByCallId[call.id];
            const isOpen = !(call.outcome || "").trim() && !(call.notes || "").trim();

            return (
              <article key={call.id} className="rounded-[20px] border border-hier-border bg-hier-panel p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold capitalize text-hier-text">
                      {callLabel(call.direction)}
                    </p>
                    <p className="mt-1 text-sm text-hier-muted">
                      {fmtDateTime(call.started_at || call.created_at)}
                    </p>
                  </div>
                  {call.duration_seconds != null ? (
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-hier-ink">
                      {fmtDuration(call.duration_seconds)}
                    </span>
                  ) : null}
                  {isOpen ? (
                    <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                      Needs notes
                    </span>
                  ) : null}
                </div>

                <div className="mt-3 grid gap-2 text-sm text-hier-muted sm:grid-cols-2">
                  <span>{call.phone_number || "No phone number"}</span>
                  <span className="capitalize">{callLabel(call.circleloop_event_type)}</span>
                </div>

                {call.recording_url ? (
                  <a
                    href={call.recording_url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-hier-primary"
                  >
                    Recording
                    <ExternalLink className="h-4 w-4" aria-hidden="true" />
                  </a>
                ) : null}

                <div className="mt-4 grid gap-3">
                  <select
                    value={edit.outcome}
                    onChange={(event) => updateEdit(call.id, { outcome: event.target.value })}
                    className="h-10 rounded-[16px] border border-hier-border bg-white px-3 text-sm outline-none focus:border-hier-primary"
                  >
                    <option value="">Select call outcome</option>
                    {CALL_OUTCOME_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  <textarea
                    value={edit.notes}
                    onChange={(event) => updateEdit(call.id, { notes: event.target.value })}
                    rows={3}
                    placeholder="Call notes"
                    className="resize-none rounded-[16px] border border-hier-border bg-white p-3 text-sm outline-none focus:border-hier-primary"
                  />
                  <button
                    type="button"
                    disabled={savingCallId === call.id}
                    onClick={() => saveCall(call)}
                    className={`inline-flex h-10 w-fit items-center justify-center gap-2 rounded-[16px] px-4 text-sm font-semibold text-white disabled:opacity-50 ${
                      savedCallId === call.id ? "bg-emerald-700" : "bg-hier-primary"
                    }`}
                  >
                    {savingCallId === call.id ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    {savingCallId === call.id ? "Saving..." : savedCallId === call.id ? "Saved" : "Save call"}
                  </button>
                  {savedCallId === call.id ? (
                    <p className="text-xs font-semibold text-emerald-700">Saved to account history.</p>
                  ) : null}
                  {saveError ? (
                    <p className="rounded-[14px] border border-red-100 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
                      {saveError}
                    </p>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
