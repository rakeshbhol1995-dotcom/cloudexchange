"use client";
import React, { useState } from "react";
import Link from "next/link";
import { Key, Mail, ShieldAlert, Sparkles, Smartphone, ArrowLeft } from "lucide-react";
import CloudExchangeLogo from "../components/CloudExchangeLogo";
import SpaceBackground from "../components/SpaceBackground";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<"email" | "password" | "mfa">("email");
  const [password, setPassword] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleContinue = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    if (step === "email") {
      if (!email.includes("@")) {
        setErrorMsg("Please enter a valid email address.");
        return;
      }
      setStep("password");
    } else if (step === "password") {
      if (password.length < 6) {
        setErrorMsg("Password must be at least 6 characters.");
        return;
      }
      setStep("mfa");
    }
  };

  const handleVerifyMfa = (e: React.FormEvent) => {
    e.preventDefault();
    if (mfaCode.length < 6) {
      setErrorMsg("MFA code must be exactly 6 digits.");
      return;
    }
    // Set persistent login states
    localStorage.setItem("user_logged_in", "true");
    localStorage.setItem("username", email || "institutional_trader@cloud.ex");
    window.location.href = "/trade";
  };

  const handleQuickLogin = () => {
    localStorage.setItem("user_logged_in", "true");
    localStorage.setItem("username", "demo_institutional@cloud.ex");
    window.location.href = "/trade";
  };

  return (
    <div style={{ minHeight: "100vh", position: "relative", display: "flex", flexDirection: "column", color: "var(--text-primary)", overflow: "hidden" }}>
      
      {/* Animated stars, shooting stars, and moon background */}
      <SpaceBackground />

      {/* Header */}
      <header style={{
        background: "rgba(10, 17, 40, 0.75)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid var(--border)",
        padding: "0 24px",
        height: 64,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        zIndex: 10
      }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <CloudExchangeLogo size={28} />
          <span style={{ fontSize: 18, fontWeight: 800, color: "var(--text-primary)" }}>
            Cloud<span style={{ color: "var(--yellow)" }}>Exchange</span>
          </span>
        </Link>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Don&apos;t have an account?</span>
          <Link href="/register" style={{ background: "var(--yellow)", color: "#000", fontWeight: 700, fontSize: 13, padding: "8px 20px", borderRadius: 8, textDecoration: "none" }}>Sign Up</Link>
        </div>
      </header>

      {/* Body */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, zIndex: 10 }}>
        <div style={{ width: "100%", maxWidth: 420 }}>
          {/* Logo */}
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
              <CloudExchangeLogo size={48} />
            </div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: "var(--text-primary)", marginBottom: 6, letterSpacing: "-0.02em" }}>Log In</h1>
            <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>Access your CloudExchange trading desk</p>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div style={{ background: "var(--red-dim)", border: "1px solid var(--red)", color: "var(--red)", borderRadius: 8, padding: "12px 16px", marginBottom: 16, fontSize: 13, display: "flex", gap: 8, alignItems: "center" }}>
              <ShieldAlert size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Card */}
          <div style={{
            background: "rgba(13, 27, 56, 0.45)",
            borderRadius: 12,
            padding: "32px",
            border: "1px solid var(--border)",
            backdropFilter: "blur(12px)",
            boxShadow: "0 8px 32px 0 rgba(0, 0, 0, 0.37)"
          }}>

            {step === "email" && (
              <form onSubmit={handleContinue} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <label style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 700, display: "block", marginBottom: 8, letterSpacing: 0.5 }}>EMAIL ADDRESS</label>
                  <div style={{ position: "relative" }}>
                    <Mail size={16} style={{ position: "absolute", left: 14, top: 15, color: "var(--text-secondary)" }} />
                    <input
                      type="email"
                      className="bn-input"
                      placeholder="Enter institutional or personal email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      style={{ paddingLeft: 42 }}
                      required
                    />
                  </div>
                </div>
                
                <button type="submit" className="btn-yellow" style={{ width: "100%", padding: "14px", fontSize: 14, fontWeight: 700, borderRadius: 8 }}>
                  Continue
                </button>

                {/* Divider */}
                <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "8px 0" }}>
                  <div style={{ flex: 1, height: 1, background: "var(--border-light)" }} />
                  <span style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.5 }}>Quick Access</span>
                  <div style={{ flex: 1, height: 1, background: "var(--border-light)" }} />
                </div>

                {/* Quick Simulation Login (Crucial for validation testing) */}
                <button type="button" onClick={handleQuickLogin} className="sso-btn" style={{
                  background: "var(--cyan-dim)",
                  border: "1px solid var(--cyan)",
                  color: "var(--cyan)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  fontWeight: 600
                }}>
                  <Sparkles size={16} /> Bypass to Sandbox (Quick Demo)
                </button>

                {/* SSO Buttons */}
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
                  {[
                    { icon: <Key size={16} />, label: "Continue with Passkey" },
                    { icon: <Smartphone size={16} />, label: "Continue with Mobile / OTP" },
                  ].map((sso) => (
                    <button key={sso.label} type="button" className="sso-btn" style={{ fontSize: 13, gap: 8 }}>
                      <span style={{ color: "var(--text-secondary)" }}>{sso.icon}</span>
                      <span>{sso.label}</span>
                    </button>
                  ))}
                </div>
              </form>
            )}

            {step === "password" && (
              <form onSubmit={handleContinue} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13, color: "var(--text-secondary)" }}>
                  <span>Trading account: <strong style={{ color: "var(--text-primary)" }}>{email}</strong></span>
                  <button type="button" onClick={() => setStep("email")} style={{ background: "none", border: "none", color: "var(--cyan)", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                    <ArrowLeft size={12} /> Edit
                  </button>
                </div>

                <div>
                  <label style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 700, display: "block", marginBottom: 8 }}>PASSWORD</label>
                  <div style={{ position: "relative" }}>
                    <input
                      type={showPw ? "text" : "password"}
                      className="bn-input"
                      placeholder="Enter your security password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                    />
                    <button type="button" onClick={() => setShowPw(!showPw)}
                      style={{ position: "absolute", right: 14, top: 12, background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", fontSize: 12 }}>
                      {showPw ? "Hide" : "Show"}
                    </button>
                  </div>
                </div>

                <div style={{ textAlign: "right" }}>
                  <button type="button" style={{ background: "none", border: "none", color: "var(--yellow)", fontSize: 12, cursor: "pointer" }}>Forgot password?</button>
                </div>

                <button type="submit" className="btn-yellow" style={{ width: "100%", padding: "14px", fontSize: 14, fontWeight: 700, borderRadius: 8 }}>
                  Authenticate Credentials
                </button>
              </form>
            )}

            {step === "mfa" && (
              <form onSubmit={handleVerifyMfa} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ textAlign: "center", marginBottom: 8 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginBottom: 6 }}>Biometric / TOTP Verification</div>
                  <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>Enter the 6-digit verification code from your Google Authenticator app</p>
                </div>

                <div>
                  <label style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 700, display: "block", marginBottom: 8, textAlign: "center" }}>SECURITY TOTP CODE</label>
                  <input
                    type="text"
                    maxLength={6}
                    className="bn-input"
                    placeholder="000000"
                    value={mfaCode}
                    onChange={e => setMfaCode(e.target.value.replace(/\D/g, ""))}
                    style={{ textAlign: "center", fontSize: 24, letterSpacing: 8, fontWeight: "bold" }}
                    required
                  />
                </div>

                <button type="submit" className="btn-yellow" style={{ width: "100%", padding: "14px", fontSize: 14, fontWeight: 700, borderRadius: 8 }}>
                  Verify & Enter Terminal
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
