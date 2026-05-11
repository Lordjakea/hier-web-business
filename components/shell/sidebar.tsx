"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BriefcaseBusiness,
  CreditCard,
  LayoutGrid,
  LifeBuoy,
  Megaphone,
  Shield,
  UserCog,
  ClipboardCheck,
  Users,
  Mail,
  X,
  Flag,
} from "lucide-react";
import clsx from "clsx";
import { getAuthToken, getStoredUser, setAuthToken, setStoredUser } from "@/lib/auth";
import { HierBrand } from "@/components/ui/brand";
import { createStaffSupportSession } from "@/lib/staff-crm";
import { useEffect, useState } from "react";

const primaryLinks = [
  { label: "Candidates", href: "/candidates", icon: LayoutGrid },
  { label: "Analytics Pro", href: "/analytics", icon: BarChart3 },
  { label: "Posts", href: "/jobs", icon: BriefcaseBusiness },
  { label: "Promote", href: "/promote", icon: Megaphone },
  { label: "Billing", href: "/billing", icon: CreditCard },
  { label: "Onboarding", href: "/onboarding", icon: ClipboardCheck },
  { label: "Employee Records", href: "/employee-records", icon: Users },
];

const secondaryLinks = [
  { label: "Team", href: "/team", icon: Users },
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
  const storedUser = getStoredUser();
  const [supportTarget, setSupportTarget] = useState<{ id: string; name: string } | null>(null);

  const isStaff = Boolean(
    storedUser?.role === "staff" &&
      storedUser?.email_verified &&
      storedUser?.email?.toLowerCase().endsWith("@hierapp.co.uk")
  );

  const canManageStaff = ["admin", "owner"].includes(
    String(storedUser?.staff_role || "").toLowerCase()
  );

  useEffect(() => {
    const id = window.sessionStorage.getItem("hier_staff_selected_account_id");
    const name = window.sessionStorage.getItem("hier_staff_selected_account_name");
    setSupportTarget(id ? { id, name: name || `Account #${id}` } : null);
  }, [pathname]);

  async function openSupportLink(event: React.MouseEvent<HTMLAnchorElement>, href: string) {
    if (!isStaff || !supportTarget?.id) return;

    event.preventDefault();

    const staffToken = getAuthToken();
    const staffUser = getStoredUser();

    if (staffToken) window.sessionStorage.setItem("hier_staff_return_token", staffToken);
    if (staffUser) window.sessionStorage.setItem("hier_staff_return_user", JSON.stringify(staffUser));

    const response = await createStaffSupportSession(supportTarget.id);
    setAuthToken(response.access_token);
    setStoredUser(response.user);
    window.location.href = href;
  }

  const content = (
    <div className="flex h-full min-h-0 flex-col gap-8 overflow-y-auto overscroll-contain border-r border-hier-border bg-white px-4 py-5 [-webkit-overflow-scrolling:touch]">
      {/* Header */}
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

      {/* Main */}
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
              onClick={(event) => void openSupportLink(event, href)}
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

      {/* STAFF SECTION */}
      {isStaff ? (
        <nav className="space-y-2">
          {supportTarget ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-3 text-xs font-semibold text-amber-900">
              Support target: {supportTarget.name}
            </div>
          ) : null}

          <p className="px-3 text-xs font-semibold uppercase tracking-[0.2em] text-hier-muted">
            Hier Staff
          </p>

          {/* CRM */}
          <Link
            href="/staff"
            className={clsx(
              "flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition",
              pathname === "/staff" || pathname.startsWith("/staff/accounts")
                ? "bg-hier-primary text-white shadow-card"
                : "text-hier-ink hover:bg-hier-panel"
            )}
          >
            <LifeBuoy className="h-4 w-4" />
            Staff CRM
          </Link>

          {/* WAITLIST */}
          <Link
            href="/staff/waitlist"
            className={clsx(
              "flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition",
              pathname.startsWith("/staff/waitlist")
                ? "bg-hier-primary text-white shadow-card"
                : "text-hier-ink hover:bg-hier-panel"
            )}
          >
            <Mail className="h-4 w-4" />
            Waitlist
          </Link>

          {/* REPORTS */}
          <Link
            href="/staff/reports"
            className={clsx(
              "flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition",
              pathname.startsWith("/staff/reports")
                ? "bg-hier-primary text-white shadow-card"
                : "text-hier-ink hover:bg-hier-panel"
            )}
          >
            <Flag className="h-4 w-4" />
            Reports
          </Link>

          {/* TEAM */}
          {canManageStaff ? (
            <Link
              href="/staff/team"
              className={clsx(
                "flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition",
                pathname.startsWith("/staff/team")
                  ? "bg-hier-primary text-white shadow-card"
                  : "text-hier-ink hover:bg-hier-panel"
              )}
            >
              <Users className="h-4 w-4" />
              Staff team
            </Link>
          ) : null}
        </nav>
      ) : null}

      {/* Account */}
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

    </div>
  );

  return (
    <>
      <aside className="sticky top-0 hidden h-screen w-[292px] shrink-0 lg:block">
        {content}
      </aside>

      {open ? (
        <div className="fixed inset-0 z-50 bg-black/35 lg:hidden">
          <div className="h-dvh w-[92%] max-w-[320px] bg-white shadow-panel">
            {content}
          </div>
        </div>
      ) : null}
    </>
  );
}
