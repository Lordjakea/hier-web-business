"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  BriefcaseBusiness,
  CheckCircle2,
  Loader2,
  Plus,
  Search,
  ShieldCheck,
  UserRound,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import {
  createStaffAccount,
  createStaffBillingCheckout,
  fetchStaffCrmReports,
  fetchStaffMe,
  searchStaffAccounts,
  type StaffAccountSearchItem,
  type StaffBillingPlan,
  type StaffMe,
} from "@/lib/staff-crm";
import { searchAddresses, type AddressOption } from "@/lib/address-lookup";

function formatDate(value?: string | null) {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(value));
  } catch {
    return "—";
  }
}

function accountLabel(account: StaffAccountSearchItem) {
  return account.account_type === "business" ? "Business" : "Candidate";
}

function statusPill(value?: string | boolean | null) {
  if (typeof value === "boolean") return value ? "Active" : "Inactive";
  return value || "—";
}

function formatMoney(value?: number | null, currency = "GBP") {
  if (typeof value !== "number" || Number.isNaN(value)) return "â€”";
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

function AccountRow({ account }: { account: StaffAccountSearchItem }) {
  const Icon = account.account_type === "business" ? BriefcaseBusiness : UserRound;

  return (
    <Link
      href={`/staff/accounts/${account.user_id}`}
      className="grid gap-4 rounded-[24px] border border-hier-border bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-hier-primary hover:shadow-card lg:grid-cols-[1.4fr_1fr_0.8fr_0.8fr] lg:items-center"
    >
      <div className="flex min-w-0 items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-hier-soft text-hier-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-semibold text-hier-text">
              {account.display_name}
            </p>
            <span className="rounded-full bg-hier-panel px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-hier-muted">
              {accountLabel(account)}
            </span>
          </div>
          <p className="mt-1 truncate text-sm text-hier-muted">{account.email || "No email"}</p>
        </div>
      </div>

      <div className="space-y-1 text-sm">
        <p className="font-medium text-hier-text">{account.company_name || account.phone || "—"}</p>
        <p className="text-hier-muted">Role: {account.role || "—"}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <span className="rounded-full border border-hier-border bg-hier-panel px-3 py-1 text-xs font-medium text-hier-text">
          {statusPill(account.is_active)}
        </span>
        {account.email_verified ? (
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
            Verified
          </span>
        ) : null}
      </div>

      <div className="text-sm text-hier-muted lg:text-right">
        Created {formatDate(account.created_at)}
      </div>
    </Link>
  );
}

export default function StaffCrmPage() {
  const router = useRouter();
  const [staff, setStaff] = useState<StaffMe | null>(null);
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("all");
  const [accounts, setAccounts] = useState<StaffAccountSearchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [billingPlans, setBillingPlans] = useState<StaffBillingPlan[]>([]);
  const [showCreateAccount, setShowCreateAccount] = useState(false);
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createMessage, setCreateMessage] = useState<string | null>(null);
  const [addressOptions, setAddressOptions] = useState<AddressOption[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<AddressOption | null>(null);
  const [manualAddress, setManualAddress] = useState(false);
  const [addressLoading, setAddressLoading] = useState(false);
  const [addressError, setAddressError] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState({
    role: "business_user" as "user" | "business_user",
    email: "",
    phone: "",
    first_name: "",
    last_name: "",
    company_name: "",
    company_number: "",
    address: "",
    marketing_opt_in: false,
    accepted_terms: false,
    plan_code: "starter",
    billing_email: "",
    billing_name: "",
  });

  const loadAccounts = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [staffResponse, accountsResponse] = await Promise.all([
        fetchStaffMe(),
        searchStaffAccounts({ q: query, role, per_page: 50 }),
      ]);

      setStaff(staffResponse.staff);
      setAccounts(accountsResponse.items || []);
      setTotal(accountsResponse.items?.length || 0);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not load Staff CRM."
      );
    } finally {
      setLoading(false);
    }
  }, [query, role]);

  const loadPlans = useCallback(async () => {
    try {
      const response = await fetchStaffCrmReports();
      setBillingPlans(response.plans || []);
    } catch {
      setBillingPlans([]);
    }
  }, []);

  useEffect(() => {
    if (!showCreateAccount || createForm.role !== "business_user" || manualAddress) return;

    const queryText = createForm.address.trim();
    if (queryText.length < 6) {
      setAddressOptions([]);
      setSelectedAddress(null);
      setAddressError(null);
      return;
    }

    const timeout = window.setTimeout(async () => {
      setAddressLoading(true);
      setAddressError(null);
      setSelectedAddress(null);

      try {
        const results = await searchAddresses(queryText);
        setAddressOptions(results);
        if (!results.length) {
          setAddressError("No addresses found. Use manual address if needed.");
        }
      } catch (caughtError) {
        setAddressOptions([]);
        setAddressError(
          caughtError instanceof Error
            ? caughtError.message
            : "Address lookup failed. Use manual address if needed."
        );
      } finally {
        setAddressLoading(false);
      }
    }, 450);

    return () => window.clearTimeout(timeout);
  }, [createForm.address, createForm.role, manualAddress, showCreateAccount]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadAccounts();
      void loadPlans();
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [loadAccounts, loadPlans]);

  async function handleCreateAccount(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreatingAccount(true);
    setCreateError(null);

    try {
      const email = createForm.email.trim().toLowerCase();
      const phone = createForm.phone.trim();

      if (!email) throw new Error("Email is required.");

      if (createForm.role === "user") {
        if (!createForm.first_name.trim()) throw new Error("First name is required.");
        if (!createForm.last_name.trim()) throw new Error("Last name is required.");
        if (!phone) throw new Error("Phone is required.");
      } else {
        if (!createForm.company_name.trim()) throw new Error("Company name is required.");
        if (!createForm.company_number.trim()) throw new Error("Company number is required.");
        if (!manualAddress && !selectedAddress) throw new Error("Please search and select an address, or use manual address.");
        if (manualAddress && !createForm.address.trim()) throw new Error("Address is required.");
      }

      if (!createForm.accepted_terms) {
        throw new Error("Confirm the customer has agreed to the Terms & Conditions or EULA.");
      }

      const chosenAddress = manualAddress
        ? createForm.address.trim()
        : selectedAddress?.label || createForm.address.trim();

      const response = await createStaffAccount({
        role: createForm.role,
        email,
        phone: phone || null,
        first_name: createForm.first_name.trim() || null,
        last_name: createForm.last_name.trim() || null,
        company_name: createForm.company_name.trim() || null,
        company_number: createForm.company_number.trim() || null,
        address: chosenAddress || null,
        marketing_opt_in: createForm.marketing_opt_in,
        accepted_terms: createForm.accepted_terms,
        plan_code: createForm.role === "business_user" ? createForm.plan_code : null,
        billing_email: createForm.billing_email.trim() || email,
        billing_name:
          createForm.billing_name.trim() ||
          createForm.company_name.trim() ||
          `${createForm.first_name} ${createForm.last_name}`.trim(),
      });

      const createdId = response.account?.basic?.id;

      if (
        createdId &&
        createForm.role === "business_user" &&
        createForm.plan_code &&
        createForm.plan_code !== "starter"
      ) {
        const checkout = await createStaffBillingCheckout(createdId, createForm.plan_code);
        if (checkout.checkout_url) {
          window.open(checkout.checkout_url, "_blank", "noopener,noreferrer");
          setCreateMessage("Account created. Stripe checkout opened in a new tab.");
        }
      }

      setShowCreateAccount(false);
      await loadAccounts();
      if (createdId) router.push(`/staff/accounts/${createdId}`);
    } catch (caughtError) {
      setCreateError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not create this account."
      );
    } finally {
      setCreatingAccount(false);
    }
  }

  const stats = useMemo(() => {
    const businesses = accounts.filter((account) => account.account_type === "business").length;
    const candidates = accounts.filter((account) => account.account_type !== "business").length;
    const verified = accounts.filter((account) => account.email_verified).length;

    return [
      { label: "Visible results", value: String(accounts.length), icon: Users },
      { label: "Businesses", value: String(businesses), icon: BriefcaseBusiness },
      { label: "Candidates", value: String(candidates), icon: UserRound },
      { label: "Verified emails", value: String(verified), icon: CheckCircle2 },
    ];
  }, [accounts]);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Hier Staff"
        title="Staff CRM"
        description="Search candidate and business accounts, open a full support view, and record internal notes for the Hier team."
        action={
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setShowCreateAccount(true)}
              className="inline-flex items-center gap-2 rounded-full bg-hier-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
            >
              <Plus className="h-4 w-4" />
              Create account
            </button>
            {staff ? (
              <div className="rounded-full border border-hier-border bg-white px-4 py-2 text-sm font-medium text-hier-text shadow-sm">
                {staff.email}
              </div>
            ) : null}
          </div>
        }
      />

      <section className="rounded-[32px] border border-hier-border bg-white p-5 shadow-card sm:p-6">
        <div className="grid gap-4 lg:grid-cols-[1fr_220px_auto] lg:items-end">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-hier-text">Search accounts</span>
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-hier-muted" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by email, name, phone, company or company number"
                className="h-14 w-full rounded-[22px] border border-hier-border bg-hier-panel pl-11 pr-4 text-sm text-hier-text outline-none transition focus:border-hier-primary focus:bg-white"
              />
            </div>
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-hier-text">Account type</span>
            <select
              value={role}
              onChange={(event) => setRole(event.target.value)}
              className="h-14 w-full rounded-[22px] border border-hier-border bg-hier-panel px-4 text-sm text-hier-text outline-none transition focus:border-hier-primary focus:bg-white"
            >
              <option value="all">All accounts</option>
              <option value="business_user">Businesses</option>
              <option value="user">Candidates</option>
              <option value="admin">Admins</option>
            </select>
          </label>

          <button
            type="button"
            onClick={() => void loadAccounts()}
            className="inline-flex h-14 items-center justify-center gap-2 rounded-[22px] bg-hier-primary px-5 text-sm font-semibold text-white shadow-card transition hover:opacity-90"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Search
          </button>
        </div>
      </section>

      {showCreateAccount ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-hier-text/40 p-4">
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-[32px] border border-hier-border bg-white p-6 shadow-panel">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-hier-text">Create account</h2>
                <p className="mt-1 text-sm text-hier-muted">
                  Creates the account, sends email verification, and sends a password reset link.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateAccount(false)}
                className="rounded-2xl border border-hier-border px-3 py-2 text-sm font-semibold text-hier-text"
              >
                Close
              </button>
            </div>

            <form className="mt-6 space-y-4" onSubmit={handleCreateAccount}>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2 text-sm font-medium text-hier-text">
                  Account type
                  <select
                    value={createForm.role}
                    onChange={(event) =>
                      setCreateForm((current) => ({
                        ...current,
                        role: event.target.value as "user" | "business_user",
                      }))
                    }
                    className="h-12 w-full rounded-[18px] border border-hier-border bg-hier-panel px-4"
                  >
                    <option value="business_user">Business</option>
                    <option value="user">Candidate</option>
                  </select>
                </label>
                <label className="space-y-2 text-sm font-medium text-hier-text">
                  Email
                  <input
                    type="email"
                    value={createForm.email}
                    onChange={(event) => setCreateForm((current) => ({ ...current, email: event.target.value }))}
                    className="h-12 w-full rounded-[18px] border border-hier-border bg-hier-panel px-4"
                  />
                </label>
              </div>

              {createForm.role === "business_user" ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  {[
                    ["Company name", "company_name"],
                    ["Company number", "company_number"],
                    ["Phone", "phone"],
                    ["Billing email", "billing_email"],
                    ["Billing name", "billing_name"],
                  ].map(([label, field]) => (
                    <label key={field} className="space-y-2 text-sm font-medium text-hier-text">
                      {label}
                      <input
                        value={String(createForm[field as keyof typeof createForm] || "")}
                        onChange={(event) =>
                          setCreateForm((current) => ({ ...current, [field]: event.target.value }))
                        }
                        className="h-12 w-full rounded-[18px] border border-hier-border bg-hier-panel px-4"
                      />
                    </label>
                  ))}
                  <label className="space-y-2 text-sm font-medium text-hier-text sm:col-span-2">
                    Address search
                    <input
                      value={createForm.address}
                      onChange={(event) => {
                        setCreateForm((current) => ({ ...current, address: event.target.value }));
                        setSelectedAddress(null);
                      }}
                      placeholder="House number and postcode"
                      className="h-12 w-full rounded-[18px] border border-hier-border bg-hier-panel px-4"
                    />
                    <label className="mt-2 flex items-center gap-2 text-xs font-semibold text-hier-muted">
                      <input
                        type="checkbox"
                        checked={manualAddress}
                        onChange={(event) => {
                          setManualAddress(event.target.checked);
                          setAddressOptions([]);
                          setSelectedAddress(null);
                          setAddressError(null);
                        }}
                      />
                      Use manual address override
                    </label>
                  </label>

                  {!manualAddress ? (
                    <div className="space-y-2 sm:col-span-2">
                      {addressLoading ? (
                        <p className="text-sm font-medium text-hier-muted">Searching addresses...</p>
                      ) : null}
                      {addressError ? (
                        <p className="text-sm font-medium text-red-700">{addressError}</p>
                      ) : null}
                      {selectedAddress ? (
                        <div className="rounded-[18px] border border-hier-primary bg-hier-soft p-3 text-sm font-semibold text-hier-text">
                          {selectedAddress.label}
                        </div>
                      ) : addressOptions.length ? (
                        <div className="max-h-56 space-y-2 overflow-y-auto rounded-[18px] border border-hier-border bg-hier-panel p-2">
                          {addressOptions.map((option) => (
                            <button
                              key={option.id}
                              type="button"
                              onClick={() => setSelectedAddress(option)}
                              className="block w-full rounded-[14px] bg-white p-3 text-left text-sm font-medium text-hier-text transition hover:bg-hier-soft"
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  <label className="space-y-2 text-sm font-medium text-hier-text">
                    Plan
                    <select
                      value={createForm.plan_code}
                      onChange={(event) => setCreateForm((current) => ({ ...current, plan_code: event.target.value }))}
                      className="h-12 w-full rounded-[18px] border border-hier-border bg-hier-panel px-4"
                    >
                      {(billingPlans.length ? billingPlans : [{ code: "starter", name: "Starter" }]).map((plan) => (
                        <option key={plan.code} value={plan.code}>
                          {plan.name || plan.code}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {[
                    ["First name", "first_name"],
                    ["Last name", "last_name"],
                    ["Phone", "phone"],
                  ].map(([label, field]) => (
                    <label key={field} className="space-y-2 text-sm font-medium text-hier-text">
                      {label}
                      <input
                        value={String(createForm[field as keyof typeof createForm] || "")}
                        onChange={(event) =>
                          setCreateForm((current) => ({ ...current, [field]: event.target.value }))
                        }
                        className="h-12 w-full rounded-[18px] border border-hier-border bg-hier-panel px-4"
                      />
                    </label>
                  ))}
                </div>
              )}

              <label className="flex items-start gap-3 rounded-[20px] border border-hier-border bg-hier-panel p-4 text-sm text-hier-muted">
                <input
                  type="checkbox"
                  checked={createForm.marketing_opt_in}
                  onChange={(event) =>
                    setCreateForm((current) => ({ ...current, marketing_opt_in: event.target.checked }))
                  }
                  className="mt-1 h-4 w-4"
                />
                <span>Customer has opted in to receive marketing emails from Hier.</span>
              </label>

              <label className="flex items-start gap-3 rounded-[20px] border border-hier-border bg-hier-panel p-4 text-sm text-hier-muted">
                <input
                  type="checkbox"
                  checked={createForm.accepted_terms}
                  onChange={(event) =>
                    setCreateForm((current) => ({ ...current, accepted_terms: event.target.checked }))
                  }
                  className="mt-1 h-4 w-4"
                />
                <span>
                  Customer has agreed to the Hier Terms &amp; Conditions or EULA for this account.
                </span>
              </label>

              {createForm.role === "business_user" && createForm.plan_code !== "starter" ? (
                <div className="rounded-[20px] border border-hier-border bg-hier-soft p-4 text-sm text-hier-muted">
                  Creating this account will also open a Stripe checkout link for the selected plan so billing details can be captured securely.
                </div>
              ) : null}

              {createError ? (
                <div className="rounded-[18px] border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                  {createError}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={creatingAccount}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-[18px] bg-hier-primary px-4 text-sm font-semibold text-white disabled:opacity-60"
              >
                {creatingAccount ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Create account
              </button>
            </form>
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="flex items-start gap-3 rounded-[24px] border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">Staff CRM unavailable</p>
            <p className="mt-1">{error}</p>
          </div>
        </div>
      ) : null}

      {createMessage ? (
        <div className="flex items-start gap-3 rounded-[24px] border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
          <p>{createMessage}</p>
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-[28px] border border-hier-border bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-hier-muted">{label}</p>
              <div className="rounded-2xl bg-hier-soft p-2 text-hier-primary">
                <Icon className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-4 text-3xl font-semibold text-hier-text">{value}</p>
          </div>
        ))}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-hier-text">Accounts</h2>
            <p className="mt-1 text-sm text-hier-muted">
              Showing {accounts.length} of {total} matching accounts.
            </p>
          </div>
          <div className="hidden items-center gap-2 rounded-full border border-hier-border bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-hier-muted sm:flex">
            <ShieldCheck className="h-4 w-4" />
            Staff only
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-[280px] items-center justify-center rounded-[32px] border border-hier-border bg-white">
            <Loader2 className="h-6 w-6 animate-spin text-hier-primary" />
          </div>
        ) : accounts.length ? (
          <div className="space-y-3">
            {accounts.map((account) => (
              <AccountRow key={`${account.account_type}-${account.user_id}`} account={account} />
            ))}
          </div>
        ) : (
          <div className="rounded-[32px] border border-dashed border-hier-border bg-white p-10 text-center">
            <p className="text-base font-semibold text-hier-text">No accounts found</p>
            <p className="mt-2 text-sm text-hier-muted">Try a different email, company name or phone number.</p>
          </div>
        )}
      </section>
    </div>
  );
}
