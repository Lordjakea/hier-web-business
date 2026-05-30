"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  CalendarClock,
  Check,
  Loader2,
  MessageSquarePlus,
  Pencil,
  Plus,
} from "lucide-react";
import { CallButton } from "@/components/crm/CallButton";
import { CallHistory } from "@/components/crm/CallHistory";
import { PageHeader } from "@/components/ui/page-header";
import {
  convertStaffLead,
  createStaffFollowUp,
  createStaffLeadNote,
  deleteStaffLead,
  fetchStaffLead,
  updateStaffFollowUp,
  updateStaffLead,
  type StaffLead,
} from "@/lib/staff-crm";

type LeadContactForm = {
  name: string;
  job_title: string;
  email: string;
  phone: string;
};

function blankContact(): LeadContactForm {
  return { name: "", job_title: "", email: "", phone: "" };
}

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  try {
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return "-";
  }
}

function formatLeadType(value?: string | null) {
  return value === "candidate" ? "Candidate" : "Business";
}

function normalizeLeadType(value?: string | null) {
  return String(value || "").trim().toLowerCase() === "candidate" ? "candidate" : "business";
}

function formatLeadAddress(lead: StaffLead) {
  return (
    [lead.address_line_1, lead.address_line_2, lead.town, lead.city, lead.postcode]
      .filter(Boolean)
      .join(", ") ||
    lead.address ||
    "-"
  );
}

function normaliseContacts(
  contacts?: StaffLead["contacts"] | LeadContactForm[],
): LeadContactForm[] {
  return (contacts || []).map((contact) => ({
    name: contact.name || "",
    job_title: contact.job_title || "",
    email: contact.email || "",
    phone: contact.phone || "",
  }));
}

