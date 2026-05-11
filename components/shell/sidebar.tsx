"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Bell,
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
  PhoneCall,
  CalendarClock,
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

const staffLinks = [
  { label: "Staff CRM", href: "/staff", icon: LifeBuoy, match: (path: string) => path === "/staff" || path.startsWith("/staff/accounts") },
  { label: "Notifications", href: "/staff/notifications", icon: Bell, match: (path: string) => path.startsWith("/staff/notifications") },
  { label: "Waitlist", href: "/staff/waitlist", icon: Mail, match: (path: string) => path.startsWith("/staff/waitlist") },
  { label: "Leads", href: "/staff/leads", icon: PhoneCall, match: (path: string) => path.startsWith("/staff/leads") },
  { label: "Follow-ups", href: "/staff/follow-ups", icon: CalendarClock, match: (path: string) => path.startsWith("/staff/follow-ups") },
  { label: "Cases", href: "/staff/cases", icon: BriefcaseBusiness, match: (path: string) => path.startsWith("/staff/cases") },
];

const staffReportingLinks = [
  { label: "Customer reporting", href: "/staff/customer-reports", icon: BarChart3 },
  { label: "Content reports", href: "/staff/reports", icon: Flag },
];

const staffPolicyLinks = [
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
    window.sessionStorage.setItem("hier_staff_return_account_id", supportTarget.id);

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

      {!isStaff ? (
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
      ) : null}

      {/* STAFF SECTION */}
      {isStaff ? (
        <nav className="space-y-2">
          <p className="px-3 text-xs font-semibold uppercase tracking-[0.2em] text-hier-muted">
            Hier Staff
          </p>

          {staffLinks.map(({ label, href, icon: Icon, match }) => (
            <Link
              key={label}
              href={href}
              className={clsx(
                "flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition",
                match(pathname)
                  ? "bg-hier-primary text-white shadow-card"
                  : "text-hier-ink hover:bg-hier-panel"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>
      ) : null}

      {/* REPORTING SECTION */}
      {isStaff ? (
        <nav className="space-y-2">
          <p className="px-3 text-xs font-semibold uppercase tracking-[0.2em] text-hier-muted">
            Reporting
          </p>

          {staffReportingLinks.map(({ label, href, icon: Icon }) => {
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
      ) : null}

      {/* Account */}
      <nav className="space-y-2">
        <p className="px-3 text-xs font-semibold uppercase tracking-[0.2em] text-hier-muted">
          {isStaff ? "Legal" : "Account"}
        </p>

        {(isStaff ? staffPolicyLinks : secondaryLinks).map(({ label, href, icon: Icon }) => {
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
