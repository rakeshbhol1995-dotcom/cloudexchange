"use client";
import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { LogOut, ShieldCheck, MessageSquare, Upload, Check, AlertCircle, Terminal, HelpCircle, UserCheck } from "lucide-react";
import CloudExchangeLogo from "../components/CloudExchangeLogo";
import SpaceBackground from "../components/SpaceBackground";
import Header from "../components/Header";

interface Ad { id: string; seller: string; orders: number; completion: number; rate: number; available: number; minLimit: number; maxLimit: number; payments: string[]; }
interface ChatMessage { sender: "system" | "buyer" | "seller"; text: string; time: string; }

const BUY_ADS: Ad[] = [
  { id: "ad-1", seller: "TitanOTC", orders: 1845, completion: 99.2, rate: 89.42, available: 15400, minLimit: 10000, maxLimit: 500000, payments: ["UPI", "IMPS"] },
  { id: "ad-2", seller: "Alpha_Liquidity", orders: 954, completion: 98.7, rate: 89.48, available: 42000, minLimit: 20000, maxLimit: 1500000, payments: ["IMPS", "Bank Transfer"] },
  { id: "ad-3", seller: "CryptoEscrow_Desk", orders: 3412, completion: 99.8, rate: 89.50, available: 8500, minLimit: 5000, maxLimit: 750000, payments: ["UPI", "PhonePe"] },
  { id: "ad-4", seller: "DeltaMerchant", orders: 421, completion: 95.4, rate: 89.55, available: 12000, minLimit: 10000, maxLimit: 1000000, payments: ["UPI", "GPay"] },
];

const SELL_ADS: Ad[] = [
  { id: "ad-s1", seller: "GoldShield_Liquidity", orders: 2510, completion: 99.9, rate: 89.38, available: 20000, minLimit: 10000, maxLimit: 600000, payments: ["UPI", "IMPS"] },
  { id: "ad-s2", seller: "Apex_OTC_Desk", orders: 1102, completion: 98.5, rate: 89.35, available: 50000, minLimit: 25000, maxLimit: 2000000, payments: ["IMPS", "Bank Transfer"] },
  { id: "ad-s3", seller: "ZeroFee_Trader", orders: 840, completion: 97.4, rate: 89.30, available: 6500, minLimit: 3000, maxLimit: 150000, payments: ["UPI", "GPay"] },
  { id: "ad-s4", seller: "InstaP2P_Merchant", orders: 342, completion: 96.1, rate: 89.28, available: 8000, minLimit: 5000, maxLimit: 250000, payments: ["UPI", "PhonePe"] },
];

