"use client";
import React from "react";
import Link from "next/link";
import CloudExchangeLogo from "./CloudExchangeLogo";

export default function Footer() {
  const socials = [
    { name: "𝕏", href: "https://x.com/CloudExchange" },
    { name: "Discord", href: "https://discord.gg/CloudExchange" },
    { name: "Telegram", href: "https://t.me/CloudExchange" },
    { name: "Github", href: "https://github.com/CloudExchange" }
  ];

  const columns = [
    {
      title: "Core Features",
      links: [
        ["Terminal", "/trade"],
        ["P2P Escrow", "/p2p"],
        ["KYC Liveness", "/kyc"],
        ["Ledger Audit", "/ledger"]
      ]
    },
    {
      title: "Technical Layers",
      links: [
        ["API Whitelist", "/info/api-whitelist"],
        ["Shadow Replay", "/info/shadow-replay"],
        ["Disruptor Buffer", "/info/disruptor-buffer"],
        ["FIX Gateway", "/info/fix-gateway"]
      ]
    },
    {
      title: "Legal & Support",
      links: [
        ["Help Center", "/info/help-center"],
        ["Security Audits", "/info/security-audits"],
        ["Terms of Service", "/info/terms-of-service"],
        ["Privacy Policy", "/info/privacy-policy"]
      ]
    }
  ];

  return (
    <footer style={{
      background: "rgba(10, 17, 40, 0.75)",
      backdropFilter: "blur(12px)",
      borderTop: "1px solid var(--border)",
      padding: "64px 0 32px",
      fontSize: 13,
      color: "var(--text-secondary)",
      marginTop: "auto",
      width: "100%",
      position: "relative",
      zIndex: 10
    }}>
      <div className="container-xl">
        <div className="footer-grid">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <CloudExchangeLogo size={24} />
              <span style={{ fontSize: 18, fontWeight: 800, color: "var(--text-primary)" }}>
                Cloud<span style={{ color: "var(--yellow)" }}>Exchange</span>
              </span>
            </div>
            <p style={{ lineHeight: 1.8, marginBottom: 24, maxWidth: 300 }}>
              Sub-microsecond high-performance decentralized ledger execution matching portal.
            </p>
            <div style={{ display: "flex", gap: 12 }}>
              {socials.map((s) => (
                <a 
                  key={s.name} 
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    background: "var(--bg-hover)",
                    border: "1px solid var(--border)",
                    color: "var(--text-primary)",
                    borderRadius: 6,
                    padding: "6px 16px",
                    cursor: "pointer",
                    fontSize: 11,
                    fontWeight: 600,
                    textDecoration: "none",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "all 0.2s"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "var(--yellow)";
                    e.currentTarget.style.borderColor = "var(--yellow)";
                    e.currentTarget.style.background = "rgba(245, 166, 35, 0.05)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "var(--text-primary)";
                    e.currentTarget.style.borderColor = "var(--border)";
                    e.currentTarget.style.background = "var(--bg-hover)";
                  }}
                >
                  {s.name}
                </a>
              ))}
            </div>
          </div>

          {columns.map((col, idx) => (
            <div key={idx}>
              <h4 style={{ color: "var(--text-primary)", fontWeight: 700, marginBottom: 16 }}>{col.title}</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {col.links.map((link, lidx) => (
                  <Link 
                    key={lidx} 
                    href={link[1]} 
                    style={{ 
                      color: "var(--text-secondary)", 
                      textDecoration: "none",
                      transition: "color 0.15s"
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = "var(--yellow)"}
                    onMouseLeave={e => e.currentTarget.style.color = "var(--text-secondary)"}
                  >
                    {link[0]}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="footer-bottom">
          <span>© 2026 CloudExchange Group. All rights reserved.</span>
          <div style={{ display: "flex", gap: 16 }}>
            <Link href="/info/risk-warning" style={{ color: "var(--text-secondary)", textDecoration: "none", transition: "color 0.15s" }}
              onMouseEnter={e => e.currentTarget.style.color = "var(--yellow)"}
              onMouseLeave={e => e.currentTarget.style.color = "var(--text-secondary)"}>Risk Warning</Link>
            <Link href="/info/cookie-preferences" style={{ color: "var(--text-secondary)", textDecoration: "none", transition: "color 0.15s" }}
              onMouseEnter={e => e.currentTarget.style.color = "var(--yellow)"}
              onMouseLeave={e => e.currentTarget.style.color = "var(--text-secondary)"}>Cookie Preferences</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
