import React from "react";
import InfoClientPage from "./InfoClientPage";

// List of all valid slugs for pre-rendering
const SLUGS = [
  "api-whitelist",
  "shadow-replay",
  "disruptor-buffer",
  "fix-gateway",
  "help-center",
  "security-audits",
  "terms-of-service",
  "privacy-policy",
  "risk-warning",
  "cookie-preferences"
];

export async function generateStaticParams() {
  return SLUGS.map((slug) => ({
    slug: slug,
  }));
}

interface PageProps {
  params: Promise<{
    slug: string;
  }> | {
    slug: string;
  };
}

export default async function Page({ params }: PageProps) {
  // Support both Next.js 14 (synchronous object) and Next.js 15 (Promise wrapper)
  const resolvedParams = await params;
  return <InfoClientPage slug={resolvedParams.slug} />;
}
