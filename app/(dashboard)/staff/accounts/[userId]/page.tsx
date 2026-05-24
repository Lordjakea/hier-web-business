"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  BriefcaseBusiness,
  CalendarClock,
  Check,
  CheckCircle2,
  KeyRound,
  Loader2,
  Mail,
  MessageSquarePlus,
  MonitorCog,
  Pencil,
  StickyNote,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { CallButton } from "@/components/crm/CallButton";
import { CallHistory } from "@/components/crm/CallHistory";
import { PageHeader } from "@/components/ui/page-header";
import {
  createStaffSupportSession,
  createStaffAccountNote,
  createStaffBillingCheckout,
  createStaffBillingCredit,
  createStaffBillingPortal,
  createStaffCase,
  createStaffFollowUp,
  deleteStaffAccount,
  fetchStaffAssignees,
  fetchStaffAccountBilling,
  fetchStaffAccountDetail,
  fetchStaffCases,
  fetchStaffFollowUps,
  markStaffAccountEmailVerified,
  resendStaffAccountVerificationEmail,
  resumeStaffBillingSubscription,
  sendStaffAccountPasswordReset,
  previewStaffBillingChange,
  updateStaffFollowUp,
  updateStaffAccountBilling,
  updateStaffAccountIdentity,
  updateStaffBusinessProfile,
  verifyStaffAccountEmailCode,
  type StaffAccountDetail,
  type StaffBilling,
  type StaffBillingPreview,
  type StaffBillingPlan,
  type StaffCase,
  type StaffFollowUp,
  type StaffTeamUser,
} from "@/lib/staff-crm";
import { getAuthToken, getStoredUser, setAuthToken, setStoredUser } from "@/lib/auth";
import { formatCurrency } from "@/lib/currency";

function formatDate(value?: string | null) {
  if (!value) return "—";

  try {
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return "—";
  }
}

function displayValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

function formatMoneyFromMinor(value?: number | null, currency?: string | null) {
  if (value === null || value === undefined) return "-";
  return formatCurrency(value, { currency, minorUnits: true });
}

function formatMonthlyPrice(amount?: number | null, currency?: string | null) {
  if (!amount && amount !== 0) return "";
  return formatCurrency(amount, {
    currency,
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  });
}

function InfoCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[32px] border border-hier-border bg-white p-5 shadow-card sm:p-6">
      <h2 className="text-base font-semibold text-hier-text">{title}</h2>
      <div className="mt-5 space-y-3">{children}</div>
    </section>
  );
}

function DetailRow({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="flex flex-col gap-1 border-b border-hier-border/70 pb-3 last:border-b-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between">
      <p className="text-sm font-medium text-hier-muted">{label}</p>
      <p className="max-w-xl text-sm font-medium text-hier-text sm:text-right">
        {displayValue(value)}
      </p>
    </div>
  );
}

function EditableBusinessRow({
  label,
  field,
  value,
  editingField,
  editingValue,
  editingBooleanValue,
  editingReason,
  saving,
  onStart,
  onChangeValue,
  onChangeBoolean,
  onChangeReason,
  onCancel,
  onSave,
}: {
  label: string;
  field: string;
  value: unknown;
  editingField: string | null;
  editingValue: string;
  editingBooleanValue: boolean;
  editingReason: string;
  saving: boolean;
  onStart: (field: string, value: unknown) => void;
  onChangeValue: (value: string) => void;
  onChangeBoolean: (value: boolean) => void;
  onChangeReason: (value: string) => void;
  onCancel: () => void;
  onSave: (field: string) => void;
}) {
  const isEditing = editingField === field;
  const isBoolean = typeof value === "boolean";

  if (!isEditing) {
    return (
      <div className="flex flex-col gap-2 border-b border-hier-border/70 pb-3 last:border-b-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between">
        <p className="text-sm font-medium text-hier-muted">{label}</p>

        <div className="flex items-center gap-2 sm:justify-end">
          <p className="max-w-xl text-sm font-medium text-hier-text sm:text-right">
            {displayValue(value)}
          </p>

          <button
            type="button"
            onClick={() => onStart(field, value)}
            className="rounded-xl border border-hier-border bg-white p-1.5 text-hier-muted transition hover:bg-hier-soft hover:text-hier-text"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 border-b border-hier-border/70 pb-4 last:border-b-0 last:pb-0">
      <p className="text-sm font-semibold text-hier-text">{label}</p>

      {isBoolean ? (
        <label className="flex items-center gap-3 rounded-[18px] border border-hier-border bg-hier-panel p-3 text-sm font-semibold text-hier-text">
          <input
            type="checkbox"
            checked={editingBooleanValue}
            onChange={(event) => onChangeBoolean(event.target.checked)}
            className="h-4 w-4"
          />
          Verified
        </label>
      ) : field === "bio" || field === "address_text" ? (
        <textarea
          value={editingValue}
          onChange={(event) => onChangeValue(event.target.value)}
          rows={field === "bio" ? 4 : 3}
          className="w-full resize-none rounded-[18px] border border-hier-border bg-hier-panel p-4 text-sm text-hier-text outline-none transition focus:border-hier-primary focus:bg-white"
        />
      ) : (
        <input
          value={editingValue}
          onChange={(event) => onChangeValue(event.target.value)}
          className="h-11 w-full rounded-[18px] border border-hier-border bg-hier-panel px-4 text-sm text-hier-text outline-none transition focus:border-hier-primary focus:bg-white"
        />
      )}

      <textarea
        value={editingReason}
        onChange={(event) => onChangeReason(event.target.value)}
        rows={3}
        placeholder="Reason required..."
        className="w-full resize-none rounded-[18px] border border-hier-border bg-white p-4 text-sm text-hier-text outline-none transition focus:border-hier-primary"
      />

      <div className="flex gap-2">
        <button
          type="button"
          disabled={saving || editingReason.trim().length < 5}
          onClick={() => onSave(field)}
          className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-[16px] bg-hier-primary px-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Check className="h-4 w-4" />
          )}
          Save
        </button>

        <button
          type="button"
          disabled={saving}
          onClick={onCancel}
          className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-[16px] border border-hier-border bg-white px-3 text-sm font-semibold text-hier-text disabled:cursor-not-allowed disabled:opacity-50"
        >
          <X className="h-4 w-4" />
          Cancel
        </button>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="rounded-[28px] border border-hier-border bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-hier-muted">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-hier-text">
        {displayValue(value)}
      </p>
    </div>
  );
}

