import { BriefcaseBusiness, LayoutGrid, Search, SlidersHorizontal, Users } from "lucide-react";

type JobOption = {
  id: number;
  label: string;
};

export function BoardToolbar({
  query,
  onQueryChange,
  total,
  loading,
  selectedJobId,
  onJobChange,
  jobOptions,
  sort,
  onSortChange,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  total: number;
  loading?: boolean;
  selectedJobId: number | null;
  onJobChange: (value: number | null) => void;
  jobOptions: JobOption[];
  sort: "newest" | "oldest";
  onSortChange: (value: "newest" | "oldest") => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-[28px] border border-hier-border bg-white p-4 shadow-card lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        <button className="inline-flex items-center gap-2 rounded-2xl bg-hier-primary px-4 py-2.5 text-sm font-semibold text-white shadow-card">
          <LayoutGrid className="h-4 w-4" /> Board view
        </button>
        <div className="inline-flex items-center gap-2 rounded-2xl border border-hier-border px-4 py-2.5 text-sm font-medium text-hier-ink">
          <Users className="h-4 w-4" /> {loading ? "Loading candidates" : `${total} active applications`}
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-2 lg:flex-row lg:items-center lg:justify-end">
        <label className="relative min-w-0 lg:w-[320px]">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-hier-muted" />
          <input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search candidates, jobs, notes"
            className="h-11 w-full rounded-2xl border border-hier-border bg-hier-panel pl-11 pr-4 text-sm text-hier-text outline-none transition focus:border-hier-primary focus:bg-white"
          />
        </label>

        <label className="inline-flex items-center gap-2 rounded-2xl border border-hier-border bg-hier-panel px-4 py-2.5 text-sm text-hier-ink">
          <BriefcaseBusiness className="h-4 w-4 text-hier-muted" />
          <select
            value={selectedJobId ?? "all"}
            onChange={(event) => {
              const value = event.target.value;
              onJobChange(value === "all" ? null : Number(value));
            }}
            className="bg-transparent text-sm font-medium outline-none"
          >
            <option value="all">All jobs</option>
            {jobOptions.map((job) => (
              <option key={job.id} value={job.id}>
                {job.label}
              </option>
            ))}
          </select>
        </label>

        <label className="inline-flex items-center gap-2 rounded-2xl border border-hier-border bg-hier-panel px-4 py-2.5 text-sm text-hier-ink">
          <SlidersHorizontal className="h-4 w-4 text-hier-muted" />
          <select
            value={sort}
            onChange={(event) => onSortChange(event.target.value as "newest" | "oldest")}
            className="bg-transparent text-sm font-medium outline-none"
          >
            <option value="newest">Sorted by newest</option>
            <option value="oldest">Sorted by oldest</option>
          </select>
        </label>
      </div>
    </div>
  );
}
