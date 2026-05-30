"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, Check, Mail, MapPin, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { HierBrand } from "@/components/ui/brand";
import { apiFetch } from "@/lib/api";
import { searchAddresses, type AddressOption } from "@/lib/address-lookup";

const UTM_STORAGE_KEY = "hier_business_signup_utm";
const UTM_FIELDS = ["utm_source", "utm_medium", "utm_campaign", "utm_content"] as const;

type SignupUtmValues = Partial<Record<(typeof UTM_FIELDS)[number], string>>;

type SignupResponse = {
  id?: number;
  email?: string;
  role?: string;
  email_verified?: boolean;
  phone_verified?: boolean;
  next?: string;
  message?: string;
};

type RequestOtpResponse = {
  ok?: boolean;
  dev_code?: string;
};

export default function BusinessSignupPage() {
  const router = useRouter();

  const [companyName, setCompanyName] = useState("");
  const [companyNumber, setCompanyNumber] = useState("");
  const [address, setAddress] = useState("");
  const [addressOptions, setAddressOptions] = useState<AddressOption[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<AddressOption | null>(null);
  const [manualAddress, setManualAddress] = useState(false);
  const [addressLoading, setAddressLoading] = useState(false);
  const [addressError, setAddressError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [marketingOptIn, setMarketingOptIn] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [utmValues, setUtmValues] = useState<SignupUtmValues>({});

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const nextValues: SignupUtmValues = {};

    UTM_FIELDS.forEach((field) => {
      const value = params.get(field);
      if (value) nextValues[field] = value;
    });

    if (Object.keys(nextValues).length) {
      window.localStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(nextValues));
      setUtmValues(nextValues);
      return;
    }

    try {
      const stored = window.localStorage.getItem(UTM_STORAGE_KEY);
      if (stored) setUtmValues(JSON.parse(stored) as SignupUtmValues);
    } catch {
      setUtmValues({});
    }
  }, []);

  useEffect(() => {
    if (manualAddress) return;

    const query = address.trim();
    if (query.length < 6) {
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
        const results = await searchAddresses(query);
        setAddressOptions(results);
        if (!results.length) setAddressError("No addresses found. Use manual address if needed.");
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
  }, [address, manualAddress]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const normalizedEmail = email.trim().toLowerCase();

      if (!companyName.trim()) {
        throw new Error("Company name is required.");
      }
      if (!companyNumber.trim()) {
        throw new Error("Company number is required.");
      }
      if (!manualAddress && !selectedAddress) {
        throw new Error("Please search and select an address, or use manual address.");
      }
      if (manualAddress && !address.trim()) {
        throw new Error("Address is required.");
      }
      if (!normalizedEmail) {
        throw new Error("Email is required.");
      }
      if (!password) {
        throw new Error("Password is required.");
      }
      if (password.length < 10) {
        throw new Error("Password must be at least 10 characters.");
      }
      if (!confirmPassword) {
        throw new Error("Confirm password is required.");
      }
      if (password !== confirmPassword) {
        throw new Error("Passwords do not match.");
      }
      if (!acceptedTerms) {
        throw new Error("You must accept the Terms & Conditions to create an account.");
      }

      const chosenAddress = manualAddress
        ? address.trim()
        : selectedAddress?.label || address.trim();

      await apiFetch<SignupResponse>("/signup", {
        method: "POST",
        body: JSON.stringify({
          role: "business_user",
          company_name: companyName.trim(),
          company_number: companyNumber.trim(),
          address: chosenAddress,
          email: normalizedEmail,
          password,
          confirm_password: confirmPassword,
          accepted_terms: acceptedTerms,
          terms_version: "2026-04",
          marketing_opt_in: marketingOptIn,
          ...utmValues,
        }),
      });

      await apiFetch<RequestOtpResponse>("/request-otp", {
        method: "POST",
        body: JSON.stringify({
          purpose: "verify_email",
          channel: "email",
          email: normalizedEmail,
        }),
      });

      router.push(
        `/verify-email?email=${encodeURIComponent(
          normalizedEmail
        )}&role=business_user`
      );
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not create your account right now."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-login-glow">
      <div className="mx-auto grid min-h-screen max-w-[1600px] gap-10 px-6 py-8 lg:grid-cols-[1.02fr_0.98fr] lg:px-10">
        <section className="hidden flex-col justify-between rounded-[36px] border border-hier-border bg-gradient-to-br from-white via-hier-soft to-white p-10 shadow-panel lg:flex">
          <HierBrand />

          <div className="space-y-6">
            <div className="space-y-4">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-hier-muted">
                Business signup
              </p>
              <h1 className="max-w-xl text-5xl font-semibold leading-tight tracking-tight text-hier-text">
                Create your business account and get ready to choose your plan.
              </h1>
              <p className="max-w-xl text-lg leading-8 text-hier-muted">
                Set up your company details, verify your email, then move
                straight into pricing to unlock your hiring workflow.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-[24px] border border-white/50 bg-white/75 p-5 shadow-card backdrop-blur-sm">
                <div className="mb-3 inline-flex rounded-2xl bg-hier-primary/15 p-3 text-hier-primary">
                  <Building2 className="h-5 w-5" />
                </div>
                <h3 className="text-base font-semibold text-hier-text">
                  Company-first setup
                </h3>
                <p className="mt-2 text-sm leading-6 text-hier-muted">
                  Start with your company identity and operational details, then
                  continue into billing once your email is verified.
                </p>
              </div>

              <div className="rounded-[24px] border border-white/50 bg-white/75 p-5 shadow-card backdrop-blur-sm">
                <div className="mb-3 inline-flex rounded-2xl bg-hier-primary/15 p-3 text-hier-primary">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <h3 className="text-base font-semibold text-hier-text">
                  Same Hier flow
                </h3>
                <p className="mt-2 text-sm leading-6 text-hier-muted">
                  This follows the same business signup path as the app:
                  account, verification, then pricing.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {[
              ["1", "Create account"],
              ["2", "Verify email"],
              ["3", "Choose plan"],
            ].map(([value, label]) => (
              <div
                key={label}
                className="rounded-[24px] border border-white/60 bg-white/80 p-5 shadow-card"
              >
                <p className="text-2xl font-semibold text-hier-text">{value}</p>
                <p className="mt-2 text-sm text-hier-muted">{label}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="flex items-center justify-center">
          <div className="w-full max-w-[620px] rounded-[36px] border border-hier-border bg-white p-6 shadow-panel sm:p-10">
            <div className="mb-8 flex items-center justify-between gap-4">
              <HierBrand compact />
              <span className="rounded-full bg-hier-soft px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-hier-muted">
                Business account
              </span>
            </div>

            <div className="space-y-2">
              <h2 className="text-3xl font-semibold tracking-tight text-hier-text">
                Create your business account
              </h2>
              <p className="text-sm leading-6 text-hier-muted">
                Enter your company details, set your password, and we’ll send
                you a verification code to continue.
              </p>
            </div>

            <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
              <label className="block space-y-2">
                <span className="text-sm font-medium text-hier-text">
                  Company name
                </span>
                <div className="relative">
                  <Building2 className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-hier-muted" />
                  <input
                    type="text"
                    value={companyName}
                    onChange={(event) => setCompanyName(event.target.value)}
                    placeholder="Acme Ltd"
                    className="h-14 w-full rounded-[22px] border border-hier-border bg-hier-panel pl-11 pr-4 text-sm text-hier-text outline-none transition focus:border-hier-primary focus:bg-white"
                  />
                </div>
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-hier-text">
                  Company number
                </span>
                <div className="relative">
                  <Check className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-hier-muted" />
                  <input
                    type="text"
                    value={companyNumber}
                    onChange={(event) => setCompanyNumber(event.target.value)}
                    placeholder="12345678"
                    className="h-14 w-full rounded-[22px] border border-hier-border bg-hier-panel pl-11 pr-4 text-sm text-hier-text outline-none transition focus:border-hier-primary focus:bg-white"
                  />
                </div>
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-hier-text">
                  Address search
                </span>
                <div className="relative">
                  <MapPin className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-hier-muted" />
                  <input
                    type="text"
                    value={address}
                    onChange={(event) => {
                      setAddress(event.target.value);
                      setSelectedAddress(null);
                    }}
                    placeholder="House number and postcode"
                    className="h-14 w-full rounded-[22px] border border-hier-border bg-hier-panel pl-11 pr-4 text-sm text-hier-text outline-none transition focus:border-hier-primary focus:bg-white"
                  />
                </div>
                <label className="flex items-center gap-2 text-xs font-semibold text-hier-muted">
                  <input
                    type="checkbox"
                    checked={manualAddress}
                    onChange={(event) => {
                      setManualAddress(event.target.checked);
                      setSelectedAddress(null);
                      setAddressOptions([]);
                      setAddressError(null);
                    }}
                    className="h-4 w-4"
                  />
                  Use manual address override
                </label>
              </label>

              {!manualAddress ? (
                <div className="space-y-2">
                  {addressLoading ? (
                    <p className="text-sm font-medium text-hier-muted">Searching addresses...</p>
                  ) : null}
                  {addressError ? (
                    <p className="text-sm font-medium text-rose-700">{addressError}</p>
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

              <label className="block space-y-2">
                <span className="text-sm font-medium text-hier-text">Email</span>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-hier-muted" />
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@company.com"
                    className="h-14 w-full rounded-[22px] border border-hier-border bg-hier-panel pl-11 pr-4 text-sm text-hier-text outline-none transition focus:border-hier-primary focus:bg-white"
                  />
                </div>
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-hier-text">
                  Password
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="At least 10 characters"
                  className="h-14 w-full rounded-[22px] border border-hier-border bg-hier-panel px-4 text-sm text-hier-text outline-none transition focus:border-hier-primary focus:bg-white"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-hier-text">
                  Confirm password
                </span>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Re-enter your password"
                  className="h-14 w-full rounded-[22px] border border-hier-border bg-hier-panel px-4 text-sm text-hier-text outline-none transition focus:border-hier-primary focus:bg-white"
                />
              </label>

              <div className="rounded-[22px] border border-hier-border bg-hier-panel p-4">
                <label className="flex items-start gap-3 text-sm text-hier-muted">
                  <input
                    type="checkbox"
                    checked={acceptedTerms}
                    onChange={(event) => setAcceptedTerms(event.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-hier-border text-hier-primary focus:ring-hier-primary"
                  />
                  <span className="leading-6">
                    I agree to the{" "}
                    <Link
                      href="https://hierapp.co.uk/terms-of-service"
                      target="_blank"
                      className="font-medium text-hier-primary hover:underline"
                    >
                      Terms &amp; Conditions
                    </Link>
                    .
                  </span>
                </label>
              </div>

              <div className="rounded-[22px] border border-hier-border bg-hier-panel p-4">
                <label className="flex items-start gap-3 text-sm text-hier-muted">
                  <input
                    type="checkbox"
                    checked={marketingOptIn}
                    onChange={(event) => setMarketingOptIn(event.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-hier-border text-hier-primary focus:ring-hier-primary"
                  />
                  <span className="leading-6">
                    I would like to receive product updates, offers and marketing emails from Hier.
                  </span>
                </label>
              </div>

              <div className="rounded-[22px] border border-hier-border bg-hier-soft px-4 py-4 text-sm text-hier-muted">
                After verification, we’ll move you into pricing so you can
                choose the right plan for your business.
              </div>

              {error ? (
                <div className="rounded-[20px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {error}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={loading}
                className="inline-flex h-14 w-full items-center justify-center rounded-[22px] bg-hier-primary text-sm font-semibold text-white shadow-card transition hover:translate-y-[-1px] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Creating account…" : "Create business account"}
              </button>
            </form>

            <div className="mt-8 border-t border-hier-border pt-6 text-sm text-hier-muted">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-medium text-hier-primary hover:underline"
              >
                Back to login
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
