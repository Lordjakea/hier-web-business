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
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const reason = typeof body?.reason === "string" ? body.reason.trim() : "";

  if (!email) {
    return NextResponse.json(
      { ok: false, message: "This account does not have an email address." },
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

  const origin = request.headers.get("origin") || new URL(request.url).origin;
  const reset_url = `${origin}/reset-password?email=${encodeURIComponent(email)}`;
  const payload = {
    email,
    reason,
    reset_url,
    reset_link: reset_url,
    redirect_url: reset_url,
  };

  const paths = [
    `/api/staff/accounts/${userId}/send-password-reset-link`,
    `/api/staff/accounts/${userId}/password-reset-link`,
    `/api/staff/accounts/${userId}/reset-password-link`,
    `/api/staff/accounts/${userId}/send-password-reset`,
  ];

  let lastError = "Backend reset-link endpoint was not found.";

  for (const path of paths) {
    try {
      const response = await fetch(resolveApiUrl(path), {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        cache: "no-store",
      });

      if (response.ok) {
        const contentType = response.headers.get("content-type") || "";
        const responsePayload = contentType.includes("application/json")
          ? await response.json()
          : { ok: true };

        return NextResponse.json(responsePayload);
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
