"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ExternalLink,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Star,
  X,
} from "lucide-react";

import { CVViewerModal } from "@/components/board/cv-viewer-modal";
import { fetchOnboardingEligibility, startOnboarding } from "@/lib/business-onboarding";
import { boardColumns } from "@/lib/theme";
import type {
  ApplicationStage,
  BusinessApplication,
  BusinessCandidate,
} from "@/lib/types";

const stageOptions = boardColumns.map((column) => ({
  value: column.id,
  label: column.title,
}));

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

  const parsedTags = useMemo(
    () =>
      tagText
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 20),
    [tagText]
  );

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