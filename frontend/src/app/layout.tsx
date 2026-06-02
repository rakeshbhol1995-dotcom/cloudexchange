import type { Metadata, Viewport } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CloudExchange™ | India's Tier-1 Cryptocurrency Exchange | Buy Bitcoin, Ethereum, USDT Instantly",
  description: "CloudExchange is India's premium, Tier-1 digital asset trading platform and cryptocurrency exchange. Engineered with a sub-millisecond memory-mapped order matching core, secure P2P fiat-escrow with automated anti-fraud receipt checks, instant UPI/IMPS deposits, dynamic Liveness selfie KYC, and daily verified cryptographic Merkle Tree proof-of-reserves audits. Trade BTC, ETH, USDT, SOL, and custom tokens with industry-leading liquidity, secure passkey authentication, and Binance-level institutional custody safeguards.",
  keywords: [
    "CloudExchange",
    "cloudexchange",
    "cloud exchange",
    "crypto exchange India",
    "buy bitcoin India",
    "buy USDT India",
    "best crypto exchange in India",
    "Binance alternative India",
    "trade BTC INR",
    "high-speed crypto matching engine",
    "secure bitcoin P2P escrow",
    "UPI IMPS crypto escrow",
    "instant crypto withdrawal India",
    "liveness selfie KYC exchange",
    "cryptocurrency audit ledger",
    "proof of reserves India",
    "double entry audit ledger",
    "highest liquidity exchange India",
    "institutional digital asset trading",
    "GoldChain L1 token",
    "secure crypto wallet app"
  ],
  icons: {
    icon: [
      { url: "/logo.png", sizes: "32x32", type: "image/png" },
      { url: "/logo.png", sizes: "192x192", type: "image/png" },
      { url: "/logo.png", sizes: "512x512", type: "image/png" }
    ],
    shortcut: "/logo.png",
    apple: "/logo.png"
  },
  alternates: {
    canonical: "https://cloudexchange.in",
  },
  openGraph: {
    title: "CloudExchange™ | India's Premium Tier-1 Crypto Exchange Terminal",
    description: "Experience India's highest-speed cryptocurrency trading platform. Sub-1ms ingestion latency, secure P2P UPI escrow, daily cryptographic audits, and Binance-level liquidity pools.",
    url: "https://cloudexchange.in",
    siteName: "CloudExchange India",
    images: [
      {
        url: "https://cloudexchange.in/logo.png",
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
    title: "CloudExchange™ | India's Premium Tier-1 Crypto Exchange Terminal",
    description: "Sub-millisecond high-performance order matching, Merkle-tree proof of reserves, and sharded audit ledger guarantee on CloudExchange.",
    images: ["https://cloudexchange.in/logo.png"],
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
              "url": "https://cloudexchange.in",
              "potentialAction": {
                "@type": "SearchAction",
                "target": "https://cloudexchange.in/coins?q={search_term_string}",
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
              "url": "https://cloudexchange.in",
              "logo": "https://cloudexchange.in/icon.png",
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
