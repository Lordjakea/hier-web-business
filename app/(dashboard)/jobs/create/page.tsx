"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import Cropper from "react-easy-crop";
import {
  ArrowLeft,
  BriefcaseBusiness,
  FileText,
  UploadCloud,
  X,
} from "lucide-react";

import { PageHeader } from "@/components/ui/page-header";
import { ApiError } from "@/lib/api";
import { uploadBusinessMediaFile } from "@/lib/business-media-upload";
import {
  createBusinessContentPost,
  createBusinessJobPost,
} from "@/lib/business-posts";

type ContentType = "post" | "job";
type SalaryMode = "single" | "range";
type SalaryPeriod = "yearly" | "hourly";

type FormValues = {
  title: string;
  description: string;
  locationText: string;
  workMode: "office" | "hybrid" | "remote";
  isGig: boolean;
  sector: string;
  employmentType: string;
  experience: string;
  salaryMode: SalaryMode;
  salaryPeriod: SalaryPeriod;
  salarySingle: string;
  salaryMin: string;
  salaryMax: string;
  budget: string;
  currency: string;
  tagsText: string;
  hasScreeningQuestions: boolean;
  screeningQuestions: string[];
};

type VideoEditSettings = {
  startSeconds: number;
  endSeconds: number;
  cropXPercent: number;
  cropYPercent: number;
  zoom: number;
  originalWidth: number;
  originalHeight: number;
  originalDuration: number;
};

const initialValues: FormValues = {
  title: "",
  description: "",
  locationText: "",
  workMode: "office",
  isGig: false,
  sector: "",
  employmentType: "Full-time",
  experience: "Mid",
  salaryMode: "range",
  salaryPeriod: "yearly",
  salarySingle: "",
  salaryMin: "",
  salaryMax: "",
  budget: "",
  currency: "GBP",
  tagsText: "",
  hasScreeningQuestions: false,
  screeningQuestions: [""],
};

const TARGET_ASPECT = 4 / 5;
const MAX_VIDEO_DURATION_SECONDS = 90;

function normaliseMoneyInput(text: string) {
  return text.replace(/[£$, ]/g, "");
}

function isBlockedSalaryText(text: string) {
  const cleaned = text.trim().toLowerCase();
  return ["na", "n/a", "not applicable", "none", "nil", "zero"].includes(cleaned);
}

function parsePositiveMoney(raw: string): number | null {
  const cleaned = normaliseMoneyInput(raw);
  if (!cleaned || isBlockedSalaryText(cleaned)) return null;

  const value = Number(cleaned);
  if (!Number.isFinite(value) || value <= 0) return null;

  return value;
}

function acceptForFile(file: File) {
  const type = file.type || "";
  const name = file.name.toLowerCase();

  return (
    type.startsWith("image/") ||
    type.startsWith("video/") ||
    /\.(jpg|jpeg|png|webp|heic|mp4|mov|m4v|webm)$/i.test(name)
  );
}

function isImageFile(file: File) {
  const type = file.type || "";
  const name = file.name.toLowerCase();

  return (
    type.startsWith("image/") || /\.(jpg|jpeg|png|webp|heic)$/i.test(name)
  );
}

function isVideoFile(file: File) {
  const type = file.type || "";
  const name = file.name.toLowerCase();

  return type.startsWith("video/") || /\.(mp4|mov|m4v|webm)$/i.test(name);
}

function formatSeconds(value: number) {
  if (!Number.isFinite(value)) return "0:00";
  const safe = Math.max(0, Math.round(value));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

async function readVideoMetadata(file: File): Promise<{
  width: number;
  height: number;
  duration: number;
}> {
  const url = URL.createObjectURL(file);

  try {
    const video = await new Promise<HTMLVideoElement>((resolve, reject) => {
      const el = document.createElement("video");
      el.preload = "metadata";
      el.onloadedmetadata = () => resolve(el);
      el.onerror = reject;
      el.src = url;
    });

    return {
      width: video.videoWidth,
      height: video.videoHeight,
      duration: video.duration,
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function createCroppedImageFile(params: {
  file: File;
  imageSrc: string;
  cropPixels: { width: number; height: number; x: number; y: number };
}): Promise<File> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = params.imageSrc;
  });

  const canvas = document.createElement("canvas");
  canvas.width = params.cropPixels.width;
  canvas.height = params.cropPixels.height;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not prepare image crop.");

  ctx.drawImage(
    image,
    params.cropPixels.x,
    params.cropPixels.y,
    params.cropPixels.width,
    params.cropPixels.height,
    0,
    0,
    params.cropPixels.width,
    params.cropPixels.height
  );

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.92)
  );

  if (!blob) throw new Error("Could not export cropped image.");

  const outputName = params.file.name.replace(/\.[^.]+$/, "") + ".jpg";
  return new File([blob], outputName, { type: "image/jpeg" });
}

