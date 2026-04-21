"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  Grid3X3,
  Menu,
  Search,
  Settings,
  Shield,
  UserRound,
  LogOut,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { appLauncherItems } from "@/lib/mock-data";
import { clearSession, type StoredBusinessUser } from "@/lib/auth";
import clsx from "clsx";

function useOnClickOutside<T extends HTMLElement>(
  ref: React.RefObject<T | null>,
  onClose: () => void
) {
  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(event.target as Node)) onClose();
    }

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose, ref]);
}

function initialsFromUser(user?: StoredBusinessUser | null) {
  const name = user?.full_name || user?.email || "HB";
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function AppHeader({
  onOpenSidebar,
  user,
}: {
  onOpenSidebar: () => void;
  user?: StoredBusinessUser | null;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const [appsOpen, setAppsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const appsRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useOnClickOutside(appsRef, () => setAppsOpen(false));
  useOnClickOutside(menuRef, () => setMenuOpen(false));

  return (
    <header className="sticky top-0 z-40 border-b border-hier-border/80 bg-white/85 backdrop-blur-xl">
      <div className="mx-auto flex h-20 max-w-[1800px] items-center gap-4 px-4 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={onOpenSidebar}
          className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-hier-border bg-white text-hier-text shadow-sm transition hover:bg-hier-soft lg:hidden"
          aria-label="Open sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="relative flex min-w-0 flex-1 items-center gap-3 lg:max-w-xl">
          <Search className="pointer-events-none absolute left-4 h-4 w-4 text-hier-muted" />
          <input
            placeholder="Search applicants, jobs, tags, notes"
            className="h-12 w-full rounded-2xl border border-hier-border bg-hier-panel pl-11 pr-4 text-sm text-hier-text outline-none transition focus:border-hier-primary focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="relative" ref={appsRef}>
            <button
              type="button"
              onClick={() => {
                setAppsOpen((value) => !value);
                setMenuOpen(false);
              }}
              className={clsx(
                "inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-hier-border bg-white text-hier-text shadow-sm transition",
                appsOpen
                  ? "border-hier-primary bg-hier-soft"
                  : "hover:bg-hier-soft"
              )}
              aria-label="Open app launcher"
            >
              <Grid3X3 className="h-5 w-5" />
            </button>

            {appsOpen ? (
              <div className="absolute right-0 top-14 w-[340px] rounded-[24px] border border-hier-border bg-white p-3 shadow-panel">
                <div className="mb-3 px-2 pt-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-hier-muted">
                    Workspace
                  </p>
                  <p className="mt-1 text-lg font-semibold text-hier-text">
                    Open business tools
                  </p>
                </div>

                <div className="grid gap-2">
                  {appLauncherItems.map(
                    ({ title, href, icon: Icon, description }) => {
                      const active = pathname.startsWith(href);

                      return (
                        <Link
                          key={title}
                          href={href}
                          className={clsx(
                            "flex items-start gap-3 rounded-2xl border px-4 py-3 transition",
                            active
                              ? "border-hier-primary bg-hier-soft"
                              : "border-transparent bg-hier-panel hover:border-hier-border hover:bg-white"
                          )}
                        >
                          <div className="mt-0.5 rounded-xl bg-white p-2 text-hier-primary shadow-sm">
                            <Icon className="h-4 w-4" />
                          </div>

                          <div>
                            <p className="text-sm font-semibold text-hier-text">
                              {title}
                            </p>
                            <p className="mt-1 text-xs leading-5 text-hier-muted">
                              {description}
                            </p>
                          </div>
                        </Link>
                      );
                    }
                  )}
                </div>
              </div>
            ) : null}
          </div>

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => {
                setMenuOpen((value) => !value);
                setAppsOpen(false);
              }}
              className={clsx(
                "inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-hier-border bg-white text-hier-text shadow-sm transition",
                menuOpen
                  ? "border-hier-primary bg-hier-soft"
                  : "hover:bg-hier-soft"
              )}
              aria-label="Open account menu"
            >
              <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-hier-primary/20 text-sm font-semibold text-hier-ink">
                {user?.avatar_url ? (
                  <Image
                    src={user.avatar_url}
                    alt={user.full_name || user.email || "Business avatar"}
                    width={36}
                    height={36}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  initialsFromUser(user)
                )}
              </div>
            </button>

            {menuOpen ? (
              <div className="absolute right-0 top-14 w-64 rounded-[24px] border border-hier-border bg-white p-2 shadow-panel">
                <div className="border-b border-hier-border px-3 py-3">
                  <p className="text-sm font-semibold text-hier-text">
                    {user?.full_name || "Business user"}
                  </p>
                  <p className="mt-1 text-xs text-hier-muted">
                    {user?.email || "Business admin"}
                  </p>
                </div>

                <div className="py-2">
                  <Link
                    href="/settings/profile"
                    className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-hier-text hover:bg-hier-panel"
                  >
                    <UserRound className="h-4 w-4" />
                    Profile management
                  </Link>

                  <Link
                    href="/settings/policies"
                    className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-hier-text hover:bg-hier-panel"
                  >
                    <Shield className="h-4 w-4" />
                    Policies
                  </Link>

                  <Link
                    href="/billing"
                    className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-hier-text hover:bg-hier-panel"
                  >
                    <Settings className="h-4 w-4" />
                    Settings & billing
                  </Link>
                </div>

                <div className="border-t border-hier-border px-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      clearSession();
                      router.replace("/login");
                    }}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-medium text-rose-600 hover:bg-rose-50"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}