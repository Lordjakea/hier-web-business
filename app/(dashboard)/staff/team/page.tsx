"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, MailPlus, PauseCircle, Pencil, PlayCircle, RefreshCw, ShieldCheck, Trash2, Users } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import {
  createStaffInvite,
  deleteStaffTeamMember,
  fetchStaffTeam,
  updateStaffTeamMember,
  type StaffInvite,
  type StaffTeamUser,
} from "@/lib/staff-crm";

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
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({
    full_name: "",
    staff_role: "support",
    is_active: true,
  });
  const [email, setEmail] = useState("");
  const [staffRole, setStaffRole] = useState("support");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [savingUserId, setSavingUserId] = useState<number | null>(null);
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

  function startEdit(user: StaffTeamUser) {
    setEditingUserId(user.id);
    setEditForm({
      full_name: user.full_name || "",
      staff_role: user.staff_role || "support",
      is_active: user.is_active !== false,
    });
    setError(null);
    setSuccess(null);
  }

  async function handleSaveTeamMember(user: StaffTeamUser) {
    setSavingUserId(user.id);
    setError(null);
    setSuccess(null);

    try {
      const response = await updateStaffTeamMember(user.id, editForm);
      setStaff((current) =>
        current.map((item) => (item.id === user.id ? response.staff : item))
      );
      setEditingUserId(null);
      setSuccess("Team member updated.");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not update team member.");
    } finally {
      setSavingUserId(null);
    }
  }

  async function handleRemoveAccess(user: StaffTeamUser) {
    if (!window.confirm(`Remove dashboard access for ${user.full_name || user.email}?`)) return;

    setSavingUserId(user.id);
    setError(null);
    setSuccess(null);

    try {
      const response = await deleteStaffTeamMember(user.id);
      setStaff((current) =>
        current.map((item) => (item.id === user.id ? response.staff : item))
      );
      setEditingUserId(null);
      setSuccess("Team member access removed.");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not remove team member access.");
    } finally {
      setSavingUserId(null);
    }
  }

  async function handleTogglePaused(user: StaffTeamUser) {
    const nextActive = user.is_active === false;
    const action = nextActive ? "resume access for" : "pause access for";
    if (!window.confirm(`${action[0].toUpperCase()}${action.slice(1)} ${user.full_name || user.email}?`)) return;

    setSavingUserId(user.id);
    setError(null);
    setSuccess(null);

    try {
      const response = await updateStaffTeamMember(user.id, {
        full_name: user.full_name || "",
        staff_role: user.staff_role || "support",
        is_active: nextActive,
      });
      setStaff((current) =>
        current.map((item) => (item.id === user.id ? response.staff : item))
      );
      setSuccess(nextActive ? "Team member access resumed." : "Team member access paused.");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not update team member access.");
    } finally {
      setSavingUserId(null);
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
                  <div className="flex flex-wrap justify-end gap-2">
                    <StatusBadge value={user.is_active === false ? "inactive" : user.staff_role} />
                    <button
                      type="button"
                      onClick={() => startEdit(user)}
                      disabled={savingUserId === user.id}
                      className="inline-flex h-9 items-center justify-center gap-2 rounded-2xl border border-hier-border bg-white px-3 text-xs font-semibold text-hier-text disabled:opacity-50"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleTogglePaused(user)}
                      disabled={savingUserId === user.id}
                      className="inline-flex h-9 items-center justify-center gap-2 rounded-2xl border border-hier-border bg-white px-3 text-xs font-semibold text-hier-text disabled:opacity-50"
                    >
                      {user.is_active === false ? (
                        <PlayCircle className="h-3.5 w-3.5" />
                      ) : (
                        <PauseCircle className="h-3.5 w-3.5" />
                      )}
                      {user.is_active === false ? "Resume" : "Pause"}
                    </button>
                  </div>
                </div>

                {editingUserId === user.id ? (
                  <div className="mt-4 space-y-3 rounded-2xl border border-hier-border bg-white p-4">
                    <label className="space-y-2">
                      <span className="text-xs font-semibold text-hier-muted">Name</span>
                      <input
                        value={editForm.full_name}
                        onChange={(event) =>
                          setEditForm((current) => ({
                            ...current,
                            full_name: event.target.value,
                          }))
                        }
                        className="h-11 w-full rounded-2xl border border-hier-border bg-hier-panel px-4 text-sm text-hier-text outline-none focus:border-hier-primary focus:bg-white"
                      />
                    </label>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="space-y-2">
                        <span className="text-xs font-semibold text-hier-muted">Permission</span>
                        <select
                          value={editForm.staff_role}
                          onChange={(event) =>
                            setEditForm((current) => ({
                              ...current,
                              staff_role: event.target.value,
                            }))
                          }
                          className="h-11 w-full rounded-2xl border border-hier-border bg-hier-panel px-4 text-sm text-hier-text outline-none focus:border-hier-primary focus:bg-white"
                        >
                          {roleOptions.map((role) => (
                            <option key={role.value} value={role.value}>
                              {role.label}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="flex items-center gap-3 rounded-2xl border border-hier-border bg-hier-panel px-4 py-3 text-sm font-semibold text-hier-text">
                        <input
                          type="checkbox"
                          checked={editForm.is_active}
                          onChange={(event) =>
                            setEditForm((current) => ({
                              ...current,
                              is_active: event.target.checked,
                            }))
                          }
                        />
                        Active access
                      </label>
                    </div>

                    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                      <button
                        type="button"
                        onClick={() => setEditingUserId(null)}
                        disabled={savingUserId === user.id}
                        className="inline-flex h-10 items-center justify-center rounded-2xl border border-hier-border bg-white px-4 text-sm font-semibold text-hier-text disabled:opacity-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleRemoveAccess(user)}
                        disabled={savingUserId === user.id || user.is_active === false}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-800 disabled:opacity-50"
                      >
                        <Trash2 className="h-4 w-4" />
                        Remove access
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleSaveTeamMember(user)}
                        disabled={savingUserId === user.id}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-hier-primary px-4 text-sm font-semibold text-white disabled:opacity-50"
                      >
                        <Check className="h-4 w-4" />
                        Save
                      </button>
                    </div>
                  </div>
                ) : null}

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
