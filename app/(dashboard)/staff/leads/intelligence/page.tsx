"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Ban,
  Check,
  Download,
  Pencil,
  ExternalLink,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
  UserPlus,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { getStoredUser } from "@/lib/auth";
import {
  approveStaffHiringIntelligenceLead,
  createStaffHiringIntelligenceDiscoveryQuery,
  convertStaffHiringIntelligenceLeadToLead,
  createStaffHiringIntelligenceSource,
  deleteStaffHiringIntelligenceLead,
  deleteStaffHiringIntelligenceSource,
  fetchStaffHiringIntelligenceDiscoveryQueries,
  fetchStaffHiringIntelligenceLeads,
  fetchStaffHiringIntelligenceSources,
  ignoreStaffHiringIntelligenceLead,
  runStaffHiringIntelligenceScan,
  updateStaffHiringIntelligenceDiscoveryQuery,
  type StaffHiringIntelligenceDiscoveryQuery,
  updateStaffHiringIntelligenceSource,
  type StaffHiringIntelligenceLead,
  type StaffHiringIntelligenceSearchUsage,
  type StaffHiringIntelligenceSource,
} from "@/lib/staff-crm";

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatStatus(value?: string | null) {
  return String(value || "new")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatScore(value?: number | null) {
  return typeof value === "number" ? `${Math.round(value)}` : "-";
}

function isToday(value?: string | null) {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const today = new Date();
  return date.toDateString() === today.toDateString();
}

function externalUrl(value?: string | null) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function escapeCsv(value: unknown) {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function updateRecordFromResponse(
  current: StaffHiringIntelligenceLead,
  response: {
    item?: StaffHiringIntelligenceLead;
    lead?: unknown;
    intelligence_lead?: StaffHiringIntelligenceLead;
  },
  fallbackStatus: string,
) {
  const responseLead =
    response.lead &&
    typeof response.lead === "object" &&
    "company_name" in response.lead
      ? (response.lead as StaffHiringIntelligenceLead)
      : null;

  return response.item || response.intelligence_lead || responseLead || {
    ...current,
    intelligence_status: fallbackStatus,
  };
}

function blankSourceForm() {
  return {
    company_name: "",
    website_url: "",
    careers_url: "",
    platform: "careers_page",
    location_hint: "",
  };
}

function sourceToForm(source: StaffHiringIntelligenceSource) {
  return {
    company_name: source.company_name || "",
    website_url: source.website_url || "",
    careers_url: source.careers_url || "",
    platform: source.platform || "careers_page",
    location_hint: source.location_hint || "",
  };
}

function blankDiscoveryForm() {
  return {
    query: "",
    location_hint: "",
    platform_hint: "",
  };
}

export default function StaffHiringIntelligencePage() {
  const storedUser = getStoredUser();
  const canManageScanner = ["admin", "owner"].includes(
    String(storedUser?.staff_role || "").toLowerCase(),
  );
  const [records, setRecords] = useState<StaffHiringIntelligenceLead[]>([]);
  const [sources, setSources] = useState<StaffHiringIntelligenceSource[]>([]);
  const [discoveryQueries, setDiscoveryQueries] = useState<StaffHiringIntelligenceDiscoveryQuery[]>([]);
  const [searchUsage, setSearchUsage] = useState<StaffHiringIntelligenceSearchUsage | null>(null);
  const [selectedRecordId, setSelectedRecordId] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [platform, setPlatform] = useState("");
  const [status, setStatus] = useState("all");
  const [confidence, setConfidence] = useState("all");
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sourceSaving, setSourceSaving] = useState(false);
  const [discoverySaving, setDiscoverySaving] = useState(false);
  const [scanLoading, setScanLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [sourceForm, setSourceForm] = useState(blankSourceForm);
  const [editingSourceId, setEditingSourceId] = useState<number | null>(null);
  const [sourceEditForm, setSourceEditForm] = useState(blankSourceForm);
  const [discoveryForm, setDiscoveryForm] = useState(blankDiscoveryForm);

  const selectedRecord = useMemo(
    () => records.find((record) => record.id === selectedRecordId) || records[0] || null,
    [records, selectedRecordId],
  );

  const summary = useMemo(() => {
    return {
      newSignals: records.filter((record) => (record.intelligence_status || "new") === "new").length,
      highConfidenceContacts: records.filter((record) => record.contact_confidence === "high").length,
      postedToday: records.filter((record) => isToday(record.job_posted_at || record.job_detected_at)).length,
      convertedToLeads: records.filter((record) => record.intelligence_status === "converted" || record.lead_id).length,
    };
  }, [records]);

  const loadRecords = useCallback(
    async (showLoading = true) => {
      if (showLoading) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      setError(null);

      try {
        const response = await fetchStaffHiringIntelligenceLeads({
          q: query,
          platform,
          status,
          confidence,
          location,
        });

        const items = response.items || [];
        setRecords(items);
        setSelectedRecordId((current) => {
          if (current && items.some((record) => record.id === current)) return current;
          return items[0]?.id || null;
        });
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Could not load hiring intelligence yet.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [confidence, location, platform, query, status],
  );

  const loadSources = useCallback(async () => {
    if (!canManageScanner) {
      setSources([]);
      return;
    }
    try {
      const response = await fetchStaffHiringIntelligenceSources();
      setSources(response.items || []);
    } catch {
      setSources([]);
    }
  }, [canManageScanner]);

  const loadDiscoveryQueries = useCallback(async () => {
    if (!canManageScanner) {
      setDiscoveryQueries([]);
      setSearchUsage(null);
      return;
    }
    try {
      const response = await fetchStaffHiringIntelligenceDiscoveryQueries();
      setDiscoveryQueries(response.items || []);
      setSearchUsage(response.usage || null);
    } catch {
      setDiscoveryQueries([]);
      setSearchUsage(null);
    }
  }, [canManageScanner]);

  useEffect(() => {
    void loadRecords();
  }, [loadRecords]);

  useEffect(() => {
    void loadSources();
  }, [loadSources]);

  useEffect(() => {
    void loadDiscoveryQueries();
  }, [loadDiscoveryQueries]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      void loadRecords(false);
    }, 60000);

    return () => window.clearInterval(intervalId);
  }, [loadRecords]);

  async function handleRunScan() {
    setScanLoading(true);
    setError(null);
    setNotice(null);

    try {
      const response = await runStaffHiringIntelligenceScan();
      setNotice(
        response.message ||
          `Hiring intelligence scan completed. ${response.jobs_found || 0} jobs found.`,
      );
      await loadRecords(false);
      await loadSources();
      await loadDiscoveryQueries();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not start the hiring intelligence scan.",
      );
    } finally {
      setScanLoading(false);
    }
  }

  async function handleCreateDiscoveryQuery(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setDiscoverySaving(true);
    setError(null);
    setNotice(null);

    try {
      const response = await createStaffHiringIntelligenceDiscoveryQuery({
        query: discoveryForm.query,
        location_hint: discoveryForm.location_hint || null,
        platform_hint: discoveryForm.platform_hint || null,
        is_enabled: true,
      });
      setDiscoveryQueries((current) => [response.query, ...current]);
      setDiscoveryForm(blankDiscoveryForm());
      setNotice("Discovery query added. Run a scan to search Brave.");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not add that discovery query.",
      );
    } finally {
      setDiscoverySaving(false);
    }
  }

  async function handleToggleDiscoveryQuery(query: StaffHiringIntelligenceDiscoveryQuery) {
    setDiscoverySaving(true);
    setError(null);

    try {
      const response = await updateStaffHiringIntelligenceDiscoveryQuery(query.id, {
        is_enabled: !query.is_enabled,
      });
      setDiscoveryQueries((current) =>
        current.map((item) => (item.id === query.id ? response.query : item)),
      );
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not update that discovery query.",
      );
    } finally {
      setDiscoverySaving(false);
    }
  }

  async function handleCreateSource(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSourceSaving(true);
    setError(null);
    setNotice(null);

    try {
      const response = await createStaffHiringIntelligenceSource({
        company_name: sourceForm.company_name,
        website_url: sourceForm.website_url || null,
        careers_url: sourceForm.careers_url,
        platform: sourceForm.platform || "careers_page",
        location_hint: sourceForm.location_hint || null,
        is_enabled: true,
      });
      setSources((current) => [response.source, ...current]);
      setSourceForm(blankSourceForm());
      setNotice("Hiring source added. Run a scan when you are ready.");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not add that hiring source.",
      );
    } finally {
      setSourceSaving(false);
    }
  }

  async function handleToggleSource(source: StaffHiringIntelligenceSource) {
    setSourceSaving(true);
    setError(null);

    try {
      const response = await updateStaffHiringIntelligenceSource(source.id, {
        is_enabled: !source.is_enabled,
      });
      setSources((current) =>
        current.map((item) => (item.id === source.id ? response.source : item)),
      );
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not update that hiring source.",
      );
    } finally {
      setSourceSaving(false);
    }
  }

  function handleStartEditSource(source: StaffHiringIntelligenceSource) {
    setEditingSourceId(source.id);
    setSourceEditForm(sourceToForm(source));
    setError(null);
    setNotice(null);
  }

  async function handleUpdateSource(
    event: React.FormEvent<HTMLFormElement>,
    source: StaffHiringIntelligenceSource,
  ) {
    event.preventDefault();
    setSourceSaving(true);
    setError(null);
    setNotice(null);

    try {
      const response = await updateStaffHiringIntelligenceSource(source.id, {
        company_name: sourceEditForm.company_name,
        website_url: sourceEditForm.website_url || null,
        careers_url: sourceEditForm.careers_url,
        platform: sourceEditForm.platform || "careers_page",
        location_hint: sourceEditForm.location_hint || null,
      });
      setSources((current) =>
        current.map((item) => (item.id === source.id ? response.source : item)),
      );
      setEditingSourceId(null);
      setSourceEditForm(blankSourceForm());
      setNotice("Hiring source updated.");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not update that hiring source.",
      );
    } finally {
      setSourceSaving(false);
    }
  }

  async function handleDeleteSource(source: StaffHiringIntelligenceSource) {
    if (!window.confirm(`Delete ${source.company_name} as a hiring source?`)) return;

    setSourceSaving(true);
    setError(null);
    setNotice(null);

    try {
      await deleteStaffHiringIntelligenceSource(source.id);
      setSources((current) => current.filter((item) => item.id !== source.id));
      if (editingSourceId === source.id) {
        setEditingSourceId(null);
        setSourceEditForm(blankSourceForm());
      }
      setNotice("Hiring source deleted.");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not delete that hiring source.",
      );
    } finally {
      setSourceSaving(false);
    }
  }

  async function handleRecordAction(action: "approve" | "ignore" | "convert") {
    if (!selectedRecord) return;

    setSaving(true);
    setError(null);
    setNotice(null);

    try {
      const response =
        action === "approve"
          ? await approveStaffHiringIntelligenceLead(selectedRecord.id)
          : action === "ignore"
            ? await ignoreStaffHiringIntelligenceLead(selectedRecord.id)
            : await convertStaffHiringIntelligenceLeadToLead(selectedRecord.id);

      const fallbackStatus = action === "convert" ? "converted" : action === "approve" ? "approved" : "ignored";
      const updatedRecord = updateRecordFromResponse(selectedRecord, response, fallbackStatus);

      setRecords((current) =>
        current.map((record) => (record.id === selectedRecord.id ? updatedRecord : record)),
      );
      setSelectedRecordId(updatedRecord.id);
      setNotice(
        action === "convert"
          ? "Signal converted into a lead."
          : action === "approve"
            ? "Signal approved for follow-up."
            : "Signal ignored.",
      );
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not update this hiring signal.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteRecord() {
    if (!selectedRecord) return;
    if (!window.confirm(`Delete the hiring signal for ${selectedRecord.company_name}?`)) return;

    setSaving(true);
    setError(null);
    setNotice(null);

    try {
      await deleteStaffHiringIntelligenceLead(selectedRecord.id);
      const nextRecords = records.filter((record) => record.id !== selectedRecord.id);
      setRecords(nextRecords);
      setSelectedRecordId(nextRecords[0]?.id || null);
      setNotice("Hiring signal deleted.");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not delete this hiring signal.",
      );
    } finally {
      setSaving(false);
    }
  }

  function handleExportCsv() {
    const headers = [
      "company_name",
      "website_url",
      "lead_id",
      "job_title",
      "job_location",
      "job_platform",
      "job_url",
      "job_posted_at",
      "job_detected_at",
      "last_seen_hiring_at",
      "contact_name",
      "contact_role",
      "contact_email",
      "contact_phone",
      "contact_linkedin_url",
      "contact_source_url",
      "contact_confidence",
      "hiring_signal_score",
      "intelligence_status",
      "source_count",
      "created_at",
      "updated_at",
    ];
    const lines = [
      headers.join(","),
      ...records.map((record) =>
        headers
          .map((header) => escapeCsv((record as Record<string, unknown>)[header]))
          .join(","),
      ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `hier-hiring-intelligence-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }

  const jobUrl = externalUrl(selectedRecord?.job_url);
  const websiteUrl = externalUrl(selectedRecord?.website_url);
  const contactSourceUrl = externalUrl(selectedRecord?.contact_source_url);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Hier staff"
        title="Hiring intelligence"
        description="Track companies actively hiring and turn verified signals into leads."
        action={canManageScanner ? (
          <button
            type="button"
            onClick={() => void handleRunScan()}
            disabled={scanLoading}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-[20px] bg-hier-primary px-5 text-sm font-semibold text-white shadow-card disabled:cursor-not-allowed disabled:opacity-50"
          >
            {scanLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Run scan now
          </button>
        ) : null}
      />

      {error ? (
        <div className="flex items-start gap-3 rounded-[24px] border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{error}</p>
        </div>
      ) : null}

      {notice ? (
        <div className="rounded-[24px] border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-800">
          {notice}
        </div>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["New signals", summary.newSignals],
          ["High confidence contacts", summary.highConfidenceContacts],
          ["Posted today", summary.postedToday],
          ["Converted to leads", summary.convertedToLeads],
        ].map(([label, value]) => (
          <div key={label} className="rounded-[28px] border border-hier-border bg-white p-5 shadow-card">
            <p className="text-sm font-medium text-hier-muted">{label}</p>
            <p className="mt-3 text-3xl font-semibold text-hier-text">{value}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-4 rounded-[28px] border border-hier-border bg-white p-4 shadow-card xl:grid-cols-[1fr_160px_160px_160px_180px_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-hier-muted" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search companies"
            className="h-12 w-full rounded-[20px] border border-hier-border bg-hier-panel pl-11 pr-4 text-sm outline-none focus:border-hier-primary focus:bg-white"
          />
        </div>
        <input
          value={platform}
          onChange={(event) => setPlatform(event.target.value)}
          placeholder="Platform"
          className="h-12 rounded-[20px] border border-hier-border bg-hier-panel px-4 text-sm outline-none focus:border-hier-primary focus:bg-white"
        />
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className="h-12 rounded-[20px] border border-hier-border bg-hier-panel px-4 text-sm outline-none focus:border-hier-primary focus:bg-white"
        >
          <option value="all">All statuses</option>
          <option value="new">New</option>
          <option value="reviewed">Reviewed</option>
          <option value="approved">Approved</option>
          <option value="converted">Converted</option>
          <option value="ignored">Ignored</option>
        </select>
        <select
          value={confidence}
          onChange={(event) => setConfidence(event.target.value)}
          className="h-12 rounded-[20px] border border-hier-border bg-hier-panel px-4 text-sm outline-none focus:border-hier-primary focus:bg-white"
        >
          <option value="all">All confidence</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <input
          value={location}
          onChange={(event) => setLocation(event.target.value)}
          placeholder="Location"
          className="h-12 rounded-[20px] border border-hier-border bg-hier-panel px-4 text-sm outline-none focus:border-hier-primary focus:bg-white"
        />
        <button
          type="button"
          onClick={handleExportCsv}
          disabled={!records.length}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-[20px] border border-hier-border bg-white px-4 text-sm font-semibold text-hier-text disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </section>

      {canManageScanner ? (
      <section className="grid gap-6 rounded-[28px] border border-hier-border bg-white p-5 shadow-card xl:grid-cols-[minmax(360px,0.9fr)_minmax(420px,1.1fr)]">
        <form className="space-y-4" onSubmit={handleCreateSource}>
          <div>
            <h2 className="text-base font-semibold text-hier-text">Hiring sources</h2>
            <p className="mt-1 text-sm text-hier-muted">
              Seed company careers pages for the scanner to check.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              required
              value={sourceForm.company_name}
              onChange={(event) =>
                setSourceForm((current) => ({ ...current, company_name: event.target.value }))
              }
              placeholder="Company name"
              className="h-11 rounded-[18px] border border-hier-border bg-hier-panel px-4 text-sm outline-none focus:border-hier-primary focus:bg-white"
            />
            <input
              value={sourceForm.website_url}
              onChange={(event) =>
                setSourceForm((current) => ({ ...current, website_url: event.target.value }))
              }
              placeholder="Website URL"
              className="h-11 rounded-[18px] border border-hier-border bg-hier-panel px-4 text-sm outline-none focus:border-hier-primary focus:bg-white"
            />
            <input
              required
              value={sourceForm.careers_url}
              onChange={(event) =>
                setSourceForm((current) => ({ ...current, careers_url: event.target.value }))
              }
              placeholder="Careers URL"
              className="h-11 rounded-[18px] border border-hier-border bg-hier-panel px-4 text-sm outline-none focus:border-hier-primary focus:bg-white sm:col-span-2"
            />
            <input
              value={sourceForm.platform}
              onChange={(event) =>
                setSourceForm((current) => ({ ...current, platform: event.target.value }))
              }
              placeholder="Platform"
              className="h-11 rounded-[18px] border border-hier-border bg-hier-panel px-4 text-sm outline-none focus:border-hier-primary focus:bg-white"
            />
            <input
              value={sourceForm.location_hint}
              onChange={(event) =>
                setSourceForm((current) => ({ ...current, location_hint: event.target.value }))
              }
              placeholder="Location hint"
              className="h-11 rounded-[18px] border border-hier-border bg-hier-panel px-4 text-sm outline-none focus:border-hier-primary focus:bg-white"
            />
          </div>
          <button
            type="submit"
            disabled={sourceSaving}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-[18px] bg-hier-primary px-4 text-sm font-semibold text-white disabled:opacity-50"
          >
            {sourceSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Add source
          </button>
        </form>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-hier-text">Seeded sources</h2>
            <span className="text-sm text-hier-muted">{sources.length} sources</span>
          </div>
          <div className="max-h-[320px] space-y-2 overflow-y-auto pr-1">
            {sources.length ? (
              sources.map((source) => (
                <div key={source.id} className="rounded-[18px] border border-hier-border bg-hier-panel p-4">
                  {editingSourceId === source.id ? (
                    <form className="space-y-3" onSubmit={(event) => void handleUpdateSource(event, source)}>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <input
                          required
                          value={sourceEditForm.company_name}
                          onChange={(event) =>
                            setSourceEditForm((current) => ({ ...current, company_name: event.target.value }))
                          }
                          placeholder="Company name"
                          className="h-10 rounded-[16px] border border-hier-border bg-white px-3 text-sm outline-none focus:border-hier-primary"
                        />
                        <input
                          value={sourceEditForm.website_url}
                          onChange={(event) =>
                            setSourceEditForm((current) => ({ ...current, website_url: event.target.value }))
                          }
                          placeholder="Website URL"
                          className="h-10 rounded-[16px] border border-hier-border bg-white px-3 text-sm outline-none focus:border-hier-primary"
                        />
                        <input
                          required
                          value={sourceEditForm.careers_url}
                          onChange={(event) =>
                            setSourceEditForm((current) => ({ ...current, careers_url: event.target.value }))
                          }
                          placeholder="Careers URL"
                          className="h-10 rounded-[16px] border border-hier-border bg-white px-3 text-sm outline-none focus:border-hier-primary sm:col-span-2"
                        />
                        <input
                          value={sourceEditForm.platform}
                          onChange={(event) =>
                            setSourceEditForm((current) => ({ ...current, platform: event.target.value }))
                          }
                          placeholder="Platform"
                          className="h-10 rounded-[16px] border border-hier-border bg-white px-3 text-sm outline-none focus:border-hier-primary"
                        />
                        <input
                          value={sourceEditForm.location_hint}
                          onChange={(event) =>
                            setSourceEditForm((current) => ({ ...current, location_hint: event.target.value }))
                          }
                          placeholder="Location hint"
                          className="h-10 rounded-[16px] border border-hier-border bg-white px-3 text-sm outline-none focus:border-hier-primary"
                        />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="submit"
                          disabled={sourceSaving}
                          className="inline-flex h-9 items-center justify-center gap-2 rounded-[14px] bg-hier-primary px-3 text-xs font-semibold text-white disabled:opacity-50"
                        >
                          {sourceSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingSourceId(null);
                            setSourceEditForm(blankSourceForm());
                          }}
                          disabled={sourceSaving}
                          className="inline-flex h-9 items-center justify-center gap-2 rounded-[14px] border border-hier-border bg-white px-3 text-xs font-semibold text-hier-text disabled:opacity-50"
                        >
                          <X className="h-3.5 w-3.5" />
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-hier-text">{source.company_name}</p>
                        <p className="mt-1 truncate text-xs text-hier-muted">{source.careers_url}</p>
                        <p className="mt-2 text-xs text-hier-muted">
                          {source.last_scan_status || "Not scanned"} - {source.last_jobs_found_count ?? 0} jobs found
                        </p>
                        {source.last_scan_error ? (
                          <p className="mt-2 text-xs text-red-700">{source.last_scan_error}</p>
                        ) : null}
                      </div>
                      <div className="flex shrink-0 flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => void handleToggleSource(source)}
                          disabled={sourceSaving}
                          className={`inline-flex h-8 items-center justify-center rounded-full px-3 text-xs font-semibold ${
                            source.is_enabled
                              ? "bg-emerald-50 text-emerald-800"
                              : "bg-white text-hier-muted"
                          } disabled:opacity-50`}
                        >
                          {source.is_enabled ? "Enabled" : "Disabled"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStartEditSource(source)}
                          disabled={sourceSaving}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-hier-border bg-white text-hier-text disabled:opacity-50"
                          aria-label={`Edit ${source.company_name}`}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDeleteSource(source)}
                          disabled={sourceSaving}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-red-200 bg-red-50 text-red-700 disabled:opacity-50"
                          aria-label={`Delete ${source.company_name}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="rounded-[18px] border border-hier-border bg-hier-panel p-5 text-sm text-hier-muted">
                No hiring sources added yet.
              </div>
            )}
          </div>
        </div>
      </section>
      ) : null}

      {canManageScanner ? (
      <section className="grid gap-6 rounded-[28px] border border-hier-border bg-white p-5 shadow-card xl:grid-cols-[minmax(360px,0.9fr)_minmax(420px,1.1fr)]">
        <form className="space-y-4" onSubmit={handleCreateDiscoveryQuery}>
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-hier-text">Internet discovery</h2>
                <p className="mt-1 text-sm text-hier-muted">
                  Use Brave Search to find companies and job pages.
                </p>
              </div>
              {searchUsage ? (
                <span className="rounded-full border border-hier-border bg-hier-panel px-3 py-1 text-xs font-semibold text-hier-muted">
                  {searchUsage.monthly_used}/{searchUsage.monthly_limit} monthly
                </span>
              ) : null}
            </div>
            {searchUsage && !searchUsage.configured ? (
              <p className="mt-3 rounded-[16px] border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                Brave is not configured on this backend.
              </p>
            ) : null}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              required
              value={discoveryForm.query}
              onChange={(event) =>
                setDiscoveryForm((current) => ({ ...current, query: event.target.value }))
              }
              placeholder="Search query"
              className="h-11 rounded-[18px] border border-hier-border bg-hier-panel px-4 text-sm outline-none focus:border-hier-primary focus:bg-white sm:col-span-2"
            />
            <input
              value={discoveryForm.location_hint}
              onChange={(event) =>
                setDiscoveryForm((current) => ({ ...current, location_hint: event.target.value }))
              }
              placeholder="Location hint"
              className="h-11 rounded-[18px] border border-hier-border bg-hier-panel px-4 text-sm outline-none focus:border-hier-primary focus:bg-white"
            />
            <input
              value={discoveryForm.platform_hint}
              onChange={(event) =>
                setDiscoveryForm((current) => ({ ...current, platform_hint: event.target.value }))
              }
              placeholder="Platform hint"
              className="h-11 rounded-[18px] border border-hier-border bg-hier-panel px-4 text-sm outline-none focus:border-hier-primary focus:bg-white"
            />
          </div>
          <button
            type="submit"
            disabled={discoverySaving}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-[18px] bg-hier-primary px-4 text-sm font-semibold text-white disabled:opacity-50"
          >
            {discoverySaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Add discovery query
          </button>
        </form>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-hier-text">Saved queries</h2>
            <span className="text-sm text-hier-muted">{discoveryQueries.length} queries</span>
          </div>
          <div className="max-h-[320px] space-y-2 overflow-y-auto pr-1">
            {discoveryQueries.length ? (
              discoveryQueries.map((query) => (
                <div key={query.id} className="rounded-[18px] border border-hier-border bg-hier-panel p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-hier-text">{query.query}</p>
                      <p className="mt-1 text-xs text-hier-muted">
                        {query.location_hint || "No location"} - {query.platform_hint || "Any platform"}
                      </p>
                      <p className="mt-2 text-xs text-hier-muted">
                        {query.last_run_status || "Not run"} - {query.last_results_count ?? 0} results
                      </p>
                      {query.last_run_error ? (
                        <p className="mt-2 text-xs text-red-700">{query.last_run_error}</p>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleToggleDiscoveryQuery(query)}
                      disabled={discoverySaving}
                      className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                        query.is_enabled
                          ? "bg-emerald-50 text-emerald-800"
                          : "bg-white text-hier-muted"
                      }`}
                    >
                      {query.is_enabled ? "Enabled" : "Disabled"}
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[18px] border border-hier-border bg-hier-panel p-5 text-sm text-hier-muted">
                No discovery queries added yet.
              </div>
            )}
          </div>
        </div>
      </section>
      ) : null}

      <section className="grid gap-6 2xl:grid-cols-[minmax(720px,1fr)_420px]">
        <div className="overflow-hidden rounded-[28px] border border-hier-border bg-white shadow-card">
          <div className="flex items-center justify-between gap-3 border-b border-hier-border px-5 py-4">
            <div>
              <h2 className="text-base font-semibold text-hier-text">Discovered hiring signals</h2>
              <p className="mt-1 text-sm text-hier-muted">
                {refreshing ? "Refreshing..." : `${records.length} records`}
              </p>
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-sm text-hier-muted">Loading hiring intelligence...</div>
          ) : records.length ? (
            <div className="overflow-x-auto">
              <table className="min-w-[980px] w-full text-left text-sm">
                <thead className="bg-hier-panel text-xs uppercase tracking-[0.12em] text-hier-muted">
                  <tr>
                    <th className="px-4 py-3">Company</th>
                    <th className="px-4 py-3">Job title</th>
                    <th className="px-4 py-3">Location</th>
                    <th className="px-4 py-3">Platform</th>
                    <th className="px-4 py-3">Posted / detected</th>
                    <th className="px-4 py-3">Best contact</th>
                    <th className="px-4 py-3">Confidence</th>
                    <th className="px-4 py-3">Hiring score</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hier-border">
                  {records.map((record) => (
                    <tr
                      key={record.id}
                      onClick={() => setSelectedRecordId(record.id)}
                      className={`cursor-pointer transition ${
                        selectedRecord?.id === record.id ? "bg-hier-soft" : "hover:bg-hier-panel"
                      }`}
                    >
                      <td className="px-4 py-4">
                        <p className="font-semibold text-hier-text">{record.company_name}</p>
                        <p className="mt-1 text-xs text-hier-muted">
                          {record.source_count ? `${record.source_count} sources` : "Source pending"}
                        </p>
                      </td>
                      <td className="px-4 py-4 text-hier-text">{record.job_title || "-"}</td>
                      <td className="px-4 py-4 text-hier-muted">{record.job_location || "-"}</td>
                      <td className="px-4 py-4 text-hier-muted">{record.job_platform || "-"}</td>
                      <td className="px-4 py-4 text-hier-muted">
                        <p>{formatDate(record.job_posted_at)}</p>
                        <p className="mt-1 text-xs">{formatDate(record.job_detected_at)}</p>
                      </td>
                      <td className="px-4 py-4 text-hier-muted">
                        <p className="font-medium text-hier-text">{record.contact_name || "-"}</p>
                        <p className="mt-1 text-xs">{record.contact_role || record.contact_email || "-"}</p>
                      </td>
                      <td className="px-4 py-4">
                        <span className="rounded-full border border-hier-border bg-white px-2.5 py-1 text-xs font-semibold text-hier-text">
                          {record.contact_confidence || "-"}
                        </span>
                      </td>
                      <td className="px-4 py-4 font-semibold text-hier-text">
                        {formatScore(record.hiring_signal_score)}
                      </td>
                      <td className="px-4 py-4">
                        <span className="rounded-full border border-hier-border bg-hier-panel px-2.5 py-1 text-xs font-semibold text-hier-muted">
                          {formatStatus(record.intelligence_status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-sm text-hier-muted">
              No hiring intelligence records found for these filters.
            </div>
          )}
        </div>

        <aside className="space-y-4 2xl:sticky 2xl:top-6 2xl:max-h-[calc(100vh-3rem)] 2xl:self-start 2xl:overflow-y-auto 2xl:pr-1">
          {selectedRecord ? (
            <>
              <section className="rounded-[28px] border border-hier-border bg-white p-6 shadow-card">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-hier-muted">
                      Company details
                    </p>
                    <h2 className="mt-2 text-xl font-semibold text-hier-text">{selectedRecord.company_name}</h2>
                    <p className="mt-1 text-sm text-hier-muted">{selectedRecord.job_location || "Location pending"}</p>
                  </div>
                  <span className="rounded-full border border-hier-border bg-hier-panel px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-hier-muted">
                    {formatStatus(selectedRecord.intelligence_status)}
                  </span>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {jobUrl ? (
                    <a
                      href={jobUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-[18px] border border-hier-border bg-white px-4 text-sm font-semibold text-hier-text"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Job URL
                    </a>
                  ) : null}
                  {websiteUrl ? (
                    <a
                      href={websiteUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-[18px] border border-hier-border bg-white px-4 text-sm font-semibold text-hier-text"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Website
                    </a>
                  ) : null}
                </div>

                <div className="mt-5 grid gap-4 text-sm text-hier-muted sm:grid-cols-2">
                  <p><span className="block font-semibold text-hier-text">Job title</span>{selectedRecord.job_title || "-"}</p>
                  <p><span className="block font-semibold text-hier-text">Platform</span>{selectedRecord.job_platform || "-"}</p>
                  <p><span className="block font-semibold text-hier-text">Posted</span>{formatDate(selectedRecord.job_posted_at)}</p>
                  <p><span className="block font-semibold text-hier-text">Detected</span>{formatDate(selectedRecord.job_detected_at)}</p>
                  <p><span className="block font-semibold text-hier-text">Last seen hiring</span>{formatDate(selectedRecord.last_seen_hiring_at)}</p>
                  <p><span className="block font-semibold text-hier-text">Hiring score</span>{formatScore(selectedRecord.hiring_signal_score)}</p>
                </div>
              </section>

              <section className="rounded-[28px] border border-hier-border bg-white p-6 shadow-card">
                <h2 className="text-base font-semibold text-hier-text">Contact details</h2>
                <div className="mt-4 grid gap-3 text-sm text-hier-muted">
                  <p><span className="block font-semibold text-hier-text">Best contact</span>{selectedRecord.contact_name || "-"}</p>
                  <p><span className="block font-semibold text-hier-text">Role</span>{selectedRecord.contact_role || "-"}</p>
                  <p><span className="block font-semibold text-hier-text">Email</span>{selectedRecord.contact_email || "-"}</p>
                  <p><span className="block font-semibold text-hier-text">Phone</span>{selectedRecord.contact_phone || "-"}</p>
                  {selectedRecord.contact_linkedin_url ? (
                    <a
                      href={externalUrl(selectedRecord.contact_linkedin_url)}
                      target="_blank"
                      rel="noreferrer"
                      className="font-semibold text-hier-primary"
                    >
                      LinkedIn profile
                    </a>
                  ) : null}
                </div>
              </section>

              <section className="rounded-[28px] border border-hier-border bg-white p-6 shadow-card">
                <h2 className="text-base font-semibold text-hier-text">Source and confidence</h2>
                <p className="mt-3 text-sm leading-6 text-hier-muted">
                  Contact confidence is marked as{" "}
                  <span className="font-semibold text-hier-text">
                    {selectedRecord.contact_confidence || "unscored"}
                  </span>
                  {selectedRecord.source_count
                    ? ` from ${selectedRecord.source_count} hiring signal source${selectedRecord.source_count === 1 ? "" : "s"}.`
                    : " while source evidence is still pending."}
                </p>
                {contactSourceUrl ? (
                  <a
                    href={contactSourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-[16px] border border-hier-border bg-white px-3 text-sm font-semibold text-hier-text"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Contact source
                  </a>
                ) : null}
              </section>

              <section className="rounded-[28px] border border-hier-border bg-white p-5 shadow-card">
                <div className="grid gap-3">
                  <button
                    type="button"
                    onClick={() => void handleRecordAction("approve")}
                    disabled={saving}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-[18px] border border-hier-border bg-white px-4 text-sm font-semibold text-hier-text disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleRecordAction("convert")}
                    disabled={saving || selectedRecord.intelligence_status === "converted"}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-[18px] bg-hier-primary px-4 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                    Convert to lead
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleRecordAction("ignore")}
                    disabled={saving}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-[18px] border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-800 disabled:opacity-50"
                  >
                    <Ban className="h-4 w-4" />
                    Ignore
                  </button>
                  {canManageScanner ? (
                    <button
                      type="button"
                      onClick={() => void handleDeleteRecord()}
                      disabled={saving}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-[18px] border border-red-200 bg-white px-4 text-sm font-semibold text-red-800 disabled:opacity-50"
                    >
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      Delete output
                    </button>
                  ) : null}
                </div>
              </section>
            </>
          ) : (
            <section className="rounded-[28px] border border-hier-border bg-white p-8 text-sm text-hier-muted shadow-card">
              Select a hiring signal to review details.
            </section>
          )}
        </aside>
      </section>
    </div>
  );
}
