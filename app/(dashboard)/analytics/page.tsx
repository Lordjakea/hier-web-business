"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Eye,
  FileText,
  Heart,
  MessageSquare,
  TrendingUp,
  UserPlus,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { fetchBusinessAnalyticsSummary } from "@/lib/business-applications";
import type { AnalyticsSummaryResponse } from "@/lib/types";

const RANGE_OPTIONS: Array<{ label: string; value: 7 | 30 | 90 | 365 }> = [
  { label: "7 days", value: 7 },
  { label: "30 days", value: 30 },
  { label: "90 days", value: 90 },
  { label: "365 days", value: 365 },
];

function formatNumber(value: number | undefined | null) {
  return new Intl.NumberFormat("en-GB").format(Number(value || 0));
}

function formatPercent(value: number | undefined | null) {
  return `${Number(value || 0).toFixed(1)}%`;
}

function formatSignedPercent(value: number | undefined | null) {
  const numeric = Number(value || 0);
  const sign = numeric > 0 ? "+" : "";
  return `${sign}${numeric.toFixed(1)}%`;
}

function clampWidth(value: number | undefined | null, max: number) {
  const safe = Number(value || 0);
  if (max <= 0) return 0;
  return Math.max(6, Math.min(100, (safe / max) * 100));
}

function TrendChip({ value }: { value: number | undefined | null }) {
  const numeric = Number(value || 0);
  const positive = numeric >= 0;
  const Icon = positive ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
        positive ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      {formatSignedPercent(numeric)}
    </span>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: typeof Users;
  trend?: number;
}) {
  return (
    <section className="rounded-[28px] border border-hier-border bg-white p-5 shadow-card sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-hier-muted">{title}</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-hier-text">{value}</p>
          <p className="mt-2 text-sm leading-6 text-hier-muted">{subtitle}</p>
        </div>
        <div className="rounded-2xl bg-hier-soft p-3 text-hier-primary">
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {typeof trend === "number" ? <div className="mt-5"><TrendChip value={trend} /></div> : null}
    </section>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[22px] border border-hier-border bg-hier-panel p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-hier-muted">{label}</p>
      <p className="mt-2 text-xl font-semibold text-hier-text">{value}</p>
    </div>
  );
}

