"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BriefcaseBusiness,
  CreditCard,
  LayoutGrid,
  Megaphone,
  Shield,
  UserCog,
  ClipboardCheck,
  X,
} from "lucide-react";
import clsx from "clsx";
import { HierBrand } from "@/components/ui/brand";

const primaryLinks = [
  { label: "Candidates", href: "/candidates", icon: LayoutGrid },
  { label: "Analytics Pro", href: "/analytics", icon: BarChart3 },
  { label: "Posts", href: "/jobs", icon: BriefcaseBusiness },
  { label: "Promote", href: "/promote", icon: Megaphone },
  { label: "Billing", href: "/billing", icon: CreditCard },
  { label: "Onboarding", href: "/onboarding", icon: ClipboardCheck },
];

const secondaryLinks = [
  { label: "Profile management", href: "/settings/profile", icon: UserCog },
  { label: "Policies", href: "/settings/policies", icon: Shield },
];

export function Sidebar({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();

  const content = (
    <div className="flex h-full flex-col gap-8 border-r border-hier-border bg-white px-4 py-5">
      <div className="flex items-center justify-between lg:justify-start">
        <HierBrand />

        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-hier-border bg-white text-hier-text transition hover:bg-hier-soft lg:hidden"
          aria-label="Close sidebar"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="rounded-[24px] border border-hier-border bg-hier-soft p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-hier-muted">
          Workspace
        </p>
        <h2 className="mt-2 text-lg font-semibold text-hier-text">
          Business control centre
        </h2>
        <p className="mt-2 text-sm leading-6 text-hier-muted">
          Live applicant pipeline powered by your real business applications
          endpoints.
        </p>
      </div>

      <nav className="space-y-2">
        <p className="px-3 text-xs font-semibold uppercase tracking-[0.2em] text-hier-muted">
          Main
        </p>

        {primaryLinks.map(({ label, href, icon: Icon }) => {
          const active = pathname.startsWith(href);

          return (
            <Link
              key={label}
              href={href}
              className={clsx(
                "flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition",
                active
                  ? "bg-hier-primary text-white shadow-card"
                  : "text-hier-ink hover:bg-hier-panel"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>

      <nav className="space-y-2">
        <p className="px-3 text-xs font-semibold uppercase tracking-[0.2em] text-hier-muted">
          Account
        </p>

        {secondaryLinks.map(({ label, href, icon: Icon }) => {
          const active = pathname.startsWith(href);

          return (
            <Link
              key={label}
              href={href}
              className={clsx(
                "flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition",
                active
                  ? "bg-hier-panel text-hier-text"
                  : "text-hier-muted hover:bg-hier-panel hover:text-hier-text"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto rounded-[24px] border border-hier-border bg-hier-panel p-4">
        <p className="text-sm font-semibold text-hier-text">
          Clean integration layer
        </p>
        <p className="mt-2 text-sm leading-6 text-hier-muted">
          Board data, detail drawer, and recruiter updates now hang off the real
          business application routes.
        </p>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden w-[292px] shrink-0 lg:block">{content}</aside>

      {open ? (
        <div className="fixed inset-0 z-50 bg-black/35 lg:hidden">
          <div className="h-full w-[92%] max-w-[320px] bg-white shadow-panel">
            {content}
          </div>
        </div>
      ) : null}
    </>
  );
}