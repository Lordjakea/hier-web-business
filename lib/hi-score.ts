export type HIScoreColour = "green" | "blue" | "amber" | "red";
export type HIScoreBand = "strong" | "review" | "maybe" | "low";

export type HIScoreInput = {
  hi_score?: number | null;
  score?: number | null;
  ai_score?: number | null;
  score_band?: HIScoreBand | string | null;
  score_label?: string | null;
  score_colour?: HIScoreColour | string | null;
  score_color?: HIScoreColour | string | null;
} | null | undefined;

type HIScoreTone = {
  band: HIScoreBand | null;
  colour: HIScoreColour | null;
  label: string | null;
  score: number | null;
  badgeClass: string;
  dotClass: string;
  panelClass: string;
};

const toneClasses: Record<HIScoreColour, Pick<HIScoreTone, "badgeClass" | "dotClass" | "panelClass">> = {
  green: {
    badgeClass: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100",
    dotClass: "bg-emerald-500",
    panelClass: "border-emerald-100 bg-emerald-50 text-emerald-800",
  },
  blue: {
    badgeClass: "bg-sky-50 text-sky-700 ring-1 ring-sky-100",
    dotClass: "bg-sky-500",
    panelClass: "border-sky-100 bg-sky-50 text-sky-800",
  },
  amber: {
    badgeClass: "bg-amber-50 text-amber-700 ring-1 ring-amber-100",
    dotClass: "bg-amber-500",
    panelClass: "border-amber-100 bg-amber-50 text-amber-800",
  },
  red: {
    badgeClass: "bg-rose-50 text-rose-700 ring-1 ring-rose-100",
    dotClass: "bg-rose-500",
    panelClass: "border-rose-100 bg-rose-50 text-rose-800",
  },
};

const fallbackTone = {
  badgeClass: "bg-zinc-100 text-zinc-700 ring-1 ring-zinc-200",
  dotClass: "bg-zinc-400",
  panelClass: "border-zinc-200 bg-zinc-50 text-zinc-700",
};

function toScore(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function normalizeColour(value: unknown): HIScoreColour | null {
  if (value === "green" || value === "blue" || value === "amber" || value === "red") {
    return value;
  }

  return null;
}

function fallbackBand(score: number | null): Pick<HIScoreTone, "band" | "colour" | "label"> {
  if (score === null) {
    return { band: null, colour: null, label: null };
  }

  if (score >= 78) {
    return { band: "strong", colour: "green", label: "Strong shortlist" };
  }

  if (score >= 58) {
    return { band: "review", colour: "blue", label: "Review" };
  }

  if (score >= 38) {
    return { band: "maybe", colour: "amber", label: "Maybe" };
  }

  return { band: "low", colour: "red", label: "Low match" };
}

export function getHIScore(input: HIScoreInput) {
  return toScore(input?.hi_score) ?? toScore(input?.score) ?? toScore(input?.ai_score);
}

export function resolveHIScore(input: HIScoreInput): HIScoreTone {
  const score = getHIScore(input);
  const fallback = fallbackBand(score);
  const colour = normalizeColour(input?.score_colour) ?? normalizeColour(input?.score_color) ?? fallback.colour;
  const classes = colour ? toneClasses[colour] : fallbackTone;

  return {
    score,
    band: (input?.score_band as HIScoreBand | null) ?? fallback.band,
    colour,
    label: input?.score_label ?? fallback.label,
    ...classes,
  };
}
