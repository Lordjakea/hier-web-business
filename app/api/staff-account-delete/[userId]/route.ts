import { NextRequest, NextResponse } from "next/server";
import { resolveApiUrl } from "@/lib/api";

type RouteContext = {
  params: Promise<{ userId: string }>;
};

async function readError(response: Response) {
  const contentType = response.headers.get("content-type") || "";

  try {
    if (contentType.includes("application/json")) {
      const payload = await response.json();
      return (
        payload?.msg ||
        payload?.error ||
        payload?.message ||
        response.statusText ||
        "Request failed"
      );
    }

    return (await response.text()) || response.statusText || "Request failed";
  } catch {
    return response.statusText || "Request failed";
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { userId } = await context.params;
  const body = await request.json().catch(() => ({}));
  const reason = typeof body?.reason === "string" ? body.reason.trim() : "";
  const confirmDelete = body?.confirm_delete === true;
  const cancelStripeSubscription = body?.cancel_stripe_subscription === true;

  if (reason.length < 10) {
    return NextResponse.json(
      { ok: false, message: "Deletion reason must be at least 10 characters." },
      { status: 400 }
    );
  }

  const headers = new Headers({
    Accept: "application/json",
    "Content-Type": "application/json",
  });
  const authorization = request.headers.get("authorization");

  if (authorization) {
    headers.set("Authorization", authorization);
  }

  const paths = [
    `/api/staff/accounts/${userId}/delete-account`,
    `/api/staff/accounts/${userId}/delete`,
    `/api/staff/accounts/${userId}/remove`,
  ];

  let lastError = "Account delete endpoint was not found.";

  for (const path of paths) {
    try {
      const response = await fetch(resolveApiUrl(path), {
        method: "POST",
        headers,
        body: JSON.stringify({
          reason,
          confirm_delete: confirmDelete,
          cancel_stripe_subscription: cancelStripeSubscription,
        }),
        cache: "no-store",
      });

      if (response.ok) {
        const contentType = response.headers.get("content-type") || "";
        const payload = contentType.includes("application/json")
          ? await response.json()
          : { ok: true };

        return NextResponse.json(payload);
      }

      lastError = await readError(response);
    } catch (caughtError) {
      lastError =
        caughtError instanceof Error ? caughtError.message : "Request failed";
    }
  }

  return NextResponse.json(
    { ok: false, message: lastError },
    { status: 502 }
  );
}
