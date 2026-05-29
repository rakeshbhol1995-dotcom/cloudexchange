import type { Metadata, Viewport } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CloudExchange — Institutional Digital Asset Exchange",
  description: "Next-generation institutional-grade digital asset exchange with microsecond order matching engine.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: "#040814",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${outfit.variable} dark h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#05050a] text-slate-200 font-sans">{children}</body>
    </html>
  );
}
