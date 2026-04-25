"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  BriefcaseBusiness,
  CheckCircle2,
  FileText,
  Loader2,
  Mail,
  MessageSquarePlus,
  StickyNote,
  UserRound,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import {
  createStaffAccountNote,
  fetchStaffAccountDetail,
  type StaffAccountDetail,
} from "@/lib/staff-crm";

function formatDate(value?: string | null) {
  if (!value) return "—";

  try {
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return "—";
  }
}

function displayValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

function InfoCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[32px] border border-hier-border bg-white p-5 shadow-card sm:p-6">
      <h2 className="text-base font-semibold text-hier-text">{title}</h2>
      <div className="mt-5 space-y-3">{children}</div>
    </section>
  );
}

function DetailRow({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="flex flex-col gap-1 border-b border-hier-border/70 pb-3 last:border-b-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between">
      <p className="text-sm font-medium text-hier-muted">{label}</p>
      <p className="max-w-xl text-sm font-medium text-hier-text sm:text-right">
        {displayValue(value)}
      </p>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="rounded-[28px] border border-hier-border bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-hier-muted">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-hier-text">
        {displayValue(value)}
      </p>
    </div>
  );
}

export default function StaffAccountDetailPage() {
  const params = useParams<{ userId: string }>();
  const userId = Number(params.userId);

  const [account, setAccount] = useState<StaffAccountDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingNote, setSavingNote] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const loadAccount = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetchStaffAccountDetail(userId);
      setAccount(response.account);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not load staff account detail."
      );
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void loadAccount();
  }, [loadAccount]);

  async function handleCreateNote(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmed = note.trim();
    if (!trimmed || !userId) return;

    setSavingNote(true);
    setError(null);

    try {
      const response = await createStaffAccountNote(userId, trimmed);

      setAccount((current) =>
        current
          ? {
              ...current,
              notes: [response.note, ...(current.notes || [])],
            }
          : current
      );

      setNote("");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not save internal note."
      );
    } finally {
      setSavingNote(false);
    }
  }

  const title = useMemo(() => {
    if (!account?.basic) return "Account detail";

    return (
      account.business_profile?.company_name ||
      account.basic.full_name ||
      account.basic.email ||
      `User #${account.basic.id}`
    );
  }, [account]);

  if (loading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center rounded-[32px] border border-hier-border bg-white">
        <Loader2 className="h-7 w-7 animate-spin text-hier-primary" />
      </div>
    );
  }

  if (!account) {
    return (
      <div className="space-y-6">
        <Link
          href="/staff"
          className="inline-flex items-center gap-2 text-sm font-medium text-hier-muted hover:text-hier-text"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Staff CRM
        </Link>

        <div className="rounded-[32px] border border-red-200 bg-red-50 p-6 text-red-800">
          {error || "Account not found."}
        </div>
      </div>
    );
  }

  const Icon =
    account.account_type === "business" ? BriefcaseBusiness : UserRound;

  const recentItems =
    account.account_type === "business"
      ? account.recent_posts || []
      : account.recent_applications || [];

  return (
    <div className="space-y-8">
      <Link
        href="/staff"
        className="inline-flex items-center gap-2 text-sm font-medium text-hier-muted hover:text-hier-text"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Staff CRM
      </Link>

      <PageHeader
        eyebrow="Staff account view"
        title={title}
        description="View account information, recent account context and internal support notes."
        action={
          <div className="inline-flex items-center gap-2 rounded-full border border-hier-border bg-white px-4 py-2 text-sm font-semibold text-hier-text shadow-sm">
            <Icon className="h-4 w-4 text-hier-primary" />
            {account.account_type === "business" ? "Business" : "Candidate"}
          </div>
        }
      />

      {error ? (
        <div className="flex items-start gap-3 rounded-[24px] border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <p>{error}</p>
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Applications"
          value={account.metrics?.applications_total ?? 0}
        />
        <StatCard label="Live posts" value={account.metrics?.live_posts ?? 0} />
        <StatCard
          label="Total posts"
          value={account.metrics?.total_posts ?? 0}
        />
        <StatCard
          label="Account status"
          value={account.basic?.is_active ? "Active" : "Inactive"}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <div className="space-y-6">
          <InfoCard title="User account">
            <DetailRow label="User ID" value={account.basic?.id} />
            <DetailRow label="Email" value={account.basic?.email} />
            <DetailRow label="Phone" value={account.basic?.phone} />
            <DetailRow label="Full name" value={account.basic?.full_name} />
            <DetailRow label="Role" value={account.basic?.role} />
            <DetailRow
              label="Email verified"
              value={account.basic?.email_verified}
            />
            <DetailRow
              label="Phone verified"
              value={account.basic?.phone_verified}
            />
            <DetailRow
              label="Created"
              value={formatDate(account.basic?.created_at)}
            />
            <DetailRow
              label="Updated"
              value={formatDate(account.basic?.updated_at)}
            />
          </InfoCard>

          {account.account_type === "business" ? (
            <InfoCard title="Business profile">
              <DetailRow
                label="Company"
                value={account.business_profile?.company_name}
              />
              <DetailRow
                label="Company number"
                value={account.business_profile?.company_number}
              />
              <DetailRow
                label="Contact email"
                value={account.business_profile?.contact_email}
              />
              <DetailRow
                label="Contact phone"
                value={account.business_profile?.contact_phone}
              />
              <DetailRow
                label="Address"
                value={account.business_profile?.address_text}
              />
              <DetailRow
                label="Verified"
                value={account.business_profile?.verified}
              />
              <DetailRow label="Bio" value={account.business_profile?.bio} />
            </InfoCard>
          ) : (
            <InfoCard title="Candidate profile">
              <DetailRow label="First name" value={account.user_profile?.first_name} />
              <DetailRow label="Last name" value={account.user_profile?.last_name} />
              <DetailRow label="Headline" value={account.user_profile?.headline} />
              <DetailRow
                label="Summary"
                value={account.user_profile?.about || account.user_profile?.summary}
              />
              <DetailRow
                label="Location"
                value={account.user_profile?.address_text || account.user_profile?.location}
              />
              <DetailRow
                label="Contact number"
                value={account.user_profile?.contact_number}
              />
              <DetailRow
                label="CV filename"
                value={account.user_profile?.cv_filename}
              />
              <DetailRow
                label="CV uploaded"
                value={formatDate(account.user_profile?.cv_uploaded_at)}
              />
            </InfoCard>
          )}

          {account.business_account ? (
            <InfoCard title="Billing and plan">
              <DetailRow
                label="Plan"
                value={account.business_account.plan_code}
              />
              <DetailRow
                label="Status"
                value={
                  account.business_account.status ||
                  account.business_account.subscription_status
                }
              />
              <DetailRow
                label="Billing email"
                value={account.business_account.billing_email}
              />
              <DetailRow
                label="Stripe customer"
                value={
                  account.business_account.stripe_customer_id ||
                  account.business_account.provider_customer_id
                }
              />
              <DetailRow
                label="Current period end"
                value={formatDate(
                  account.business_account.subscription_current_period_end ||
                    account.business_account.current_period_end
                )}
              />
              <DetailRow
                label="Cancel at period end"
                value={account.business_account.subscription_cancel_at_period_end}
              />
              <DetailRow
                label="Monthly boost credits"
                value={
                  account.business_account.remaining_monthly_boost_credits ??
                  account.business_account.monthly_boost_credits
                }
              />
              <DetailRow
                label="Paid boost credits"
                value={
                  account.business_account.remaining_paid_boost_credits ??
                  account.business_account.paid_boost_credits
                }
              />
            </InfoCard>
          ) : null}

          <InfoCard
            title={
              account.account_type === "business"
                ? "Recent posts"
                : "Recent applications"
            }
          >
            {recentItems.length ? (
              recentItems.map((item) => (
                <div
                  key={item.id}
                  className="rounded-[22px] border border-hier-border bg-hier-panel p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-hier-text">
                        {item.title ||
                          item.job_title ||
                          item.company_name ||
                          `Item #${item.id}`}
                      </p>
                      <p className="mt-1 text-sm text-hier-muted">
                        {item.company_name ||
                          item.stage ||
                          item.status ||
                          `${item.application_count || 0} applications`}
                      </p>
                    </div>

                    <FileText className="h-4 w-4 shrink-0 text-hier-muted" />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-hier-muted">No recent items yet.</p>
            )}
          </InfoCard>
        </div>

        <aside className="space-y-6">
          <section className="rounded-[32px] border border-hier-border bg-white p-5 shadow-card sm:p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-hier-soft p-2 text-hier-primary">
                <MessageSquarePlus className="h-5 w-5" />
              </div>

              <div>
                <h2 className="text-base font-semibold text-hier-text">
                  Add internal note
                </h2>
                <p className="text-sm text-hier-muted">
                  Only Hier staff can see these notes.
                </p>
              </div>
            </div>

            <form className="mt-5 space-y-3" onSubmit={handleCreateNote}>
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Add a support note, billing context, technical issue or follow-up..."
                rows={5}
                className="w-full resize-none rounded-[22px] border border-hier-border bg-hier-panel p-4 text-sm text-hier-text outline-none transition focus:border-hier-primary focus:bg-white"
              />

              <button
                type="submit"
                disabled={savingNote || !note.trim()}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-[20px] bg-hier-primary px-4 text-sm font-semibold text-white shadow-card transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {savingNote ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <StickyNote className="h-4 w-4" />
                )}
                Save internal note
              </button>
            </form>
          </section>

          <section className="rounded-[32px] border border-hier-border bg-white p-5 shadow-card sm:p-6">
            <h2 className="text-base font-semibold text-hier-text">
              Internal notes
            </h2>

            <div className="mt-5 space-y-3">
              {account.notes?.length ? (
                account.notes.map((item) => (
                  <div
                    key={item.id}
                    className="flex gap-3 rounded-[22px] border border-hier-border bg-hier-panel p-4"
                  >
                    <div className="mt-0.5 rounded-2xl bg-white p-2 text-hier-primary shadow-sm">
                      <StickyNote className="h-4 w-4" />
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-hier-text">
                        Internal note
                      </p>

                      <p className="mt-1 text-sm leading-5 text-hier-muted">
                        {item.note || "—"}
                      </p>

                      <p className="mt-2 flex flex-wrap items-center gap-1 text-xs text-hier-muted">
                        <Mail className="h-3.5 w-3.5" />
                        <span>
                          {item.author_name || item.author_email || "Hier staff"}
                        </span>
                        <span>·</span>
                        <span>{formatDate(item.created_at)}</span>
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-hier-muted">No internal notes yet.</p>
              )}
            </div>
          </section>

          <section className="rounded-[32px] border border-amber-200 bg-amber-50 p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />

              <div>
                <h2 className="text-base font-semibold text-amber-950">
                  Safe first version
                </h2>
                <p className="mt-2 text-sm leading-6 text-amber-900">
                  This account view is currently read and note only. Delete
                  account, billing edits, email sending and post deletion should
                  be added after audit logging and staff role checks are locked
                  down.
                </p>
              </div>
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
}