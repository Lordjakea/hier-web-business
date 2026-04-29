"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Image as ImageIcon,
  Plus,
  Trash2,
  UploadCloud,
  Video,
  X,
} from "lucide-react";

import ImageCropModal from "@/components/media/ImageCropModal";
import { PageHeader } from "@/components/ui/page-header";
import { ApiError } from "@/lib/api";
import { uploadBusinessMediaFile } from "@/lib/business-media-upload";
import {
  archiveBusinessContentPost,
  archiveBusinessPost,
  fetchBusinessContentDetail,
  fetchBusinessPostDetail,
  updateBusinessContentPost,
  updateBusinessJobPost,
  type ManagedPostItem,
} from "@/lib/business-posts";

type FormValues = {
  title: string;
  description: string;
  locationText: string;
  isRemote: boolean;
  isActive: boolean;
  sector: string;
  employmentType: string;
  experience: string;
  salaryMin: string;
  salaryMax: string;
  salaryPeriod: "yearly" | "hourly";
  currency: string;
  tagsText: string;
  hasScreeningQuestions: boolean;
  screeningQuestions: string[];
};

const initialValues: FormValues = {
  title: "",
  description: "",
  locationText: "",
  isRemote: false,
  isActive: true,
  sector: "",
  employmentType: "Full-time",
  experience: "Mid",
  salaryMin: "",
  salaryMax: "",
  salaryPeriod: "yearly",
  currency: "GBP",
  tagsText: "",
  hasScreeningQuestions: false,
  screeningQuestions: [""],
};

function Toggle({
  checked,
  onChange,
  label,
  help,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  help: string;
}) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-[22px] border border-hier-border bg-hier-panel px-4 py-4">
      <div>
        <p className="text-sm font-semibold text-hier-text">{label}</p>
        <p className="mt-1 text-xs leading-5 text-hier-muted">{help}</p>
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative h-7 w-12 rounded-full transition ${
          checked ? "bg-hier-primary" : "bg-zinc-300"
        }`}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${
            checked ? "left-6" : "left-1"
          }`}
        />
      </button>
    </label>
  );
}

function moneyInputToNumber(value: string): number | null {
  const cleaned = value.replace(/[£$, ]/g, "").trim();
  if (!cleaned) return null;
  const parsed = Number(cleaned);
  if (!Number.isFinite(parsed)) return null;
  return parsed;
}

function isSupportedMedia(file: File) {
  return file.type.startsWith("image/") || file.type.startsWith("video/");
}

function PreviewFrame({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="aspect-[4/5] w-full overflow-hidden rounded-[24px] bg-black">
      {children}
    </div>
  );
}

