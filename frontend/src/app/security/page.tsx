"use client";
import React, { useState, useEffect } from "react";
import { Key, ShieldCheck, Mail, Search, HelpCircle, Lock, Smartphone, ShieldAlert, Cpu, CheckCircle } from "lucide-react";
import Header from "../components/Header";
import SpaceBackground from "../components/SpaceBackground";

interface WhitelistAddress {
  id: string;
  network: string;
  address: string;
  label: string;
  addedAt: string;
}

export default function SecurityPage() {
  const [alertText, setAlertText] = useState("");
  const [antiPhishingCode, setAntiPhishingCode] = useState("");
  const [phishingInput, setPhishingInput] = useState("");
  const [google2faActive, setGoogle2faActive] = useState(false);
  const [yubikeyActive, setYubikeyActive] = useState(false);
  const [emailOtpActive, setEmailOtpActive] = useState(true);
  const [smsOtpActive, setSmsOtpActive] = useState(true);
  const [selfieAuthActive, setSelfieAuthActive] = useState(true);
  
  // Whitelist Address states
  const [addresses, setAddresses] = useState<WhitelistAddress[]>([
    { id: "WA-01", network: "Ethereum", address: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F", label: "My Ledger Cold Wallet", addedAt: "2026-05-12" },
    { id: "WA-02", network: "Solana", address: "Hpx1Lg14rDszL7jZ65f2zU3X1hW76o1QpX8nU6m4sL", label: "Trevor Main Vault", addedAt: "2026-05-18" }
  ]);
  const [newLabel, setNewLabel] = useState("");
  const [newNetwork, setNewNetwork] = useState("Ethereum");
  const [newAddress, setNewAddress] = useState("");

  // AML Scanner states
  const [scanAddress, setScanAddress] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState("");
  const [scanResult, setScanResult] = useState<{
    score: number;
    status: "PASS" | "WARNING" | "BLOCKED";
    flags: string[];
  } | null>(null);

  // Hardware key simulated prompt
  const [showWebAuthnPrompt, setShowWebAuthnPrompt] = useState(false);
  const [webauthnState, setWebauthnState] = useState<"insert" | "touch" | "success">("insert");

  useEffect(() => {
    const code = localStorage.getItem("anti_phishing_code");
    if (code) setAntiPhishingCode(code);
    setGoogle2faActive(localStorage.getItem("2fa_totp_active") === "true");
    setYubikeyActive(localStorage.getItem("2fa_fido2_active") === "true");
    setEmailOtpActive(localStorage.getItem("email_otp_active") !== "false");
    setSmsOtpActive(localStorage.getItem("sms_otp_active") !== "false");
    setSelfieAuthActive(localStorage.getItem("selfie_auth_active") !== "false");
  }, []);

  const triggerAlert = (msg: string) => {
    setAlertText(msg);
    setTimeout(() => setAlertText(""), 4500);
  };

  const handleSetPhishingCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (phishingInput.trim().length < 4) {
      triggerAlert("Anti-phishing code must be at least 4 characters.");
      return;
    }
    localStorage.setItem("anti_phishing_code", phishingInput);
    setAntiPhishingCode(phishingInput);
    triggerAlert("Anti-phishing code updated successfully.");
  };

  const handleAddWhitelistAddress = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAddress.trim() || !newLabel.trim()) {
      triggerAlert("Please fill in address and label.");
      return;
    }

    const newW: WhitelistAddress = {
      id: "WA-" + Math.random().toString(36).substring(2, 6).toUpperCase(),
      network: newNetwork,
      address: newAddress,
      label: newLabel,
      addedAt: new Date().toISOString().split("T")[0]
    };

    setAddresses(prev => [newW, ...prev]);
    setNewAddress("");
    setNewLabel("");
    triggerAlert("Whitelist address registered. 24-hour safety delay lock initiated.");
  };

  const handleRemoveAddress = (id: string) => {
    setAddresses(prev => prev.filter(w => w.id !== id));
    triggerAlert("Address removed from whitelist.");
  };

  // Simulating FIDO2 / YubiKey WebAuthn setup
  const startYubikeySetup = () => {
    setWebauthnState("insert");
    setShowWebAuthnPrompt(true);
    
    // Step 2: Prompt to touch metal contact after 2s
    setTimeout(() => {
      setWebauthnState("touch");
    }, 2000);
  };

  const handleTouchKey = () => {
    setWebauthnState("success");
    setTimeout(() => {
      setShowWebAuthnPrompt(false);
      setYubikeyActive(true);
      localStorage.setItem("2fa_fido2_active", "true");
      triggerAlert("YubiKey FIDO2 Hardware Key enrolled as primary 2FA factor.");
    }, 1500);
  };

  // Simulated AML Compliance check
  const handleRunAmlScan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scanAddress.trim()) return;

    setScanning(true);
    setScanResult(null);
    setScanProgress("Connecting to AML compliance Oracle...");

    setTimeout(() => {
      setScanProgress("Analyzing smart contract history & transaction nodes...");
    }, 1200);

    setTimeout(() => {
      setScanProgress("Checking blacklisted mixers and darknet clusters...");
    }, 2400);

    setTimeout(() => {
      // Determine score based on address pattern for interactivity
      let score = 15;
      let status: "PASS" | "WARNING" | "BLOCKED" = "PASS";
      let flags = ["No mixer interaction detected", "Normal peer transaction history", "Low cluster threat index"];

      if (scanAddress.toLowerCase().includes("tornado") || scanAddress.toLowerCase().includes("0xdac17f958d2ee523a2206206994597c13d831ec7")) {
        score = 92;
        status = "BLOCKED";
        flags = ["Direct interaction with Tornado Cash mixer", "Sanctioned entity address link", "OFAC Specially Designated Nationals list flag"];
      } else if (scanAddress.startsWith("0x00000")) {
        score = 45;
        status = "WARNING";
        flags = ["Large volumes of empty state txs", "Unverified proxy contract interacting", "Medium risk score assigned"];
      }

      setScanResult({ score, status, flags });
      setScanning(false);
    }, 3600);
  };

  return (
    <div style={{ minHeight: "100vh", position: "relative", color: "var(--text-primary)", overflow: "hidden" }}>
      <SpaceBackground />
      <Header activeTab="coins" />

      <main style={{ position: "relative", zIndex: 10, maxWidth: 1200, margin: "40px auto", padding: "0 24px" }}>
        
        {alertText && (
          <div className="alert-float" style={{
            position: "fixed",
            top: 24,
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(10, 19, 44, 0.95)",
            border: "1px solid var(--yellow)",
            boxShadow: "0 8px 32px rgba(252, 213, 53, 0.15)",
            padding: "14px 28px",
            borderRadius: 12,
            zIndex: 9999,
            fontSize: 14,
            fontWeight: 600,
            color: "var(--yellow)",
            display: "flex",
            alignItems: "center",
            gap: 10
          }}>
            <ShieldAlert size={18} /> {alertText}
          </div>
        )}

        <div style={{ marginBottom: 36 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--yellow)", textTransform: "uppercase", letterSpacing: 1.5 }}>Institutional Grade Security</span>
          <h1 style={{ fontSize: 32, fontWeight: 800, marginTop: 4, letterSpacing: -0.5 }}>Compliance &amp; Shield Portal</h1>
        </div>

        {/* Dashboard Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }} className="grid-responsive-security">
          
          {/* LEFT: 2FA & Withdrawal Settings */}
          <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
            
            {/* factor authentication */}
            <div style={{
              background: "rgba(6, 11, 30, 0.85)",
              border: "1px solid var(--border)",
              borderRadius: 16,
              padding: 24,
              backdropFilter: "blur(16px)"
            }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 18, display: "flex", alignItems: "center", gap: 8 }}>
                <Lock size={20} color="var(--yellow)" /> Multi-Factor Authentication
              </h2>

              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                
                {/* Google Authenticator */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(255,255,255,0.01)", border: "1px solid var(--border-light)", padding: 16, borderRadius: 12 }}>
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <Smartphone size={24} color={google2faActive ? "var(--green)" : "var(--text-secondary)"} />
                    <div>
                      <div style={{ fontWeight: 750, fontSize: 14 }}>Google Authenticator (TOTP)</div>
                      <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>Secure one-time code generated on your mobile phone</span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      const next = !google2faActive;
                      setGoogle2faActive(next);
                      localStorage.setItem("2fa_totp_active", String(next));
                      triggerAlert(next ? "Google Authenticator 2FA active." : "Google Authenticator 2FA deactivated.");
                    }}
                    className={google2faActive ? "btn-outline" : "btn-green bn-tab-sm"}
                    style={{ height: 32, padding: "0 14px", borderRadius: 6, fontSize: 12 }}
                  >
                    {google2faActive ? "Deactivate" : "Activate"}
                  </button>
                </div>

                {/* SMS OTP Verification */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(255,255,255,0.01)", border: "1px solid var(--border-light)", padding: 16, borderRadius: 12 }}>
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <Smartphone size={24} color={smsOtpActive ? "var(--green)" : "var(--text-secondary)"} />
                    <div>
                      <div style={{ fontWeight: 750, fontSize: 14 }}>SMS OTP Verification</div>
                      <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>Requires a 6-digit text message code sent to your phone</span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      const next = !smsOtpActive;
                      setSmsOtpActive(next);
                      localStorage.setItem("sms_otp_active", String(next));
                      triggerAlert(next ? "SMS OTP verification active." : "SMS OTP verification deactivated.");
                    }}
                    className={smsOtpActive ? "btn-outline" : "btn-green bn-tab-sm"}
                    style={{ height: 32, padding: "0 14px", borderRadius: 6, fontSize: 12 }}
                  >
                    {smsOtpActive ? "Deactivate" : "Activate"}
                  </button>
                </div>

                {/* Email OTP Verification */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(255,255,255,0.01)", border: "1px solid var(--border-light)", padding: 16, borderRadius: 12 }}>
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <Mail size={24} color={emailOtpActive ? "var(--green)" : "var(--text-secondary)"} />
                    <div>
                      <div style={{ fontWeight: 750, fontSize: 14 }}>Email OTP Verification</div>
                      <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>Verify withdrawals with a 6-digit email inbox code</span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      const next = !emailOtpActive;
                      setEmailOtpActive(next);
                      localStorage.setItem("email_otp_active", String(next));
                      triggerAlert(next ? "Email OTP verification active." : "Email OTP verification deactivated.");
                    }}
                    className={emailOtpActive ? "btn-outline" : "btn-green bn-tab-sm"}
                    style={{ height: 32, padding: "0 14px", borderRadius: 6, fontSize: 12 }}
                  >
                    {emailOtpActive ? "Deactivate" : "Activate"}
                  </button>
                </div>

                {/* Selfie Face Verification */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(255,255,255,0.01)", border: "1px solid var(--border-light)", padding: 16, borderRadius: 12 }}>
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <ShieldCheck size={24} color={selfieAuthActive ? "var(--green)" : "var(--text-secondary)"} />
                    <div>
                      <div style={{ fontWeight: 750, fontSize: 14 }}>Anti-Hijack Selfie Verification</div>
                      <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>Enforce camera face scan on login from new devices/IPs</span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      const next = !selfieAuthActive;
                      setSelfieAuthActive(next);
                      localStorage.setItem("selfie_auth_active", String(next));
                      triggerAlert(next ? "Selfie Face verification active." : "Selfie Face verification deactivated.");
                    }}
                    className={selfieAuthActive ? "btn-outline" : "btn-green bn-tab-sm"}
                    style={{ height: 32, padding: "0 14px", borderRadius: 6, fontSize: 12 }}
                  >
                    {selfieAuthActive ? "Deactivate" : "Activate"}
                  </button>
                </div>

                {/* Yubikey FIDO2 */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(255,255,255,0.01)", border: "1px solid var(--border-light)", padding: 16, borderRadius: 12 }}>
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <Key size={24} color={yubikeyActive ? "var(--green)" : "var(--text-secondary)"} />
                    <div>
                      <div style={{ fontWeight: 750, fontSize: 14 }}>FIDO2 Hardware Security Keys</div>
                      <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>Enforce hardware-bound safety using YubiKeys</span>
                    </div>
                  </div>
                  {yubikeyActive ? (
                    <button
                      onClick={() => {
                        setYubikeyActive(false);
                        localStorage.setItem("2fa_fido2_active", "false");
                        triggerAlert("Hardware key 2FA deactivated.");
                      }}
                      className="btn-outline"
                      style={{ height: 32, padding: "0 14px", borderRadius: 6, fontSize: 12 }}
                    >
                      Disable
                    </button>
                  ) : (
                    <button
                      onClick={startYubikeySetup}
                      className="btn-green bn-tab-sm"
                      style={{ height: 32, padding: "0 14px", borderRadius: 6, fontSize: 12 }}
                    >
                      Enroll Key
                    </button>
                  )}
                </div>

              </div>
            </div>

            {/* Withdrawal protection whitelist */}
            <div style={{
              background: "rgba(6, 11, 30, 0.85)",
              border: "1px solid var(--border)",
              borderRadius: 16,
              padding: 24,
              backdropFilter: "blur(16px)"
            }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 18, display: "flex", alignItems: "center", gap: 8 }}>
                <ShieldCheck size={20} color="var(--yellow)" /> Address Whitelisting
              </h2>

              {/* Form */}
              <form onSubmit={handleAddWhitelistAddress} style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 20 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 10, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>NETWORK</label>
                    <select className="bn-select" value={newNetwork} onChange={e => setNewNetwork(e.target.value)} style={{ height: 38, width: "100%" }}>
                      <option value="Ethereum">Ethereum (ERC-20)</option>
                      <option value="Solana">Solana (SPL)</option>
                      <option value="Bitcoin">Bitcoin (Native)</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 10, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>LABEL NAME</label>
                    <input className="bn-input" value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder="e.g. Ledger Cold" style={{ height: 38 }} required />
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: 10, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>WALLET ADDRESS</label>
                  <input className="bn-input" value={newAddress} onChange={e => setNewAddress(e.target.value)} placeholder="Enter full address" style={{ height: 38 }} required />
                </div>
                <button type="submit" className="btn-green" style={{ width: "100%", height: 38, fontSize: 13, fontWeight: 700 }}>
                  Add Whitelisted Address
                </button>
              </form>

              {/* List */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {addresses.map(a => (
                  <div key={a.id} style={{ background: "rgba(255,255,255,0.01)", border: "1px solid var(--border-light)", padding: 12, borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontWeight: 700, color: "#fff", fontSize: 13 }}>{a.label}</div>
                      <div style={{ fontSize: 11, color: "var(--text-secondary)", wordBreak: "break-all", marginTop: 4 }}>
                        {a.network} • {a.address.slice(0, 10)}...{a.address.slice(-8)}
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveAddress(a.id)}
                      style={{ background: "none", border: "none", color: "var(--red)", fontSize: 11, fontWeight: 700, cursor: "pointer" }}
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Anti-phishing code setup */}
            <div style={{
              background: "rgba(6, 11, 30, 0.85)",
              border: "1px solid var(--border)",
              borderRadius: 16,
              padding: 24,
              backdropFilter: "blur(16px)"
            }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 18, display: "flex", alignItems: "center", gap: 8 }}>
                <Mail size={20} color="var(--yellow)" /> Anti-Phishing Security
              </h2>
              <p style={{ color: "var(--text-secondary)", fontSize: 12, lineHeight: 1.5, marginBottom: 16 }}>
                Set a secret code that will appear on all transactional platform emails. This allows you to verify that email alerts are genuine and not phishing scams.
              </p>

              {antiPhishingCode && (
                <div style={{ background: "rgba(16,185,129,0.08)", border: "1px solid var(--green)", padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 12, color: "var(--green)" }}>
                  ✓ Code Active: <strong>{antiPhishingCode}</strong>
                </div>
              )}

              <form onSubmit={handleSetPhishingCode} style={{ display: "flex", gap: 12 }}>
                <input
                  className="bn-input"
                  value={phishingInput}
                  onChange={e => setPhishingInput(e.target.value)}
                  placeholder="Set Alphanumeric Code"
                  style={{ height: 38, flexGrow: 1 }}
                  required
                />
                <button type="submit" className="btn-green" style={{ height: 38, padding: "0 18px", fontWeight: 700, fontSize: 13 }}>
                  Save Code
                </button>
              </form>
            </div>

          </div>

          {/* RIGHT: Compliance AML Address Scanner */}
          <div>
            <div style={{
              background: "rgba(6, 11, 30, 0.85)",
              border: "1px solid var(--border)",
              borderRadius: 16,
              padding: 24,
              backdropFilter: "blur(16px)"
            }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 18, display: "flex", alignItems: "center", gap: 8 }}>
                <Search size={20} color="var(--yellow)" /> Compliance AML Address Scanner
              </h2>
              <p style={{ color: "var(--text-secondary)", fontSize: 12, lineHeight: 1.5, marginBottom: 20 }}>
                Audit wallet addresses before transacting. CloudExchange scans smart contracts history against blacklisted addresses, mixers (like Tornado Cash), and OFAC databases.
              </p>

              <form onSubmit={handleRunAmlScan} style={{ display: "flex", gap: 12, marginBottom: 24 }}>
                <input
                  className="bn-input"
                  value={scanAddress}
                  onChange={e => setScanAddress(e.target.value)}
                  placeholder="Paste Ethereum or Bitcoin address..."
                  style={{ height: 40, flexGrow: 1 }}
                  required
                />
                <button type="submit" className="btn-green" style={{ height: 40, padding: "0 20px", fontWeight: 800, fontSize: 13 }} disabled={scanning}>
                  {scanning ? "Analyzing..." : "Run AML Scan"}
                </button>
              </form>

              {/* Progress feedback */}
              {scanning && (
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: 16, background: "rgba(255,255,255,0.02)", border: "1px solid var(--border-light)", borderRadius: 8 }}>
                  <div style={{ width: 16, height: 16, border: "2px solid var(--yellow)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
                  <span style={{ fontSize: 12, color: "var(--yellow)", fontWeight: 600 }}>{scanProgress}</span>
                </div>
              )}

              {/* Scanner results output */}
              {scanResult && (
                <div style={{
                  background: scanResult.status === "PASS" ? "rgba(16,185,129,0.06)" : "rgba(255,23,68,0.06)",
                  border: `1px solid ${scanResult.status === "PASS" ? "var(--green)" : "var(--red)"}`,
                  padding: 20,
                  borderRadius: 12,
                  display: "flex",
                  flexDirection: "column",
                  gap: 16
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 10, color: "var(--text-secondary)" }}>RISK EVALUATION SCORE</div>
                      <div style={{ fontSize: 24, fontWeight: 850, color: scanResult.status === "PASS" ? "var(--green)" : "var(--red)" }}>
                        {scanResult.score}% Risk Factor
                      </div>
                    </div>

                    <div style={{
                      background: scanResult.status === "PASS" ? "rgba(16,185,129,0.15)" : "rgba(255,23,68,0.15)",
                      border: `1px solid ${scanResult.status === "PASS" ? "var(--green)" : "var(--red)"}`,
                      color: scanResult.status === "PASS" ? "var(--green)" : "var(--red)",
                      borderRadius: 6,
                      padding: "4px 10px",
                      fontSize: 12,
                      fontWeight: 800
                    }}>
                      {scanResult.status === "PASS" ? "SAFE / APPROVED" : "SUSPICIOUS / BLOCKED"}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", marginBottom: 8 }}>COMPLIANCE SIGNALS:</div>
                    <ul style={{ paddingLeft: 16, fontSize: 12, color: "var(--text-secondary)", display: "flex", flexDirection: "column", gap: 6 }}>
                      {scanResult.flags.map((flag, idx) => (
                        <li key={idx}>{flag}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

            </div>
          </div>

        </div>

      </main>

      {/* WebAuthn Hardware Key setup popup */}
      {showWebAuthnPrompt && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0,0,0,0.85)",
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24
        }}>
          <div style={{
            background: "#080c16",
            border: "1px solid var(--border)",
            boxShadow: "0 10px 45px rgba(0,0,0,0.6)",
            borderRadius: 16,
            maxWidth: 400,
            width: "100%",
            padding: 32,
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 20
          }}>
            <div style={{
              background: "rgba(252,213,53,0.1)",
              borderRadius: "50%",
              width: 64,
              height: 64,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              animation: webauthnState === "touch" ? "pulse 1.5s infinite" : "none"
            }}>
              <Cpu size={32} color="var(--yellow)" />
            </div>

            {webauthnState === "insert" && (
              <>
                <h3 style={{ fontSize: 18, fontWeight: 800 }}>Insert security key</h3>
                <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                  Please insert your hardware security key (YubiKey or compatible FIDO2 device) into the USB port...
                </p>
              </>
            )}

            {webauthnState === "touch" && (
              <>
                <h3 style={{ fontSize: 18, fontWeight: 800 }}>Touch contact point</h3>
                <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                  Touch the metal contact sensor on your hardware key to authorize enrollment.
                </p>
                <button
                  type="button"
                  onClick={handleTouchKey}
                  className="btn-green"
                  style={{ padding: "8px 24px", fontWeight: 700, borderRadius: 8, fontSize: 13 }}
                >
                  *Simulate Key Touch*
                </button>
              </>
            )}

            {webauthnState === "success" && (
              <>
                <CheckCircle size={40} color="var(--green)" />
                <h3 style={{ fontSize: 18, fontWeight: 800, color: "var(--green)" }}>Key Enrolled</h3>
                <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                  WebAuthn verification completed.
                </p>
              </>
            )}

          </div>
        </div>
      )}

      <style jsx global>{`
        .grid-responsive-security {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 32px;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(252, 213, 53, 0.4); }
          70% { box-shadow: 0 0 0 12px rgba(252, 213, 53, 0); }
          100% { box-shadow: 0 0 0 0 rgba(252, 213, 53, 0); }
        }
        @media (max-width: 900px) {
          .grid-responsive-security {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
