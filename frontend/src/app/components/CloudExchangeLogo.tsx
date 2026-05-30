"use client";
import React from "react";

interface LogoProps {
  size?: number;
  glow?: boolean;
}

export default function CloudExchangeLogo({ size = 32, glow = true }: LogoProps) {
  // Pure CSS/SVG logo — no external image dependency
  // Binance-style hexagonal mark with CE initials
  const s = size;
  return (
    <div
      style={{
        width: s,
        height: s,
        flexShrink: 0,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        filter: glow ? "drop-shadow(0 0 6px rgba(245,166,35,0.6))" : "none",
        transition: "transform 0.2s ease",
      }}
      className="logo-svg-hover"
    >
      <svg
        width={s}
        height={s}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Hexagon background */}
        <polygon
          points="20,2 36,11 36,29 20,38 4,29 4,11"
          fill="url(#logoGrad)"
          stroke="rgba(245,166,35,0.4)"
          strokeWidth="1"
        />
        {/* Inner highlight */}
        <polygon
          points="20,6 33,13 33,27 20,34 7,27 7,13"
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="0.5"
        />
        {/* CE letter mark */}
        <text
          x="20"
          y="25"
          textAnchor="middle"
          fontSize="13"
          fontWeight="800"
          fontFamily="'Outfit', sans-serif"
          fill="#040814"
          letterSpacing="-0.5"
        >
          CE
        </text>
        <defs>
          <linearGradient id="logoGrad" x1="4" y1="2" x2="36" y2="38" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#F5C842" />
            <stop offset="50%" stopColor="#F5A623" />
            <stop offset="100%" stopColor="#D98A07" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}
