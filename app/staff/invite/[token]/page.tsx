"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { HierBrand } from "@/components/ui/brand";
import { acceptStaffInvite, inspectStaffInvite } from "@/lib/staff-crm";
import { setAuthToken, setStoredUser } from "@/lib/auth";

type InvitePreview = {
  email: string;
  staff_role: string;
  expires_at?: string | null;
};

function StaffInvitePageContent() {
  const router = useRouter();
  const params = useParams<{ token: string }>();
  const token = String(params?.token || "");

  const [invite, setInvite] = useState<InvitePreview | null>(null);
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadInvite() {
      setLoading(true);
      setError(null);
      try {
        const response = await inspectStaffInvite(token);
        if (!cancelled) {
          setInvite(response.invite);
        }
      } catch (caughtError) {
        if (!cancelled) {
          setError(caughtError instanceof Error ? caughtError.message : "This invite is invalid or expired.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    if (token) loadInvite();
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await acceptStaffInvite(token, {
        full_name: fullName,
        password,
        confirm_password: confirmPassword,
      });

      setAuthToken(response.access_token);
      setStoredUser({
        id: response.user.id,
        email: response.user.email,
        full_name: response.user.full_name || fullName || response.user.email,
        role: response.user.role || "staff",
        staff_role: response.user.staff_role || invite?.staff_role || "support",
        email_verified: response.user.email_verified ?? true,
        is_staff: true,
        avatar_url: null,
        business_name: null,
      });

      router.replace("/staff");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not accept invite.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-login-glow">
      <div className="mx-auto flex min-h-screen max-w-[1200px] items-center justify-center px-6 py-10">
        <section className="grid w-full overflow-hidden rounded-[40px] border border-hier-border bg-white shadow-panel lg:grid-cols-[0.9fr_1.1fr]">
          <div className="hidden bg-gradient-to-br from-hier-soft via-white to-hier-soft p-10 lg:block">
            <HierBrand />
            <div className="mt-16 space-y-5">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-hier-muted">Hier Staff</p>
              <h1 className="text-5xl font-semibold leading-tight tracking-tight text-hier-text">Join the internal Staff CRM.</h1>
              <p className="text-base leading-7 text-hier-muted">Set your password to access account search, support notes, and the internal Hier account workspace.</p>
            </div>
            <div className="mt-12 grid gap-4">
              <div className="rounded-[24px] border border-white/70 bg-white/80 p-5 shadow-card">
                <ShieldCheck className="h-5 w-5 text-hier-primary" />
                <p className="mt-3 font-semibold text-hier-text">Invite-only access</p>
                <p className="mt-2 text-sm leading-6 text-hier-muted">Only verified @hierapp.co.uk staff accounts can enter.</p>
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-10">
            <div className="mb-8 flex items-center justify-between gap-4 lg:hidden">
              <HierBrand compact />
              <span className="rounded-full bg-hier-soft px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-hier-muted">Staff invite</span>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-hier-muted">Accept invite</p>
              <h2 className="text-3xl font-semibold tracking-tight text-hier-text">Create your staff login</h2>
              <p className="text-sm leading-6 text-hier-muted">This is separate from candidate and business accounts.</p>
            </div>

            {loading ? (
              <div className="mt-8 rounded-[24px] border border-hier-border bg-hier-panel p-5 text-sm text-hier-muted">Loading invite...</div>
            ) : null}

            {invite ? (
              <div className="mt-8 rounded-[24px] border border-hier-border bg-hier-soft p-5">
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-hier-primary" />
                  <div>
                    <p className="font-semibold text-hier-text">{invite.email}</p>
                    <p className="text-sm capitalize text-hier-muted">Permission: {invite.staff_role}</p>
                  </div>
                </div>
              </div>
            ) : null}

            {error ? (
              <div className="mt-6 rounded-[20px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
            ) : null}

            {invite ? (
              <form onSubmit={handleSubmit} className="mt-8 space-y-5">
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-hier-text">Full name</span>
                  <input
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    placeholder="Your name"
                    className="h-14 w-full rounded-[22px] border border-hier-border bg-hier-panel px-4 text-sm text-hier-text outline-none transition focus:border-hier-primary focus:bg-white"
                  />
                </label>

                <label className="block space-y-2">
                  <span className="text-sm font-medium text-hier-text">Password</span>
                  <div className="relative">
                    <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-hier-muted" />
                    <input
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Minimum 10 characters"
                      className="h-14 w-full rounded-[22px] border border-hier-border bg-hier-panel pl-11 pr-4 text-sm text-hier-text outline-none transition focus:border-hier-primary focus:bg-white"
                    />
                  </div>
                </label>

                <label className="block space-y-2">
                  <span className="text-sm font-medium text-hier-text">Confirm password</span>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="Repeat password"
                    className="h-14 w-full rounded-[22px] border border-hier-border bg-hier-panel px-4 text-sm text-hier-text outline-none transition focus:border-hier-primary focus:bg-white"
                  />
                </label>

                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex h-14 w-full items-center justify-center rounded-[22px] bg-hier-primary px-5 text-sm font-semibold text-white shadow-card transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? "Creating account..." : "Accept invite"}
                </button>
              </form>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}

export default function StaffInvitePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-login-glow" />}>
      <StaffInvitePageContent />
    </Suspense>
  );
}
