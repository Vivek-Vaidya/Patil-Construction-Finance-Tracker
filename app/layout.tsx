import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Patil Construction Finance Tracker",
  description: "Single source of truth for every rupee — Yashodeep Patil Construction",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}

