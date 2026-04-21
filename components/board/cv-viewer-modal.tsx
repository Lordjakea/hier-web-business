"use client";

import { ExternalLink, Loader2, X } from "lucide-react";

export function CVViewerModal({
  open,
  url,
  loading,
  fileName,
  error,
  onClose,
}: {
  open: boolean;
  url: string | null;
  loading?: boolean;
  fileName?: string | null;
  error?: string | null;
  onClose: () => void;
}) {
  if (!open) return null;

  const lower = (fileName || url || "").toLowerCase();
  const isPdf = lower.includes(".pdf");

  return (
    <div className="fixed inset-0 z-[60] flex justify-end bg-black/40 backdrop-blur-[1px]">
      <div className="flex h-full w-full max-w-[900px] flex-col border-l border-hier-border bg-white shadow-panel">
        <div className="flex items-center justify-between border-b border-hier-border px-6 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-hier-muted">Candidate CV</p>
            <h3 className="mt-1 text-lg font-semibold text-hier-text">{fileName || "CV Preview"}</h3>
          </div>
          <div className="flex items-center gap-2">
            {url ? (
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-10 items-center gap-2 rounded-2xl border border-hier-border px-4 text-sm font-medium text-hier-ink transition hover:bg-hier-panel"
              >
                Open in new tab <ExternalLink className="h-4 w-4" />
              </a>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-hier-border text-hier-ink transition hover:bg-hier-panel"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 bg-hier-panel">
          {loading ? (
            <div className="flex h-full items-center justify-center gap-3 text-sm text-hier-muted">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading CV…
            </div>
          ) : error ? (
            <div className="flex h-full items-center justify-center px-8 text-center text-sm text-rose-600">
              {error}
            </div>
          ) : url ? (
            isPdf ? (
              <iframe title="CV preview" src={url} className="h-full w-full border-0" />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-4 px-8 text-center">
                <p className="max-w-md text-sm text-hier-muted">
                  This CV format cannot be previewed inline yet. Open it in a new tab to view or download it.
                </p>
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-11 items-center gap-2 rounded-[20px] bg-hier-primary px-5 text-sm font-semibold text-white shadow-card"
                >
                  Open CV <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            )
          ) : (
            <div className="flex h-full items-center justify-center px-8 text-center text-sm text-hier-muted">
              No CV is available for this candidate yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
