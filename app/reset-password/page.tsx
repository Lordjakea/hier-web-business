"use client";

import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { HierBrand } from "@/components/ui/brand";
import { apiFetch } from "@/lib/api";

type ResetPasswordResponse = {
  ok?: boolean;
};

function ResetPasswordPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const email = useMemo(
    () => (searchParams.get("email") || "").trim().toLowerCase(),
    [searchParams]
  );

  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!email) {
        throw new Error("Missing email. Go back and try again.");
      }

      const trimmedCode = code.trim();

      if (!trimmedCode) {
        throw new Error("Code is required.");
      }

      if (!password) {
        throw new Error("New password is required.");
      }

      if (password.length < 10) {
        throw new Error("Password must be at least 10 characters.");
      }

      if (!confirmPassword) {
        throw new Error("Confirm password is required.");
      }

      if (password !== confirmPassword) {
        throw new Error("Passwords do not match.");
      }

      await apiFetch<ResetPasswordResponse>("/reset-password", {
        method: "POST",
        body: JSON.stringify({
          email,
          code: trimmedCode,
          password,
          confirm_password: confirmPassword,
        }),
      });

      router.replace("/login");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not reset your password right now."
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
            New password
          </span>
        </div>

        <div className="space-y-3">
          <h1 className="text-3xl font-semibold tracking-tight text-hier-text">
            Set new password
          </h1>
          <p className="text-sm leading-6 text-hier-muted">
            Enter the code sent to{" "}
            <span className="font-medium text-hier-text">
              {email || "your email"}
            </span>{" "}
            and choose a new password.
          </p>
        </div>

        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
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
              onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
              placeholder="123456"
              className="h-14 w-full rounded-[22px] border border-hier-border bg-hier-panel px-4 text-center text-lg tracking-[0.35em] text-hier-text outline-none transition focus:border-hier-primary focus:bg-white"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-hier-text">
              New password
            </span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
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
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Re-enter your password"
              className="h-14 w-full rounded-[22px] border border-hier-border bg-hier-panel px-4 text-sm text-hier-text outline-none transition focus:border-hier-primary focus:bg-white"
            />
          </label>

          <div className="rounded-[22px] border border-hier-border bg-hier-soft px-4 py-4 text-sm text-hier-muted">
            Your password must be at least 10 characters long.
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
            {loading ? "Resetting password…" : "Reset password"}
          </button>
        </form>

        <div className="mt-8 border-t border-hier-border pt-6 text-sm text-hier-muted">
          <Link
            href="/forgot-password"
            className="font-medium text-hier-primary hover:underline"
          >
            Back
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-login-glow" />}>
      <ResetPasswordPageContent />
    </Suspense>
  );
}