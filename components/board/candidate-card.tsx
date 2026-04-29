import { Brain, CheckCircle2, Eye, XCircle } from "lucide-react";
import type { ApplicationStage, BusinessApplication } from "@/lib/types";

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function getHIScore(candidate: BusinessApplication): number | null {
  const rawScore = candidate.hi_score ?? candidate.score ?? candidate.ai_score ?? null;
  return typeof rawScore === "number" && Number.isFinite(rawScore) ? rawScore : null;
}

function scoreTone(score: number | null) {
  if (score === null) return "bg-zinc-100 text-zinc-700";
  if (score >= 25) return "bg-emerald-50 text-emerald-700";
  if (score >= 15) return "bg-amber-50 text-amber-700";
  return "bg-zinc-100 text-zinc-700";
}

export function CandidateCard({
  candidate,
  selected,
  onSelectChange,
  onOpen,
  onNextStage,
  onReject,
  onDragStart,
}: {
  candidate: BusinessApplication;
  selected?: boolean;
  onSelectChange?: (checked: boolean) => void;
  onOpen: () => void;
  onNextStage?: () => void;
  onReject?: () => void;
  onDragStart?: () => void;
}) {
  const name =
    candidate.user?.display_name ||
    candidate.user?.full_name ||
    "Candidate";

  const avatarUrl = candidate.user?.avatar_url || null;
  const initials = getInitials(name);
  const hiScore = getHIScore(candidate);

  return (
    <article
      draggable
      onDragStart={onDragStart}
      className={`rounded-[18px] border bg-white p-3 shadow-sm transition hover:shadow-card ${
        selected ? "border-hier-primary ring-2 ring-hier-primary/15" : "border-hier-border"
      }`}
    >
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={Boolean(selected)}
          onChange={(event) => onSelectChange?.(event.target.checked)}
          onClick={(event) => event.stopPropagation()}
          className="h-4 w-4 rounded border-hier-border accent-hier-primary"
          aria-label={`Select ${name}`}
        />

        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={name}
            className="h-9 w-9 shrink-0 rounded-2xl object-cover"
          />
        ) : (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-hier-primary/15 text-xs font-semibold text-hier-ink">
            {initials}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-hier-text">{name}</p>

          <div className="mt-1 flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${scoreTone(
                hiScore,
              )}`}
              title="Hier Intelligence Score"
            >
              <Brain className="h-3 w-3" />
              {hiScore === null ? "No Hi Score" : `Hi ${hiScore.toFixed(1)}`}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={onOpen}
          className="inline-flex h-9 items-center justify-center gap-1 rounded-xl border border-hier-border bg-white px-2 text-[11px] font-semibold text-hier-text transition hover:bg-hier-soft"
        >
          <Eye className="h-3.5 w-3.5" />
          Open
        </button>

        <button
          type="button"
          onClick={onNextStage}
          disabled={!onNextStage}
          className="inline-flex h-9 items-center justify-center gap-1 rounded-xl border border-hier-border bg-white px-2 text-[11px] font-semibold text-hier-text transition hover:bg-hier-soft disabled:cursor-not-allowed disabled:opacity-40"
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          Next
        </button>

        <button
          type="button"
          onClick={onReject}
          disabled={!onReject}
          className="inline-flex h-9 items-center justify-center gap-1 rounded-xl border border-rose-100 bg-rose-50 px-2 text-[11px] font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <XCircle className="h-3.5 w-3.5" />
          Reject
        </button>
      </div>
    </article>
  );
}