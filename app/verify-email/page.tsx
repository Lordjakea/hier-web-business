"use client";

import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MailCheck, RefreshCw, ShieldCheck } from "lucide-react";
import { HierBrand } from "@/components/ui/brand";
import { apiFetch } from "@/lib/api";
import { setAuthToken, setStoredUser } from "@/lib/auth";

type VerifyOtpResponse = {
  ok?: boolean;
  purpose?: string;
  access_token?: string;
  refresh_token?: string;
  user?: {
    id?: number;
    email?: string | null;
    full_name?: string | null;
    name?: string | null;
    role?: string | null;
    avatar_url?: string | null;
    email_verified?: boolean;
    phone_verified?: boolean;
    business_profile?: {
      avatar_url?: string | null;
      logo_url?: string | null;
      business_name?: string | null;
      company_name?: string | null;
    } | null;
  } | null;
};

type RequestOtpResponse = {
  ok?: boolean;
  dev_code?: string;
};

function VerifyEmailPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const email = useMemo(
    () => (searchParams.get("email") || "").trim().toLowerCase(),
    [searchParams]
  );

  const role = useMemo<"business_user" | "user">(
    () =>
      searchParams.get("role") === "business_user"
        ? "business_user"
        : "user",
    [searchParams]
  );

  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [resent, setResent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleVerify(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setResent(false);

    try {
      if (!email) {
        throw new Error("Missing email. Go back and try again.");
      }

      const trimmedCode = code.trim();

      if (!trimmedCode) {
        throw new Error("Please enter the verification code.");
      }

      const response = await apiFetch<VerifyOtpResponse>("/verify-otp", {
        method: "POST",
        body: JSON.stringify({
          purpose: "verify_email",
          channel: "email",
          email,
          code: trimmedCode,
        }),
      });

      if (!response?.access_token) {
        throw new Error(
          "Verification succeeded but no access token was returned."
        );
      }

      setAuthToken(response.access_token);

      const rawUser = response.user || {};

      setStoredUser({
        id: rawUser.id,
        email: rawUser.email || email,
        full_name: rawUser.full_name || rawUser.name || rawUser.email || email,
        role: rawUser.role || role,
        avatar_url:
          rawUser.avatar_url ||
          rawUser.business_profile?.avatar_url ||
          rawUser.business_profile?.logo_url ||
          null,
        business_name:
          rawUser.business_profile?.business_name ||
          rawUser.business_profile?.company_name ||
          null,
      });

      if (role === "business_user") {
        router.replace("/billing");
        return;
      }

      window.location.assign("https://hierapp.co.uk");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not verify your email right now."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setLoading(true);
    setError(null);
    setResent(false);

    try {
      if (!email) {
        throw new Error("Missing email. Go back and try again.");
      }

      await apiFetch<RequestOtpResponse>("/request-otp", {
        method: "POST",
        body: JSON.stringify({
          purpose: "verify_email",
          channel: "email",
          email,
        }),
      });

      setResent(true);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not resend the code right now."
      );
    } finally {
      setLoading(false);
    }
  }

  const backHref = role === "business_user" ? "/signup/business" : "/signup/candidate";

  return (
    <main className="min-h-screen bg-login-glow">
      <div className="mx-auto grid min-h-screen max-w-[1600px] gap-10 px-6 py-8 lg:grid-cols-[1.02fr_0.98fr] lg:px-10">
        <section className="hidden flex-col justify-between rounded-[36px] border border-hier-border bg-gradient-to-br from-white via-hier-soft to-white p-10 shadow-panel lg:flex">
          <HierBrand />

          <div className="space-y-6">
            <div className="space-y-4">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-hier-muted">
                Verify email
              </p>
              <h1 className="max-w-xl text-5xl font-semibold leading-tight tracking-tight text-hier-text">
                Enter the one-time code we sent to your email.
              </h1>
              <p className="max-w-xl text-lg leading-8 text-hier-muted">
                Once your email is verified, your Hier account can continue to
                the next stage.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-[24px] border border-white/50 bg-white/75 p-5 shadow-card backdrop-blur-sm">
                <div className="mb-3 inline-flex rounded-2xl bg-hier-primary/15 p-3 text-hier-primary">
                  <MailCheck className="h-5 w-5" />
                </div>
                <h3 className="text-base font-semibold text-hier-text">
                  Email on file
                </h3>
                <p className="mt-2 break-all text-sm leading-6 text-hier-muted">
                  {email || "No email provided"}
                </p>
              </div>

              <div className="rounded-[24px] border border-white/50 bg-white/75 p-5 shadow-card backdrop-blur-sm">
                <div className="mb-3 inline-flex rounded-2xl bg-hier-primary/15 p-3 text-hier-primary">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <h3 className="text-base font-semibold text-hier-text">
                  Next after verification
                </h3>
                <p className="mt-2 text-sm leading-6 text-hier-muted">
                  {role === "business_user"
                    ? "You’ll go straight into pricing."
                    : "You’ll continue into the Hier candidate flow."}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {(role === "business_user"
              ? [
                  ["1", "Account created"],
                  ["2", "Verify email"],
                  ["3", "Choose plan"],
                ]
              : [
                  ["1", "Account created"],
                  ["2", "Verify email"],
                  ["3", "Continue"],
                ]
            ).map(([value, label]) => (
              <div
                key={label}
                className="rounded-[24px] border border-white/60 bg-white/80 p-5 shadow-card"
              >
                <p className="text-2xl font-semibold text-hier-text">{value}</p>
                <p className="mt-2 text-sm text-hier-muted">{label}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="flex items-center justify-center">
          <div className="w-full max-w-[560px] rounded-[36px] border border-hier-border bg-white p-6 shadow-panel sm:p-10">
            <div className="mb-8 flex items-center justify-between gap-4">
              <HierBrand compact />
              <span className="rounded-full bg-hier-soft px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-hier-muted">
                Verification
              </span>
            </div>

            <div className="space-y-2">
              <h2 className="text-3xl font-semibold tracking-tight text-hier-text">
                Verify your email
              </h2>
              <p className="text-sm leading-6 text-hier-muted">
                Enter the one-time code sent to{" "}
                <span className="font-medium text-hier-text">
                  {email || "your email"}
                </span>
                .
              </p>
            </div>

            <form className="mt-8 space-y-5" onSubmit={handleVerify}>
              <label className="block space-y-2">
                <span className="text-sm font-medium text-hier-text">
                  Verification code
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={code}
                  onChange={(event) =>
                    setCode(event.target.value.replace(/\D/g, ""))
                  }
                  placeholder="123456"
                  className="h-14 w-full rounded-[22px] border border-hier-border bg-hier-panel px-4 text-center text-lg tracking-[0.35em] text-hier-text outline-none transition focus:border-hier-primary focus:bg-white"
                />
              </label>

              <div className="rounded-[22px] border border-hier-border bg-hier-soft px-4 py-4 text-sm text-hier-muted">
                Use the 6-digit code from your email to activate your account.
              </div>

              {resent && !error ? (
                <div className="rounded-[20px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  A new code has been sent.
                </div>
              ) : null}

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
                {loading
                  ? "Verifying…"
                  : role === "business_user"
                  ? "Verify and continue to pricing"
                  : "Verify email"}
              </button>

              <button
                type="button"
                onClick={() => void handleResend()}
                disabled={loading}
                className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-[22px] border border-hier-border bg-white text-sm font-semibold text-hier-text shadow-card transition hover:bg-hier-soft disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw className="h-4 w-4" />
                Resend code
              </button>
            </form>

            <div className="mt-8 border-t border-hier-border pt-6 text-sm text-hier-muted">
              Need to change your email?{" "}
              <Link
                href={backHref}
                className="font-medium text-hier-primary hover:underline"
              >
                Go back
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-login-glow" />}>
      <VerifyEmailPageContent />
    </Suspense>
  );
}