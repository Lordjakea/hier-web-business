import { MoreHorizontal } from "lucide-react";
import { CandidateCard } from "@/components/board/candidate-card";
import type { ApplicationStage, BusinessApplication } from "@/lib/types";

export function BoardColumn({
  title,
  accent,
  count,
  candidates,
  fluid = false,
  onOpenCandidate,
  onDropCard,
  onDragCandidate,

  // NEW
  selectedIds,
  onToggleSelect,
  onSelectAllInColumn,
  onClearColumn,
  onMoveCandidate,
  onRejectCandidate,
}: {
  title: string;
  accent: string;
  count: number;
  candidates: BusinessApplication[];
  fluid?: boolean;
  onOpenCandidate: (application: BusinessApplication) => void;
  onDropCard: () => void;
  onDragCandidate: (applicationId: number) => void;

  // NEW
  selectedIds: number[];
  onToggleSelect: (id: number, checked: boolean) => void;
  onSelectAllInColumn: (ids: number[]) => void;
  onClearColumn: (ids: number[]) => void;
  onMoveCandidate: (id: number) => void;
  onRejectCandidate: (id: number) => void;
}) {
  const columnIds = candidates.map((c) => c.id);
  const selectedInColumn = columnIds.filter((id) =>
    selectedIds.includes(id),
  );

  const allSelected =
    columnIds.length > 0 && selectedInColumn.length === columnIds.length;

  return (
    <section
      onDragOver={(event) => event.preventDefault()}
      onDrop={onDropCard}
      className={`flex h-full min-h-[620px] shrink-0 flex-col rounded-[28px] border border-hier-border bg-hier-panel/70 p-3 ${
        fluid
          ? "w-[min(332px,calc(100vw-2rem))] 3xl:min-w-0 3xl:w-auto"
          : "w-[316px]"
      }`}
    >
      <header className="mb-3 space-y-2 px-1 py-1">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <span
              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${accent}`}
            >
              {title}
            </span>
            <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-hier-muted shadow-sm">
              {count}
            </span>
          </div>

          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-xl text-hier-muted transition hover:bg-white hover:text-hier-text"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>

        {/* Column selection controls */}
        {columnIds.length > 0 && (
          <div className="flex items-center justify-between text-[11px]">
            <button
              onClick={() =>
                allSelected
                  ? onClearColumn(columnIds)
                  : onSelectAllInColumn(columnIds)
              }
              className="font-semibold text-hier-primary"
            >
              {allSelected ? "Clear" : "Select all"}
            </button>

            {selectedInColumn.length > 0 && (
              <span className="text-hier-muted">
                {selectedInColumn.length} selected
              </span>
            )}
          </div>
        )}
      </header>

      <div className="flex flex-1 flex-col gap-3 overflow-y-auto pr-1">
        {candidates.map((candidate) => (
          <CandidateCard
            key={candidate.id}
            candidate={candidate}
            selected={selectedIds.includes(candidate.id)}
            onSelectChange={(checked) =>
              onToggleSelect(candidate.id, checked)
            }
            onOpen={() => onOpenCandidate(candidate)}
            onDragStart={() => onDragCandidate(candidate.id)}
            onNextStage={() => onMoveCandidate(candidate.id)}
            onReject={() => onRejectCandidate(candidate.id)}
          />
        ))}

        {candidates.length === 0 ? (
          <div className="rounded-[22px] border border-dashed border-hier-border bg-white/70 p-5 text-sm leading-6 text-hier-muted">
            No applications in this stage yet.
          </div>
        ) : null}
      </div>
    </section>
  );
}