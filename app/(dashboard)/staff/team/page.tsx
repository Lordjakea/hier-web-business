"use client";

import { useEffect, useMemo, useState } from "react";
import { MailPlus, RefreshCw, ShieldCheck, Users } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { createStaffInvite, fetchStaffTeam, type StaffInvite, type StaffTeamUser } from "@/lib/staff-crm";

const roleOptions = [
  { value: "viewer", label: "Viewer" },
  { value: "support", label: "Support" },
  { value: "admin", label: "Admin" },
  { value: "owner", label: "Owner" },
];

function formatDate(value?: string | null) {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function StatusBadge({ value }: { value?: string | null }) {
  const text = value || "unknown";
  return (
    <span className="rounded-full border border-hier-border bg-hier-soft px-3 py-1 text-xs font-semibold capitalize text-hier-text">
      {text.replaceAll("_", " ")}
    </span>
  );
}

export default function StaffTeamPage() {
  const [staff, setStaff] = useState<StaffTeamUser[]>([]);
  const [invites, setInvites] = useState<StaffInvite[]>([]);
  const [email, setEmail] = useState("");
  const [staffRole, setStaffRole] = useState("support");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [devInviteUrl, setDevInviteUrl] = useState<string | null>(null);

  const pendingInvites = useMemo(
    () => invites.filter((invite) => invite.status === "pending"),
    [invites]
  );

  async function loadTeam() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchStaffTeam();
      setStaff(response.staff || []);
      setInvites(response.invites || []);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not load staff team.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTeam();
  }, []);

  async function handleInvite(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    setError(null);
    setSuccess(null);
    setDevInviteUrl(null);

    try {
      const response = await createStaffInvite(email, staffRole);
      setEmail("");
      setStaffRole("support");
      setSuccess(response.warning === "email_send_failed" ? "Invite created, but email sending failed. Use the dev link shown below." : "Invite sent.");
      setDevInviteUrl(response.invite_url || null);
      await loadTeam();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not send invite.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Hier Staff"
        title="Staff team"
        description="Invite Hier staff into the internal CRM without making them create a candidate or business account."
        action={
          <button
            type="button"
            onClick={loadTeam}
            className="inline-flex items-center gap-2 rounded-2xl border border-hier-border bg-white px-4 py-3 text-sm font-semibold text-hier-text shadow-card transition hover:bg-hier-soft"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-[28px] border border-hier-border bg-white p-5 shadow-card">
          <Users className="h-5 w-5 text-hier-primary" />
          <p className="mt-4 text-3xl font-semibold text-hier-text">{staff.length}</p>
          <p className="mt-1 text-sm text-hier-muted">Active staff users</p>
        </div>
        <div className="rounded-[28px] border border-hier-border bg-white p-5 shadow-card">
          <MailPlus className="h-5 w-5 text-hier-primary" />
          <p className="mt-4 text-3xl font-semibold text-hier-text">{pendingInvites.length}</p>
          <p className="mt-1 text-sm text-hier-muted">Pending invites</p>
        </div>
        <div className="rounded-[28px] border border-hier-border bg-white p-5 shadow-card">
          <ShieldCheck className="h-5 w-5 text-hier-primary" />
          <p className="mt-4 text-3xl font-semibold text-hier-text">Invite only</p>
          <p className="mt-1 text-sm text-hier-muted">Only verified @hierapp.co.uk staff can enter.</p>
        </div>
      </div>

      <form onSubmit={handleInvite} className="rounded-[32px] border border-hier-border bg-white p-6 shadow-card">
        <div className="grid gap-4 lg:grid-cols-[1fr_220px_auto] lg:items-end">
          <label className="space-y-2">
            <span className="text-sm font-semibold text-hier-text">Staff email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@hierapp.co.uk"
              className="h-13 w-full rounded-2xl border border-hier-border bg-hier-panel px-4 text-sm text-hier-text outline-none transition focus:border-hier-primary focus:bg-white"
            />
          </label>

          <label className="space-y-2">
            <span className="text-sm font-semibold text-hier-text">Permission</span>
            <select
              value={staffRole}
              onChange={(event) => setStaffRole(event.target.value)}
              className="h-13 w-full rounded-2xl border border-hier-border bg-hier-panel px-4 text-sm text-hier-text outline-none transition focus:border-hier-primary focus:bg-white"
            >
              {roleOptions.map((role) => (
                <option key={role.value} value={role.value}>{role.label}</option>
              ))}
            </select>
          </label>

          <button
            type="submit"
            disabled={sending}
            className="inline-flex h-13 items-center justify-center gap-2 rounded-2xl bg-hier-primary px-5 text-sm font-semibold text-white shadow-card transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <MailPlus className="h-4 w-4" />
            {sending ? "Sending..." : "Send invite"}
          </button>
        </div>

        {error ? <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
        {success ? <p className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</p> : null}
        {devInviteUrl ? <p className="mt-4 break-all rounded-2xl border border-hier-border bg-hier-soft px-4 py-3 text-xs text-hier-muted">Dev invite URL: {devInviteUrl}</p> : null}
      </form>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-[32px] border border-hier-border bg-white p-6 shadow-card">
          <h2 className="text-lg font-semibold text-hier-text">Staff users</h2>
          <div className="mt-5 space-y-3">
            {loading ? <p className="text-sm text-hier-muted">Loading staff...</p> : null}
            {!loading && staff.length === 0 ? <p className="text-sm text-hier-muted">No staff users yet.</p> : null}
            {staff.map((user) => (
              <div key={user.id} className="rounded-2xl border border-hier-border bg-hier-panel p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-hier-text">{user.full_name || user.email}</p>
                    <p className="mt-1 text-sm text-hier-muted">{user.email}</p>
                  </div>
                  <StatusBadge value={user.staff_role} />
                </div>
                <p className="mt-3 text-xs text-hier-muted">Created {formatDate(user.created_at)}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[32px] border border-hier-border bg-white p-6 shadow-card">
          <h2 className="text-lg font-semibold text-hier-text">Recent invites</h2>
          <div className="mt-5 space-y-3">
            {loading ? <p className="text-sm text-hier-muted">Loading invites...</p> : null}
            {!loading && invites.length === 0 ? <p className="text-sm text-hier-muted">No invites yet.</p> : null}
            {invites.map((invite) => (
              <div key={invite.id} className="rounded-2xl border border-hier-border bg-hier-panel p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-hier-text">{invite.email}</p>
                    <p className="mt-1 text-sm text-hier-muted">Role: {invite.staff_role}</p>
                  </div>
                  <StatusBadge value={invite.status} />
                </div>
                <p className="mt-3 text-xs text-hier-muted">Sent {formatDate(invite.created_at)} · Expires {formatDate(invite.expires_at)}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
