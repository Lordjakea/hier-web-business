"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Accessibility,
  Cookie,
  Database,
  ExternalLink,
  FileText,
  Save,
  ShieldCheck,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { getStoredUser } from "@/lib/auth";
import { fetchPolicyLinks, updatePolicyLinks, type StaffPolicyLink } from "@/lib/staff-crm";

const defaultPolicies: Record<string, StaffPolicyLink> = {
  terms_of_use: {
    key: "terms_of_use",
    title: "Terms of Use",
    description: "Platform rules, account responsibilities, subscriptions, cancellations, and acceptable use.",
    href: "https://www.hierapp.co.uk/terms-of-use",
  },
  privacy_policy: {
    key: "privacy_policy",
    title: "Privacy Policy",
    description: "How Hier collects, uses, stores, protects, and deletes personal information.",
    href: "https://www.hierapp.co.uk/privacy-policy",
  },
  cookie_policy: {
    key: "cookie_policy",
    title: "Cookie Policy",
    description: "Cookies, local storage, analytics, preferences, and related tracking information.",
    href: "https://www.hierapp.co.uk/cookie-policy",
  },
  data_processing: {
    key: "data_processing",
    title: "Data Processing",
    description: "Data handling, processing responsibilities, subprocessors, and business data terms.",
    href: "https://www.hierapp.co.uk/data-processing",
  },
  accessibility_statement: {
    key: "accessibility_statement",
    title: "Accessibility Statement",
    description: "Hier's accessibility commitments and support contact information.",
    href: "https://www.hierapp.co.uk/accessibility-statement",
  },
};

const policyOrder = [
  "terms_of_use",
  "privacy_policy",
  "cookie_policy",
  "data_processing",
  "accessibility_statement",
] as const;

const policyIcons = {
  terms_of_use: FileText,
  privacy_policy: ShieldCheck,
  cookie_policy: Cookie,
  data_processing: Database,
  accessibility_statement: Accessibility,
};

export default function PoliciesPage() {
  const [policies, setPolicies] = useState<Record<string, StaffPolicyLink>>(defaultPolicies);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canEdit = useMemo(() => {
    const user = getStoredUser();
    const staffRole = String(user?.staff_role || "").toLowerCase();
    return (
      user?.role === "staff" &&
      user?.email_verified &&
      user?.email?.toLowerCase().endsWith("@hierapp.co.uk") &&
      ["admin", "owner"].includes(staffRole)
    );
  }, []);

  useEffect(() => {
    let active = true;
    fetchPolicyLinks()
      .then((response) => {
        if (!active) return;
        setPolicies({ ...defaultPolicies, ...response.policies });
      })
      .catch(() => {
        if (!active) return;
        setPolicies(defaultPolicies);
      });

    return () => {
      active = false;
    };
  }, []);

  function updatePolicyHref(key: string, href: string) {
    setPolicies((current) => ({
      ...current,
      [key]: {
        ...(current[key] || defaultPolicies[key]),
        href,
      },
    }));
    setMessage(null);
    setError(null);
  }

  async function savePolicyLinks() {
    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const payload = Object.fromEntries(
        policyOrder.map((key) => [key, { href: policies[key]?.href || defaultPolicies[key].href }])
      );
      const response = await updatePolicyLinks(payload);
      setPolicies({ ...defaultPolicies, ...response.policies });
      setMessage("Policy links updated for every account.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update policy links.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Policies"
        title="Policy and legal pages"
        description="Access Hier's official legal and policy documents. These public pages are the source of truth for terms, privacy, cookies, data processing, and accessibility."
      />

      {canEdit ? (
        <section className="rounded-[28px] border border-hier-border bg-white p-5 shadow-card sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-hier-text">Global policy URLs</h2>
              <p className="mt-1 text-sm leading-6 text-hier-muted">
                Updating these links changes the policy links shown across every account.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void savePolicyLinks()}
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-hier-primary px-4 py-3 text-sm font-semibold text-white transition hover:bg-hier-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              {saving ? "Saving" : "Save URLs"}
            </button>
          </div>

          <div className="mt-5 grid gap-4">
            {policyOrder.map((key) => {
              const policy = policies[key] || defaultPolicies[key];
              return (
                <label key={key} className="block">
                  <span className="text-sm font-semibold text-hier-text">{policy.title}</span>
                  <input
                    value={policy.href}
                    onChange={(event) => updatePolicyHref(key, event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-hier-border bg-white px-4 py-3 text-sm text-hier-text outline-none transition focus:border-hier-primary focus:ring-4 focus:ring-hier-primary/10"
                    placeholder="https://"
                    type="url"
                  />
                </label>
              );
            })}
          </div>

          {message ? <p className="mt-4 text-sm font-semibold text-emerald-700">{message}</p> : null}
          {error ? <p className="mt-4 text-sm font-semibold text-red-700">{error}</p> : null}
        </section>
      ) : null}

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {policyOrder.map((key) => {
          const policy = policies[key] || defaultPolicies[key];
          const Icon = policyIcons[key];

          return (
            <Link
              key={policy.key}
              href={policy.href}
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
                      {policy.title}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-hier-muted">
                      {policy.description}
                    </p>
                  </div>
                </div>
                <ExternalLink className="mt-1 h-4 w-4 shrink-0 text-hier-muted group-hover:text-hier-primary" />
              </div>
            </Link>
          );
        })}
      </div>

      <section className="rounded-[28px] border border-hier-border bg-white p-6 shadow-card sm:p-8">
        <h2 className="text-xl font-semibold text-hier-text">Need help?</h2>
        <p className="mt-3 text-sm leading-7 text-hier-muted">
          For questions about Hier policies, privacy, data processing, or account deletion,
          contact{" "}
          <a href="mailto:hello@hierapp.co.uk" className="font-semibold text-hier-primary">
            hello@hierapp.co.uk
          </a>
          .
        </p>
      </section>
    </div>
  );
}
