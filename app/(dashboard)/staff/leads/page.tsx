"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AlertCircle, Download, Loader2, Plus, Search, Upload } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import {
  createStaffLead,
  fetchStaffLeads,
  type StaffLead,
} from "@/lib/staff-crm";
import { SECTOR_OPTIONS } from "@/lib/job-preferences";

type LeadContactForm = {
  name: string;
  job_title: string;
  email: string;
  phone: string;
};

function blankContact(): LeadContactForm {
  return {
    name: "",
    job_title: "",
    email: "",
    phone: "",
  };
}

function blankLeadForm() {
  return {
    name: "",
    phone: "",
    email: "",
    business_name: "",
    job_title: "",
    sector: "",
    contacts: [] as LeadContactForm[],
    lead_type: "business",
    website_url: "",
    source: "",
    address_line_1: "",
    address_line_2: "",
    town: "",
    city: "",
    postcode: "",
    marketing_opt_in: false,
  };
}

function formatLeadType(value?: string | null) {
  return value === "candidate" ? "Candidate" : "Business";
}

function normalizeLeadType(value?: string | null) {
  return String(value || "").trim().toLowerCase() === "candidate"
    ? "candidate"
    : "business";
}

const leadImportFields = [
  { key: "ignore", label: "Do not import" },
  { key: "name", label: "Name" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Number" },
  { key: "business_name", label: "Business name" },
  { key: "job_title", label: "Job title" },
  { key: "sector", label: "Sector" },
  { key: "lead_type", label: "Lead type" },
  { key: "website_url", label: "Website" },
  { key: "address_line_1", label: "Address line 1" },
  { key: "address_line_2", label: "Address line 2" },
  { key: "town", label: "Town" },
  { key: "city", label: "City" },
  { key: "postcode", label: "Postcode" },
  { key: "source", label: "Where heard about us" },
  { key: "marketing_opt_in", label: "Marketing opt in" },
] as const;

function normaliseHeader(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function parseCsv(text: string) {
  const rows: string[][] = [];
  let current = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      row.push(current.trim());
      current = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(current.trim());
      if (row.some((cell) => cell.length > 0)) rows.push(row);
      row = [];
      current = "";
    } else {
      current += char;
    }
  }

  row.push(current.trim());
  if (row.some((cell) => cell.length > 0)) rows.push(row);
  return rows;
}

