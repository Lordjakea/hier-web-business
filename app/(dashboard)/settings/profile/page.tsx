"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import {
  confirmBusinessAvatarUpload,
  fetchBusinessProfile,
  presignBusinessAvatarUpload,
  updateBusinessProfile,
  type BusinessProfile,
} from "@/lib/business-profile";

type FormState = {
  company_name: string;
  company_number: string;
  bio: string;
  contact_email: string;
  contact_phone: string;
  address_text: string;
};

function toFormState(profile: BusinessProfile | null): FormState {
  return {
    company_name: profile?.company_name || "",
    company_number: profile?.company_number || "",
    bio: profile?.bio || "",
    contact_email: profile?.contact_email || "",
    contact_phone: profile?.contact_phone || "",
    address_text: profile?.address_text || "",
  };
}

function getInitials(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return "H";

  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();

  return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
}

export default function ProfileSettingsPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [form, setForm] = useState<FormState>(toFormState(null));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const nextProfile = await fetchBusinessProfile();
        if (!isMounted) return;

        setProfile(nextProfile);
        setForm(toFormState(nextProfile));
      } catch (caughtError) {
        if (!isMounted) return;
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Could not load business profile."
        );
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    void load();

    return () => {
      isMounted = false;
    };
  }, []);

  const hasChanges = useMemo(() => {
    if (!profile) {
      return Boolean(
        form.company_name ||
          form.company_number ||
          form.bio ||
          form.contact_email ||
          form.contact_phone ||
          form.address_text
      );
    }

    return (
      form.company_name !== (profile.company_name || "") ||
      form.company_number !== (profile.company_number || "") ||
      form.bio !== (profile.bio || "") ||
      form.contact_email !== (profile.contact_email || "") ||
      form.contact_phone !== (profile.contact_phone || "") ||
      form.address_text !== (profile.address_text || "")
    );
  }, [form, profile]);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setSuccess(null);
    setError(null);
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    setSuccess(null);
    setError(null);

    try {
      const updated = await updateBusinessProfile({
        company_name: form.company_name.trim() || null,
        company_number: form.company_number.trim() || null,
        bio: form.bio.trim() || null,
        contact_email: form.contact_email.trim() || null,
        contact_phone: form.contact_phone.trim() || null,
        address_text: form.address_text.trim() || null,
      });

      setProfile(updated);
      setForm(toFormState(updated));
      setSuccess("Business profile updated.");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not save profile changes."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleAvatarSelected(
    event: ChangeEvent<HTMLInputElement>
  ): Promise<void> {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    setUploadingAvatar(true);
    setSuccess(null);
    setError(null);

    try {
      const presign = await presignBusinessAvatarUpload({
        original_filename: file.name,
        mime_type: file.type || "image/jpeg",
        size_bytes: file.size,
      });

      const uploadResponse = await fetch(presign.upload_url, {
        method: "PUT",
        headers: file.type ? { "Content-Type": file.type } : undefined,
        body: file,
      });

      if (!uploadResponse.ok) {
        throw new Error("Avatar upload failed before confirmation.");
      }

      const confirmed = await confirmBusinessAvatarUpload(presign.storage_key);

      setProfile(confirmed.profile);
      setSuccess("Company logo updated.");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Could not upload company logo."
      );
    } finally {
      setUploadingAvatar(false);
    }
  }

  const avatarUrl = profile?.avatar_url || null;
  const initials = getInitials(
    form.company_name || profile?.company_name || "Hier"
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Profile management"
        title="Business profile settings"
        description="Manage the company details that power your business dashboard, branding, and shared business identity across Hier."
      />

      {error ? (
        <div className="rounded-[24px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="rounded-[24px] border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700">
          {success}
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-[28px] border border-hier-border bg-white p-10 text-sm text-hier-muted shadow-card">
          Loading business profile…
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <section className="rounded-[28px] border border-hier-border bg-white p-6 shadow-card">
              <div className="mb-5">
                <h2 className="text-lg font-semibold tracking-tight text-hier-text">
                  Company profile
                </h2>
                <p className="mt-1 text-sm text-hier-muted">
                  These details are the core business identity fields for your
                  account.
                </p>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <label className="space-y-2 md:col-span-2">
                  <span className="text-sm font-medium text-hier-text">
                    Company name
                  </span>
                  <input
                    value={form.company_name}
                    onChange={(event) =>
                      updateField("company_name", event.target.value)
                    }
                    placeholder="Enter company name"
                    className="w-full rounded-[18px] border border-hier-border bg-hier-background px-4 py-3 text-sm text-hier-text outline-none transition focus:border-hier-primary"
                  />
                </label>

                <label className="space-y-2 md:col-span-2">
                  <span className="text-sm font-medium text-hier-text">
                    Company number
                  </span>
                  <input
                    value={form.company_number}
                    onChange={(event) =>
                      updateField("company_number", event.target.value)
                    }
                    placeholder="Enter registered company number"
                    className="w-full rounded-[18px] border border-hier-border bg-hier-background px-4 py-3 text-sm text-hier-text outline-none transition focus:border-hier-primary"
                  />
                </label>

                <label className="space-y-2 md:col-span-2">
                  <span className="text-sm font-medium text-hier-text">Bio</span>
                  <textarea
                    value={form.bio}
                    onChange={(event) => updateField("bio", event.target.value)}
                    placeholder="Describe your business, culture, hiring focus, and what makes your company stand out."
                    rows={5}
                    className="w-full rounded-[18px] border border-hier-border bg-hier-background px-4 py-3 text-sm text-hier-text outline-none transition focus:border-hier-primary"
                  />
                </label>
              </div>
            </section>

            <section className="rounded-[28px] border border-hier-border bg-white p-6 shadow-card">
              <div className="mb-5">
                <h2 className="text-lg font-semibold tracking-tight text-hier-text">
                  Contact info
                </h2>
                <p className="mt-1 text-sm text-hier-muted">
                  Keep these up to date so the dashboard and app always reflect
                  the current business profile.
                </p>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-medium text-hier-text">
                    Contact email
                  </span>
                  <input
                    type="email"
                    value={form.contact_email}
                    onChange={(event) =>
                      updateField("contact_email", event.target.value)
                    }
                    placeholder="name@company.com"
                    className="w-full rounded-[18px] border border-hier-border bg-hier-background px-4 py-3 text-sm text-hier-text outline-none transition focus:border-hier-primary"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-hier-text">
                    Contact phone
                  </span>
                  <input
                    value={form.contact_phone}
                    onChange={(event) =>
                      updateField("contact_phone", event.target.value)
                    }
                    placeholder="Enter contact phone"
                    className="w-full rounded-[18px] border border-hier-border bg-hier-background px-4 py-3 text-sm text-hier-text outline-none transition focus:border-hier-primary"
                  />
                </label>

                <label className="space-y-2 md:col-span-2">
                  <span className="text-sm font-medium text-hier-text">
                    Business address
                  </span>
                  <textarea
                    value={form.address_text}
                    onChange={(event) =>
                      updateField("address_text", event.target.value)
                    }
                    placeholder="Enter company address"
                    rows={4}
                    className="w-full rounded-[18px] border border-hier-border bg-hier-background px-4 py-3 text-sm text-hier-text outline-none transition focus:border-hier-primary"
                  />
                </label>
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <section className="rounded-[28px] border border-hier-border bg-white p-6 shadow-card">
              <div className="mb-5">
                <h2 className="text-lg font-semibold tracking-tight text-hier-text">
                  Branding
                </h2>
                <p className="mt-1 text-sm text-hier-muted">
                  Upload and update the logo used across the business
                  experience.
                </p>
              </div>

              <div className="flex flex-col items-start gap-5">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Company logo"
                    className="h-24 w-24 rounded-[24px] border border-hier-border object-cover shadow-card"
                  />
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center rounded-[24px] border border-hier-border bg-hier-background text-2xl font-semibold text-hier-text shadow-card">
                    {initials}
                  </div>
                )}

                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="rounded-[18px] bg-hier-primary px-4 py-3 text-sm font-semibold text-white shadow-card transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {uploadingAvatar ? "Uploading logo…" : "Upload new logo"}
                  </button>

                  <p className="text-sm text-hier-muted">
                    Recommended: square logo image. This will update the
                    business identity across the dashboard and app.
                  </p>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  onChange={handleAvatarSelected}
                  className="hidden"
                />
              </div>
            </section>

            <section className="rounded-[28px] border border-hier-border bg-white p-6 shadow-card">
              <div className="mb-5">
                <h2 className="text-lg font-semibold tracking-tight text-hier-text">
                  Profile summary
                </h2>
                <p className="mt-1 text-sm text-hier-muted">
                  Quick review before saving.
                </p>
              </div>

              <dl className="space-y-4">
                <div>
                  <dt className="text-xs font-medium uppercase tracking-[0.12em] text-hier-muted">
                    Company
                  </dt>
                  <dd className="mt-1 text-sm text-hier-text">
                    {form.company_name || "Not set"}
                  </dd>
                </div>

                <div>
                  <dt className="text-xs font-medium uppercase tracking-[0.12em] text-hier-muted">
                    Email
                  </dt>
                  <dd className="mt-1 text-sm text-hier-text">
                    {form.contact_email || "Not set"}
                  </dd>
                </div>

                <div>
                  <dt className="text-xs font-medium uppercase tracking-[0.12em] text-hier-muted">
                    Phone
                  </dt>
                  <dd className="mt-1 text-sm text-hier-text">
                    {form.contact_phone || "Not set"}
                  </dd>
                </div>

                <div>
                  <dt className="text-xs font-medium uppercase tracking-[0.12em] text-hier-muted">
                    Verified
                  </dt>
                  <dd className="mt-1 text-sm text-hier-text">
                    {profile?.verified ? "Verified" : "Not verified"}
                  </dd>
                </div>
              </dl>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || !hasChanges}
                  className="rounded-[18px] bg-hier-primary px-5 py-3 text-sm font-semibold text-white shadow-card transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "Saving…" : "Save profile"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setForm(toFormState(profile));
                    setSuccess(null);
                    setError(null);
                  }}
                  disabled={saving}
                  className="rounded-[18px] border border-hier-border bg-white px-5 py-3 text-sm font-semibold text-hier-text transition hover:bg-hier-background disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Reset changes
                </button>
              </div>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}