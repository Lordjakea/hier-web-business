"use client";

import { useMemo } from "react";
import { BoardColumn } from "@/components/board/board-column";
import type { ApplicationStage, BusinessApplication } from "@/lib/types";

export type BoardStage = { id: ApplicationStage; title: string; accent: string; };

export function CandidateBoard({ columns, candidates, maxVisibleColumns = 6, onOpenCandidate, onMoveCandidate, onDragCandidate, draggingApplicationId }: { columns: readonly BoardStage[]; candidates: BusinessApplication[]; maxVisibleColumns?: number; onOpenCandidate: (application: BusinessApplication) => void; onMoveCandidate: (applicationId: number, stage: ApplicationStage) => void; onDragCandidate: (applicationId: number | null) => void; draggingApplicationId: number | null; }) {
  const desktopColumnCount = Math.min(columns.length, maxVisibleColumns);
  const grouped = useMemo(() => columns.reduce<Record<string, BusinessApplication[]>>((accumulator, column) => { accumulator[column.id] = candidates.filter((candidate) => candidate.stage === column.id); return accumulator; }, {}), [candidates, columns]);
  return (
    <section className="overflow-x-auto pb-4">
      <div className="flex min-w-max gap-4 3xl:grid 3xl:min-w-0 3xl:gap-5" style={{ gridTemplateColumns: `repeat(${desktopColumnCount}, minmax(0, 1fr))` }}>
        {columns.map((column) => <BoardColumn key={column.id} title={column.title} accent={column.accent} count={grouped[column.id]?.length || 0} candidates={grouped[column.id] || []} fluid onOpenCandidate={onOpenCandidate} onDragCandidate={onDragCandidate} onDropCard={() => { if (draggingApplicationId) onMoveCandidate(draggingApplicationId, column.id); }} />)}
      </div>
    </section>
  );
}
