"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Eye,
  FileText,
  Loader2,
  Mail,
  PencilLine,
  Phone,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  UserRound,
  Users,
} from "lucide-react";

import { apiFetch } from "@/lib/api";
import {
  fetchOnboardingDetail,
  fetchOnboardingList,
} from "@/lib/business-onboarding";
import type {
  BusinessOnboarding,
  BusinessOnboardingDocument,
  BusinessOnboardingTask,
} from "@/lib/types";

type EmployeeRecordFilter = "all" | "recently_started" | "awaiting_review" | "ready" | "started";

type EmployeeRecordForm = {
  legal_name: string;
  preferred_name: string;
  personal_email: string;
  work_email: string;
  phone: string;
  address_line_1: string;
  address_line_2: string;
  city: string;
  region: string;
  postcode: string;
  country_code: string;
  start_date: string;
  employee_number: string;
  job_title: string;
  department: string;
  manager_name: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  national_id_last4: string;
  notes: string;
};

type SubmissionPair = {
  label: string;
  value: string;
};

type SubmissionSection = {
  title: string;
  icon: "user" | "phone" | "mail" | "file" | "calendar";
  items: SubmissionPair[];
};

function formatLabel(value?: string | null) {
  if (!value) return "—";
  return value
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDateLike(value?: string | null) {
  if (!value) return "—";
  const raw = String(value).trim();
  if (!raw) return "—";

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;

  return parsed.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function statusTone(status?: string | null) {
  switch (status) {
    case "started":
    case "completed":
    case "approved":
    case "waived":
    case "compliant_pending_start":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "awaiting_employer":
    case "submitted":
    case "reviewed":
      return "bg-sky-50 text-sky-700 border-sky-200";
    case "awaiting_candidate":
    case "sent":
    case "viewed":
    case "rejected":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "removed":
    case "archived":
      return "bg-zinc-100 text-zinc-600 border-zinc-200";
    default:
      return "bg-hier-soft text-hier-primary border-hier-border";
  }
}

function taskTone(status?: string | null) {
  switch (status) {
    case "approved":
    case "waived":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "submitted":
    case "reviewed":
      return "bg-sky-50 text-sky-700 border-sky-200";
    case "sent":
    case "viewed":
    case "rejected":
      return "bg-amber-50 text-amber-700 border-amber-200";
    default:
      return "bg-zinc-100 text-zinc-600 border-zinc-200";
  }
}

function documentTone(status?: string | null) {
  switch (status) {
    case "approved":
    case "signed":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "submitted":
    case "viewed":
    case "sent":
    case "reviewed":
      return "bg-sky-50 text-sky-700 border-sky-200";
    case "rejected":
      return "bg-rose-50 text-rose-700 border-rose-200";
    default:
      return "bg-zinc-100 text-zinc-600 border-zinc-200";
  }
}

function applicationAllowsEmployeeRecords(stage?: string | null) {
  return stage === "offered" || stage === "started";
}

function getPossibleFileUrl(record: any): string | null {
  if (!record || typeof record !== "object") return null;

  const directKeys = [
    "file_url",
    "document_url",
    "download_url",
    "signed_url",
    "public_url",
    "url",
    "view_url",
  ];

  for (const key of directKeys) {
    const value = record?.[key];
    if (typeof value === "string" && value.trim()) return value;
  }

  const nested = record?.file || record?.document || record?.asset || null;
  if (nested && typeof nested === "object") {
    for (const key of directKeys) {
      const value = nested?.[key];
      if (typeof value === "string" && value.trim()) return value;
    }
  }

  return null;
}

function openFileUrl(url: string | null | undefined) {
  if (!url) return;
  window.open(url, "_blank", "noopener,noreferrer");
}

function getTaskMeta(task: BusinessOnboardingTask): Record<string, any> {
  const anyTask = task as any;
  const meta =
    anyTask?.meta ||
    anyTask?.metadata ||
    anyTask?.metadata_json ||
    anyTask?.submission_meta ||
    anyTask?.response_meta ||
    {};
  return meta && typeof meta === "object" && !Array.isArray(meta) ? meta : {};
}

function getTaskSubmissionValue(task: BusinessOnboardingTask): string | null {
  const anyTask = task as any;
  const directValues = [
    anyTask?.submitted_value,
    anyTask?.submission_value,
    anyTask?.response_value,
    anyTask?.answer_value,
    anyTask?.value,
    anyTask?.submitted_text,
  ];

  for (const value of directValues) {
    if (typeof value === "string" && value.trim()) return value;
  }

  const meta = getTaskMeta(task);
  const nestedValues = [
    meta?.submitted_value,
    meta?.submission_value,
    meta?.response_value,
    meta?.answer_value,
    meta?.value,
    meta?.text,
    meta?.notes,
    meta?.candidate_note,
  ];

  for (const value of nestedValues) {
    if (typeof value === "string" && value.trim()) return value;
  }

  return null;
}

function stringifySubmissionValue(value: unknown) {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value)) return value.filter(Boolean).join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function getTaskSubmissionPairs(task: BusinessOnboardingTask): SubmissionPair[] {
  const meta = getTaskMeta(task);

  const candidates = [
    meta?.submitted_fields,
    meta?.personal_details,
    meta?.emergency_contact,
    meta?.bank_details,
    meta?.fields,
    meta?.answers,
    meta?.submitted_answers,
  ];

  for (const group of candidates) {
    if (group && typeof group === "object" && !Array.isArray(group)) {
      return Object.entries(group)
        .map(([key, value]) => ({
          label: formatLabel(key),
          value: stringifySubmissionValue(value),
        }))
        .filter((pair) => pair.value.trim() !== "");
    }
  }

  return [];
}

function groupSubmissionPairs(task: BusinessOnboardingTask): SubmissionSection[] {
  const meta = getTaskMeta(task);
  const type = String(meta?.type || task.task_key || "").toLowerCase();
  const pairs = getTaskSubmissionPairs(task);

  const take = (keys: string[]) => {
    const wanted = new Set(keys.map((key) => formatLabel(key)));
    return pairs.filter((pair) => wanted.has(pair.label));
  };

  const remaining = (used: SubmissionPair[]) => {
    const usedLabels = new Set(used.map((pair) => pair.label));
    return pairs.filter((pair) => !usedLabels.has(pair.label));
  };

  if (type.includes("personal")) {
    const identity = take(["full_name", "date_of_birth"]);
    const contact = take(["email", "phone_number", "phone"]);
    const address = take([
      "address",
      "address_line_1",
      "address_line_2",
      "city",
      "region",
      "postcode",
    ]);
    const used = [...identity, ...contact, ...address];

    return [
      identity.length ? { title: "Identity", icon: "user", items: identity } : null,
      contact.length ? { title: "Contact", icon: "mail", items: contact } : null,
      address.length ? { title: "Address", icon: "file", items: address } : null,
      remaining(used).length
        ? { title: "Other details", icon: "file", items: remaining(used) }
        : null,
    ].filter(Boolean) as SubmissionSection[];
  }

  if (type.includes("emergency")) {
    const contact = take(["full_name", "phone_number", "phone", "email"]);
    const address = take(["address"]);
    const used = [...contact, ...address];

    return [
      contact.length
        ? { title: "Emergency contact", icon: "phone", items: contact }
        : null,
      address.length ? { title: "Address", icon: "file", items: address } : null,
      remaining(used).length
        ? { title: "Other details", icon: "file", items: remaining(used) }
        : null,
    ].filter(Boolean) as SubmissionSection[];
  }

  if (type.includes("bank")) {
    return [{ title: "Bank details", icon: "file", items: pairs }];
  }

  return pairs.length ? [{ title: "Submitted details", icon: "file", items: pairs }] : [];
}

function SubmissionIcon({ icon }: { icon: SubmissionSection["icon"] }) {
  if (icon === "user") return <UserRound className="h-4 w-4" />;
  if (icon === "phone") return <Phone className="h-4 w-4" />;
  if (icon === "mail") return <Mail className="h-4 w-4" />;
  if (icon === "calendar") return <CalendarDays className="h-4 w-4" />;
  return <FileText className="h-4 w-4" />;
}

function SubmissionDetailsModal({
  task,
  onClose,
}: {
  task: BusinessOnboardingTask;
  onClose: () => void;
}) {
  const sections = groupSubmissionPairs(task);
  const summary = getTaskSubmissionValue(task);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 py-8">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-[32px] border border-hier-border bg-white shadow-card">
        <div className="border-b border-hier-border bg-hier-panel px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-hier-muted">
                Submitted information
              </p>
              <h3 className="mt-2 text-2xl font-semibold tracking-tight text-hier-text">
                {task.title || formatLabel(task.task_key)}
              </h3>
              <div className="mt-3 flex flex-wrap gap-2">
                <span
                  className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold ${taskTone(
                    task.status,
                  )}`}
                >
                  {formatLabel(task.status)}
                </span>
                {task.submitted_at ? (
                  <span className="inline-flex rounded-full border border-hier-border bg-white px-3 py-1 text-[11px] font-semibold text-hier-text">
                    Submitted {formatDateLike(task.submitted_at)}
                  </span>
                ) : null}
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-hier-border bg-white px-4 py-2 text-sm font-semibold text-hier-text transition hover:bg-hier-soft"
            >
              Close
            </button>
          </div>
        </div>

        <div className="max-h-[calc(90vh-150px)] overflow-y-auto px-6 py-6">
          {summary ? (
            <div className="mb-5 rounded-[24px] border border-hier-border bg-hier-soft p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-hier-muted">
                Candidate note
              </p>
              <p className="mt-2 text-sm leading-6 text-hier-text">{summary}</p>
            </div>
          ) : null}

          {sections.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-hier-border bg-hier-panel p-6 text-sm text-hier-muted">
              No structured submitted fields were found for this task.
            </div>
          ) : (
            <div className="space-y-5">
              {sections.map((section) => (
                <section
                  key={section.title}
                  className="rounded-[26px] border border-hier-border bg-white p-5 shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-hier-soft text-hier-primary">
                      <SubmissionIcon icon={section.icon} />
                    </div>
                    <div>
                      <h4 className="text-base font-semibold text-hier-text">
                        {section.title}
                      </h4>
                      <p className="text-xs text-hier-muted">
                        {section.items.length} field
                        {section.items.length === 1 ? "" : "s"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {section.items.map((pair) => (
                      <div
                        key={`${section.title}-${pair.label}`}
                        className="rounded-[18px] bg-hier-panel p-4"
                      >
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-hier-muted">
                          {pair.label}
                        </p>
                        <p className="mt-2 whitespace-pre-wrap text-sm font-medium leading-6 text-hier-text">
                          {pair.value}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SubmittedDetailsButton({
  task,
  onClick,
}: {
  task: BusinessOnboardingTask;
  onClick: () => void;
}) {
  const pairCount = getTaskSubmissionPairs(task).length;

  if (!pairCount) return null;

  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-10 items-center gap-2 rounded-2xl border border-hier-border bg-white px-4 text-sm font-semibold text-hier-ink transition hover:bg-hier-soft"
    >
      <Eye className="h-4 w-4" />
      View details
    </button>
  );
}

function buildEmployeeRecordForm(item: BusinessOnboarding | null): EmployeeRecordForm {
  const anyItem = item as any;
  const record = anyItem?.employee_record || anyItem?.employee || {};
  const candidate = anyItem?.candidate || {};
  const jobPost = anyItem?.job_post || {};

  return {
    legal_name: record?.legal_name || candidate?.display_name || "",
    preferred_name: record?.preferred_name || "",
    personal_email: record?.personal_email || candidate?.email || "",
    work_email: record?.work_email || "",
    phone: record?.phone || candidate?.phone || "",
    address_line_1: record?.address_line_1 || "",
    address_line_2: record?.address_line_2 || "",
    city: record?.city || "",
    region: record?.region || "",
    postcode: record?.postcode || "",
    country_code: record?.country_code || item?.country_code || "",
    start_date: record?.start_date || "",
    employee_number: record?.employee_number || "",
    job_title: record?.job_title || jobPost?.title || "",
    department: record?.department || "",
    manager_name: record?.manager_name || "",
    emergency_contact_name: record?.emergency_contact_name || "",
    emergency_contact_phone: record?.emergency_contact_phone || "",
    national_id_last4: record?.national_id_last4 || "",
    notes: record?.notes || "",
  };
}

function formInputClass(disabled = false) {
  return `h-12 w-full rounded-2xl border border-hier-border bg-hier-panel px-4 text-sm text-hier-text outline-none focus:border-hier-primary focus:bg-white ${
    disabled ? "opacity-60" : ""
  }`;
}

function formTextareaClass(disabled = false) {
  return `min-h-[120px] w-full rounded-2xl border border-hier-border bg-hier-panel px-4 py-3 text-sm text-hier-text outline-none focus:border-hier-primary focus:bg-white ${
    disabled ? "opacity-60" : ""
  }`;
}

function isRecentlyStarted(item: BusinessOnboarding) {
  const anyItem = item as any;
  const rawDate = anyItem?.start_date || anyItem?.employee_record?.start_date || item.updated_at || item.created_at;
  if (!rawDate) return false;

  const parsed = new Date(String(rawDate));
  if (Number.isNaN(parsed.getTime())) return false;

  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  return parsed.getTime() >= thirtyDaysAgo;
}

function hasSubmittedWork(item: BusinessOnboarding) {
  return (item.tasks || []).some((task) => {
    const status = task.status || "";
    return (
      ["submitted", "reviewed", "approved", "rejected", "waived"].includes(status) ||
      !!getTaskSubmissionValue(task) ||
      getTaskSubmissionPairs(task).length > 0 ||
      !!getPossibleFileUrl(task as any)
    );
  });
}

function isReadyRecord(item: BusinessOnboarding) {
  return item.status === "compliant_pending_start" || item.status === "completed";
}

function shouldAppearInEmployeeRecords(item: BusinessOnboarding) {
  if (!applicationAllowsEmployeeRecords(item.application?.stage || null)) return false;
  if (item.status === "removed" || item.status === "archived") return false;
  return item.status === "started" || item.status === "completed" || isReadyRecord(item) || hasSubmittedWork(item);
}

function getCandidateName(item: BusinessOnboarding | null) {
  if (!item) return "Candidate";
  return item.candidate?.display_name || `Application #${item.application_id}`;
}

function getJobTitle(item: BusinessOnboarding | null) {
  if (!item) return "Role not available";
  return item.job_post?.title || `Application #${item.application_id}`;
}

export default function EmployeeRecordsPage() {
  const [items, setItems] = useState<BusinessOnboarding[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selected, setSelected] = useState<BusinessOnboarding | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<EmployeeRecordFilter>("all");
  const [viewingSubmissionTask, setViewingSubmissionTask] = useState<BusinessOnboardingTask | null>(null);
  const [employeeRecordForm, setEmployeeRecordForm] = useState<EmployeeRecordForm>(buildEmployeeRecordForm(null));

  async function loadList() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetchOnboardingList();
      const list: BusinessOnboarding[] = res.items || [];
      setItems(list.filter(shouldAppearInEmployeeRecords));
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not load employee records.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadDetail(onboardingId: number) {
    setDetailLoading(true);
    setActionError(null);

    try {
      const res = await fetchOnboardingDetail(onboardingId);
      setSelected(res);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not load employee record.",
      );
    } finally {
      setDetailLoading(false);
    }
  }

  async function refreshSelected() {
    if (!selectedId) {
      await loadList();
      return;
    }

    await Promise.all([loadList(), loadDetail(selectedId)]);
  }

  useEffect(() => {
    void loadList();
  }, []);

  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();

    return items.filter((item) => {
      if (filter === "recently_started" && !isRecentlyStarted(item)) return false;
      if (filter === "awaiting_review" && item.status !== "awaiting_employer") return false;
      if (filter === "ready" && !isReadyRecord(item)) return false;
      if (filter === "started" && item.status !== "started") return false;

      if (!query) return true;

      const haystack = [
        item.candidate?.display_name,
        item.candidate?.email,
        item.candidate?.phone,
        item.job_post?.title,
        item.job_post?.company_name,
        item.job_post?.location,
        item.country_code,
        item.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [items, search, filter]);

  useEffect(() => {
    if (!filteredItems.length) {
      setSelectedId(null);
      setSelected(null);
      return;
    }

    if (selectedId && filteredItems.some((item) => item.id === selectedId)) return;
    setSelectedId(filteredItems[0].id);
  }, [filteredItems, selectedId]);

  useEffect(() => {
    if (!selectedId) {
      setSelected(null);
      return;
    }

    void loadDetail(selectedId);
  }, [selectedId]);

  useEffect(() => {
    setEmployeeRecordForm(buildEmployeeRecordForm(selected));
  }, [selected]);

  const submittedTasks = useMemo(() => {
    return (selected?.tasks || []).filter((task) => {
      const status = task.status || "";
      return (
        ["submitted", "reviewed", "approved", "rejected", "waived"].includes(status) ||
        !!getTaskSubmissionValue(task) ||
        getTaskSubmissionPairs(task).length > 0 ||
        !!getPossibleFileUrl(task as any)
      );
    });
  }, [selected]);

  const viewableDocuments = useMemo(() => {
    const docs: Array<BusinessOnboardingDocument | any> = [];
    const seen = new Set<string>();
    const anySelected = selected as any;

    for (const doc of selected?.documents || []) {
      const key = `onboarding-${doc.id}`;
      if (!seen.has(key)) {
        seen.add(key);
        docs.push(doc);
      }
    }

    for (const doc of anySelected?.employee_documents || []) {
      const key = `employee-${doc.id}`;
      if (!seen.has(key)) {
        seen.add(key);
        docs.push(doc);
      }
    }

    for (const contract of selected?.contracts || []) {
      const key = `contract-${contract.id}`;
      if (!seen.has(key)) {
        seen.add(key);
        docs.push({
          ...contract,
          document_type: "contract",
          delivery_status: contract.status,
          review_status: contract.status,
          title: contract.title,
        });
      }
    }

    return docs.filter((doc) => !!getPossibleFileUrl(doc));
  }, [selected]);

  const requiredTasks = selected?.tasks?.filter((task) => task.required) || [];
  const completedRequiredCount = requiredTasks.filter((task) =>
    ["approved", "waived"].includes(task.status || ""),
  ).length;

  function updateEmployeeField<K extends keyof EmployeeRecordForm>(
    key: K,
    value: EmployeeRecordForm[K],
  ) {
    setEmployeeRecordForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function handleSaveEmployeeRecord() {
    if (!selectedId) return;

    setBusyKey("employee-record-save");
    setActionError(null);
    setSuccessMessage(null);

    try {
      await apiFetch(`/api/business/onboarding/${selectedId}/employee-record`, {
        method: "PATCH",
        body: JSON.stringify(employeeRecordForm),
      });

      await refreshSelected();
      setSuccessMessage("Employee record saved.");
    } catch (caughtError) {
      setActionError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not save employee record.",
      );
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-hier-muted">
            Employee records
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-hier-text">
            Candidate-to-employee records
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-hier-muted">
            Review offered and started candidates, view submitted onboarding details,
            keep signed documents safe, and maintain editable employee information as
            details change over time.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void refreshSelected()}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-hier-border bg-white px-4 text-sm font-semibold text-hier-text transition hover:bg-hier-panel"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {error ? (
        <div className="rounded-[24px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {actionError ? (
        <div className="rounded-[24px] border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-700">
          {actionError}
        </div>
      ) : null}

      {successMessage ? (
        <div className="rounded-[24px] border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700">
          {successMessage}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-[28px] border border-hier-border bg-white p-10 text-sm text-hier-muted shadow-card">
          Loading employee records…
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[390px,1fr]">
          <aside className="space-y-4 rounded-[28px] border border-hier-border bg-white p-4 shadow-card">
            <div className="rounded-[22px] border border-hier-border bg-hier-panel p-3">
              <div className="flex items-center gap-2 rounded-2xl border border-hier-border bg-white px-3">
                <Search className="h-4 w-4 text-hier-muted" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search candidate, role, email..."
                  className="h-11 flex-1 bg-transparent text-sm text-hier-text outline-none placeholder:text-hier-muted"
                />
              </div>

              <select
                value={filter}
                onChange={(event) => setFilter(event.target.value as EmployeeRecordFilter)}
                className="mt-3 h-11 w-full rounded-2xl border border-hier-border bg-white px-3 text-sm text-hier-text outline-none focus:border-hier-primary"
              >
                <option value="all">All records</option>
                <option value="recently_started">Recently started</option>
                <option value="awaiting_review">Awaiting review</option>
                <option value="ready">Ready / completed</option>
                <option value="started">Started</option>
              </select>
            </div>

            <div className="px-2">
              <p className="text-sm font-semibold text-hier-text">
                {filteredItems.length} record{filteredItems.length === 1 ? "" : "s"}
              </p>
              <p className="mt-1 text-xs text-hier-muted">
                Offered, started, and submitted onboarding candidates.
              </p>
            </div>

            {filteredItems.length === 0 ? (
              <div className="rounded-[20px] border border-dashed border-hier-border bg-hier-panel px-4 py-4 text-sm text-hier-muted">
                No employee records match this search yet.
              </div>
            ) : (
              <div className="space-y-3">
                {filteredItems.map((item) => {
                  const isSelected = item.id === selectedId;
                  const submittedCount = (item.tasks || []).filter((task) =>
                    ["submitted", "reviewed", "approved", "rejected", "waived"].includes(task.status || ""),
                  ).length;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedId(item.id)}
                      className={`w-full rounded-[22px] border p-4 text-left transition ${
                        isSelected
                          ? "border-hier-primary bg-hier-soft"
                          : "border-hier-border bg-white hover:bg-hier-panel"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-base font-semibold text-hier-text">
                            {getCandidateName(item)}
                          </p>
                          <p className="mt-1 truncate text-sm text-hier-muted">
                            {getJobTitle(item)}
                          </p>
                        </div>

                        <Users className="mt-0.5 h-4 w-4 shrink-0 text-hier-muted" />
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${statusTone(
                            item.status,
                          )}`}
                        >
                          {formatLabel(item.status)}
                        </span>
                        <span className="rounded-full border border-hier-border bg-white px-3 py-1 text-[11px] font-semibold text-hier-text">
                          {submittedCount} submitted
                        </span>
                        <span className="rounded-full border border-hier-border bg-white px-3 py-1 text-[11px] font-semibold text-hier-text">
                          {item.country_code || "—"}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </aside>

          <main className="space-y-6">
            {detailLoading && !selected ? (
              <div className="rounded-[28px] border border-hier-border bg-white p-10 text-sm text-hier-muted shadow-card">
                Loading employee record…
              </div>
            ) : selected ? (
              <>
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="rounded-[28px] border border-hier-border bg-white p-5 shadow-card md:col-span-2">
                    <div className="flex items-start gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-hier-soft text-hier-primary">
                        <UserRound className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-xl font-semibold text-hier-text">
                          {getCandidateName(selected)}
                        </p>
                        <p className="mt-1 text-sm text-hier-muted">
                          {getJobTitle(selected)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[28px] border border-hier-border bg-white p-5 shadow-card">
                    <p className="text-sm text-hier-muted">Required complete</p>
                    <p className="mt-3 text-3xl font-semibold tracking-tight text-hier-text">
                      {completedRequiredCount}/{requiredTasks.length}
                    </p>
                  </div>

                  <div className="rounded-[28px] border border-hier-border bg-white p-5 shadow-card">
                    <p className="text-sm text-hier-muted">Documents</p>
                    <p className="mt-3 text-3xl font-semibold tracking-tight text-hier-text">
                      {viewableDocuments.length}
                    </p>
                  </div>
                </div>

                <section className="rounded-[28px] border border-hier-border bg-white p-6 shadow-card">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-3">
                      <PencilLine className="h-5 w-5 text-hier-primary" />
                      <div>
                        <h2 className="text-xl font-semibold text-hier-text">
                          Editable employee details
                        </h2>
                        <p className="mt-1 text-sm text-hier-muted">
                          Update this whenever an employee moves, changes role, or details change.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => void handleSaveEmployeeRecord()}
                      disabled={busyKey === "employee-record-save"}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-hier-primary px-4 text-sm font-semibold text-white shadow-card disabled:opacity-60"
                    >
                      {busyKey === "employee-record-save" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      Save record
                    </button>
                  </div>

                  <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <input value={employeeRecordForm.legal_name} onChange={(event) => updateEmployeeField("legal_name", event.target.value)} placeholder="Legal name" className={formInputClass(busyKey === "employee-record-save")} />
                    <input value={employeeRecordForm.preferred_name} onChange={(event) => updateEmployeeField("preferred_name", event.target.value)} placeholder="Preferred name" className={formInputClass(busyKey === "employee-record-save")} />
                    <input value={employeeRecordForm.employee_number} onChange={(event) => updateEmployeeField("employee_number", event.target.value)} placeholder="Employee number" className={formInputClass(busyKey === "employee-record-save")} />
                    <input value={employeeRecordForm.personal_email} onChange={(event) => updateEmployeeField("personal_email", event.target.value)} placeholder="Personal email" className={formInputClass(busyKey === "employee-record-save")} />
                    <input value={employeeRecordForm.work_email} onChange={(event) => updateEmployeeField("work_email", event.target.value)} placeholder="Work email" className={formInputClass(busyKey === "employee-record-save")} />
                    <input value={employeeRecordForm.phone} onChange={(event) => updateEmployeeField("phone", event.target.value)} placeholder="Phone" className={formInputClass(busyKey === "employee-record-save")} />
                    <input value={employeeRecordForm.start_date} onChange={(event) => updateEmployeeField("start_date", event.target.value)} type="date" className={formInputClass(busyKey === "employee-record-save")} />
                    <input value={employeeRecordForm.job_title} onChange={(event) => updateEmployeeField("job_title", event.target.value)} placeholder="Job title" className={formInputClass(busyKey === "employee-record-save")} />
                    <input value={employeeRecordForm.department} onChange={(event) => updateEmployeeField("department", event.target.value)} placeholder="Department" className={formInputClass(busyKey === "employee-record-save")} />
                    <input value={employeeRecordForm.manager_name} onChange={(event) => updateEmployeeField("manager_name", event.target.value)} placeholder="Manager name" className={formInputClass(busyKey === "employee-record-save")} />
                    <input value={employeeRecordForm.address_line_1} onChange={(event) => updateEmployeeField("address_line_1", event.target.value)} placeholder="Address line 1" className={formInputClass(busyKey === "employee-record-save")} />
                    <input value={employeeRecordForm.address_line_2} onChange={(event) => updateEmployeeField("address_line_2", event.target.value)} placeholder="Address line 2" className={formInputClass(busyKey === "employee-record-save")} />
                    <input value={employeeRecordForm.city} onChange={(event) => updateEmployeeField("city", event.target.value)} placeholder="City" className={formInputClass(busyKey === "employee-record-save")} />
                    <input value={employeeRecordForm.region} onChange={(event) => updateEmployeeField("region", event.target.value)} placeholder="County / region" className={formInputClass(busyKey === "employee-record-save")} />
                    <input value={employeeRecordForm.postcode} onChange={(event) => updateEmployeeField("postcode", event.target.value)} placeholder="Postcode" className={formInputClass(busyKey === "employee-record-save")} />
                    <input value={employeeRecordForm.country_code} onChange={(event) => updateEmployeeField("country_code", event.target.value)} placeholder="Country code" className={formInputClass(busyKey === "employee-record-save")} />
                    <input value={employeeRecordForm.emergency_contact_name} onChange={(event) => updateEmployeeField("emergency_contact_name", event.target.value)} placeholder="Emergency contact name" className={formInputClass(busyKey === "employee-record-save")} />
                    <input value={employeeRecordForm.emergency_contact_phone} onChange={(event) => updateEmployeeField("emergency_contact_phone", event.target.value)} placeholder="Emergency contact phone" className={formInputClass(busyKey === "employee-record-save")} />
                    <input value={employeeRecordForm.national_id_last4} onChange={(event) => updateEmployeeField("national_id_last4", event.target.value)} placeholder="National ID last 4" className={formInputClass(busyKey === "employee-record-save")} />
                  </div>

                  <div className="mt-4">
                    <textarea
                      value={employeeRecordForm.notes}
                      onChange={(event) => updateEmployeeField("notes", event.target.value)}
                      placeholder="Internal notes"
                      className={formTextareaClass(busyKey === "employee-record-save")}
                    />
                  </div>
                </section>

                <div className="grid gap-6 xl:grid-cols-[1fr,0.85fr]">
                  <section className="rounded-[28px] border border-hier-border bg-white p-6 shadow-card">
                    <div className="flex items-center gap-3">
                      <ClipboardCheck className="h-5 w-5 text-hier-primary" />
                      <h2 className="text-xl font-semibold text-hier-text">
                        Submitted checklist details
                      </h2>
                    </div>

                    <div className="mt-5 space-y-3">
                      {submittedTasks.length === 0 ? (
                        <div className="rounded-[20px] border border-dashed border-hier-border bg-hier-panel px-4 py-4 text-sm text-hier-muted">
                          No submitted checklist details yet.
                        </div>
                      ) : (
                        submittedTasks.map((task) => {
                          const summary = getTaskSubmissionValue(task);
                          const taskViewUrl = getPossibleFileUrl(task as any);

                          return (
                            <div
                              key={task.id}
                              className="rounded-[22px] border border-hier-border bg-white p-4"
                            >
                              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                <div>
                                  <p className="text-sm font-semibold text-hier-text">
                                    {task.title || formatLabel(task.task_key)}
                                  </p>
                                  <p className="mt-1 text-xs text-hier-muted">
                                    {summary || "Candidate submitted onboarding details."}
                                  </p>
                                </div>
                                <span
                                  className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold ${taskTone(
                                    task.status,
                                  )}`}
                                >
                                  {formatLabel(task.status)}
                                </span>
                              </div>

                              <div className="mt-3 flex flex-wrap gap-2">
                                <SubmittedDetailsButton
                                  task={task}
                                  onClick={() => setViewingSubmissionTask(task)}
                                />
                                {taskViewUrl ? (
                                  <button
                                    type="button"
                                    onClick={() => openFileUrl(taskViewUrl)}
                                    className="inline-flex h-10 items-center gap-2 rounded-2xl border border-hier-border bg-white px-4 text-sm font-semibold text-hier-ink transition hover:bg-hier-soft"
                                  >
                                    <Eye className="h-4 w-4" />
                                    View submission
                                  </button>
                                ) : null}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </section>

                  <section className="rounded-[28px] border border-hier-border bg-white p-6 shadow-card">
                    <div className="flex items-center gap-3">
                      <ShieldCheck className="h-5 w-5 text-hier-primary" />
                      <h2 className="text-xl font-semibold text-hier-text">
                        Stored documents
                      </h2>
                    </div>

                    <div className="mt-5 space-y-3">
                      {viewableDocuments.length === 0 ? (
                        <div className="rounded-[20px] border border-dashed border-hier-border bg-hier-panel px-4 py-4 text-sm text-hier-muted">
                          No signed or uploaded documents are viewable yet.
                        </div>
                      ) : (
                        viewableDocuments.map((doc: any) => {
                          const docUrl = getPossibleFileUrl(doc);

                          return (
                            <div
                              key={`${doc.document_type || "doc"}-${doc.id}`}
                              className="rounded-[20px] border border-hier-border bg-white p-4"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="text-sm font-semibold text-hier-text">
                                    {doc.title || doc.original_filename || doc.document_type || "Document"}
                                  </p>
                                  <p className="mt-1 text-xs text-hier-muted">
                                    {formatLabel(doc.document_type || doc.category || "document")}
                                  </p>
                                </div>
                                <span
                                  className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold ${documentTone(
                                    doc.review_status || doc.delivery_status || doc.status,
                                  )}`}
                                >
                                  {formatLabel(doc.review_status || doc.delivery_status || doc.status || "stored")}
                                </span>
                              </div>

                              {docUrl ? (
                                <div className="mt-3">
                                  <button
                                    type="button"
                                    onClick={() => openFileUrl(docUrl)}
                                    className="inline-flex h-10 items-center gap-2 rounded-2xl border border-hier-border bg-white px-4 text-sm font-semibold text-hier-ink transition hover:bg-hier-soft"
                                  >
                                    <Eye className="h-4 w-4" />
                                    View document
                                  </button>
                                </div>
                              ) : null}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </section>
                </div>
              </>
            ) : (
              <div className="rounded-[28px] border border-hier-border bg-white p-10 text-sm text-hier-muted shadow-card">
                Select an employee record to view details.
              </div>
            )}
          </main>
        </div>
      )}

      {viewingSubmissionTask ? (
        <SubmissionDetailsModal
          task={viewingSubmissionTask}
          onClose={() => setViewingSubmissionTask(null)}
        />
      ) : null}
    </div>
  );
}
