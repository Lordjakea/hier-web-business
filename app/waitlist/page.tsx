"use client";

import Image from "next/image";
import { useState } from "react";

export default function WaitlistPage() {
  const [email, setEmail] = useState("");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!email.trim()) return;

    alert("Thanks — you're on the Hier waitlist.");
    setEmail("");
  }

  return (
    <main className="min-h-screen bg-[#F0EFEB] text-[#111111]">
      <header className="mx-auto flex max-w-7xl items-center px-6 py-6">
        <Image
          src="/hier-logo.png"
          alt="Hier"
          width={120}
          height={40}
          priority
          className="h-auto w-[120px]"
        />
      </header>

      <section className="mx-auto flex max-w-5xl flex-col items-center px-6 pt-14 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
          Get ready to go Hier!
        </h1>

        <p className="mt-5 max-w-2xl text-lg text-[#6B7280]">
          The hiring platform built to help businesses find, manage, and move
          candidates through the journey faster.
        </p>

        <form
          onSubmit={handleSubmit}
          className="mt-12 flex w-full max-w-md flex-col gap-3"
        >
          <input
            type="email"
            required
            placeholder="Enter your email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="rounded-2xl border border-[#D6D0C7] bg-white px-5 py-4 text-base outline-none focus:border-[#91A6EB]"
          />

          <button
            type="submit"
            className="rounded-2xl bg-[#91A6EB] px-5 py-4 text-base font-semibold text-white shadow-sm transition hover:opacity-90"
          >
            Join the waitlist
          </button>
        </form>
      </section>

      <section className="mx-auto mt-16 grid max-w-6xl grid-cols-1 gap-5 px-6 pb-10 md:grid-cols-3">
        {[
          {
            title: "Feed",
            text: "Showcase live roles and help candidates discover opportunities instantly.",
          },
          {
            title: "Applicant journey",
            text: "Track candidates from application through interview, offer, and start date.",
          },
          {
            title: "Profile",
            text: "Build a stronger company presence with a clean, modern business profile.",
          },
        ].map((item) => (
          <div
            key={item.title}
            className="rounded-3xl border border-[#D6D0C7] bg-white p-6 shadow-sm"
          >
            <div className="mb-5 flex h-48 items-center justify-center rounded-2xl bg-[#F0EFEB] text-sm font-semibold text-[#6B7280]">
              {item.title} snapshot
            </div>

            <h2 className="text-xl font-semibold">{item.title}</h2>
            <p className="mt-2 text-sm leading-6 text-[#6B7280]">{item.text}</p>
          </div>
        ))}
      </section>

      <section className="mx-auto max-w-3xl px-6 pb-20 text-center">
        <p className="text-base leading-7 text-[#6B7280]">
          Hier helps businesses connect with candidates, manage applications,
          schedule interviews, and build a smoother hiring process from first
          impression to final offer.
        </p>
      </section>
    </main>
  );
}