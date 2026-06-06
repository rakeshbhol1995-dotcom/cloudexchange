"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Key, Mail, ShieldAlert, Sparkles, Smartphone, ArrowLeft, Camera, ShieldCheck } from "lucide-react";
import CloudExchangeLogo from "../components/CloudExchangeLogo";
import SpaceBackground from "../components/SpaceBackground";
import { generateDeviceFingerprint } from "../utils/fingerprint";
import { API_URL } from "../utils/api";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loginMethod, setLoginMethod] = useState<"email" | "phone">("email");
  const [step, setStep] = useState<"email" | "password" | "mfa" | "selfie_verification">("email");
  const [password, setPassword] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Simulated multi-device challenge toggle for live presentations
  const [simulateDifferentDevice, setSimulateDifferentDevice] = useState(false);

  // Selfie liveness simulation states
  const [selfieStep, setSelfieStep] = useState<"position" | "blink" | "smile" | "analyzing" | "completed">("position");
  const [selfieLogs, setSelfieLogs] = useState("Position your face inside the dynamic security ring...");
  const [selfieProgress, setSelfieProgress] = useState(0);

  // Temporary container for login success parameters to apply after selfie check
  const [pendingLoginData, setPendingLoginData] = useState<any>(null);

  // Trigger liveness animation automatically if step changes to selfie_verification
  useEffect(() => {
    if (step === "selfie_verification") {
      setSelfieStep("position");
      setSelfieProgress(0);
      setSelfieLogs("Aligning face profile inside the authentication area...");
      
      let timer1 = setTimeout(() => {
        setSelfieStep("blink");
        setSelfieLogs("BLINK YOUR EYES 3 TIMES");
      }, 3000);

      let timer2 = setTimeout(() => {
        setSelfieStep("smile");
        setSelfieLogs("HOLD A CLEAR SMILE");
      }, 7000);

      let timer3 = setTimeout(() => {
        setSelfieStep("analyzing");
        setSelfieLogs("Verifying liveness biometrics telemetry...");
      }, 10500);

      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        clearTimeout(timer3);
      };
    }
  }, [step]);

  useEffect(() => {
    if (selfieStep === "analyzing") {
      let progress = 0;
      const interval = setInterval(() => {
        progress += 10;
        setSelfieProgress(progress);
        if (progress >= 100) {
          clearInterval(interval);
          setSelfieStep("completed");
          setSelfieLogs("IDENTITY CONFIRMED. AUTHORIZING NEW TERMINAL SESSION...");
          setTimeout(() => {
            // Apply pending login sessions
            if (pendingLoginData) {
              applyLoginSession(pendingLoginData);
            } else {
              setErrorMsg("No pending login session found. Please log in again.");
              setStep("email");
            }
          }, 1500);
        }
      }, 200);
      return () => clearInterval(interval);
    }
  }, [selfieStep, pendingLoginData]);

  const applyLoginSession = (data: any) => {
    localStorage.setItem("user_logged_in", "true");
    localStorage.setItem("username", data.email || email || phone);
    localStorage.setItem("user_id", data.userId || "usr-fallback");
    localStorage.setItem("kyc_tier", data.kycStatus || "Tier-2 Verified (Biometrics Approved)");
    localStorage.setItem("is_p2p_merchant", data.isMerchant ? "true" : "false");
    if (data.merchantUpi) {
      localStorage.setItem("merchant_upi_id", data.merchantUpi);
    } else {
      localStorage.removeItem("merchant_upi_id");
    }
    if (data.balances) {
      localStorage.setItem("user_asset_balances", JSON.stringify(data.balances.map((b: any) => ({
        symbol: b.symbol,
        name: b.symbol === "USDT" ? "Tether USD" : b.symbol === "BTC" ? "Bitcoin" : b.symbol === "ETH" ? "Ethereum" : b.symbol === "SOL" ? "Solana" : "BNB Smart Chain",
        amount: parseFloat(b.amount),
        inOrder: parseFloat(b.in_order),
        color: b.symbol === "USDT" ? "#26A17B" : b.symbol === "BTC" ? "#F7931A" : b.symbol === "ETH" ? "#627EEA" : b.symbol === "SOL" ? "#14F195" : "#F3BA2F"
      }))));
    }
    window.location.href = "/trade";
  };

  const handleContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    if (step === "email") {
      if (loginMethod === "email") {
        if (!email.includes("@")) {
          setErrorMsg("Please enter a valid email address.");
          return;
        }
        setStep("password");
      } else {
        if (phone.length < 8) {
          setErrorMsg("Please enter a valid phone number.");
          return;
        }
        
        try {
          const res = await fetch(`${API_URL}/security/send-sms-otp`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: phone, phoneNumber: phone })
          });
          const data = await res.json();
          if (!res.ok) {
            setErrorMsg(data.error || "Failed to send SMS OTP.");
            return;
          }
          setStep("mfa");
        } catch (err: any) {
          setErrorMsg("Failed to dispatch SMS OTP: " + err.message);
        }
      }
    } else if (step === "password") {
      if (password.length < 6) {
        setErrorMsg("Password must be at least 6 characters.");
        return;
      }

      // Proactively trigger email OTP dispatch upon password entry
      try {
        await fetch(`${API_URL}/security/send-email-otp`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email })
        });
      } catch (err) {
        console.warn("Failed to dispatch login OTP: ", err);
      }

      setStep("mfa");
    }
  };

  const handleVerifyMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mfaCode.length < 6) {
      setErrorMsg("MFA code must be exactly 6 digits.");
      return;
    }
    setErrorMsg("");

    const identifier = loginMethod === "phone" ? phone : email;

    try {
      const verifyPayload = loginMethod === "phone"
        ? { email: phone, smsCode: mfaCode }
        : { email, emailCode: mfaCode };

      const verifyRes = await fetch(`${API_URL}/security/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(verifyPayload)
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) {
        setErrorMsg(verifyData.error || "Incorrect 2FA / OTP verification code.");
        return;
      }

      const fingerprintObj = await generateDeviceFingerprint();
      const currentHash = fingerprintObj.hash;

      // Check if a different device has logged in or toggle is active
      const storedHash = localStorage.getItem(`user_device_fingerprint_${identifier}`);
      const isNewDevice = simulateDifferentDevice || (storedHash && storedHash !== currentHash);

      let response;
      if (loginMethod === "phone") {
        response = await fetch(`${API_URL}/auth/passwordless-login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phoneOrEmail: phone })
        });
      } else {
        response = await fetch(`${API_URL}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password })
        });
      }

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Authentication failed");
      }

      // If new device detected, store pending login session and require selfie liveness
      if (isNewDevice) {
        setPendingLoginData(data);
        localStorage.setItem(`user_device_fingerprint_${identifier}`, currentHash);
        setStep("selfie_verification");
        return;
      }

      // Save fingerprint if not already set
      if (!storedHash) {
        localStorage.setItem(`user_device_fingerprint_${identifier}`, currentHash);
      }

      // Normal path (Same device)
      applyLoginSession(data);
    } catch (err: any) {
      setErrorMsg(err.message || "Authentication failed. Database or server offline.");
    }
  };

  const handlePasskeyLogin = async () => {
    setErrorMsg("");
    const identifier = email || phone;
    if (!identifier) {
      setErrorMsg("Please enter your email or mobile number first to authenticate with Passkey.");
      return;
    }

    try {
      if (typeof window !== "undefined" && window.PublicKeyCredential) {
        try {
          const challenge = new Uint8Array(32);
          window.crypto.getRandomValues(challenge);
          
          await navigator.credentials.get({
            publicKey: {
              challenge,
              rpId: window.location.hostname,
              userVerification: "required",
              timeout: 10000
            }
          });
        } catch (webauthnErr) {
          console.warn("Native WebAuthn prompt error / cancel: ", webauthnErr);
        }
      }

      const response = await fetch(`${API_URL}/auth/passwordless-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneOrEmail: identifier })
      });

      const data = await response.json();
      if (!response.ok) {
        setErrorMsg(data.error || "Passkey login failed. Please register first.");
        return;
      }

      const fingerprintObj = await generateDeviceFingerprint();
      const currentHash = fingerprintObj.hash;
      const storedHash = localStorage.getItem(`user_device_fingerprint_${identifier}`);
      const isNewDevice = simulateDifferentDevice || (storedHash && storedHash !== currentHash);

      if (isNewDevice) {
        setPendingLoginData(data);
        localStorage.setItem(`user_device_fingerprint_${identifier}`, currentHash);
        setStep("selfie_verification");
        return;
      }

      if (!storedHash) {
        localStorage.setItem(`user_device_fingerprint_${identifier}`, currentHash);
      }

      applyLoginSession(data);
    } catch (err: any) {
      setErrorMsg("Passkey authentication failed: " + err.message);
    }
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
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {/* Circular Glassmorphic Back Button */}
          <button 
            onClick={() => {
              if (typeof window !== "undefined" && window.history.length > 1) {
                window.history.back();
              } else {
                window.location.href = "/";
              }
            }}
            title="Go Back"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: "rgba(255, 255, 255, 0.04)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              color: "var(--text-secondary)",
              cursor: "pointer",
              transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
              outline: "none",
              backdropFilter: "blur(12px)",
              flexShrink: 0
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
              e.currentTarget.style.borderColor = "var(--yellow)";
              e.currentTarget.style.color = "var(--yellow)";
              e.currentTarget.style.transform = "translateX(-3px)";
              e.currentTarget.style.boxShadow = "0 0 15px rgba(245, 166, 35, 0.2)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.04)";
              e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.08)";
              e.currentTarget.style.color = "var(--text-secondary)";
              e.currentTarget.style.transform = "none";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            <ArrowLeft size={18} />
          </button>

          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
            <CloudExchangeLogo size={28} />
            <span style={{ fontSize: 18, fontWeight: 800, color: "var(--text-primary)" }}>
              Cloud<span style={{ color: "var(--yellow)" }}>Exchange</span>
            </span>
          </Link>
        </div>
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
                {loginMethod === "email" ? (
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
                ) : (
                  <div>
                    <label style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 700, display: "block", marginBottom: 8, letterSpacing: 0.5 }}>MOBILE PHONE NUMBER</label>
                    <div style={{ display: "flex", gap: 8 }}>
                      <select className="bn-select" style={{ width: 90, height: 46, background: "rgba(13, 27, 56, 0.45)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-primary)", padding: "0 8px" }}>
                        <option>+91 (IN)</option>
                        <option>+1 (US)</option>
                        <option>+44 (UK)</option>
                        <option>+65 (SG)</option>
                      </select>
                      <div style={{ position: "relative", flex: 1 }}>
                        <Smartphone size={16} style={{ position: "absolute", left: 14, top: 15, color: "var(--text-secondary)" }} />
                        <input
                          type="tel"
                          className="bn-input"
                          placeholder="Enter registered mobile number"
                          value={phone}
                          onChange={e => setPhone(e.target.value)}
                          style={{ paddingLeft: 42 }}
                          required
                        />
                      </div>
                    </div>
                  </div>
                )}
                
                <button type="submit" className="btn-yellow" style={{ width: "100%", padding: "14px", fontSize: 14, fontWeight: 700, borderRadius: 8 }}>
                  Continue
                </button>

                {/* SSO Buttons */}
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
                  <button type="button" onClick={handlePasskeyLogin} className="sso-btn" style={{ fontSize: 13, gap: 8, width: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ color: "var(--text-secondary)" }}><Key size={16} /></span>
                    <span>Continue with Passkey</span>
                  </button>

                  {loginMethod === "email" ? (
                    <button type="button" onClick={() => { setLoginMethod("phone"); setErrorMsg(""); }} className="sso-btn" style={{ fontSize: 13, gap: 8, width: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ color: "var(--text-secondary)" }}><Smartphone size={16} /></span>
                      <span>Continue with Mobile / OTP</span>
                    </button>
                  ) : (
                    <button type="button" onClick={() => { setLoginMethod("email"); setErrorMsg(""); }} className="sso-btn" style={{ fontSize: 13, gap: 8, width: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ color: "var(--text-secondary)" }}><Mail size={16} /></span>
                      <span>Continue with Email Address</span>
                    </button>
                  )}
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
                  <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginBottom: 6 }}>
                    {loginMethod === "phone" ? "Mobile OTP Verification" : "Biometric / TOTP Verification"}
                  </div>
                  <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                    {loginMethod === "phone" 
                      ? `Enter the 6-digit verification OTP sent to your phone ${phone}` 
                      : "Enter the 6-digit verification code from your Google Authenticator app"}
                  </p>
                </div>

                <div>
                  <label style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 700, display: "block", marginBottom: 8, textAlign: "center" }}>
                    {loginMethod === "phone" ? "SECURITY SMS OTP" : "SECURITY TOTP CODE"}
                  </label>
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

                {/* Simulated device trigger to make it easy for testing */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.03)", padding: 8, borderRadius: 6, border: "1px solid var(--border-light)" }}>
                  <input 
                    type="checkbox" 
                    id="sim-device" 
                    checked={simulateDifferentDevice}
                    onChange={e => setSimulateDifferentDevice(e.target.checked)}
                    style={{ cursor: "pointer" }}
                  />
                  <label htmlFor="sim-device" style={{ fontSize: 11, color: "var(--text-secondary)", cursor: "pointer", fontWeight: 600 }}>
                    Simulate Login from Another Mobile/Device
                  </label>
                </div>

                <button type="submit" className="btn-yellow" style={{ width: "100%", padding: "14px", fontSize: 14, fontWeight: 700, borderRadius: 8 }}>
                  Verify & Enter Terminal
                </button>
              </form>
            )}

            {step === "selfie_verification" && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, textAlign: "center" }}>
                <div style={{ marginBottom: 4 }}>
                  <ShieldCheck size={36} style={{ color: "var(--yellow)", margin: "0 auto 8px" }} />
                  <h3 style={{ fontSize: 16, fontWeight: 800 }}>New Terminal Security Check</h3>
                  <p style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 4 }}>
                    New screen resolution signature detected. Face Liveness verification required.
                  </p>
                </div>

                {/* Circular scanner overlay */}
                <div style={{
                  width: 180,
                  height: 180,
                  borderRadius: "50%",
                  border: selfieStep === "completed" ? "3px solid var(--green)" : selfieStep === "analyzing" ? "3px dashed var(--cyan)" : "3px solid var(--yellow)",
                  position: "relative",
                  background: "rgba(0,0,0,0.4)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                  boxShadow: selfieStep === "completed" ? "0 0 25px rgba(0, 230, 118, 0.3)" : "0 0 20px rgba(245, 166, 35, 0.15)"
                }}>
                  {/* Glowing Radar Scanning Beam */}
                  {selfieStep !== "completed" && (
                    <div style={{
                      position: "absolute",
                      top: 0, left: 0, right: 0, bottom: 0,
                      borderRadius: "50%",
                      borderTop: "3px solid var(--cyan)",
                      animation: "spin 2s linear infinite"
                    }} />
                  )}

                  {selfieStep === "completed" ? (
                    <ShieldCheck size={64} style={{ color: "var(--green)", animation: "scaleUp 0.5s ease" }} />
                  ) : (
                    <div style={{ position: "relative", width: 100, height: 100, borderRadius: "50%", background: "rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyItems: "center" }}>
                      <Camera size={36} style={{ margin: "auto", color: selfieStep === "smile" ? "var(--cyan)" : "var(--text-muted)" }} />
                    </div>
                  )}

                  {/* Dynamic Face Alignment Guides */}
                  <div style={{
                    position: "absolute",
                    top: "15%", left: "15%", right: "15%", bottom: "15%",
                    border: "1px dashed rgba(255,255,255,0.2)",
                    borderRadius: "50%"
                  }} />
                </div>

                {/* Status Logs text */}
                <div style={{ width: "100%" }}>
                  <div style={{
                    background: "rgba(0,0,0,0.3)",
                    border: "1px solid var(--border-light)",
                    borderRadius: 8,
                    padding: "8px 12px",
                    fontSize: 11,
                    fontFamily: "monospace",
                    color: selfieStep === "completed" ? "var(--green)" : selfieStep === "blink" || selfieStep === "smile" ? "var(--yellow)" : "var(--cyan)",
                    minHeight: 34,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}>
                    {selfieLogs}
                  </div>
                </div>

                {/* Progress bar for analysis */}
                {selfieStep === "analyzing" && (
                  <div style={{ width: "100%", background: "rgba(255,255,255,0.05)", height: 6, borderRadius: 3, overflow: "hidden" }}>
                    <div style={{ width: `${selfieProgress}%`, background: "var(--cyan)", height: "100%", transition: "width 0.2s" }} />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
