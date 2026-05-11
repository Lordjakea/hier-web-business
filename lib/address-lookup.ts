import { apiFetch } from "@/lib/api";

export type AddressOption = {
  id: string;
  label: string;
  postcode?: string | null;
};

export async function searchAddresses(query: string): Promise<AddressOption[]> {
  const cleaned = query.trim();

  if (!cleaned) {
    throw new Error("Address search is required.");
  }

  const response = await apiFetch<{ addresses?: any[] }>(
    `/api/address-lookup?query=${encodeURIComponent(cleaned)}`
  );

  const addresses = Array.isArray(response.addresses) ? response.addresses : [];

  return addresses
    .map((item, index) => ({
      id: String(item.id ?? `${cleaned}-${index}`),
      label: String(item.label ?? item.address ?? ""),
      postcode: item.postcode ? String(item.postcode) : null,
    }))
    .filter((item) => item.label);
}
