"use client";

import { PhoneCall } from "lucide-react";

type CallButtonProps = {
  phoneNumber?: string | null;
  candidateId?: number | null;
  applicationId?: number | null;
  className?: string;
};

function telHref(phoneNumber: string) {
  return `tel:${phoneNumber.replace(/[^\d+]/g, "")}`;
}

export function CallButton({
  phoneNumber,
  candidateId,
  applicationId,
  className = "",
}: CallButtonProps) {
  const cleaned = (phoneNumber || "").trim();
  const baseClass =
    "inline-flex h-12 items-center justify-center gap-2 rounded-[20px] px-5 text-sm font-semibold shadow-card transition";

  if (!cleaned) {
    return (
      <button
        type="button"
        disabled
        className={`${baseClass} cursor-not-allowed border border-hier-border bg-hier-panel text-hier-muted opacity-70 ${className}`}
      >
        <PhoneCall className="h-4 w-4" aria-hidden="true" />
        Call
      </button>
    );
  }

  return (
    <a
      href={telHref(cleaned)}
      data-candidate-id={candidateId ?? undefined}
      data-application-id={applicationId ?? undefined}
      className={`${baseClass} bg-hier-primary text-white hover:brightness-95 ${className}`}
    >
      <PhoneCall className="h-4 w-4" aria-hidden="true" />
      Call
    </a>
  );
}