function externalUrl(value?: string | null) {
  const trimmed = String(value || "").trim();
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function blankEditForm() {
  return {
    name: "",
    phone: "",
    email: "",
    business_name: "",
    job_title: "",
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

export default function StaffLeadDetailPage() {
  const params = useParams<{ leadId: string }>();
  const router = useRouter();
  const leadId = Number(params.leadId);

  const [lead, setLead] = useState<StaffLead | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState(blankEditForm);
  const [convertRole, setConvertRole] = useState<"business_user" | "user">("business_user");
  const [note, setNote] = useState("");
  const [followUp, setFollowUp] = useState({ title: "Call back", due_at: "", note: "" });

  const loadLead = useCallback(async () => {
    if (!leadId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetchStaffLead(leadId);
      setLead(response.lead);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not load lead.");
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => {
    void loadLead();
  }, [loadLead]);

  useEffect(() => {
    if (!lead) return;
    setEditing(false);
    setEditForm({
      name: lead.name || "",
      phone: lead.phone || "",
      email: lead.email || "",
      business_name: lead.business_name || "",
      job_title: lead.job_title || "",
      contacts: normaliseContacts(lead.contacts),
      lead_type: normalizeLeadType(lead.lead_type),
      website_url: lead.website_url || "",
      source: lead.source || "",
      address_line_1: lead.address_line_1 || "",
      address_line_2: lead.address_line_2 || "",
      town: lead.town || "",
      city: lead.city || "",
      postcode: lead.postcode || "",
      marketing_opt_in: Boolean(lead.marketing_opt_in),
    });
  }, [lead]);

  function addContact() {
    setEditForm((current) => ({ ...current, contacts: [...current.contacts, blankContact()] }));
  }

  function updateContact(index: number, field: keyof LeadContactForm, value: string) {
    setEditForm((current) => ({
      ...current,
      contacts: current.contacts.map((contact, contactIndex) =>
        contactIndex === index ? { ...contact, [field]: value } : contact,
      ),
    }));
  }

  function removeContact(index: number) {
    setEditForm((current) => ({
      ...current,
      contacts: current.contacts.filter((_, contactIndex) => contactIndex !== index),
    }));
  }

  async function handleStatusChange(nextStatus: string) {
    if (!lead) return;
    setSaving(true);
    setError(null);
    try {
      const response = await updateStaffLead(lead.id, { status: nextStatus });
      setLead(response.lead);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not update lead.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveEdit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!lead) return;
    setSaving(true);
    setError(null);
    try {
      const response = await updateStaffLead(lead.id, editForm);
      setLead(response.lead);
      setEditing(false);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not update lead.");
    } finally {
      setSaving(false);
    }
  }

  async function handleAddNote(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!lead || !note.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const response = await createStaffLeadNote(lead.id, note.trim());
      setLead((current) =>
        current ? { ...current, notes: [response.note, ...(current.notes || [])] } : current,
      );
      setNote("");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not add note.");
    } finally {
      setSaving(false);
    }
  }

  async function handleAddFollowUp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!lead || !followUp.title.trim() || !followUp.due_at) return;
    setSaving(true);
    setError(null);
    try {
      const response = await createStaffFollowUp({
        entity_type: "lead",
        entity_id: lead.id,
        title: followUp.title.trim(),
        due_at: new Date(followUp.due_at).toISOString(),
        note: followUp.note.trim() || null,
      });
      setLead((current) =>
        current
          ? { ...current, follow_ups: [response.follow_up, ...(current.follow_ups || [])] }
          : current,
      );
      setFollowUp({ title: "Call back", due_at: "", note: "" });
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not schedule follow-up.");
    } finally {
      setSaving(false);
    }
  }

  async function markFollowUpDone(followUpId: number) {
    setSaving(true);
    setError(null);
    try {
      const response = await updateStaffFollowUp(followUpId, { status: "completed" });
      setLead((current) =>
        current
          ? {
              ...current,
              follow_ups: (current.follow_ups || []).map((item) =>
                item.id === followUpId ? response.follow_up : item,
              ),
            }
          : current,
      );
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not complete follow-up.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteLead() {
    if (!lead) return;
    if (!window.confirm(`Delete lead ${lead.name}?`)) return;
    setSaving(true);
    setError(null);
    try {
      await deleteStaffLead(lead.id);
      router.push("/staff/leads");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not delete lead.");
    } finally {
      setSaving(false);
    }
  }

  async function handleConvertLead() {
    if (!lead) return;
    setSaving(true);
    setError(null);
    try {
      const response = await convertStaffLead(lead.id, { role: convertRole });
      setLead(response.lead);
      if (response.account.basic?.id) {
        router.push(`/staff/accounts/${response.account.basic.id}`);
      }
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Could not convert lead.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <Link
        href="/staff/leads"
        className="inline-flex items-center gap-2 text-sm font-medium text-hier-muted hover:text-hier-text"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Leads
      </Link>

      <PageHeader
        eyebrow="Hier staff"
        title={lead?.name || "Lead detail"}
        description="View lead details, keep notes and schedule staff follow-ups."
      />

      {error ? (
        <div className="flex items-start gap-3 rounded-[24px] border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{error}</p>
        </div>
      ) : null}

      {loading ? (
        <div className="flex min-h-[320px] items-center justify-center rounded-[32px] border border-hier-border bg-white">
          <Loader2 className="h-6 w-6 animate-spin text-hier-primary" />
        </div>
      ) : lead ? (
        <div className="grid gap-6 2xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)] 2xl:items-start">
          <div className="space-y-4">
            <section className="rounded-[28px] border border-hier-border bg-white p-6 shadow-card">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-hier-text">{lead.name}</h2>
                  <p className="mt-1 text-sm text-hier-muted">{lead.email}</p>
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                  <CallButton phoneNumber={lead.phone} leadId={lead.id} />
                  <select
                    value={lead.status || "new"}
                    onChange={(event) => void handleStatusChange(event.target.value)}
                    disabled={saving}
                    className="h-10 rounded-[16px] border border-hier-border bg-hier-panel px-3 text-sm outline-none"
                  >
                    <option value="new">New</option>
                    <option value="contacted">Contacted</option>
                    <option value="qualified">Qualified</option>
                    <option value="closed">Closed</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => setEditing((current) => !current)}
                    disabled={saving}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-[16px] border border-hier-border bg-white px-3 text-sm font-semibold text-hier-text disabled:opacity-50"
                  >
                    <Pencil className="h-4 w-4" />
                    {editing ? "Cancel edit" : "Edit lead"}
                  </button>
                </div>
              </div>

              {editing ? (
                <form className="mt-5 grid gap-3 md:grid-cols-2" onSubmit={handleSaveEdit}>
                  <input value={editForm.name} onChange={(event) => setEditForm((current) => ({ ...current, name: event.target.value }))} placeholder="Name" className="h-11 rounded-[18px] border border-hier-border bg-hier-panel px-4 text-sm outline-none focus:border-hier-primary focus:bg-white" />
                  <input value={editForm.email} onChange={(event) => setEditForm((current) => ({ ...current, email: event.target.value }))} placeholder="Email" className="h-11 rounded-[18px] border border-hier-border bg-hier-panel px-4 text-sm outline-none focus:border-hier-primary focus:bg-white" />
                  <input value={editForm.phone} onChange={(event) => setEditForm((current) => ({ ...current, phone: event.target.value }))} placeholder="Number" className="h-11 rounded-[18px] border border-hier-border bg-hier-panel px-4 text-sm outline-none focus:border-hier-primary focus:bg-white" />
                  <input value={editForm.business_name} onChange={(event) => setEditForm((current) => ({ ...current, business_name: event.target.value }))} placeholder="Business name" className="h-11 rounded-[18px] border border-hier-border bg-hier-panel px-4 text-sm outline-none focus:border-hier-primary focus:bg-white" />
                  <input value={editForm.job_title} onChange={(event) => setEditForm((current) => ({ ...current, job_title: event.target.value }))} placeholder="Job title (optional)" className="h-11 rounded-[18px] border border-hier-border bg-hier-panel px-4 text-sm outline-none focus:border-hier-primary focus:bg-white" />
                  <select value={editForm.lead_type} onChange={(event) => setEditForm((current) => ({ ...current, lead_type: event.target.value }))} className="h-11 rounded-[18px] border border-hier-border bg-hier-panel px-4 text-sm outline-none focus:border-hier-primary focus:bg-white">
                    <option value="business">Business lead</option>
                    <option value="candidate">Candidate lead</option>
                  </select>
                  <input value={editForm.website_url} onChange={(event) => setEditForm((current) => ({ ...current, website_url: event.target.value }))} placeholder="Website link (optional)" className="h-11 rounded-[18px] border border-hier-border bg-hier-panel px-4 text-sm outline-none focus:border-hier-primary focus:bg-white" />
                  <div className="rounded-[20px] border border-hier-border bg-hier-panel p-4 sm:col-span-2">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-hier-text">Additional contacts</p>
                      <button type="button" onClick={addContact} className="rounded-[14px] border border-hier-border bg-white px-3 py-2 text-xs font-semibold text-hier-text">
                        Add contact
                      </button>
                    </div>
                    {editForm.contacts.length ? (
                      <div className="mt-3 grid gap-3">
                        {editForm.contacts.map((contact, index) => (
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
                  <input value={editForm.source} onChange={(event) => setEditForm((current) => ({ ...current, source: event.target.value }))} placeholder="Where did you hear about us? (optional)" className="h-11 rounded-[18px] border border-hier-border bg-hier-panel px-4 text-sm outline-none focus:border-hier-primary focus:bg-white" />
                  <input value={editForm.address_line_1} onChange={(event) => setEditForm((current) => ({ ...current, address_line_1: event.target.value }))} placeholder="Address first line" className="h-11 rounded-[18px] border border-hier-border bg-hier-panel px-4 text-sm outline-none focus:border-hier-primary focus:bg-white" />
                  <input value={editForm.address_line_2} onChange={(event) => setEditForm((current) => ({ ...current, address_line_2: event.target.value }))} placeholder="Address second line" className="h-11 rounded-[18px] border border-hier-border bg-hier-panel px-4 text-sm outline-none focus:border-hier-primary focus:bg-white" />
                  <input value={editForm.town} onChange={(event) => setEditForm((current) => ({ ...current, town: event.target.value }))} placeholder="Town" className="h-11 rounded-[18px] border border-hier-border bg-hier-panel px-4 text-sm outline-none focus:border-hier-primary focus:bg-white" />
                  <input value={editForm.city} onChange={(event) => setEditForm((current) => ({ ...current, city: event.target.value }))} placeholder="City" className="h-11 rounded-[18px] border border-hier-border bg-hier-panel px-4 text-sm outline-none focus:border-hier-primary focus:bg-white" />
                  <input value={editForm.postcode} onChange={(event) => setEditForm((current) => ({ ...current, postcode: event.target.value }))} placeholder="Postcode" className="h-11 rounded-[18px] border border-hier-border bg-hier-panel px-4 text-sm outline-none focus:border-hier-primary focus:bg-white" />
                  <label className="flex items-center gap-3 rounded-[18px] border border-hier-border bg-hier-panel p-3 text-sm text-hier-text md:col-span-2">
                    <input type="checkbox" checked={editForm.marketing_opt_in} onChange={(event) => setEditForm((current) => ({ ...current, marketing_opt_in: event.target.checked }))} />
                    Marketing opt in
                  </label>
                  <button type="submit" disabled={saving} className="inline-flex h-11 items-center justify-center gap-2 rounded-[18px] bg-hier-primary px-4 text-sm font-semibold text-white disabled:opacity-50 md:col-span-2">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    Save lead
                  </button>
                </form>
              ) : (
                <>
                  <div className="mt-5 grid gap-3 text-sm md:grid-cols-2">
                    <p><span className="block font-semibold text-hier-text">Phone</span>{lead.phone || "-"}</p>
                    <p><span className="block font-semibold text-hier-text">Business</span>{lead.business_name || "-"}</p>
                    <p><span className="block font-semibold text-hier-text">Job title</span>{lead.job_title || "-"}</p>
                    <p><span className="block font-semibold text-hier-text">Lead type</span>{formatLeadType(lead.lead_type)}</p>
                    <p className="md:col-span-2">
                      <span className="block font-semibold text-hier-text">Website</span>
                      {lead.website_url ? (
                        <a href={externalUrl(lead.website_url)} target="_blank" rel="noreferrer" className="break-all font-semibold text-hier-primary hover:underline">
                          {lead.website_url}
                        </a>
                      ) : (
                        "-"
                      )}
                    </p>
                    <p><span className="block font-semibold text-hier-text">Heard about us</span>{lead.source || "-"}</p>
                    <p><span className="block font-semibold text-hier-text">Marketing opt in</span>{lead.marketing_opt_in ? "Yes" : "No"}</p>
                    <p className="md:col-span-2"><span className="block font-semibold text-hier-text">Address</span>{formatLeadAddress(lead)}</p>
                  </div>
                  {(lead.contacts || []).length ? (
                    <div className="mt-5 rounded-[20px] border border-hier-border bg-hier-panel p-4">
                      <p className="text-sm font-semibold text-hier-text">Additional contacts</p>
                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        {(lead.contacts || []).map((contact, index) => (
                          <div key={`${contact.email || contact.name || "contact"}-${index}`} className="rounded-[16px] bg-white p-3 text-sm">
                            <p className="font-semibold text-hier-text">{contact.name || "Unnamed contact"}</p>
                            <p className="mt-1 text-hier-text">{contact.job_title || "No job title"}</p>
                            <p className="mt-1 break-all text-hier-text">{contact.email || "-"}</p>
                            <p className="mt-1 text-hier-text">{contact.phone || "-"}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </>
              )}

              <div className="mt-4 grid gap-2">
                <select
                  value={convertRole}
                  onChange={(event) => setConvertRole(event.target.value as "business_user" | "user")}
                  className="h-10 rounded-[16px] border border-hier-border bg-hier-panel px-3 text-sm outline-none"
                >
                  <option value="business_user">Convert to business account</option>
                  <option value="user">Convert to candidate account</option>
                </select>
                <button
                  type="button"
                  disabled={saving || Boolean(lead.converted_user_id)}
                  onClick={() => void handleConvertLead()}
                  className="inline-flex h-10 items-center justify-center rounded-[16px] bg-hier-primary px-4 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {lead.converted_user_id ? "Converted" : "Convert lead"}
                </button>
              </div>
            </section>

            <button
              type="button"
              disabled={saving}
              onClick={() => void handleDeleteLead()}
              className="inline-flex h-11 w-full items-center justify-center rounded-[18px] border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-800 disabled:opacity-50"
            >
              Delete lead
            </button>
          </div>

          <aside className="space-y-4">
            <CallHistory leadId={lead.id} />

            <section className="rounded-[28px] border border-hier-border bg-white p-5 shadow-card">
              <h2 className="flex items-center gap-2 text-base font-semibold text-hier-text">
                <CalendarClock className="h-4 w-4" />
                Follow-ups
              </h2>
              <form className="mt-4 space-y-3" onSubmit={handleAddFollowUp}>
                <input
                  value={followUp.title}
                  onChange={(event) => setFollowUp((current) => ({ ...current, title: event.target.value }))}
                  className="h-11 w-full rounded-[18px] border border-hier-border bg-hier-panel px-4 text-sm outline-none focus:border-hier-primary focus:bg-white"
                  placeholder="Follow-up title"
                />
                <input
                  type="datetime-local"
                  value={followUp.due_at}
                  onChange={(event) => setFollowUp((current) => ({ ...current, due_at: event.target.value }))}
                  className="h-11 w-full rounded-[18px] border border-hier-border bg-hier-panel px-4 text-sm outline-none focus:border-hier-primary focus:bg-white"
                />
                <textarea
                  value={followUp.note}
                  onChange={(event) => setFollowUp((current) => ({ ...current, note: event.target.value }))}
                  rows={3}
                  className="w-full resize-none rounded-[18px] border border-hier-border bg-hier-panel p-4 text-sm outline-none focus:border-hier-primary focus:bg-white"
                  placeholder="Call notes"
                />
                <button
                  type="submit"
                  disabled={saving || !followUp.title.trim() || !followUp.due_at}
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-[18px] bg-hier-primary px-4 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Schedule follow-up
                </button>
              </form>
              <div className="mt-4 space-y-2">
                {(lead.follow_ups || []).map((item) => (
                  <div key={item.id} className="rounded-[18px] border border-hier-border bg-hier-panel p-3 text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-hier-text">{item.title}</p>
                        <p className="text-hier-muted">{formatDateTime(item.due_at)}</p>
                      </div>
                      {item.status !== "completed" ? (
                        <button
                          type="button"
                          onClick={() => void markFollowUpDone(item.id)}
                          className="rounded-full bg-white p-2 text-hier-primary"
                          aria-label="Complete follow-up"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                      ) : null}
                    </div>
                    {item.note ? <p className="mt-2 text-hier-text">{item.note}</p> : null}
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[28px] border border-hier-border bg-white p-5 shadow-card">
              <h2 className="flex items-center gap-2 text-base font-semibold text-hier-text">
                <MessageSquarePlus className="h-4 w-4" />
                Notes
              </h2>
              <form className="mt-4 space-y-3" onSubmit={handleAddNote}>
                <textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  rows={4}
                  className="w-full resize-none rounded-[18px] border border-hier-border bg-hier-panel p-4 text-sm outline-none focus:border-hier-primary focus:bg-white"
                  placeholder="Add lead note"
                />
                <button
                  type="submit"
                  disabled={saving || !note.trim()}
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-[18px] bg-hier-primary px-4 text-sm font-semibold text-white disabled:opacity-50"
                >
                  Add note
                </button>
              </form>
              <div className="mt-4 space-y-2">
                {(lead.notes || []).map((item) => (
                  <div key={item.id} className="rounded-[18px] border border-hier-border bg-hier-panel p-3 text-sm text-hier-text">
                    <p>{item.note}</p>
                    <p className="mt-2 text-xs text-hier-text">{formatDateTime(item.created_at)}</p>
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </div>
      ) : (
        <div className="rounded-[32px] border border-hier-border bg-white p-8 text-sm text-hier-muted">
          Lead not found.
        </div>
      )}
    </div>
  );
}
