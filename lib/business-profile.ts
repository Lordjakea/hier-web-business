import { apiFetch } from "@/lib/api";

export type BusinessProfile = {
  company_name: string | null;
  company_number: string | null;
  address_text: string | null;
  address_lat?: number | null;
  address_lng?: number | null;
  contact_email: string | null;
  contact_phone: string | null;
  verified: boolean;
  bio: string | null;
  avatar_url: string | null;
};

export type UpdateBusinessProfilePayload = Partial<{
  company_name: string | null;
  company_number: string | null;
  address_text: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  bio: string | null;
  avatar_url: string | null;
}>;

type MeResponse = {
  id: number;
  role: string;
  email: string | null;
  phone: string | null;
  full_name?: string | null;
  email_verified?: boolean;
  phone_verified?: boolean;
  profile: BusinessProfile | null;
  business_account?: unknown;
};

type BusinessProfileResponse = {
  ok?: boolean;
  profile: BusinessProfile;
};

export type PresignBusinessAvatarResponse = {
  ok: boolean;
  storage_key: string;
  upload_url: string;
  public_url: string;
};

export type ConfirmBusinessAvatarResponse = {
  ok: boolean;
  avatar_url: string;
  profile: BusinessProfile;
};

export async function fetchBusinessProfile(): Promise<BusinessProfile | null> {
  const response = await apiFetch<MeResponse>("/api/me");
  return response.profile;
}

export async function updateBusinessProfile(
  payload: UpdateBusinessProfilePayload
): Promise<BusinessProfile> {
  const response = await apiFetch<BusinessProfileResponse>("/api/me/business-profile", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });

  return response.profile;
}

export async function presignBusinessAvatarUpload(params: {
  original_filename: string;
  mime_type: string;
  size_bytes: number;
}): Promise<PresignBusinessAvatarResponse> {
  const fileName = params.original_filename || "avatar";
  const ext =
    fileName.includes(".") ? fileName.split(".").pop()?.toLowerCase() || "" : "";

  return apiFetch<PresignBusinessAvatarResponse>(
    "/api/me/business-profile/avatar/presign",
    {
      method: "POST",
      body: JSON.stringify({
        original_filename: params.original_filename,
        mime_type: params.mime_type,
        size_bytes: params.size_bytes,
        ext,
      }),
    }
  );
}

export async function confirmBusinessAvatarUpload(
  storageKey: string
): Promise<ConfirmBusinessAvatarResponse> {
  return apiFetch<ConfirmBusinessAvatarResponse>(
    "/api/me/business-profile/avatar/confirm",
    {
      method: "POST",
      body: JSON.stringify({
        storage_key: storageKey,
      }),
    }
  );
}