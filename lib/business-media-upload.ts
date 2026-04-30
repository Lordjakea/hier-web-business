import {
  attachBusinessContentMedia,
  attachBusinessJobMedia,
  presignBusinessContentMedia,
  presignBusinessJobMedia,
  type UploadableMediaType,
} from "@/lib/business-posts";

const MAX_FILE_SIZE_MB = 50;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

function extensionFromFile(file: File) {
  const match = file.name.match(/\.([A-Za-z0-9]+)$/);
  return match ? match[1].toLowerCase() : undefined;
}

export function mediaTypeFromFile(file: File): UploadableMediaType {
  if ((file.type || "").startsWith("video/")) return "video";
  return "image";
}

function mimeTypeFromFile(file: File, mediaType: UploadableMediaType) {
  if (file.type) return file.type;
  return mediaType === "video" ? "video/mp4" : "image/jpeg";
}

export async function uploadBusinessMediaFile(params: {
  kind: "job" | "content";
  postId: number;
  file: File;
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
      text || `Could not upload media file. Storage returned ${upload.status}.`,
    );
  }

  if (params.kind === "content") {
    await attachBusinessContentMedia(params.postId, {
      media_type: mediaType,
      storage_key: presign.storage_key,
      public_url: presign.public_url,
      mime_type: mimeType,
      order_index: 0,
    });
  } else {
    await attachBusinessJobMedia(params.postId, {
      media_type: mediaType,
      storage_key: presign.storage_key,
      public_url: presign.public_url,
      mime_type: mimeType,
    });
  }

  return {
    mediaType,
    publicUrl: presign.public_url,
    storageKey: presign.storage_key,
  };
}