export default function EditPostPage() {
  const params = useParams<{ id: string }>();
  const search = useSearchParams();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const postId = Number(params.id);
  const requestedKind = (search.get("kind") as "job" | "content" | null) || null;

  const [kind, setKind] = useState<"job" | "content">("job");
  const [values, setValues] = useState<FormValues>(initialValues);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [currentMediaType, setCurrentMediaType] = useState<"image" | "video" | null>(null);
  const [currentMediaUrl, setCurrentMediaUrl] = useState<string | null>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedPreviewUrl, setSelectedPreviewUrl] = useState<string | null>(null);
  const [cropSourceUrl, setCropSourceUrl] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError(null);

        let item: ManagedPostItem;

        if (requestedKind === "content") {
          const content = await fetchBusinessContentDetail(postId);
          item = { ...content, kind: "content" };
        } else {
          try {
            const job = await fetchBusinessPostDetail(postId);
            item = { ...job, kind: "job" };
          } catch {
            const content = await fetchBusinessContentDetail(postId);
            item = { ...content, kind: "content" };
          }
        }

        setKind(item.kind);

        const questions = Array.isArray((item as any).application_questions)
          ? ((item as any).application_questions as string[]).filter(Boolean)
          : [];

        setValues({
          title: (item as any).title || "",
          description: item.description || "",
          locationText: (item as any).location_text || (item as any).location || "",
          isRemote: Boolean((item as any).is_remote),
          isActive: item.is_active !== false,
          sector: (item as any).sector || "",
          employmentType: (item as any).employment_type || "Full-time",
          experience: (item as any).experience || "Mid",
          salaryMin:
            (item as any).salary_min != null ? String((item as any).salary_min) : "",
          salaryMax:
            (item as any).salary_max != null ? String((item as any).salary_max) : "",
          salaryPeriod:
            (item as any).salary_period === "hourly" ? "hourly" : "yearly",
          currency: (item as any).currency || "GBP",
          tagsText: Array.isArray((item as any).tags)
            ? (item as any).tags.join(", ")
            : "",
          hasScreeningQuestions: questions.length > 0,
          screeningQuestions: questions.length ? questions : [""],
        });

        const mediaType =
          (item as any).media_type === "video"
            ? "video"
            : (item as any).media_type === "image"
            ? "image"
            : null;

        const mediaUrl =
          mediaType === "video"
            ? (item as any).hero_video_url || null
            : mediaType === "image"
            ? (item as any).hero_image_url || null
            : null;

        setCurrentMediaType(mediaType);
        setCurrentMediaUrl(mediaUrl);
      } catch (e) {
        setError(
          e instanceof ApiError
            ? e.message
            : e instanceof Error
            ? e.message
            : "Could not load post.",
        );
      } finally {
        setLoading(false);
      }
    }

    if (!Number.isNaN(postId)) {
      void load();
    }
  }, [postId, requestedKind]);

  useEffect(() => {
    return () => {
      if (selectedPreviewUrl) URL.revokeObjectURL(selectedPreviewUrl);
      if (cropSourceUrl) URL.revokeObjectURL(cropSourceUrl);
    };
  }, []);

  const title = useMemo(
    () => (kind === "content" ? "Edit content post" : "Edit job post"),
    [kind],
  );

  const selectedMediaKind = selectedFile
    ? selectedFile.type.startsWith("video/")
      ? "video"
      : "image"
    : null;

  function setField<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function updateQuestion(index: number, text: string) {
    setValues((prev) => {
      const next = [...prev.screeningQuestions];
      next[index] = text;
      return { ...prev, screeningQuestions: next };
    });
  }

  function addQuestion() {
    setValues((prev) => ({
      ...prev,
      screeningQuestions: [...prev.screeningQuestions, ""],
    }));
  }

  function removeQuestion(index: number) {
    setValues((prev) => {
      const next = prev.screeningQuestions.filter((_, i) => i !== index);
      return {
        ...prev,
        screeningQuestions: next.length ? next : [""],
      };
    });
  }

  function setSelectedMedia(file: File | null, customPreviewUrl?: string | null) {
    if (selectedPreviewUrl) {
      URL.revokeObjectURL(selectedPreviewUrl);
    }

    if (!file) {
      setSelectedFile(null);
      setSelectedPreviewUrl(null);
      return;
    }

    if (!isSupportedMedia(file)) {
      setError("Only image and video files are supported.");
      return;
    }

    setError(null);
    setSelectedFile(file);
    setSelectedPreviewUrl(customPreviewUrl ?? URL.createObjectURL(file));
  }

  function beginFileFlow(file: File | null) {
    if (!file) return;

    if (!isSupportedMedia(file)) {
      setError("Only image and video files are supported.");
      return;
    }

    setError(null);

    if (file.type.startsWith("image/")) {
      if (cropSourceUrl) URL.revokeObjectURL(cropSourceUrl);
      setCropSourceUrl(URL.createObjectURL(file));
      return;
    }

    setSelectedMedia(file);
  }

  async function handleSave() {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      let updatedPost: any;

      if (kind === "content") {
        updatedPost = await updateBusinessContentPost(postId, {
          title: values.title.trim() || null,
          caption: values.description.trim() || null,
          description: values.description.trim() || null,
          location_text: values.locationText.trim() || null,
          location: values.locationText.trim() || null,
          is_remote: values.isRemote,
          is_active: values.isActive,
          sector: values.sector.trim() || null,
          employment_type: values.employmentType.trim() || null,
          experience: values.experience.trim() || null,
          salary_min: values.salaryMin.trim()
            ? Number(values.salaryMin.replace(/,/g, ""))
            : null,
          salary_max: values.salaryMax.trim()
            ? Number(values.salaryMax.replace(/,/g, ""))
            : null,
          salary_period: values.salaryPeriod,
          currency: values.currency.trim() || "GBP",
          tags: values.tagsText
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
          application_questions: values.hasScreeningQuestions
            ? values.screeningQuestions.map((item) => item.trim()).filter(Boolean)
            : [],
        });

        if (selectedFile) {
          const uploaded = await uploadBusinessMediaFile({
            kind: "content",
            postId,
            file: selectedFile,
          });

          setCurrentMediaType(uploaded.mediaType);
          setCurrentMediaUrl(uploaded.publicUrl);
          setSelectedMedia(null);
        }
      } else {
        const min = values.salaryMin.trim() ? moneyInputToNumber(values.salaryMin) : null;
        const max = values.salaryMax.trim() ? moneyInputToNumber(values.salaryMax) : null;

        if (!values.title.trim()) throw new Error("Title is required.");
        if (!values.description.trim()) throw new Error("Description is required.");
        if (values.salaryMin.trim() && min == null) {
          throw new Error("Minimum salary must be a number.");
        }
        if (values.salaryMax.trim() && max == null) {
          throw new Error("Maximum salary must be a number.");
        }
        if (min != null && max != null && min > max) {
          throw new Error("Minimum salary cannot be greater than maximum salary.");
        }

        updatedPost = await updateBusinessJobPost(postId, {
          title: values.title.trim(),
          description: values.description.trim(),
          location_text: values.locationText.trim() || null,
          location: values.locationText.trim() || null,
          is_remote: values.isRemote,
          is_active: values.isActive,
          sector: values.sector.trim() || null,
          employment_type: values.employmentType.trim() || null,
          experience: values.experience.trim() || null,
          salary_min: min,
          salary_max: max,
          salary_period: values.salaryPeriod,
          currency: values.currency.trim() || "GBP",
          tags: values.tagsText
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
          application_questions: values.hasScreeningQuestions
            ? values.screeningQuestions.map((item) => item.trim()).filter(Boolean)
            : [],
        });

        if (selectedFile) {
          const uploaded = await uploadBusinessMediaFile({
            kind: "job",
            postId,
            file: selectedFile,
          });

          setCurrentMediaType(uploaded.mediaType);
          setCurrentMediaUrl(uploaded.publicUrl);
          setSelectedMedia(null);
        }
      }

      const returnedPost = updatedPost?.post;
      if (returnedPost) {
        const refreshedMediaType =
          returnedPost.media_type === "video"
            ? "video"
            : returnedPost.media_type === "image"
            ? "image"
            : currentMediaType;

        const refreshedMediaUrl =
          refreshedMediaType === "video"
            ? returnedPost.hero_video_url || currentMediaUrl
            : refreshedMediaType === "image"
            ? returnedPost.hero_image_url || currentMediaUrl
            : currentMediaUrl;

        setCurrentMediaType(refreshedMediaType);
        setCurrentMediaUrl(refreshedMediaUrl);
      }

      setSuccess(
        selectedFile ? "Post and media updated successfully." : "Post updated successfully.",
      );

      setTimeout(() => {
        router.push(`/jobs/${postId}?kind=${kind}`);
      }, 700);
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : e instanceof Error
          ? e.message
          : "Could not save changes.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleArchive() {
    try {
      setArchiving(true);
      setError(null);

      if (kind === "content") {
        await archiveBusinessContentPost(postId);
      } else {
        await archiveBusinessPost(postId);
      }

      router.push("/jobs");
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : e instanceof Error
          ? e.message
          : "Could not archive post.",
      );
    } finally {
      setArchiving(false);
    }
  }

  if (loading) {
    return (
      <div className="h-72 animate-pulse rounded-[32px] border border-hier-border bg-white" />
    );
  }

  return (
    <>
      {cropSourceUrl ? (
        <ImageCropModal
          imageSrc={cropSourceUrl}
          title="Crop image to 4:5"
          onCancel={() => {
            URL.revokeObjectURL(cropSourceUrl);
            setCropSourceUrl(null);
          }}
          onComplete={(file, croppedPreviewUrl) => {
            URL.revokeObjectURL(cropSourceUrl);
            setCropSourceUrl(null);
            setSelectedMedia(file, croppedPreviewUrl);
          }}
        />
      ) : null}

      <div className="space-y-6">
        <PageHeader
          eyebrow="Edit"
          title={title}
          description="Update your post details and replace the media if needed."
          action={
            <div className="flex items-center gap-3">
              <Link
                href={`/jobs/${postId}?kind=${kind}`}
                className="inline-flex h-11 items-center gap-2 rounded-2xl border border-hier-border bg-white px-4 text-sm font-semibold text-hier-text transition hover:bg-hier-panel"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to details
              </Link>
            </div>
          }
        />

        {error ? (
          <div className="rounded-[24px] border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="rounded-[24px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
            {success}
          </div>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
          <div className="space-y-6">
            <section className="rounded-[32px] border border-hier-border bg-white p-6 shadow-panel space-y-4">
              <label className="block text-sm font-semibold text-hier-text">
                Title
                <input
                  value={values.title}
                  onChange={(e) => setField("title", e.target.value)}
                  className="mt-2 h-12 w-full rounded-2xl border border-hier-border bg-hier-panel px-4 text-sm outline-none transition focus:border-hier-primary"
                />
              </label>

              <label className="block text-sm font-semibold text-hier-text">
                Description
                <textarea
                  value={values.description}
                  onChange={(e) => setField("description", e.target.value)}
                  className="mt-2 min-h-[150px] w-full rounded-2xl border border-hier-border bg-hier-panel px-4 py-3 text-sm outline-none transition focus:border-hier-primary"
                />
              </label>

              <label className="block text-sm font-semibold text-hier-text">
                Location
                <input
                  value={values.locationText}
                  onChange={(e) => setField("locationText", e.target.value)}
                  className="mt-2 h-12 w-full rounded-2xl border border-hier-border bg-hier-panel px-4 text-sm outline-none transition focus:border-hier-primary"
                />
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <Toggle
                  checked={values.isRemote}
                  onChange={(value) => setField("isRemote", value)}
                  label="Remote role"
                  help="Show this role as remote-friendly."
                />
                <Toggle
                  checked={values.isActive}
                  onChange={(value) => setField("isActive", value)}
                  label="Post active"
                  help="Inactive posts won’t show in the live feed."
                />
              </div>
            </section>

            <section className="rounded-[32px] border border-hier-border bg-white p-6 shadow-panel space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block text-sm font-semibold text-hier-text">
                  Sector
                  <input
                    value={values.sector}
                    onChange={(e) => setField("sector", e.target.value)}
                    className="mt-2 h-12 w-full rounded-2xl border border-hier-border bg-hier-panel px-4 text-sm outline-none transition focus:border-hier-primary"
                  />
                </label>

                <label className="block text-sm font-semibold text-hier-text">
                  Employment type
                  <input
                    value={values.employmentType}
                    onChange={(e) => setField("employmentType", e.target.value)}
                    className="mt-2 h-12 w-full rounded-2xl border border-hier-border bg-hier-panel px-4 text-sm outline-none transition focus:border-hier-primary"
                  />
                </label>

                <label className="block text-sm font-semibold text-hier-text">
                  Experience
                  <input
                    value={values.experience}
                    onChange={(e) => setField("experience", e.target.value)}
                    className="mt-2 h-12 w-full rounded-2xl border border-hier-border bg-hier-panel px-4 text-sm outline-none transition focus:border-hier-primary"
                  />
                </label>

                <label className="block text-sm font-semibold text-hier-text">
                  Currency
                  <input
                    value={values.currency}
                    onChange={(e) => setField("currency", e.target.value)}
                    className="mt-2 h-12 w-full rounded-2xl border border-hier-border bg-hier-panel px-4 text-sm outline-none transition focus:border-hier-primary"
                  />
                </label>
              </div>

              {kind === "job" ? (
                <>
                  <div className="grid gap-4 md:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => setField("salaryPeriod", "yearly")}
                      className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${
                        values.salaryPeriod === "yearly"
                          ? "border-hier-primary bg-hier-soft text-hier-primary"
                          : "border-hier-border bg-hier-panel text-hier-text"
                      }`}
                    >
                      Yearly
                    </button>

                    <button
                      type="button"
                      onClick={() => setField("salaryPeriod", "hourly")}
                      className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${
                        values.salaryPeriod === "hourly"
                          ? "border-hier-primary bg-hier-soft text-hier-primary"
                          : "border-hier-border bg-hier-panel text-hier-text"
                      }`}
                    >
                      Hourly
                    </button>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="block text-sm font-semibold text-hier-text">
                      Salary min
                      <input
                        value={values.salaryMin}
                        onChange={(e) => setField("salaryMin", e.target.value)}
                        className="mt-2 h-12 w-full rounded-2xl border border-hier-border bg-hier-panel px-4 text-sm outline-none transition focus:border-hier-primary"
                      />
                    </label>

                    <label className="block text-sm font-semibold text-hier-text">
                      Salary max
                      <input
                        value={values.salaryMax}
                        onChange={(e) => setField("salaryMax", e.target.value)}
                        className="mt-2 h-12 w-full rounded-2xl border border-hier-border bg-hier-panel px-4 text-sm outline-none transition focus:border-hier-primary"
                      />
                    </label>
                  </div>
                </>
              ) : null}

              <label className="block text-sm font-semibold text-hier-text">
                Tags
                <input
                  value={values.tagsText}
                  onChange={(e) => setField("tagsText", e.target.value)}
                  className="mt-2 h-12 w-full rounded-2xl border border-hier-border bg-hier-panel px-4 text-sm outline-none transition focus:border-hier-primary"
                />
              </label>
            </section>

            <section className="rounded-[32px] border border-hier-border bg-white p-6 shadow-panel space-y-4">
              <Toggle
                checked={values.hasScreeningQuestions}
                onChange={(value) => setField("hasScreeningQuestions", value)}
                label="Ask screening questions"
                help="Candidates must answer these before applying."
              />

              {values.hasScreeningQuestions ? (
                <div className="space-y-3">
                  {values.screeningQuestions.map((question, index) => (
                    <div
                      key={index}
                      className="rounded-[22px] border border-hier-border bg-hier-panel p-4"
                    >
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-hier-text">
                          Question {index + 1}
                        </p>

                        {values.screeningQuestions.length > 1 ? (
                          <button
                            type="button"
                            onClick={() => removeQuestion(index)}
                            className="inline-flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                            Remove
                          </button>
                        ) : null}
                      </div>

                      <textarea
                        value={question}
                        onChange={(e) => updateQuestion(index, e.target.value)}
                        className="min-h-[100px] w-full rounded-2xl border border-hier-border bg-white px-4 py-3 text-sm outline-none transition focus:border-hier-primary"
                      />
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={addQuestion}
                    className="inline-flex h-11 items-center gap-2 rounded-2xl border border-hier-primary bg-hier-soft px-4 text-sm font-semibold text-hier-primary"
                  >
                    <Plus className="h-4 w-4" />
                    Add another question
                  </button>
                </div>
              ) : null}
            </section>
          </div>

          <div className="space-y-6">
            <section className="rounded-[32px] border border-hier-border bg-white p-6 shadow-panel">
              <h3 className="text-xl font-semibold text-hier-text">Media</h3>
              <p className="mt-2 text-sm leading-6 text-hier-muted">
                Images are cropped to 4:5. Videos preview inside a 4:5 frame.
              </p>

              <div className="mt-5 space-y-4">
                {selectedPreviewUrl ? (
                  <div className="overflow-hidden rounded-[24px] border border-hier-border bg-hier-panel">
                    <div className="flex items-center justify-between border-b border-hier-border px-4 py-3">
                      <div className="flex items-center gap-2 text-sm font-semibold text-hier-text">
                        {selectedMediaKind === "video" ? (
                          <Video className="h-4 w-4" />
                        ) : (
                          <ImageIcon className="h-4 w-4" />
                        )}
                        New media selected
                      </div>

                      <button
                        type="button"
                        onClick={() => setSelectedMedia(null)}
                        className="inline-flex h-9 items-center gap-2 rounded-xl border border-hier-border bg-white px-3 text-xs font-semibold text-hier-text"
                      >
                        <X className="h-4 w-4" />
                        Remove
                      </button>
                    </div>

                    <div className="p-4">
                      <PreviewFrame>
                        {selectedMediaKind === "video" ? (
                          <video
                            src={selectedPreviewUrl}
                            controls
                            className="h-full w-full bg-black object-cover"
                          />
                        ) : (
                          <img
                            src={selectedPreviewUrl}
                            alt="Selected preview"
                            className="h-full w-full object-cover"
                          />
                        )}
                      </PreviewFrame>
                    </div>
                  </div>
                ) : currentMediaUrl ? (
                  <div className="overflow-hidden rounded-[24px] border border-hier-border bg-hier-panel">
                    <div className="border-b border-hier-border px-4 py-3 text-sm font-semibold text-hier-text">
                      Current media
                    </div>

                    <div className="p-4">
                      {currentMediaType === "video" ? (
                        <PreviewFrame>
                          <video
                            src={currentMediaUrl}
                            controls
                            className="h-full w-full bg-black object-cover"
                          />
                        </PreviewFrame>
                      ) : currentMediaType === "image" ? (
                        <PreviewFrame>
                          <img
                            src={currentMediaUrl}
                            alt="Current media"
                            className="h-full w-full object-cover"
                          />
                        </PreviewFrame>
                      ) : (
                        <div className="rounded-2xl border border-dashed border-hier-border bg-white px-4 py-10 text-center text-sm text-hier-muted">
                          No media attached.
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-[24px] border border-dashed border-hier-border bg-hier-panel px-4 py-10 text-center text-sm text-hier-muted">
                    No media attached yet.
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    beginFileFlow(file);
                    e.currentTarget.value = "";
                  }}
                />

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl border border-hier-primary bg-hier-soft px-4 text-sm font-semibold text-hier-primary"
                  >
                    <UploadCloud className="h-4 w-4" />
                    {currentMediaUrl ? "Replace media" : "Upload media"}
                  </button>

                  {selectedFile && selectedFile.type.startsWith("image/") && selectedPreviewUrl ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (!selectedFile) return;
                        if (cropSourceUrl) URL.revokeObjectURL(cropSourceUrl);
                        setCropSourceUrl(URL.createObjectURL(selectedFile));
                      }}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-hier-border bg-white px-4 text-sm font-semibold text-hier-text"
                    >
                      <ImageIcon className="h-4 w-4" />
                      Re-crop
                    </button>
                  ) : null}
                </div>

                <p className="text-xs leading-5 text-hier-muted">
                  Supported formats: images and videos. Images are cropped before upload.
                </p>
              </div>
            </section>

            <section className="rounded-[32px] border border-hier-border bg-white p-6 shadow-panel">
              <h3 className="text-xl font-semibold text-hier-text">Save changes</h3>
              <p className="mt-2 text-sm leading-6 text-hier-muted">
                Update the post details here, then return to the full post view.
              </p>

              <div className="mt-5 flex flex-col gap-3">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void handleSave()}
                  className="inline-flex h-11 items-center justify-center rounded-2xl bg-hier-primary px-4 text-sm font-semibold text-white shadow-card transition hover:opacity-95 disabled:opacity-60"
                >
                  {saving ? "Saving…" : "Save changes"}
                </button>

                <button
                  type="button"
                  disabled={archiving}
                  onClick={() => void handleArchive()}
                  className="inline-flex h-11 items-center justify-center rounded-2xl bg-red-600 px-4 text-sm font-semibold text-white shadow-card transition hover:opacity-95 disabled:opacity-60"
                >
                  {archiving ? "Archiving…" : "Archive post"}
                </button>
              </div>
            </section>
          </div>
        </div>
      </div>
    </>
  );
}