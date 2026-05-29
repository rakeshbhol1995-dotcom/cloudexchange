"use client";
import React from "react";
import Image from "next/image";

interface LogoProps {
  size?: number;
  glow?: boolean;
}

export default function CloudExchangeLogo({ size = 32, glow = true }: LogoProps) {
  return (
    <div
      style={{
        width: size,
        height: size,
        position: "relative",
        filter: glow ? "drop-shadow(0 0 8px rgba(0, 229, 255, 0.4))" : "none",
        transition: "transform 0.3s ease",
        borderRadius: "50%",
        overflow: "hidden",
        display: "inline-block",
        verticalAlign: "middle"
      }}
      className="logo-svg-hover"
    >
      <Image
        src="/logo.png"
        alt="CloudExchange Logo"
        fill
        style={{ objectFit: "contain" }}
        priority
      />
    </div>
  );
}
