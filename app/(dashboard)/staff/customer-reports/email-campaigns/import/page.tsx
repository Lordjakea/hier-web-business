"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  Upload,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import {
  importStaffMarketingLeads,
  type StaffMarketingLeadImportRow,
  type StaffMarketingLeadImportResponse,
} from "@/lib/staff-crm";

const SUPPORTED_COLUMNS = [
  "email",
  "first_name",
  "last_name",
  "company_name",
  "job_title",
  "city",
  "campaign",
] as const;

type PreviewRow = StaffMarketingLeadImportRow & {
  rowNumber: number;
  error?: string | null;
};

function parseCsvLine(line: string) {
  const cells: string[] = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      cells.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  cells.push(current.trim());
  return cells;
}

function parseCsv(text: string): PreviewRow[] {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);

  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]).map((header) => header.trim().toLowerCase());

  return lines.slice(1).map((line, index) => {
    const cells = parseCsvLine(line);
    const row: PreviewRow = {
      rowNumber: index + 2,
      email: "",
    };

    headers.forEach((header, cellIndex) => {
      if (!SUPPORTED_COLUMNS.includes(header as (typeof SUPPORTED_COLUMNS)[number])) return;
      const value = (cells[cellIndex] || "").trim();
      if (value) {
        row[header as keyof StaffMarketingLeadImportRow] = value;
      }
    });

    row.email = (row.email || "").trim().toLowerCase();
    if (!row.email) row.error = "Missing email";
    if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
      row.error = "Invalid email";
    }

    return row;
  });
}

export default function ImportEmailCampaignLeadsPage() {
  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<StaffMarketingLeadImportResponse | null>(null);
  const [importing, setImporting] = useState(false);

  const validRows = useMemo(() => rows.filter((row) => !row.error), [rows]);
  const invalidRows = rows.length - validRows.length;

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setResult(null);
    setError(null);

    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setError("Upload a CSV file.");
      setRows([]);
      return;
    }

    setFileName(file.name);
    const text = await file.text();
    const parsedRows = parseCsv(text);
    setRows(parsedRows);

    if (!parsedRows.length) {
      setError("No importable rows found. Include a header row and at least one lead.");
    }
  }

  async function handleImport() {
    setImporting(true);
    setError(null);
    setResult(null);

    try {
      const response = await importStaffMarketingLeads(
        validRows.map(({ rowNumber: _rowNumber, error: _error, ...row }) => row)
      );
      setResult(response);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not import these leads."
      );
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="space-y-8">
      <Link
        href="/staff/customer-reports"
        className="inline-flex items-center gap-2 text-sm font-medium text-hier-muted hover:text-hier-text"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Customer Reporting
      </Link>

      <PageHeader
        eyebrow="Email Campaigns"
        title="Import leads"
        description="Upload business lead CSVs, preview the rows, then sync contacts into Resend and Hier campaign reporting."
      />

      <section className="rounded-[32px] border border-hier-border bg-white p-5 shadow-card sm:p-6">
        <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
          <div className="rounded-[24px] border border-hier-border bg-hier-panel p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-hier-soft p-2 text-hier-primary">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-hier-text">CSV upload</h2>
                <p className="mt-1 text-sm text-hier-muted">Email is required. Other fields are optional.</p>
              </div>
            </div>

            <label className="mt-5 flex cursor-pointer flex-col items-center justify-center rounded-[24px] border border-dashed border-hier-border bg-white px-4 py-8 text-center transition hover:border-hier-primary hover:bg-hier-soft">
              <Upload className="h-7 w-7 text-hier-primary" />
              <span className="mt-3 text-sm font-semibold text-hier-text">
                {fileName || "Choose CSV file"}
              </span>
              <span className="mt-1 text-xs text-hier-muted">
                Supports email, first_name, last_name, company_name, job_title, city, campaign
              </span>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={(event) => void handleFileChange(event)}
                className="sr-only"
              />
            </label>

            <div className="mt-5 grid grid-cols-3 gap-3">
              <div className="rounded-[18px] bg-white p-3">
                <p className="text-xs font-medium text-hier-muted">Rows</p>
                <p className="mt-1 text-2xl font-semibold text-[#373643]">{rows.length}</p>
              </div>
              <div className="rounded-[18px] bg-white p-3">
                <p className="text-xs font-medium text-hier-muted">Ready</p>
                <p className="mt-1 text-2xl font-semibold text-[#5D894A]">{validRows.length}</p>
              </div>
              <div className="rounded-[18px] bg-white p-3">
                <p className="text-xs font-medium text-hier-muted">Issues</p>
                <p className="mt-1 text-2xl font-semibold text-[#E18851]">{invalidRows}</p>
              </div>
            </div>

            <button
              type="button"
              disabled={!validRows.length || importing}
              onClick={() => void handleImport()}
              className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-[18px] bg-hier-primary px-4 text-sm font-semibold text-white shadow-card transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Import and sync to Resend
            </button>
          </div>

          <div className="min-w-0">
            {error ? (
              <div className="mb-4 flex items-start gap-3 rounded-[20px] border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>{error}</p>
              </div>
            ) : null}

            {result ? (
              <div className="mb-4 flex items-start gap-3 rounded-[20px] border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                <p>
                  Imported {result.imported} new leads and updated {result.updated}. {result.skipped} skipped.
                </p>
              </div>
            ) : null}

            <div className="overflow-x-auto rounded-[24px] border border-hier-border">
              <table className="min-w-[980px] w-full text-left text-sm">
                <thead className="bg-hier-panel text-xs uppercase tracking-[0.12em] text-hier-muted">
                  <tr>
                    <th className="px-4 py-3">Row</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Company</th>
                    <th className="px-4 py-3">Job title</th>
                    <th className="px-4 py-3">City</th>
                    <th className="px-4 py-3">Campaign</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hier-border bg-white">
                  {rows.slice(0, 100).map((row) => (
                    <tr key={`${row.rowNumber}-${row.email || "missing"}`}>
                      <td className="px-4 py-3 text-hier-muted">{row.rowNumber}</td>
                      <td className="px-4 py-3 font-semibold text-hier-text">{row.email || "-"}</td>
                      <td className="px-4 py-3 text-hier-text">
                        {[row.first_name, row.last_name].filter(Boolean).join(" ") || "-"}
                      </td>
                      <td className="px-4 py-3 text-hier-text">{row.company_name || "-"}</td>
                      <td className="px-4 py-3 text-hier-text">{row.job_title || "-"}</td>
                      <td className="px-4 py-3 text-hier-text">{row.city || "-"}</td>
                      <td className="px-4 py-3 text-hier-text">{row.campaign || "-"}</td>
                      <td className="px-4 py-3">
                        {row.error ? (
                          <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-[#E18851]">
                            {row.error}
                          </span>
                        ) : (
                          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-[#5D894A]">
                            Ready
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {!rows.length ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-10 text-center text-sm text-hier-muted">
                        Upload a CSV to preview leads before importing.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>

            {rows.length > 100 ? (
              <p className="mt-3 text-sm text-hier-muted">
                Showing the first 100 rows. All valid rows will be imported.
              </p>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}

