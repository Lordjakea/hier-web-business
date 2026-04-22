"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Phone, ShieldCheck, User2 } from "lucide-react";
import { useState } from "react";
import { HierBrand } from "@/components/ui/brand";
import { apiFetch } from "@/lib/api";

type SignupResponse = {
  id?: number;
  email?: string;
  role?: string;
  email_verified?: boolean;
  phone_verified?: boolean;
  next?: string;
  message?: string;
};

type RequestOtpResponse = {
  ok?: boolean;
  dev_code?: string;
};

type CandidateSignupForm = {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  password: string;
  confirm_password: string;
  accepted_terms: boolean;
};

export default function CandidateSignupPage() {
  const router = useRouter();

  const [form, setForm] = useState<CandidateSignupForm>({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    password: "",
    confirm_password: "",
    accepted_terms: false,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateField<K extends keyof CandidateSignupForm>(
    key: K,
    value: CandidateSignupForm[K]
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const normalizedEmail = form.email.trim().toLowerCase();
      const trimmedFirstName = form.first_name.trim();
      const trimmedLastName = form.last_name.trim();
      const trimmedPhone = form.phone.trim();

      if (!trimmedFirstName) {
        throw new Error("First name is required.");
      }

      if (!trimmedLastName) {
        throw new Error("Last name is required.");
      }

      if (!normalizedEmail) {
        throw new Error("Email is required.");
      }

      if (!trimmedPhone) {
        throw new Error("Phone is required.");
      }

      if (!form.password) {
        throw new Error("Password is required.");
      }

      if (form.password.length < 10) {
        throw new Error("Password must be at least 10 characters.");
      }

      if (!form.confirm_password) {
        throw new Error("Confirm password is required.");
      }

      if (form.password !== form.confirm_password) {
        throw new Error("Passwords do not match.");
      }

      if (!form.accepted_terms) {
        throw new Error("You must accept the Terms & Conditions to create an account.");
      }

      await apiFetch<SignupResponse>("/signup", {
        method: "POST",
        body: JSON.stringify({
          role: "user",
          first_name: trimmedFirstName,
          last_name: trimmedLastName,
          email: normalizedEmail,
          phone: trimmedPhone,
          password: form.password,
          confirm_password: form.confirm_password,
          accepted_terms: form.accepted_terms,
          terms_version: "2026-04",
        }),
      });

      await apiFetch<RequestOtpResponse>("/request-otp", {
        method: "POST",
        body: JSON.stringify({
          purpose: "verify_email",
          channel: "email",
          email: normalizedEmail,
        }),
      });

      router.push(
        `/verify-email?email=${encodeURIComponent(normalizedEmail)}&role=user`
      );
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not create your account right now."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-login-glow">
      <div className="mx-auto grid min-h-screen max-w-[1600px] gap-10 px-6 py-8 lg:grid-cols-[1.02fr_0.98fr] lg:px-10">
        <section className="hidden flex-col justify-between rounded-[36px] border border-hier-border bg-gradient-to-br from-white via-hier-soft to-white p-10 shadow-panel lg:flex">
          <HierBrand />

          <div className="space-y-6">
            <div className="space-y-4">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-hier-muted">
                Candidate signup
              </p>
              <h1 className="max-w-xl text-5xl font-semibold leading-tight tracking-tight text-hier-text">
                Create your candidate account and verify your email to continue.
              </h1>
              <p className="max-w-xl text-lg leading-8 text-hier-muted">
                Set up your essentials, activate your account with a one-time
                code, and continue into the Hier candidate journey.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-[24px] border border-white/50 bg-white/75 p-5 shadow-card backdrop-blur-sm">
                <div className="mb-3 inline-flex rounded-2xl bg-hier-primary/15 p-3 text-hier-primary">
                  <User2 className="h-5 w-5" />
                </div>
                <h3 className="text-base font-semibold text-hier-text">
                  Candidate-first flow
                </h3>
                <p className="mt-2 text-sm leading-6 text-hier-muted">
                  Start with your personal details, verify your email, and then
                  move into the candidate side of Hier.
                </p>
              </div>

              <div className="rounded-[24px] border border-white/50 bg-white/75 p-5 shadow-card backdrop-blur-sm">
                <div className="mb-3 inline-flex rounded-2xl bg-hier-primary/15 p-3 text-hier-primary">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <h3 className="text-base font-semibold text-hier-text">
                  Secure account setup
                </h3>
                <p className="mt-2 text-sm leading-6 text-hier-muted">
                  Your account is created first, then activated through a
                  one-time email verification code.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {[
              ["1", "Create account"],
              ["2", "Verify email"],
              ["3", "Continue"],
            ].map(([value, label]) => (
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
          <div className="w-full max-w-[620px] rounded-[36px] border border-hier-border bg-white p-6 shadow-panel sm:p-10">
            <div className="mb-8 flex items-center justify-between gap-4">
              <HierBrand compact />
              <span className="rounded-full bg-hier-soft px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-hier-muted">
                Candidate account
              </span>
            </div>

            <div className="space-y-2">
              <h2 className="text-3xl font-semibold tracking-tight text-hier-text">
                Create candidate account
              </h2>
              <p className="text-sm leading-6 text-hier-muted">
                Enter your details, verify your email, and continue into the
                Hier candidate flow.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <label className="block space-y-2">
                <span className="text-sm font-medium text-hier-text">
                  First name
                </span>
                <div className="relative">
                  <User2 className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-hier-muted" />
                  <input
                    type="text"
                    value={form.first_name}
                    onChange={(e) => updateField("first_name", e.target.value)}
                    placeholder="Jake"
                    className="h-14 w-full rounded-[22px] border border-hier-border bg-hier-panel pl-11 pr-4 text-sm text-hier-text outline-none transition focus:border-hier-primary focus:bg-white"
                  />
                </div>
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-hier-text">
                  Last name
                </span>
                <div className="relative">
                  <User2 className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-hier-muted" />
                  <input
                    type="text"
                    value={form.last_name}
                    onChange={(e) => updateField("last_name", e.target.value)}
                    placeholder="Allen"
                    className="h-14 w-full rounded-[22px] border border-hier-border bg-hier-panel pl-11 pr-4 text-sm text-hier-text outline-none transition focus:border-hier-primary focus:bg-white"
                  />
                </div>
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-hier-text">Email</span>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-hier-muted" />
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => updateField("email", e.target.value)}
                    placeholder="you@example.com"
                    className="h-14 w-full rounded-[22px] border border-hier-border bg-hier-panel pl-11 pr-4 text-sm text-hier-text outline-none transition focus:border-hier-primary focus:bg-white"
                  />
                </div>
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-hier-text">Phone</span>
                <div className="relative">
                  <Phone className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-hier-muted" />
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => updateField("phone", e.target.value)}
                    placeholder="+44 7..."
                    className="h-14 w-full rounded-[22px] border border-hier-border bg-hier-panel pl-11 pr-4 text-sm text-hier-text outline-none transition focus:border-hier-primary focus:bg-white"
                  />
                </div>
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-hier-text">
                  Password
                </span>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => updateField("password", e.target.value)}
                  placeholder="At least 10 characters"
                  className="h-14 w-full rounded-[22px] border border-hier-border bg-hier-panel px-4 text-sm text-hier-text outline-none transition focus:border-hier-primary focus:bg-white"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-hier-text">
                  Confirm password
                </span>
                <input
                  type="password"
                  value={form.confirm_password}
                  onChange={(e) =>
                    updateField("confirm_password", e.target.value)
                  }
                  placeholder="Re-enter your password"
                  className="h-14 w-full rounded-[22px] border border-hier-border bg-hier-panel px-4 text-sm text-hier-text outline-none transition focus:border-hier-primary focus:bg-white"
                />
              </label>

              <div className="rounded-[22px] border border-hier-border bg-hier-panel p-4">
                <label className="flex items-start gap-3 text-sm text-hier-muted">
                  <input
                    type="checkbox"
                    checked={form.accepted_terms}
                    onChange={(e) =>
                      updateField("accepted_terms", e.target.checked)
                    }
                    className="mt-1 h-4 w-4 rounded border-hier-border text-hier-primary focus:ring-hier-primary"
                  />
                  <span className="leading-6">
                    I agree to the{" "}
                    <Link
                      href="https://hierapp.co.uk/terms-of-service"
                      target="_blank"
                      className="font-medium text-hier-primary hover:underline"
                    >
                      Terms &amp; Conditions
                    </Link>
                    .
                  </span>
                </label>
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
                {loading ? "Creating account…" : "Create account"}
              </button>
            </form>

            <div className="mt-8 border-t border-hier-border pt-6 text-sm text-hier-muted">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-medium text-hier-primary hover:underline"
              >
                Back to login
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}