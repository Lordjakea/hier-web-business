"use client";

import { HierBrand } from "@/components/ui/brand";
import Image from "next/image";
import Link from "next/link";

const APPLE_APP_URL = "https://apps.apple.com/us/app/hier-jobs/id6762534279";
const ANDROID_APP_URL =
  "https://play.google.com/store/apps/details?id=com.hier.mobile&hl=en_GB";

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
            href={APPLE_APP_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Download Hier Jobs on the App Store"
            className="flex h-14 w-full items-center justify-center rounded-[22px] bg-black text-sm font-semibold text-white shadow-card transition hover:translate-y-[-1px]"
          >
            <Image
              src="/app-store-badge.svg"
              alt="Download on the App Store"
              width={156}
              height={46}
              className="h-[46px] w-auto"
            />
          </a>

          <a
            href={ANDROID_APP_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Get Hier Jobs on Google Play"
            className="flex h-14 w-full items-center justify-center rounded-[22px] bg-black text-sm font-semibold text-white shadow-card transition hover:translate-y-[-1px]"
          >
            <Image
              src="/google-play-badge.svg"
              alt="Get it on Google Play"
              width={156}
              height={46}
              className="h-[46px] w-auto"
            />
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
