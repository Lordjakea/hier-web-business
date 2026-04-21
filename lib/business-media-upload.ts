import {
  attachBusinessContentMedia,
  attachBusinessJobMedia,
  presignBusinessContentMedia,
  presignBusinessJobMedia,
  type UploadableMediaType,
} from "@/lib/business-posts";

function extensionFromFile(file: File) {
  const match = file.name.match(/\.([A-Za-z0-9]+)$/);
  return match ? match[1].toLowerCase() : undefined;
}

export function mediaTypeFromFile(file: File): UploadableMediaType {
  if ((file.type || "").startsWith("video/")) return "video";
  return "image";
}

export async function uploadBusinessMediaFile(params: {
  kind: "job" | "content";
  postId: number;
  file: File;
}) {
  const mediaType = mediaTypeFromFile(params.file);
  const mimeType =
    params.file.type || (mediaType === "video" ? "video/mp4" : "image/jpeg");
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
    throw new Error(
      "Direct upload to storage failed before the server responded.",
    );
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