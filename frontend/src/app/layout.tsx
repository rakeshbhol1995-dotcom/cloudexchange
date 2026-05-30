import type { Metadata, Viewport } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CloudExchange | India's Premium Institutional Crypto Exchange",
  description: "CloudExchange is a next-generation high-frequency digital asset exchange featuring a sub-millisecond matching engine, secure P2P UPI/IMPS escrow, dynamic selfie KYC, and verified cryptographic double-entry ledger audits.",
  keywords: [
    "CloudExchange",
    "cloudexchange",
    "cloud exchange",
    "crypto exchange India",
    "secure bitcoin P2P escrow",
    "high-speed crypto matching engine",
    "UPI IMPS crypto escrow",
    "liveness selfie KYC exchange",
    "proof of reserves",
    "double entry audit ledger"
  ],
  alternates: {
    canonical: "https://cloudexchange.com",
  },
  openGraph: {
    title: "CloudExchange | India's Premium Institutional Crypto Exchange",
    description: "Experience India's highest-speed cryptocurrency trading platform. Sub-1ms ingestion latency, secure P2P UPI escrow, and double-entry ledger audits.",
    url: "https://cloudexchange.com",
    siteName: "CloudExchange India",
    images: [
      {
        url: "https://cloudexchange.com/icon.png",
        width: 512,
        height: 512,
        alt: "CloudExchange - Institutional Digital Asset Trading Terminal"
      }
    ],
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "CloudExchange | India's Premium Institutional Crypto Exchange",
    description: "Sub-millisecond high-performance order matching and sharded audit ledger guarantee on CloudExchange.",
    images: ["https://cloudexchange.com/icon.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: "#040814",
};

import Web3Provider from "@/components/providers/Web3Provider";

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
      <body className="min-h-full flex flex-col bg-[#05050a] text-slate-200 font-sans">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              "name": "CloudExchange",
              "url": "https://cloudexchange.com",
              "potentialAction": {
                "@type": "SearchAction",
                "target": "https://cloudexchange.com/coins?q={search_term_string}",
                "query-input": "required name=search_term_string"
              }
            })
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FinancialProduct",
              "name": "CloudExchange",
              "url": "https://cloudexchange.com",
              "logo": "https://cloudexchange.com/icon.png",
              "description": "India's premier high-frequency digital asset terminal. Featuring sub-1ms ingestion latency, peer-to-peer escrow, and dual-entry ledger verification.",
              "category": "Cryptocurrency Exchange Service"
            })
          }}
        />
        <Web3Provider>
          {children}
        </Web3Provider>
      </body>
    </html>
  );
}
