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
  Trash2,
  X,
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
  fetchStaffAccountPosts,
  removeStaffPost,
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

  const [posts, setPosts] = useState<any[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [selectedPost, setSelectedPost] = useState<any | null>(null);
  const [removeReason, setRemoveReason] = useState("");
  const [removingPost, setRemovingPost] = useState(false);

  const loadAccount = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetchStaffAccountDetail(userId);
      setAccount(response.account);

      if (response.account.account_type === "business") {
        setLoadingPosts(true);
        try {
          const postsResponse = await fetchStaffAccountPosts(userId);
          setPosts(postsResponse.items || []);
        } finally {
          setLoadingPosts(false);
        }
      }
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

  async function handleConfirmRemovePost() {
  if (!selectedPost) return;

  const trimmed = removeReason.trim();

  if (trimmed.length < 10) {
    setError("Please enter a removal reason of at least 10 characters.");
    return;
  }

  setRemovingPost(true);
  setError(null);

  try {
    const response = await removeStaffPost(selectedPost.id, trimmed);

    setPosts((current) =>
      current.map((post) =>
        post.id === selectedPost.id ? { ...post, ...response.post } : post
      )
    );

    setAccount((current) =>
      current
        ? {
            ...current,
            notes: response.note
              ? [response.note, ...(current.notes || [])]
              : current.notes,
          }
        : current
    );

    setSelectedPost(null);
    setRemoveReason("");
  } catch (caughtError) {
    setError(
      caughtError instanceof Error
        ? caughtError.message
        : "Could not remove this post."
    );
  } finally {
    setRemovingPost(false);
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

          {account.account_type === "business" ? (
            <InfoCard title="Business posts">
              {loadingPosts ? (
                <div className="flex items-center gap-2 text-sm text-hier-muted">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading posts...
                </div>
              ) : posts.length ? (
                posts.map((post) => {
                  const removed =
                    !post.is_active || post.archived_at || post.shadow_hidden;

                  return (
                    <div
                      key={post.id}
                      className="rounded-[22px] border border-hier-border bg-hier-panel p-4"
                    >
                      {post.image_url ? (
                        <div className="mb-4 overflow-hidden rounded-[20px] border border-hier-border bg-white">
                          <img
                            src={post.image_url}
                            alt={post.title || "Job post image"}
                            className="h-48 w-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="mb-4 flex h-32 items-center justify-center rounded-[20px] border border-dashed border-hier-border bg-white text-sm text-hier-muted">
                          No post image
                        </div>
                      )}

                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-semibold text-hier-text">
                            {post.title || `Post #${post.id}`}
                          </p>
                          <p className="mt-1 text-sm text-hier-muted">
                            {post.location || post.sector || "—"}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2 text-xs">
                            <span className="rounded-full bg-white px-2.5 py-1 font-medium text-hier-muted">
                              {post.employment_type || "Role"}
                            </span>
                            <span
                              className={`rounded-full px-2.5 py-1 font-medium ${
                                removed
                                  ? "bg-red-50 text-red-700"
                                  : "bg-emerald-50 text-emerald-700"
                              }`}
                            >
                              {removed ? "Removed" : "Live"}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={removed}
                          onClick={() => {
                            setSelectedPost(post);
                            setRemoveReason("");
                          }}
                          className="inline-flex items-center gap-2 rounded-2xl border border-hier-border bg-white px-3 py-2 text-xs font-semibold text-hier-text transition hover:bg-hier-soft disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Review
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-hier-muted">No posts found.</p>
              )}
            </InfoCard>
          ) : (
            <InfoCard title="Recent applications">
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
          )}
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
    {selectedPost ? (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
        <div className="w-full max-w-lg rounded-[32px] border border-hier-border bg-white p-6 shadow-2xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-hier-text">
                Review job post
              </h2>
              <p className="mt-1 text-sm text-hier-muted">
                Review the full post before deciding whether it should stay live or be removed.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setSelectedPost(null);
                setRemoveReason("");
              }}
              className="rounded-2xl border border-hier-border bg-white p-2 text-hier-muted hover:text-hier-text"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-5 max-h-[65vh] overflow-y-auto pr-1">
            {selectedPost.image_url ? (
              <div className="overflow-hidden rounded-[24px] border border-hier-border bg-white">
                <img
                  src={selectedPost.image_url}
                  alt={selectedPost.title || "Job post image"}
                  className="h-64 w-full object-cover"
                />
              </div>
            ) : (
              <div className="flex h-40 items-center justify-center rounded-[24px] border border-dashed border-hier-border bg-hier-panel text-sm text-hier-muted">
                No post image
              </div>
            )}

            <div className="mt-5 rounded-[22px] border border-hier-border bg-hier-panel p-4">
              <p className="text-lg font-semibold text-hier-text">
                {selectedPost.title || `Post #${selectedPost.id}`}
              </p>

              <div className="mt-3 grid gap-3 text-sm text-hier-muted sm:grid-cols-2">
                <p><span className="font-semibold text-hier-text">Company:</span> {selectedPost.company_name || "—"}</p>
                <p><span className="font-semibold text-hier-text">Location:</span> {selectedPost.location || "—"}</p>
                <p><span className="font-semibold text-hier-text">Sector:</span> {selectedPost.sector || "—"}</p>
                <p><span className="font-semibold text-hier-text">Type:</span> {selectedPost.employment_type || "—"}</p>
                <p><span className="font-semibold text-hier-text">Salary min:</span> {selectedPost.salary_min || "—"}</p>
                <p><span className="font-semibold text-hier-text">Salary max:</span> {selectedPost.salary_max || "—"}</p>
                <p><span className="font-semibold text-hier-text">Created:</span> {formatDate(selectedPost.created_at)}</p>
                <p><span className="font-semibold text-hier-text">Status:</span> {selectedPost.is_active ? "Live" : "Removed"}</p>
              </div>

              <div className="mt-5">
                <p className="text-sm font-semibold text-hier-text">Description</p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-hier-muted">
                  {selectedPost.description || "No description provided."}
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-[22px] border border-red-200 bg-red-50 p-4">
              <label className="block text-sm font-semibold text-red-950">
                Removal reason
              </label>
              <p className="mt-1 text-xs text-red-800">
                Only complete this if you decide the post should be removed. This reason will be emailed to the business.
              </p>

              <textarea
                value={removeReason}
                onChange={(event) => setRemoveReason(event.target.value)}
                rows={5}
                placeholder="Explain why this post is being removed..."
                className="mt-3 w-full resize-none rounded-[18px] border border-red-200 bg-white p-4 text-sm text-hier-text outline-none transition focus:border-red-500"
              />
            </div>
          </div>

          <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => {
                setSelectedPost(null);
                setRemoveReason("");
              }}
              className="inline-flex h-11 items-center justify-center rounded-[18px] border border-hier-border bg-white px-4 text-sm font-semibold text-hier-text"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={removeReason.trim().length < 10 || removingPost}
              onClick={handleConfirmRemovePost}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-[18px] bg-red-600 px-4 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {removingPost ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileText className="h-4 w-4" />
              )}
              Remove post
            </button>
          </div>
        </div>
      </div>
    ) : null}
    </div>
  );
}