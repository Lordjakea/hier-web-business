"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AppHeader } from "@/components/shell/app-header";
import { Sidebar } from "@/components/shell/sidebar";
import {
  getAuthToken,
  getStoredUser,
  setAuthToken,
  setStoredUser,
  type StoredBusinessUser,
} from "@/lib/auth";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<StoredBusinessUser | null>(null);
  const [hasStaffReturn, setHasStaffReturn] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const token = getAuthToken();
    const storedUser = getStoredUser();
    if (!token) {
      router.replace(`/login?next=${encodeURIComponent(pathname || "/candidates")}`);
      return;
    }
    setUser(storedUser);
    setHasStaffReturn(Boolean(window.sessionStorage.getItem("hier_staff_return_token")));
    setReady(true);
  }, [pathname, router]);

  function returnToStaffCrm() {
    const token = window.sessionStorage.getItem("hier_staff_return_token");
    const rawUser = window.sessionStorage.getItem("hier_staff_return_user");

    if (token) setAuthToken(token);
    if (rawUser) {
      try {
        setStoredUser(JSON.parse(rawUser));
      } catch {
        setStoredUser(null);
      }
    }

    window.sessionStorage.removeItem("hier_staff_return_token");
    window.sessionStorage.removeItem("hier_staff_return_user");
    router.replace("/staff");
  }

  if (!ready) return <div className="min-h-screen bg-[#f7f8fc]" />;

  return (
    <div className="min-h-screen bg-[#f7f8fc]">
      <div className="mx-auto flex min-h-screen max-w-[2400px]">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex min-w-0 flex-1 flex-col">
          <AppHeader onOpenSidebar={() => setSidebarOpen(true)} user={user} />
          {hasStaffReturn ? (
            <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 sm:px-6 lg:px-8">
              <div className="mx-auto flex max-w-[1800px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <span>
                  You are viewing this account in staff support mode.
                </span>
                <button
                  type="button"
                  onClick={returnToStaffCrm}
                  className="inline-flex h-9 items-center justify-center rounded-full border border-amber-300 bg-white px-4 text-sm font-semibold text-amber-900"
                >
                  Return to Staff CRM
                </button>
              </div>
            </div>
          ) : null}
          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 2xl:px-10 3xl:px-12">{children}</main>
        </div>
      </div>
    </div>
  );
}
