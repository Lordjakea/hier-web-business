"use client";

import Link from "next/link";
import {
  Accessibility,
  Cookie,
  Database,
  ExternalLink,
  FileText,
  ShieldCheck,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";

const policies = [
  {
    title: "Terms of Use",
    description: "Platform rules, account responsibilities, subscriptions, cancellations, and acceptable use.",
    href: "https://www.hierapp.co.uk/terms-of-use",
    icon: FileText,
  },
  {
    title: "Privacy Policy",
    description: "How Hier collects, uses, stores, protects, and deletes personal information.",
    href: "https://www.hierapp.co.uk/privacy-policy",
    icon: ShieldCheck,
  },
  {
    title: "Cookie Policy",
    description: "Cookies, local storage, analytics, preferences, and related tracking information.",
    href: "https://www.hierapp.co.uk/cookie-policy",
    icon: Cookie,
  },
  {
    title: "Data Processing",
    description: "Data handling, processing responsibilities, subprocessors, and business data terms.",
    href: "https://www.hierapp.co.uk/data-processing",
    icon: Database,
  },
  {
    title: "Accessibility Statement",
    description: "Hier’s accessibility commitments and support contact information.",
    href: "https://www.hierapp.co.uk/accessibility-statement",
    icon: Accessibility,
  },
];

export default function PoliciesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Policies"
        title="Policy and legal pages"
        description="Access Hier’s official legal and policy documents. These public pages are the source of truth for terms, privacy, cookies, data processing, and accessibility."
      />

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {policies.map(({ title, description, href, icon: Icon }) => (
          <Link
            key={title}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="group rounded-[28px] border border-hier-border bg-white p-5 shadow-card transition hover:-translate-y-0.5 hover:border-hier-primary/40 hover:shadow-lg"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="rounded-2xl bg-hier-soft p-3 text-hier-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-hier-text group-hover:text-hier-primary">
                    {title}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-hier-muted">
                    {description}
                  </p>
                </div>
              </div>
              <ExternalLink className="mt-1 h-4 w-4 shrink-0 text-hier-muted group-hover:text-hier-primary" />
            </div>
          </Link>
        ))}
      </div>

      <section className="rounded-[32px] border border-hier-border bg-white p-6 shadow-card sm:p-8">
        <h2 className="text-xl font-semibold text-hier-text">Need help?</h2>
        <p className="mt-3 text-sm leading-7 text-hier-muted">
          For questions about Hier policies, privacy, data processing, or account deletion,
          contact{" "}
          <a
            href="mailto:hello@hierapp.co.uk"
            className="font-semibold text-hier-primary"
          >
            hello@hierapp.co.uk
          </a>
          .
        </p>
      </section>
    </div>
  );
}