"use client";

import Image from "next/image";
import { useState } from "react";

const snapshots = [
  {
    title: "Feed",
    image: "/waitlist/feed.png",
    description:
      "Discover roles from businesses actively hiring and find opportunities that match what you’re looking for.",
  },
  {
    title: "Applicant journey",
    image: "/waitlist/journey.png",
    description:
      "Track your progress from application to interview, offer, and start date.",
  },
  {
    title: "Profile",
    image: "/waitlist/profile.png",
    description:
      "Build a candidate profile that helps employers understand your experience, goals, and personality.",
  },
];

export default function WaitlistPage() {
  const [email, setEmail] = useState("");
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) return;

    setLoading(true);
    setError("");

    try {
      const baseUrl =
        process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:5000";

      const res = await fetch(`${baseUrl}/api/waitlist`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: trimmedEmail,
          source: "waitlist_page",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Could not join the waitlist.");
      }

      setSubmittedEmail(trimmedEmail);
      setEmail("");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleShare() {
    const shareUrl = window.location.href;

    try {
      if (navigator.share) {
        await navigator.share({
          title: "Join the Hier waitlist",
          text: "I just joined the Hier waitlist — check it out.",
          url: shareUrl,
        });
        return;
      }

      await navigator.clipboard.writeText(shareUrl);
      setError("Waitlist link copied.");
    } catch {
      setError("Could not open share options. Please copy the page link.");
    }
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#F0EFEB] text-[#111111]">
      <div className="absolute left-1/2 top-[-220px] h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-[#91A6EB]/30 blur-3xl" />

      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <Image
          src="/hier-logo.png"
          alt="Hier"
          width={118}
          height={40}
          priority
          className="h-auto w-[118px]"
        />

        <span className="rounded-full border border-[#D6D0C7] bg-white/70 px-4 py-2 text-sm font-medium text-[#6B7280] shadow-sm">
          Launching soon
        </span>
      </header>

      <section className="relative z-10 mx-auto flex max-w-5xl flex-col items-center px-6 pt-12 text-center">
        <div className="mb-5 rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#91A6EB] shadow-sm">
          Time to go Hier than before
        </div>

        <h1 className="max-w-3xl text-5xl font-bold tracking-tight sm:text-7xl">
          Get ready to go Hier!
        </h1>

        <p className="mt-6 max-w-2xl text-lg leading-8 text-[#6B7280]">
          Join the early access list for Hier — the smarter way to discover
          jobs, build your profile, and move through the hiring journey with
          confidence.
        </p>

        {submittedEmail ? (
          <div className="mt-12 w-full max-w-md rounded-3xl border border-[#D6D0C7] bg-white p-6 text-center shadow-sm">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#91A6EB]/20 text-2xl">
              🎉
            </div>

            <h2 className="mt-5 text-2xl font-bold text-[#111111]">
              Thanks — you’re on the waitlist
            </h2>

            <p className="mt-3 text-sm leading-6 text-[#6B7280]">
              We’ll email{" "}
              <span className="font-semibold text-[#111111]">
                {submittedEmail}
              </span>{" "}
              when Hier is ready.
            </p>

            <button
              type="button"
              onClick={handleShare}
              className="mt-5 w-full rounded-2xl bg-[#91A6EB] px-5 py-4 text-base font-semibold text-white shadow-sm transition hover:scale-[1.01] hover:opacity-95"
            >
              Share Hier
            </button>

            <button
              type="button"
              onClick={() => {
                setSubmittedEmail("");
                setError("");
              }}
              className="mt-3 w-full rounded-2xl border border-[#D6D0C7] bg-white px-5 py-4 text-base font-semibold text-[#111111] transition hover:bg-[#F0EFEB]"
            >
              Add another email
            </button>

            {error ? (
              <p className="mt-3 rounded-2xl bg-[#F0EFEB] px-4 py-3 text-sm font-medium text-[#6B7280]">
                {error}
              </p>
            ) : null}
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="mt-12 w-full max-w-md rounded-3xl border border-[#D6D0C7] bg-white p-3 shadow-sm"
          >
            <input
              type="email"
              required
              placeholder="Enter your email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mb-3 w-full rounded-2xl border border-[#D6D0C7] bg-[#F0EFEB] px-5 py-4 text-base outline-none focus:border-[#91A6EB]"
            />

            {error ? (
              <p className="mb-3 rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-[#91A6EB] px-5 py-4 text-base font-semibold text-white shadow-sm transition hover:scale-[1.01] hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Joining..." : "Join the waitlist"}
            </button>
          </form>
        )}
      </section>

      <section className="relative z-10 mx-auto mt-16 grid max-w-6xl grid-cols-1 gap-5 px-6 md:grid-cols-3">
        {snapshots.map((item) => (
          <article
            key={item.title}
            className="rounded-[2rem] border border-[#D6D0C7] bg-white/80 p-5 shadow-sm backdrop-blur"
          >
            <div className="mb-5 overflow-hidden rounded-[1.5rem] bg-[#F0EFEB]">
              <Image
                src={item.image}
                alt={`${item.title} preview`}
                width={700}
                height={900}
                className="h-72 w-full object-cover object-top"
              />
            </div>

            <h2 className="text-xl font-semibold">{item.title}</h2>

            <p className="mt-2 text-sm leading-6 text-[#6B7280]">
              {item.description}
            </p>
          </article>
        ))}
      </section>

      <section className="relative z-10 mx-auto max-w-4xl px-6 py-20 text-center">
        <h2 className="text-3xl font-bold tracking-tight">
          Job hunting, made clearer.
        </h2>

        <p className="mt-5 text-base leading-8 text-[#6B7280]">
          Hier helps candidates find better opportunities, apply faster, manage
          their applications, and stay connected with businesses throughout the
          hiring process.
        </p>
      </section>
    </main>
  );
}