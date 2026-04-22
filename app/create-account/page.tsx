"use client";

import { useRouter } from "next/navigation";
import { HierBrand } from "@/components/ui/brand";

export default function CreateAccountPage() {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-login-glow flex items-center justify-center px-6">
      <div className="w-full max-w-[720px] rounded-[36px] border border-hier-border bg-white p-10 shadow-panel">
        <div className="mb-8 flex items-center justify-between">
          <HierBrand compact />
          <span className="text-xs uppercase tracking-[0.18em] text-hier-muted">
            Get started
          </span>
        </div>

        <h1 className="text-3xl font-semibold text-hier-text">
          Create your account
        </h1>

        <p className="mt-2 text-sm text-hier-muted">
          Choose how you want to use Hier.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {/* Candidate */}
          <button
            onClick={() => router.push("/signup/candidate")}
            className="rounded-[24px] border border-hier-border bg-hier-panel p-6 text-left hover:border-hier-primary transition"
          >
            <h2 className="text-lg font-semibold text-hier-text">
              Candidate
            </h2>
            <p className="mt-2 text-sm text-hier-muted">
              Find jobs, apply, and manage your career in the app.
            </p>
          </button>

          {/* Business */}
          <button
            onClick={() => router.push("/signup/business")}
            className="rounded-[24px] border border-hier-border bg-hier-panel p-6 text-left hover:border-hier-primary transition"
          >
            <h2 className="text-lg font-semibold text-hier-text">
              Business
            </h2>
            <p className="mt-2 text-sm text-hier-muted">
              Post jobs, manage applicants, and track hiring performance.
            </p>
          </button>
        </div>
      </div>
    </main>
  );
}