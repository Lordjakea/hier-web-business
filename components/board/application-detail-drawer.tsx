"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarClock,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Star,
  Video,
  X,
} from "lucide-react";

import { apiFetch } from "@/lib/api";

import { CVViewerModal } from "@/components/board/cv-viewer-modal";
import {
  fetchOnboardingEligibility,
  startOnboarding,
} from "@/lib/business-onboarding";
import { boardColumns } from "@/lib/theme";
import type {
  ApplicationStage,
  BusinessApplication,
  BusinessCandidate,
  RawApplicationQuestion,
} from "@/lib/types";

const stageOptions = boardColumns.map((column) => ({
  value: column.id,
  label: column.title,
}));

type QuestionAnswerRow = {
  id: string;
  question: string;
  answer: string;
  required?: boolean;
};

type InterviewType = "teams" | "meet" | "zoom" | "face";

type InterviewDraftSlot = {
  starts_at: string;
  ends_at: string;
};

type InterviewSlot = {
  id: number;
  application_id?: number | null;
  starts_at?: string | null;
  ends_at?: string | null;
  start_at?: string | null;
  end_at?: string | null;
  booked_by_user_id?: number | null;
  booked_at?: string | null;
  cancelled_at?: string | null;
  location?: string | null;
  meeting_link?: string | null;
  meeting_url?: string | null;
  notes?: string | null;
  interviewer_name?: string | null;
};

const defaultSlots: InterviewDraftSlot[] = [
  { starts_at: "", ends_at: "" },
  { starts_at: "", ends_at: "" },
  { starts_at: "", ends_at: "" },
];

function safeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function answerToText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);

  if (Array.isArray(value)) {
    return value
      .map((item) => answerToText(item))
      .filter(Boolean)
      .join(", ");
  }

  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;

    const direct =
      safeString(obj.answer) ||
      safeString(obj.value) ||
      safeString(obj.response) ||
      safeString(obj.text) ||
      safeString(obj.label);

    if (direct) return direct;

    try {
      return JSON.stringify(obj);
    } catch {
      return "";
    }
  }

  return "";
}

function normalizeQuestion(
  item: RawApplicationQuestion,
  index: number
): { id: string; question: string; required: boolean } | null {
  if (typeof item === "string") {
    const label = item.trim();
    if (!label) return null;

    return {
      id: `q_${index}`,
      question: label,
      required: false,
    };
  }

  if (!item || typeof item !== "object") return null;

  const question =
    safeString(item.question) ||
    safeString(item.label) ||
    safeString(item.prompt) ||
    safeString(item.text);

  if (!question) return null;

  return {
    id:
      item.id != null
        ? String(item.id)
        : safeString(item.key) || `q_${index}`,
    question,
    required: !!item.required,
  };
}

function buildQuestionAnswerRows(
  questionsRaw: unknown,
  answersRaw: unknown
): QuestionAnswerRow[] {
  const questions = Array.isArray(questionsRaw)
    ? questionsRaw
        .map((item, index) =>
          normalizeQuestion(item as RawApplicationQuestion, index)
        )
        .filter((item): item is NonNullable<typeof item> => !!item)
    : [];

  const answerMap: Record<string, string> = {};

  if (answersRaw && typeof answersRaw === "object" && !Array.isArray(answersRaw)) {
    Object.entries(answersRaw as Record<string, unknown>).forEach(([key, value]) => {
      const text = answerToText(value);
      if (text) answerMap[key] = text;
    });
  }

  if (Array.isArray(answersRaw)) {
    answersRaw.forEach((item, index) => {
      if (!item || typeof item !== "object") return;

      const obj = item as Record<string, unknown>;

      const key =
        safeString(obj.question_id) ||
        safeString(obj.id) ||
        safeString(obj.key) ||
        safeString(obj.question) ||
        `q_${index}`;

      const text = answerToText(
        obj.answer ?? obj.value ?? obj.response ?? obj.text
      );

      if (key && text) answerMap[key] = text;
    });
  }

  if (questions.length) {
    return questions.map((q, index) => ({
      id: q.id,
      question: q.question,
      answer:
        answerMap[q.id] ||
        answerMap[q.question] ||
        answerMap[`q_${index}`] ||
        "No answer provided",
      required: q.required,
    }));
  }

  return Object.entries(answerMap).map(([key, value]) => ({
    id: key,
    question: key,
    answer: value || "No answer provided",
    required: false,
  }));
}

