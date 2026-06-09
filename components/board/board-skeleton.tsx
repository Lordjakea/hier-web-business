// Loading placeholder for the candidate board. Mirrors the real column +
// card layout so the swap to live data doesn't shift the page around.
export function BoardSkeleton({
  columns = 6,
  cardsPerColumn = 3,
}: {
  columns?: number;
  cardsPerColumn?: number;
}) {
  return (
    <section className="overflow-x-auto pb-4" aria-hidden="true">
      <div
        className="flex min-w-max gap-4 3xl:grid 3xl:min-w-0 3xl:gap-5"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: columns }).map((_, columnIndex) => (
          <div
            key={columnIndex}
            className="flex h-[min(72vh,760px)] min-h-[420px] w-[min(332px,calc(100vw-2rem))] shrink-0 flex-col rounded-[28px] border border-hier-border bg-hier-panel/70 p-3 sm:min-h-[520px] 3xl:w-auto 3xl:min-w-0"
          >
            <div className="mb-4 flex items-center justify-between px-1 py-1">
              <div className="h-6 w-24 animate-pulse rounded-full bg-hier-border/70" />
              <div className="h-6 w-7 animate-pulse rounded-full bg-hier-border/50" />
            </div>

            <div className="space-y-3">
              {Array.from({ length: cardsPerColumn }).map((_, cardIndex) => (
                <div
                  key={cardIndex}
                  className="rounded-[18px] border border-hier-border bg-white p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 shrink-0 animate-pulse rounded-2xl bg-hier-border/70" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="h-3 w-2/3 animate-pulse rounded-full bg-hier-border/70" />
                      <div className="h-3 w-1/3 animate-pulse rounded-full bg-hier-border/50" />
                    </div>
                  </div>

                  <div className="mt-3 h-3 w-1/2 animate-pulse rounded-full bg-hier-border/50" />

                  <div className="mt-3 grid grid-cols-4 gap-2">
                    {Array.from({ length: 4 }).map((_, buttonIndex) => (
                      <div
                        key={buttonIndex}
                        className="h-9 animate-pulse rounded-xl bg-hier-border/40"
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
