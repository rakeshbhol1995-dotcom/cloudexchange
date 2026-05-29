"use client";
import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { LogOut, ShieldCheck, MessageSquare, Upload, Check, AlertCircle, Terminal, HelpCircle, UserCheck } from "lucide-react";
import CloudExchangeLogo from "../components/CloudExchangeLogo";
import SpaceBackground from "../components/SpaceBackground";

interface Ad { id: string; seller: string; orders: number; completion: number; rate: number; available: number; minLimit: number; maxLimit: number; payments: string[]; }
interface ChatMessage { sender: "system" | "buyer" | "seller"; text: string; time: string; }

const BUY_ADS: Ad[] = [
  { id: "ad1", seller: "TitanOTC", orders: 1845, completion: 99.2, rate: 89.42, available: 15400, minLimit: 10000, maxLimit: 500000, payments: ["UPI", "IMPS"] },
  { id: "ad2", seller: "Alpha_Liquidity", orders: 954, completion: 98.7, rate: 89.48, available: 42000, minLimit: 20000, maxLimit: 1500000, payments: ["IMPS", "Bank Transfer"] },
  { id: "ad3", seller: "CryptoEscrow_Desk", orders: 3412, completion: 99.8, rate: 89.50, available: 8500, minLimit: 5000, maxLimit: 750000, payments: ["UPI", "PhonePe"] },
  { id: "ad4", seller: "DeltaMerchant", orders: 421, completion: 95.4, rate: 89.55, available: 12000, minLimit: 10000, maxLimit: 1000000, payments: ["UPI", "GPay"] },
];

