"use client";

import { useMemo } from "react";
import { BoardColumn } from "@/components/board/board-column";
import type { ApplicationStage, BusinessApplication } from "@/lib/types";

export type BoardStage = {
  id: ApplicationStage;
  title: string;
  accent: string;
};

export function CandidateBoard({
  columns,
  candidates,
  selectedIds,
  maxVisibleColumns = 6,
  onOpenCandidate,
  onMoveCandidate,
  onRejectCandidate,
  onDragCandidate,
  onToggleSelect,
  onSelectMany,
  onClearMany,
  draggingApplicationId,
}: {
  columns: readonly BoardStage[];
  candidates: BusinessApplication[];
  selectedIds: number[];
  maxVisibleColumns?: number;
  onOpenCandidate: (application: BusinessApplication) => void;
  onMoveCandidate: (applicationId: number, stage: ApplicationStage) => void;
  onRejectCandidate: (applicationId: number) => void;
  onDragCandidate: (applicationId: number | null) => void;
  onToggleSelect: (id: number, checked: boolean) => void;
  onSelectMany: (ids: number[]) => void;
  onClearMany: (ids: number[]) => void;
  draggingApplicationId: number | null;
}) {
  const desktopColumnCount = Math.min(columns.length, maxVisibleColumns);

  const grouped = useMemo(
    () =>
      columns.reduce<Record<string, BusinessApplication[]>>((accumulator, column) => {
        accumulator[column.id] = candidates.filter(
          (candidate) => candidate.stage === column.id,
        );
        return accumulator;
      }, {}),
    [candidates, columns],
  );

  function getNextStage(currentStage: ApplicationStage): ApplicationStage | null {
    const index = columns.findIndex((column) => column.id === currentStage);
    if (index < 0 || index >= columns.length - 1) return null;
    return columns[index + 1].id;
  }

  function handleMoveNext(applicationId: number) {
    const candidate = candidates.find((item) => item.id === applicationId);
    if (!candidate) return;

    const nextStage = getNextStage(candidate.stage);
    if (!nextStage) return;

    onMoveCandidate(applicationId, nextStage);
  }

  return (
    <section className="overflow-x-auto pb-4">
      <div
        className="flex min-w-max gap-4 3xl:grid 3xl:min-w-0 3xl:gap-5"
        style={{
          gridTemplateColumns: `repeat(${desktopColumnCount}, minmax(0, 1fr))`,
        }}
      >
        {columns.map((column) => {
          const columnCandidates = grouped[column.id] || [];

          return (
            <BoardColumn
              key={column.id}
              title={column.title}
              accent={column.accent}
              count={columnCandidates.length}
              candidates={columnCandidates}
              fluid
              selectedIds={selectedIds}
              onToggleSelect={onToggleSelect}
              onSelectAllInColumn={onSelectMany}
              onClearColumn={onClearMany}
              onOpenCandidate={onOpenCandidate}
              onDragCandidate={onDragCandidate}
              onMoveCandidate={handleMoveNext}
              onRejectCandidate={onRejectCandidate}
              onDropCard={() => {
                if (draggingApplicationId) {
                  onMoveCandidate(draggingApplicationId, column.id);
                }
              }}
            />
          );
        })}
      </div>
    </section>
  );
}