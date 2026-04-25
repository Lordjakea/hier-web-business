"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  BriefcaseBusiness,
  CheckCircle2,
  Loader2,
  Search,
  ShieldCheck,
  UserRound,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import {
  fetchStaffMe,
  searchStaffAccounts,
  type StaffAccountSearchItem,
  type StaffMe,
} from "@/lib/staff-crm";

function formatDate(value?: string | null) {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(value));
  } catch {
    return "—";
  }
}

function accountLabel(account: StaffAccountSearchItem) {
  return account.account_type === "business" ? "Business" : "Candidate";
}

function statusPill(value?: string | boolean | null) {
  if (typeof value === "boolean") return value ? "Active" : "Inactive";
  return value || "—";
}

function AccountRow({ account }: { account: StaffAccountSearchItem }) {
  const Icon = account.account_type === "business" ? BriefcaseBusiness : UserRound;

  return (
    <Link
      href={`/staff/accounts/${account.user_id}`}
      className="grid gap-4 rounded-[24px] border border-hier-border bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-hier-primary hover:shadow-card lg:grid-cols-[1.4fr_1fr_0.8fr_0.8fr] lg:items-center"
    >
      <div className="flex min-w-0 items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-hier-soft text-hier-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-semibold text-hier-text">
              {account.display_name}
            </p>
            <span className="rounded-full bg-hier-panel px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-hier-muted">
              {accountLabel(account)}
            </span>
          </div>
          <p className="mt-1 truncate text-sm text-hier-muted">{account.email || "No email"}</p>
        </div>
      </div>

      <div className="space-y-1 text-sm">
        <p className="font-medium text-hier-text">{account.company_name || account.phone || "—"}</p>
        <p className="text-hier-muted">Role: {account.role || "—"}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <span className="rounded-full border border-hier-border bg-hier-panel px-3 py-1 text-xs font-medium text-hier-text">
          {statusPill(account.is_active)}
        </span>
        {account.email_verified ? (
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
            Verified
          </span>
        ) : null}
      </div>

      <div className="text-sm text-hier-muted lg:text-right">
        Created {formatDate(account.created_at)}
      </div>
    </Link>
  );
}

export default function StaffCrmPage() {
  const [staff, setStaff] = useState<StaffMe | null>(null);
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("all");
  const [accounts, setAccounts] = useState<StaffAccountSearchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const loadAccounts = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [staffResponse, accountsResponse] = await Promise.all([
        fetchStaffMe(),
        searchStaffAccounts({ q: query, role, per_page: 50 }),
      ]);

      setStaff(staffResponse.staff);
      setAccounts(accountsResponse.items || []);
      setTotal(accountsResponse.items?.length || 0);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not load Staff CRM."
      );
    } finally {
      setLoading(false);
    }
  }, [query, role]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadAccounts();
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [loadAccounts]);

  const stats = useMemo(() => {
    const businesses = accounts.filter((account) => account.account_type === "business").length;
    const candidates = accounts.filter((account) => account.account_type !== "business").length;
    const verified = accounts.filter((account) => account.email_verified).length;

    return [
      { label: "Visible results", value: String(accounts.length), icon: Users },
      { label: "Businesses", value: String(businesses), icon: BriefcaseBusiness },
      { label: "Candidates", value: String(candidates), icon: UserRound },
      { label: "Verified emails", value: String(verified), icon: CheckCircle2 },
    ];
  }, [accounts]);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Hier Staff"
        title="Staff CRM"
        description="Search candidate and business accounts, open a full support view, and record internal notes for the Hier team."
        action={
          staff ? (
            <div className="rounded-full border border-hier-border bg-white px-4 py-2 text-sm font-medium text-hier-text shadow-sm">
              {staff.email}
            </div>
          ) : null
        }
      />

      <section className="rounded-[32px] border border-hier-border bg-white p-5 shadow-card sm:p-6">
        <div className="grid gap-4 lg:grid-cols-[1fr_220px_auto] lg:items-end">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-hier-text">Search accounts</span>
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-hier-muted" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by email, name, phone, company or company number"
                className="h-14 w-full rounded-[22px] border border-hier-border bg-hier-panel pl-11 pr-4 text-sm text-hier-text outline-none transition focus:border-hier-primary focus:bg-white"
              />
            </div>
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-hier-text">Account type</span>
            <select
              value={role}
              onChange={(event) => setRole(event.target.value)}
              className="h-14 w-full rounded-[22px] border border-hier-border bg-hier-panel px-4 text-sm text-hier-text outline-none transition focus:border-hier-primary focus:bg-white"
            >
              <option value="all">All accounts</option>
              <option value="business_user">Businesses</option>
              <option value="user">Candidates</option>
              <option value="admin">Admins</option>
            </select>
          </label>

          <button
            type="button"
            onClick={() => void loadAccounts()}
            className="inline-flex h-14 items-center justify-center gap-2 rounded-[22px] bg-hier-primary px-5 text-sm font-semibold text-white shadow-card transition hover:opacity-90"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Search
          </button>
        </div>
      </section>

      {error ? (
        <div className="flex items-start gap-3 rounded-[24px] border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">Staff CRM unavailable</p>
            <p className="mt-1">{error}</p>
          </div>
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-[28px] border border-hier-border bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-hier-muted">{label}</p>
              <div className="rounded-2xl bg-hier-soft p-2 text-hier-primary">
                <Icon className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-4 text-3xl font-semibold text-hier-text">{value}</p>
          </div>
        ))}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-hier-text">Accounts</h2>
            <p className="mt-1 text-sm text-hier-muted">
              Showing {accounts.length} of {total} matching accounts.
            </p>
          </div>
          <div className="hidden items-center gap-2 rounded-full border border-hier-border bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-hier-muted sm:flex">
            <ShieldCheck className="h-4 w-4" />
            Staff only
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-[280px] items-center justify-center rounded-[32px] border border-hier-border bg-white">
            <Loader2 className="h-6 w-6 animate-spin text-hier-primary" />
          </div>
        ) : accounts.length ? (
          <div className="space-y-3">
            {accounts.map((account) => (
              <AccountRow key={`${account.account_type}-${account.user_id}`} account={account} />
            ))}
          </div>
        ) : (
          <div className="rounded-[32px] border border-dashed border-hier-border bg-white p-10 text-center">
            <p className="text-base font-semibold text-hier-text">No accounts found</p>
            <p className="mt-2 text-sm text-hier-muted">Try a different email, company name or phone number.</p>
          </div>
        )}
      </section>
    </div>
  );
}
