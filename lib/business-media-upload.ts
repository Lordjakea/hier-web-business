import {
  attachBusinessContentMedia,
  attachBusinessJobMedia,
  presignBusinessContentMedia,
  presignBusinessJobMedia,
  type UploadableMediaType,
} from "@/lib/business-posts";

const MAX_FILE_SIZE_MB = 50;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export type BusinessVideoEdit = {
  startSeconds: number;
  endSeconds: number;
  cropXPercent: number;
  cropYPercent: number;
  zoom: number;
  originalWidth: number;
  originalHeight: number;
  originalDuration: number;
};

function extensionFromFile(file: File) {
  const match = file.name.match(/\.([A-Za-z0-9]+)$/);
  return match ? match[1].toLowerCase() : undefined;
}

export function mediaTypeFromFile(file: File): UploadableMediaType {
  if ((file.type || "").startsWith("video/")) return "video";

  const name = file.name.toLowerCase();
  if (/\.(mp4|mov|m4v|webm)$/i.test(name)) return "video";

  return "image";
}

function mimeTypeFromFile(file: File, mediaType: UploadableMediaType) {
  if (file.type) return file.type;
  return mediaType === "video" ? "video/mp4" : "image/jpeg";
}

function toServerVideoEdit(edit: BusinessVideoEdit | null | undefined) {
  if (!edit) return null;

  return {
    start_seconds: edit.startSeconds,
    end_seconds: edit.endSeconds,
    crop_x_percent: edit.cropXPercent,
    crop_y_percent: edit.cropYPercent,
    zoom: edit.zoom,
    original_width: edit.originalWidth,
    original_height: edit.originalHeight,
    original_duration: edit.originalDuration,
  };
}

export async function uploadBusinessMediaFile(params: {
  kind: "job" | "content";
  postId: number;
  file: File;
  videoEdit?: BusinessVideoEdit | null;
}) {
  if (!params.postId || !Number.isFinite(params.postId)) {
    throw new Error("Missing post id for media upload.");
  }

  if (!params.file) {
    throw new Error("Missing media file.");
  }

  if (params.file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error(`File is too large. Max size is ${MAX_FILE_SIZE_MB}MB.`);
  }

  const mediaType = mediaTypeFromFile(params.file);
  const mimeType = mimeTypeFromFile(params.file, mediaType);
  const ext = extensionFromFile(params.file);

  const presign =
    params.kind === "content"
      ? await presignBusinessContentMedia(params.postId, {
          media_type: mediaType,
          mime_type: mimeType,
          ext,
          filename: params.file.name,
        })
      : await presignBusinessJobMedia(params.postId, {
          media_type: mediaType,
          mime_type: mimeType,
          ext,
          filename: params.file.name,
        });

  let upload: Response;

  try {
    upload = await fetch(presign.upload_url, {
      method: "PUT",
      headers: { "Content-Type": mimeType },
      body: params.file,
    });
  } catch {
    throw new Error("Direct upload to storage failed before the server responded.");
  }

  if (!upload.ok) {
    const text = await upload.text().catch(() => "");
    throw new Error(
      text || `Could not upload media file. Storage returned ${upload.status}.`
    );
  }

  const videoEdit = mediaType === "video" ? toServerVideoEdit(params.videoEdit) : null;

  const attachPayload = {
    media_type: mediaType,
    storage_key: presign.storage_key,
    public_url: presign.public_url,
    mime_type: mimeType,
    duration_seconds:
      mediaType === "video" && params.videoEdit
        ? Math.round(params.videoEdit.originalDuration)
        : undefined,
    video_edit: videoEdit,
    order_index: 0,
  };

  if (params.kind === "content") {
    await attachBusinessContentMedia(params.postId, attachPayload);
  } else {
    await attachBusinessJobMedia(params.postId, attachPayload);
  }

  return {
    mediaType,
    publicUrl: presign.public_url,
    storageKey: presign.storage_key,
  };
}