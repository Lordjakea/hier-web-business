import { DashboardShell } from "@/components/shell/dashboard-shell";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>;
}

export const metadata = {
  title: "Hier",
  description: "Hier business dashboard",
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-icon.png",
  },
};