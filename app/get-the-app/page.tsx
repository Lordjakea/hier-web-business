"use client";

import { HierBrand } from "@/components/ui/brand";
import Link from "next/link";

export default function GetTheAppPage() {
  return (
    <main className="min-h-screen bg-login-glow flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-[640px] rounded-[36px] border border-hier-border bg-white p-10 shadow-panel text-center">
        <div className="mb-8 flex items-center justify-center">
          <HierBrand compact />
        </div>

        <div className="space-y-4">
          <h1 className="text-3xl font-semibold tracking-tight text-hier-text">
            Your account is ready 🎉
          </h1>

          <p className="text-sm leading-6 text-hier-muted">
            Download the Hier app to complete your profile and start applying to jobs.
          </p>
        </div>

        {/* Buttons */}
        <div className="mt-10 space-y-4">
          <a
            href="https://apps.apple.com" // replace later
            target="_blank"
            className="flex h-14 w-full items-center justify-center rounded-[22px] bg-hier-primary text-sm font-semibold text-white shadow-card transition hover:translate-y-[-1px]"
          >
            Download on the App Store
          </a>

          <a
            href="https://play.google.com" // replace later
            target="_blank"
            className="flex h-14 w-full items-center justify-center rounded-[22px] border border-hier-border bg-white text-sm font-semibold text-hier-text shadow-card transition hover:bg-hier-soft"
          >
            Get it on Google Play
          </a>
        </div>

        {/* Optional helper */}
        <div className="mt-8 text-xs text-hier-muted">
          Already installed?{" "}
          <Link href="/login" className="text-hier-primary hover:underline">
            Log in
          </Link>
        </div>
      </div>
    </main>
  );
}