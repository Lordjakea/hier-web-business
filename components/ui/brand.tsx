import Link from "next/link";
import Image from "next/image";
import { useState } from "react";

type HierBrandProps = {
  compact?: boolean;
};

export function HierBrand({ compact = false }: HierBrandProps) {
  const [logoFailed, setLogoFailed] = useState(false);

  return (
    <Link
      href="/candidates"
      className="flex items-center gap-3 transition-opacity hover:opacity-90"
    >
      <div className="flex h-11 items-center justify-center">
        {!logoFailed ? (
          <Image
            src="/hier-logo.png"
            alt="Hier"
            width={44}
            height={44}
            className="h-11 w-auto object-contain"
            onError={() => setLogoFailed(true)}
            priority
          />
        ) : (
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-hier-border bg-white text-sm font-semibold text-hier-text shadow-sm">
            H
          </div>
        )}
      </div>

      {!compact ? (
        <div className="flex flex-col leading-tight">
          <span className="text-xs font-semibold uppercase tracking-[0.22em] text-hier-muted">
            Hier
          </span>
          <span className="text-lg font-semibold text-hier-text">
            Business
          </span>
        </div>
      ) : null}
    </Link>
  );
}