export default function AnalyticsPage() {
  const [days, setDays] = useState<7 | 30 | 90 | 365>(30);
  const [data, setData] = useState<AnalyticsSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetchBusinessAnalyticsSummary(days);
        if (!cancelled) setData(response);
      } catch (caughtError) {
        if (!cancelled) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "Could not load analytics right now."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [days]);

  const funnelMax = useMemo(
    () => Math.max(...(data?.funnel.map((item) => item.count) || [0]), 1),
    [data]
  );

  const cards = data
    ? [
        {
          title: "Applicants in pipeline",
          value: formatNumber(data.summary.total_applicants),
          subtitle: `${formatNumber(data.summary.viewed_applicants)} viewed · ${formatNumber(
            data.summary.unviewed_applicants
          )} still unviewed`,
          icon: Users,
          trend: data.trends.applicants_delta,
        },
        {
          title: "Open roles",
          value: formatNumber(data.summary.active_posts),
          subtitle: `${formatNumber(data.summary.total_posts)} total posts in this period`,
          icon: Activity,
        },
        {
          title: "CV reviews",
          value: formatNumber(data.summary.cv_views),
          subtitle: `${formatPercent(data.rates.view_rate)} applicant view rate`,
          icon: Eye,
        },
        {
          title: "Followers gained",
          value: formatNumber(data.summary.follower_growth),
          subtitle: `${formatNumber(data.summary.total_followers)} total followers`,
          icon: UserPlus,
          trend: data.trends.followers_delta,
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Analytics Pro"
        title="Recruitment analytics"
        description="Track applicant flow, recruiter activity, conversion rates, and the roles that are pulling the strongest response from your business dashboard."
        action={
          <div className="inline-flex rounded-[22px] border border-hier-border bg-white p-1 shadow-sm">
            {RANGE_OPTIONS.map((option) => {
              const active = days === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setDays(option.value)}
                  className={`rounded-[18px] px-4 py-2 text-sm font-medium transition ${
                    active
                      ? "bg-hier-primary text-white shadow-sm"
                      : "text-hier-muted hover:bg-hier-soft hover:text-hier-text"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        }
      />

      {error ? (
        <div className="rounded-[24px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="grid gap-5 xl:grid-cols-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-[172px] animate-pulse rounded-[28px] border border-hier-border bg-white"
            />
          ))}
        </div>
      ) : data ? (
        <>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {cards.map((card) => (
              <StatCard key={card.title} {...card} />
            ))}
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <section className="rounded-[32px] border border-hier-border bg-white p-6 shadow-card sm:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-hier-muted">
                    Funnel performance
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-hier-text">
                    Hiring pipeline conversion
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm leading-7 text-hier-muted">
                    See where applicants are flowing cleanly through the pipeline and where recruiter attention is still needed.
                  </p>
                </div>
                <div className="rounded-[22px] border border-hier-border bg-hier-panel px-4 py-3 text-right">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-hier-muted">
                    Start rate
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-hier-text">
                    {formatPercent(data.rates.start_rate)}
                  </p>
                </div>
              </div>

              <div className="mt-8 space-y-4">
                {data.funnel.map((item) => (
                  <div key={item.key} className="space-y-2">
                    <div className="flex items-center justify-between gap-4 text-sm">
                      <div className="flex items-center gap-3">
                        <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-full bg-hier-soft px-2 text-xs font-semibold text-hier-primary">
                          {item.count}
                        </span>
                        <span className="font-medium text-hier-text">{item.label}</span>
                      </div>
                      <span className="text-hier-muted">
                        {formatPercent((item.count / funnelMax) * 100)} of peak volume
                      </span>
                    </div>
                    <div className="h-3 rounded-full bg-hier-panel">
                      <div
                        className="h-3 rounded-full bg-hier-primary transition-all"
                        style={{ width: `${clampWidth(item.count, funnelMax)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[32px] border border-hier-border bg-white p-6 shadow-card sm:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-hier-muted">
                Needs attention
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-hier-text">
                Recruiter follow-up queue
              </h2>
              <p className="mt-2 text-sm leading-7 text-hier-muted">
                These are the easiest operational wins to tighten up candidate handling across the board.
              </p>

              <div className="mt-6 grid gap-4 sm:grid-cols-3 xl:grid-cols-1">
                <MiniMetric
                  label="Unviewed applicants"
                  value={formatNumber(data.needs_attention.unviewed_applicants)}
                />
                <MiniMetric
                  label="Missing ratings"
                  value={formatNumber(data.needs_attention.applicants_without_rating)}
                />
                <MiniMetric
                  label="Missing tags"
                  value={formatNumber(data.needs_attention.applicants_without_tags)}
                />
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <MiniMetric
                  label="Shortlist rate"
                  value={formatPercent(data.rates.shortlist_rate)}
                />
                <MiniMetric
                  label="Offer rate"
                  value={formatPercent(data.rates.offer_rate)}
                />
                <MiniMetric
                  label="Interview rate"
                  value={formatPercent(data.rates.interview_rate)}
                />
                <MiniMetric
                  label="Follower conversion"
                  value={formatPercent(data.rates.follower_conversion_rate)}
                />
              </div>
            </section>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <section className="rounded-[32px] border border-hier-border bg-white p-6 shadow-card sm:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-hier-muted">
                    Top posts
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-hier-text">Best performing roles</h2>
                  <p className="mt-2 text-sm leading-7 text-hier-muted">
                    Your strongest job posts by applicant volume, review progress, and shortlist momentum.
                  </p>
                </div>
                <div className="rounded-[22px] border border-hier-border bg-hier-panel px-4 py-3 text-right">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-hier-muted">
                    Active posts
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-hier-text">
                    {formatNumber(data.summary.active_posts)}
                  </p>
                </div>
              </div>

              <div className="mt-6 overflow-hidden rounded-[24px] border border-hier-border">
                <div className="grid grid-cols-[minmax(0,1.6fr)_0.7fr_0.7fr_0.7fr] gap-4 border-b border-hier-border bg-hier-panel px-4 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-hier-muted">
                  <span>Role</span>
                  <span>Applicants</span>
                  <span>Viewed</span>
                  <span>Shortlisted</span>
                </div>
                <div className="divide-y divide-hier-border">
                  {data.top_posts.length ? (
                    data.top_posts.map((post) => (
                      <div
                        key={post.job_post_id}
                        className="grid grid-cols-[minmax(0,1.6fr)_0.7fr_0.7fr_0.7fr] gap-4 px-4 py-4 text-sm"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-hier-text">{post.title}</p>
                          <p className="mt-1 text-xs text-hier-muted">
                            View rate {formatPercent(post.view_rate)}
                          </p>
                        </div>
                        <span className="font-medium text-hier-text">{formatNumber(post.applicants)}</span>
                        <span className="font-medium text-hier-text">{formatNumber(post.viewed_applicants)}</span>
                        <span className="font-medium text-hier-text">{formatNumber(post.shortlisted)}</span>
                      </div>
                    ))
                  ) : (
                    <div className="px-4 py-8 text-sm text-hier-muted">
                      No post performance data is available for this date range yet.
                    </div>
                  )}
                </div>
              </div>
            </section>

            <section className="rounded-[32px] border border-hier-border bg-white p-6 shadow-card sm:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-hier-muted">
                Engagement snapshot
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-hier-text">Audience and content response</h2>
              <p className="mt-2 text-sm leading-7 text-hier-muted">
                This brings together the engagement figures your current backend can already surface today.
              </p>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <StatCard
                  title="Likes"
                  value={formatNumber(data.engagement.likes)}
                  subtitle="Across jobs and content posts"
                  icon={Heart}
                  trend={data.trends.likes_delta}
                />
                <StatCard
                  title="Comments"
                  value={formatNumber(data.engagement.comments)}
                  subtitle="Direct engagement from candidates"
                  icon={MessageSquare}
                  trend={data.trends.comments_delta}
                />
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <MiniMetric label="Saves" value={formatNumber(data.engagement.saves)} />
                <MiniMetric label="Followers" value={formatNumber(data.engagement.followers)} />
                <MiniMetric
                  label="Engagement rate"
                  value={formatPercent(data.engagement.engagement_rate)}
                />
                <MiniMetric
                  label="Views supported"
                  value={data.meta.post_views_supported ? "Yes" : "Not yet"}
                />
              </div>

              <div className="mt-6 rounded-[24px] border border-hier-border bg-gradient-to-br from-hier-soft to-white p-5">
                <div className="flex items-start gap-3">
                  <div className="rounded-2xl bg-white p-3 text-hier-primary shadow-sm">
                    <TrendingUp className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-hier-text">Current backend fit</p>
                    <p className="mt-2 text-sm leading-7 text-hier-muted">
                      Views, shares, and unique viewers are still intentionally limited by the backend schema, but the rest of this page is now live against your production analytics summary endpoint.
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <section className="rounded-[32px] border border-hier-border bg-white p-6 shadow-card sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-hier-muted">
              Quality signals
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-hier-text">Recruiter review coverage</h2>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-hier-muted">
              Keep note-taking, tags, and candidate evaluation visible so teams know where review coverage is strong and where it still needs attention.
            </p>

            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MiniMetric
                label="Rated applicants"
                value={formatNumber(data.summary.rated_applicants)}
              />
              <MiniMetric
                label="Tagged applicants"
                value={formatNumber(data.summary.tagged_applicants)}
              />
              <MiniMetric
                label="Noted applicants"
                value={formatNumber(data.summary.noted_applicants)}
              />
              <MiniMetric
                label="Like rate"
                value={formatPercent(data.rates.like_rate)}
              />
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-[24px] border border-hier-border bg-hier-panel p-5">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-white p-3 text-hier-primary shadow-sm">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-hier-text">CV review cadence</p>
                    <p className="mt-1 text-sm text-hier-muted">{formatNumber(data.summary.cv_views)} views logged</p>
                  </div>
                </div>
              </div>
              <div className="rounded-[24px] border border-hier-border bg-hier-panel p-5">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-white p-3 text-hier-primary shadow-sm">
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-hier-text">Viewed applicants</p>
                    <p className="mt-1 text-sm text-hier-muted">{formatNumber(data.summary.viewed_applicants)} candidates reviewed</p>
                  </div>
                </div>
              </div>
              <div className="rounded-[24px] border border-hier-border bg-hier-panel p-5">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-white p-3 text-hier-primary shadow-sm">
                    <Eye className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-hier-text">View rate</p>
                    <p className="mt-1 text-sm text-hier-muted">{formatPercent(data.rates.view_rate)} of applicants opened</p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