function escapeCsv(value: unknown) {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function parseBoolean(value: string | undefined) {
  const normalized = String(value || "").trim().toLowerCase();
  return ["yes", "y", "true", "1", "opt in", "opted in", "marketing"].includes(normalized);
}

function guessLeadField(header: string) {
  const normalized = normaliseHeader(header);
  if (["name", "full_name", "contact_name", "lead_name"].includes(normalized)) return "name";
  if (["email", "email_address", "contact_email"].includes(normalized)) return "email";
  if (["phone", "number", "mobile", "telephone", "contact_number"].includes(normalized)) return "phone";
  if (["business", "business_name", "company", "company_name"].includes(normalized)) return "business_name";
  if (["job_title", "job", "role", "position"].includes(normalized)) return "job_title";
  if (["sector", "industry", "category"].includes(normalized)) return "sector";
  if (["lead_type", "type", "account_type"].includes(normalized)) return "lead_type";
  if (["website", "website_url", "url", "site"].includes(normalized)) return "website_url";
  if (["address", "address_line_1", "line_1", "first_line", "full_address"].includes(normalized)) return "address_line_1";
  if (["address_line_2", "line_2", "second_line"].includes(normalized)) return "address_line_2";
  if (["town"].includes(normalized)) return "town";
  if (["city", "location"].includes(normalized)) return "city";
  if (["postcode", "post_code", "zip"].includes(normalized)) return "postcode";
  if (["source", "heard_about_us", "where_heard", "where_did_you_hear_about_us"].includes(normalized)) return "source";
  if (["marketing", "marketing_opt_in", "opt_in", "marketing_consent"].includes(normalized)) return "marketing_opt_in";
  return "ignore";
}

export default function StaffLeadsPage() {
  const [leads, setLeads] = useState<StaffLead[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [leadTypeFilter, setLeadTypeFilter] = useState("all");
  const [cityFilter, setCityFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [leadForm, setLeadForm] = useState(blankLeadForm);
  const [importHeaders, setImportHeaders] = useState<string[]>([]);
  const [importRows, setImportRows] = useState<string[][]>([]);
  const [importMapping, setImportMapping] = useState<Record<string, string>>({});
  const [importing, setImporting] = useState(false);

  const loadLeads = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchStaffLeads({
        q: query,
        status,
        lead_type: leadTypeFilter,
        city: cityFilter,
      });
      setLeads(response.items || []);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not load leads.");
    } finally {
      setLoading(false);
    }
  }, [cityFilter, leadTypeFilter, query, status]);

  useEffect(() => {
    void loadLeads();
  }, [loadLeads]);

  function addContact() {
    setLeadForm((current) => ({
      ...current,
      contacts: [...current.contacts, blankContact()],
    }));
  }

  function updateContact(index: number, field: keyof LeadContactForm, value: string) {
    setLeadForm((current) => ({
      ...current,
      contacts: current.contacts.map((contact, contactIndex) =>
        contactIndex === index ? { ...contact, [field]: value } : contact,
      ),
    }));
  }

  function removeContact(index: number) {
    setLeadForm((current) => ({
      ...current,
      contacts: current.contacts.filter((_, contactIndex) => contactIndex !== index),
    }));
  }

  async function handleCreateLead(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const response = await createStaffLead(leadForm);
      setLeads((current) => [response.lead, ...current]);
      setLeadForm(blankLeadForm());
      setShowCreate(false);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not create lead.");
    } finally {
      setSaving(false);
    }
  }

  function handleExportCsv() {
    const headers = [
      "name",
      "email",
      "phone",
      "business_name",
      "job_title",
      "sector",
      "lead_type",
      "website_url",
      "source",
      "address",
      "address_line_1",
      "address_line_2",
      "town",
      "city",
      "postcode",
      "marketing_opt_in",
      "status",
      "created_at",
    ];
    const lines = [
      headers.join(","),
      ...leads.map((lead) =>
        headers
          .map((header) => {
            if (header === "marketing_opt_in") return escapeCsv(lead.marketing_opt_in ? "yes" : "no");
            return escapeCsv((lead as Record<string, unknown>)[header]);
          })
          .join(",")
      ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `hier-leads-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }

  async function handleImportFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setError(null);
    try {
      const text = await file.text();
      const parsed = parseCsv(text);
      if (parsed.length < 2) {
        setError("CSV needs a header row and at least one lead row.");
        return;
      }

      const headers = parsed[0].map((header) => header.trim());
      const rows = parsed.slice(1).filter((row) => row.some((cell) => cell.trim()));
      const mapping = headers.reduce<Record<string, string>>((current, header) => {
        current[header] = guessLeadField(header);
        return current;
      }, {});

      setImportHeaders(headers);
      setImportRows(rows);
      setImportMapping(mapping);
    } catch {
      setError("Could not read that CSV file.");
    }
  }

  function resetImport() {
    setShowImport(false);
    setImportHeaders([]);
    setImportRows([]);
    setImportMapping({});
  }

  function buildImportLead(row: string[]) {
    const mapped: Record<string, string> = {};

    importHeaders.forEach((header, index) => {
      const field = importMapping[header];
      if (!field || field === "ignore") return;
      mapped[field] = row[index] || "";
    });

    return {
      name: (mapped.name || "").trim(),
      email: (mapped.email || "").trim(),
      phone: (mapped.phone || "").trim() || null,
      business_name: (mapped.business_name || "").trim() || null,
      job_title: (mapped.job_title || "").trim() || null,
      sector: (mapped.sector || "").trim() || null,
      contacts: [],
      lead_type: normalizeLeadType(mapped.lead_type),
      website_url: (mapped.website_url || "").trim() || null,
      source: (mapped.source || "").trim() || null,
      address_line_1: (mapped.address_line_1 || "").trim() || null,
      address_line_2: (mapped.address_line_2 || "").trim() || null,
      town: (mapped.town || "").trim() || null,
      city: (mapped.city || "").trim() || null,
      postcode: (mapped.postcode || "").trim() || null,
      marketing_opt_in: parseBoolean(mapped.marketing_opt_in),
    };
  }

  async function handleSubmitImport() {
    const mappedFields = new Set(Object.values(importMapping));
    if (!mappedFields.has("name") || !mappedFields.has("email")) {
      setError("Please map CSV columns for at least name and email.");
      return;
    }

    const leadsToImport = importRows.map(buildImportLead).filter((lead) => lead.name && lead.email);
    if (!leadsToImport.length) {
      setError("No valid lead rows found. Each imported lead needs a name and email.");
      return;
    }

    setImporting(true);
    setError(null);
    try {
      const created: StaffLead[] = [];
      for (const lead of leadsToImport) {
        const response = await createStaffLead(lead);
        created.push(response.lead);
      }
      setLeads((current) => [...created, ...current]);
      resetImport();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not import leads.");
    } finally {
      setImporting(false);
    }
  }

  const importPreview = importRows.slice(0, 5).map(buildImportLead);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Hier staff"
        title="Leads"
        description="Create leads, then open a lead to keep notes and schedule staff follow-ups."
      />

      {error ? (
        <div className="flex items-start gap-3 rounded-[24px] border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{error}</p>
        </div>
      ) : null}

      <section className="grid gap-4 rounded-[28px] border border-hier-border bg-white p-4 shadow-card xl:grid-cols-[1fr_180px_180px_180px_auto_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-hier-muted" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search leads"
            className="h-12 w-full rounded-[20px] border border-hier-border bg-hier-panel pl-11 pr-4 text-sm outline-none focus:border-hier-primary focus:bg-white"
          />
        </div>
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className="h-12 rounded-[20px] border border-hier-border bg-hier-panel px-4 text-sm outline-none focus:border-hier-primary focus:bg-white"
        >
          <option value="all">All statuses</option>
          <option value="new">New</option>
          <option value="contacted">Contacted</option>
          <option value="qualified">Qualified</option>
          <option value="closed">Closed</option>
        </select>
        <select
          value={leadTypeFilter}
          onChange={(event) => setLeadTypeFilter(event.target.value)}
          className="h-12 rounded-[20px] border border-hier-border bg-hier-panel px-4 text-sm outline-none focus:border-hier-primary focus:bg-white"
        >
          <option value="all">All lead types</option>
          <option value="business">Business</option>
          <option value="candidate">Candidate</option>
        </select>
        <input
          value={cityFilter}
          onChange={(event) => setCityFilter(event.target.value)}
          placeholder="City"
          className="h-12 rounded-[20px] border border-hier-border bg-hier-panel px-4 text-sm outline-none focus:border-hier-primary focus:bg-white"
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={!leads.length}
            className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-[20px] border border-hier-border bg-white px-4 text-sm font-semibold text-hier-text disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
          <button
            type="button"
            onClick={() => setShowImport(true)}
            className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-[20px] border border-hier-border bg-white px-4 text-sm font-semibold text-hier-text"
          >
            <Upload className="h-4 w-4" />
            Import CSV
          </button>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-[20px] bg-hier-primary px-5 text-sm font-semibold text-white shadow-card"
        >
          <Plus className="h-4 w-4" />
          Create lead
        </button>
      </section>

      <section className="space-y-3">
        {loading ? (
          <div className="rounded-[28px] border border-hier-border bg-white p-8 text-sm text-hier-muted">
            Loading leads...
          </div>
        ) : leads.length ? (
          leads.map((lead) => (
            <Link
              key={lead.id}
              href={`/staff/leads/${lead.id}`}
              className="block w-full rounded-[20px] border border-hier-border bg-white px-4 py-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-hier-primary hover:shadow-card"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-hier-text">{lead.name}</p>
                  <p className="mt-0.5 truncate text-sm text-hier-muted">{lead.email}</p>
                  <p className="mt-0.5 truncate text-sm text-hier-muted">
                    {lead.job_title || lead.sector || lead.phone || lead.business_name || lead.city || "-"}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap justify-end gap-2">
                  <span className="rounded-full border border-hier-border bg-hier-panel px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-hier-muted">
                    {formatLeadType(lead.lead_type)}
                  </span>
                  <span className="rounded-full border border-hier-border bg-hier-panel px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-hier-muted">
                    {lead.status || "new"}
                  </span>
                </div>
              </div>
            </Link>
          ))
        ) : (
          <div className="rounded-[28px] border border-hier-border bg-white p-8 text-sm text-hier-muted">
            No leads yet.
          </div>
        )}
      </section>

      {showImport ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-[32px] bg-white p-6 shadow-panel">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-hier-text">Import leads</h2>
                <p className="mt-1 text-sm text-hier-muted">
                  Upload a CSV, match the columns to lead details and submit.
                </p>
              </div>
              <button
                type="button"
                onClick={resetImport}
                disabled={importing}
                className="text-sm font-semibold text-hier-muted disabled:opacity-50"
              >
                Close
              </button>
            </div>

            <label className="mt-6 flex cursor-pointer flex-col items-center justify-center rounded-[24px] border border-dashed border-hier-border bg-hier-panel p-8 text-center text-sm text-hier-muted transition hover:border-hier-primary hover:bg-white">
              <Upload className="mb-3 h-6 w-6 text-hier-primary" />
              Choose CSV file
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={handleImportFile}
                className="hidden"
              />
            </label>

            {importHeaders.length ? (
              <>
                <div className="mt-6 rounded-[24px] border border-hier-border">
                  <div className="grid gap-3 border-b border-hier-border bg-hier-panel p-4 text-sm font-semibold text-hier-text sm:grid-cols-2">
                    <span>CSV column</span>
                    <span>Lead detail</span>
                  </div>
                  <div className="divide-y divide-hier-border">
                    {importHeaders.map((header) => (
                      <div key={header} className="grid gap-3 p-4 sm:grid-cols-2">
                        <div className="rounded-[16px] bg-hier-panel px-3 py-2 text-sm font-semibold text-hier-text">
                          {header || "Untitled column"}
                        </div>
                        <select
                          value={importMapping[header] || "ignore"}
                          onChange={(event) =>
                            setImportMapping((current) => ({
                              ...current,
                              [header]: event.target.value,
                            }))
                          }
                          disabled={importing}
                          className="h-10 rounded-[16px] border border-hier-border bg-white px-3 text-sm outline-none focus:border-hier-primary disabled:opacity-50"
                        >
                          {leadImportFields.map((field) => (
                            <option key={field.key} value={field.key}>
                              {field.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6 rounded-[24px] border border-hier-border bg-hier-panel p-4">
                  <p className="text-sm font-semibold text-hier-text">Preview first rows</p>
                  <div className="mt-3 overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                      <thead className="text-xs uppercase text-hier-muted">
                        <tr>
                          <th className="px-3 py-2">Name</th>
                          <th className="px-3 py-2">Email</th>
                          <th className="px-3 py-2">Number</th>
                          <th className="px-3 py-2">Business</th>
                          <th className="px-3 py-2">Job title</th>
                          <th className="px-3 py-2">Sector</th>
                          <th className="px-3 py-2">Type</th>
                          <th className="px-3 py-2">City</th>
                          <th className="px-3 py-2">Marketing</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-hier-border bg-white">
                        {importPreview.map((lead, index) => (
                          <tr key={`${lead.email}-${index}`}>
                            <td className="px-3 py-2">{lead.name || "-"}</td>
                            <td className="px-3 py-2">{lead.email || "-"}</td>
                            <td className="px-3 py-2">{lead.phone || "-"}</td>
                            <td className="px-3 py-2">{lead.business_name || "-"}</td>
                            <td className="px-3 py-2">{lead.job_title || "-"}</td>
                            <td className="px-3 py-2">{lead.sector || "-"}</td>
                            <td className="px-3 py-2">{formatLeadType(lead.lead_type)}</td>
                            <td className="px-3 py-2">{lead.city || "-"}</td>
                            <td className="px-3 py-2">{lead.marketing_opt_in ? "Yes" : "No"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="mt-3 text-xs text-hier-muted">
                    {importRows.length} rows ready to review.
                  </p>
                </div>

                <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={resetImport}
                    disabled={importing}
                    className="inline-flex h-11 items-center justify-center rounded-[18px] border border-hier-border bg-white px-4 text-sm font-semibold text-hier-text disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmitImport}
                    disabled={
                      importing ||
                      !Object.values(importMapping).includes("name") ||
                      !Object.values(importMapping).includes("email")
                    }
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-[18px] bg-hier-primary px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    Import leads
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      ) : null}

      {showCreate ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[32px] bg-white p-6 shadow-panel" onSubmit={handleCreateLead}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-hier-text">Create lead</h2>
                <p className="mt-1 text-sm text-hier-muted">Add contact details and opt-in status.</p>
              </div>
              <button type="button" onClick={() => setShowCreate(false)} className="text-sm font-semibold text-hier-muted">
                Close
              </button>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <input required value={leadForm.name} onChange={(event) => setLeadForm((current) => ({ ...current, name: event.target.value }))} placeholder="Name" className="h-11 rounded-[18px] border border-hier-border bg-hier-panel px-4 text-sm outline-none focus:border-hier-primary focus:bg-white" />
              <input required type="email" value={leadForm.email} onChange={(event) => setLeadForm((current) => ({ ...current, email: event.target.value }))} placeholder="Email" className="h-11 rounded-[18px] border border-hier-border bg-hier-panel px-4 text-sm outline-none focus:border-hier-primary focus:bg-white" />
              <input value={leadForm.phone} onChange={(event) => setLeadForm((current) => ({ ...current, phone: event.target.value }))} placeholder="Number" className="h-11 rounded-[18px] border border-hier-border bg-hier-panel px-4 text-sm outline-none focus:border-hier-primary focus:bg-white" />
              <input value={leadForm.business_name} onChange={(event) => setLeadForm((current) => ({ ...current, business_name: event.target.value }))} placeholder="Business name (optional)" className="h-11 rounded-[18px] border border-hier-border bg-hier-panel px-4 text-sm outline-none focus:border-hier-primary focus:bg-white" />
              <input value={leadForm.job_title} onChange={(event) => setLeadForm((current) => ({ ...current, job_title: event.target.value }))} placeholder="Job title (optional)" className="h-11 rounded-[18px] border border-hier-border bg-hier-panel px-4 text-sm outline-none focus:border-hier-primary focus:bg-white" />
              <select value={leadForm.sector} onChange={(event) => setLeadForm((current) => ({ ...current, sector: event.target.value }))} className="h-11 rounded-[18px] border border-hier-border bg-hier-panel px-4 text-sm outline-none focus:border-hier-primary focus:bg-white">
                <option value="">Select sector</option>
                {SECTOR_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
              <select value={leadForm.lead_type} onChange={(event) => setLeadForm((current) => ({ ...current, lead_type: event.target.value }))} className="h-11 rounded-[18px] border border-hier-border bg-hier-panel px-4 text-sm outline-none focus:border-hier-primary focus:bg-white">
                <option value="business">Business lead</option>
                <option value="candidate">Candidate lead</option>
              </select>
              <input value={leadForm.website_url} onChange={(event) => setLeadForm((current) => ({ ...current, website_url: event.target.value }))} placeholder="Website link (optional)" className="h-11 rounded-[18px] border border-hier-border bg-hier-panel px-4 text-sm outline-none focus:border-hier-primary focus:bg-white" />
              <div className="rounded-[20px] border border-hier-border bg-hier-panel p-4 sm:col-span-2">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-hier-text">Additional contacts</p>
                  <button
                    type="button"
                    onClick={addContact}
                    className="rounded-[14px] border border-hier-border bg-white px-3 py-2 text-xs font-semibold text-hier-text"
                  >
                    Add contact
                  </button>
                </div>
                {leadForm.contacts.length ? (
                  <div className="mt-3 grid gap-3">
                    {leadForm.contacts.map((contact, index) => (
                      <div key={index} className="grid gap-2 rounded-[16px] bg-white p-3 sm:grid-cols-2">
                        <input value={contact.name} onChange={(event) => updateContact(index, "name", event.target.value)} placeholder="Contact name" className="h-10 rounded-[14px] border border-hier-border bg-hier-panel px-3 text-sm outline-none focus:border-hier-primary focus:bg-white" />
                        <input value={contact.job_title} onChange={(event) => updateContact(index, "job_title", event.target.value)} placeholder="Job title" className="h-10 rounded-[14px] border border-hier-border bg-hier-panel px-3 text-sm outline-none focus:border-hier-primary focus:bg-white" />
                        <input value={contact.email} onChange={(event) => updateContact(index, "email", event.target.value)} placeholder="Email" className="h-10 rounded-[14px] border border-hier-border bg-hier-panel px-3 text-sm outline-none focus:border-hier-primary focus:bg-white" />
                        <input value={contact.phone} onChange={(event) => updateContact(index, "phone", event.target.value)} placeholder="Phone" className="h-10 rounded-[14px] border border-hier-border bg-hier-panel px-3 text-sm outline-none focus:border-hier-primary focus:bg-white" />
                        <button type="button" onClick={() => removeContact(index)} className="h-10 rounded-[14px] border border-red-200 bg-red-50 px-3 text-xs font-semibold text-red-800 sm:col-span-2">
                          Remove contact
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-hier-muted">No extra contacts added.</p>
                )}
              </div>
              <input value={leadForm.source} onChange={(event) => setLeadForm((current) => ({ ...current, source: event.target.value }))} placeholder="Where did you hear about us? (optional)" className="h-11 rounded-[18px] border border-hier-border bg-hier-panel px-4 text-sm outline-none focus:border-hier-primary focus:bg-white" />
              <input value={leadForm.address_line_1} onChange={(event) => setLeadForm((current) => ({ ...current, address_line_1: event.target.value }))} placeholder="Address first line" className="h-11 rounded-[18px] border border-hier-border bg-hier-panel px-4 text-sm outline-none focus:border-hier-primary focus:bg-white" />
              <input value={leadForm.address_line_2} onChange={(event) => setLeadForm((current) => ({ ...current, address_line_2: event.target.value }))} placeholder="Address second line" className="h-11 rounded-[18px] border border-hier-border bg-hier-panel px-4 text-sm outline-none focus:border-hier-primary focus:bg-white" />
              <input value={leadForm.town} onChange={(event) => setLeadForm((current) => ({ ...current, town: event.target.value }))} placeholder="Town" className="h-11 rounded-[18px] border border-hier-border bg-hier-panel px-4 text-sm outline-none focus:border-hier-primary focus:bg-white" />
              <input value={leadForm.city} onChange={(event) => setLeadForm((current) => ({ ...current, city: event.target.value }))} placeholder="City" className="h-11 rounded-[18px] border border-hier-border bg-hier-panel px-4 text-sm outline-none focus:border-hier-primary focus:bg-white" />
              <input value={leadForm.postcode} onChange={(event) => setLeadForm((current) => ({ ...current, postcode: event.target.value }))} placeholder="Postcode" className="h-11 rounded-[18px] border border-hier-border bg-hier-panel px-4 text-sm outline-none focus:border-hier-primary focus:bg-white" />
            </div>
            <label className="mt-4 flex items-start gap-3 rounded-[18px] border border-hier-border bg-hier-panel p-4 text-sm text-hier-text">
              <input
                type="checkbox"
                checked={leadForm.marketing_opt_in}
                onChange={(event) => setLeadForm((current) => ({ ...current, marketing_opt_in: event.target.checked }))}
                className="mt-1"
              />
              Marketing opt in
            </label>
            <button
              type="submit"
              disabled={saving}
              className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-[20px] bg-hier-primary px-4 text-sm font-semibold text-white disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Create lead
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
