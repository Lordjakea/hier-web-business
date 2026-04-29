"use client";

import { useCallback, useMemo, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { X } from "lucide-react";

type ImageCropModalProps = {
  imageSrc: string;
  title?: string;
  onCancel: () => void;
  onComplete: (file: File, previewUrl: string) => void;
};

async function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = url;
  });
}

async function cropImageToFile(
  imageSrc: string,
  croppedAreaPixels: Area,
): Promise<{ file: File; previewUrl: string }> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Could not prepare image crop.");
  }

  canvas.width = croppedAreaPixels.width;
  canvas.height = croppedAreaPixels.height;

  ctx.drawImage(
    image,
    croppedAreaPixels.x,
    croppedAreaPixels.y,
    croppedAreaPixels.width,
    croppedAreaPixels.height,
    0,
    0,
    croppedAreaPixels.width,
    croppedAreaPixels.height,
  );

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/jpeg", 0.92);
  });

  if (!blob) {
    throw new Error("Could not export cropped image.");
  }

  const file = new File([blob], `cropped-${Date.now()}.jpg`, {
    type: "image/jpeg",
  });

  const previewUrl = URL.createObjectURL(blob);

  return { file, previewUrl };
}

export default function ImageCropModal({
  imageSrc,
  title = "Crop image",
  onCancel,
  onComplete,
}: ImageCropModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [saving, setSaving] = useState(false);

  const aspect = useMemo(() => 4 / 5, []);

  const handleCropComplete = useCallback((_area: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const handleDone = useCallback(async () => {
    try {
      if (!croppedAreaPixels) return;
      setSaving(true);
      const result = await cropImageToFile(imageSrc, croppedAreaPixels);
      onComplete(result.file, result.previewUrl);
    } finally {
      setSaving(false);
    }
  }, [croppedAreaPixels, imageSrc, onComplete]);

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 p-4 backdrop-blur-sm">
      <div className="mx-auto flex h-full max-w-5xl flex-col overflow-hidden rounded-[32px] border border-white/10 bg-zinc-950 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
              Instagram crop
            </p>
            <h2 className="mt-1 text-lg font-semibold text-white">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white transition hover:bg-white/10"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="relative flex-1 bg-black">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={handleCropComplete}
            objectFit="contain"
          />
        </div>

        <div className="space-y-4 border-t border-white/10 px-5 py-4">
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-zinc-200">Zoom</span>
              <span className="text-sm text-zinc-400">{zoom.toFixed(2)}x</span>
            </div>
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full"
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex h-11 flex-1 items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleDone()}
              disabled={saving}
              className="inline-flex h-11 flex-1 items-center justify-center rounded-2xl bg-white px-4 text-sm font-semibold text-black transition hover:opacity-95 disabled:opacity-60"
            >
              {saving ? "Cropping…" : "Use cropped image"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}