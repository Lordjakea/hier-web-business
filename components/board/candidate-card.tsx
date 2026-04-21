import {
  Brain,
  Clock3,
  FileText,
  MapPin,
  MessageSquareText,
  Star,
} from "lucide-react";
import type { BusinessApplication } from "@/lib/types";

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatApplied(dateString?: string | null) {
  if (!dateString) return "Recently";

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "Recently";

  const diffMs = Date.now() - date.getTime();
  const diffHours = Math.max(1, Math.round(diffMs / (1000 * 60 * 60)));

  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  return `${Math.round(diffDays / 7)}w ago`;
}

function getHIScore(candidate: BusinessApplication): number | null {
  const rawScore =
    candidate.hi_score ??
    candidate.score ??
    candidate.ai_score ??
    null;

  if (typeof rawScore === "number" && Number.isFinite(rawScore)) {
    return rawScore;
  }

  return null;
}

function scoreTone(score: number | null) {
  if (score === null) {
    return "bg-zinc-100 text-zinc-700";
  }

  if (score >= 25) {
    return "bg-emerald-50 text-emerald-700";
  }

  if (score >= 15) {
    return "bg-amber-50 text-amber-700";
  }

  return "bg-zinc-100 text-zinc-700";
}

export function CandidateCard({
  candidate,
  onOpen,
  onDragStart,
}: {
  candidate: BusinessApplication;
  onOpen: () => void;
  onDragStart?: () => void;
}) {
  const name =
    candidate.user?.display_name ||
    candidate.user?.full_name ||
    "Candidate";

  const headline =
    candidate.job_post?.title ||
    candidate.user?.email ||
    "Application";

  const location =
    candidate.user?.address_text ||
    candidate.job_post?.location_text ||
    candidate.job_post?.location ||
    "Location unavailable";

  const tags = (candidate.recruiter_tags || []).slice(0, 3);
  const rating = candidate.rating || 0;

  const note =
    candidate.internal_note ||
    (candidate.cv_view_count
      ? `CV viewed ${candidate.cv_view_count} times`
      : "Awaiting recruiter action");

  const avatarUrl = candidate.user?.avatar_url || null;
  const initials = getInitials(name);
  const hiScore = getHIScore(candidate);

  return (
    <article
      draggable
      onDragStart={onDragStart}
      className="rounded-[22px] border border-hier-border bg-white p-4 shadow-card transition hover:-translate-y-0.5 hover:shadow-panel"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-sm font-semibold text-hier-text">
              {name}
            </h3>

            {hiScore !== null ? (
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${scoreTone(
                  hiScore,
                )}`}
                title="Hier Intelligence Score"
              >
                <Brain className="h-3.5 w-3.5" />
                HI Score {hiScore.toFixed(1)}
              </span>
            ) : null}
          </div>

          <p className="mt-1 line-clamp-2 text-sm leading-5 text-hier-muted">
            {headline}
          </p>
        </div>

        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={name}
            className="h-10 w-10 rounded-2xl object-cover"
          />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-hier-primary/15 text-sm font-semibold text-hier-ink">
            {initials}
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {tags.length > 0 ? (
          tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-hier-soft px-2.5 py-1 text-[11px] font-medium text-hier-ink"
            >
              {tag}
            </span>
          ))
        ) : (
          <span className="rounded-full bg-hier-panel px-2.5 py-1 text-[11px] font-medium text-hier-muted">
            No tags yet
          </span>
        )}
      </div>

      <div className="mt-4 space-y-2 text-xs text-hier-muted">
        <div className="flex items-center gap-2">
          <MapPin className="h-3.5 w-3.5" />
          <span>{location}</span>
        </div>

        <div className="flex items-center gap-2">
          <Clock3 className="h-3.5 w-3.5" />
          <span>Applied {formatApplied(candidate.created_at)}</span>
        </div>

        <div className="flex items-center gap-2">
          <MessageSquareText className="h-3.5 w-3.5" />
          <span>{note}</span>
        </div>

        {candidate.first_cv_download_url ? (
          <div className="flex items-center gap-2">
            <FileText className="h-3.5 w-3.5" />
            <span>CV available</span>
          </div>
        ) : null}
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-hier-border pt-3">
        <div className="flex items-center gap-1 text-amber-500">
          {Array.from({ length: 5 }).map((_, index) => (
            <Star
              key={index}
              className={`h-3.5 w-3.5 ${
                index < rating ? "fill-current" : "text-hier-border"
              }`}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={onOpen}
          className="rounded-full border border-hier-border px-3 py-1.5 text-[11px] font-semibold text-hier-ink transition hover:border-hier-primary hover:bg-hier-soft"
        >
          Open candidate
        </button>
      </div>
    </article>
  );
}