export default function JobsCreatePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoEditorPreviewRef = useRef<HTMLVideoElement | null>(null);

  const [contentType, setContentType] = useState<ContentType>("post");
  const [values, setValues] = useState<FormValues>(initialValues);
  const [loading, setLoading] = useState(false);
  const [processingMedia, setProcessingMedia] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedVideoEdit, setSelectedVideoEdit] =
    useState<VideoEditSettings | null>(null);

  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);
  const [pendingImageSrc, setPendingImageSrc] = useState<string | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<{
    width: number;
    height: number;
    x: number;
    y: number;
  } | null>(null);

  const [pendingVideoFile, setPendingVideoFile] = useState<File | null>(null);
  const [pendingVideoPreviewUrl, setPendingVideoPreviewUrl] = useState<
    string | null
  >(null);
  const [pendingVideoMetadata, setPendingVideoMetadata] = useState<{
    width: number;
    height: number;
    duration: number;
  } | null>(null);
  const [videoEditorOpen, setVideoEditorOpen] = useState(false);
  const [videoTrimStart, setVideoTrimStart] = useState(0);
  const [videoTrimEnd, setVideoTrimEnd] = useState(0);
  const [videoCropX, setVideoCropX] = useState(50);
  const [videoCropY, setVideoCropY] = useState(50);
  const [videoZoom, setVideoZoom] = useState(1);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      if (pendingImageSrc) URL.revokeObjectURL(pendingImageSrc);
      if (pendingVideoPreviewUrl) URL.revokeObjectURL(pendingVideoPreviewUrl);
    };
  }, [previewUrl, pendingImageSrc, pendingVideoPreviewUrl]);

  const isPost = contentType === "post";
  const isJob = contentType === "job";
  const isGig = isJob && values.isGig;

  const selectedMediaKind =
    selectedFile?.type.startsWith("video/") || selectedFile?.name.match(/\.(mp4|mov|m4v|webm)$/i)
      ? "video"
      : selectedFile
      ? "image"
      : "none";

  const videoClipLength = Math.max(0, videoTrimEnd - videoTrimStart);

  const summaryTitle = useMemo(() => {
    if (isPost) return values.description.trim() || "Standard content post";
    return values.title.trim() || (isGig ? "Untitled gig" : "Untitled job");
  }, [isPost, isGig, values.description, values.title]);

  function onChange<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function clearSelectedFile() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(null);
    setPreviewUrl(null);
    setSelectedVideoEdit(null);
  }

  function commitSelectedFile(file: File, videoEdit?: VideoEditSettings | null) {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setSelectedVideoEdit(videoEdit ?? null);
  }

  function closeVideoEditor() {
    setVideoEditorOpen(false);
    setPendingVideoFile(null);
    setPendingVideoMetadata(null);
    setVideoTrimStart(0);
    setVideoTrimEnd(0);
    setVideoCropX(50);
    setVideoCropY(50);
    setVideoZoom(1);

    if (pendingVideoPreviewUrl) {
      URL.revokeObjectURL(pendingVideoPreviewUrl);
    }

    setPendingVideoPreviewUrl(null);
  }

  async function handleIncomingFile(file: File) {
    try {
      if (!acceptForFile(file)) {
        setError("Only image and video files are supported.");
        return;
      }

      setError(null);
      setSuccess(null);

      if (isImageFile(file)) {
        const src = URL.createObjectURL(file);

        if (pendingImageSrc) URL.revokeObjectURL(pendingImageSrc);

        setPendingImageFile(file);
        setPendingImageSrc(src);
        setCrop({ x: 0, y: 0 });
        setZoom(1);
        setCroppedAreaPixels(null);
        setCropOpen(true);
        return;
      }

      if (!isVideoFile(file)) {
        setError("Unsupported media file.");
        return;
      }

      setProcessingMedia(true);

      const metadata = await readVideoMetadata(file);

      if (!Number.isFinite(metadata.duration)) {
        setError("Could not read this video's duration.");
        return;
      }

      const preview = URL.createObjectURL(file);

      if (pendingVideoPreviewUrl) {
        URL.revokeObjectURL(pendingVideoPreviewUrl);
      }

      setPendingVideoFile(file);
      setPendingVideoPreviewUrl(preview);
      setPendingVideoMetadata(metadata);
      setVideoTrimStart(0);
      setVideoTrimEnd(Math.min(metadata.duration, MAX_VIDEO_DURATION_SECONDS));
      setVideoCropX(50);
      setVideoCropY(50);
      setVideoZoom(1);
      setVideoEditorOpen(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read this file.");
    } finally {
      setProcessingMedia(false);
    }
  }

  function confirmVideoEdit() {
    if (!pendingVideoFile || !pendingVideoMetadata) {
      setError("No video selected.");
      return;
    }

    if (videoTrimEnd <= videoTrimStart) {
      setError("End time must be after start time.");
      return;
    }

    if (videoClipLength > MAX_VIDEO_DURATION_SECONDS) {
      setError(
        `Video clips must be ${formatSeconds(MAX_VIDEO_DURATION_SECONDS)} or less.`
      );
      return;
    }

    const editSettings: VideoEditSettings = {
      startSeconds: videoTrimStart,
      endSeconds: videoTrimEnd,
      cropXPercent: videoCropX,
      cropYPercent: videoCropY,
      zoom: videoZoom,
      originalWidth: pendingVideoMetadata.width,
      originalHeight: pendingVideoMetadata.height,
      originalDuration: pendingVideoMetadata.duration,
    };

    commitSelectedFile(pendingVideoFile, editSettings);
    closeVideoEditor();
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
      return { ...prev, screeningQuestions: next.length ? next : [""] };
    });
  }

  async function confirmCrop() {
    if (!pendingImageFile || !pendingImageSrc || !croppedAreaPixels) {
      setError("Could not prepare crop.");
      return;
    }

    try {
      setProcessingMedia(true);
      setError(null);

      const cropped = await createCroppedImageFile({
        file: pendingImageFile,
        imageSrc: pendingImageSrc,
        cropPixels: croppedAreaPixels,
      });

      commitSelectedFile(cropped);
      setCropOpen(false);
      setPendingImageFile(null);

      if (pendingImageSrc) URL.revokeObjectURL(pendingImageSrc);
      setPendingImageSrc(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not crop image.");
    } finally {
      setProcessingMedia(false);
    }
  }

  async function handleSubmit() {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      // selectedVideoEdit is now available here.
      // Next backend step: pass this metadata through uploadBusinessMediaFile
      // and process the final video server-side.

      if (isPost) {
        if (!values.description.trim() && !selectedFile) {
          throw new Error(
            "Add a caption or upload media before publishing a standard post."
          );
        }

        const created = await createBusinessContentPost({
          caption: values.description.trim() || null,
          description: values.description.trim() || null,
        });

        if (selectedFile) {
          await uploadBusinessMediaFile({
            kind: "content",
            postId: created.post.id,
            file: selectedFile,
            videoEdit: selectedVideoEdit,
          });
        }

        setSuccess("Content post published successfully.");
      } else {
        if (!values.title.trim()) throw new Error("Title is required.");
        if (!values.description.trim()) throw new Error("Description is required.");

        const currency = values.currency.trim().toUpperCase();
        if (!currency) throw new Error("Currency is required.");

        let salaryMin: number | null = null;
        let salaryMax: number | null = null;
        let budget: number | null = null;

        if (isGig) {
          budget = parsePositiveMoney(values.budget);
          if (budget == null) {
            throw new Error("Budget must be a number greater than 0.");
          }
        } else if (values.salaryMode === "single") {
          const parsed = parsePositiveMoney(values.salarySingle);
          if (parsed == null) {
            throw new Error("Salary must be a number greater than 0.");
          }

          salaryMin = parsed;
          salaryMax = parsed;
        } else {
          salaryMin = parsePositiveMoney(values.salaryMin);
          salaryMax = parsePositiveMoney(values.salaryMax);

          if (salaryMin == null) {
            throw new Error("Minimum salary must be a number greater than 0.");
          }

          if (salaryMax == null) {
            throw new Error("Maximum salary must be a number greater than 0.");
          }

          if (salaryMin > salaryMax) {
            throw new Error("Minimum salary cannot be greater than maximum salary.");
          }
        }

        const tags = values.tagsText
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean);

        const questions = values.hasScreeningQuestions
          ? values.screeningQuestions.map((item) => item.trim()).filter(Boolean)
          : [];

        if (values.hasScreeningQuestions && !questions.length) {
          throw new Error(
            "Add at least one screening question or turn the toggle off."
          );
        }

        const created = await createBusinessJobPost({
          content_type: "job",
          is_gig: values.isGig,
          title: values.title.trim(),
          description: values.description.trim(),
          location_text: !isGig ? values.locationText.trim() || null : null,
          location: !isGig ? values.locationText.trim() || null : null,
          is_remote: values.workMode === "remote",
          sector: !isGig ? values.sector.trim() || null : null,
          employment_type: !isGig ? values.employmentType.trim() || null : null,
          experience: !isGig ? values.experience.trim() || null : null,
          salary_min: !isGig ? salaryMin : null,
          salary_max: !isGig ? salaryMax : null,
          salary_period: !isGig ? values.salaryPeriod : null,
          budget,
          currency,
          tags,
          application_questions: questions,
          media_type: null,
          hero_image_url: null,
          hero_video_url: null,
          is_active: true,
        });

        if (selectedFile) {
          await uploadBusinessMediaFile({
            kind: "job",
            postId: created.post.id,
            file: selectedFile,
            videoEdit: selectedVideoEdit,
          });
        }

        setSuccess(
          values.isGig ? "Gig published successfully." : "Job published successfully."
        );
      }

      setTimeout(() => router.push("/jobs"), 700);
    } catch (e) {
      setError(
        e instanceof ApiError
          ? e.message
          : e instanceof Error
          ? e.message
          : "Could not publish right now."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Create"
        title="Create jobs and content from web"
        description="Upload media from the dashboard. Images are cropped to 4:5, videos can be visually framed and trimmed before upload."
        action={
          <Link
            href="/jobs"
            className="inline-flex h-11 items-center gap-2 rounded-2xl border border-hier-border bg-white px-4 text-sm font-semibold text-hier-text transition hover:bg-hier-panel"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to posts
          </Link>
        }
      />

      {processingMedia ? (
        <div className="rounded-[24px] border border-hier-border bg-hier-panel px-4 py-3 text-sm font-semibold text-hier-text">
          Preparing media...
        </div>
      ) : null}

      {cropOpen && pendingImageSrc ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-3xl rounded-[28px] bg-white p-4 shadow-2xl">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-hier-text">Crop image</h3>
                <p className="text-sm text-hier-muted">
                  Use a 4:5 crop to match the app feed.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setCropOpen(false);
                  setPendingImageFile(null);
                  if (pendingImageSrc) URL.revokeObjectURL(pendingImageSrc);
                  setPendingImageSrc(null);
                }}
                className="inline-flex h-10 items-center gap-2 rounded-2xl border border-hier-border bg-white px-4 text-sm font-semibold text-hier-text"
              >
                <X className="h-4 w-4" />
                Cancel
              </button>
            </div>

            <div className="relative h-[65vh] overflow-hidden rounded-[24px] bg-black">
              <Cropper
                image={pendingImageSrc}
                crop={crop}
                zoom={zoom}
                aspect={TARGET_ASPECT}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={(_, pixels) => setCroppedAreaPixels(pixels)}
              />
            </div>

            <div className="mt-4 flex items-center gap-4">
              <input
                type="range"
                min={1}
                max={3}
                step={0.01}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full"
              />

              <button
                type="button"
                onClick={() => void confirmCrop()}
                disabled={processingMedia}
                className="inline-flex h-11 items-center rounded-2xl bg-hier-primary px-5 text-sm font-semibold text-white disabled:opacity-60"
              >
                {processingMedia ? "Cropping..." : "Use crop"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {videoEditorOpen && pendingVideoFile && pendingVideoPreviewUrl ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-3xl rounded-[28px] bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-hier-text">
                  Edit video
                </h3>
                <p className="text-sm text-hier-muted">
                  Frame the video for 4:5 and choose the exact section to upload.
                </p>
              </div>

              <button
                type="button"
                onClick={closeVideoEditor}
                className="inline-flex h-10 items-center gap-2 rounded-2xl border border-hier-border bg-white px-4 text-sm font-semibold text-hier-text"
              >
                <X className="h-4 w-4" />
                Cancel
              </button>
            </div>

            <div className="grid gap-5 lg:grid-cols-[0.8fr,1.2fr]">
              <div className="mx-auto aspect-[4/5] w-full max-w-[320px] overflow-hidden rounded-[28px] bg-black">
                <video
                  ref={videoEditorPreviewRef}
                  src={pendingVideoPreviewUrl}
                  controls
                  className="h-full w-full"
                  style={{
                    objectFit: "cover",
                    objectPosition: `${videoCropX}% ${videoCropY}%`,
                    transform: `scale(${videoZoom})`,
                  }}
                />
              </div>

              <div className="space-y-4">
                <div className="rounded-[24px] border border-hier-border bg-hier-panel p-4">
                  <p className="text-sm font-semibold text-hier-text">
                    Clip length: {formatSeconds(videoClipLength)}
                  </p>
                  <p className="mt-1 text-sm text-hier-muted">
                    Start {formatSeconds(videoTrimStart)} · End{" "}
                    {formatSeconds(videoTrimEnd)}
                  </p>

                  <label className="mt-4 block text-xs font-semibold uppercase tracking-[0.18em] text-hier-muted">
                    Start
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={Math.max(0, (pendingVideoMetadata?.duration ?? 0) - 1)}
                    step={0.5}
                    value={videoTrimStart}
                    onChange={(e) => {
                      const next = Number(e.target.value);
                      const maxEnd = pendingVideoMetadata?.duration ?? 0;
                      const nextEnd = Math.min(
                        Math.max(videoTrimEnd, next + 1),
                        Math.min(maxEnd, next + MAX_VIDEO_DURATION_SECONDS)
                      );

                      setVideoTrimStart(next);
                      setVideoTrimEnd(nextEnd);

                      if (videoEditorPreviewRef.current) {
                        videoEditorPreviewRef.current.currentTime = next;
                      }
                    }}
                    className="mt-2 w-full"
                  />

                  <label className="mt-4 block text-xs font-semibold uppercase tracking-[0.18em] text-hier-muted">
                    End
                  </label>
                  <input
                    type="range"
                    min={Math.min(
                      pendingVideoMetadata?.duration ?? 0,
                      videoTrimStart + 1
                    )}
                    max={Math.min(
                      pendingVideoMetadata?.duration ?? 0,
                      videoTrimStart + MAX_VIDEO_DURATION_SECONDS
                    )}
                    step={0.5}
                    value={videoTrimEnd}
                    onChange={(e) => setVideoTrimEnd(Number(e.target.value))}
                    className="mt-2 w-full"
                  />

                  {videoClipLength > MAX_VIDEO_DURATION_SECONDS ? (
                    <p className="mt-2 text-sm font-semibold text-red-600">
                      Clips must be {formatSeconds(MAX_VIDEO_DURATION_SECONDS)} or less.
                    </p>
                  ) : null}
                </div>

                <div className="rounded-[24px] border border-hier-border bg-hier-panel p-4">
                  <p className="text-sm font-semibold text-hier-text">
                    4:5 frame position
                  </p>

                  <label className="mt-4 block text-xs font-semibold uppercase tracking-[0.18em] text-hier-muted">
                    Horizontal position
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={videoCropX}
                    onChange={(e) => setVideoCropX(Number(e.target.value))}
                    className="mt-2 w-full"
                  />

                  <label className="mt-4 block text-xs font-semibold uppercase tracking-[0.18em] text-hier-muted">
                    Vertical position
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={videoCropY}
                    onChange={(e) => setVideoCropY(Number(e.target.value))}
                    className="mt-2 w-full"
                  />

                  <label className="mt-4 block text-xs font-semibold uppercase tracking-[0.18em] text-hier-muted">
                    Zoom
                  </label>
                  <input
                    type="range"
                    min={1}
                    max={1.8}
                    step={0.01}
                    value={videoZoom}
                    onChange={(e) => setVideoZoom(Number(e.target.value))}
                    className="mt-2 w-full"
                  />
                </div>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={closeVideoEditor}
                className="inline-flex h-11 items-center rounded-2xl border border-hier-border bg-white px-5 text-sm font-semibold text-hier-text"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={confirmVideoEdit}
                className="inline-flex h-11 items-center rounded-2xl bg-hier-primary px-5 text-sm font-semibold text-white"
              >
                Use video
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.3fr,0.7fr]">
        <div className="space-y-6">
          <section className="rounded-[32px] border border-hier-border bg-white p-6 shadow-panel">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-hier-muted">
              Step 1
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-hier-text">
              Choose what you are creating
            </h2>
            <p className="mt-2 text-sm leading-6 text-hier-muted">
              Posts are for engagement. Jobs are for applications.
            </p>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <button
                type="button"
                onClick={() => {
                  setContentType("post");
                  onChange("isGig", false);
                }}
                className={`rounded-[24px] border p-5 text-left transition ${
                  isPost
                    ? "border-hier-primary bg-hier-soft"
                    : "border-hier-border bg-hier-panel hover:bg-white"
                }`}
              >
                <FileText className="h-5 w-5 text-hier-primary" />
                <p className="mt-3 text-lg font-semibold text-hier-text">
                  Standard post
                </p>
                <p className="mt-2 text-sm leading-6 text-hier-muted">
                  Create content for updates, wins, and engagement.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setContentType("job")}
                className={`rounded-[24px] border p-5 text-left transition ${
                  isJob
                    ? "border-hier-primary bg-hier-soft"
                    : "border-hier-border bg-hier-panel hover:bg-white"
                }`}
              >
                <BriefcaseBusiness className="h-5 w-5 text-hier-primary" />
                <p className="mt-3 text-lg font-semibold text-hier-text">
                  Job or gig
                </p>
                <p className="mt-2 text-sm leading-6 text-hier-muted">
                  Publish structured hiring roles with salary or budget.
                </p>
              </button>
            </div>
          </section>

          <section className="rounded-[32px] border border-hier-border bg-white p-6 shadow-panel">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-hier-muted">
              Step 2
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-hier-text">
              Add media
            </h2>
            <p className="mt-2 text-sm leading-6 text-hier-muted">
              Images are cropped to 4:5. Videos can be visually framed and
              trimmed before upload.
            </p>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                const file = e.dataTransfer.files?.[0];
                if (file) void handleIncomingFile(file);
              }}
              className={`mt-5 rounded-[28px] border-2 border-dashed p-6 transition ${
                dragging
                  ? "border-hier-primary bg-hier-soft"
                  : "border-hier-border bg-hier-panel"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*,.mp4,.mov,.m4v,.webm,.jpg,.jpeg,.png,.webp,.heic"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleIncomingFile(file);
                  e.currentTarget.value = "";
                }}
              />

              {!selectedFile ? (
                <div className="flex flex-col items-center justify-center text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-card">
                    <UploadCloud className="h-6 w-6 text-hier-primary" />
                  </div>
                  <p className="mt-4 text-lg font-semibold text-hier-text">
                    Drag and drop media here
                  </p>
                  <p className="mt-2 text-sm leading-6 text-hier-muted">
                    Images will be cropped. Videos open in an editor so you can
                    select the frame and clip length.
                  </p>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={processingMedia}
                    className="mt-5 inline-flex h-11 items-center gap-2 rounded-2xl bg-white px-4 text-sm font-semibold text-hier-text shadow-card disabled:opacity-60"
                  >
                    <UploadCloud className="h-4 w-4" />
                    Upload from files
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-hier-text">
                        {selectedFile.name}
                      </p>
                      <p className="mt-1 text-sm text-hier-muted">
                        {selectedMediaKind === "video" ? "Video selected" : "4:5 image"} ·{" "}
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                      {selectedVideoEdit ? (
                        <p className="mt-1 text-xs text-hier-muted">
                          Clip {formatSeconds(selectedVideoEdit.startSeconds)}–
                          {formatSeconds(selectedVideoEdit.endSeconds)} · frame{" "}
                          {Math.round(selectedVideoEdit.cropXPercent)}% /{" "}
                          {Math.round(selectedVideoEdit.cropYPercent)}%
                        </p>
                      ) : null}
                    </div>

                    <button
                      type="button"
                      onClick={clearSelectedFile}
                      className="inline-flex h-10 items-center gap-2 rounded-2xl border border-hier-border bg-white px-4 text-sm font-semibold text-hier-text"
                    >
                      <X className="h-4 w-4" />
                      Remove
                    </button>
                  </div>

                  {previewUrl ? (
                    selectedMediaKind === "image" ? (
                      <div className="mx-auto aspect-[4/5] w-full max-w-[360px] overflow-hidden rounded-[24px] bg-hier-panel">
                        <img
                          src={previewUrl}
                          alt="Preview"
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="mx-auto aspect-[4/5] w-full max-w-[360px] overflow-hidden rounded-[24px] bg-black">
                        <video
                          src={previewUrl}
                          controls
                          className="h-full w-full"
                          style={{
                            objectFit: "cover",
                            objectPosition: selectedVideoEdit
                              ? `${selectedVideoEdit.cropXPercent}% ${selectedVideoEdit.cropYPercent}%`
                              : "50% 50%",
                            transform: selectedVideoEdit
                              ? `scale(${selectedVideoEdit.zoom})`
                              : "scale(1)",
                          }}
                        />
                      </div>
                    )
                  ) : null}

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={processingMedia}
                    className="inline-flex h-11 items-center gap-2 rounded-2xl border border-hier-border bg-white px-4 text-sm font-semibold text-hier-text disabled:opacity-60"
                  >
                    <UploadCloud className="h-4 w-4" />
                    Replace file
                  </button>
                </div>
              )}
            </div>
          </section>

          <section className="rounded-[32px] border border-hier-border bg-white p-6 shadow-panel">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-hier-muted">
              Step 3
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-hier-text">
              Fill in the details
            </h2>

            <div className="mt-5 space-y-5">
              {isJob ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-[24px] border border-hier-border bg-hier-panel p-4 md:col-span-2">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-hier-text">
                          Gig mode
                        </p>
                        <p className="mt-1 text-sm leading-6 text-hier-muted">
                          Use budget instead of salary.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => onChange("isGig", !values.isGig)}
                        className={`inline-flex h-11 items-center rounded-2xl px-4 text-sm font-semibold ${
                          values.isGig
                            ? "bg-hier-primary text-white"
                            : "border border-hier-border bg-white text-hier-text"
                        }`}
                      >
                        {values.isGig ? "Gig on" : "Gig off"}
                      </button>
                    </div>
                  </div>

                  <label className="space-y-2 md:col-span-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-hier-muted">
                      Title
                    </span>
                    <input
                      value={values.title}
                      onChange={(e) => onChange("title", e.target.value)}
                      className="h-12 w-full rounded-2xl border border-hier-border bg-hier-panel px-4 text-sm text-hier-text outline-none focus:border-hier-primary"
                    />
                  </label>

                  <label className="space-y-2 md:col-span-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-hier-muted">
                      Description
                    </span>
                    <textarea
                      value={values.description}
                      onChange={(e) => onChange("description", e.target.value)}
                      className="min-h-[150px] w-full rounded-[22px] border border-hier-border bg-hier-panel px-4 py-3 text-sm text-hier-text outline-none focus:border-hier-primary"
                    />
                  </label>

                  {!isGig ? (
                    <label className="space-y-2 md:col-span-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-hier-muted">
                        Location
                      </span>
                      <input
                        value={values.locationText}
                        onChange={(e) => onChange("locationText", e.target.value)}
                        className="h-12 w-full rounded-2xl border border-hier-border bg-hier-panel px-4 text-sm text-hier-text outline-none focus:border-hier-primary"
                      />
                    </label>
                  ) : null}

                  {!isGig ? (
                    <>
                      <label className="space-y-2">
                        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-hier-muted">
                          Sector
                        </span>
                        <input
                          value={values.sector}
                          onChange={(e) => onChange("sector", e.target.value)}
                          className="h-12 w-full rounded-2xl border border-hier-border bg-hier-panel px-4 text-sm text-hier-text outline-none focus:border-hier-primary"
                        />
                      </label>

                      <label className="space-y-2">
                        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-hier-muted">
                          Employment type
                        </span>
                        <input
                          value={values.employmentType}
                          onChange={(e) =>
                            onChange("employmentType", e.target.value)
                          }
                          className="h-12 w-full rounded-2xl border border-hier-border bg-hier-panel px-4 text-sm text-hier-text outline-none focus:border-hier-primary"
                        />
                      </label>

                      <label className="space-y-2">
                        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-hier-muted">
                          Experience
                        </span>
                        <input
                          value={values.experience}
                          onChange={(e) => onChange("experience", e.target.value)}
                          className="h-12 w-full rounded-2xl border border-hier-border bg-hier-panel px-4 text-sm text-hier-text outline-none focus:border-hier-primary"
                        />
                      </label>

                      <div className="space-y-2 md:col-span-2">
                        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-hier-muted">
                          Work mode
                        </span>
                        <div className="grid gap-3 sm:grid-cols-3">
                          {(["office", "hybrid", "remote"] as const).map(
                            (option) => (
                              <button
                                key={option}
                                type="button"
                                onClick={() => onChange("workMode", option)}
                                className={`inline-flex h-12 items-center justify-center rounded-2xl px-4 text-sm font-semibold transition ${
                                  values.workMode === option
                                    ? "bg-hier-primary text-white"
                                    : "border border-hier-border bg-white text-hier-text hover:bg-hier-panel"
                                }`}
                              >
                                {option[0].toUpperCase() + option.slice(1)}
                              </button>
                            )
                          )}
                        </div>
                      </div>
                    </>
                  ) : null}

                  <label className="space-y-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-hier-muted">
                      Currency
                    </span>
                    <input
                      value={values.currency}
                      onChange={(e) =>
                        onChange("currency", e.target.value.toUpperCase())
                      }
                      className="h-12 w-full rounded-2xl border border-hier-border bg-hier-panel px-4 text-sm text-hier-text outline-none focus:border-hier-primary"
                    />
                  </label>

                  {isGig ? (
                    <label className="space-y-2 md:col-span-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-hier-muted">
                        Budget
                      </span>
                      <input
                        value={values.budget}
                        onChange={(e) => onChange("budget", e.target.value)}
                        className="h-12 w-full rounded-2xl border border-hier-border bg-hier-panel px-4 text-sm text-hier-text outline-none focus:border-hier-primary"
                      />
                    </label>
                  ) : (
                    <>
                      <div className="rounded-[24px] border border-hier-border bg-hier-panel p-4 md:col-span-2">
                        <div className="flex flex-wrap gap-3">
                          {(["yearly", "hourly"] as const).map((option) => (
                            <button
                              key={option}
                              type="button"
                              onClick={() => onChange("salaryPeriod", option)}
                              className={`rounded-2xl px-4 py-2 text-sm font-semibold ${
                                values.salaryPeriod === option
                                  ? "bg-hier-primary text-white"
                                  : "border border-hier-border bg-white text-hier-text"
                              }`}
                            >
                              {option === "yearly" ? "Yearly" : "Hourly"}
                            </button>
                          ))}

                          {(["single", "range"] as const).map((option) => (
                            <button
                              key={option}
                              type="button"
                              onClick={() => onChange("salaryMode", option)}
                              className={`rounded-2xl px-4 py-2 text-sm font-semibold ${
                                values.salaryMode === option
                                  ? "bg-hier-primary text-white"
                                  : "border border-hier-border bg-white text-hier-text"
                              }`}
                            >
                              {option === "single" ? "Single value" : "Range"}
                            </button>
                          ))}
                        </div>
                      </div>

                      {values.salaryMode === "single" ? (
                        <label className="space-y-2 md:col-span-2">
                          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-hier-muted">
                            Salary
                          </span>
                          <input
                            value={values.salarySingle}
                            onChange={(e) =>
                              onChange("salarySingle", e.target.value)
                            }
                            className="h-12 w-full rounded-2xl border border-hier-border bg-hier-panel px-4 text-sm text-hier-text outline-none focus:border-hier-primary"
                          />
                        </label>
                      ) : (
                        <>
                          <label className="space-y-2">
                            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-hier-muted">
                              Min salary
                            </span>
                            <input
                              value={values.salaryMin}
                              onChange={(e) =>
                                onChange("salaryMin", e.target.value)
                              }
                              className="h-12 w-full rounded-2xl border border-hier-border bg-hier-panel px-4 text-sm text-hier-text outline-none focus:border-hier-primary"
                            />
                          </label>

                          <label className="space-y-2">
                            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-hier-muted">
                              Max salary
                            </span>
                            <input
                              value={values.salaryMax}
                              onChange={(e) =>
                                onChange("salaryMax", e.target.value)
                              }
                              className="h-12 w-full rounded-2xl border border-hier-border bg-hier-panel px-4 text-sm text-hier-text outline-none focus:border-hier-primary"
                            />
                          </label>
                        </>
                      )}
                    </>
                  )}

                  <label className="space-y-2 md:col-span-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-hier-muted">
                      Tags
                    </span>
                    <input
                      value={values.tagsText}
                      onChange={(e) => onChange("tagsText", e.target.value)}
                      className="h-12 w-full rounded-2xl border border-hier-border bg-hier-panel px-4 text-sm text-hier-text outline-none focus:border-hier-primary"
                    />
                  </label>

                  <div className="rounded-[24px] border border-hier-border bg-hier-panel p-4 md:col-span-2">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-hier-text">
                          Screening questions
                        </p>
                        <p className="mt-1 text-sm leading-6 text-hier-muted">
                          Candidates must answer these before applying.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          onChange(
                            "hasScreeningQuestions",
                            !values.hasScreeningQuestions
                          )
                        }
                        className={`inline-flex h-11 items-center rounded-2xl px-4 text-sm font-semibold ${
                          values.hasScreeningQuestions
                            ? "bg-hier-primary text-white"
                            : "border border-hier-border bg-white text-hier-text"
                        }`}
                      >
                        {values.hasScreeningQuestions
                          ? "Questions on"
                          : "Questions off"}
                      </button>
                    </div>

                    {values.hasScreeningQuestions ? (
                      <div className="mt-4 space-y-3">
                        {values.screeningQuestions.map((question, index) => (
                          <div
                            key={index}
                            className="rounded-[22px] border border-hier-border bg-white p-3"
                          >
                            <div className="mb-2 flex items-center justify-between gap-3">
                              <p className="text-sm font-semibold text-hier-text">
                                Question {index + 1}
                              </p>
                              {values.screeningQuestions.length > 1 ? (
                                <button
                                  type="button"
                                  onClick={() => removeQuestion(index)}
                                  className="text-sm font-semibold text-red-600"
                                >
                                  Remove
                                </button>
                              ) : null}
                            </div>
                            <textarea
                              value={question}
                              onChange={(e) =>
                                updateQuestion(index, e.target.value)
                              }
                              className="min-h-[90px] w-full rounded-[18px] border border-hier-border bg-hier-panel px-4 py-3 text-sm text-hier-text outline-none focus:border-hier-primary"
                            />
                          </div>
                        ))}

                        <button
                          type="button"
                          onClick={addQuestion}
                          className="inline-flex h-11 items-center rounded-2xl border border-hier-primary bg-hier-soft px-4 text-sm font-semibold text-hier-primary"
                        >
                          Add another question
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : (
                <label className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-hier-muted">
                    Caption
                  </span>
                  <textarea
                    value={values.description}
                    onChange={(e) => onChange("description", e.target.value)}
                    className="min-h-[180px] w-full rounded-[22px] border border-hier-border bg-hier-panel px-4 py-3 text-sm text-hier-text outline-none focus:border-hier-primary"
                  />
                </label>
              )}
            </div>
          </section>

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

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={loading || processingMedia}
              className="inline-flex h-12 items-center gap-2 rounded-2xl bg-hier-primary px-5 text-sm font-semibold text-white shadow-card disabled:opacity-60"
            >
              {loading
                ? "Publishing..."
                : isPost
                ? "Publish post"
                : isGig
                ? "Publish gig"
                : "Publish job"}
            </button>

            <Link
              href="/jobs"
              className="inline-flex h-12 items-center gap-2 rounded-2xl border border-hier-border bg-white px-5 text-sm font-semibold text-hier-text"
            >
              Cancel
            </Link>
          </div>
        </div>

        <aside className="space-y-6">
          <section className="rounded-[32px] border border-hier-border bg-white p-6 shadow-panel">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-hier-muted">
              Preview
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-hier-text">
              {summaryTitle}
            </h2>
            <p className="mt-3 text-sm leading-6 text-hier-muted">
              {isPost
                ? values.description.trim() ||
                  "Add a caption so this content post feels alive before you publish it."
                : values.description.trim() ||
                  "Your role description will show here as you build it."}
            </p>

            <div className="mt-5 grid gap-3">
              {previewUrl ? (
                selectedMediaKind === "image" ? (
                  <div className="mx-auto aspect-[4/5] w-full max-w-[320px] overflow-hidden rounded-[24px] bg-hier-panel">
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="mx-auto aspect-[4/5] w-full max-w-[320px] overflow-hidden rounded-[24px] bg-black">
                    <video
                      src={previewUrl}
                      controls
                      className="h-full w-full"
                      style={{
                        objectFit: "cover",
                        objectPosition: selectedVideoEdit
                          ? `${selectedVideoEdit.cropXPercent}% ${selectedVideoEdit.cropYPercent}%`
                          : "50% 50%",
                        transform: selectedVideoEdit
                          ? `scale(${selectedVideoEdit.zoom})`
                          : "scale(1)",
                      }}
                    />
                  </div>
                )
              ) : (
                <div className="mx-auto flex aspect-[4/5] w-full max-w-[320px] items-center justify-center rounded-[24px] border border-dashed border-hier-border bg-hier-panel text-sm font-medium text-hier-muted">
                  No media selected yet
                </div>
              )}

              <div className="rounded-[24px] border border-hier-border bg-hier-panel p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-hier-muted">
                  Type
                </p>
                <p className="mt-2 text-sm font-semibold text-hier-text">
                  {isPost
                    ? "Standard content post"
                    : isGig
                    ? "Gig job"
                    : "Standard job"}
                </p>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
