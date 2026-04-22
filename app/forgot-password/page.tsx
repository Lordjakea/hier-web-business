"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail } from "lucide-react";
import { useState } from "react";
import { HierBrand } from "@/components/ui/brand";
import { apiFetch } from "@/lib/api";

type RequestOtpResponse = {
  ok?: boolean;
  dev_code?: string;
};

export default function ForgotPasswordPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const normalizedEmail = email.trim().toLowerCase();

      if (!normalizedEmail) {
        throw new Error("Email is required.");
      }

      await apiFetch<RequestOtpResponse>("/request-otp", {
        method: "POST",
        body: JSON.stringify({
          purpose: "reset_password",
          channel: "email",
          email: normalizedEmail,
        }),
      });

      router.push(`/reset-password?email=${encodeURIComponent(normalizedEmail)}`);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not send a reset code right now."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-login-glow flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-[560px] rounded-[36px] border border-hier-border bg-white p-10 shadow-panel">
        <div className="mb-8 flex items-center justify-between gap-4">
          <HierBrand compact />
          <span className="rounded-full bg-hier-soft px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-hier-muted">
            Reset password
          </span>
        </div>

        <div className="space-y-3">
          <h1 className="text-3xl font-semibold tracking-tight text-hier-text">
            Forgot password
          </h1>
          <p className="text-sm leading-6 text-hier-muted">
            Enter your email and we’ll send you a one-time code to reset your password.
          </p>
        </div>

        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          <label className="block space-y-2">
            <span className="text-sm font-medium text-hier-text">Email</span>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-hier-muted" />
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                className="h-14 w-full rounded-[22px] border border-hier-border bg-hier-panel pl-11 pr-4 text-sm text-hier-text outline-none transition focus:border-hier-primary focus:bg-white"
              />
            </div>
          </label>

          <div className="rounded-[22px] border border-hier-border bg-hier-soft px-4 py-4 text-sm text-hier-muted">
            We’ll send a 6-digit code to this email address.
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
            {loading ? "Sending code…" : "Send code"}
          </button>
        </form>

        <div className="mt-8 border-t border-hier-border pt-6 text-sm text-hier-muted">
          Remembered your password?{" "}
          <Link
            href="/login"
            className="font-medium text-hier-primary hover:underline"
          >
            Back to login
          </Link>
        </div>
      </div>
    </main>
  );
}