function fmtDateTime(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";

  return d.toLocaleString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtRange(slot?: InterviewSlot | null) {
  if (!slot) return "—";

  const start = slot.starts_at || slot.start_at || null;
  const end = slot.ends_at || slot.end_at || null;

  if (!start) return "—";

  const s = new Date(start);
  if (Number.isNaN(s.getTime())) return "—";

  const startText = s.toLocaleString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  if (!end) return startText;

  const e = new Date(end);
  if (Number.isNaN(e.getTime())) return startText;

  const endText = e.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return `${startText} – ${endText}`;
}

function getMeetingLink(slot?: InterviewSlot | null) {
  return slot?.meeting_link || slot?.meeting_url || null;
}

function getInterviewWith(slot?: InterviewSlot | null) {
  return slot?.interviewer_name || slot?.notes || null;
}

function toIsoFromDatetimeLocal(value: string) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export function ApplicationDetailDrawer({
  open,
  application,
  candidate,
  loading,
  saving,
  cvPreviewUrl,
  cvPreviewLoading,
  cvPreviewError,
  onClose,
  onSave,
  onOpenCv,
}: {
  open: boolean;
  application: BusinessApplication | null;
  candidate: BusinessCandidate | null;
  loading?: boolean;
  saving?: boolean;
  cvPreviewUrl?: string | null;
  cvPreviewLoading?: boolean;
  cvPreviewError?: string | null;
  onClose: () => void;
  onSave: (payload: {
    stage: ApplicationStage;
    rating: number | null;
    recruiter_tags: string[];
    internal_note: string | null;
  }) => Promise<void> | void;
  onOpenCv: () => void;
}) {
  const [stage, setStage] = useState<ApplicationStage>("applied");
  const [rating, setRating] = useState<number>(0);
  const [tagText, setTagText] = useState("");
  const [note, setNote] = useState("");
  const [showCvModal, setShowCvModal] = useState(false);

  const [onboardingEligible, setOnboardingEligible] = useState<boolean | null>(null);
  const [startingOnboarding, setStartingOnboarding] = useState(false);

  const [interviewSlots, setInterviewSlots] = useState<InterviewSlot[]>([]);
  const [interviewSlotsLoading, setInterviewSlotsLoading] = useState(false);
  const [interviewSlotsError, setInterviewSlotsError] = useState<string | null>(null);
  const [editingInterview, setEditingInterview] = useState(false);
  const [sendingSlots, setSendingSlots] = useState(false);
  const [interviewWith, setInterviewWith] = useState("");
  const [interviewType, setInterviewType] = useState<InterviewType>("teams");
  const [meetingLink, setMeetingLink] = useState("");
  const [interviewLocation, setInterviewLocation] = useState("");
  const [draftSlots, setDraftSlots] = useState<InterviewDraftSlot[]>(defaultSlots);

  const parsedTags = useMemo(
    () =>
      tagText
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 20),
    [tagText]
  );

  const questionAnswerRows = useMemo(
    () =>
      buildQuestionAnswerRows(
        application?.job_post?.application_questions,
        application?.application_answers
      ),
    [application?.job_post?.application_questions, application?.application_answers]
  );

  const activeInterviewSlots = useMemo(
    () => interviewSlots.filter((slot) => !slot.cancelled_at),
    [interviewSlots]
  );

  const bookedSlot = useMemo(
    () => activeInterviewSlots.find((slot) => !!slot.booked_by_user_id) || null,
    [activeInterviewSlots]
  );

  const hasSentInterviewSlots = activeInterviewSlots.length > 0;
  const showInterviewForm = !hasSentInterviewSlots || editingInterview;

  const displayName =
    candidate?.name ||
    application?.user?.display_name ||
    application?.user?.full_name ||
    "Candidate";

  const headline =
    candidate?.headline || application?.job_post?.title || "Candidate profile";

  const email = candidate?.email || application?.user?.email;
  const phone = candidate?.phone || application?.user?.phone;

  const location =
    candidate?.address_text ||
    application?.user?.address_text ||
    application?.job_post?.location ||
    application?.job_post?.location_text;

  const avatarUrl = candidate?.avatar_url || application?.user?.avatar_url || null;

  const fileName =
    application?.attachments?.find((item) => item.kind === "cv")?.filename ||
    candidate?.cvFileName ||
    "CV";

  useEffect(() => {
    if (!application) return;

    setStage(application.stage);
    setRating(application.rating || 0);
    setTagText((application.recruiter_tags || []).join(", "));
    setNote(application.internal_note || "");
  }, [application]);

  useEffect(() => {
    async function loadEligibility() {
      try {
        const res = await fetchOnboardingEligibility();
        setOnboardingEligible(Boolean(res?.eligible));
      } catch {
        setOnboardingEligible(false);
      }
    }

    if (open) {
      void loadEligibility();
    }
  }, [open]);

  useEffect(() => {
    async function loadInterviewSlots() {
      if (!open || !application?.id) return;

      setInterviewSlotsLoading(true);
      setInterviewSlotsError(null);

      try {
        const json = await apiFetch(
          `/api/business/applications/${application.id}/interview-slots`
        );

        const raw = Array.isArray(json)
          ? json
          : (json as any)?.slots;
        setInterviewSlots(Array.isArray(raw) ? raw : []);
      } catch (error: any) {
        setInterviewSlots([]);
        setInterviewSlotsError(error?.message || "Could not load interview slots");
      } finally {
        setInterviewSlotsLoading(false);
      }
    }

    void loadInterviewSlots();
  }, [open, application?.id]);

  useEffect(() => {
    if (!application?.id) return;

    if (hasSentInterviewSlots) {
      const first = activeInterviewSlots[0];
      const currentWith = getInterviewWith(first);
      const currentMeeting = getMeetingLink(first);

      if (currentWith) setInterviewWith(currentWith);
      if (currentMeeting) {
        setMeetingLink(currentMeeting);
        setInterviewType("teams");
      }
      if (first?.location) {
        setInterviewLocation(first.location);
        setInterviewType("face");
      }
    } else {
      setEditingInterview(false);
      setInterviewWith("");
      setMeetingLink("");
      setInterviewLocation("");
      setInterviewType("teams");
      setDraftSlots(defaultSlots);
    }
  }, [application?.id, hasSentInterviewSlots, activeInterviewSlots]);

  async function reloadInterviewSlots() {
    if (!application?.id) return;

    setInterviewSlotsLoading(true);
    setInterviewSlotsError(null);

    try {
      const json = await apiFetch(
        `/api/business/applications/${application.id}/interview-slots`
      );

      const raw = Array.isArray(json)
        ? json
        : (json as any)?.slots;
      setInterviewSlots(Array.isArray(raw) ? raw : []);
    } catch (error: any) {
      setInterviewSlotsError(error?.message || "Could not load interview slots");
    } finally {
      setInterviewSlotsLoading(false);
    }
  }

  function updateDraftSlot(
    index: number,
    patch: Partial<InterviewDraftSlot>
  ) {
    setDraftSlots((prev) =>
      prev.map((slot, i) => (i === index ? { ...slot, ...patch } : slot))
    );
  }

  async function sendInterviewSlots() {
    if (!application?.id) return;

    const cleanedSlots = draftSlots
      .map((slot) => ({
        starts_at: toIsoFromDatetimeLocal(slot.starts_at),
        ends_at: toIsoFromDatetimeLocal(slot.ends_at),
      }))
      .filter(
        (slot): slot is { starts_at: string; ends_at: string } =>
          !!slot.starts_at && !!slot.ends_at
      );

    if (!interviewWith.trim()) {
      alert("Add who the interview is with, Name - Job Title.");
      return;
    }

    if (!cleanedSlots.length) {
      alert("Add at least one valid interview slot.");
      return;
    }

    if (interviewType === "face" && !interviewLocation.trim()) {
      alert("Add the face-to-face interview location.");
      return;
    }

    if (interviewType !== "face" && !meetingLink.trim()) {
      alert("Add the Teams, Google Meet, or Zoom meeting link.");
      return;
    }

    const invalidSlot = cleanedSlots.find((slot) => {
      const start = new Date(slot.starts_at);
      const end = new Date(slot.ends_at);
      return Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start;
    });

    if (invalidSlot) {
      alert("Each interview slot must have an end time after its start time.");
      return;
    }

    setSendingSlots(true);

    try {
      await apiFetch(`/api/business/applications/${application.id}/interview-slots`, {
        method: "POST",
        body: JSON.stringify({
          slots: cleanedSlots.map((slot) => ({
            starts_at: slot.starts_at,
            ends_at: slot.ends_at,
            timezone: "Europe/London",
            meeting_link: interviewType !== "face" ? meetingLink.trim() : null,
            meeting_url: interviewType !== "face" ? meetingLink.trim() : null,
            location: interviewType === "face" ? interviewLocation.trim() : null,
            notes: interviewWith.trim(),
          })),
        }),
      });

      setEditingInterview(false);
      setDraftSlots(defaultSlots);
      await reloadInterviewSlots();
      alert(hasSentInterviewSlots ? "Updated interview options sent." : "Interview options sent.");
    } catch (error: any) {
      alert(error?.message || "Could not send interview options.");
    } finally {
      setSendingSlots(false);
    }
  }

  async function handleStartOnboarding() {
    if (!application?.id) return;

    setStartingOnboarding(true);
    try {
      await startOnboarding(application.id);
      window.location.href = `/onboarding?applicationId=${application.id}`;
    } catch {
      alert("Could not start onboarding right now.");
    } finally {
      setStartingOnboarding(false);
    }
  }

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex justify-end bg-black/30 backdrop-blur-[1px]">
        <div className="h-full w-full max-w-[620px] overflow-y-auto border-l border-hier-border bg-white shadow-panel">
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-hier-border bg-white/90 px-6 py-5 backdrop-blur-xl">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-hier-muted">
                Application detail
              </p>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight text-hier-text">
                {displayName}
              </h2>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-hier-border bg-white text-hier-text transition hover:bg-hier-soft"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-6 px-6 py-6">
            {loading ? (
              <div className="rounded-[24px] border border-hier-border bg-hier-panel p-6 text-sm text-hier-muted">
                Loading candidate detail…
              </div>
            ) : null}

            <section className="rounded-[28px] border border-hier-border bg-white p-6 shadow-card">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-hier-text">{displayName}</p>
                  <p className="mt-2 text-sm leading-6 text-hier-muted">{headline}</p>
                </div>

                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={displayName}
                    className="h-14 w-14 rounded-[20px] object-cover"
                  />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-hier-primary/15 text-lg font-semibold text-hier-ink">
                    {displayName
                      .split(" ")
                      .map((part) => part[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                )}
              </div>

              <div className="mt-5 grid gap-3 text-sm text-hier-muted sm:grid-cols-2">
                {email ? (
                  <div className="inline-flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    {email}
                  </div>
                ) : null}

                {phone ? (
                  <div className="inline-flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    {phone}
                  </div>
                ) : null}

                {location ? (
                  <div className="inline-flex items-center gap-2 sm:col-span-2">
                    <MapPin className="h-4 w-4" />
                    {location}
                  </div>
                ) : null}
              </div>

              {candidate?.summary || candidate?.about ? (
                <p className="mt-5 rounded-[22px] bg-hier-panel px-4 py-4 text-sm leading-7 text-hier-muted">
                  {candidate?.summary || candidate?.about}
                </p>
              ) : null}
            </section>

            <section className="rounded-[28px] border border-hier-border bg-white p-6 shadow-card">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-hier-text">Onboarding</p>
                  <p className="mt-2 text-sm leading-6 text-hier-muted">
                    Launch a premium onboarding flow for contracts, document collection,
                    payroll setup, and start-readiness.
                  </p>
                </div>

                <span className="rounded-full bg-hier-soft px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-hier-primary">
                  Premium
                </span>
              </div>

              {onboardingEligible === false ? (
                <div className="mt-5 rounded-[22px] border border-hier-border bg-hier-panel px-4 py-4">
                  <p className="text-sm leading-6 text-hier-muted">
                    Upgrade to <span className="font-semibold text-hier-text">Hier</span> or{" "}
                    <span className="font-semibold text-hier-text">Hier Pro</span> to
                    onboard candidates, collect documents, share contracts, and manage
                    pre-start tasks.
                  </p>
                </div>
              ) : (
                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleStartOnboarding}
                    disabled={startingOnboarding || !application?.id}
                    className="inline-flex h-12 items-center justify-center rounded-[20px] bg-hier-primary px-5 text-sm font-semibold text-white shadow-card disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {startingOnboarding ? "Starting…" : "Start onboarding"}
                  </button>

                  <a
                    href="/onboarding"
                    className="inline-flex h-12 items-center justify-center rounded-[20px] border border-hier-border px-5 text-sm font-medium text-hier-ink transition hover:bg-hier-panel"
                  >
                    Open onboarding workspace
                  </a>
                </div>
              )}
            </section>

            <section className="rounded-[28px] border border-hier-border bg-white p-6 shadow-card">
              <div className="grid gap-5 sm:grid-cols-2">
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-hier-text">Stage</span>
                  <select
                    value={stage}
                    onChange={(event) =>
                      setStage(event.target.value as ApplicationStage)
                    }
                    className="h-12 w-full rounded-2xl border border-hier-border bg-hier-panel px-4 text-sm text-hier-text outline-none focus:border-hier-primary focus:bg-white"
                  >
                    {stageOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="space-y-2">
                  <span className="text-sm font-medium text-hier-text">Rating</span>
                  <div className="flex items-center gap-2 rounded-2xl border border-hier-border bg-hier-panel px-4 py-3">
                    {Array.from({ length: 5 }).map((_, index) => {
                      const value = index + 1;
                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setRating(value)}
                          className="text-amber-500"
                        >
                          <Star
                            className={`h-5 w-5 ${
                              value <= rating ? "fill-current" : "text-hier-border"
                            }`}
                          />
                        </button>
                      );
                    })}

                    <button
                      type="button"
                      onClick={() => setRating(0)}
                      className="ml-auto text-xs font-medium text-hier-muted hover:text-hier-text"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              </div>

              <label className="mt-5 block space-y-2">
                <span className="text-sm font-medium text-hier-text">
                  Recruiter tags
                </span>
                <input
                  value={tagText}
                  onChange={(event) => setTagText(event.target.value)}
                  placeholder="React, leadership, strong CV"
                  className="h-12 w-full rounded-2xl border border-hier-border bg-hier-panel px-4 text-sm text-hier-text outline-none focus:border-hier-primary focus:bg-white"
                />
              </label>

              <label className="mt-5 block space-y-2">
                <span className="text-sm font-medium text-hier-text">Internal note</span>
                <textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  rows={6}
                  placeholder="Add recruiter notes, interview prep points, or concerns"
                  className="w-full rounded-[22px] border border-hier-border bg-hier-panel px-4 py-3 text-sm leading-6 text-hier-text outline-none focus:border-hier-primary focus:bg-white"
                />
              </label>

              <div className="mt-5 flex flex-wrap gap-2">
                {parsedTags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-hier-soft px-3 py-1 text-xs font-medium text-hier-ink"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() =>
                    onSave({
                      stage,
                      rating: rating || null,
                      recruiter_tags: parsedTags,
                      internal_note: note.trim() || null,
                    })
                  }
                  className="inline-flex h-12 items-center justify-center rounded-[20px] bg-hier-primary px-5 text-sm font-semibold text-white shadow-card disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "Saving…" : "Save recruiter updates"}
                </button>

                {application?.first_cv_download_url ? (
                  <button
                    type="button"
                    onClick={() => {
                      setShowCvModal(true);
                      onOpenCv();
                    }}
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-[20px] border border-hier-border px-5 text-sm font-medium text-hier-ink transition hover:bg-hier-panel"
                  >
                    {cvPreviewLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ExternalLink className="h-4 w-4" />
                    )}
                    View CV
                  </button>
                ) : null}
              </div>
            </section>

            <section className="rounded-[28px] border border-hier-border bg-white p-6 shadow-card">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-hier-text">Interview</h3>
                  <p className="mt-2 text-sm leading-6 text-hier-muted">
                    Send interview options for the candidate to choose from in the app.
                  </p>
                </div>

                <span className="rounded-full bg-hier-soft px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-hier-primary">
                  Scheduling
                </span>
              </div>

              {interviewSlotsLoading ? (
                <div className="mt-5 inline-flex items-center gap-2 text-sm text-hier-muted">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading interview slots…
                </div>
              ) : null}

              {interviewSlotsError ? (
                <div className="mt-5 rounded-[20px] border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {interviewSlotsError}
                </div>
              ) : null}

              {bookedSlot ? (
                <div className="mt-5 rounded-[22px] border border-emerald-200 bg-emerald-50 px-4 py-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" />
                    <div>
                      <p className="text-sm font-semibold text-emerald-900">
                        Accepted
                      </p>
                      <p className="mt-1 text-sm leading-6 text-emerald-800">
                        {fmtRange(bookedSlot)}
                      </p>
                      {getInterviewWith(bookedSlot) ? (
                        <p className="text-sm leading-6 text-emerald-800">
                          Interview with {getInterviewWith(bookedSlot)}
                        </p>
                      ) : null}
                      {bookedSlot.location ? (
                        <p className="text-sm leading-6 text-emerald-800">
                          Location: {bookedSlot.location}
                        </p>
                      ) : null}
                      {getMeetingLink(bookedSlot) ? (
                        <p className="break-all text-sm leading-6 text-emerald-800">
                          Link: {getMeetingLink(bookedSlot)}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
              ) : hasSentInterviewSlots ? (
                <div className="mt-5 rounded-[22px] border border-amber-200 bg-amber-50 px-4 py-4">
                  <div className="flex items-start gap-3">
                    <CalendarClock className="mt-0.5 h-5 w-5 text-amber-600" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-amber-900">
                        Interview slots sent
                      </p>
                      <p className="mt-1 text-sm leading-6 text-amber-800">
                        Awaiting candidate selection.
                      </p>
                      {getInterviewWith(activeInterviewSlots[0]) ? (
                        <p className="text-sm leading-6 text-amber-800">
                          Interview with {getInterviewWith(activeInterviewSlots[0])}
                        </p>
                      ) : null}

                      <div className="mt-3 space-y-2">
                        {activeInterviewSlots.map((slot) => (
                          <div
                            key={slot.id}
                            className="rounded-2xl bg-white/70 px-3 py-2 text-sm text-amber-900"
                          >
                            {fmtRange(slot)}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              {hasSentInterviewSlots && !editingInterview ? (
                <button
                  type="button"
                  onClick={() => setEditingInterview(true)}
                  className="mt-5 inline-flex h-11 items-center justify-center rounded-[18px] border border-hier-border px-4 text-sm font-semibold text-hier-ink transition hover:bg-hier-panel"
                >
                  Change interview options
                </button>
              ) : null}

              {showInterviewForm ? (
                <div className="mt-5 space-y-5">
                  <label className="block space-y-2">
                    <span className="text-sm font-medium text-hier-text">
                      Interview with
                    </span>
                    <input
                      value={interviewWith}
                      onChange={(event) => setInterviewWith(event.target.value)}
                      placeholder="e.g. Jake Allen - Sales Director"
                      className="h-12 w-full rounded-2xl border border-hier-border bg-hier-panel px-4 text-sm text-hier-text outline-none focus:border-hier-primary focus:bg-white"
                    />
                  </label>

                  <div className="space-y-2">
                    <span className="text-sm font-medium text-hier-text">
                      Interview method
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { value: "teams", label: "Teams" },
                        { value: "meet", label: "Google Meet" },
                        { value: "zoom", label: "Zoom" },
                        { value: "face", label: "Face to face" },
                      ].map((item) => {
                        const selected = interviewType === item.value;

                        return (
                          <button
                            key={item.value}
                            type="button"
                            onClick={() => setInterviewType(item.value as InterviewType)}
                            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                              selected
                                ? "bg-hier-primary text-white"
                                : "border border-hier-border bg-white text-hier-ink hover:bg-hier-panel"
                            }`}
                          >
                            {item.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {interviewType === "face" ? (
                    <label className="block space-y-2">
                      <span className="text-sm font-medium text-hier-text">
                        Interview location
                      </span>
                      <input
                        value={interviewLocation}
                        onChange={(event) => setInterviewLocation(event.target.value)}
                        placeholder="e.g. 48 Orchard Way, Grantham"
                        className="h-12 w-full rounded-2xl border border-hier-border bg-hier-panel px-4 text-sm text-hier-text outline-none focus:border-hier-primary focus:bg-white"
                      />
                    </label>
                  ) : (
                    <label className="block space-y-2">
                      <span className="text-sm font-medium text-hier-text">
                        Meeting link
                      </span>
                      <input
                        value={meetingLink}
                        onChange={(event) => setMeetingLink(event.target.value)}
                        placeholder="Teams / Zoom / Google Meet link"
                        className="h-12 w-full rounded-2xl border border-hier-border bg-hier-panel px-4 text-sm text-hier-text outline-none focus:border-hier-primary focus:bg-white"
                      />
                    </label>
                  )}

                  <div className="space-y-3">
                    <div>
                      <span className="text-sm font-medium text-hier-text">
                        Interview slots
                      </span>
                      <p className="mt-1 text-xs leading-5 text-hier-muted">
                        Add up to 3 options. The candidate will choose one in the app.
                      </p>
                    </div>

                    {draftSlots.map((slot, index) => (
                      <div
                        key={index}
                        className="rounded-[22px] border border-hier-border bg-hier-panel px-4 py-4"
                      >
                        <p className="text-sm font-semibold text-hier-text">
                          Slot {index + 1}
                        </p>

                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                          <label className="block space-y-2">
                            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-hier-muted">
                              Start
                            </span>
                            <input
                              type="datetime-local"
                              value={slot.starts_at}
                              onChange={(event) =>
                                updateDraftSlot(index, { starts_at: event.target.value })
                              }
                              className="h-11 w-full rounded-2xl border border-hier-border bg-white px-3 text-sm text-hier-text outline-none focus:border-hier-primary"
                            />
                          </label>

                          <label className="block space-y-2">
                            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-hier-muted">
                              End
                            </span>
                            <input
                              type="datetime-local"
                              value={slot.ends_at}
                              onChange={(event) =>
                                updateDraftSlot(index, { ends_at: event.target.value })
                              }
                              className="h-11 w-full rounded-2xl border border-hier-border bg-white px-3 text-sm text-hier-text outline-none focus:border-hier-primary"
                            />
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      disabled={sendingSlots || !application?.id}
                      onClick={sendInterviewSlots}
                      className="inline-flex h-12 items-center justify-center gap-2 rounded-[20px] bg-hier-primary px-5 text-sm font-semibold text-white shadow-card disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {sendingSlots ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Video className="h-4 w-4" />
                      )}
                      {sendingSlots
                        ? "Sending…"
                        : hasSentInterviewSlots
                          ? "Send updated options"
                          : "Send interview options"}
                    </button>

                    {editingInterview ? (
                      <button
                        type="button"
                        disabled={sendingSlots}
                        onClick={() => setEditingInterview(false)}
                        className="inline-flex h-12 items-center justify-center rounded-[20px] border border-hier-border px-5 text-sm font-medium text-hier-ink transition hover:bg-hier-panel disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Cancel edit
                      </button>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </section>

            <section className="rounded-[28px] border border-hier-border bg-white p-6 shadow-card">
              <h3 className="text-lg font-semibold text-hier-text">Application questions</h3>

              {questionAnswerRows.length ? (
                <div className="mt-4 space-y-3">
                  {questionAnswerRows.map((row, index) => (
                    <div
                      key={`${row.id}-${index}`}
                      className="rounded-[20px] bg-hier-panel px-4 py-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-semibold text-hier-text">
                          {row.question}
                        </p>

                        {row.required ? (
                          <span className="rounded-full bg-hier-soft px-2.5 py-1 text-[11px] font-semibold text-hier-primary">
                            Required
                          </span>
                        ) : null}
                      </div>

                      <p className="mt-2 text-sm leading-6 text-hier-muted">
                        {row.answer || "No answer provided"}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm text-hier-muted">
                  No application questions or answers were saved for this application.
                </p>
              )}
            </section>

            {application?.cover_letter ? (
              <section className="rounded-[28px] border border-hier-border bg-white p-6 shadow-card">
                <h3 className="text-lg font-semibold text-hier-text">Cover letter</h3>
                <p className="mt-4 rounded-[20px] bg-hier-panel px-4 py-4 text-sm leading-7 text-hier-muted">
                  {application.cover_letter}
                </p>
              </section>
            ) : null}

            {candidate?.experience && candidate.experience.length > 0 ? (
              <section className="rounded-[28px] border border-hier-border bg-white p-6 shadow-card">
                <h3 className="text-lg font-semibold text-hier-text">Experience</h3>

                <div className="mt-4 space-y-4">
                  {candidate.experience.slice(0, 4).map((item) => (
                    <div
                      key={item.id}
                      className="rounded-[20px] bg-hier-panel px-4 py-4"
                    >
                      <p className="text-sm font-semibold text-hier-text">
                        {item.title || "Role"}
                      </p>

                      <p className="mt-1 text-sm text-hier-muted">
                        {[item.company, item.period].filter(Boolean).join(" • ")}
                      </p>

                      {item.description ? (
                        <p className="mt-2 text-sm leading-6 text-hier-muted">
                          {item.description}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        </div>
      </div>

      <CVViewerModal
        open={showCvModal}
        url={cvPreviewUrl || null}
        loading={cvPreviewLoading}
        error={cvPreviewError || null}
        fileName={fileName}
        onClose={() => setShowCvModal(false)}
      />
    </>
  );
}
