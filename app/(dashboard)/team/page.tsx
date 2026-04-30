"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Copy,
  Loader2,
  MailPlus,
  RefreshCw,
  Trash2,
  UsersRound,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import {
  cancelInvite,
  fetchTeam,
  inviteTeamMember,
  removeTeamMember,
  type BusinessSeatUsage,
  type BusinessTeamInvite,
  type BusinessTeamMember,
} from "@/lib/business-team";

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function statusLabel(value?: string | null) {
  return String(value || "pending").replace(/_/g, " ");
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex rounded-full border border-hier-border bg-white px-3 py-1 text-xs font-semibold capitalize text-hier-muted">
      {children}
    </span>
  );
}

export default function TeamPage() {
  const [members, setMembers] = useState<BusinessTeamMember[]>([]);
  const [invites, setInvites] = useState<BusinessTeamInvite[]>([]);
  const [seatUsage, setSeatUsage] = useState<BusinessSeatUsage | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [email, setEmail] = useState("");
  const [latestInviteUrl, setLatestInviteUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [workingKey, setWorkingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const activeMembers = useMemo(
    () => members.filter((member) => member.status === "active"),
    [members]
  );

  async function loadTeam() {
    setError(null);
    const res = await fetchTeam();
    setMembers(res.members || []);
    setInvites(res.invites || []);
    setSeatUsage(res.seat_usage || null);
    setIsOwner(Boolean(res.is_owner));
  }

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        await loadTeam();
      } catch (caught) {
        if (!cancelled) {
          setError(caught instanceof Error ? caught.message : "Could not load team right now.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  async function withAction(key: string, action: () => Promise<void>) {
    setWorkingKey(key);
    setError(null);
    setSuccess(null);

    try {
      await action();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong.");
    } finally {
      setWorkingKey(null);
    }
  }

  async function handleInvite(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    await withAction("invite", async () => {
      const res = await inviteTeamMember(email, "recruiter");
      setLatestInviteUrl(res.invite_url || null);
      setEmail("");
      setSuccess(res.already_exists ? "Invite already exists." : "Recruiter invite created.");
      await loadTeam();
    });
  }

  async function handleRemove(memberId: number) {
    const confirmed = window.confirm("Remove this recruiter from the business team?");
    if (!confirmed) return;

    await withAction(`remove-${memberId}`, async () => {
      await removeTeamMember(memberId);
      setSuccess("Recruiter removed.");
      await loadTeam();
    });
  }

  async function handleCancelInvite(inviteId: number) {
    await withAction(`cancel-${inviteId}`, async () => {
      await cancelInvite(inviteId);
      setSuccess("Invite cancelled.");
      await loadTeam();
    });
  }

  async function copyInviteUrl() {
    if (!latestInviteUrl) return;
    await navigator.clipboard.writeText(latestInviteUrl);
    setSuccess("Invite link copied.");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Team"
        title="Recruiter seats and invites"
        description="Invite recruiters into your business workspace and manage seat usage across your hiring team."
        action={
          <button
            type="button"
            onClick={() => withAction("refresh", loadTeam)}
            disabled={workingKey !== null}
            className="inline-flex items-center gap-2 rounded-[20px] border border-hier-border bg-white px-4 py-3 text-sm font-semibold text-hier-text shadow-sm transition hover:bg-hier-soft disabled:opacity-60"
          >
            {workingKey === "refresh" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh
          </button>
        }
      />

      {error ? <div className="rounded-[24px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">{error}</div> : null}
      {success ? <div className="rounded-[24px] border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700">{success}</div> : null}

      {loading ? (
        <div className="grid gap-5 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="h-36 animate-pulse rounded-[28px] border border-hier-border bg-white" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-[28px] border border-hier-border bg-white p-5 shadow-card">
              <UsersRound className="h-5 w-5 text-hier-primary" />
              <p className="mt-4 text-3xl font-semibold text-hier-text">{seatUsage?.total_available_seats ?? 1}</p>
              <p className="mt-1 text-sm text-hier-muted">Total recruiter seats</p>
            </div>
            <div className="rounded-[28px] border border-hier-border bg-white p-5 shadow-card">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-hier-muted">In use</p>
              <p className="mt-4 text-3xl font-semibold text-hier-text">{seatUsage?.active_recruiter_seats ?? seatUsage?.active_members ?? 1}</p>
              <p className="mt-1 text-sm text-hier-muted">Owner + active recruiters</p>
            </div>
            <div className="rounded-[28px] border border-hier-border bg-white p-5 shadow-card">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-hier-muted">Pending</p>
              <p className="mt-4 text-3xl font-semibold text-hier-text">{seatUsage?.pending_invites ?? 0}</p>
              <p className="mt-1 text-sm text-hier-muted">Invites awaiting acceptance</p>
            </div>
            <div className="rounded-[28px] border border-hier-border bg-white p-5 shadow-card">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-hier-muted">Available</p>
              <p className="mt-4 text-3xl font-semibold text-hier-text">
                {seatUsage?.available_seats_after_pending ??
                  Math.max(0, Number(seatUsage?.total_available_seats || 1) - Number(seatUsage?.used_or_pending || 0))}
              </p>
              <p className="mt-1 text-sm text-hier-muted">Seats left after pending invites</p>
            </div>
          </div>

          <form onSubmit={handleInvite} className="rounded-[32px] border border-hier-border bg-white p-6 shadow-card sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-hier-muted">Invite recruiter</p>
                <h2 className="mt-2 text-2xl font-semibold text-hier-text">Add a recruiter to your team</h2>
                <p className="mt-2 max-w-3xl text-sm leading-7 text-hier-muted">
                  Pending invites reserve a recruiter seat. If no seats are available, buy another recruiter seat from Billing first.
                </p>
              </div>
              {!isOwner ? <Badge>Owner only</Badge> : null}
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
              <label className="space-y-2">
                <span className="text-sm font-semibold text-hier-text">Email address</span>
                <input
                  type="email"
                  value={email}
                  disabled={!isOwner || workingKey !== null}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="recruiter@company.com"
                  className="h-13 w-full rounded-[18px] border border-hier-border bg-hier-panel px-4 text-sm text-hier-text outline-none transition focus:border-hier-primary focus:bg-white disabled:opacity-60"
                />
              </label>

              <button
                type="submit"
                disabled={!isOwner || workingKey !== null || !email.trim()}
                className="inline-flex h-13 items-center justify-center gap-2 rounded-[18px] bg-hier-primary px-5 text-sm font-semibold text-white shadow-sm transition hover:opacity-95 disabled:opacity-60"
              >
                {workingKey === "invite" ? <Loader2 className="h-4 w-4 animate-spin" /> : <MailPlus className="h-4 w-4" />}
                Send recruiter invite
              </button>
            </div>

            {latestInviteUrl ? (
              <div className="mt-6 rounded-[24px] border border-hier-border bg-hier-soft p-4">
                <p className="text-sm font-semibold text-hier-text">Latest invite link</p>
                <p className="mt-2 break-all text-xs text-hier-muted">{latestInviteUrl}</p>
                <button
                  type="button"
                  onClick={copyInviteUrl}
                  className="mt-3 inline-flex items-center gap-2 rounded-[14px] border border-hier-border bg-white px-3 py-2 text-xs font-semibold text-hier-text"
                >
                  <Copy className="h-3.5 w-3.5" />
                  Copy link
                </button>
              </div>
            ) : null}
          </form>

          <div className="grid gap-6 xl:grid-cols-2">
            <section className="rounded-[32px] border border-hier-border bg-white p-6 shadow-card sm:p-8">
              <h2 className="text-xl font-semibold text-hier-text">Active recruiters</h2>

              <div className="mt-5 space-y-3">
                {activeMembers.length === 0 ? (
                  <p className="rounded-[22px] border border-hier-border bg-hier-panel p-4 text-sm text-hier-muted">
                    No extra recruiters yet. The owner account is already using the first included seat.
                  </p>
                ) : null}

                {activeMembers.map((member) => (
                  <div key={member.id} className="rounded-[22px] border border-hier-border bg-hier-panel p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-hier-text">
                          {member.user?.full_name || member.user?.email || `User ${member.user_id}`}
                        </p>
                        <p className="mt-1 text-sm text-hier-muted">{member.user?.email || "—"}</p>
                        <p className="mt-2 text-xs text-hier-muted">Joined {formatDate(member.joined_at || member.created_at)}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge>{member.role === "owner" ? "Owner" : "Recruiter"}</Badge>
                        {isOwner && member.role !== "owner" ? (
                          <button
                            type="button"
                            onClick={() => handleRemove(member.id)}
                            disabled={workingKey !== null}
                            className="rounded-[14px] border border-rose-200 bg-rose-50 p-2 text-rose-700 transition hover:bg-rose-100 disabled:opacity-60"
                          >
                            {workingKey === `remove-${member.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[32px] border border-hier-border bg-white p-6 shadow-card sm:p-8">
              <h2 className="text-xl font-semibold text-hier-text">Pending recruiter invites</h2>

              <div className="mt-5 space-y-3">
                {invites.length === 0 ? (
                  <p className="rounded-[22px] border border-hier-border bg-hier-panel p-4 text-sm text-hier-muted">
                    No pending invites.
                  </p>
                ) : null}

                {invites.map((invite) => (
                  <div key={invite.id} className="rounded-[22px] border border-hier-border bg-hier-panel p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-hier-text">{invite.email}</p>
                        <p className="mt-1 text-sm text-hier-muted">Recruiter invite</p>
                        <p className="mt-2 text-xs text-hier-muted">Expires {formatDate(invite.expires_at)}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge>{statusLabel(invite.status || "pending")}</Badge>
                        {isOwner ? (
                          <button
                            type="button"
                            onClick={() => handleCancelInvite(invite.id)}
                            disabled={workingKey !== null}
                            className="rounded-[14px] border border-rose-200 bg-rose-50 p-2 text-rose-700 transition hover:bg-rose-100 disabled:opacity-60"
                          >
                            {workingKey === `cancel-${invite.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}