export default function StaffAccountDetailPage() {
  const params = useParams<{ userId: string }>();
  const router = useRouter();
  const userId = Number(params.userId);

  const [account, setAccount] = useState<StaffAccountDetail | null>(null);
  const [billing, setBilling] = useState<StaffBilling | null>(null);
  const [billingPlans, setBillingPlans] = useState<StaffBillingPlan[]>([]);
  const [selectedBillingPlan, setSelectedBillingPlan] = useState("");
  const [billingAction, setBillingAction] = useState<"checkout" | "portal" | "resume" | null>(null);
  const [billingPreview, setBillingPreview] = useState<StaffBillingPreview | null>(null);
  const [previewingBilling, setPreviewingBilling] = useState(false);
  const [extraBoostForm, setExtraBoostForm] = useState({
    paid_boost_credits: "0",
    reason: "",
  });
  const [savingExtraBoost, setSavingExtraBoost] = useState(false);
  const [goodwillCreditForm, setGoodwillCreditForm] = useState({
    amount: "",
    reason: "",
  });
  const [savingGoodwillCredit, setSavingGoodwillCredit] = useState(false);
  const [candidateFeeForm, setCandidateFeeForm] = useState({
    candidate_fee_percent: "2.5",
    reason: "",
  });
  const [savingCandidateFee, setSavingCandidateFee] = useState(false);
  const [followUps, setFollowUps] = useState<StaffFollowUp[]>([]);
  const [staffUsers, setStaffUsers] = useState<StaffTeamUser[]>([]);
  const [savingFollowUp, setSavingFollowUp] = useState(false);
  const [followUpForm, setFollowUpForm] = useState({
    title: "Customer call back",
    due_at: "",
    note: "",
    assigned_staff_user_id: "",
  });
  const [cases, setCases] = useState<StaffCase[]>([]);
  const [savingCase, setSavingCase] = useState(false);
  const [caseForm, setCaseForm] = useState({
    title: "",
    summary: "",
    owner_staff_user_id: "",
  });

  const [loading, setLoading] = useState(true);
  const [savingNote, setSavingNote] = useState(false);
  const [note, setNote] = useState("");
  const [mentionedStaffUserIds, setMentionedStaffUserIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [identityEmail, setIdentityEmail] = useState("");
  const [identityPhone, setIdentityPhone] = useState("");
  const [identityFullName, setIdentityFullName] = useState("");
  const [identityMarketingOptIn, setIdentityMarketingOptIn] = useState(false);
  const [identityReason, setIdentityReason] = useState("");
  const [savingIdentity, setSavingIdentity] = useState(false);
  const [markingVerified, setMarkingVerified] = useState(false);
  const [resendingVerification, setResendingVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [sendingPasswordReset, setSendingPasswordReset] = useState(false);
  const [startingSupportPath, setStartingSupportPath] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");
  const [deleteConfirmed, setDeleteConfirmed] = useState(false);
  const [cancelStripeOnDelete, setCancelStripeOnDelete] = useState(true);
  const [deletingAccount, setDeletingAccount] = useState(false);

  const [editingField, setEditingField] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [editingBooleanValue, setEditingBooleanValue] = useState(false);
  const [editingReason, setEditingReason] = useState("");
  const [savingInlineEdit, setSavingInlineEdit] = useState(false);

  const loadAccount = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetchStaffAccountDetail(userId);
      setAccount(response.account);
      setIdentityEmail(response.account.basic?.email || "");
      setIdentityPhone(response.account.basic?.phone || "");
      setIdentityFullName(response.account.basic?.full_name || "");
      setIdentityMarketingOptIn(Boolean(response.account.basic?.marketing_opt_in));
      setIdentityReason("");
      const assigneesResponse = await fetchStaffAssignees();
      setStaffUsers(assigneesResponse.staff || []);

      const followUpResponse = await fetchStaffFollowUps({
        entity_type: "account",
        entity_id: userId,
      });
      setFollowUps(followUpResponse.items || []);

      const casesResponse = await fetchStaffCases({ account_user_id: userId });
      setCases(casesResponse.items || []);

      if (response.account.account_type === "business") {
        const billingResponse = await fetchStaffAccountBilling(userId);

        setBilling(billingResponse.billing);
        setBillingPlans(billingResponse.plans || []);
        setSelectedBillingPlan(billingResponse.billing.plan_code || "");
        setBillingPreview(null);
        setExtraBoostForm({
          paid_boost_credits: String(billingResponse.billing.paid_boost_credits ?? 0),
          reason: "",
        });
        setCandidateFeeForm({
          candidate_fee_percent: String(billingResponse.billing.candidate_fee_percent ?? 2.5),
          reason: "",
        });

      } else {
        setBilling(null);
        setBillingPlans([]);
        setSelectedBillingPlan("");
        setBillingPreview(null);
      }
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not load staff account detail."
      );
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void loadAccount();
  }, [loadAccount]);

  useEffect(() => {
    if (!account?.basic?.id || account.account_type !== "business") return;

    window.sessionStorage.setItem("hier_staff_selected_account_id", String(account.basic.id));
    window.sessionStorage.setItem(
      "hier_staff_selected_account_name",
      account.business_profile?.company_name ||
        account.basic.full_name ||
        account.basic.email ||
        `Account #${account.basic.id}`
    );
  }, [account]);

  async function handleCreateNote(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmed = note.trim();
    if (!trimmed || !userId) return;

    setSavingNote(true);
    setError(null);

    try {
      const response = await createStaffAccountNote(userId, trimmed, mentionedStaffUserIds);

      setAccount((current) =>
        current
          ? {
              ...current,
              notes: [response.note, ...(current.notes || [])],
            }
          : current
      );

      setNote("");
      setMentionedStaffUserIds([]);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not save internal note."
      );
    } finally {
      setSavingNote(false);
    }
  }

  async function handleUpdateIdentity(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!userId) return;

    const reason = identityReason.trim();

    if (reason.length < 5) {
      setError("Please enter a reason of at least 5 characters.");
      return;
    }

    setSavingIdentity(true);
    setError(null);
    setActionMessage(null);

    try {
      const response = await updateStaffAccountIdentity(userId, {
        email: identityEmail,
        phone: identityPhone,
        full_name: identityFullName,
        marketing_opt_in: identityMarketingOptIn,
        reason,
      });

      setAccount((current) =>
        current
          ? {
              ...current,
              basic: response.account,
            }
          : current
      );

      setIdentityReason("");
      await loadAccount();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not update account identity."
      );
    } finally {
      setSavingIdentity(false);
    }
  }

  async function handleMarkEmailVerified() {
    if (!userId) return;

    const reason = identityReason.trim();

    if (reason.length < 5) {
      setError("Please enter a reason of at least 5 characters first.");
      return;
    }

    setMarkingVerified(true);
    setError(null);
    setActionMessage(null);

    try {
      const response = await markStaffAccountEmailVerified(userId, reason);

      setAccount((current) =>
        current
          ? {
              ...current,
              basic: response.account,
            }
          : current
      );

      setIdentityReason("");
      await loadAccount();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not mark email as verified."
      );
    } finally {
      setMarkingVerified(false);
    }
  }

  async function handleResendVerificationEmail() {
    if (!userId) return;

    const reason =
      identityReason.trim() || "Staff resent account verification code from CRM.";

    setResendingVerification(true);
    setError(null);
    setActionMessage(null);

    try {
      await resendStaffAccountVerificationEmail(userId, reason);
      setActionMessage("Account verification code sent.");
      setIdentityReason("");
      await loadAccount();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not resend verification email."
      );
    } finally {
      setResendingVerification(false);
    }
  }

  async function handleSendPasswordReset() {
    if (!userId) return;

    const reason =
      identityReason.trim() || "Staff sent password reset request from CRM.";

    setSendingPasswordReset(true);
    setError(null);
    setActionMessage(null);

    try {
      await sendStaffAccountPasswordReset(userId, reason, account?.basic?.email);
      setActionMessage("Password reset request sent.");
      setIdentityReason("");
      await loadAccount();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not send password reset request."
      );
    } finally {
      setSendingPasswordReset(false);
    }
  }

  async function handleStartSupportAccess(path: string) {
    if (!userId) return;

    setStartingSupportPath(path);
    setError(null);
    setActionMessage(null);

    try {
      const staffToken = getAuthToken();
      const staffUser = getStoredUser();

      if (staffToken) window.sessionStorage.setItem("hier_staff_return_token", staffToken);
      if (staffUser) window.sessionStorage.setItem("hier_staff_return_user", JSON.stringify(staffUser));
      window.sessionStorage.setItem("hier_staff_return_account_id", String(userId));

      const response = await createStaffSupportSession(userId);
      setAuthToken(response.access_token);
      setStoredUser(response.user);
      router.push(path);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not start support access."
      );
    } finally {
      setStartingSupportPath(null);
    }
  }

  async function handleDeleteAccount() {
    if (!userId) return;

    const reason = deleteReason.trim();

    if (reason.length < 10) {
      setError("Please enter a deletion reason of at least 10 characters.");
      return;
    }

    setDeletingAccount(true);
    setError(null);
    setActionMessage(null);

    try {
      await deleteStaffAccount(userId, reason, {
        confirm_delete: deleteConfirmed,
        cancel_stripe_subscription: cancelStripeOnDelete,
      });
      router.push("/staff");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not delete this account."
      );
    } finally {
      setDeletingAccount(false);
    }
  }

  function startInlineEdit(field: string, value: unknown) {
    setEditingField(field);
    setEditingReason("");

    if (typeof value === "boolean") {
      setEditingBooleanValue(value);
      setEditingValue("");
    } else {
      setEditingValue(value === null || value === undefined ? "" : String(value));
      setEditingBooleanValue(false);
    }
  }

  function cancelInlineEdit() {
    setEditingField(null);
    setEditingValue("");
    setEditingBooleanValue(false);
    setEditingReason("");
  }

  async function handleSaveBusinessProfileField(field: string) {
    if (!userId) return;

    const reason = editingReason.trim();

    if (reason.length < 5) {
      setError("Please enter a reason of at least 5 characters.");
      return;
    }

    setSavingInlineEdit(true);
    setError(null);

    try {
      const payload: Record<string, any> = { reason };

      if (field === "verified") {
        payload[field] = editingBooleanValue;
      } else {
        payload[field] = editingValue;
      }

      const response = await updateStaffBusinessProfile(userId, payload as any);

      setAccount((current) =>
        current
          ? {
              ...current,
              business_profile: response.business_profile,
            }
          : current
      );

      cancelInlineEdit();
      await loadAccount();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not update business profile field."
      );
    } finally {
      setSavingInlineEdit(false);
    }
  }

  async function handleVerifyEmailCode() {
    if (!userId) return;

    const code = verificationCode.trim();
    const reason =
      identityReason.trim() || "Staff entered customer verification code in CRM.";

    if (!code) {
      setError("Please enter the verification code from the customer.");
      return;
    }

    setVerifyingCode(true);
    setError(null);
    setActionMessage(null);

    try {
      const response = await verifyStaffAccountEmailCode(userId, code, reason);
      setAccount((current) =>
        current
          ? {
              ...current,
              basic: response.account,
            }
          : current
      );
      setVerificationCode("");
      setIdentityReason("");
      setActionMessage("Email verified and temporary password sent to the customer.");
      await loadAccount();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not verify this code."
      );
    } finally {
      setVerifyingCode(false);
    }
  }

  async function handleOpenBillingCheckout() {
    if (!userId || !selectedBillingPlan) return;

    setBillingAction("checkout");
    setError(null);

    try {
      const response = await createStaffBillingCheckout(userId, selectedBillingPlan);
      if (response.billing) setBilling(response.billing);
      if (response.checkout_url) window.open(response.checkout_url, "_blank", "noopener,noreferrer");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not open Stripe checkout."
      );
    } finally {
      setBillingAction(null);
    }
  }

  async function handleOpenBillingPortal() {
    if (!userId) return;

    setBillingAction("portal");
    setError(null);

    try {
      const response = await createStaffBillingPortal(userId);
      if (response.billing) setBilling(response.billing);
      if (response.portal_url) window.open(response.portal_url, "_blank", "noopener,noreferrer");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not open Stripe billing portal."
      );
    } finally {
      setBillingAction(null);
    }
  }

  async function handleResumeBillingSubscription() {
    if (!userId) return;

    setBillingAction("resume");
    setError(null);
    setActionMessage(null);

    try {
      const response = await resumeStaffBillingSubscription(userId);
      if (response.billing) setBilling(response.billing);
      setActionMessage(response.message || "Subscription will continue renewing.");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not resume the Stripe subscription."
      );
    } finally {
      setBillingAction(null);
    }
  }

  async function handlePreviewBillingChange() {
    if (!userId || !selectedBillingPlan) return;

    setPreviewingBilling(true);
    setError(null);

    try {
      const response = await previewStaffBillingChange(userId, selectedBillingPlan);
      setBillingPreview(response);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not preview Stripe billing change."
      );
    } finally {
      setPreviewingBilling(false);
    }
  }

  async function handleSaveExtraBoostCredits(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!userId) return;

    const reason = extraBoostForm.reason.trim();
    if (reason.length < 10) {
      setError("Please enter a reason of at least 10 characters.");
      return;
    }

    setSavingExtraBoost(true);
    setError(null);

    try {
      const response = await updateStaffAccountBilling(userId, {
        paid_boost_credits: Number(extraBoostForm.paid_boost_credits || 0),
        reason,
      });
      setBilling(response.billing);
      setExtraBoostForm((current) => ({ ...current, reason: "" }));
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not update extra boost credits."
      );
    } finally {
      setSavingExtraBoost(false);
    }
  }

  async function handleSaveCandidateFee(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!userId) return;

    const reason = candidateFeeForm.reason.trim();
    const candidateFeePercent = Number(candidateFeeForm.candidate_fee_percent || 0);

    if (Number.isNaN(candidateFeePercent) || candidateFeePercent < 0 || candidateFeePercent > 100) {
      setError("Candidate fee must be a percentage between 0 and 100.");
      return;
    }
    if (reason.length < 10) {
      setError("Please enter a candidate fee change reason of at least 10 characters.");
      return;
    }

    setSavingCandidateFee(true);
    setError(null);

    try {
      const response = await updateStaffAccountBilling(userId, {
        candidate_fee_percent: candidateFeePercent,
        reason,
      });
      setBilling(response.billing);
      setCandidateFeeForm({
        candidate_fee_percent: String(response.billing.candidate_fee_percent ?? candidateFeePercent),
        reason: "",
      });
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not update candidate fee."
      );
    } finally {
      setSavingCandidateFee(false);
    }
  }

  async function handleCreateGoodwillCredit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!userId) return;

    const reason = goodwillCreditForm.reason.trim();
    const amount = Number(goodwillCreditForm.amount || 0);
    if (!amount || amount <= 0) {
      setError("Please enter a goodwill credit amount above zero.");
      return;
    }
    if (reason.length < 10) {
      setError("Please enter a goodwill credit reason of at least 10 characters.");
      return;
    }

    setSavingGoodwillCredit(true);
    setError(null);

    try {
      const response = await createStaffBillingCredit(userId, {
        amount,
        currency: "gbp",
        reason,
      });
      if (response.billing) setBilling(response.billing);
      setGoodwillCreditForm({ amount: "", reason: "" });
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not create Stripe goodwill credit."
      );
    } finally {
      setSavingGoodwillCredit(false);
    }
  }

  async function handleCreateAccountFollowUp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!userId || !followUpForm.title.trim() || !followUpForm.due_at) return;

    setSavingFollowUp(true);
    setError(null);

    try {
      const response = await createStaffFollowUp({
        entity_type: "account",
        entity_id: userId,
        title: followUpForm.title.trim(),
        due_at: new Date(followUpForm.due_at).toISOString(),
        note: followUpForm.note.trim() || null,
        assigned_staff_user_id: followUpForm.assigned_staff_user_id || null,
      });
      setFollowUps((current) => [response.follow_up, ...current]);
      setFollowUpForm({ title: "Customer call back", due_at: "", note: "", assigned_staff_user_id: "" });
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not schedule account follow-up."
      );
    } finally {
      setSavingFollowUp(false);
    }
  }

  async function handleCreateCase(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!userId || !caseForm.title.trim()) return;

    setSavingCase(true);
    setError(null);

    try {
      const response = await createStaffCase({
        account_user_id: userId,
        title: caseForm.title.trim(),
        summary: caseForm.summary.trim() || null,
        owner_staff_user_id: caseForm.owner_staff_user_id || null,
      });
      setCases((current) => [response.case, ...current]);
      setCaseForm({ title: "", summary: "", owner_staff_user_id: "" });
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not create case."
      );
    } finally {
      setSavingCase(false);
    }
  }

  async function handleCompleteAccountFollowUp(followUpId: number) {
    setSavingFollowUp(true);
    setError(null);

    try {
      const response = await updateStaffFollowUp(followUpId, { status: "completed" });
      setFollowUps((current) =>
        current.map((item) => (item.id === followUpId ? response.follow_up : item))
      );
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not complete follow-up."
      );
    } finally {
      setSavingFollowUp(false);
    }
  }

  const title = useMemo(() => {
    if (!account?.basic) return "Account detail";

    return (
      account.business_profile?.company_name ||
      account.basic.full_name ||
      account.basic.email ||
      `User #${account.basic.id}`
    );
  }, [account]);
  const billingProvider = String(
    billing?.billing_provider || billing?.subscription?.provider || ""
  ).toLowerCase();
  const isAppleManagedBilling = billingProvider === "apple";
  const canUseStripeBilling =
    Boolean(billing) &&
    !isAppleManagedBilling &&
    billing?.stripe_management_available !== false;
  const canResumeStripeSubscription =
    canUseStripeBilling &&
    Boolean(billing?.subscription?.provider_subscription_id) &&
    Boolean(billing?.subscription_cancel_at_period_end);
  const isEndedStripeSubscription =
    canUseStripeBilling &&
    String(billing?.subscription_status || "").toLowerCase() === "canceled";

  if (loading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center rounded-[32px] border border-hier-border bg-white">
        <Loader2 className="h-7 w-7 animate-spin text-hier-primary" />
      </div>
    );
  }

  if (!account) {
    return (
      <div className="space-y-6">
        <Link
          href="/staff"
          className="inline-flex items-center gap-2 text-sm font-medium text-hier-muted hover:text-hier-text"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Staff CRM
        </Link>

        <div className="rounded-[32px] border border-red-200 bg-red-50 p-6 text-red-800">
          {error || "Account not found."}
        </div>
      </div>
    );
  }

  const Icon =
    account.account_type === "business" ? BriefcaseBusiness : UserRound;

  const requiresStripeCancellationOnDelete =
    account.account_type === "business" && !isAppleManagedBilling;
  const recentApplications = account.recent_applications || [];

  const businessProfileRows: Array<[string, string, unknown]> = [
    ["Company", "company_name", account.business_profile?.company_name],
    ["Company number", "company_number", account.business_profile?.company_number],
    ["Contact email", "contact_email", account.business_profile?.contact_email],
    ["Contact phone", "contact_phone", account.business_profile?.contact_phone],
    ["Address", "address_text", account.business_profile?.address_text],
    ["Verified", "verified", Boolean(account.business_profile?.verified)],
    ["Bio", "bio", account.business_profile?.bio],
  ];

  return (
    <div className="space-y-8">
      <Link
        href="/staff"
        className="inline-flex items-center gap-2 text-sm font-medium text-hier-muted hover:text-hier-text"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Staff CRM
      </Link>

      <PageHeader
        eyebrow="Staff account view"
        title={title}
        description="View account information, recent account context and internal support notes."
        action={
          <div className="inline-flex items-center gap-2 rounded-full border border-hier-border bg-white px-4 py-2 text-sm font-semibold text-hier-text shadow-sm">
            <Icon className="h-4 w-4 text-hier-primary" />
            {account.account_type === "business" ? "Business" : "Candidate"}
          </div>
        }
      />

      {error ? (
        <div className="flex items-start gap-3 rounded-[24px] border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <p>{error}</p>
        </div>
      ) : null}

      {actionMessage ? (
        <div className="flex items-start gap-3 rounded-[24px] border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
          <p>{actionMessage}</p>
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Applications"
          value={account.metrics?.applications_total ?? 0}
        />
        <StatCard label="Live posts" value={account.metrics?.live_posts ?? 0} />
        <StatCard
          label="Total posts"
          value={account.metrics?.total_posts ?? 0}
        />
        <StatCard
          label="Account status"
          value={account.basic?.is_active ? "Active" : "Inactive"}
        />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <div className="space-y-6">
          <InfoCard title="User account">
            <CallButton phoneNumber={account.basic?.phone || account.business_profile?.contact_phone} />
            <DetailRow label="User ID" value={account.basic?.id} />
            <DetailRow label="Email" value={account.basic?.email} />
            <DetailRow label="Phone" value={account.basic?.phone} />
            <DetailRow label="Full name" value={account.basic?.full_name} />
            <DetailRow label="Role" value={account.basic?.role} />
            <DetailRow
              label="Email verified"
              value={account.basic?.email_verified}
            />
            <DetailRow
              label="Phone verified"
              value={account.basic?.phone_verified}
            />
            <DetailRow
              label="Marketing opt-in"
              value={account.basic?.marketing_opt_in}
            />
            <DetailRow
              label="Marketing opt-in date"
              value={formatDate(account.basic?.marketing_opt_in_at)}
            />
            <DetailRow
              label="Created"
              value={formatDate(account.basic?.created_at)}
            />
            <DetailRow
              label="Updated"
              value={formatDate(account.basic?.updated_at)}
            />
          </InfoCard>

          {account.account_type === "business" ? (
            <InfoCard title="Business profile">
              {businessProfileRows.map(([label, field, value]) => (
                <EditableBusinessRow
                  key={field}
                  label={label}
                  field={field}
                  value={value}
                  editingField={editingField}
                  editingValue={editingValue}
                  editingBooleanValue={editingBooleanValue}
                  editingReason={editingReason}
                  saving={savingInlineEdit}
                  onStart={startInlineEdit}
                  onChangeValue={setEditingValue}
                  onChangeBoolean={setEditingBooleanValue}
                  onChangeReason={setEditingReason}
                  onCancel={cancelInlineEdit}
                  onSave={handleSaveBusinessProfileField}
                />
              ))}
            </InfoCard>
          ) : (
            <InfoCard title="Candidate profile">
              <DetailRow
                label="First name"
                value={account.user_profile?.first_name}
              />
              <DetailRow
                label="Last name"
                value={account.user_profile?.last_name}
              />
              <DetailRow
                label="Headline"
                value={account.user_profile?.headline}
              />
              <DetailRow
                label="Summary"
                value={account.user_profile?.about || account.user_profile?.summary}
              />
              <DetailRow
                label="Location"
                value={
                  account.user_profile?.address_text ||
                  account.user_profile?.location
                }
              />
              <DetailRow
                label="Contact number"
                value={account.user_profile?.contact_number}
              />
              <DetailRow
                label="CV filename"
                value={account.user_profile?.cv_filename}
              />
              <DetailRow
                label="CV uploaded"
                value={formatDate(account.user_profile?.cv_uploaded_at)}
              />
            </InfoCard>
          )}

          {account.account_type === "business" ? (
            <InfoCard title="Billing controls">
              {billing ? (
                <div className="space-y-4">
                  <DetailRow
                    label="Stripe customer"
                    value={billing.stripe_customer_id}
                  />
                  <DetailRow
                    label="Candidate fee"
                    value={`${billing.candidate_fee_percent ?? 2.5}%`}
                  />
                  <DetailRow
                    label="Billing provider"
                    value={billingProvider || "Not set"}
                  />
                  <DetailRow
                    label="Subscription status"
                    value={billing.subscription_status}
                  />
                  <DetailRow
                    label="Current period end"
                    value={formatDate(billing.subscription_current_period_end)}
                  />
                  <DetailRow
                    label="Cancel at period end"
                    value={billing.subscription_cancel_at_period_end}
                  />

                  {isAppleManagedBilling ? (
                    <div className="rounded-[22px] border border-amber-200 bg-amber-50 p-4">
                      <p className="text-sm font-semibold text-amber-950">
                        Apple-managed subscription
                      </p>
                      <p className="mt-2 text-sm leading-6 text-amber-800">
                        This customer subscribed through Apple in-app purchase. Stripe
                        checkout and portal controls are unavailable here; billing changes
                        need to be handled through Apple subscriptions.
                      </p>
                    </div>
                  ) : null}

                  {canResumeStripeSubscription ? (
                    <div className="rounded-[22px] border border-emerald-200 bg-emerald-50 p-4">
                      <p className="text-sm font-semibold text-emerald-950">
                        Cancellation scheduled
                      </p>
                      <p className="mt-2 text-sm leading-6 text-emerald-800">
                        This Stripe subscription is due to stop at the end of the current
                        billing period. Resume it if the customer has changed their mind.
                      </p>
                      <button
                        type="button"
                        onClick={() => void handleResumeBillingSubscription()}
                        disabled={billingAction !== null}
                        className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-[18px] bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {billingAction === "resume" ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : null}
                        Resume Stripe subscription
                      </button>
                    </div>
                  ) : null}

                  {isEndedStripeSubscription ? (
                    <div className="rounded-[22px] border border-hier-border bg-hier-panel p-4">
                      <p className="text-sm font-semibold text-hier-text">
                        Subscription has ended
                      </p>
                      <p className="mt-2 text-sm leading-6 text-hier-muted">
                        Stripe subscriptions that have fully ended need a new checkout link.
                      </p>
                    </div>
                  ) : null}

                  <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto] lg:items-end">
                    <div>
                      <label className="text-xs font-semibold text-hier-muted">
                        New plan
                      </label>
                      <select
                        value={selectedBillingPlan}
                        onChange={(event) => {
                          setSelectedBillingPlan(event.target.value);
                          setBillingPreview(null);
                        }}
                        className="mt-1 h-11 w-full rounded-[18px] border border-hier-border bg-hier-panel px-4 text-sm text-hier-text outline-none focus:border-hier-primary focus:bg-white"
                      >
                        {billingPlans.map((plan) => (
                          <option key={plan.code} value={plan.code}>
                            {plan.name || plan.code}
                            {plan.price_monthly ? ` - ${formatMonthlyPrice(plan.price_monthly, plan.currency)}/mo` : ""}
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={() => void handlePreviewBillingChange()}
                      disabled={
                        previewingBilling ||
                        !canUseStripeBilling ||
                        !selectedBillingPlan ||
                        selectedBillingPlan === "starter"
                      }
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-[18px] border border-hier-border bg-white px-4 text-sm font-semibold text-hier-text disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {previewingBilling ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : null}
                      Preview proration
                    </button>

                    <button
                      type="button"
                      onClick={() => void handleOpenBillingCheckout()}
                      disabled={
                        billingAction !== null ||
                        !canUseStripeBilling ||
                        !selectedBillingPlan ||
                        selectedBillingPlan === "starter"
                      }
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-[18px] bg-hier-primary px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {billingAction === "checkout" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : null}
                      Open Stripe checkout
                    </button>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => void handleOpenBillingPortal()}
                      disabled={billingAction !== null || !canUseStripeBilling}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-[18px] border border-hier-border bg-white px-4 text-sm font-semibold text-hier-text disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {billingAction === "portal" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : null}
                      Manage in Stripe
                    </button>
                  </div>

                  {billingPreview ? (
                    <div className="rounded-[22px] border border-hier-border bg-hier-panel p-4">
                      <p className="text-sm font-semibold text-hier-text">
                        Pro-rata preview
                      </p>
                      <div className="mt-3 grid gap-3 sm:grid-cols-3">
                        <div className="rounded-[16px] bg-white p-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-hier-muted">
                            Mode
                          </p>
                          <p className="mt-1 text-sm font-semibold text-hier-text">
                            {billingPreview.mode}
                          </p>
                        </div>
                        <div className="rounded-[16px] bg-white p-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-hier-muted">
                            Due now
                          </p>
                          <p className="mt-1 text-sm font-semibold text-hier-text">
                            {formatMoneyFromMinor(
                              billingPreview.amount_due_now,
                              billingPreview.currency
                            )}
                          </p>
                        </div>
                        <div className="rounded-[16px] bg-white p-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-hier-muted">
                            Direction
                          </p>
                          <p className="mt-1 text-sm font-semibold text-hier-text">
                            {billingPreview.direction || "-"}
                          </p>
                        </div>
                      </div>
                      {billingPreview.message ? (
                        <p className="mt-3 text-sm text-hier-muted">
                          {billingPreview.message}
                        </p>
                      ) : null}
                      {billingPreview.lines?.length ? (
                        <div className="mt-3 space-y-2">
                          {billingPreview.lines.slice(0, 4).map((line, index) => (
                            <div
                              key={line.id || index}
                              className="flex items-start justify-between gap-3 rounded-[16px] bg-white p-3 text-sm"
                            >
                              <div>
                                <p className="font-semibold text-hier-text">
                                  {line.description || "Stripe line item"}
                                </p>
                                {line.proration ? (
                                  <p className="mt-1 text-xs font-semibold text-hier-primary">
                                    Proration
                                  </p>
                                ) : null}
                              </div>
                              <p className="font-semibold text-hier-text">
                                {formatMoneyFromMinor(line.amount, line.currency || billingPreview.currency)}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  <div className="rounded-[22px] border border-hier-border bg-hier-panel p-4">
                    <p className="text-sm font-semibold text-hier-text">
                      Credit remaining
                    </p>
                    <p className="mt-2 text-sm text-hier-muted">
                      Monthly: {billing.monthly_boost_credits_remaining ?? 0} /
                      Extra: {billing.paid_boost_credits_remaining ?? 0}
                    </p>
                  </div>

                  <form
                    className="rounded-[22px] border border-hier-border bg-hier-panel p-4"
                    onSubmit={handleSaveCandidateFee}
                  >
                    <p className="text-sm font-semibold text-hier-text">
                      Candidate fee
                    </p>
                    <p className="mt-2 text-sm text-hier-muted">
                      Default is 2.5%. This percentage is used when started candidates are completed.
                    </p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-[160px_1fr]">
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          value={candidateFeeForm.candidate_fee_percent}
                          onChange={(event) =>
                            setCandidateFeeForm((current) => ({
                              ...current,
                              candidate_fee_percent: event.target.value,
                            }))
                          }
                          className="h-11 w-full rounded-[18px] border border-hier-border bg-white px-4 pr-9 text-sm outline-none focus:border-hier-primary"
                        />
                        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-hier-muted">
                          %
                        </span>
                      </div>
                      <input
                        value={candidateFeeForm.reason}
                        onChange={(event) =>
                          setCandidateFeeForm((current) => ({
                            ...current,
                            reason: event.target.value,
                          }))
                        }
                        placeholder="Reason for changing candidate fee"
                        className="h-11 rounded-[18px] border border-hier-border bg-white px-4 text-sm outline-none focus:border-hier-primary"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={savingCandidateFee || candidateFeeForm.reason.trim().length < 10}
                      className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-[18px] bg-hier-primary px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {savingCandidateFee ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      Save candidate fee
                    </button>
                  </form>

                  <form
                    className="rounded-[22px] border border-hier-border bg-hier-panel p-4"
                    onSubmit={handleSaveExtraBoostCredits}
                  >
                    <p className="text-sm font-semibold text-hier-text">
                      Extra boost credits
                    </p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-[160px_1fr]">
                      <input
                        type="number"
                        min="0"
                        value={extraBoostForm.paid_boost_credits}
                        onChange={(event) =>
                          setExtraBoostForm((current) => ({
                            ...current,
                            paid_boost_credits: event.target.value,
                          }))
                        }
                        className="h-11 rounded-[18px] border border-hier-border bg-white px-4 text-sm outline-none focus:border-hier-primary"
                      />
                      <input
                        value={extraBoostForm.reason}
                        onChange={(event) =>
                          setExtraBoostForm((current) => ({
                            ...current,
                            reason: event.target.value,
                          }))
                        }
                        placeholder="Reason for changing extra boost credits"
                        className="h-11 rounded-[18px] border border-hier-border bg-white px-4 text-sm outline-none focus:border-hier-primary"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={savingExtraBoost || extraBoostForm.reason.trim().length < 10}
                      className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-[18px] bg-hier-primary px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {savingExtraBoost ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      Save extra boost credits
                    </button>
                  </form>

                  <form
                    className="rounded-[22px] border border-hier-border bg-hier-panel p-4"
                    onSubmit={handleCreateGoodwillCredit}
                  >
                    <p className="text-sm font-semibold text-hier-text">
                      Stripe goodwill credit
                    </p>
                    <p className="mt-2 text-sm text-hier-muted">
                      Adds credit to the customer&apos;s Stripe balance for a future invoice.
                    </p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-[160px_1fr]">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={goodwillCreditForm.amount}
                        onChange={(event) =>
                          setGoodwillCreditForm((current) => ({
                            ...current,
                            amount: event.target.value,
                          }))
                        }
                        placeholder="20.00"
                        disabled={!canUseStripeBilling}
                        className="h-11 rounded-[18px] border border-hier-border bg-white px-4 text-sm outline-none focus:border-hier-primary disabled:opacity-50"
                      />
                      <input
                        value={goodwillCreditForm.reason}
                        onChange={(event) =>
                          setGoodwillCreditForm((current) => ({
                            ...current,
                            reason: event.target.value,
                          }))
                        }
                        placeholder="Reason for goodwill credit"
                        disabled={!canUseStripeBilling}
                        className="h-11 rounded-[18px] border border-hier-border bg-white px-4 text-sm outline-none focus:border-hier-primary disabled:opacity-50"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={
                        savingGoodwillCredit ||
                        !canUseStripeBilling ||
                        !goodwillCreditForm.amount ||
                        goodwillCreditForm.reason.trim().length < 10
                      }
                      className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-[18px] bg-hier-primary px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {savingGoodwillCredit ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      Add Stripe credit
                    </button>
                  </form>

                  <div className="rounded-[22px] border border-hier-border bg-hier-panel p-4">
                    <p className="text-sm font-semibold text-hier-text">
                      Coupons used
                    </p>
                    {billing.coupons?.length ? (
                      <div className="mt-3 space-y-2">
                        {billing.coupons.map((coupon, index) => (
                          <div
                            key={`${coupon.code || coupon.coupon_id || index}`}
                            className="rounded-[16px] border border-hier-border bg-white p-3 text-sm"
                          >
                            <p className="font-semibold text-hier-text">
                              {coupon.code || coupon.coupon_id || coupon.promotion_code_id}
                            </p>
                            <p className="mt-1 text-xs text-hier-muted">
                              {coupon.source || "Stripe"} / {formatDate(coupon.created_at)}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-2 text-sm text-hier-muted">No coupons recorded yet.</p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-hier-muted">
                  Billing controls unavailable.
                </p>
              )}
            </InfoCard>
          ) : null}

          {account.account_type !== "business" ? (
            <InfoCard title="Recent applications">
              {recentApplications.length ? (
                recentApplications.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-[22px] border border-hier-border bg-hier-panel p-4"
                  >
                    <p className="text-sm font-semibold text-hier-text">
                      {item.title ||
                        item.job_title ||
                        item.company_name ||
                        `Item #${item.id}`}
                    </p>
                    <p className="mt-1 text-sm text-hier-muted">
                      {item.company_name ||
                        item.stage ||
                        item.status ||
                        `${item.application_count || 0} applications`}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-hier-muted">No recent items yet.</p>
              )}
            </InfoCard>
          ) : null}

        </div>

        <aside className="space-y-6">
          {account.basic?.id ? <CallHistory accountUserId={account.basic.id} /> : null}

          <section className="rounded-[32px] border border-hier-border bg-white p-5 shadow-card sm:p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-hier-soft p-2 text-hier-primary">
                <UserRound className="h-5 w-5" />
              </div>

              <div>
                <h2 className="text-base font-semibold text-hier-text">
                  Account actions
                </h2>
                <p className="text-sm text-hier-muted">
                  Manage identity, security requests and account status with an audit reason.
                </p>
              </div>
            </div>

            <form className="mt-5 space-y-3" onSubmit={handleUpdateIdentity}>
              <div>
                <label className="text-xs font-semibold text-hier-muted">
                  Email
                </label>
                <input
                  value={identityEmail}
                  onChange={(event) => setIdentityEmail(event.target.value)}
                  className="mt-1 h-11 w-full rounded-[18px] border border-hier-border bg-hier-panel px-4 text-sm text-hier-text outline-none transition focus:border-hier-primary focus:bg-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-hier-muted">
                  Phone
                </label>
                <input
                  value={identityPhone}
                  onChange={(event) => setIdentityPhone(event.target.value)}
                  className="mt-1 h-11 w-full rounded-[18px] border border-hier-border bg-hier-panel px-4 text-sm text-hier-text outline-none transition focus:border-hier-primary focus:bg-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-hier-muted">
                  Full name
                </label>
                <input
                  value={identityFullName}
                  onChange={(event) => setIdentityFullName(event.target.value)}
                  className="mt-1 h-11 w-full rounded-[18px] border border-hier-border bg-hier-panel px-4 text-sm text-hier-text outline-none transition focus:border-hier-primary focus:bg-white"
                />
              </div>

              <label className="flex items-start gap-3 rounded-[18px] border border-hier-border bg-hier-panel p-4 text-sm text-hier-muted">
                <input
                  type="checkbox"
                  checked={identityMarketingOptIn}
                  onChange={(event) => setIdentityMarketingOptIn(event.target.checked)}
                  className="mt-1 h-4 w-4"
                />
                <span>Customer has opted in to receive marketing emails from Hier.</span>
              </label>

              <div>
                <label className="text-xs font-semibold text-hier-muted">
                  Reason required
                </label>
                <textarea
                  value={identityReason}
                  onChange={(event) => setIdentityReason(event.target.value)}
                  rows={4}
                  placeholder="Why is this staff change being made?"
                  className="mt-1 w-full resize-none rounded-[18px] border border-hier-border bg-hier-panel p-4 text-sm text-hier-text outline-none transition focus:border-hier-primary focus:bg-white"
                />
              </div>

              <button
                type="submit"
                disabled={savingIdentity || identityReason.trim().length < 5}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-[20px] bg-hier-primary px-4 text-sm font-semibold text-white shadow-card transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {savingIdentity ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : null}
                Save identity changes
              </button>

              {!account.basic?.email_verified ? (
                <div className="rounded-[22px] border border-hier-border bg-hier-panel p-4">
                  <label className="text-xs font-semibold text-hier-muted">
                    Customer verification code
                  </label>
                  <input
                    value={verificationCode}
                    onChange={(event) => setVerificationCode(event.target.value)}
                    inputMode="numeric"
                    placeholder="Enter 6-digit code"
                    className="mt-2 h-11 w-full rounded-[18px] border border-hier-border bg-white px-4 text-sm font-semibold tracking-[0.2em] text-hier-text outline-none transition focus:border-hier-primary"
                  />
                  <button
                    type="button"
                    disabled={verifyingCode || !verificationCode.trim()}
                    onClick={handleVerifyEmailCode}
                    className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-[18px] bg-hier-primary px-4 text-sm font-semibold text-white shadow-card transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {verifyingCode ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                    Verify and send temporary password
                  </button>
                </div>
              ) : null}

              <button
                type="button"
                disabled={sendingPasswordReset}
                onClick={handleSendPasswordReset}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-[20px] border border-hier-border bg-white px-4 text-sm font-semibold text-hier-text transition hover:bg-hier-soft disabled:cursor-not-allowed disabled:opacity-50"
              >
                {sendingPasswordReset ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <KeyRound className="h-4 w-4" />
                )}
                Send password reset request
              </button>

              <button
                type="button"
                disabled={resendingVerification}
                onClick={handleResendVerificationEmail}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-[20px] border border-hier-border bg-white px-4 text-sm font-semibold text-hier-text transition hover:bg-hier-soft disabled:cursor-not-allowed disabled:opacity-50"
              >
                {resendingVerification ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Mail className="h-4 w-4" />
                )}
                Resend account verification code
              </button>

              {!account.basic?.email_verified ? (
                <button
                  type="button"
                  disabled={markingVerified || identityReason.trim().length < 5}
                  onClick={handleMarkEmailVerified}
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-[20px] border border-emerald-200 bg-emerald-50 px-4 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {markingVerified ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  Mark email verified
                </button>
              ) : null}

              <button
                type="button"
                onClick={() => {
                  setShowDeleteAccount(true);
                  setDeleteReason("");
                  setDeleteConfirmed(false);
                  setCancelStripeOnDelete(requiresStripeCancellationOnDelete);
                }}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-[20px] border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-800 transition hover:bg-red-100"
              >
                <Trash2 className="h-4 w-4" />
                Delete account
              </button>
            </form>
          </section>

          {account.account_type === "business" ? (
            <section className="rounded-[32px] border border-hier-border bg-white p-5 shadow-card sm:p-6">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-hier-soft p-2 text-hier-primary">
                  <MonitorCog className="h-5 w-5" />
                </div>

                <div>
                  <h2 className="text-base font-semibold text-hier-text">
                    Support access
                  </h2>
                  <p className="text-sm text-hier-muted">
                    Open the selected account&apos;s dashboard areas for technical support.
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                {[
                  ["Candidates", "/candidates"],
                  ["Analytics", "/analytics"],
                  ["Posts", "/jobs"],
                  ["Promote", "/promote"],
                  ["Billing", "/billing"],
                  ["Onboarding", "/onboarding"],
                  ["Employee records", "/employee-records"],
                ].map(([label, path]) => (
                  <button
                    key={path}
                    type="button"
                    disabled={Boolean(startingSupportPath)}
                    onClick={() => handleStartSupportAccess(path)}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-[18px] border border-hier-border bg-hier-panel px-3 text-sm font-semibold text-hier-text transition hover:bg-hier-soft disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {startingSupportPath === path ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : null}
                    {label}
                  </button>
                ))}
              </div>
            </section>
          ) : null}

          <section className="rounded-[32px] border border-hier-border bg-white p-5 shadow-card sm:p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-hier-soft p-2 text-hier-primary">
                <CalendarClock className="h-5 w-5" />
              </div>

              <div>
                <h2 className="text-base font-semibold text-hier-text">
                  Follow-ups
                </h2>
                <p className="text-sm text-hier-muted">
                  Schedule call backs and support reminders for this account.
                </p>
              </div>
            </div>

            <form className="mt-5 space-y-3" onSubmit={handleCreateAccountFollowUp}>
              <input
                value={followUpForm.title}
                onChange={(event) =>
                  setFollowUpForm((current) => ({ ...current, title: event.target.value }))
                }
                placeholder="Follow-up title"
                className="h-11 w-full rounded-[18px] border border-hier-border bg-hier-panel px-4 text-sm outline-none focus:border-hier-primary focus:bg-white"
              />
              <input
                type="datetime-local"
                value={followUpForm.due_at}
                onChange={(event) =>
                  setFollowUpForm((current) => ({ ...current, due_at: event.target.value }))
                }
                className="h-11 w-full rounded-[18px] border border-hier-border bg-hier-panel px-4 text-sm outline-none focus:border-hier-primary focus:bg-white"
              />
              <select
                value={followUpForm.assigned_staff_user_id}
                onChange={(event) =>
                  setFollowUpForm((current) => ({
                    ...current,
                    assigned_staff_user_id: event.target.value,
                  }))
                }
                className="h-11 w-full rounded-[18px] border border-hier-border bg-hier-panel px-4 text-sm outline-none focus:border-hier-primary focus:bg-white"
              >
                <option value="">Assign to me</option>
                {staffUsers.map((staff) => (
                  <option key={staff.id} value={staff.id}>
                    {staff.full_name || staff.email}
                  </option>
                ))}
              </select>
              <textarea
                value={followUpForm.note}
                onChange={(event) =>
                  setFollowUpForm((current) => ({ ...current, note: event.target.value }))
                }
                placeholder="Call notes"
                rows={3}
                className="w-full resize-none rounded-[18px] border border-hier-border bg-hier-panel p-4 text-sm outline-none focus:border-hier-primary focus:bg-white"
              />
              <button
                type="submit"
                disabled={
                  savingFollowUp ||
                  !followUpForm.title.trim() ||
                  !followUpForm.due_at
                }
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-[20px] bg-hier-primary px-4 text-sm font-semibold text-white shadow-card disabled:cursor-not-allowed disabled:opacity-50"
              >
                {savingFollowUp ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CalendarClock className="h-4 w-4" />
                )}
                Schedule follow-up
              </button>
            </form>

            <div className="mt-5 space-y-2">
              {followUps.length ? (
                followUps.slice(0, 5).map((item) => (
                  <div
                    key={item.id}
                    className="rounded-[18px] border border-hier-border bg-hier-panel p-3 text-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-hier-text">{item.title}</p>
                        <p className="mt-1 text-hier-muted">{formatDate(item.due_at)}</p>
                      </div>
                      {item.status !== "completed" ? (
                        <button
                          type="button"
                          onClick={() => void handleCompleteAccountFollowUp(item.id)}
                          disabled={savingFollowUp}
                          className="rounded-full bg-white p-2 text-hier-primary disabled:opacity-50"
                          aria-label="Complete follow-up"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                      ) : null}
                    </div>
                    {item.note ? <p className="mt-2 text-hier-muted">{item.note}</p> : null}
                  </div>
                ))
              ) : (
                <p className="rounded-[18px] border border-hier-border bg-hier-panel p-4 text-sm text-hier-muted">
                  No follow-ups scheduled.
                </p>
              )}
            </div>
          </section>

          <section className="rounded-[32px] border border-hier-border bg-white p-5 shadow-card sm:p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-hier-soft p-2 text-hier-primary">
                <BriefcaseBusiness className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-hier-text">Cases</h2>
                <p className="text-sm text-hier-muted">
                  Track investigations for this account.
                </p>
              </div>
            </div>

            <form className="mt-5 space-y-3" onSubmit={handleCreateCase}>
              <input
                value={caseForm.title}
                onChange={(event) => setCaseForm((current) => ({ ...current, title: event.target.value }))}
                placeholder="Case title"
                className="h-11 w-full rounded-[18px] border border-hier-border bg-hier-panel px-4 text-sm outline-none focus:border-hier-primary focus:bg-white"
              />
              <select
                value={caseForm.owner_staff_user_id}
                onChange={(event) => setCaseForm((current) => ({ ...current, owner_staff_user_id: event.target.value }))}
                className="h-11 w-full rounded-[18px] border border-hier-border bg-hier-panel px-4 text-sm outline-none focus:border-hier-primary focus:bg-white"
              >
                <option value="">Owner: me</option>
                {staffUsers.map((staff) => (
                  <option key={staff.id} value={staff.id}>
                    {staff.full_name || staff.email}
                  </option>
                ))}
              </select>
              <textarea
                value={caseForm.summary}
                onChange={(event) => setCaseForm((current) => ({ ...current, summary: event.target.value }))}
                placeholder="Case summary"
                rows={3}
                className="w-full resize-none rounded-[18px] border border-hier-border bg-hier-panel p-4 text-sm outline-none focus:border-hier-primary focus:bg-white"
              />
              <button
                type="submit"
                disabled={savingCase || !caseForm.title.trim()}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-[20px] bg-hier-primary px-4 text-sm font-semibold text-white shadow-card disabled:cursor-not-allowed disabled:opacity-50"
              >
                {savingCase ? <Loader2 className="h-4 w-4 animate-spin" /> : <BriefcaseBusiness className="h-4 w-4" />}
                Create case
              </button>
            </form>

            <div className="mt-5 space-y-2">
              {cases.length ? (
                cases.slice(0, 5).map((item) => (
                  <Link
                    key={item.id}
                    href={`/staff/cases/${item.id}`}
                    className="block rounded-[18px] border border-hier-border bg-hier-panel p-3 text-sm transition hover:border-hier-primary"
                  >
                    <p className="font-semibold text-hier-text">#{item.id} {item.title}</p>
                    <p className="mt-1 text-hier-muted">{item.status} / {item.owner_staff_name || "Unassigned"}</p>
                  </Link>
                ))
              ) : (
                <p className="rounded-[18px] border border-hier-border bg-hier-panel p-4 text-sm text-hier-muted">
                  No cases yet.
                </p>
              )}
            </div>
          </section>

          <section className="rounded-[32px] border border-hier-border bg-white p-5 shadow-card sm:p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-hier-soft p-2 text-hier-primary">
                <MessageSquarePlus className="h-5 w-5" />
              </div>

              <div>
                <h2 className="text-base font-semibold text-hier-text">
                  Add internal note
                </h2>
                <p className="text-sm text-hier-muted">
                  Only Hier staff can see these notes.
                </p>
              </div>
            </div>

            <form className="mt-5 space-y-3" onSubmit={handleCreateNote}>
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Add a support note, billing context, technical issue or follow-up..."
                rows={5}
                className="w-full resize-none rounded-[22px] border border-hier-border bg-hier-panel p-4 text-sm text-hier-text outline-none transition focus:border-hier-primary focus:bg-white"
              />
              <select
                multiple
                value={mentionedStaffUserIds}
                onChange={(event) =>
                  setMentionedStaffUserIds(
                    Array.from(event.target.selectedOptions).map((option) => option.value)
                  )
                }
                className="min-h-24 w-full rounded-[18px] border border-hier-border bg-hier-panel px-4 py-3 text-sm outline-none focus:border-hier-primary focus:bg-white"
              >
                {staffUsers.map((staff) => (
                  <option key={staff.id} value={staff.id}>
                    @{staff.full_name || staff.email}
                  </option>
                ))}
              </select>

              <button
                type="submit"
                disabled={savingNote || !note.trim()}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-[20px] bg-hier-primary px-4 text-sm font-semibold text-white shadow-card transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {savingNote ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <StickyNote className="h-4 w-4" />
                )}
                Save internal note
              </button>
            </form>
          </section>
        </aside>
      </section>

      {showDeleteAccount ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-[32px] border border-red-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-red-950">
                  Delete account
                </h2>
                <p className="mt-1 text-sm leading-6 text-red-800">
                  This will delete {title}. Add a clear support reason before
                  continuing.
                </p>
              </div>

              <button
                type="button"
                disabled={deletingAccount}
                onClick={() => {
                  setShowDeleteAccount(false);
                  setDeleteReason("");
                  setDeleteConfirmed(false);
                  setCancelStripeOnDelete(requiresStripeCancellationOnDelete);
                }}
                className="rounded-2xl border border-hier-border bg-white p-2 text-hier-muted hover:text-hier-text disabled:cursor-not-allowed disabled:opacity-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 rounded-[22px] border border-red-200 bg-red-50 p-4">
              <label className="block text-sm font-semibold text-red-950">
                Deletion reason
              </label>
              <textarea
                value={deleteReason}
                onChange={(event) => setDeleteReason(event.target.value)}
                rows={5}
                placeholder="Explain why this account is being deleted..."
                className="mt-3 w-full resize-none rounded-[18px] border border-red-200 bg-white p-4 text-sm text-hier-text outline-none transition focus:border-red-500"
              />
            </div>

            <div className="mt-4 space-y-3">
              <label className="flex items-start gap-3 rounded-[18px] border border-red-200 bg-white p-4 text-sm font-semibold text-red-950">
                <input
                  type="checkbox"
                  checked={deleteConfirmed}
                  onChange={(event) => setDeleteConfirmed(event.target.checked)}
                  disabled={deletingAccount}
                  className="mt-1"
                />
                I confirm this account should be deleted.
              </label>

              {account.account_type === "business" ? (
                <label className="flex items-start gap-3 rounded-[18px] border border-red-200 bg-white p-4 text-sm font-semibold text-red-950">
                  <input
                    type="checkbox"
                    checked={cancelStripeOnDelete}
                    onChange={(event) => setCancelStripeOnDelete(event.target.checked)}
                    disabled={deletingAccount || isAppleManagedBilling}
                    className="mt-1"
                  />
                  Cancel the Stripe subscription as part of this deletion.
                </label>
              ) : null}

              {isAppleManagedBilling ? (
                <p className="rounded-[18px] border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
                  This account is Apple-managed, so the subscription must be
                  cancelled in Apple before the account can be deleted.
                </p>
              ) : null}
            </div>

            <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={deletingAccount}
                onClick={() => {
                  setShowDeleteAccount(false);
                  setDeleteReason("");
                  setDeleteConfirmed(false);
                  setCancelStripeOnDelete(requiresStripeCancellationOnDelete);
                }}
                className="inline-flex h-11 items-center justify-center rounded-[18px] border border-hier-border bg-white px-4 text-sm font-semibold text-hier-text disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={
                  deleteReason.trim().length < 10 ||
                  !deleteConfirmed ||
                  (requiresStripeCancellationOnDelete && !cancelStripeOnDelete) ||
                  isAppleManagedBilling ||
                  deletingAccount
                }
                onClick={handleDeleteAccount}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-[18px] bg-red-600 px-4 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deletingAccount ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                Delete account
              </button>
            </div>
          </div>
        </div>
      ) : null}

    </div>
  );
}

