"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AlertCircle, BriefcaseBusiness, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import {
  fetchStaffAssignees,
  fetchStaffCases,
  type StaffCase,
  type StaffTeamUser,
} from "@/lib/staff-crm";
import { getStoredUser } from "@/lib/auth";

function formatDate(value?: string | null) {
  if (!value) return "-";
  try {
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return "-";
  }
}

export default function StaffCasesPage() {
  const storedUser = getStoredUser();
  const canFilterStaff = ["admin", "owner"].includes(String(storedUser?.staff_role || "").toLowerCase());
  const [cases, setCases] = useState<StaffCase[]>([]);
  const [staffUsers, setStaffUsers] = useState<StaffTeamUser[]>([]);
  const [status, setStatus] = useState("open");
  const [ownerId, setOwnerId] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCases = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [casesResponse, staffResponse] = await Promise.all([
        fetchStaffCases({ status, owner_staff_user_id: canFilterStaff ? ownerId : undefined }),
        fetchStaffAssignees(),
      ]);
      setCases(casesResponse.items || []);
      setStaffUsers(staffResponse.staff || []);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not load cases.");
    } finally {
      setLoading(false);
    }
  }, [canFilterStaff, ownerId, status]);

  useEffect(() => {
    void loadCases();
  }, [loadCases]);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Hier staff"
        title="Cases"
        description="Account investigations and internal case threads."
      />

      {error ? (
        <div className="flex items-start gap-3 rounded-[24px] border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{error}</p>
        </div>
      ) : null}

      <section className="flex flex-wrap gap-3 rounded-[28px] border border-hier-border bg-white p-3 shadow-card">
        {["open", "pending", "closed", "all"].map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setStatus(value)}
            className={`rounded-[18px] px-4 py-2 text-sm font-semibold capitalize ${
              status === value ? "bg-hier-primary text-white" : "bg-hier-panel text-hier-muted"
            }`}
          >
            {value}
          </button>
        ))}
        {canFilterStaff ? (
          <select
            value={ownerId}
            onChange={(event) => setOwnerId(event.target.value)}
            className="h-10 rounded-[18px] border border-hier-border bg-hier-panel px-4 text-sm outline-none"
          >
            <option value="all">All owners</option>
            {staffUsers.map((staff) => (
              <option key={staff.id} value={staff.id}>
                {staff.full_name || staff.email}
              </option>
            ))}
          </select>
        ) : null}
      </section>

      {loading ? (
        <div className="rounded-[28px] border border-hier-border bg-white p-8 text-sm text-hier-muted">
          <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
          Loading cases...
        </div>
      ) : cases.length ? (
        <section className="grid gap-3 xl:grid-cols-2">
          {cases.map((item) => (
            <Link
              key={item.id}
              href={`/staff/cases/${item.id}`}
              className="rounded-[24px] border border-hier-border bg-white p-5 shadow-sm transition hover:border-hier-primary hover:shadow-card"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.12em] text-hier-muted">
                    Case #{item.id}
                  </p>
                  <h2 className="mt-1 text-base font-semibold text-hier-text">{item.title}</h2>
                </div>
                <span className="rounded-full bg-hier-panel px-3 py-1 text-xs font-semibold capitalize text-hier-muted">
                  {item.status}
                </span>
              </div>
              <p className="mt-3 text-sm text-hier-muted">{item.summary || "No summary yet."}</p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-hier-muted">
                <span className="rounded-full bg-hier-panel px-3 py-1">{item.account_name || `Account #${item.account_user_id}`}</span>
                <span className="rounded-full bg-hier-panel px-3 py-1">{item.owner_staff_name || "Unassigned"}</span>
                <span className="rounded-full bg-hier-panel px-3 py-1">{formatDate(item.updated_at)}</span>
              </div>
            </Link>
          ))}
        </section>
      ) : (
        <div className="rounded-[28px] border border-hier-border bg-white p-8 text-sm text-hier-muted">
          <BriefcaseBusiness className="mb-3 h-5 w-5 text-hier-primary" />
          No cases found.
        </div>
      )}
    </div>
  );
}
