import { apiFetch } from "./api";
import type { OnboardingEligibility } from "./types";

export type PresignUploadResponse = {
  ok: boolean;
  storage_key: string;
  upload_url: string;
  expires_in: number;
  expected_prefix: string;
};

export async function fetchOnboardingEligibility(): Promise<OnboardingEligibility> {
  return apiFetch("/api/business/onboarding/eligibility");
}

export async function startOnboarding(applicationId: number): Promise<any> {
  return apiFetch(`/api/business/applications/${applicationId}/onboarding`, {
    method: "POST",
  });
}

export async function fetchOnboardingList(params?: {
  applicationId?: number | null;
  status?: string | null;
  country?: string | null;
}): Promise<any> {
  const search = new URLSearchParams();

  if (params?.applicationId) {
    search.set("application_id", String(params.applicationId));
  }
  if (params?.status) {
    search.set("status", params.status);
  }
  if (params?.country) {
    search.set("country", params.country);
  }

  const qs = search.toString();
  return apiFetch(`/api/business/onboarding${qs ? `?${qs}` : ""}`);
}

export async function fetchOnboardingDetail(onboardingId: number): Promise<any> {
  return apiFetch(`/api/business/onboarding/${onboardingId}`);
}

export async function removeOnboarding(
  onboardingId: number,
  payload?: {
    reason?: string;
  },
): Promise<any> {
  return apiFetch(`/api/business/onboarding/${onboardingId}/remove`, {
    method: "POST",
    body: JSON.stringify(payload || {}),
  });
}

export async function restoreOnboarding(onboardingId: number): Promise<any> {
  return apiFetch(`/api/business/onboarding/${onboardingId}/restore`, {
    method: "POST",
  });
}

export async function requestOnboardingTask(
  onboardingId: number,
  taskKey: string,
): Promise<any> {
  return apiFetch(
    `/api/business/onboarding/${onboardingId}/tasks/${taskKey}/request`,
    {
      method: "POST",
    },
  );
}

export async function sendOnboardingTask(
  onboardingId: number,
  taskId: number,
): Promise<any> {
  return apiFetch(`/api/business/onboarding/${onboardingId}/tasks/${taskId}/send`, {
    method: "POST",
  });
}

export async function reviewOnboardingTask(
  onboardingId: number,
  taskId: number,
  payload: {
    status: "reviewed" | "approved" | "rejected" | "waived";
    note?: string;
  },
): Promise<any> {
  return apiFetch(`/api/business/onboarding/${onboardingId}/tasks/${taskId}/review`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function presignOnboardingContractUpload(
  onboardingId: number,
  payload: {
    original_filename: string;
    mime_type?: string;
    size_bytes?: number;
    ext?: string;
  },
): Promise<PresignUploadResponse> {
  return apiFetch(`/api/business/onboarding/${onboardingId}/contracts/presign`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function createOnboardingContract(
  onboardingId: number,
  payload: {
    title: string;
    template_name?: string;
    status?: "draft" | "sent" | "viewed" | "signed" | "approved" | "rejected";
    storage_key?: string;
    signed_storage_key?: string;
    metadata?: Record<string, unknown>;
  },
): Promise<any> {
  return apiFetch(`/api/business/onboarding/${onboardingId}/contracts`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function sendOnboardingContract(
  onboardingId: number,
  contractId: number,
): Promise<any> {
  return apiFetch(
    `/api/business/onboarding/${onboardingId}/contracts/${contractId}/send`,
    {
      method: "POST",
    },
  );
}

export async function presignOnboardingDocumentUpload(
  onboardingId: number,
  payload: {
    task_id?: number;
    original_filename: string;
    mime_type?: string;
    size_bytes?: number;
    ext?: string;
  },
): Promise<PresignUploadResponse> {
  return apiFetch(`/api/business/onboarding/${onboardingId}/documents/presign`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function createOnboardingDocument(
  onboardingId: number,
  payload: {
    document_type: string;
    title?: string;
    task_id?: number;
    storage_key?: string;
    original_filename?: string;
    mime_type?: string;
    file_size?: number;
    visible_to_candidate?: boolean;
    review_status?: "pending" | "reviewed" | "approved" | "rejected";
    metadata?: Record<string, unknown>;
  },
): Promise<any> {
  return apiFetch(`/api/business/onboarding/${onboardingId}/documents`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function sendOnboardingDocument(
  onboardingId: number,
  documentId: number,
): Promise<any> {
  return apiFetch(
    `/api/business/onboarding/${onboardingId}/documents/${documentId}/send`,
    {
      method: "POST",
    },
  );
}

export async function uploadFileToPresignedUrl(
  uploadUrl: string,
  file: File,
  contentType?: string,
): Promise<void> {
  const response = await fetch(uploadUrl, {
    method: "PUT",
    headers: contentType ? { "Content-Type": contentType } : undefined,
    body: file,
  });

  if (!response.ok) {
    throw new Error(`Upload failed (${response.status})`);
  }
}

function getFileExt(file: File): string | undefined {
  if (!file.name.includes(".")) return undefined;
  return file.name.split(".").pop()?.toLowerCase();
}

export async function uploadAndCreateOnboardingContract(
  onboardingId: number,
  file: File,
  payload: {
    title: string;
    template_name?: string;
    metadata?: Record<string, unknown>;
  },
): Promise<any> {
  const presign = await presignOnboardingContractUpload(onboardingId, {
    original_filename: file.name,
    mime_type: file.type || "application/pdf",
    size_bytes: file.size,
    ext: getFileExt(file),
  });

  await uploadFileToPresignedUrl(
    presign.upload_url,
    file,
    file.type || "application/pdf",
  );

  return createOnboardingContract(onboardingId, {
    title: payload.title,
    template_name: payload.template_name,
    status: "draft",
    storage_key: presign.storage_key,
    metadata: payload.metadata,
  });
}

export async function uploadAndCreateOnboardingDocument(
  onboardingId: number,
  file: File,
  payload: {
    document_type: string;
    title?: string;
    task_id?: number;
    visible_to_candidate?: boolean;
    review_status?: "pending" | "reviewed" | "approved" | "rejected";
    metadata?: Record<string, unknown>;
  },
): Promise<any> {
  const presign = await presignOnboardingDocumentUpload(onboardingId, {
    task_id: payload.task_id,
    original_filename: file.name,
    mime_type: file.type || "application/octet-stream",
    size_bytes: file.size,
    ext: getFileExt(file),
  });

  await uploadFileToPresignedUrl(
    presign.upload_url,
    file,
    file.type || "application/octet-stream",
  );

  return createOnboardingDocument(onboardingId, {
    document_type: payload.document_type,
    title: payload.title || file.name,
    task_id: payload.task_id,
    storage_key: presign.storage_key,
    original_filename: file.name,
    mime_type: file.type || "application/octet-stream",
    file_size: file.size,
    visible_to_candidate: payload.visible_to_candidate,
    review_status: payload.review_status || "pending",
    metadata: payload.metadata,
  });
}