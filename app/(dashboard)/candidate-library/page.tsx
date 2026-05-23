"use client";

import { useEffect, useMemo, useState } from "react";
import { Brain, CheckCircle2, Loader2, Search, UserRoundCheck } from "lucide-react";
import {
  fetchCandidateLibrary,
  shortlistCandidateLibrary,
  type CandidateLibraryEntry,
  type CandidateLibraryJob,
} from "@/lib/candidate-library";
import { PageHeader } from "@/components/ui/page-header";

function scoreTone(score?: number | null) {
  const value = Number(score || 0);
  if (value >= 45) return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (value >= 25) return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-slate-50 text-slate-600 border-slate-200";
}

export default function CandidateLibraryPage() {
  const [items, setItems] = useState<CandidateLibraryEntry[]>([]);
  const [jobs, setJobs] = useState<CandidateLibraryJob[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function load(nextJobId = selectedJobId) {
    setError(null);
    setLoading(true);
    try {
      const response = await fetchCandidateLibrary({
        jobPostId: nextJobId,
        q: query.trim() || undefined,
      });
      setItems(response.items || []);
      setJobs(response.jobs || []);
      if (!nextJobId && response.jobs?.[0]?.id) setSelectedJobId(response.jobs[0].id);
    } catch (e: any) {
      setError(e?.message || "Could not load candidate library.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedJob = useMemo(
    () => jobs.find((job) => job.id === selectedJobId) || null,
    [jobs, selectedJobId],
  );

  const selectedCount = selectedIds.length;

  async function handleScoreJob(jobId: number) {
    setSelectedJobId(jobId);
    setSelectedIds([]);
    await load(jobId);
  }

  async function handleShortlist() {
    if (!selectedJobId || selectedIds.length === 0) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const response = await shortlistCandidateLibrary({
        job_post_id: selectedJobId,
        entry_ids: selectedIds,
      });
      setNotice(
        `${response.moved} moved to Applied. ${response.not_actively_looking} not moved because they are not marked actively looking. ${response.already_applied} were already in that role.`,
      );
      setSelectedIds([]);
      await load(selectedJobId);
    } catch (e: any) {
      setError(e?.message || "Could not move candidates to Applied.");
    } finally {
      setBusy(false);
    }
  }

  function toggleEntry(id: number) {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Candidate Library"
        title="Your saved CV library"
        description="Candidates from completed roles are kept here so Pro and Hier teams can score them against new roles and move suitable active candidates into Applied."
      />

      <section className="rounded-[32px] border border-hier-border bg-white p-5 shadow-card">
        <div className="grid gap-4 lg:grid-cols-[1fr_280px_auto]">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-hier-muted">
              Hiring for
            </span>
            <select
              value={selectedJobId || ""}
              onChange={(event) => void handleScoreJob(Number(event.target.value))}
              className="mt-2 h-12 w-full rounded-[18px] border border-hier-border bg-white px-4 text-sm font-semibold text-hier-text outline-none"
            >
              <option value="">Select a live role</option>
              {jobs.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.title || `Role #${job.id}`}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-hier-muted">
              Search
            </span>
            <div className="mt-2 flex h-12 items-center gap-2 rounded-[18px] border border-hier-border px-4">
              <Search className="h-4 w-4 text-hier-muted" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void load();
                }}
                placeholder="Name, email or headline"
                className="w-full bg-transparent text-sm outline-none"
              />
            </div>
          </label>

          <button
            type="button"
            onClick={() => void handleShortlist()}
            disabled={!selectedJobId || selectedCount === 0 || busy}
            className="mt-6 inline-flex h-12 items-center justify-center gap-2 rounded-[18px] bg-hier-primary px-5 text-sm font-semibold text-white shadow-sm disabled:opacity-50 lg:mt-auto"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserRoundCheck className="h-4 w-4" />}
            Move {selectedCount || ""} to Applied
          </button>
        </div>

        {selectedJob ? (
          <div className="mt-4 rounded-[22px] border border-hier-border bg-hier-panel px-4 py-3 text-sm text-hier-muted">
            Hi Score AI is rating this library against <span className="font-semibold text-hier-text">{selectedJob.title}</span>.
          </div>
        ) : null}
      </section>

      {notice ? (
        <div className="rounded-[22px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          {notice}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-[22px] border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-2">
        {loading ? (
          Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-44 animate-pulse rounded-[28px] border border-hier-border bg-white" />
          ))
        ) : items.length ? (
          items.map((item) => {
            const checked = selectedIds.includes(item.id);
            const score = item.hi_score?.score ?? null;
            const activeLooking = !!item.candidate.active_looking_for_work;
            return (
              <article
                key={item.id}
                className={`rounded-[28px] border bg-white p-5 shadow-card ${checked ? "border-hier-primary" : "border-hier-border"}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-hier-text">
                      {item.candidate.name || "Candidate"}
                    </h2>
                    <p className="mt-1 text-sm text-hier-muted">
                      {item.candidate.headline || item.candidate.email || "No headline yet"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleEntry(item.id)}
                    className={`inline-flex h-10 w-10 items-center justify-center rounded-[16px] border ${checked ? "border-hier-primary bg-hier-primary text-white" : "border-hier-border text-hier-muted"}`}
                    aria-label="Select candidate"
                  >
                    <CheckCircle2 className="h-5 w-5" />
                  </button>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${scoreTone(score)}`}>
                    <Brain className="h-3.5 w-3.5" />
                    {score !== null ? `${score.toFixed(1)} Hi Score` : "Select role to score"}
                  </span>
                  <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${activeLooking ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                    {activeLooking ? "Actively looking" : "Not actively looking"}
                  </span>
                  <span className="rounded-full bg-hier-soft px-3 py-1.5 text-xs font-semibold text-hier-primary">
                    {item.candidate.has_cv ? "CV saved" : "No CV"}
                  </span>
                </div>

                <p className="mt-4 text-sm leading-6 text-hier-muted">
                  From {item.source_job?.title || "a completed role"}
                  {item.source_job?.location ? ` · ${item.source_job.location}` : ""}
                </p>

                {item.hi_score?.reasons?.length ? (
                  <p className="mt-3 text-sm leading-6 text-hier-muted">
                    {item.hi_score.reasons.join(" · ")}
                  </p>
                ) : null}
              </article>
            );
          })
        ) : (
          <div className="rounded-[28px] border border-hier-border bg-white p-8 text-sm text-hier-muted shadow-card xl:col-span-2">
            No candidates in this library yet. Complete a started candidate on a role to begin building it.
          </div>
        )}
      </section>
    </div>
  );
}
