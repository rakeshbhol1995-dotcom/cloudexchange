"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { LogOut, Menu, X, ShieldAlert } from "lucide-react";
import CloudExchangeLogo from "./CloudExchangeLogo";

interface HeaderProps {
  activeTab?: "home" | "coins" | "trade" | "p2p" | "kyc" | "ledger" | "admin" | "list-token" | "bots" | "copy-trade" | "earn" | "security" | "affiliate";
}

export default function Header({ activeTab }: HeaderProps) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Auto-sync authentication state from localStorage
  useEffect(() => {
    const syncAuth = () => {
      const logged = localStorage.getItem("user_logged_in") === "true";
      const email = localStorage.getItem("username") || "demo_institutional@cloud.ex";
      setIsLoggedIn(logged);
      setUserEmail(email);
    };

    syncAuth();
    window.addEventListener("storage", syncAuth);
    return () => window.removeEventListener("storage", syncAuth);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("user_logged_in");
    localStorage.removeItem("username");
    setIsLoggedIn(false);
    setUserEmail("");
    window.dispatchEvent(new Event("storage"));
    window.location.href = "/";
  };

  return (
    <>
      <header style={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        background: "rgba(10, 17, 40, 0.75)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid var(--border)",
        height: 64,
        display: "flex",
        alignItems: "center",
        padding: "0 24px",
        justifyContent: "space-between"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
            <CloudExchangeLogo size={32} />
            <span style={{ fontSize: 20, fontWeight: 800, color: "var(--text-primary)", letterSpacing: -0.5 }}>
              Cloud<span style={{ color: "var(--yellow)" }}>Exchange</span>
            </span>
          </Link>

          {/* DESKTOP NAV */}
          <nav className="hide-on-mobile" style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
            <Link href="/" className={`btn-ghost ${activeTab === "home" ? "active" : ""}`} style={{ fontSize: 12, padding: "6px 8px", textDecoration: "none", color: activeTab === "home" ? "var(--yellow)" : "var(--text-primary)" }}>Home</Link>
            <Link href="/coins" className={`btn-ghost ${activeTab === "coins" ? "active" : ""}`} style={{ fontSize: 12, padding: "6px 8px", textDecoration: "none", color: activeTab === "coins" ? "var(--yellow)" : "var(--text-primary)" }}>Coins</Link>
            <Link href="/trade" className={`btn-ghost ${activeTab === "trade" ? "active" : ""}`} style={{ fontSize: 12, padding: "6px 8px", textDecoration: "none", color: activeTab === "trade" ? "var(--yellow)" : "var(--text-primary)" }}>Trade</Link>
            <Link href="/p2p" className={`btn-ghost ${activeTab === "p2p" ? "active" : ""}`} style={{ fontSize: 12, padding: "6px 8px", textDecoration: "none", color: activeTab === "p2p" ? "var(--yellow)" : "var(--text-primary)" }}>P2P Fiat</Link>
            <Link href="/kyc" className={`btn-ghost ${activeTab === "kyc" ? "active" : ""}`} style={{ fontSize: 12, padding: "6px 8px", textDecoration: "none", color: activeTab === "kyc" ? "var(--yellow)" : "var(--text-primary)" }}>KYC</Link>
            <Link href="/bots" className={`btn-ghost ${activeTab === "bots" ? "active" : ""}`} style={{ fontSize: 12, padding: "6px 8px", textDecoration: "none", color: activeTab === "bots" ? "var(--yellow)" : "var(--text-primary)" }}>Bots</Link>
            <Link href="/copy-trade" className={`btn-ghost ${activeTab === "copy-trade" ? "active" : ""}`} style={{ fontSize: 12, padding: "6px 8px", textDecoration: "none", color: activeTab === "copy-trade" ? "var(--yellow)" : "var(--text-primary)" }}>Copy Trade</Link>
            <Link href="/earn" className={`btn-ghost ${activeTab === "earn" ? "active" : ""}`} style={{ fontSize: 12, padding: "6px 8px", textDecoration: "none", color: activeTab === "earn" ? "var(--yellow)" : "var(--text-primary)" }}>Earn</Link>
            <Link href="/security" className={`btn-ghost ${activeTab === "security" ? "active" : ""}`} style={{ fontSize: 12, padding: "6px 8px", textDecoration: "none", color: activeTab === "security" ? "var(--yellow)" : "var(--text-primary)" }}>Security</Link>
            <Link href="/affiliate" className={`btn-ghost ${activeTab === "affiliate" ? "active" : ""}`} style={{ fontSize: 12, padding: "6px 8px", textDecoration: "none", color: activeTab === "affiliate" ? "var(--yellow)" : "var(--text-primary)" }}>Affiliate</Link>
            <Link href="/ledger" className={`btn-ghost ${activeTab === "ledger" ? "active" : ""}`} style={{ fontSize: 12, padding: "6px 8px", textDecoration: "none", color: activeTab === "ledger" ? "var(--yellow)" : "var(--text-primary)" }}>Audit</Link>
          </nav>
        </div>

        {/* DESKTOP AUTH & ACTIONS */}
        <div className="hide-on-mobile" style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link href="/list-token" className="btn-outline bn-tab-sm" style={{ padding: "6px 14px", fontSize: 12, cursor: "pointer", borderRadius: 6, textDecoration: "none" }}>
            List Your Coin
          </Link>
          
          {isLoggedIn ? (
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <span style={{ fontSize: 13, color: "var(--text-secondary)", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {userEmail}
              </span>
              <button onClick={handleLogout} className="btn-outline" style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", fontSize: 12, cursor: "pointer", borderRadius: 6 }}>
                <LogOut size={14} /> Log Out
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Link href="/login" style={{ color: "var(--text-primary)", fontWeight: 600, fontSize: 13, padding: "8px 18px", borderRadius: 8, textDecoration: "none", border: "1px solid var(--border)" }}>Log In</Link>
              <Link href="/register" style={{ background: "var(--yellow)", color: "#000", fontWeight: 700, fontSize: 13, padding: "8px 18px", borderRadius: 8, textDecoration: "none" }}>Sign Up</Link>
            </div>
          )}
        </div>

        {/* HAMBURGER TOGGLE BUTTON FOR MOBILE */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          style={{
            display: "none",
            background: "var(--bg-hover)",
            border: "1px solid var(--border)",
            color: "var(--text-primary)",
            borderRadius: 8,
            width: 38,
            height: 38,
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            flexShrink: 0
          }}
          className="home-hamburger"
          aria-label="Toggle Menu"
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>

      {/* MOBILE NAV DRAWER */}
      {mobileMenuOpen && (
        <div style={{
          position: "fixed",
          top: 64,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 998,
          background: "rgba(4, 8, 20, 0.97)",
          backdropFilter: "blur(20px)",
          display: "flex",
          flexDirection: "column",
          padding: "20px 18px 40px",
          gap: 8,
          overflowY: "auto"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 4px 16px", borderBottom: "1px solid var(--border)", marginBottom: 8 }}>
            <CloudExchangeLogo size={26} />
            <span style={{ fontSize: 17, fontWeight: 800, color: "#fff" }}>Cloud<span style={{ color: "var(--yellow)" }}>Exchange</span></span>
          </div>
          
          <Link href="/coins" onClick={() => setMobileMenuOpen(false)} style={{
            display: "block",
            width: "100%",
            padding: "12px 16px",
            fontSize: "15px",
            fontWeight: 600,
            color: activeTab === "coins" ? "var(--yellow)" : "var(--text-primary)",
            textDecoration: "none",
            borderRadius: "10px",
            background: "rgba(255,255,255,0.03)"
          }}>🪙 Coins</Link>
          
          <Link href="/trade" onClick={() => setMobileMenuOpen(false)} style={{
            display: "block",
            width: "100%",
            padding: "12px 16px",
            fontSize: "15px",
            fontWeight: 600,
            color: activeTab === "trade" ? "var(--yellow)" : "var(--text-primary)",
            textDecoration: "none",
            borderRadius: "10px",
            background: "rgba(255,255,255,0.03)"
          }}>📊 Trade Terminal</Link>
          
          <Link href="/p2p" onClick={() => setMobileMenuOpen(false)} style={{
            display: "block",
            width: "100%",
            padding: "12px 16px",
            fontSize: "15px",
            fontWeight: 600,
            color: activeTab === "p2p" ? "var(--yellow)" : "var(--text-primary)",
            textDecoration: "none",
            borderRadius: "10px",
            background: "rgba(255,255,255,0.03)"
          }}>🔄 P2P Fiat</Link>
          
          <Link href="/kyc" onClick={() => setMobileMenuOpen(false)} style={{
            display: "block",
            width: "100%",
            padding: "12px 16px",
            fontSize: "15px",
            fontWeight: 600,
            color: activeTab === "kyc" ? "var(--yellow)" : "var(--text-primary)",
            textDecoration: "none",
            borderRadius: "10px",
            background: "rgba(255,255,255,0.03)"
          }}>🛡️ KYC &amp; Wallet</Link>

          <Link href="/bots" onClick={() => setMobileMenuOpen(false)} style={{
            display: "block",
            width: "100%",
            padding: "12px 16px",
            fontSize: "15px",
            fontWeight: 600,
            color: activeTab === "bots" ? "var(--yellow)" : "var(--text-primary)",
            textDecoration: "none",
            borderRadius: "10px",
            background: "rgba(255,255,255,0.03)"
          }}>🤖 Trading Bots</Link>

          <Link href="/copy-trade" onClick={() => setMobileMenuOpen(false)} style={{
            display: "block",
            width: "100%",
            padding: "12px 16px",
            fontSize: "15px",
            fontWeight: 600,
            color: activeTab === "copy-trade" ? "var(--yellow)" : "var(--text-primary)",
            textDecoration: "none",
            borderRadius: "10px",
            background: "rgba(255,255,255,0.03)"
          }}>👥 Copy Trading</Link>

          <Link href="/earn" onClick={() => setMobileMenuOpen(false)} style={{
            display: "block",
            width: "100%",
            padding: "12px 16px",
            fontSize: "15px",
            fontWeight: 600,
            color: activeTab === "earn" ? "var(--yellow)" : "var(--text-primary)",
            textDecoration: "none",
            borderRadius: "10px",
            background: "rgba(255,255,255,0.03)"
          }}>💰 CloudEarn &amp; Loans</Link>

          <Link href="/security" onClick={() => setMobileMenuOpen(false)} style={{
            display: "block",
            width: "100%",
            padding: "12px 16px",
            fontSize: "15px",
            fontWeight: 600,
            color: activeTab === "security" ? "var(--yellow)" : "var(--text-primary)",
            textDecoration: "none",
            borderRadius: "10px",
            background: "rgba(255,255,255,0.03)"
          }}>🔒 Security &amp; Compliance</Link>

          <Link href="/affiliate" onClick={() => setMobileMenuOpen(false)} style={{
            display: "block",
            width: "100%",
            padding: "12px 16px",
            fontSize: "15px",
            fontWeight: 600,
            color: activeTab === "affiliate" ? "var(--yellow)" : "var(--text-primary)",
            textDecoration: "none",
            borderRadius: "10px",
            background: "rgba(255,255,255,0.03)"
          }}>🤝 Affiliate Ledger</Link>
          
          <Link href="/ledger" onClick={() => setMobileMenuOpen(false)} style={{
            display: "block",
            width: "100%",
            padding: "12px 16px",
            fontSize: "15px",
            fontWeight: 600,
            color: activeTab === "ledger" ? "var(--yellow)" : "var(--text-primary)",
            textDecoration: "none",
            borderRadius: "10px",
            background: "rgba(255,255,255,0.03)"
          }}>📋 Ledger Audit</Link>

          <Link href="/list-token" onClick={() => setMobileMenuOpen(false)} style={{
            display: "block",
            width: "100%",
            padding: "12px 16px",
            fontSize: "15px",
            fontWeight: 600,
            color: activeTab === "list-token" ? "var(--yellow)" : "var(--text-primary)",
            textDecoration: "none",
            borderRadius: "10px",
            background: "rgba(255,255,255,0.03)"
          }}>🪙 List Your Coin</Link>
          
          <div style={{ height: 1, background: "var(--border)", margin: "8px 0" }} />
          
          {isLoggedIn ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <span style={{ fontSize: 13, color: "var(--text-secondary)", padding: "0 18px", wordBreak: "break-all" }}>
                Logged in as: {userEmail}
              </span>
              <button onClick={() => { handleLogout(); setMobileMenuOpen(false); }} style={{
                display: "block",
                width: "100%",
                padding: "14px 18px",
                fontSize: "16px",
                fontWeight: 600,
                color: "var(--red)",
                border: "1px solid rgba(255,23,68,0.3)",
                background: "rgba(255,23,68,0.06)",
                borderRadius: "12px",
                cursor: "pointer",
                textAlign: "left"
              }}>
                🚪 Log Out
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <Link href="/login" onClick={() => setMobileMenuOpen(false)} style={{
                display: "block",
                width: "100%",
                padding: "14px 18px",
                fontSize: "16px",
                fontWeight: 700,
                color: "var(--text-primary)",
                textDecoration: "none",
                borderRadius: "12px",
                border: "1px solid var(--border)",
                textAlign: "center"
              }}>Log In</Link>
              <Link href="/register" onClick={() => setMobileMenuOpen(false)} style={{
                display: "block",
                width: "100%",
                padding: "14px 18px",
                fontSize: "16px",
                fontWeight: 800,
                color: "#000",
                background: "var(--yellow)",
                textDecoration: "none",
                borderRadius: "12px",
                textAlign: "center"
              }}>⚡ Sign Up Free</Link>
            </div>
          )}
        </div>
      )}

      {/* CSS overrides inside style tag to dynamically display menu elements */}
      <style jsx global>{`
        @media (max-width: 768px) {
          .hide-on-mobile {
            display: none !important;
          }
          .home-hamburger {
            display: flex !important;
          }
        }
      `}</style>
    </>
  );
}
