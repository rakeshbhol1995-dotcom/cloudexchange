"use client";
import React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

interface BackButtonProps {
  fallbackUrl?: string;
  label?: string;
}

export default function BackButton({ fallbackUrl = "/", label = "Back to Dashboard" }: BackButtonProps) {
  const router = useRouter();

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push(fallbackUrl);
    }
  };

  return (
    <button
      onClick={handleBack}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        background: "rgba(255, 255, 255, 0.03)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        borderRadius: "100px",
        padding: "8px 18px",
        color: "var(--text-secondary)",
        fontSize: "13px",
        fontWeight: 600,
        cursor: "pointer",
        transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
        backdropFilter: "blur(12px)",
        alignSelf: "flex-start",
        marginBottom: "16px",
        outline: "none",
        boxShadow: "0 2px 8px rgba(0,0,0,0.2)"
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
        e.currentTarget.style.borderColor = "var(--yellow)";
        e.currentTarget.style.color = "var(--yellow)";
        e.currentTarget.style.transform = "translateX(-3px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "rgba(255, 255, 255, 0.03)";
        e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.08)";
        e.currentTarget.style.color = "var(--text-secondary)";
        e.currentTarget.style.transform = "none";
      }}
    >
      <ArrowLeft size={16} />
      {label}
    </button>
  );
}