export default function P2PMarketplace() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [activeAd, setActiveAd] = useState<Ad | null>(null);
  const [purchaseQty, setPurchaseQty] = useState("");
  const [escrowStep, setEscrowStep] = useState<"none" | "created" | "receipt" | "scanning" | "chat" | "released">("none");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [scannerLogs, setScannerLogs] = useState<string[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [orderId, setOrderId] = useState("");
  const terminalEndRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auth sync
  useEffect(() => {
    const logged = localStorage.getItem("user_logged_in");
    const storedEmail = localStorage.getItem("username");
    if (logged === "true") {
      setIsLoggedIn(true);
      setUserEmail(storedEmail || "institutional_trader@cloud.ex");
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("user_logged_in");
    localStorage.removeItem("username");
    setIsLoggedIn(false);
    setUserEmail("");
  };

  const handleOpenPurchase = (ad: Ad) => {
    setActiveAd(ad);
    setPurchaseQty("1000"); // default
    setEscrowStep("none");
    setSelectedFile(null);
    setScannerLogs([]);
    setChatMessages([]);
  };

  const handleStartEscrow = () => {
    if (!isLoggedIn) {
      alert("Please log in to participate in peer-to-peer escrow trades.");
      return;
    }
    const randId = "P2P-" + Math.floor(100000 + Math.random() * 900000);
    setOrderId(randId);
    setEscrowStep("created");
    
    // Seed initial system and seller chat messages
    const initialTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setChatMessages([
      { sender: "system", text: `Escrow Order ${randId} successfully locked by CloudExchange ledger.`, time: initialTime },
      { sender: "seller", text: `Hello! Please send payments matching the exact amount via UPI/IMPS. Upload a screenshot once done.`, time: initialTime }
    ]);
  };

  // Chat message simulator loop for seller responses
  useEffect(() => {
    if (escrowStep === "created" && chatMessages.length === 2) {
      const timer = setTimeout(() => {
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setChatMessages(prev => [...prev, {
          sender: "seller",
          text: "I release as soon as the banking app pushes notifications (usually less than 30s). Make sure the bank account name matches your registered name.",
          time
        }]);
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [escrowStep, chatMessages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg = chatInput;
    setChatMessages(prev => [...prev, { sender: "buyer", text: userMsg, time }]);
    setChatInput("");

    // Simulate seller reaction
    setTimeout(() => {
      const responseTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      let responseText = "Noted. Please submit the payment screenshot to allow the automated OCR metadata validator to verify.";
      if (escrowStep === "scanning") {
        responseText = "Awesome. The system is scanning the receipt now. I will release once verified.";
      } else if (escrowStep === "released") {
        responseText = "The tokens should be in your wallet. Thanks for trading!";
      }
      setChatMessages(prev => [...prev, { sender: "seller", text: responseText, time: responseTime }]);
    }, 2000);
  };

  // Scroll chats and logs to bottom
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [scannerLogs]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // Simulated Anti-Fraud scan
  const handleVerifyReceipt = () => {
    setEscrowStep("scanning");
    const logs = [
      "🔄 Initializing CloudExchange receipt validator v4.1...",
      "🔍 Parsing image metadata (EXIF details)...",
      "✅ Metadata Verification: Device signature matching verified.",
      "✅ Timestamp check: Upload timestamp corresponds with transaction date.",
      "🧬 Extracting Perceptual Hash (pHash)...",
      "✅ pHash check: No duplicates found. Image not scraped from index database.",
      "📝 Initializing Optical Character Recognition (OCR) scanner...",
      "🔍 Extracting transaction sequence identifier... UPI_REF_8429185012...",
      "✅ Balance ledger balance comparison: 100% verified.",
      "🛡️ Anti-fraud checks complete: VALID TRANSACTION.",
      "🔐 Escrow state update: PAID. Alerting seller desk."
    ];

    logs.forEach((log, index) => {
      setTimeout(() => {
        setScannerLogs(prev => [...prev, log]);
        if (index === logs.length - 1) {
          // Complete verification, transition to chat release state
          setTimeout(() => {
            setEscrowStep("released");
            // Add released message
            const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            setChatMessages(prev => [
              ...prev,
              { sender: "system", text: "Seller confirmed payment receipt. Assets released from escrow contract.", time },
              { sender: "seller", text: "Verified! Released. Thank you!", time }
            ]);
            // Simulated wallet balance increment
            const b = parseFloat(localStorage.getItem("wallet_balance") || "15740.50");
            localStorage.setItem("wallet_balance", String(+(b + parseFloat(purchaseQty)).toFixed(2)));
          }, 1500);
        }
      }, (index + 1) * 800);
    });
  };

  return (
    <div style={{ minHeight: "100vh", position: "relative", color: "var(--text-primary)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      
      {/* Stars and Moon Animation Background */}
      <SpaceBackground />

      {/* HEADER */}
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

          <nav style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Link href="/" className="btn-ghost" style={{ fontSize: 13, textDecoration: "none", color: "var(--text-primary)" }}>Home</Link>
            <Link href="/coins" className="btn-ghost" style={{ fontSize: 13, textDecoration: "none", color: "var(--text-primary)" }}>Coins</Link>
            <Link href="/trade" className="btn-ghost" style={{ fontSize: 13, textDecoration: "none", color: "var(--text-primary)" }}>Trade Terminal</Link>
            <Link href="/kyc" className="btn-ghost" style={{ fontSize: 13, textDecoration: "none", color: "var(--text-primary)" }}>KYC & Wallet</Link>
            <Link href="/ledger" className="btn-ghost" style={{ fontSize: 13, textDecoration: "none", color: "var(--text-primary)" }}>Ledger Audit</Link>
          </nav>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {isLoggedIn ? (
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{userEmail}</span>
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
      </header>

      {/* BODY */}
      <div className="container-xl" style={{ flex: 1, padding: "40px 24px", display: "flex", flexDirection: "column", gap: 24, zIndex: 10 }}>
        
        {/* Intro */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <span style={{ background: "var(--cyan-dim)", color: "var(--cyan)", padding: "4px 12px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>ZERO FEES</span>
            <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Secure Peer-to-Peer Fiat Gateway</span>
          </div>
          <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-0.01em" }}>P2P Marketplace Escrow Portal</h1>
          <p style={{ fontSize: 14, color: "var(--text-secondary)", marginTop: 8 }}>Buy cryptocurrency directly from verified community liquidity desks. Locked smart contract escrow protects all transactions.</p>
        </div>

        {/* Top filter strip */}
        <div style={{ background: "rgba(13, 27, 56, 0.45)", backdropFilter: "blur(12px)", borderRadius: 12, border: "1px solid var(--border)", padding: "16px 24px", display: "flex", gap: 24, alignItems: "center" }}>
          <div>
            <label style={{ fontSize: 10, color: "var(--text-secondary)", fontWeight: 700, display: "block", marginBottom: 6 }}>BUY / SELL</label>
            <div style={{ display: "flex", gap: 4, background: "rgba(0,0,0,0.2)", padding: 3, borderRadius: 6 }}>
              <button style={{ background: "var(--green)", color: "#000", fontWeight: 700, border: "none", borderRadius: 4, padding: "4px 12px", fontSize: 12 }}>Buy</button>
              <button style={{ background: "none", color: "var(--text-secondary)", border: "none", padding: "4px 12px", fontSize: 12, cursor: "not-allowed" }}>Sell</button>
            </div>
          </div>
          <div>
            <label style={{ fontSize: 10, color: "var(--text-secondary)", fontWeight: 700, display: "block", marginBottom: 6 }}>ASSET</label>
            <select className="bn-select" style={{ height: 32, padding: "4px 12px" }}>
              <option>USDT</option>
              <option>BTC</option>
              <option>ETH</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: 10, color: "var(--text-secondary)", fontWeight: 700, display: "block", marginBottom: 6 }}>FIAT</label>
            <select className="bn-select" style={{ height: 32, padding: "4px 12px" }}>
              <option>INR</option>
              <option>USD</option>
              <option>GBP</option>
            </select>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 16, alignItems: "center" }}>
            <span style={{ fontSize: 12, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 6 }}>
              <ShieldCheck size={16} color="var(--green)" /> Verified merchants only
            </span>
          </div>
        </div>

        {/* Grid: Ads list & Interactive simulator */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 420px", gap: 24, alignItems: "flex-start" }}>
          
          {/* ADS LIST */}
          <div style={{ background: "rgba(13, 27, 56, 0.45)", backdropFilter: "blur(12px)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
            <div style={{
              display: "grid",
              gridTemplateColumns: "1.5fr 1fr 1.2fr 1fr 1fr",
              padding: "16px 24px",
              borderBottom: "1px solid var(--border-light)",
              fontSize: 11,
              color: "var(--text-secondary)",
              fontWeight: 700
            }}>
              <span>Advertiser / Merchant</span>
              <span>Rate (INR)</span>
              <span>Available / Limit</span>
              <span>Payment Methods</span>
              <span style={{ textAlign: "right" }}>Trade</span>
            </div>

            <div style={{ display: "flex", flexDirection: "column" }}>
              {BUY_ADS.map((ad) => (
                <div key={ad.id} style={{
                  display: "grid",
                  gridTemplateColumns: "1.5fr 1fr 1.2fr 1fr 1fr",
                  padding: "20px 24px",
                  borderBottom: "1px solid var(--border-light)",
                  alignItems: "center"
                }} className="pair-row">
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontWeight: 800, fontSize: 14, color: "var(--text-primary)" }}>{ad.seller}</span>
                      <span style={{ fontSize: 10, color: "var(--green)", display: "flex", alignItems: "center", gap: 2 }}>
                        <UserCheck size={11} /> Verified
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 4 }}>
                      {ad.orders} orders | {ad.completion}% completion
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: 18, fontWeight: 900, color: "var(--yellow)" }}>{ad.rate.toFixed(2)} INR</div>
                    <div style={{ fontSize: 10, color: "var(--text-secondary)", marginTop: 2 }}>≈ $1.00 USD</div>
                  </div>

                  <div>
                    <div style={{ fontSize: 12, color: "var(--text-primary)" }}>{ad.available.toLocaleString()} USDT</div>
                    <div style={{ fontSize: 10, color: "var(--text-secondary)", marginTop: 4 }}>
                      Limit: {ad.minLimit.toLocaleString()} - {ad.maxLimit.toLocaleString()} INR
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {ad.payments.map((p) => (
                      <span key={p} style={{
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid var(--border)",
                        fontSize: 10,
                        padding: "2px 8px",
                        borderRadius: 4,
                        color: "var(--text-primary)"
                      }}>{p}</span>
                    ))}
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <button onClick={() => handleOpenPurchase(ad)} className="btn-yellow" style={{
                      background: "var(--green)",
                      color: "#000",
                      padding: "8px 16px",
                      borderRadius: 6,
                      fontSize: 13,
                      fontWeight: 700
                    }}>
                      Buy USDT
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ESCROW CONTROL SIMULATOR CARD */}
          <div style={{
            background: "rgba(13, 27, 56, 0.45)",
            backdropFilter: "blur(12px)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            padding: 24,
            minHeight: 480,
            display: "flex",
            flexDirection: "column",
            boxShadow: "0 8px 32px 0 rgba(0, 0, 0, 0.37)"
          }}>
            {!activeAd ? (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: 24, gap: 12, opacity: 0.6 }}>
                <div style={{ fontSize: 48 }}>🛡️</div>
                <h3 style={{ fontSize: 16, fontWeight: 700 }}>Select a Merchant</h3>
                <p style={{ fontSize: 12, color: "var(--text-secondary)" }}>Choose one of the verified advertisers on the left to initiate the secure escrow verification flow.</p>
              </div>
            ) : escrowStep === "none" ? (
              // PURCHASE SETUP
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 20 }}>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 800 }}>Buy USDT from {activeAd.seller}</h3>
                  <p style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 4 }}>Locked Escrow rate is fixed at {activeAd.rate} INR/USDT</p>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: 10, color: "var(--text-secondary)", fontWeight: 700 }}>QUANTITY (USDT)</label>
                  <input
                    type="number"
                    className="bn-input"
                    value={purchaseQty}
                    onChange={e => setPurchaseQty(e.target.value)}
                    placeholder="Enter amount, e.g. 500"
                  />
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginTop: 4 }}>
                    <span style={{ color: "var(--text-secondary)" }}>Required Payment:</span>
                    <strong style={{ color: "var(--yellow)" }}>
                      {purchaseQty ? (parseFloat(purchaseQty) * activeAd.rate).toLocaleString(undefined, { minimumFractionDigits: 2 }) : "0.00"} INR
                    </strong>
                  </div>
                </div>

                <div style={{ border: "1px solid var(--border-light)", background: "rgba(0,0,0,0.1)", padding: 12, borderRadius: 8, display: "flex", gap: 10 }}>
                  <ShieldCheck size={20} color="var(--cyan)" style={{ flexShrink: 0 }} />
                  <p style={{ fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.4 }}>
                    Upon confirmation, CloudExchange ledger locks <strong style={{ color: "var(--text-primary)" }}>{purchaseQty || "0"} USDT</strong> from the seller&apos;s reserves. Funds are released only after receipt scanning confirmation.
                  </p>
                </div>

                <button onClick={handleStartEscrow} className="btn-yellow" style={{ width: "100%", padding: 12, fontWeight: 700, fontSize: 14 }}>
                  Instantiate Escrow Lock
                </button>
              </div>
            ) : (
              // ACTIVE ESCROW STATE MACHINE
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
                
                {/* State timeline header */}
                <div style={{ borderBottom: "1px solid var(--border-light)", paddingBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 700 }}>ORDER: {orderId}</span>
                    <span style={{
                      fontSize: 10,
                      fontWeight: 800,
                      padding: "2px 8px",
                      borderRadius: 4,
                      textTransform: "uppercase",
                      background: escrowStep === "created" ? "var(--yellow-dim)" : escrowStep === "scanning" ? "var(--cyan-dim)" : "var(--green-dim)",
                      color: escrowStep === "created" ? "var(--yellow)" : escrowStep === "scanning" ? "var(--cyan)" : "var(--green)"
                    }}>
                      {escrowStep === "created" ? "Payment Pending" : escrowStep === "scanning" ? "Scanning Receipt" : "USDT Released"}
                    </span>
                  </div>

                  {/* Step indicators */}
                  <div style={{ display: "flex", gap: 4, marginTop: 8 }}>
                    {["Locked", "Submit Receipt", "OCR Scan", "Released"].map((st, i) => {
                      const isActive =
                        (i === 0 && (escrowStep === "created" || escrowStep === "receipt" || escrowStep === "scanning" || escrowStep === "released")) ||
                        (i === 1 && (escrowStep === "receipt" || escrowStep === "scanning" || escrowStep === "released")) ||
                        (i === 2 && (escrowStep === "scanning" || escrowStep === "released")) ||
                        (i === 3 && escrowStep === "released");
                      return (
                        <div key={st} style={{ flex: 1, display: "flex", flexDirection: "column", gap: 3 }}>
                          <div style={{ height: 3, background: isActive ? "var(--cyan)" : "var(--border)", borderRadius: 1 }} />
                          <span style={{ fontSize: 8, color: isActive ? "var(--text-primary)" : "var(--text-muted)", textTransform: "uppercase" }}>{st}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Subsections: Escrow Action (Top) & Interactive Chat (Bottom) */}
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 12, justifyContent: "space-between" }}>
                  
                  {/* Escrow Status Actions */}
                  <div style={{ background: "rgba(0,0,0,0.15)", border: "1px solid var(--border)", borderRadius: 8, padding: 12 }}>
                    {escrowStep === "created" && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        <div style={{ fontSize: 12 }}>
                          Send payment of <strong style={{ color: "var(--yellow)" }}>{(parseFloat(purchaseQty) * activeAd.rate).toLocaleString()} INR</strong> to:
                          <div style={{ background: "rgba(0,0,0,0.3)", border: "1px solid var(--border)", padding: 8, borderRadius: 6, marginTop: 6, fontSize: 11, fontFamily: "monospace" }}>
                            UPI ID: alpha.liq@icici <br />
                            Account: 104829104052 <br />
                            IFSC: ICIC0001048
                          </div>
                        </div>
                        <button onClick={() => setEscrowStep("receipt")} className="btn-yellow" style={{ width: "100%", padding: "8px 0", fontSize: 12, fontWeight: 700 }}>
                          I Have Paid
                        </button>
                      </div>
                    )}

                    {escrowStep === "receipt" && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        <div style={{ fontSize: 12, fontWeight: 700 }}>Upload Payment Screenshot</div>
                        <p style={{ fontSize: 10, color: "var(--text-secondary)" }}>CloudExchange OCR validates receipt EXIF logs to protect against fraudulent claims.</p>
                        
                        <div style={{
                          border: "1px dashed var(--border)",
                          borderRadius: 8,
                          padding: 16,
                          textAlign: "center",
                          cursor: "pointer",
                          background: "rgba(0,0,0,0.2)"
                        }}
                        onClick={() => setSelectedFile(new File([""], "payment_receipt.png"))}>
                          <Upload size={24} style={{ color: "var(--cyan)", margin: "0 auto 8px" }} />
                          <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                            {selectedFile ? "payment_receipt.png selected" : "Click to select dummy receipt"}
                          </span>
                        </div>

                        <button onClick={handleVerifyReceipt} disabled={!selectedFile} className="btn-yellow" style={{ width: "100%", padding: "8px 0", fontSize: 12, fontWeight: 700 }}>
                          Verify Receipt Metadata
                        </button>
                      </div>
                    )}

                    {escrowStep === "scanning" && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 700, color: "var(--cyan)" }}>
                          <Terminal size={14} /> LIVE METADATA SCAN CONSOLE
                        </div>
                        {/* Terminal box */}
                        <div style={{
                          height: 120,
                          background: "#02040a",
                          borderRadius: 6,
                          border: "1px solid var(--border)",
                          padding: 8,
                          overflowY: "auto",
                          fontFamily: "monospace",
                          fontSize: 10,
                          color: "#39ff14",
                          lineHeight: 1.4
                        }}>
                          {scannerLogs.map((log, idx) => (
                            <div key={idx}>{log}</div>
                          ))}
                          <div ref={terminalEndRef} />
                        </div>
                      </div>
                    )}

                    {escrowStep === "released" && (
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ background: "var(--green-dim)", border: "1px solid var(--green)", padding: 8, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <Check size={20} color="var(--green)" />
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--green)" }}>Tokens Successfully Released</div>
                          <p style={{ fontSize: 10, color: "var(--text-secondary)", marginTop: 2 }}>
                            {purchaseQty} USDT has been credited to your collateral balance.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* E2E Encrypted Chat Box */}
                  <div style={{ display: "flex", flexDirection: "column", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden", height: 180, background: "rgba(0,0,0,0.3)" }}>
                    <div style={{ background: "rgba(0,0,0,0.15)", padding: "6px 12px", borderBottom: "1px solid var(--border-light)", fontSize: 10, fontWeight: 700, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 6 }}>
                      <MessageSquare size={12} /> SECURE ENCRYPTED CHANNEL
                    </div>
                    
                    <div style={{ flex: 1, padding: 8, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
                      {chatMessages.map((msg, idx) => {
                        if (msg.sender === "system") {
                          return (
                            <div key={idx} style={{ alignSelf: "center", background: "var(--border-light)", padding: "2px 8px", borderRadius: 4, fontSize: 9, color: "var(--text-secondary)", textAlign: "center" }}>
                              {msg.text}
                            </div>
                          );
                        }
                        const isUser = msg.sender === "buyer";
                        return (
                          <div key={idx} style={{
                            alignSelf: isUser ? "flex-end" : "flex-start",
                            background: isUser ? "var(--cyan-dim)" : "var(--bg-hover)",
                            border: `1px solid ${isUser ? "var(--cyan)" : "var(--border)"}`,
                            padding: "6px 10px",
                            borderRadius: 8,
                            maxWidth: "80%"
                          }}>
                            <div style={{ fontSize: 8, color: "var(--text-secondary)", display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 2 }}>
                              <span>{isUser ? "You" : activeAd.seller}</span>
                              <span>{msg.time}</span>
                            </div>
                            <div style={{ fontSize: 11, color: "var(--text-primary)", wordBreak: "break-word" }}>{msg.text}</div>
                          </div>
                        );
                      })}
                      <div ref={chatEndRef} />
                    </div>

                    <form onSubmit={handleSendMessage} style={{ display: "flex", borderTop: "1px solid var(--border-light)" }}>
                      <input
                        type="text"
                        placeholder="Type message..."
                        className="bn-input"
                        value={chatInput}
                        onChange={e => setChatInput(e.target.value)}
                        style={{ border: "none", borderRadius: 0, padding: 8, fontSize: 11, background: "none" }}
                      />
                      <button type="submit" style={{ background: "var(--yellow)", color: "#000", border: "none", padding: "0 12px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Send</button>
                    </form>
                  </div>

                </div>

                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <button onClick={() => setEscrowStep("none")} style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: 11, cursor: "pointer" }}>
                    &lsaquo; Back to details
                  </button>
                  <span style={{ fontSize: 10, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 4 }}>
                    <AlertCircle size={10} color="var(--yellow)" /> Escrow auto-lock ends in 14:52
                  </span>
                </div>
              </div>
            )}
          </div>

        </div>

      </div>

      {/* FOOTER */}
      <footer style={{
        background: "rgba(10, 17, 40, 0.75)",
        backdropFilter: "blur(12px)",
        borderTop: "1px solid var(--border)",
        padding: "32px 0",
        fontSize: 12,
        color: "var(--text-secondary)",
        marginTop: "auto"
      }}>
        <div className="container-xl" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>© 2026 CloudExchange P2P Marketplace. Escrow protocol audits publicly verifiable.</span>
          <div style={{ display: "flex", gap: 16 }}>
            <Link href="/" style={{ color: "var(--text-secondary)", textDecoration: "none" }}>Back to Home</Link>
            <a href="#" style={{ color: "var(--text-secondary)", textDecoration: "none" }}>Risk Disclaimer</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
