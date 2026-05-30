"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  ArrowLeft, 
  Coins, 
  Globe, 
  ShieldCheck, 
  QrCode, 
  Copy, 
  CheckCircle2, 
  ArrowRight,
  Database
} from "lucide-react";
import CloudExchangeLogo from "../components/CloudExchangeLogo";
import SpaceBackground from "../components/SpaceBackground";
import Header from "../components/Header";

export default function ListTokenPage() {
  const [step, setStep] = useState<"form" | "payment" | "success">("form");
  
  // Form fields
  const [symbol, setSymbol] = useState("");
  const [name, setName] = useState("");
  const [decimals, setDecimals] = useState("18");
  const [contractAddress, setContractAddress] = useState("");
  const [network, setNetwork] = useState("ERC20");
  const [initialPrice, setInitialPrice] = useState("");
  const [website, setWebsite] = useState("");
  const [description, setDescription] = useState("");
  
  // Payment info
  const [txHash, setTxHash] = useState("");
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [errorText, setErrorText] = useState("");

  const LISTING_FEE_USDT = 5000;
  const INR_CONVERSION_RATE = 88.5;
  const LISTING_FEE_INR = LISTING_FEE_USDT * INR_CONVERSION_RATE;

  // Mock listing deposit wallet
  const DEPOSIT_WALLET = "0x89D91eB92a34cf817342C4829377C8E24C783852";

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (!symbol || !name || !contractAddress || !initialPrice) {
      setErrorText("Please fill out all required fields.");
      return;
    }
    setErrorText("");
    setStep("payment");
  };

  const handleCopyWallet = () => {
    navigator.clipboard.writeText(DEPOSIT_WALLET);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  const handleSubmitApplication = (e: React.FormEvent) => {
    e.preventDefault();
    if (txHash.length < 10) {
      setErrorText("Please enter a valid Transaction Hash (TXID).");
      return;
    }

    const newApp = {
      id: "APP-" + Math.floor(1000 + Math.random() * 9000),
      symbol: symbol.toUpperCase(),
      name,
      decimals: parseInt(decimals) || 18,
      contractAddress,
      network,
      initialPrice: parseFloat(initialPrice) || 0.1,
      website,
      description,
      txHash,
      submittedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
      status: "Pending"
    };

    const savedApps = localStorage.getItem("admin_listing_applications");
    const appsList = savedApps ? JSON.parse(savedApps) : [];
    localStorage.setItem("admin_listing_applications", JSON.stringify([...appsList, newApp]));

    setStep("success");
    setErrorText("");
  };

  return (
    <div style={{ minHeight: "100vh", position: "relative", color: "var(--text-primary)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <SpaceBackground />

      <Header activeTab="list-token" />

      {/* Core Grid */}
      <div style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center", padding: "40px 20px", zIndex: 10 }}>
        <div style={{
          width: "100%",
          maxWidth: step === "success" ? 540 : 800,
          background: "rgba(10, 17, 40, 0.45)",
          border: "1px solid var(--border)",
          borderRadius: 16,
          padding: 36,
          backdropFilter: "blur(16px)",
          boxShadow: "0 20px 50px rgba(0,0,0,0.6)"
        }}>
          {step === "form" && (
            <form onSubmit={handleNextStep}>
              <div style={{ textAlign: "center", marginBottom: 32 }}>
                <Coins size={40} color="var(--yellow)" style={{ margin: "0 auto 12px" }} />
                <h1 style={{ fontSize: 24, fontWeight: 800 }}>Self-Service Coin Listing Portal</h1>
                <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 6 }}>Deploy your custom cryptocurrency pair dynamically on India's premier crypto platform.</p>
              </div>

              {errorText && (
                <div style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid var(--red)", color: "var(--red)", borderRadius: 8, padding: 12, fontSize: 12, marginBottom: 20 }}>
                  ⚠️ {errorText}
                </div>
              )}

              <div className="list-token-grid" style={{ marginBottom: 24 }}>
                {/* Left Fields */}
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div>
                    <label style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 700, display: "block", marginBottom: 6 }}>TOKEN NAME *</label>
                    <input type="text" className="bn-input" placeholder="e.g. Polygon" value={name} onChange={e => setName(e.target.value)} required />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 700, display: "block", marginBottom: 6 }}>TOKEN SYMBOL *</label>
                    <input type="text" className="bn-input" placeholder="e.g. MATIC" value={symbol} onChange={e => setSymbol(e.target.value)} required />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 700, display: "block", marginBottom: 6 }}>DECIMALS</label>
                    <input type="number" className="bn-input" placeholder="18" value={decimals} onChange={e => setDecimals(e.target.value)} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 700, display: "block", marginBottom: 6 }}>BLOCKCHAIN NETWORK *</label>
                    <select className="bn-select" value={network} onChange={e => setNetwork(e.target.value)} style={{ width: "100%" }}>
                      <option value="ERC20">Ethereum (ERC20)</option>
                      <option value="BEP20">BNB Smart Chain (BEP20)</option>
                      <option value="TRC20">TRON Network (TRC20)</option>
                      <option value="Polygon">Polygon Matic</option>
                      <option value="Arbitrum">Arbitrum One</option>
                      <option value="Solana">Solana SPL</option>
                    </select>
                  </div>
                </div>

                {/* Right Fields */}
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div>
                    <label style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 700, display: "block", marginBottom: 6 }}>CONTRACT ADDRESS *</label>
                    <input type="text" className="bn-input" placeholder="0x..." value={contractAddress} onChange={e => setContractAddress(e.target.value)} required />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 700, display: "block", marginBottom: 6 }}>INITIAL LISTING PRICE (USDT) *</label>
                    <input type="number" step="any" className="bn-input" placeholder="e.g. 0.68" value={initialPrice} onChange={e => setInitialPrice(e.target.value)} required />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 700, display: "block", marginBottom: 6 }}>PROJECT WEBSITE</label>
                    <input type="url" className="bn-input" placeholder="https://mytoken.com" value={website} onChange={e => setWebsite(e.target.value)} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 700, display: "block", marginBottom: 6 }}>SHORT PROJECT DESCRIPTION</label>
                    <input type="text" className="bn-input" placeholder="Describe your token project utility..." value={description} onChange={e => setDescription(e.target.value)} />
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--border)", paddingTop: 20 }}>
                <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                  Listing fee: <strong style={{ color: "var(--yellow)" }}>{LISTING_FEE_USDT.toLocaleString()} USDT</strong> (₹{LISTING_FEE_INR.toLocaleString("en-IN")} INR equivalent)
                </span>
                <button type="submit" className="btn-yellow" style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 24px", fontWeight: 700 }}>
                  Proceed to Listing Fee Payment <ArrowRight size={16} />
                </button>
              </div>
            </form>
          )}

          {step === "payment" && (
            <form onSubmit={handleSubmitApplication}>
              <div style={{ textAlign: "center", marginBottom: 24 }}>
                <QrCode size={40} color="var(--yellow)" style={{ margin: "0 auto 12px" }} />
                <h1 style={{ fontSize: 22, fontWeight: 800 }}>Listing Fee Deposit</h1>
                <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 6 }}>Send exactly 5,000 USDT to the secure deposit gateway below.</p>
              </div>

              {errorText && (
                <div style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid var(--red)", color: "var(--red)", borderRadius: 8, padding: 12, fontSize: 12, marginBottom: 20 }}>
                  ⚠️ {errorText}
                </div>
              )}

              <div className="list-token-grid" style={{ background: "rgba(0,0,0,0.25)", border: "1px dashed var(--border)", borderRadius: 12, padding: 24, marginBottom: 24 }}>
                {/* Simulated QR Code */}
                <div style={{ background: "#fff", padding: 8, borderRadius: 8, width: 140, height: 140, display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gridTemplateRows: "repeat(6, 1fr)", gap: 3 }}>
                  <div style={{ background: "#040814", gridColumn: "1/3", gridRow: "1/3", borderRadius: 2 }} />
                  <div style={{ background: "#040814", gridColumn: "5/7", gridRow: "1/3", borderRadius: 2 }} />
                  <div style={{ background: "#040814", gridColumn: "1/3", gridRow: "5/7", borderRadius: 2 }} />
                  <div style={{ background: "var(--yellow)", gridColumn: "3/5", gridRow: "3/5", borderRadius: "50%", margin: 2 }} />
                  <div style={{ background: "#040814", gridColumn: "3", gridRow: "1" }} />
                  <div style={{ background: "#040814", gridColumn: "4", gridRow: "2" }} />
                  <div style={{ background: "#040814", gridColumn: "5", gridRow: "3" }} />
                </div>

                <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
                  <label style={{ fontSize: 9, color: "var(--text-muted)", fontWeight: 700, letterSpacing: 0.5 }}>USDT DEPOSIT ADDRESS (ERC20 / BEP20 / TRC20)</label>
                  <div style={{ display: "flex", background: "rgba(255,255,255,0.05)", borderRadius: 8, padding: "10px 14px", alignItems: "center", justifyContent: "space-between", marginTop: 6 }}>
                    <span style={{ fontSize: 11, fontFamily: "monospace", color: "var(--cyan)", overflow: "hidden", textOverflow: "ellipsis" }}>{DEPOSIT_WALLET}</span>
                    <button type="button" onClick={handleCopyWallet} style={{ background: "none", border: "none", color: "var(--yellow)", cursor: "pointer", display: "flex", alignItems: "center" }}>
                      <Copy size={16} />
                    </button>
                  </div>
                  {copyFeedback && <div style={{ fontSize: 11, color: "var(--green)", marginTop: 6, fontWeight: 700 }}>Address copied!</div>}
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 24 }}>
                <div>
                  <label style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 700, display: "block", marginBottom: 6 }}>PAST TRANSACTION HASH (TXID) *</label>
                  <input type="text" className="bn-input" placeholder="Paste the USDT transaction hash here..." value={txHash} onChange={e => setTxHash(e.target.value)} required />
                  <span style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginTop: 4 }}>Submission triggers real-time double-entry verification on the matching engine.</span>
                </div>
              </div>

              <div style={{ display: "flex", gap: 12 }}>
                <button type="button" onClick={() => setStep("form")} className="btn-outline" style={{ flex: 1, padding: 12 }}>
                  Modify Token Details
                </button>
                <button type="submit" className="btn-yellow" style={{ flex: 2, padding: 12, fontWeight: 700 }}>
                  Submit Listing Request
                </button>
              </div>
            </form>
          )}

          {step === "success" && (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <CheckCircle2 size={56} color="var(--green)" style={{ margin: "0 auto 20px" }} />
              <h1 style={{ fontSize: 24, fontWeight: 800 }}>Listing Request Submitted</h1>
              <p style={{ fontSize: 14, color: "var(--text-secondary)", marginTop: 8, lineHeight: 1.6 }}>
                Your listing fee payment is currently queued in the matching validation replayer. Once the admin approves the transaction verification, <strong style={{ color: "var(--yellow)" }}>{symbol.toUpperCase()}</strong> will launch on the trading terminal.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 32 }}>
                <Link href="/" className="btn-yellow" style={{ display: "block", textDecoration: "none", padding: 12, fontWeight: 700 }}>
                  Return to Home
                </Link>
                <Link href="/admin" className="btn-outline" style={{ display: "block", textDecoration: "none", padding: 12 }}>
                  Go to Admin Panel (Approve Listing)
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
