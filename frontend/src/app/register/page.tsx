"use client";
import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ShieldCheck, Cpu, Database, Eye, EyeOff, Sparkles, Smartphone, Mail } from "lucide-react";
import CloudExchangeLogo from "../components/CloudExchangeLogo";
import SpaceBackground from "../components/SpaceBackground";

function RegisterForm() {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<"email" | "phone">("email");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [referral, setReferral] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [step, setStep] = useState<"form" | "verify">("form");
  const [otp, setOtp] = useState("");

  // Sync email from landing query parameter if present
  useEffect(() => {
    const emailParam = searchParams.get("email");
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [searchParams]);

  const pwStrength = password.length === 0 ? 0 : password.length < 6 ? 1 : password.length < 10 ? 2 : 3;
  const pwColors = ["transparent", "var(--red)", "var(--yellow)", "var(--green)"];
  const pwLabels = ["", "Weak", "Moderate", "Strong"];

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPw) return;
    setStep("verify");
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length < 6) return;
    // Set simulated account details
    localStorage.setItem("user_logged_in", "true");
    localStorage.setItem("username", email || phone || "new_trader@cloud.ex");
    window.location.href = "/trade";
  };

  return (
    <div style={{ minHeight: "100vh", position: "relative", display: "flex", flexDirection: "column", color: "var(--text-primary)", overflow: "hidden" }}>
      
      {/* Space Starry Background */}
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
          <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Already have an account?</span>
          <Link href="/login" style={{ border: "1px solid var(--border)", color: "var(--text-primary)", fontWeight: 600, fontSize: 13, padding: "8px 20px", borderRadius: 8, textDecoration: "none" }}>Log In</Link>
        </div>
      </header>

      {/* Body */}
      <div style={{ flex: 1, display: "flex", flexDirection: "row", zIndex: 10 }}>
        {/* Left Panel — Trust Info (Translucent background) */}
        <div style={{
          flex: 1,
          background: "linear-gradient(135deg, rgba(10, 17, 40, 0.6) 0%, rgba(4, 8, 20, 0.3) 100%)",
          backdropFilter: "blur(8px)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "flex-start",
          padding: "64px 80px",
          gap: 40,
          borderRight: "1px solid var(--border)"
        }}>
          <div>
            <div style={{ fontSize: 40, fontWeight: 900, color: "var(--yellow)", lineHeight: 1 }}>0-QUEUE</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)", marginTop: 8 }}>MATCHING ENGINE</div>
            <div style={{ fontSize: 14, color: "var(--text-secondary)", marginTop: 8 }}>Bespoke high-frequency ledger processing for sovereign desks</div>
          </div>

          {[
            { icon: <Cpu size={24} color="var(--cyan)" />, title: "Sub-Microsecond Latency", desc: "Rust-matching engine handles millions of operations with near-zero queue times." },
            { icon: <ShieldCheck size={24} color="var(--green)" />, title: "Full Ledger Proofs", desc: "Verifiable double-entry accounts with automated shadow integrity replayers." },
            { icon: <Database size={24} color="var(--yellow)" />, title: "Anti-Fraud P2P Escrow", desc: "Automated image validation scanner checks EXIF metrics to block receipt fraud." },
          ].map((item, idx) => (
            <div key={idx} style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
              <div style={{ background: "rgba(255,255,255,0.03)", padding: 12, borderRadius: 8, border: "1px solid var(--border)", backdropFilter: "blur(4px)" }}>
                {item.icon}
              </div>
              <div>
                <div style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: 15 }}>{item.title}</div>
                <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4, lineHeight: 1.5 }}>{item.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Right Panel — Form */}
        <div style={{ width: 500, background: "rgba(4, 8, 20, 0.4)", backdropFilter: "blur(12px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 40 }}>
          <div style={{ width: "100%" }}>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--text-primary)", marginBottom: 24, letterSpacing: "-0.01em" }}>
              {step === "form" ? "Register CloudExchange Account" : "Confirm Authentication"}
            </h1>

            {step === "form" && (
              <form onSubmit={handleRegisterSubmit} style={{
                background: "rgba(13, 27, 56, 0.45)",
                borderRadius: 12,
                padding: 28,
                border: "1px solid var(--border)",
                display: "flex",
                flexDirection: "column",
                gap: 16,
                boxShadow: "0 8px 32px 0 rgba(0, 0, 0, 0.37)"
              }}>
                {/* Email / Phone tabs */}
                <div style={{ display: "flex", gap: 0, marginBottom: 4, borderBottom: "1px solid var(--border)" }}>
                  {(["email", "phone"] as const).map(t => (
                    <button key={t} type="button" onClick={() => setTab(t)}
                      style={{ flex: 1, padding: "10px 0", background: "none", border: "none", borderBottom: `2px solid ${tab === t ? "var(--yellow)" : "transparent"}`, color: tab === t ? "var(--text-primary)" : "var(--text-secondary)", fontWeight: 700, fontSize: 13, cursor: "pointer", textTransform: "uppercase", letterSpacing: 0.5 }}>
                      {t}
                    </button>
                  ))}
                </div>

                {tab === "email" ? (
                  <div>
                    <label style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 700, display: "block", marginBottom: 6 }}>EMAIL ADDRESS</label>
                    <div style={{ position: "relative" }}>
                      <Mail size={16} style={{ position: "absolute", left: 14, top: 14, color: "var(--text-secondary)" }} />
                      <input type="email" className="bn-input" placeholder="name@company.com" value={email} onChange={e => setEmail(e.target.value)} style={{ paddingLeft: 42 }} required />
                    </div>
                  </div>
                ) : (
                  <div>
                    <label style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 700, display: "block", marginBottom: 6 }}>PHONE NUMBER</label>
                    <div style={{ display: "flex", gap: 8 }}>
                      <select className="bn-select" style={{ width: 90, height: 46 }}>
                        <option>+91 (IN)</option>
                        <option>+1 (US)</option>
                        <option>+44 (UK)</option>
                        <option>+65 (SG)</option>
                      </select>
                      <input type="tel" className="bn-input" placeholder="Phone number" value={phone} onChange={e => setPhone(e.target.value)} style={{ flex: 1 }} required />
                    </div>
                  </div>
                )}

                <div>
                  <label style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 700, display: "block", marginBottom: 6 }}>PASSWORD</label>
                  <div style={{ position: "relative" }}>
                    <input type={showPw ? "text" : "password"} className="bn-input" placeholder="Minimum 8 characters" value={password} onChange={e => setPassword(e.target.value)} required />
                    <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer" }}>
                      {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {/* Strength indicator */}
                  {password.length > 0 && (
                    <div style={{ display: "flex", gap: 4, marginTop: 8, alignItems: "center" }}>
                      {[1, 2, 3].map(i => (
                        <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= pwStrength ? pwColors[pwStrength] : "var(--border)" }} />
                      ))}
                      <span style={{ fontSize: 11, color: pwColors[pwStrength], marginLeft: 8, fontWeight: 700 }}>{pwLabels[pwStrength]}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 700, display: "block", marginBottom: 6 }}>CONFIRM PASSWORD</label>
                  <input type="password" className="bn-input" placeholder="Re-enter password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} required />
                  {confirmPw && password !== confirmPw && (
                    <div style={{ fontSize: 12, color: "var(--red)", marginTop: 4, fontWeight: 600 }}>Passwords do not match</div>
                  )}
                </div>

                <div>
                  <label style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 700, display: "block", marginBottom: 6 }}>REFERRAL ID (OPTIONAL)</label>
                  <input type="text" className="bn-input" placeholder="Referral code" value={referral} onChange={e => setReferral(e.target.value)} />
                </div>

                <label style={{ display: "flex", gap: 10, alignItems: "flex-start", cursor: "pointer", fontSize: 12, color: "var(--text-secondary)", marginTop: 8 }}>
                  <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} style={{ marginTop: 2, accentColor: "var(--yellow)" }} required />
                  <span>I agree to the CloudExchange Terms of Service, Privacy Policy, and Risk Disclosure declarations.</span>
                </label>

                <button
                  type="submit"
                  className="btn-yellow"
                  style={{ width: "100%", padding: 14, fontSize: 14, fontWeight: 700, marginTop: 12 }}
                  disabled={!agreed || (password !== confirmPw) || password.length < 8}
                >
                  Create Trading Account
                </button>
              </form>
            )}

            {step === "verify" && (
              <form onSubmit={handleVerifyOtp} style={{
                background: "rgba(13, 27, 56, 0.45)",
                borderRadius: 12,
                padding: 28,
                border: "1px solid var(--border)",
                display: "flex",
                flexDirection: "column",
                gap: 16,
                boxShadow: "0 8px 32px 0 rgba(0, 0, 0, 0.37)"
              }}>
                <div style={{ textAlign: "center", marginBottom: 8 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginBottom: 6 }}>One-Time Password Sent</h3>
                  <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>A 6-digit confirmation code has been dispatched to your primary details.</p>
                </div>

                <div>
                  <label style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 700, display: "block", marginBottom: 6, textAlign: "center" }}>ENTER OTP CODE</label>
                  <input
                    type="text"
                    maxLength={6}
                    className="bn-input"
                    placeholder="000000"
                    value={otp}
                    onChange={e => setOtp(e.target.value.replace(/\D/g, ""))}
                    style={{ textAlign: "center", fontSize: 24, letterSpacing: 8, fontWeight: "bold" }}
                    required
                  />
                </div>

                <button type="submit" className="btn-yellow" style={{ width: "100%", padding: 14, fontSize: 14, fontWeight: 700, marginTop: 8 }}>
                  Confirm Verification & Login
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#040814", color: "var(--text-secondary)" }}>
        Loading Registration Portal...
      </div>
    }>
      <RegisterForm />
    </Suspense>
  );
}
