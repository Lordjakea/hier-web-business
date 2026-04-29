import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hier Business",
  description: "Business dashboard for candidate and applicant management.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
