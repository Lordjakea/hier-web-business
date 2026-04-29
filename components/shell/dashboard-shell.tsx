"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AppHeader } from "@/components/shell/app-header";
import { Sidebar } from "@/components/shell/sidebar";
import { getAuthToken, getStoredUser, type StoredBusinessUser } from "@/lib/auth";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<StoredBusinessUser | null>(null);
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
    setReady(true);
  }, [pathname, router]);

  if (!ready) return <div className="min-h-screen bg-[#f7f8fc]" />;

  return (
    <div className="min-h-screen bg-[#f7f8fc]">
      <div className="mx-auto flex min-h-screen max-w-[2400px]">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex min-w-0 flex-1 flex-col">
          <AppHeader onOpenSidebar={() => setSidebarOpen(true)} user={user} />
          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 2xl:px-10 3xl:px-12">{children}</main>
        </div>
      </div>
    </div>
  );
}
