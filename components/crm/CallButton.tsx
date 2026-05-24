"use client";

import { PhoneCall } from "lucide-react";
import { createStaffCallActivity } from "@/lib/staff-calls";

type CallButtonProps = {
  phoneNumber?: string | null;
  candidateId?: number | null;
  applicationId?: number | null;
  leadId?: number | null;
  accountUserId?: number | null;
  className?: string;
};

function telHref(phoneNumber: string) {
  return `tel:${phoneNumber.replace(/[^\d+]/g, "")}`;
}

export function CallButton({
  phoneNumber,
  candidateId,
  applicationId,
  leadId,
  accountUserId,
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
      data-lead-id={leadId ?? undefined}
      data-account-user-id={accountUserId ?? undefined}
      onClick={() => {
        void createStaffCallActivity({
          phone_number: cleaned,
          staff_lead_id: leadId ?? null,
          account_user_id: accountUserId ?? null,
        }).then(() => {
          window.dispatchEvent(
            new CustomEvent("hier:staff-call-created", {
              detail: { leadId, accountUserId },
            })
          );
        });
      }}
      className={`${baseClass} bg-hier-primary text-white hover:brightness-95 ${className}`}
    >
      <PhoneCall className="h-4 w-4" aria-hidden="true" />
      Call
    </a>
  );
}