export default function P2PMarketplace() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  
  // Buy / Sell Trade Type switcher state
  const [tradeType, setTradeType] = useState<"buy" | "sell">("buy");
  
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

  // P2P Merchant application states
  const [showMerchantModal, setShowMerchantModal] = useState(false);
  const [merchantUpi, setMerchantUpi] = useState("");
  const [isMerchantApproved, setIsMerchantApproved] = useState(false);
  const [isMerchantPending, setIsMerchantPending] = useState(false);

  // Dynamic Ads Lists
  const [adsList, setAdsList] = useState<Ad[]>(BUY_ADS);
  const [sellAdsList, setSellAdsList] = useState<Ad[]>(SELL_ADS);

  // Ad creation states
  const [showPostAdModal, setShowPostAdModal] = useState(false);
  const [newAdRate, setNewAdRate] = useState("89.50");
  const [newAdAvailable, setNewAdAvailable] = useState("1000");
  const [newAdMinLimit, setNewAdMinLimit] = useState("5000");
  const [newAdMaxLimit, setNewAdMaxLimit] = useState("50000");
  const [newAdPayment, setNewAdPayment] = useState("UPI");

  // Auth & state sync
  useEffect(() => {
    const logged = localStorage.getItem("user_logged_in");
    const storedEmail = localStorage.getItem("username");
    if (logged === "true") {
      setIsLoggedIn(true);
      setUserEmail(storedEmail || "institutional_trader@cloud.ex");
    }

    // Load P2P ads
    const savedAds = localStorage.getItem("p2p_active_ads");
    if (savedAds) {
      setAdsList(JSON.parse(savedAds));
    } else {
      localStorage.setItem("p2p_active_ads", JSON.stringify(BUY_ADS));
    }

    const savedSellAds = localStorage.getItem("p2p_active_sell_ads");
    if (savedSellAds) {
      setSellAdsList(JSON.parse(savedSellAds));
    } else {
      localStorage.setItem("p2p_active_sell_ads", JSON.stringify(SELL_ADS));
    }

    // Check merchant status
    const isApproved = localStorage.getItem("is_p2p_merchant") === "true";
    setIsMerchantApproved(isApproved);

    const savedApps = localStorage.getItem("admin_merchant_applications");
    if (savedApps && (storedEmail || logged === "true")) {
      const targetUser = storedEmail || "institutional_trader@cloud.ex";
      const apps = JSON.parse(savedApps);
      const userApp = apps.find((a: any) => a.username === targetUser);
      if (userApp) {
        if (userApp.status === "Pending") {
          setIsMerchantPending(true);
        } else if (userApp.status === "Approved") {
          setIsMerchantApproved(true);
          setIsMerchantPending(false);
        }
      }
    }
  }, [showMerchantModal, showPostAdModal]);

  const handleLogout = () => {
    localStorage.removeItem("user_logged_in");
    localStorage.removeItem("username");
    setIsLoggedIn(false);
    setUserEmail("");
  };

  const handleMerchantAction = () => {
    if (!isLoggedIn) {
      alert("Please log in to apply as a P2P Merchant.");
      return;
    }
    if (isMerchantApproved) {
      alert("Welcome to the Merchant Dashboard! You are authorized to place high-volume payment ads.");
      return;
    }
    if (isMerchantPending) {
      alert("Your merchant application is currently under review by the exchange risk team. Check back soon.");
      return;
    }
    setShowMerchantModal(true);
  };

  const handleRegisterMerchant = (e: React.FormEvent) => {
    e.preventDefault();
    if (!merchantUpi) {
      alert("Please specify a valid UPI ID.");
      return;
    }
    const targetUser = userEmail || "institutional_trader@cloud.ex";
    const newApp = {
      id: "M-" + Math.floor(1000 + Math.random() * 9000),
      username: targetUser,
      upiId: merchantUpi,
      depositAmount: 500,
      status: "Pending"
    };

    const savedApps = localStorage.getItem("admin_merchant_applications");
    const appsList = savedApps ? JSON.parse(savedApps) : [];
    localStorage.setItem("admin_merchant_applications", JSON.stringify([...appsList, newApp]));

    setIsMerchantPending(true);
    setShowMerchantModal(false);
    alert("Application submitted! 500 USDT has been mock locked from your collateral. Admin will verify UPI details.");
  };

  const handlePostAdSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const targetUser = userEmail || "institutional_trader@cloud.ex";
    const newAd: Ad = {
      id: "ad-" + Math.floor(10000 + Math.random() * 90000),
      seller: targetUser.split("@")[0],
      orders: 12,
      completion: 100.0,
      rate: parseFloat(newAdRate) || 89.50,
      available: parseFloat(newAdAvailable) || 1000,
      minLimit: parseFloat(newAdMinLimit) || 5000,
      maxLimit: parseFloat(newAdMaxLimit) || 50000,
      payments: [newAdPayment]
    };

    if (tradeType === "buy") {
      const updatedAds = [newAd, ...adsList];
      setAdsList(updatedAds);
      localStorage.setItem("p2p_active_ads", JSON.stringify(updatedAds));
    } else {
      const updatedAds = [newAd, ...sellAdsList];
      setSellAdsList(updatedAds);
      localStorage.setItem("p2p_active_sell_ads", JSON.stringify(updatedAds));
    }
    setShowPostAdModal(false);
    alert(`Successfully posted new P2P Trade Ad with rate: ${newAd.rate} INR!`);
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
    
    // Seed initial system and counterparty chat messages based on Buy vs Sell
    const initialTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (tradeType === "buy") {
      setChatMessages([
        { sender: "system", text: `Escrow Order ${randId} successfully locked by CloudExchange ledger.`, time: initialTime },
        { sender: "seller", text: `Hello! Please send payments matching the exact amount via UPI/IMPS. Upload a screenshot once done.`, time: initialTime }
      ]);
    } else {
      setChatMessages([
        { sender: "system", text: `Escrow Order ${randId} successfully created. Your USDT has been locked in safe escrow.`, time: initialTime },
        { sender: "seller", text: `Hi! I will send you the INR payment immediately via UPI. Please check your bank account and click Release when verified.`, time: initialTime }
      ]);
    }
  };

  // Chat message simulator loop for seller responses
  useEffect(() => {
    if (escrowStep === "created" && chatMessages.length === 2) {
      const timer = setTimeout(() => {
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        if (tradeType === "buy") {
          setChatMessages(prev => [...prev, {
            sender: "seller",
            text: "I release as soon as the banking app pushes notifications (usually less than 30s). Make sure the bank account name matches your registered name.",
            time
          }]);
        } else {
          setChatMessages(prev => [...prev, {
            sender: "seller",
            text: "Just sent the money! It should hit your bank in a second. Let me know once you get it.",
            time
          }]);
        }
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [escrowStep, chatMessages, tradeType]);

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
      "✅ Device Signature Matching Verified.",
      "✅ Timestamp check: Upload matches transaction window.",
      "🧬 Extracting Perceptual Hash (pHash)...",
      "✅ pHash check: Valid unique receipt signature.",
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
            const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            setChatMessages(prev => [
              ...prev,
              { sender: "system", text: "Seller confirmed payment receipt. Assets released from escrow contract.", time },
              { sender: "seller", text: "Verified! Released. Thank you!", time }
            ]);
            
            // Calculate USDT from INR
            const usdtAmt = activeAd ? parseFloat((parseFloat(purchaseQty) / activeAd.rate).toFixed(2)) : 0;
            const b = parseFloat(localStorage.getItem("wallet_balance") || "15740.50");
            localStorage.setItem("wallet_balance", String(+(b + usdtAmt).toFixed(2)));
            window.dispatchEvent(new Event("storage"));
          }, 1500);
        }
      }, (index + 1) * 800);
    });
  };

  const handleReleaseUsdt = () => {
    setEscrowStep("released");
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setChatMessages(prev => [
      ...prev,
      { sender: "system", text: "You have released the USDT from escrow contract.", time },
      { sender: "seller", text: "Verified! Payment confirmed on my side. Thank you!", time }
    ]);
    
    // Deduct USDT from wallet
    const usdtAmt = activeAd ? parseFloat((parseFloat(purchaseQty) / activeAd.rate).toFixed(2)) : 0;
    const b = parseFloat(localStorage.getItem("wallet_balance") || "15740.50");
    localStorage.setItem("wallet_balance", String(Math.max(0, +(b - usdtAmt).toFixed(2))));
    window.dispatchEvent(new Event("storage"));
  };

  return (
    <div style={{ minHeight: "100vh", position: "relative", color: "var(--text-primary)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <SpaceBackground />

      <Header activeTab="p2p" />

      {/* BODY */}
      <div className="container-xl" style={{ flex: 1, padding: "40px 24px", display: "flex", flexDirection: "column", gap: 24, zIndex: 10 }}>
        
        {/* Intro */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <span style={{ background: "var(--cyan-dim)", color: "var(--cyan)", padding: "4px 12px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>ZERO FEES</span>
            <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Secure Peer-to-Peer Fiat Gateway</span>
          </div>
          <h1 className="responsive-h1">P2P Marketplace Escrow Portal</h1>
          <p style={{ fontSize: 14, color: "var(--text-secondary)", marginTop: 8 }}>Buy cryptocurrency directly from verified community liquidity desks. Locked smart contract escrow protects all transactions.</p>
        </div>

        {/* Top filter strip */}
        <div className="p2p-filter-strip" style={{ background: "rgba(13, 27, 56, 0.45)", backdropFilter: "blur(12px)", borderRadius: 12, border: "1px solid var(--border)", padding: "16px 24px" }}>
          <div>
            <label style={{ fontSize: 10, color: "var(--text-secondary)", fontWeight: 700, display: "block", marginBottom: 6 }}>BUY / SELL</label>
            <div style={{ display: "flex", gap: 4, background: "rgba(0,0,0,0.2)", padding: 3, borderRadius: 6 }}>
              <button 
                onClick={() => { setTradeType("buy"); setActiveAd(null); }}
                style={{ 
                  background: tradeType === "buy" ? "var(--green)" : "none", 
                  color: tradeType === "buy" ? "#000" : "var(--text-secondary)", 
                  fontWeight: 700, 
                  border: "none", 
                  borderRadius: 4, 
                  padding: "4px 12px", 
                  fontSize: 12,
                  cursor: "pointer"
                }}
              >
                Buy
              </button>
              <button 
                onClick={() => { setTradeType("sell"); setActiveAd(null); }}
                style={{ 
                  background: tradeType === "sell" ? "#E55039" : "none", 
                  color: tradeType === "sell" ? "#fff" : "var(--text-secondary)", 
                  fontWeight: 700, 
                  border: "none", 
                  borderRadius: 4, 
                  padding: "4px 12px", 
                  fontSize: 12,
                  cursor: "pointer"
                }}
              >
                Sell
              </button>
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
            {isMerchantApproved ? (
              <button onClick={() => setShowPostAdModal(true)} className="btn-yellow bn-tab-sm" style={{ padding: "6px 14px", fontSize: 12, fontWeight: 700 }}>
                📢 Post Trade Ad
              </button>
            ) : (
              <button onClick={handleMerchantAction} className="btn-yellow bn-tab-sm" style={{ padding: "6px 14px", fontSize: 12, fontWeight: 700 }}>
                {isMerchantPending ? "Pending Review" : "Become a Merchant"}
              </button>
            )}
          </div>
        </div>

        <div className="p2p-layout-grid">
          
          {/* ADS LIST */}
          <div style={{ background: "rgba(13, 27, 56, 0.45)", backdropFilter: "blur(12px)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
            <div className="p2p-header-grid" style={{
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
              {(tradeType === "buy" ? adsList : sellAdsList).map((ad) => (
                <div key={ad.id} style={{
                  padding: "20px 24px",
                  borderBottom: "1px solid var(--border-light)",
                  alignItems: "center"
                }} className="pair-row p2p-row-grid">
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
                        color: "var(--text-primary)",
                        fontWeight: 600
                      }}>
                        {p}
                      </span>
                    ))}
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <button 
                      onClick={() => handleOpenPurchase(ad)} 
                      style={{ 
                        padding: "8px 20px", 
                        fontSize: 12, 
                        fontWeight: 700, 
                        background: tradeType === "buy" ? "var(--green)" : "#E55039",
                        color: tradeType === "buy" ? "#000" : "#fff",
                        border: "none",
                        borderRadius: 6,
                        cursor: "pointer"
                      }}
                    >
                      {tradeType === "buy" ? "Buy USDT" : "Sell USDT"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* INTERACTIVE TRADE PANEL */}
          <div style={{
            background: "rgba(10, 17, 40, 0.55)",
            backdropFilter: "blur(12px)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            padding: 24,
            minHeight: 480
          }}>
            {!activeAd ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 400, textAlign: "center", color: "var(--text-secondary)" }}>
                <HelpCircle size={48} style={{ marginBottom: 16, color: "var(--border)" }} />
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>
                  {tradeType === "buy" ? "Select an Ad to Buy" : "Select an Ad to Sell"}
                </h3>
                <p style={{ fontSize: 12, maxWidth: 280, marginTop: 8 }}>
                  {tradeType === "buy" 
                    ? "Choose a verified merchant from the left list to lock currency, open secure chat, and send payments."
                    : "Choose a verified merchant from the left list to place your USDT in escrow, open secure chat, and receive payments."}
                </p>
              </div>
            ) : escrowStep === "none" ? (
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>
                  {tradeType === "buy" ? `Buy USDT from ${activeAd.seller}` : `Sell USDT to ${activeAd.seller}`}
                </h3>
                <p style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                  {tradeType === "buy" ? "Verify purchasing specs and proceed to lock assets in escrow." : "Locked USDT will be held safely in escrow contract until payment confirmation."}
                </p>

                <div style={{ margin: "24px 0", display: "flex", flexDirection: "column", gap: 16 }}>
                  {tradeType === "buy" ? (
                    <>
                      <div>
                        <label style={{ fontSize: 10, color: "var(--text-secondary)", fontWeight: 700, display: "block", marginBottom: 6 }}>I WANT TO PAY (INR)</label>
                        <div style={{ position: "relative" }}>
                          <input
                            type="number"
                            className="bn-input"
                            placeholder="Limit: 10000 - 500000"
                            value={purchaseQty}
                            onChange={e => setPurchaseQty(e.target.value)}
                          />
                          <span style={{ position: "absolute", right: 14, top: 12, fontSize: 12, fontWeight: 700, color: "var(--text-secondary)" }}>INR</span>
                        </div>
                      </div>

                      <div>
                        <label style={{ fontSize: 10, color: "var(--text-secondary)", fontWeight: 700, display: "block", marginBottom: 6 }}>I WILL RECEIVE (USDT)</label>
                        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", padding: "12px 16px", borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <strong style={{ fontSize: 18, color: "var(--cyan)" }}>
                            {((parseFloat(purchaseQty) || 0) / activeAd.rate).toFixed(2)}
                          </strong>
                          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)" }}>USDT</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <label style={{ fontSize: 10, color: "var(--text-secondary)", fontWeight: 700, display: "block", marginBottom: 6 }}>I WANT TO SELL (USDT)</label>
                        <div style={{ position: "relative" }}>
                          <input
                            type="number"
                            className="bn-input"
                            placeholder="e.g. 500"
                            value={purchaseQty}
                            onChange={e => setPurchaseQty(e.target.value)}
                          />
                          <span style={{ position: "absolute", right: 14, top: 12, fontSize: 12, fontWeight: 700, color: "var(--text-secondary)" }}>USDT</span>
                        </div>
                      </div>

                      <div>
                        <label style={{ fontSize: 10, color: "var(--text-secondary)", fontWeight: 700, display: "block", marginBottom: 6 }}>I WILL RECEIVE (INR)</label>
                        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", padding: "12px 16px", borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <strong style={{ fontSize: 18, color: "var(--yellow)" }}>
                            {((parseFloat(purchaseQty) || 0) * activeAd.rate).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </strong>
                          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)" }}>INR</span>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <button 
                    onClick={handleStartEscrow} 
                    style={{ 
                      width: "100%", 
                      padding: 14, 
                      fontWeight: 700, 
                      fontSize: 13,
                      background: tradeType === "buy" ? "var(--yellow)" : "#E55039",
                      color: tradeType === "buy" ? "#000" : "#fff",
                      border: "none",
                      borderRadius: 8,
                      cursor: "pointer"
                    }}
                  >
                    {tradeType === "buy" ? "Lock Escrow & Open Trade" : "Lock USDT & Open Escrow"}
                  </button>
                  <button onClick={() => setActiveAd(null)} style={{ background: "none", border: "none", color: "var(--text-secondary)", fontSize: 12, cursor: "pointer" }}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div>
                {/* Active Escrow state wrapper */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                  <div>
                    <div style={{ fontSize: 10, color: "var(--text-secondary)", fontWeight: 700 }}>ORDER LOCKED: {orderId}</div>
                    <h3 style={{ fontSize: 16, fontWeight: 800, marginTop: 4 }}>
                      {tradeType === "buy" ? (
                        escrowStep === "released" ? "Released" : escrowStep === "scanning" ? "Scanning Receipt" : "Send Fiat Payment"
                      ) : (
                        escrowStep === "released" ? "Completed" : escrowStep === "receipt" ? "Release USDT" : "Awaiting Buyer Payment"
                      )}
                    </h3>
                  </div>
                  <span style={{
                    background: escrowStep === "released" ? "rgba(0, 230, 118, 0.1)" : "rgba(245, 166, 35, 0.1)",
                    color: escrowStep === "released" ? "var(--green)" : "var(--yellow)",
                    border: `1px solid ${escrowStep === "released" ? "rgba(0, 230, 118, 0.3)" : "rgba(245, 166, 35, 0.3)"}`,
                    padding: "4px 10px",
                    borderRadius: 6,
                    fontSize: 10,
                    fontWeight: 700
                  }}>
                    {escrowStep.toUpperCase()}
                  </span>
                </div>

                {/* Seller specs / UPI */}
                <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)", borderRadius: 8, padding: 16, marginBottom: 20 }}>
                  <div style={{ fontSize: 10, color: "var(--text-secondary)", fontWeight: 700 }}>
                    {tradeType === "buy" ? "SELLER PAYMENT DESTINATION" : "YOUR RECEIVING PAYMENT DESTINATION"}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
                    <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>UPI ID:</span>
                    <strong style={{ fontSize: 13, color: "var(--cyan)" }}>
                      {tradeType === "buy" ? "merchant_ops@ybl" : (merchantUpi || "trader_sec@okaxis")}
                    </strong>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                    <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                      {tradeType === "buy" ? "Amount to Send:" : "Amount to Receive:"}
                    </span>
                    <strong style={{ fontSize: 14, color: "var(--yellow)" }}>
                      ₹{tradeType === "buy" 
                        ? (parseFloat(purchaseQty) || 0).toLocaleString("en-IN")
                        : ((parseFloat(purchaseQty) || 0) * activeAd.rate).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                      } INR
                    </strong>
                  </div>
                </div>

                {/* Sub Steps inside Escrow */}
                <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 20 }}>
                  {tradeType === "buy" ? (
                    <>
                      {escrowStep === "created" && (
                        <div>
                          <label style={{ fontSize: 10, color: "var(--text-secondary)", fontWeight: 700, display: "block", marginBottom: 6 }}>SUBMIT PAYMENT RECEIPT</label>
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", border: "1px dashed var(--border)", padding: 20, borderRadius: 8, cursor: "pointer", background: "rgba(0,0,0,0.15)" }}>
                            <Upload size={24} style={{ color: "var(--text-secondary)", marginBottom: 8 }} />
                            <span style={{ fontSize: 11, color: "var(--text-primary)", fontWeight: 700 }}>Upload Bank Transfer Screenshot</span>
                            <span style={{ fontSize: 9, color: "var(--text-secondary)", marginTop: 4 }}>PNG or JPG up to 10MB</span>
                            <input
                              type="file"
                              accept="image/*"
                              style={{ display: "none" }}
                              id="payment-receipt-upload"
                              onChange={(e) => {
                                if (e.target.files?.[0]) {
                                  setSelectedFile(e.target.files[0]);
                                  setEscrowStep("receipt");
                                }
                              }}
                            />
                            <button onClick={() => document.getElementById("payment-receipt-upload")?.click()} className="btn-outline" style={{ marginTop: 12, fontSize: 10, padding: "4px 12px" }}>
                              Choose File
                            </button>
                          </div>
                        </div>
                      )}

                      {escrowStep === "receipt" && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                          <div style={{ background: "rgba(0, 230, 118, 0.05)", border: "1px solid rgba(0, 230, 118, 0.2)", borderRadius: 8, padding: 12, display: "flex", alignItems: "center", gap: 10 }}>
                            <Check size={16} color="var(--green)" />
                            <span style={{ fontSize: 11, color: "var(--green)", fontWeight: 700 }}>Receipt loaded: {selectedFile?.name}</span>
                          </div>
                          <button onClick={handleVerifyReceipt} className="btn-yellow" style={{ width: "100%", padding: 12, fontWeight: 700, fontSize: 12 }}>
                            Trigger Automated Anti-Fraud Receipt Scan
                          </button>
                        </div>
                      )}

                      {escrowStep === "scanning" && (
                        <div style={{ background: "#040814", border: "1px solid var(--border)", borderRadius: 8, height: 180, overflowY: "auto", padding: 12, fontFamily: "monospace", fontSize: 9, color: "var(--cyan)", display: "flex", flexDirection: "column", gap: 4 }}>
                          {scannerLogs.map((log, idx) => (
                            <div key={idx}>{log}</div>
                          ))}
                          <div ref={terminalEndRef} />
                        </div>
                      )}

                      {escrowStep === "released" && (
                        <div style={{ background: "rgba(0, 230, 118, 0.05)", border: "1.5px solid var(--green)", borderRadius: 12, padding: 20, textAlign: "center" }}>
                          <span style={{ fontSize: 32 }}>🎉</span>
                          <h4 style={{ fontSize: 15, fontWeight: 800, color: "var(--green)", marginTop: 8 }}>Escrow Release Success</h4>
                          <p style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 6, lineHeight: 1.5 }}>
                            Tokens are now safely locked in your central ledger balance. Use the trade portal or coins console to manage.
                          </p>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      {escrowStep === "created" && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                          <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)", borderRadius: 8, padding: 12, fontSize: 11, lineHeight: 1.5, color: "var(--text-secondary)" }}>
                            ⌛ The buyer has been notified to make UPI payment of <strong style={{ color: "var(--yellow)" }}>₹{((parseFloat(purchaseQty) || 0) * activeAd.rate).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} INR</strong> to your UPI ID.
                          </div>
                          
                          {/* Simulation trigger */}
                          <button 
                            onClick={() => {
                              setEscrowStep("receipt");
                              const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                              setChatMessages(prev => [
                                ...prev,
                                { sender: "system", text: "Buyer marked order as PAID and submitted transaction ledger proof.", time },
                                { sender: "seller", text: "Paid! Please check your bank and release USDT.", time }
                              ]);
                            }} 
                            style={{
                              background: "var(--cyan-dim)",
                              border: "1px solid var(--cyan)",
                              color: "var(--cyan)",
                              padding: "10px 14px",
                              borderRadius: 8,
                              fontWeight: 700,
                              fontSize: 12,
                              cursor: "pointer"
                            }}
                          >
                            ⚡ Simulate Buyer Paid (Mark Payment Received)
                          </button>
                        </div>
                      )}

                      {escrowStep === "receipt" && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                          <div style={{ background: "rgba(0, 230, 118, 0.05)", border: "1px solid rgba(0, 230, 118, 0.2)", borderRadius: 8, padding: 12, fontSize: 11, lineHeight: 1.5, color: "var(--green)", fontWeight: 700 }}>
                            ✅ Buyer has marked payment as COMPLETED. Please verify your banking app / SMS statement for the incoming funds.
                          </div>
                          <button 
                            onClick={handleReleaseUsdt} 
                            style={{ 
                              width: "100%", 
                              padding: 14, 
                              fontWeight: 700, 
                              fontSize: 13,
                              background: "var(--green)",
                              color: "#000",
                              border: "none",
                              borderRadius: 8,
                              cursor: "pointer"
                            }}
                          >
                            🔒 Release USDT from Escrow
                          </button>
                        </div>
                      )}

                      {escrowStep === "released" && (
                        <div style={{ background: "rgba(0, 230, 118, 0.05)", border: "1.5px solid var(--green)", borderRadius: 12, padding: 20, textAlign: "center" }}>
                          <span style={{ fontSize: 32 }}>🎉</span>
                          <h4 style={{ fontSize: 15, fontWeight: 800, color: "var(--green)", marginTop: 8 }}>Escrow Release Confirmed</h4>
                          <p style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 6, lineHeight: 1.5 }}>
                            USDT released to buyer. Your wallet has been updated.
                          </p>
                        </div>
                      )}
                    </>
                  )}

                {/* Secure P2P chat room */}
                <div style={{ background: "rgba(0,0,0,0.2)", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden", display: "flex", flexDirection: "column" }}>
                  <div style={{ background: "var(--border-light)", padding: "8px 12px", borderBottom: "1px solid var(--border)", display: "flex", justifySelf: "flex-start", gap: 6, alignItems: "center", fontSize: 10, fontWeight: 700, color: "var(--text-secondary)" }}>
                    <MessageSquare size={12} /> SECURE TRADE CHAT (ENCRYPTED)
                  </div>

                    <div style={{ height: 140, overflowY: "auto", padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
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

      {/* Become a Merchant Modal */}
      {showMerchantModal && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(2, 4, 10, 0.85)",
          backdropFilter: "blur(8px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          padding: 20
        }}>
          <div style={{
            background: "rgba(10, 17, 40, 0.95)",
            border: "1px solid var(--border)",
            borderRadius: 16,
            width: "100%",
            maxWidth: 440,
            padding: 24,
            position: "relative",
            boxShadow: "0 10px 40px rgba(0,0,0,0.8)"
          }}>
            <button onClick={() => setShowMerchantModal(false)} style={{ position: "absolute", right: 20, top: 20, background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer" }}>
              ✕
            </button>
            <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>Become a P2P Merchant</h3>
            <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 20 }}>
              Apply to post high-volume IMPS/UPI trade ads. Requires a security deposit of 500 USDT mock locked.
            </p>

            <form onSubmit={handleRegisterMerchant} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ fontSize: 10, color: "var(--text-secondary)", fontWeight: 700, display: "block", marginBottom: 6 }}>UPI ID (FOR INCOMING PAYMENTS)</label>
                <input 
                  type="text" 
                  className="bn-input" 
                  placeholder="e.g. trader@okaxis" 
                  value={merchantUpi} 
                  onChange={e => setMerchantUpi(e.target.value)} 
                  required 
                />
              </div>

              <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderRadius: 8, padding: 12, fontSize: 11 }}>
                💰 Security Deposit: <strong style={{ color: "var(--yellow)" }}>500 USDT</strong>
                <span style={{ display: "block", color: "var(--text-secondary)", fontSize: 10, marginTop: 4 }}>
                  This amount will be mock-locked in your wallet to cover dispute resolutions.
                </span>
              </div>

              <button type="submit" className="btn-yellow" style={{ padding: 12, fontWeight: 700, marginTop: 8 }}>
                Submit Merchant Application
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Post Trade Ad Modal */}
      {showPostAdModal && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(2, 4, 10, 0.85)",
          backdropFilter: "blur(8px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          padding: 20
        }}>
          <div style={{
            background: "rgba(10, 17, 40, 0.95)",
            border: "1px solid var(--border)",
            borderRadius: 16,
            width: "100%",
            maxWidth: 440,
            padding: 24,
            position: "relative",
            boxShadow: "0 10px 40px rgba(0,0,0,0.8)"
          }}>
            <button onClick={() => setShowPostAdModal(false)} style={{ position: "absolute", right: 20, top: 20, background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer" }}>
              ✕
            </button>
            <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>Post P2P Trade Ad</h3>
            <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 20 }}>
              Create a custom bid to sell USDT to community users directly.
            </p>

            <form onSubmit={handlePostAdSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ fontSize: 10, color: "var(--text-secondary)", fontWeight: 700, display: "block", marginBottom: 6 }}>EXCHANGE RATE (INR PER USDT)</label>
                <input 
                  type="number" 
                  step="any"
                  className="bn-input" 
                  placeholder="e.g. 89.50" 
                  value={newAdRate} 
                  onChange={e => setNewAdRate(e.target.value)} 
                  required 
                />
              </div>

              <div>
                <label style={{ fontSize: 10, color: "var(--text-secondary)", fontWeight: 700, display: "block", marginBottom: 6 }}>TOTAL QUANTITY (USDT)</label>
                <input 
                  type="number" 
                  className="bn-input" 
                  placeholder="e.g. 1000" 
                  value={newAdAvailable} 
                  onChange={e => setNewAdAvailable(e.target.value)} 
                  required 
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div>
                  <label style={{ fontSize: 10, color: "var(--text-secondary)", fontWeight: 700, display: "block", marginBottom: 6 }}>MIN LIMIT (INR)</label>
                  <input 
                    type="number" 
                    className="bn-input" 
                    placeholder="e.g. 5000" 
                    value={newAdMinLimit} 
                    onChange={e => setNewAdMinLimit(e.target.value)} 
                    required 
                  />
                </div>
                <div>
                  <label style={{ fontSize: 10, color: "var(--text-secondary)", fontWeight: 700, display: "block", marginBottom: 6 }}>MAX LIMIT (INR)</label>
                  <input 
                    type="number" 
                    className="bn-input" 
                    placeholder="e.g. 50000" 
                    value={newAdMaxLimit} 
                    onChange={e => setNewAdMaxLimit(e.target.value)} 
                    required 
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: 10, color: "var(--text-secondary)", fontWeight: 700, display: "block", marginBottom: 6 }}>PREFERRED PAYMENT METHOD</label>
                <select className="bn-select" value={newAdPayment} onChange={e => setNewAdPayment(e.target.value)}>
                  <option value="UPI">UPI Payment</option>
                  <option value="IMPS">IMPS Instant Transfer</option>
                  <option value="Bank Transfer">Direct Bank Wire</option>
                  <option value="GPay">Google Pay (GPay)</option>
                  <option value="PhonePe">PhonePe Transfer</option>
                </select>
              </div>

              <button type="submit" className="btn-yellow" style={{ padding: 12, fontWeight: 700, marginTop: 10 }}>
                Publish Trade Ad
              </button>
            </form>
          </div>
        </div>
      )}

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
