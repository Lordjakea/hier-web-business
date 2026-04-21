"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Archive,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  FilePlus2,
  FileText,
  Loader2,
  MapPin,
  RefreshCw,
  RotateCcw,
  Send,
  ShieldCheck,
  Upload,
  UserRound,
  Users,
  XCircle,
} from "lucide-react";

import {
  createOnboardingContract,
  createOnboardingDocument,
  fetchOnboardingDetail,
  fetchOnboardingList,
  removeOnboarding,
  requestOnboardingTask,
  restoreOnboarding,
  reviewOnboardingTask,
  sendOnboardingContract,
  sendOnboardingDocument,
  sendOnboardingTask,
  uploadAndCreateOnboardingContract,
  uploadAndCreateOnboardingDocument,
} from "@/lib/business-onboarding";
import type {
  BusinessOnboarding,
  BusinessOnboardingContract,
  BusinessOnboardingDocument,
  BusinessOnboardingTask,
} from "@/lib/types";

type WorkspaceTab = "active" | "inactive" | "employees";

function formatLabel(value?: string | null) {
  if (!value) return "—";
  return value
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function statusTone(status?: string | null) {
  switch (status) {
    case "compliant_pending_start":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "awaiting_candidate":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "awaiting_employer":
      return "bg-sky-50 text-sky-700 border-sky-200";
    case "started":
    case "completed":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "archived":
      return "bg-zinc-100 text-zinc-600 border-zinc-200";
    case "removed":
      return "bg-rose-50 text-rose-700 border-rose-200";
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
    case "draft":
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
    case "draft":
    default:
      return "bg-zinc-100 text-zinc-600 border-zinc-200";
  }
}

function applicationAllowsOnboarding(stage?: string | null) {
  return stage === "offered" || stage === "started";
}

function isRemovedOrArchived(status?: string | null) {
  return status === "removed" || status === "archived";
}

function isEmployeeLike(item: BusinessOnboarding) {
  return item.status === "started" || item.status === "completed";
}

function isActiveItem(item: BusinessOnboarding) {
  if (isRemovedOrArchived(item.status)) return false;
  if (isEmployeeLike(item)) return false;
  return applicationAllowsOnboarding(item.application?.stage || null);
}

function isInactiveItem(item: BusinessOnboarding) {
  if (isRemovedOrArchived(item.status)) return true;
  if (isEmployeeLike(item)) return false;
  return !applicationAllowsOnboarding(item.application?.stage || null);
}

function tabButtonClass(active: boolean) {
  return active
    ? "border-hier-primary bg-hier-soft text-hier-primary"
    : "border-hier-border bg-white text-hier-text hover:bg-hier-panel";
}

export default function OnboardingPage() {
  const searchParams = useSearchParams();
  const applicationIdFromUrl = Number(searchParams.get("applicationId") || "") || null;

  const [items, setItems] = useState<BusinessOnboarding[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selected, setSelected] = useState<BusinessOnboarding | null>(null);

  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [tab, setTab] = useState<WorkspaceTab>("active");

  const [contractTitle, setContractTitle] = useState("");
  const [contractTemplateName, setContractTemplateName] = useState("");
  const [documentTitle, setDocumentTitle] = useState("");
  const [documentType, setDocumentType] = useState("contract");
  const [documentTaskId, setDocumentTaskId] = useState<number | "">("");
  const [removeReason, setRemoveReason] = useState("removed_by_business");

  async function loadList() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetchOnboardingList({
        applicationId: applicationIdFromUrl,
      });

      const list: BusinessOnboarding[] = res.items || [];
      setItems(list);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not load onboarding workspace.",
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
          : "Could not load onboarding detail.",
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
  }, [applicationIdFromUrl]);

  const activeItems = useMemo(() => items.filter(isActiveItem), [items]);
  const inactiveItems = useMemo(() => items.filter(isInactiveItem), [items]);
  const employeeItems = useMemo(() => items.filter(isEmployeeLike), [items]);

  const visibleItems = useMemo(() => {
    switch (tab) {
      case "inactive":
        return inactiveItems;
      case "employees":
        return employeeItems;
      case "active":
      default:
        return activeItems;
    }
  }, [tab, activeItems, inactiveItems, employeeItems]);

  useEffect(() => {
    const allGroups = {
      active: activeItems,
      inactive: inactiveItems,
      employees: employeeItems,
    };

    const currentGroup = allGroups[tab];

    if (!currentGroup.length) {
      if (tab !== "active" && activeItems.length) {
        setTab("active");
        return;
      }
      if (tab !== "inactive" && inactiveItems.length) {
        setTab("inactive");
        return;
      }
      if (tab !== "employees" && employeeItems.length) {
        setTab("employees");
        return;
      }
      setSelectedId(null);
      setSelected(null);
      return;
    }

    if (selectedId && currentGroup.some((item) => item.id === selectedId)) {
      return;
    }

    const matched =
      (applicationIdFromUrl
        ? currentGroup.find((item) => item.application?.id === applicationIdFromUrl)
        : null) || currentGroup[0];

    setSelectedId(matched.id);
  }, [tab, activeItems, inactiveItems, employeeItems, selectedId, applicationIdFromUrl]);

  useEffect(() => {
    if (!selectedId) {
      setSelected(null);
      return;
    }
    void loadDetail(selectedId);
  }, [selectedId]);

  const requiredTasks = useMemo(() => {
    return (selected?.tasks || []).filter((task) => task.required);
  }, [selected]);

  const completedRequiredCount = useMemo(() => {
    return requiredTasks.filter((task) =>
      ["approved", "waived"].includes(task.status || ""),
    ).length;
  }, [requiredTasks]);

  const pendingRequiredCount = useMemo(() => {
    return requiredTasks.filter(
      (task) => !["approved", "waived"].includes(task.status || ""),
    ).length;
  }, [requiredTasks]);

  const selectedApplicationStage = selected?.application?.stage || null;
  const selectedAllowsOnboarding = applicationAllowsOnboarding(selectedApplicationStage);
  const selectedIsRemoved = selected?.status === "removed";
  const selectedIsArchived = selected?.status === "archived";
  const selectedIsInactive = selectedIsRemoved || selectedIsArchived;
  const selectedIsEmployeeLike = !!selected && isEmployeeLike(selected);
  const canManageSelected =
    !!selected && selectedAllowsOnboarding && !selectedIsInactive && !selectedIsEmployeeLike;
  const canRestoreSelected =
    !!selected && selectedIsRemoved && selectedAllowsOnboarding;

  async function handleTaskReview(
    taskId: number,
    status: "approved" | "rejected" | "waived" | "reviewed",
  ) {
    if (!selectedId || !canManageSelected) return;

    setBusyKey(`task-review-${taskId}`);
    setActionError(null);

    try {
      await reviewOnboardingTask(selectedId, taskId, { status });
      await refreshSelected();
    } catch (caughtError) {
      setActionError(
        caughtError instanceof Error ? caughtError.message : "Could not update task.",
      );
    } finally {
      setBusyKey(null);
    }
  }

  async function handleTaskRerequest(taskKey: string, taskId: number) {
    if (!selectedId || !canManageSelected) return;

    setBusyKey(`task-rerequest-${taskId}`);
    setActionError(null);

    try {
      await requestOnboardingTask(selectedId, taskKey);
      await refreshSelected();
    } catch (caughtError) {
      setActionError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not request task again.",
      );
    } finally {
      setBusyKey(null);
    }
  }

  async function handleTaskSend(taskId: number) {
    if (!selectedId || !canManageSelected) return;

    setBusyKey(`task-send-${taskId}`);
    setActionError(null);

    try {
      await sendOnboardingTask(selectedId, taskId);
      await refreshSelected();
    } catch (caughtError) {
      setActionError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not send task to candidate.",
      );
    } finally {
      setBusyKey(null);
    }
  }

  async function handleCreateContract() {
    if (!selectedId || !canManageSelected || !contractTitle.trim()) return;

    setBusyKey("contract-create");
    setActionError(null);

    try {
      await createOnboardingContract(selectedId, {
        title: contractTitle.trim(),
        template_name: contractTemplateName.trim() || undefined,
        status: "draft",
      });

      setContractTitle("");
      setContractTemplateName("");
      await refreshSelected();
    } catch (caughtError) {
      setActionError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not create contract.",
      );
    } finally {
      setBusyKey(null);
    }
  }

  async function handleContractUpload(file: File) {
    if (!selectedId || !canManageSelected || !contractTitle.trim()) return;

    setBusyKey("contract-upload");
    setActionError(null);

    try {
      await uploadAndCreateOnboardingContract(selectedId, file, {
        title: contractTitle.trim(),
        template_name: contractTemplateName.trim() || undefined,
      });

      setContractTitle("");
      setContractTemplateName("");
      await refreshSelected();
    } catch (caughtError) {
      setActionError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not upload contract.",
      );
    } finally {
      setBusyKey(null);
    }
  }

  async function handleContractSend(contractId: number) {
    if (!selectedId || !canManageSelected) return;

    setBusyKey(`contract-send-${contractId}`);
    setActionError(null);

    try {
      await sendOnboardingContract(selectedId, contractId);
      await refreshSelected();
    } catch (caughtError) {
      setActionError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not send contract.",
      );
    } finally {
      setBusyKey(null);
    }
  }

  async function handleCreateDocument() {
    if (!selectedId || !canManageSelected || !documentType.trim()) return;

    setBusyKey("document-create");
    setActionError(null);

    try {
      await createOnboardingDocument(selectedId, {
        document_type: documentType.trim(),
        title: documentTitle.trim() || undefined,
        task_id: documentTaskId === "" ? undefined : Number(documentTaskId),
        visible_to_candidate: false,
        review_status: "pending",
      });

      setDocumentTitle("");
      setDocumentType("contract");
      setDocumentTaskId("");
      await refreshSelected();
    } catch (caughtError) {
      setActionError(
        caughtError instanceof Error ? caughtError.message : "Could not add document.",
      );
    } finally {
      setBusyKey(null);
    }
  }

  async function handleDocumentUpload(file: File) {
    if (!selectedId || !canManageSelected || !documentType.trim()) return;

    setBusyKey("document-upload");
    setActionError(null);

    try {
      await uploadAndCreateOnboardingDocument(selectedId, file, {
        document_type: documentType.trim(),
        title: documentTitle.trim() || file.name,
        task_id: documentTaskId === "" ? undefined : Number(documentTaskId),
        visible_to_candidate: false,
        review_status: "pending",
      });

      setDocumentTitle("");
      setDocumentType("contract");
      setDocumentTaskId("");
      await refreshSelected();
    } catch (caughtError) {
      setActionError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not upload document.",
      );
    } finally {
      setBusyKey(null);
    }
  }

  async function handleDocumentSend(documentId: number) {
    if (!selectedId || !canManageSelected) return;

    setBusyKey(`document-send-${documentId}`);
    setActionError(null);

    try {
      await sendOnboardingDocument(selectedId, documentId);
      await refreshSelected();
    } catch (caughtError) {
      setActionError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not send document.",
      );
    } finally {
      setBusyKey(null);
    }
  }

  async function handleRemoveOnboarding() {
    if (!selectedId || !selected || selectedIsRemoved) return;

    const confirmed = window.confirm(
      "Remove this candidate from onboarding? This will disable active onboarding access for the candidate.",
    );
    if (!confirmed) return;

    setBusyKey("onboarding-remove");
    setActionError(null);

    try {
      await removeOnboarding(selectedId, {
        reason: removeReason,
      });
      await refreshSelected();
      setTab("inactive");
    } catch (caughtError) {
      setActionError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not remove candidate from onboarding.",
      );
    } finally {
      setBusyKey(null);
    }
  }

  async function handleRestoreOnboarding() {
    if (!selectedId || !canRestoreSelected) return;

    setBusyKey("onboarding-restore");
    setActionError(null);

    try {
      await restoreOnboarding(selectedId);
      await refreshSelected();
      setTab("active");
    } catch (caughtError) {
      setActionError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not re-enable onboarding.",
      );
    } finally {
      setBusyKey(null);
    }
  }

  const sidebarTitle =
    tab === "active"
      ? "Active onboarding"
      : tab === "inactive"
        ? "Inactive / removed"
        : "Employee records";

  const sidebarEmptyMessage =
    tab === "active"
      ? "No active onboarding journeys right now."
      : tab === "inactive"
        ? "No inactive onboarding journeys."
        : "No employee-linked onboarding journeys yet.";

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-hier-muted">
          Premium onboarding
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-hier-text">
          Onboarding workspace
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-hier-muted">
          Manage active onboarding, keep removed journeys out of the live workflow,
          and separate employee-linked records into their own workspace view.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setTab("active")}
          className={`inline-flex h-11 items-center gap-2 rounded-2xl border px-4 text-sm font-semibold transition ${tabButtonClass(
            tab === "active",
          )}`}
        >
          <ClipboardCheck className="h-4 w-4" />
          Active
          <span className="rounded-full bg-white/80 px-2 py-0.5 text-xs">
            {activeItems.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setTab("inactive")}
          className={`inline-flex h-11 items-center gap-2 rounded-2xl border px-4 text-sm font-semibold transition ${tabButtonClass(
            tab === "inactive",
          )}`}
        >
          <Archive className="h-4 w-4" />
          Inactive / removed
          <span className="rounded-full bg-white/80 px-2 py-0.5 text-xs">
            {inactiveItems.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setTab("employees")}
          className={`inline-flex h-11 items-center gap-2 rounded-2xl border px-4 text-sm font-semibold transition ${tabButtonClass(
            tab === "employees",
          )}`}
        >
          <Users className="h-4 w-4" />
          Employee records
          <span className="rounded-full bg-white/80 px-2 py-0.5 text-xs">
            {employeeItems.length}
          </span>
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

      {loading ? (
        <div className="rounded-[28px] border border-hier-border bg-white p-10 text-sm text-hier-muted shadow-card">
          Loading onboarding workspace…
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[360px,1fr]">
          <aside className="rounded-[28px] border border-hier-border bg-white p-4 shadow-card">
            <div className="mb-3 flex items-center justify-between px-2">
              <div>
                <p className="text-sm font-semibold text-hier-text">{sidebarTitle}</p>
                <p className="mt-1 text-xs text-hier-muted">
                  {visibleItems.length} item{visibleItems.length === 1 ? "" : "s"}
                </p>
              </div>

              <button
                type="button"
                onClick={() => void loadList()}
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-hier-border bg-white text-hier-text transition hover:bg-hier-panel"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>

            {visibleItems.length === 0 ? (
              <div className="rounded-[20px] border border-dashed border-hier-border bg-hier-panel px-4 py-4 text-sm text-hier-muted">
                {sidebarEmptyMessage}
              </div>
            ) : (
              <div className="space-y-3">
                {visibleItems.map((item) => {
                  const isSelected = item.id === selectedId;
                  const itemEligible = applicationAllowsOnboarding(
                    item.application?.stage || null,
                  );
                  const itemEmployeeLike = isEmployeeLike(item);

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
                          <p className="text-base font-semibold text-hier-text">
                            {item.candidate?.display_name ||
                              `Application #${item.application_id}`}
                          </p>
                          <p className="mt-1 text-sm text-hier-muted">
                            {item.job_post?.title || `Application #${item.application_id}`}
                          </p>
                        </div>

                        <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-hier-muted" />
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
                          {item.country_code || "—"}
                        </span>

                        {!itemEligible && !isRemovedOrArchived(item.status) && !itemEmployeeLike ? (
                          <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-semibold text-amber-700">
                            Stage not eligible
                          </span>
                        ) : null}

                        {itemEmployeeLike ? (
                          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700">
                            Employee-linked
                          </span>
                        ) : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </aside>

          <section className="space-y-6">
            {detailLoading && !selected ? (
              <div className="rounded-[28px] border border-hier-border bg-white p-10 text-sm text-hier-muted shadow-card">
                Loading onboarding detail…
              </div>
            ) : selected ? (
              <>
                {selectedIsRemoved ? (
                  <div className="rounded-[24px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
                    This onboarding journey has been removed from the active workflow.
                    You can re-enable it if the application is back in Offered or Started.
                  </div>
                ) : null}

                {!selectedIsRemoved &&
                !selectedIsEmployeeLike &&
                !selectedAllowsOnboarding ? (
                  <div className="rounded-[24px] border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-700">
                    This application is not currently in an onboarding-eligible stage.
                    Only Offered or Started candidates should be actively onboarded.
                  </div>
                ) : null}

                {selectedIsEmployeeLike ? (
                  <div className="rounded-[24px] border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700">
                    This journey is now employee-linked. Keep it in the employee records
                    workspace for reference and ongoing document history.
                  </div>
                ) : null}

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-[28px] border border-hier-border bg-white p-5 shadow-card">
                    <p className="text-sm text-hier-muted">Status</p>
                    <div className="mt-3">
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${statusTone(
                          selected.status,
                        )}`}
                      >
                        {formatLabel(selected.status)}
                      </span>
                    </div>
                    <p className="mt-3 text-sm text-hier-muted">
                      Country: {selected.country_code || "—"}
                    </p>
                  </div>

                  <div className="rounded-[28px] border border-hier-border bg-white p-5 shadow-card">
                    <p className="text-sm text-hier-muted">Required complete</p>
                    <p className="mt-3 text-3xl font-semibold tracking-tight text-hier-text">
                      {completedRequiredCount}/{requiredTasks.length}
                    </p>
                    <p className="mt-2 text-sm text-hier-muted">
                      Tasks approved or waived
                    </p>
                  </div>

                  <div className="rounded-[28px] border border-hier-border bg-white p-5 shadow-card">
                    <p className="text-sm text-hier-muted">
                      {selectedIsEmployeeLike ? "Employee-linked" : "Needs attention"}
                    </p>
                    <p className="mt-3 text-3xl font-semibold tracking-tight text-hier-text">
                      {selectedIsEmployeeLike ? (selected.documents || []).length : pendingRequiredCount}
                    </p>
                    <p className="mt-2 text-sm text-hier-muted">
                      {selectedIsEmployeeLike
                        ? "Documents linked to this journey"
                        : "Remaining required tasks"}
                    </p>
                  </div>
                </div>

                <div className="rounded-[28px] border border-hier-border bg-white p-5 shadow-card">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-hier-text">
                        Workflow controls
                      </p>
                      <p className="mt-1 text-sm text-hier-muted">
                        {selectedIsRemoved
                          ? "This journey is inactive and hidden from the live onboarding workflow."
                          : selectedIsEmployeeLike
                            ? "This journey is grouped with employee-linked onboarding records."
                            : !selectedAllowsOnboarding
                              ? "This application is not currently eligible for active onboarding."
                              : "This candidate is currently eligible for onboarding actions."}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {selectedIsRemoved ? (
                        <button
                          type="button"
                          onClick={() => void handleRestoreOnboarding()}
                          disabled={!canRestoreSelected || busyKey === "onboarding-restore"}
                          className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 text-sm font-semibold text-emerald-700 disabled:opacity-60"
                        >
                          <RotateCcw className="h-4 w-4" />
                          {busyKey === "onboarding-restore"
                            ? "Re-enabling…"
                            : "Re-enable onboarding"}
                        </button>
                      ) : !selectedIsEmployeeLike ? (
                        <>
                          <select
                            value={removeReason}
                            onChange={(event) => setRemoveReason(event.target.value)}
                            disabled={!selected || selectedIsRemoved}
                            className="h-11 rounded-2xl border border-hier-border bg-hier-panel px-4 text-sm text-hier-text outline-none focus:border-hier-primary focus:bg-white disabled:opacity-60"
                          >
                            <option value="removed_by_business">Removed by business</option>
                            <option value="lost_contact">Lost contact</option>
                            <option value="candidate_changed_mind">
                              Candidate changed mind
                            </option>
                            <option value="rejected">Rejected</option>
                            <option value="duplicate">Duplicate</option>
                            <option value="other">Other</option>
                          </select>

                          <button
                            type="button"
                            onClick={() => void handleRemoveOnboarding()}
                            disabled={!selected || selectedIsRemoved || busyKey === "onboarding-remove"}
                            className="inline-flex h-11 items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-700 disabled:opacity-60"
                          >
                            {busyKey === "onboarding-remove"
                              ? "Removing…"
                              : "Remove from onboarding"}
                          </button>
                        </>
                      ) : null}
                    </div>
                  </div>

                  {selected.removed_at ? (
                    <p className="mt-3 text-xs text-hier-muted">
                      Removed at {selected.removed_at}
                      {selected.removal_reason
                        ? ` • Reason: ${formatLabel(selected.removal_reason)}`
                        : ""}
                    </p>
                  ) : null}
                </div>

                <div className="grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
                  <div className="space-y-6">
                    <section className="rounded-[28px] border border-hier-border bg-white p-6 shadow-card">
                      <div className="flex items-start gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-hier-soft text-hier-primary">
                          <UserRound className="h-5 w-5" />
                        </div>
                        <div>
                          <h2 className="text-xl font-semibold text-hier-text">
                            {selected.candidate?.display_name || "Candidate"}
                          </h2>
                          <p className="mt-1 text-sm text-hier-muted">
                            {selected.job_post?.title || "Role not available"}
                          </p>
                        </div>
                      </div>

                      <div className="mt-5 grid gap-4 md:grid-cols-2">
                        <div className="rounded-[20px] bg-hier-panel p-4">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-hier-muted">
                            Employment country
                          </p>
                          <p className="mt-2 text-sm font-semibold text-hier-text">
                            {selected.country_code || "—"}
                          </p>
                        </div>

                        <div className="rounded-[20px] bg-hier-panel p-4">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-hier-muted">
                            Worker type
                          </p>
                          <p className="mt-2 text-sm font-semibold text-hier-text">
                            {formatLabel(selected.worker_type)}
                          </p>
                        </div>

                        <div className="rounded-[20px] bg-hier-panel p-4">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-hier-muted">
                            Employing entity
                          </p>
                          <p className="mt-2 text-sm font-semibold text-hier-text">
                            {selected.employing_entity_name || "Not set"}
                          </p>
                        </div>

                        <div className="rounded-[20px] bg-hier-panel p-4">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-hier-muted">
                            Job location
                          </p>
                          <p className="mt-2 text-sm font-semibold text-hier-text">
                            {selected.job_post?.location || "Not set"}
                          </p>
                        </div>
                      </div>
                    </section>

                    <section className="rounded-[28px] border border-hier-border bg-white p-6 shadow-card">
                      <div className="flex items-center gap-3">
                        <ClipboardCheck className="h-5 w-5 text-hier-primary" />
                        <h3 className="text-xl font-semibold text-hier-text">
                          Task checklist
                        </h3>
                      </div>

                      <div className="mt-5 space-y-3">
                        {(selected.tasks || []).length === 0 ? (
                          <div className="rounded-[20px] border border-dashed border-hier-border bg-hier-panel px-4 py-4 text-sm text-hier-muted">
                            No onboarding tasks available yet.
                          </div>
                        ) : (
                          (selected.tasks || []).map((task: BusinessOnboardingTask) => (
                            <div
                              key={task.id}
                              className="rounded-[22px] border border-hier-border bg-white p-4"
                            >
                              <div className="flex flex-col gap-4">
                                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                  <div>
                                    <p className="text-sm font-semibold text-hier-text">
                                      {task.title || formatLabel(task.task_key)}
                                    </p>
                                    <p className="mt-1 text-sm text-hier-muted">
                                      {task.description || "No description added yet."}
                                    </p>

                                    <div className="mt-3 flex flex-wrap gap-2">
                                      <span className="rounded-full border border-hier-border bg-hier-panel px-3 py-1 text-[11px] font-semibold text-hier-text">
                                        {formatLabel(task.owner_type)}
                                      </span>
                                      <span className="rounded-full border border-hier-border bg-hier-panel px-3 py-1 text-[11px] font-semibold text-hier-text">
                                        {task.required ? "Required" : "Optional"}
                                      </span>
                                      {task.phase ? (
                                        <span className="rounded-full border border-hier-border bg-hier-panel px-3 py-1 text-[11px] font-semibold text-hier-text">
                                          {formatLabel(task.phase)}
                                        </span>
                                      ) : null}
                                    </div>
                                  </div>

                                  <div className="shrink-0">
                                    <span
                                      className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold ${taskTone(
                                        task.status,
                                      )}`}
                                    >
                                      {formatLabel(task.status)}
                                    </span>
                                  </div>
                                </div>

                                {!selectedIsEmployeeLike ? (
                                  <div className="flex flex-wrap gap-2">
                                    {task.owner_type === "candidate" && task.status === "draft" ? (
                                      <button
                                        type="button"
                                        disabled={
                                          !canManageSelected ||
                                          busyKey === `task-send-${task.id}`
                                        }
                                        onClick={() => void handleTaskSend(task.id)}
                                        className="inline-flex h-10 items-center gap-2 rounded-2xl border border-sky-200 bg-sky-50 px-4 text-sm font-medium text-sky-700 disabled:opacity-60"
                                      >
                                        {busyKey === `task-send-${task.id}` ? (
                                          <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                          <Send className="h-4 w-4" />
                                        )}
                                        Send to candidate
                                      </button>
                                    ) : null}

                                    <button
                                      type="button"
                                      disabled={
                                        !canManageSelected ||
                                        busyKey === `task-review-${task.id}`
                                      }
                                      onClick={() =>
                                        void handleTaskReview(task.id, "approved")
                                      }
                                      className="inline-flex h-10 items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 text-sm font-medium text-emerald-700 disabled:opacity-60"
                                    >
                                      {busyKey === `task-review-${task.id}` ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <CheckCircle2 className="h-4 w-4" />
                                      )}
                                      Approve
                                    </button>

                                    <button
                                      type="button"
                                      disabled={
                                        !canManageSelected ||
                                        busyKey === `task-review-${task.id}`
                                      }
                                      onClick={() =>
                                        void handleTaskReview(task.id, "rejected")
                                      }
                                      className="inline-flex h-10 items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 text-sm font-medium text-rose-700 disabled:opacity-60"
                                    >
                                      <XCircle className="h-4 w-4" />
                                      Reject
                                    </button>

                                    <button
                                      type="button"
                                      disabled={
                                        !canManageSelected ||
                                        busyKey === `task-rerequest-${task.id}`
                                      }
                                      onClick={() =>
                                        void handleTaskRerequest(task.task_key, task.id)
                                      }
                                      className="inline-flex h-10 items-center gap-2 rounded-2xl border border-hier-border bg-white px-4 text-sm font-medium text-hier-ink disabled:opacity-60"
                                    >
                                      <RefreshCw className="h-4 w-4" />
                                      Re-request
                                    </button>
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </section>
                  </div>

                  <div className="space-y-6">
                    <section className="rounded-[28px] border border-hier-border bg-white p-6 shadow-card">
                      <div className="flex items-center gap-3">
                        <ShieldCheck className="h-5 w-5 text-hier-primary" />
                        <h3 className="text-xl font-semibold text-hier-text">
                          Country pack
                        </h3>
                      </div>

                      <div className="mt-5 rounded-[22px] bg-hier-panel p-4">
                        <p className="text-sm font-semibold text-hier-text">
                          {selected.country_pack?.name ||
                            selected.country_code ||
                            "Country pack"}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-hier-muted">
                          Version: {selected.country_pack?.version || "—"}
                        </p>
                      </div>
                    </section>

                    {!selectedIsEmployeeLike ? (
                      <>
                        <section className="rounded-[28px] border border-hier-border bg-white p-6 shadow-card">
                          <div className="flex items-center gap-3">
                            <FilePlus2 className="h-5 w-5 text-hier-primary" />
                            <h3 className="text-xl font-semibold text-hier-text">
                              Create contract
                            </h3>
                          </div>

                          <div className="mt-5 space-y-3">
                            <input
                              value={contractTitle}
                              onChange={(event) => setContractTitle(event.target.value)}
                              placeholder="Employment contract"
                              className="h-12 w-full rounded-2xl border border-hier-border bg-hier-panel px-4 text-sm text-hier-text outline-none focus:border-hier-primary focus:bg-white"
                              disabled={!canManageSelected}
                            />
                            <input
                              value={contractTemplateName}
                              onChange={(event) =>
                                setContractTemplateName(event.target.value)
                              }
                              placeholder="Template name (optional)"
                              className="h-12 w-full rounded-2xl border border-hier-border bg-hier-panel px-4 text-sm text-hier-text outline-none focus:border-hier-primary focus:bg-white"
                              disabled={!canManageSelected}
                            />

                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => void handleCreateContract()}
                                disabled={
                                  !canManageSelected ||
                                  busyKey === "contract-create" ||
                                  !contractTitle.trim()
                                }
                                className="inline-flex h-11 items-center justify-center rounded-2xl bg-hier-primary px-4 text-sm font-semibold text-white shadow-card disabled:opacity-60"
                              >
                                {busyKey === "contract-create"
                                  ? "Creating…"
                                  : "Create contract"}
                              </button>

                              <label
                                className={`inline-flex items-center justify-center gap-2 rounded-2xl border border-hier-border bg-white px-4 text-sm font-semibold text-hier-ink ${
                                  canManageSelected
                                    ? "cursor-pointer"
                                    : "cursor-not-allowed opacity-60"
                                }`}
                              >
                                <Upload className="h-4 w-4" />
                                {busyKey === "contract-upload"
                                  ? "Uploading…"
                                  : "Upload contract"}
                                <input
                                  type="file"
                                  accept=".pdf,.doc,.docx"
                                  className="hidden"
                                  disabled={!canManageSelected}
                                  onChange={(event) => {
                                    const file = event.target.files?.[0];
                                    if (!file || !canManageSelected) return;
                                    void handleContractUpload(file);
                                    event.currentTarget.value = "";
                                  }}
                                />
                              </label>
                            </div>
                          </div>

                          <div className="mt-5 rounded-[20px] bg-hier-panel p-4">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-hier-muted">
                              Contracts
                            </p>
                            <p className="mt-2 text-2xl font-semibold text-hier-text">
                              {(selected.contracts || []).length}
                            </p>
                          </div>

                          {(selected.contracts || []).length > 0 ? (
                            <div className="mt-4 space-y-3">
                              {(selected.contracts || []).map(
                                (contract: BusinessOnboardingContract) => (
                                  <div
                                    key={contract.id}
                                    className="rounded-[20px] border border-hier-border bg-white p-4"
                                  >
                                    <div className="flex items-start justify-between gap-3">
                                      <div>
                                        <p className="text-sm font-semibold text-hier-text">
                                          {contract.title}
                                        </p>
                                        <p className="mt-1 text-xs text-hier-muted">
                                          {contract.template_name || "No template"}
                                        </p>
                                      </div>
                                      <span
                                        className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold ${documentTone(
                                          contract.status,
                                        )}`}
                                      >
                                        {formatLabel(contract.status)}
                                      </span>
                                    </div>

                                    <div className="mt-3 flex flex-wrap gap-2">
                                      {contract.status === "draft" ? (
                                        <button
                                          type="button"
                                          disabled={
                                            !canManageSelected ||
                                            busyKey === `contract-send-${contract.id}`
                                          }
                                          onClick={() =>
                                            void handleContractSend(contract.id)
                                          }
                                          className="inline-flex h-10 items-center gap-2 rounded-2xl border border-sky-200 bg-sky-50 px-4 text-sm font-medium text-sky-700 disabled:opacity-60"
                                        >
                                          <Send className="h-4 w-4" />
                                          Send contract
                                        </button>
                                      ) : null}
                                    </div>
                                  </div>
                                ),
                              )}
                            </div>
                          ) : null}
                        </section>

                        <section className="rounded-[28px] border border-hier-border bg-white p-6 shadow-card">
                          <div className="flex items-center gap-3">
                            <FileText className="h-5 w-5 text-hier-primary" />
                            <h3 className="text-xl font-semibold text-hier-text">
                              Add document record
                            </h3>
                          </div>

                          <div className="mt-5 space-y-3">
                            <input
                              value={documentTitle}
                              onChange={(event) => setDocumentTitle(event.target.value)}
                              placeholder="Passport copy / Signed contract / ID"
                              className="h-12 w-full rounded-2xl border border-hier-border bg-hier-panel px-4 text-sm text-hier-text outline-none focus:border-hier-primary focus:bg-white"
                              disabled={!canManageSelected}
                            />

                            <input
                              value={documentType}
                              onChange={(event) => setDocumentType(event.target.value)}
                              placeholder="document type"
                              className="h-12 w-full rounded-2xl border border-hier-border bg-hier-panel px-4 text-sm text-hier-text outline-none focus:border-hier-primary focus:bg-white"
                              disabled={!canManageSelected}
                            />

                            <select
                              value={documentTaskId}
                              onChange={(event) =>
                                setDocumentTaskId(
                                  event.target.value ? Number(event.target.value) : "",
                                )
                              }
                              disabled={!canManageSelected}
                              className="h-12 w-full rounded-2xl border border-hier-border bg-hier-panel px-4 text-sm text-hier-text outline-none focus:border-hier-primary focus:bg-white"
                            >
                              <option value="">No linked task</option>
                              {(selected.tasks || []).map((task) => (
                                <option key={task.id} value={task.id}>
                                  {task.title || formatLabel(task.task_key)}
                                </option>
                              ))}
                            </select>

                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => void handleCreateDocument()}
                                disabled={
                                  !canManageSelected ||
                                  busyKey === "document-create" ||
                                  !documentType.trim()
                                }
                                className="inline-flex h-11 items-center justify-center rounded-2xl border border-hier-border bg-white px-4 text-sm font-semibold text-hier-ink disabled:opacity-60"
                              >
                                {busyKey === "document-create" ? "Adding…" : "Add document"}
                              </button>

                              <label
                                className={`inline-flex items-center justify-center gap-2 rounded-2xl border border-hier-border bg-white px-4 text-sm font-semibold text-hier-ink ${
                                  canManageSelected
                                    ? "cursor-pointer"
                                    : "cursor-not-allowed opacity-60"
                                }`}
                              >
                                <Upload className="h-4 w-4" />
                                {busyKey === "document-upload" ? "Uploading…" : "Upload file"}
                                <input
                                  type="file"
                                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
                                  className="hidden"
                                  disabled={!canManageSelected}
                                  onChange={(event) => {
                                    const file = event.target.files?.[0];
                                    if (!file || !canManageSelected) return;
                                    void handleDocumentUpload(file);
                                    event.currentTarget.value = "";
                                  }}
                                />
                              </label>
                            </div>
                          </div>

                          <div className="mt-5 rounded-[20px] bg-hier-panel p-4">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-hier-muted">
                              Documents
                            </p>
                            <p className="mt-2 text-2xl font-semibold text-hier-text">
                              {(selected.documents || []).length}
                            </p>
                          </div>

                          {(selected.documents || []).length > 0 ? (
                            <div className="mt-4 space-y-3">
                              {(selected.documents || []).map(
                                (doc: BusinessOnboardingDocument) => (
                                  <div
                                    key={doc.id}
                                    className="rounded-[20px] border border-hier-border bg-white p-4"
                                  >
                                    <div className="flex items-start justify-between gap-3">
                                      <div>
                                        <p className="text-sm font-semibold text-hier-text">
                                          {doc.title ||
                                            doc.original_filename ||
                                            doc.document_type}
                                        </p>
                                        <p className="mt-1 text-xs text-hier-muted">
                                          {formatLabel(doc.document_type)}
                                        </p>
                                      </div>

                                      <div className="flex flex-col items-end gap-2">
                                        <span
                                          className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold ${documentTone(
                                            doc.delivery_status || "draft",
                                          )}`}
                                        >
                                          {formatLabel(doc.delivery_status || "draft")}
                                        </span>
                                        <span
                                          className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold ${documentTone(
                                            doc.review_status || "pending",
                                          )}`}
                                        >
                                          {formatLabel(doc.review_status || "pending")}
                                        </span>
                                      </div>
                                    </div>

                                    <div className="mt-3 flex flex-wrap gap-2">
                                      {(doc.delivery_status || "draft") === "draft" ? (
                                        <button
                                          type="button"
                                          disabled={
                                            !canManageSelected ||
                                            busyKey === `document-send-${doc.id}`
                                          }
                                          onClick={() =>
                                            void handleDocumentSend(doc.id)
                                          }
                                          className="inline-flex h-10 items-center gap-2 rounded-2xl border border-sky-200 bg-sky-50 px-4 text-sm font-medium text-sky-700 disabled:opacity-60"
                                        >
                                          <Send className="h-4 w-4" />
                                          Send document
                                        </button>
                                      ) : null}
                                    </div>
                                  </div>
                                ),
                              )}
                            </div>
                          ) : null}
                        </section>
                      </>
                    ) : (
                      <section className="rounded-[28px] border border-hier-border bg-white p-6 shadow-card">
                        <div className="flex items-center gap-3">
                          <Users className="h-5 w-5 text-hier-primary" />
                          <h3 className="text-xl font-semibold text-hier-text">
                            Employee record view
                          </h3>
                        </div>

                        <div className="mt-5 rounded-[22px] bg-hier-panel p-4">
                          <p className="text-sm font-semibold text-hier-text">
                            This journey is grouped in the employee records workspace.
                          </p>
                          <p className="mt-2 text-sm leading-6 text-hier-muted">
                            Keep using this view for promoted onboarding history and linked
                            documents until a dedicated employee records API is wired in.
                          </p>
                        </div>

                        <div className="mt-5 rounded-[20px] bg-hier-panel p-4">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-hier-muted">
                            Linked documents
                          </p>
                          <p className="mt-2 text-2xl font-semibold text-hier-text">
                            {(selected.documents || []).length}
                          </p>
                        </div>
                      </section>
                    )}

                    <section className="rounded-[28px] border border-hier-border bg-white p-6 shadow-card">
                      <div className="flex items-center gap-3">
                        <MapPin className="h-5 w-5 text-hier-primary" />
                        <h3 className="text-xl font-semibold text-hier-text">
                          Audit timeline
                        </h3>
                      </div>

                      <div className="mt-5 space-y-3">
                        {(selected.audit_events || []).length === 0 ? (
                          <div className="rounded-[20px] border border-dashed border-hier-border bg-hier-panel px-4 py-4 text-sm text-hier-muted">
                            No audit events yet.
                          </div>
                        ) : (
                          (selected.audit_events || []).slice(0, 8).map((event) => (
                            <div
                              key={event.id}
                              className="rounded-[20px] bg-hier-panel px-4 py-4"
                            >
                              <p className="text-sm font-semibold text-hier-text">
                                {formatLabel(event.event_type)}
                              </p>
                              <p className="mt-1 text-xs text-hier-muted">
                                {formatLabel(event.actor_type)}
                              </p>
                            </div>
                          ))
                        )}
                      </div>
                    </section>
                  </div>
                </div>
              </>
            ) : (
              <div className="rounded-[28px] border border-hier-border bg-white p-10 text-sm text-hier-muted shadow-card">
                {detailLoading ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading onboarding detail…
                  </span>
                ) : (
                  "Select an onboarding journey to view the workspace."
                )}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}