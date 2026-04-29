"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import { HierBrand } from "@/components/ui/brand";
import { loginBusinessUser } from "@/lib/business-applications";
import { setAuthToken, setStoredUser } from "@/lib/auth";

type LoginResponseUser = {
  id?: number;
  email?: string | null;
  full_name?: string | null;
  name?: string | null;
  role?: string | null;
  email_verified?: boolean | null;
  is_staff?: boolean | null;
  staff_role?: string | null;
  avatar_url?: string | null;
  logo_url?: string | null;
  profile?: {
    avatar_url?: string | null;
  } | null;
  user_profile?: {
    avatar_url?: string | null;
  } | null;
  business_profile?: {
    avatar_url?: string | null;
    logo_url?: string | null;
    business_name?: string | null;
  } | null;
};

function Feature({
  icon: Icon,
  title,
  text,
}: {
  icon: typeof Mail;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-[24px] border border-white/50 bg-white/75 p-5 shadow-card backdrop-blur-sm">
      <div className="mb-3 inline-flex rounded-2xl bg-hier-primary/15 p-3 text-hier-primary">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="text-base font-semibold text-hier-text">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-hier-muted">{text}</p>
    </div>
  );
}

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reason = searchParams.get("reason");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const showIdleTimeout = reason === "idle_timeout";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const normalizedEmail = email.trim().toLowerCase();
      const trimmedPassword = password;

      if (!normalizedEmail) {
        throw new Error("Email is required.");
      }

      if (!trimmedPassword) {
        throw new Error("Password is required.");
      }

      const response = await loginBusinessUser(normalizedEmail, trimmedPassword);
      const token = response.access_token || response.token || response.access;

      if (!token) {
        throw new Error("Login succeeded but no access token was returned.");
      }

      setAuthToken(token);

      const rawUser: LoginResponseUser = (response.user || {}) as LoginResponseUser;

      setStoredUser({
        id: rawUser.id,
        email: rawUser.email || normalizedEmail,
        full_name: rawUser.full_name || rawUser.name || normalizedEmail,
        role: rawUser.role || "business_user",
        email_verified: rawUser.email_verified ?? null,
        is_staff: rawUser.is_staff ?? null,
        staff_role: rawUser.staff_role ?? null,
        avatar_url:
          rawUser.avatar_url ||
          rawUser.profile?.avatar_url ||
          rawUser.user_profile?.avatar_url ||
          rawUser.business_profile?.avatar_url ||
          rawUser.business_profile?.logo_url ||
          rawUser.logo_url ||
          null,
        business_name: rawUser.business_profile?.business_name || null,
      });

      if (!rememberMe) {
        window.sessionStorage.setItem("hier_business_session_only", "1");
      } else {
        window.sessionStorage.removeItem("hier_business_session_only");
      }

      const nextPath = searchParams.get("next");
      router.replace(nextPath || (rawUser.role === "staff" ? "/staff" : "/candidates"));
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not log in right now."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-login-glow">
      <div className="mx-auto grid min-h-screen max-w-[1600px] gap-10 px-6 py-8 lg:grid-cols-[1.05fr_0.95fr] lg:px-10">
        <section className="hidden rounded-[36px] border border-hier-border bg-gradient-to-br from-white via-hier-soft to-white p-10 shadow-panel lg:flex">
          <div className="flex h-full flex-col">
            <HierBrand />

            <div className="mt-16 space-y-8">
              <div className="space-y-4">
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-hier-muted">
                  Business dashboard
                </p>
                <h1 className="max-w-xl text-5xl font-semibold leading-tight tracking-tight text-hier-text">
                  Manage applicants with a cleaner, faster Kanban workflow.
                </h1>
                <p className="max-w-xl text-lg leading-8 text-hier-muted">
                  Hier Intelligence Applicant tracking, candidate onboarding and
                  Analytics Pro await inside.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Feature
                  icon={ShieldCheck}
                  title="Professional feel"
                  text="Move candidates smoothly through the Kanban board."
                />
                <Feature
                  icon={LockKeyhole}
                  title="Analytics Pro"
                  text="See how your business is performing."
                />
              </div>
            </div>

            <div className="mt-auto pt-10">
              <div className="grid grid-cols-3 gap-4">
                {[
                  ["84", "Active applicants"],
                  ["12", "Open roles"],
                  ["78%", "Offer success"],
                ].map(([value, label]) => (
                  <div
                    key={label}
                    className="rounded-[24px] border border-white/60 bg-white/80 p-5 shadow-card"
                  >
                    <p className="text-2xl font-semibold text-hier-text">
                      {value}
                    </p>
                    <p className="mt-2 text-sm text-hier-muted">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center">
          <div className="w-full max-w-[560px] rounded-[36px] border border-hier-border bg-white p-6 shadow-panel sm:p-10">
            <div className="mb-10 flex items-center justify-between gap-4">
              <HierBrand compact />
              <span className="rounded-full bg-hier-soft px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-hier-muted">
                Business login
              </span>
            </div>

            <div className="space-y-3">
              <h2 className="text-3xl font-semibold tracking-tight text-hier-text">
                Log in to continue
              </h2>
              <p className="text-sm leading-6 text-hier-muted">
                Use your existing business account credentials. The dashboard
                stores the returned JWT locally for authenticated API calls.
              </p>
            </div>

            {showIdleTimeout ? (
              <div className="mt-6 rounded-[20px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                You’ve been idle for too long. Please log back in.
              </div>
            ) : null}

            <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
              <label className="block space-y-2">
                <span className="text-sm font-medium text-hier-text">Email</span>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-hier-muted" />
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="Enter your email"
                    className="h-14 w-full rounded-[22px] border border-hier-border bg-hier-panel pl-11 pr-4 text-sm text-hier-text outline-none transition focus:border-hier-primary focus:bg-white"
                  />
                </div>
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-hier-text">
                  Password
                </span>
                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-hier-muted" />
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter your password"
                    className="h-14 w-full rounded-[22px] border border-hier-border bg-hier-panel pl-11 pr-4 text-sm text-hier-text outline-none transition focus:border-hier-primary focus:bg-white"
                  />
                </div>
              </label>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <label className="inline-flex items-center gap-3 text-sm text-hier-muted">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(event) => setRememberMe(event.target.checked)}
                    className="h-4 w-4 rounded border-hier-border text-hier-primary focus:ring-hier-primary"
                  />
                  Remember me
                </label>

                <Link
                  href="/forgot-password"
                  className="text-sm font-medium text-hier-primary hover:underline"
                >
                  Forgot password?
                </Link>
              </div>

              {error ? (
                <div className="rounded-[20px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {error}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={loading}
                className="inline-flex h-14 w-full items-center justify-center rounded-[22px] bg-hier-primary text-sm font-semibold text-white shadow-card transition hover:translate-y-[-1px] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Signing in…" : "Continue to dashboard"}
              </button>
            </form>

            <div className="mt-8 border-t border-hier-border pt-6 text-sm text-hier-muted">
              New business account?{" "}
              <Link
                href="/create-account"
                className="font-medium text-hier-primary hover:underline"
              >
                Create an account
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-login-glow" />}>
      <LoginPageContent />
    </Suspense>
  );
}