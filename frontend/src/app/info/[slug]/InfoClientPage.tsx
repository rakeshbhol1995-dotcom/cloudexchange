"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import SpaceBackground from "../../components/SpaceBackground";
import { 
  Terminal as TerminalIcon, Shield, Cpu, RefreshCw, Key, 
  HelpCircle, FileText, Lock, AlertTriangle, Settings, 
  Check, Copy, Play, Pause, RefreshCcw 
} from "lucide-react";

// Types
type SlugType = 
  | "api-whitelist" 
  | "shadow-replay" 
  | "disruptor-buffer" 
  | "fix-gateway" 
  | "help-center" 
  | "security-audits" 
  | "terms-of-service" 
  | "privacy-policy" 
  | "risk-warning" 
  | "cookie-preferences";

interface SidebarItem {
  name: string;
  slug: SlugType;
  category: "Technical" | "Legal & Support";
  icon: React.ComponentType<any>;
}

const SIDEBAR_ITEMS: SidebarItem[] = [
  // Technical Layers
  { name: "API Whitelist", slug: "api-whitelist", category: "Technical", icon: Key },
  { name: "Shadow Replay", slug: "shadow-replay", category: "Technical", icon: RefreshCw },
  { name: "Disruptor Buffer", slug: "disruptor-buffer", category: "Technical", icon: Cpu },
  { name: "FIX Gateway", slug: "fix-gateway", category: "Technical", icon: TerminalIcon },
  // Legal & Support
  { name: "Help Center", slug: "help-center", category: "Legal & Support", icon: HelpCircle },
  { name: "Security Audits", slug: "security-audits", category: "Legal & Support", icon: Shield },
  { name: "Terms of Service", slug: "terms-of-service", category: "Legal & Support", icon: FileText },
  { name: "Privacy Policy", slug: "privacy-policy", category: "Legal & Support", icon: Lock },
  { name: "Risk Warning", slug: "risk-warning", category: "Legal & Support", icon: AlertTriangle },
  { name: "Cookie Preferences", slug: "cookie-preferences", category: "Legal & Support", icon: Settings },
];

export default function InfoClientPage({ slug: initialSlug }: { slug: string }) {
  const router = useRouter();

  // Validate active slug and sync with prop
  const getValidatedSlug = (raw: string): SlugType => {
    return SIDEBAR_ITEMS.some(item => item.slug === raw) ? (raw as SlugType) : "api-whitelist";
  };

  const [activeSlug, setActiveSlug] = useState<SlugType>(getValidatedSlug(initialSlug));

  useEffect(() => {
    setActiveSlug(getValidatedSlug(initialSlug));
  }, [initialSlug]);

  const activeItem = SIDEBAR_ITEMS.find(item => item.slug === activeSlug)!;

  const handleNavigate = (slug: SlugType) => {
    setActiveSlug(slug);
    router.push(`/info/${slug}`);
  };

  // Generic Toast state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // --- WIDGET STATES & LOGIC ---

  // 1. API Whitelist states
  const [apiLabel, setApiLabel] = useState("");
  const [apiIp, setApiIp] = useState("");
  const [isGeneratingApi, setIsGeneratingApi] = useState(false);
  const [generatedKeys, setGeneratedKeys] = useState<{ apiKey: string; apiSecret: string } | null>(null);
  const [whitelistedIps, setWhitelistedIps] = useState([
    { id: 1, label: "Core Node Staging", ip: "13.233.91.4", date: "2026-06-05" },
    { id: 2, label: "Admin Trading Terminal", ip: "192.168.1.105", date: "2026-06-06" }
  ]);

  const handleAddWhitelist = (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiIp.trim()) return;
    setIsGeneratingApi(true);
    setTimeout(() => {
      const mockKey = "ce_live_" + Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
      const mockSecret = Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
      setGeneratedKeys({ apiKey: mockKey, apiSecret: mockSecret });
      setWhitelistedIps(prev => [
        ...prev,
        { id: Date.now(), label: apiLabel || "API Access Key", ip: apiIp, date: new Date().toISOString().split("T")[0] }
      ]);
      setIsGeneratingApi(false);
      setApiLabel("");
      setApiIp("");
      triggerToast("API Credentials Generated successfully!");
    }, 1000);
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    triggerToast(`Copied ${label} to clipboard!`);
  };

  const handleRevokeIp = (id: number) => {
    setWhitelistedIps(prev => prev.filter(item => item.id !== id));
    triggerToast("IP Permission Revoked.");
  };

  // 2. Shadow Replay states
  const [shadowLogs, setShadowLogs] = useState<string[]>([]);
  const [shadowIsPlaying, setShadowIsPlaying] = useState(true);
  const [shadowEventCount, setShadowEventCount] = useState(405820);
  const [shadowSyncProgress, setShadowSyncProgress] = useState(100);

  useEffect(() => {
    if (!shadowIsPlaying || activeSlug !== "shadow-replay") return;
    const interval = setInterval(() => {
      const hex = Array.from({ length: 8 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
      const timestamp = new Date().toLocaleTimeString();
      const count = shadowEventCount + 1;
      setShadowEventCount(count);
      const newLog = `[${timestamp}] Event sequence #${count} | Verified State Checkpoint 0x${hex} | Matching replica matches state [OK]`;
      setShadowLogs(prev => [newLog, ...prev.slice(0, 48)]);
    }, 1500);
    return () => clearInterval(interval);
  }, [shadowIsPlaying, shadowEventCount, activeSlug]);

  const handleForceReplay = () => {
    setShadowSyncProgress(0);
    setShadowLogs(prev => [`[SYSTEM] Starting full ledger audit playback from genesis block...`, ...prev]);
    let progress = 0;
    const iv = setInterval(() => {
      progress += 20;
      setShadowSyncProgress(progress);
      if (progress >= 100) {
        clearInterval(iv);
        setShadowLogs(prev => [
          `[SYSTEM] Replay Audit Complete. Verified ${shadowEventCount + 8500} state sequences. Variance: 0.00000000 GOLD | Integrity: 100% OK`,
          ...prev
        ]);
        triggerToast("Integrity Replay Audit verified 100% OK!");
      }
    }, 400);
  };

  // 3. Disruptor Buffer states
  const [bufferStats, setBufferStats] = useState({
    ingestRate: 1142500,
    ringBufferUsage: 0.02,
    barrierLatency: 0.85,
    gcPause: 0.00
  });

  useEffect(() => {
    if (activeSlug !== "disruptor-buffer") return;
    const interval = setInterval(() => {
      setBufferStats({
        ingestRate: Math.floor(1100000 + Math.random() * 200000),
        ringBufferUsage: parseFloat((0.01 + Math.random() * 0.04).toFixed(4)),
        barrierLatency: parseFloat((0.72 + Math.random() * 0.22).toFixed(2)),
        gcPause: 0.00
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [activeSlug]);

  // 4. FIX Gateway states
  const [fixMsgType, setFixMsgType] = useState("D");
  const [fixSender, setFixSender] = useState("CLIENT_INST_92");
  const [fixSymbol, setFixSymbol] = useState("BTCUSDT");
  const [fixPrice, setFixPrice] = useState("65050.00");
  const [fixQty, setFixQty] = useState("0.5");
  const [rawFixOutput, setRawFixOutput] = useState("");
  const [simulatedFixLogs, setSimulatedFixLogs] = useState<string[]>([]);
  const [isSendingFix, setIsSendingFix] = useState(false);

  const handleGenerateFix = () => {
    const timestamp = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    const randId = Math.floor(100000 + Math.random() * 900000);
    
    let parts = [
      "8=FIX.4.4",
      "9=142",
      `35=${fixMsgType}`,
      `49=${fixSender}`,
      "56=CLOUDEX",
      `34=${randId}`,
      `52=${timestamp}`
    ];

    if (fixMsgType === "D") {
      parts.push(`11=CL_ORD_${randId}`);
      parts.push("21=1");
      parts.push(`55=${fixSymbol}`);
      parts.push("54=1"); // Buy
      parts.push(`38=${fixQty}`);
      parts.push(`44=${fixPrice}`);
      parts.push("40=2"); // Limit
    } else if (fixMsgType === "F") {
      parts.push(`11=CANCEL_${randId}`);
      parts.push(`41=CL_ORD_${randId - 1}`);
      parts.push(`55=${fixSymbol}`);
    } else if (fixMsgType === "A") {
      parts.push("98=0"); // Encryption method
      parts.push("108=30"); // Heartbeat interval
    }

    // Add checksum placeholder
    parts.push("10=212");
    
    const formatted = parts.join("\u0001");
    setRawFixOutput(formatted);
  };

  useEffect(() => {
    handleGenerateFix();
  }, [fixMsgType, fixSender, fixSymbol, fixPrice, fixQty]);

  const handleSendFix = () => {
    if (!rawFixOutput) return;
    setIsSendingFix(true);
    setSimulatedFixLogs(prev => [`[FIX ENGINE] Sending message...`, ...prev]);
    
    setTimeout(() => {
      const randId = Math.floor(100000 + Math.random() * 900000);
      const timestamp = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
      
      let responseMsg = "";
      if (fixMsgType === "A") {
        responseMsg = `8=FIX.4.4\x019=80\x0135=A\x0149=CLOUDEX\x0156=${fixSender}\x0134=${randId}\x0152=${timestamp}\x01108=30\x0110=145\x01`;
        setSimulatedFixLogs(prev => [
          `[LOGON] Logon response received: 35=A Session active.`,
          `<- ${responseMsg.replace(/\x01/g, "|")}`,
          ...prev
        ]);
      } else if (fixMsgType === "D") {
        responseMsg = `8=FIX.4.4\x019=125\x0135=8\x0149=CLOUDEX\x0156=${fixSender}\x0134=${randId}\x0152=${timestamp}\x0137=EXEC_${randId}\x0111=CL_ORD_${randId - 2}\x01150=0\x0139=0\x0155=${fixSymbol}\x0138=${fixQty}\x0144=${fixPrice}\x0110=095\x01`;
        setSimulatedFixLogs(prev => [
          `[EXECUTION] Order Accepted (ExecutionReport 35=8): Price=${fixPrice} Qty=${fixQty} status=New`,
          `<- ${responseMsg.replace(/\x01/g, "|")}`,
          ...prev
        ]);
      } else {
        responseMsg = `8=FIX.4.4\x019=95\x0135=9\x0149=CLOUDEX\x0156=${fixSender}\x0134=${randId}\x0152=${timestamp}\x0137=CE_CANCEL\x0111=CANCEL_${randId}\x0139=4\x01430=1\x0110=088\x01`;
        setSimulatedFixLogs(prev => [
          `[CANCEL] Cancel accepted (OrderCancelOk 35=9)`,
          `<- ${responseMsg.replace(/\x01/g, "|")}`,
          ...prev
        ]);
      }
      setIsSendingFix(false);
      triggerToast("FIX execution report returned!");
    }, 1200);
  };

  // 5. Help Center states
  const [supportEmail, setSupportEmail] = useState("");
  const [supportCategory, setSupportCategory] = useState("Deposit Issue");
  const [supportMsg, setSupportMsg] = useState("");
  const [isSubmittingTicket, setIsSubmittingTicket] = useState(false);
  const [faqSearch, setFaqSearch] = useState("");
  
  const faqs = [
    { q: "How do I deposit funds on CloudExchange?", a: "Go to your Wallet dashboard, choose the asset (e.g. USDT), click Deposit, and copy your specific ledger address or generate a Tatum-sync address." },
    { q: "Is the P2P Escrow mechanism fully automated?", a: "Yes. Once a seller puts assets into escrow, they are cryptographically locked. Our automated invoice metadata verification detects payment screenshots to prevent manual release disputes." },
    { q: "How do I reset my account Passkeys?", a: "Go to Security & Compliance -> Passkey Management, trigger a two-factor validation overlay, then add your new biometric or hardware key." },
    { q: "What is the custom GoldChain L1 native coin?", a: "GoldChain L1 is a custom high-throughput blockchain layer. The native GOLD token facilitates matching commissions and network fuel charges at a fraction of EVM network fees." }
  ];

  const filteredFaqs = faqs.filter(
    f => f.q.toLowerCase().includes(faqSearch.toLowerCase()) || f.a.toLowerCase().includes(faqSearch.toLowerCase())
  );

  const handleSubmitTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supportEmail.trim() || !supportMsg.trim()) return;
    setIsSubmittingTicket(true);
    setTimeout(() => {
      setIsSubmittingTicket(false);
      setSupportEmail("");
      setSupportMsg("");
      triggerToast("Support Ticket submitted successfully!");
      alert(`Ticket CE-${Math.floor(10000 + Math.random() * 90000)} created. We will email you within 5 minutes.`);
    }, 1500);
  };

  // 6. Security Audits states
  const [auditUserId, setAuditUserId] = useState("ce_user_938cb4a8e2");
  const [auditResult, setAuditResult] = useState<string | null>(null);
  const [isVerifyingAudit, setIsVerifyingAudit] = useState(false);

  const handleVerifyAudit = () => {
    if (!auditUserId.trim()) return;
    setIsVerifyingAudit(true);
    setTimeout(() => {
      setIsVerifyingAudit(false);
      const hex = Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
      setAuditResult(`Success! Verified Merkle Leaf inclusion path:
- Node Hash: 0x8a92f0...
- Parent Hash: 0x11abf4...
- Root Hash: 0xdf84ce7293b4a8e28cf112a8e10ff56ce7a90f23bcf856b3e6ad
Status: 100% COLLATERALIZED & CRYPTOGRAPHICALLY SECURED.`);
    }, 1200);
  };

  // 7. Terms of Service states
  const [termsAgreed, setTermsAgreed] = useState(false);
  const [signatureHash, setSignatureHash] = useState<string | null>(null);

  const handleSignTerms = () => {
    if (!termsAgreed) {
      alert("Please check the agreement box first!");
      return;
    }
    const signature = "0x" + Array.from({ length: 130 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
    setSignatureHash(signature);
    triggerToast("Terms Signature generated!");
  };

  // 8. Privacy Policy states
  const [privacySettings, setPrivacySettings] = useState({
    analytics: true,
    telemetry: true,
    cookies: true,
  });

  const handleTogglePrivacy = (key: keyof typeof privacySettings) => {
    setPrivacySettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
    triggerToast(`Privacy updated: ${key} is now ${!privacySettings[key] ? "ENABLED" : "DISABLED"}`);
  };

  const handleClearSessions = () => {
    if (confirm("Are you sure you want to clear your local secure sessions? This will log you out.")) {
      localStorage.clear();
      triggerToast("Local browser state cleared.");
      setTimeout(() => {
        window.location.href = "/";
      }, 500);
    }
  };

  // 9. Risk Warning states
  const [riskAsset, setRiskAsset] = useState("BTC");
  const [riskLeverage, setRiskLeverage] = useState(10);
  const [riskEntryPrice, setRiskEntryPrice] = useState("65000");

  const calcLiquidation = () => {
    const entry = parseFloat(riskEntryPrice) || 0;
    if (entry <= 0) return { price: 0, changePercent: 0 };
    const liqPrice = entry * (1 - (0.9 / riskLeverage));
    const dropPercent = ((entry - liqPrice) / entry) * 100;
    return {
      price: parseFloat(liqPrice.toFixed(2)),
      changePercent: parseFloat(dropPercent.toFixed(2))
    };
  };

  const liqInfo = calcLiquidation();

  // 10. Cookie preferences
  const [cookieConsent, setCookieConsent] = useState({
    essential: true,
    functional: true,
    analytics: false,
    marketing: false
  });

  const handleSaveCookies = () => {
    triggerToast("Cookie Preferences saved successfully!");
  };

  return (
    <div style={{ minHeight: "100vh", position: "relative", color: "var(--text-primary)", display: "flex", flexDirection: "column" }}>
      
      <SpaceBackground />

      <Header activeTab="coins" />

      <main style={{ flex: 1, padding: "40px 0 64px", position: "relative", zIndex: 5 }}>
        <div className="container-xl">
          
          <div className="info-main-grid" style={{
            display: "grid",
            gridTemplateColumns: "280px 1fr",
            gap: 32,
            background: "rgba(10, 17, 40, 0.45)",
            backdropFilter: "blur(20px)",
            border: "1px solid var(--border)",
            borderRadius: 16,
            padding: 32,
          }}>
            
            {/* SIDEBAR NAVIGATION (Desktop) */}
            <aside className="info-sidebar" style={{
              display: "flex",
              flexDirection: "column",
              gap: 24,
              borderRight: "1px solid var(--border)",
              paddingRight: 24
            }}>
              <div>
                <h5 style={{ textTransform: "uppercase", fontSize: 11, letterSpacing: 1.5, color: "var(--yellow)", fontWeight: 700, marginBottom: 16 }}>
                  Technical Layers
                </h5>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {SIDEBAR_ITEMS.filter(i => i.category === "Technical").map(item => {
                    const Icon = item.icon;
                    const isActive = activeSlug === item.slug;
                    return (
                      <button
                        key={item.slug}
                        onClick={() => handleNavigate(item.slug)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          width: "100%",
                          textAlign: "left",
                          padding: "10px 14px",
                          borderRadius: 8,
                          background: isActive ? "rgba(245, 166, 35, 0.08)" : "transparent",
                          border: isActive ? "1px solid rgba(245, 166, 35, 0.3)" : "1px solid transparent",
                          color: isActive ? "var(--yellow)" : "var(--text-secondary)",
                          fontSize: 13,
                          fontWeight: isActive ? 700 : 500,
                          cursor: "pointer",
                          transition: "all 0.2s"
                        }}
                        onMouseEnter={e => {
                          if (!isActive) {
                            e.currentTarget.style.background = "var(--bg-hover)";
                            e.currentTarget.style.color = "var(--text-primary)";
                          }
                        }}
                        onMouseLeave={e => {
                          if (!isActive) {
                            e.currentTarget.style.background = "transparent";
                            e.currentTarget.style.color = "var(--text-secondary)";
                          }
                        }}
                      >
                        <Icon size={16} />
                        {item.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <h5 style={{ textTransform: "uppercase", fontSize: 11, letterSpacing: 1.5, color: "var(--yellow)", fontWeight: 700, marginBottom: 16 }}>
                  Legal & Support
                </h5>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {SIDEBAR_ITEMS.filter(i => i.category === "Legal & Support").map(item => {
                    const Icon = item.icon;
                    const isActive = activeSlug === item.slug;
                    return (
                      <button
                        key={item.slug}
                        onClick={() => handleNavigate(item.slug)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          width: "100%",
                          textAlign: "left",
                          padding: "10px 14px",
                          borderRadius: 8,
                          background: isActive ? "rgba(245, 166, 35, 0.08)" : "transparent",
                          border: isActive ? "1px solid rgba(245, 166, 35, 0.3)" : "1px solid transparent",
                          color: isActive ? "var(--yellow)" : "var(--text-secondary)",
                          fontSize: 13,
                          fontWeight: isActive ? 700 : 500,
                          cursor: "pointer",
                          transition: "all 0.2s"
                        }}
                        onMouseEnter={e => {
                          if (!isActive) {
                            e.currentTarget.style.background = "var(--bg-hover)";
                            e.currentTarget.style.color = "var(--text-primary)";
                          }
                        }}
                        onMouseLeave={e => {
                          if (!isActive) {
                            e.currentTarget.style.background = "transparent";
                            e.currentTarget.style.color = "var(--text-secondary)";
                          }
                        }}
                      >
                        <Icon size={16} />
                        {item.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            </aside>

            {/* MAIN CONTENT PANE */}
            <article className="info-content-pane" style={{ minWidth: 0 }}>
              
              {/* MOBILE DROPDOWN SELECTOR */}
              <div className="mobile-nav-selector" style={{ marginBottom: 24, display: "none" }}>
                <label style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 8, display: "block" }}>Select Information Section</label>
                <select 
                  value={activeSlug} 
                  onChange={(e) => handleNavigate(e.target.value as SlugType)}
                  style={{
                    width: "100%",
                    background: "var(--bg-hover)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    padding: 12,
                    color: "var(--text-primary)",
                    fontSize: 14,
                    fontWeight: 600,
                    outline: "none"
                  }}
                >
                  <optgroup label="Technical Layers">
                    {SIDEBAR_ITEMS.filter(i => i.category === "Technical").map(item => (
                      <option key={item.slug} value={item.slug}>{item.name}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Legal & Support">
                    {SIDEBAR_ITEMS.filter(i => i.category === "Legal & Support").map(item => (
                      <option key={item.slug} value={item.slug}>{item.name}</option>
                    ))}
                  </optgroup>
                </select>
              </div>

              {/* SECTION HEADER */}
              <div style={{ borderBottom: "1px solid var(--border)", paddingBottom: 20, marginBottom: 24 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 10 }}>
                  <div style={{
                    width: 44,
                    height: 44,
                    borderRadius: 10,
                    background: "rgba(245, 166, 35, 0.1)",
                    border: "1px solid rgba(245, 166, 35, 0.2)",
                    color: "var(--yellow)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}>
                    {React.createElement(activeItem.icon, { size: 22 })}
                  </div>
                  <div>
                    <h1 style={{ fontSize: 24, fontWeight: 800, color: "#fff", margin: 0 }}>
                      {activeItem.name}
                    </h1>
                    <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                      Security Infrastructure & Info Portal
                    </span>
                  </div>
                </div>
              </div>

              {/* RENDER DETAILED PAGE TEXT & CORRESPONDING DYNAMIC WIDGETS */}
              
              {/* API WHITELIST PAGE */}
              {activeSlug === "api-whitelist" && (
                <div>
                  <p style={{ lineHeight: 1.7, color: "var(--text-secondary)", marginBottom: 24 }}>
                    Secure your custom trading terminal sessions using IP Whitelisting. When enabled, matching orders and withdraw requests using generated API credentials are only accepted from whitelisted IP addresses. This prevents unauthorized execution even if private credentials are leaked.
                  </p>

                  <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: "#fff" }}>
                    Configure New API Key & Whitelisted IP
                  </h3>

                  <form onSubmit={handleAddWhitelist} style={{
                    background: "rgba(255, 255, 255, 0.02)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    padding: 20,
                    marginBottom: 32
                  }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }} className="form-grid-2">
                      <div>
                        <label style={{ display: "block", fontSize: 12, color: "var(--text-secondary)", marginBottom: 6 }}>API Key Label</label>
                        <input 
                          type="text" 
                          placeholder="e.g. My Arbitrage Bot"
                          value={apiLabel}
                          onChange={(e) => setApiLabel(e.target.value)}
                          style={{
                            width: "100%",
                            background: "rgba(0,0,0,0.2)",
                            border: "1px solid var(--border)",
                            borderRadius: 6,
                            padding: 10,
                            color: "#fff",
                            fontSize: 13,
                            outline: "none"
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: 12, color: "var(--text-secondary)", marginBottom: 6 }}>IP Address (IPv4 or CIDR)</label>
                        <input 
                          type="text" 
                          required
                          placeholder="e.g. 192.168.1.1"
                          value={apiIp}
                          onChange={(e) => setApiIp(e.target.value)}
                          style={{
                            width: "100%",
                            background: "rgba(0,0,0,0.2)",
                            border: "1px solid var(--border)",
                            borderRadius: 6,
                            padding: 10,
                            color: "#fff",
                            fontSize: 13,
                            outline: "none"
                          }}
                        />
                      </div>
                    </div>

                    <button 
                      type="submit" 
                      disabled={isGeneratingApi}
                      className="btn-yellow"
                      style={{
                        padding: "10px 20px",
                        fontSize: 13,
                        fontWeight: 700,
                        border: "none",
                        borderRadius: 6,
                        cursor: "pointer",
                        width: "100%"
                      }}
                    >
                      {isGeneratingApi ? "Generating secure credentials..." : "Authorize IP & Generate API Key"}
                    </button>
                  </form>

                  {generatedKeys && (
                    <div style={{
                      background: "rgba(255, 23, 68, 0.05)",
                      border: "1px solid rgba(255, 23, 68, 0.2)",
                      borderRadius: 12,
                      padding: 20,
                      marginBottom: 32
                    }}>
                      <h4 style={{ color: "var(--red)", fontSize: 14, fontWeight: 700, marginTop: 0, marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
                        <AlertTriangle size={16} /> Important Security Notice
                      </h4>
                      <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: "0 0 16px" }}>
                        Copy the Secret Key now. It will not be shown again for security reasons.
                      </p>

                      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        <div>
                          <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>API Key (Client Ident)</span>
                          <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                            <input readOnly value={generatedKeys.apiKey} style={{ flex: 1, background: "rgba(0,0,0,0.3)", border: "1px solid var(--border)", padding: "8px 12px", borderRadius: 6, color: "#fff", fontSize: 12 }} />
                            <button type="button" onClick={() => handleCopy(generatedKeys.apiKey, "API Key")} style={{ padding: "8px 14px", background: "var(--bg-hover)", border: "1px solid var(--border)", color: "#fff", cursor: "pointer", borderRadius: 6 }}><Copy size={14} /></button>
                          </div>
                        </div>
                        <div>
                          <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>Secret Key (HMAC Signature Salt)</span>
                          <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                            <input readOnly value={generatedKeys.apiSecret} style={{ flex: 1, background: "rgba(0,0,0,0.3)", border: "1px solid var(--border)", padding: "8px 12px", borderRadius: 6, color: "#fff", fontSize: 12 }} />
                            <button type="button" onClick={() => handleCopy(generatedKeys.apiSecret, "Secret Key")} style={{ padding: "8px 14px", background: "var(--bg-hover)", border: "1px solid var(--border)", color: "#fff", cursor: "pointer", borderRadius: 6 }}><Copy size={14} /></button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: "#fff" }}>
                    Active Authorized IPs
                  </h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {whitelistedIps.map(item => (
                      <div key={item.id} style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        background: "rgba(255, 255, 255, 0.01)",
                        border: "1px solid var(--border)",
                        padding: "12px 18px",
                        borderRadius: 8,
                        gap: 16
                      }}>
                        <div style={{ flex: 1 }}>
                          <h4 style={{ margin: "0 0 4px", fontSize: 14, color: "#fff" }}>{item.label}</h4>
                          <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>Authorized on {item.date}</span>
                        </div>
                        <code style={{ fontSize: 13, background: "rgba(0,0,0,0.2)", padding: "4px 8px", borderRadius: 4, color: "var(--yellow)" }}>
                          {item.ip}
                        </code>
                        <button 
                          onClick={() => handleRevokeIp(item.id)}
                          style={{
                            padding: "6px 12px",
                            background: "transparent",
                            border: "1px solid rgba(255, 23, 68, 0.3)",
                            color: "var(--red)",
                            fontSize: 11,
                            fontWeight: 600,
                            borderRadius: 6,
                            cursor: "pointer"
                          }}
                        >
                          Revoke IP
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SHADOW REPLAY PAGE */}
              {activeSlug === "shadow-replay" && (
                <div>
                  <p style={{ lineHeight: 1.7, color: "var(--text-secondary)", marginBottom: 24 }}>
                    Shadow Replay provides asynchronous state integrity auditing. Every single order intake, matching trade execution, and balance ledger update is replicated to an isolated parallel computing node. A continuous validation agent compares SHA-256 hash proofs of the state tree to guarantee zero memory corruption or unauthorized balance manipulations.
                  </p>

                  <div style={{
                    background: "#080c18",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    padding: 24,
                    fontFamily: "monospace",
                    marginBottom: 24
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)", paddingBottom: 12, marginBottom: 16 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ width: 10, height: 10, borderRadius: "50%", background: shadowIsPlaying ? "var(--green)" : "#e2e8f0", boxShadow: shadowIsPlaying ? "0 0 10px var(--green)" : "none" }} />
                        <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>CLOUD_CORE_INTEGRITY_SHADOW</span>
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button 
                          onClick={() => setShadowIsPlaying(!shadowIsPlaying)}
                          style={{
                            background: "var(--bg-hover)",
                            border: "1px solid var(--border)",
                            color: "#fff",
                            padding: "4px 10px",
                            borderRadius: 4,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            fontSize: 11
                          }}
                        >
                          {shadowIsPlaying ? <Pause size={12} /> : <Play size={12} />}
                          {shadowIsPlaying ? "Pause Log" : "Resume Log"}
                        </button>
                        <button 
                          onClick={handleForceReplay}
                          style={{
                            background: "var(--yellow)",
                            color: "#000",
                            fontWeight: 700,
                            border: "none",
                            padding: "4px 10px",
                            borderRadius: 4,
                            cursor: "pointer",
                            fontSize: 11,
                            display: "flex",
                            alignItems: "center",
                            gap: 6
                          }}
                        >
                          <RefreshCcw size={12} />
                          Force Audit Replay
                        </button>
                      </div>
                    </div>

                    {shadowSyncProgress < 100 && (
                      <div style={{ marginBottom: 16 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-secondary)", marginBottom: 4 }}>
                          <span>Auditing memory state...</span>
                          <span>{shadowSyncProgress}%</span>
                        </div>
                        <div style={{ width: "100%", height: 6, background: "rgba(255,255,255,0.05)", borderRadius: 3, overflow: "hidden" }}>
                          <div style={{ width: `${shadowSyncProgress}%`, height: "100%", background: "var(--yellow)", transition: "width 0.2s" }} />
                        </div>
                      </div>
                    )}

                    <div style={{
                      height: 200,
                      overflowY: "auto",
                      display: "flex",
                      flexDirection: "column-reverse",
                      gap: 6,
                      fontSize: 11,
                      color: "rgba(255,255,255,0.7)",
                      background: "rgba(0,0,0,0.3)",
                      padding: 12,
                      borderRadius: 6,
                      border: "1px solid rgba(255,255,255,0.03)"
                    }}>
                      {shadowLogs.length === 0 ? (
                        <div style={{ color: "var(--text-secondary)", textAlign: "center", padding: "40px 0" }}>
                          Terminal active. Logs will appear here in real-time.
                        </div>
                      ) : (
                        shadowLogs.map((log, idx) => (
                          <div key={idx} style={{ 
                            wordBreak: "break-all",
                            color: log.includes("OK") ? "var(--green)" : log.includes("SYSTEM") ? "var(--yellow)" : "inherit"
                          }}>
                            {log}
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }} className="form-grid-2">
                    <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)", borderRadius: 8, padding: 16, textAlign: "center" }}>
                      <span style={{ fontSize: 11, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>Current Core Sequence</span>
                      <strong style={{ fontSize: 18, color: "#fff" }}>{shadowEventCount.toLocaleString()}</strong>
                    </div>
                    <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)", borderRadius: 8, padding: 16, textAlign: "center" }}>
                      <span style={{ fontSize: 11, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>Ledger Match State</span>
                      <strong style={{ fontSize: 18, color: "var(--green)" }}>Synced (100%)</strong>
                    </div>
                    <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)", borderRadius: 8, padding: 16, textAlign: "center" }}>
                      <span style={{ fontSize: 11, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>Active Shadow Nodes</span>
                      <strong style={{ fontSize: 18, color: "#fff" }}>3 Nodes</strong>
                    </div>
                  </div>
                </div>
              )}

              {/* DISRUPTOR BUFFER PAGE */}
              {activeSlug === "disruptor-buffer" && (
                <div>
                  <p style={{ lineHeight: 1.7, color: "var(--text-secondary)", marginBottom: 24 }}>
                    CloudExchange matches orders using an off-heap LMAX-Disruptor ring buffer framework. Orders bypass the operating system socket scheduler and Garbage Collection pauses entirely. By maintaining sequence tracking barriers and executing thread-safe lock-free transactions, ingestion latency remains under 1 microsecond.
                  </p>

                  <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: "#fff" }}>
                    Ingestion In-Memory Telemetry Monitor
                  </h3>

                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 16,
                    marginBottom: 24
                  }} className="form-grid-2">
                    <div style={{ background: "rgba(255,255,255,0.01)", border: "1px solid var(--border)", padding: 20, borderRadius: 10 }}>
                      <span style={{ fontSize: 12, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>Matching Core Ingestion Rate</span>
                      <strong style={{ fontSize: 22, color: "#fff", display: "block", marginBottom: 8 }}>
                        {bufferStats.ingestRate.toLocaleString()} <span style={{ fontSize: 13, color: "var(--text-secondary)", fontWeight: 500 }}>msg/sec</span>
                      </strong>
                      <div style={{ width: "100%", height: 4, background: "rgba(255,255,255,0.05)", borderRadius: 2, overflow: "hidden" }}>
                        <div style={{ width: `${(bufferStats.ingestRate / 1500000) * 100}%`, height: "100%", background: "var(--cyan)", transition: "width 0.8s" }} />
                      </div>
                    </div>

                    <div style={{ background: "rgba(255,255,255,0.01)", border: "1px solid var(--border)", padding: 20, borderRadius: 10 }}>
                      <span style={{ fontSize: 12, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>Sequence Barrier Latency</span>
                      <strong style={{ fontSize: 22, color: "var(--yellow)", display: "block", marginBottom: 8 }}>
                        {bufferStats.barrierLatency} <span style={{ fontSize: 13, color: "var(--text-secondary)", fontWeight: 500 }}>μs</span>
                      </strong>
                      <div style={{ width: "100%", height: 4, background: "rgba(255,255,255,0.05)", borderRadius: 2, overflow: "hidden" }}>
                        <div style={{ width: `${(bufferStats.barrierLatency / 1.5) * 100}%`, height: "100%", background: "var(--yellow)", transition: "width 0.8s" }} />
                      </div>
                    </div>

                    <div style={{ background: "rgba(255,255,255,0.01)", border: "1px solid var(--border)", padding: 20, borderRadius: 10 }}>
                      <span style={{ fontSize: 12, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>GC Pause Threshold</span>
                      <strong style={{ fontSize: 22, color: "var(--green)", display: "block", marginBottom: 8 }}>
                        {bufferStats.gcPause.toFixed(2)} <span style={{ fontSize: 13, color: "var(--text-secondary)", fontWeight: 500 }}>ms</span>
                      </strong>
                      <div style={{ width: "100%", height: 4, background: "rgba(255,255,255,0.05)", borderRadius: 2, overflow: "hidden" }}>
                        <div style={{ width: `0%`, height: "100%", background: "var(--green)" }} />
                      </div>
                    </div>

                    <div style={{ background: "rgba(255,255,255,0.01)", border: "1px solid var(--border)", padding: 20, borderRadius: 10 }}>
                      <span style={{ fontSize: 12, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>Ring Buffer Allocation Capacity</span>
                      <strong style={{ fontSize: 22, color: "#fff", display: "block", marginBottom: 8 }}>
                        {bufferStats.ringBufferUsage.toFixed(3)}%
                      </strong>
                      <div style={{ width: "100%", height: 4, background: "rgba(255,255,255,0.05)", borderRadius: 2, overflow: "hidden" }}>
                        <div style={{ width: `${(bufferStats.ringBufferUsage / 0.1) * 100}%`, height: "100%", background: "var(--red)", transition: "width 0.8s" }} />
                      </div>
                    </div>
                  </div>

                  <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: "#fff" }}>
                    Ring Buffer Slot Map (Lock-Free Thread Dispatcher)
                  </h3>
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(16, 1fr)",
                    gap: 6,
                    background: "rgba(0,0,0,0.2)",
                    padding: 16,
                    borderRadius: 10,
                    border: "1px solid var(--border)"
                  }}>
                    {Array.from({ length: 32 }).map((_, idx) => {
                      const isProcessed = idx < Math.floor(20 + Math.random() * 8);
                      return (
                        <div 
                          key={idx} 
                          style={{
                            aspectRatio: "1",
                            borderRadius: 4,
                            background: isProcessed ? "rgba(0, 230, 118, 0.2)" : "rgba(255, 23, 68, 0.2)",
                            border: isProcessed ? "1px solid rgba(0, 230, 118, 0.4)" : "1px solid rgba(255, 23, 68, 0.4)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 8,
                            fontWeight: 700,
                            color: isProcessed ? "var(--green)" : "var(--red)"
                          }}
                        >
                          {idx}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* FIX GATEWAY PAGE */}
              {activeSlug === "fix-gateway" && (
                <div>
                  <p style={{ lineHeight: 1.7, color: "var(--text-secondary)", marginBottom: 24 }}>
                    Our FIX (Financial Information eXchange) gateway provides institutional low-latency access to the matching engine. It allows direct trading via the FIX 4.4 protocol. Establish high-speed TCP sockets using standard encryption protocols.
                  </p>

                  <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: "#fff" }}>
                    Interactive FIX Packet Builder & Gateway Sandbox
                  </h3>

                  <div style={{
                    background: "rgba(255,255,255,0.01)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    padding: 20,
                    marginBottom: 24
                  }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }} className="form-grid-2">
                      <div>
                        <label style={{ display: "block", fontSize: 12, color: "var(--text-secondary)", marginBottom: 6 }}>Message Type (Tag 35)</label>
                        <select 
                          value={fixMsgType} 
                          onChange={(e) => setFixMsgType(e.target.value)}
                          style={{
                            width: "100%",
                            background: "rgba(0,0,0,0.2)",
                            border: "1px solid var(--border)",
                            borderRadius: 6,
                            padding: 10,
                            color: "#fff",
                            outline: "none"
                          }}
                        >
                          <option value="A">Logon (35=A)</option>
                          <option value="D">New Order Single (35=D)</option>
                          <option value="F">Order Cancel Request (35=F)</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ display: "block", fontSize: 12, color: "var(--text-secondary)", marginBottom: 6 }}>Sender Client CompID (Tag 49)</label>
                        <input 
                          type="text" 
                          value={fixSender}
                          onChange={(e) => setFixSender(e.target.value)}
                          style={{
                            width: "100%",
                            background: "rgba(0,0,0,0.2)",
                            border: "1px solid var(--border)",
                            borderRadius: 6,
                            padding: 10,
                            color: "#fff",
                            outline: "none"
                          }}
                        />
                      </div>
                    </div>

                    {fixMsgType === "D" && (
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 16 }} className="form-grid-2">
                        <div>
                          <label style={{ display: "block", fontSize: 11, color: "var(--text-secondary)", marginBottom: 6 }}>Symbol (Tag 55)</label>
                          <input type="text" value={fixSymbol} onChange={(e) => setFixSymbol(e.target.value)} style={{ width: "100%", background: "rgba(0,0,0,0.2)", border: "1px solid var(--border)", borderRadius: 6, padding: 8, color: "#fff", fontSize: 12 }} />
                        </div>
                        <div>
                          <label style={{ display: "block", fontSize: 11, color: "var(--text-secondary)", marginBottom: 6 }}>Price (Tag 44)</label>
                          <input type="text" value={fixPrice} onChange={(e) => setFixPrice(e.target.value)} style={{ width: "100%", background: "rgba(0,0,0,0.2)", border: "1px solid var(--border)", borderRadius: 6, padding: 8, color: "#fff", fontSize: 12 }} />
                        </div>
                        <div>
                          <label style={{ display: "block", fontSize: 11, color: "var(--text-secondary)", marginBottom: 6 }}>Qty (Tag 38)</label>
                          <input type="text" value={fixQty} onChange={(e) => setFixQty(e.target.value)} style={{ width: "100%", background: "rgba(0,0,0,0.2)", border: "1px solid var(--border)", borderRadius: 6, padding: 8, color: "#fff", fontSize: 12 }} />
                        </div>
                      </div>
                    )}

                    <div style={{ marginBottom: 16 }}>
                      <span style={{ display: "block", fontSize: 12, color: "var(--text-secondary)", marginBottom: 6 }}>Generated Raw FIX Packet (ASCII Tag-Value)</span>
                      <div style={{
                        background: "rgba(0,0,0,0.3)",
                        border: "1px solid var(--border)",
                        padding: 12,
                        borderRadius: 6,
                        fontFamily: "monospace",
                        fontSize: 12,
                        color: "var(--yellow)",
                        wordBreak: "break-all"
                      }}>
                        {rawFixOutput.replace(/\u0001/g, "|")}
                      </div>
                    </div>

                    <button 
                      type="button"
                      disabled={isSendingFix}
                      onClick={handleSendFix}
                      className="btn-yellow"
                      style={{
                        padding: "10px 20px",
                        fontSize: 13,
                        fontWeight: 700,
                        border: "none",
                        borderRadius: 6,
                        cursor: "pointer",
                        width: "100%"
                      }}
                    >
                      {isSendingFix ? "Awaiting ExecutionReport..." : "Send FIX Message to Sandbox Engine"}
                    </button>
                  </div>

                  <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, color: "#fff" }}>
                    Sandbox Socket Console Logs
                  </h3>
                  <div style={{
                    height: 140,
                    overflowY: "auto",
                    background: "#05070e",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    padding: 12,
                    fontFamily: "monospace",
                    fontSize: 11,
                    display: "flex",
                    flexDirection: "column",
                    gap: 6
                  }}>
                    {simulatedFixLogs.length === 0 ? (
                      <div style={{ color: "var(--text-secondary)", textAlign: "center", padding: "30px 0" }}>
                        Console ready. Click send above to inspect bidirectional traffic.
                      </div>
                    ) : (
                      simulatedFixLogs.map((log, idx) => (
                        <div key={idx} style={{ 
                          wordBreak: "break-all",
                          color: log.startsWith("<-") ? "var(--cyan)" : log.startsWith("[EXECUTION") ? "var(--green)" : "#fff" 
                        }}>
                          {log}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* HELP CENTER PAGE */}
              {activeSlug === "help-center" && (
                <div>
                  <p style={{ lineHeight: 1.7, color: "var(--text-secondary)", marginBottom: 24 }}>
                    Welcome to the Help Center. Type your query below to search our instant resolution database, or submit a priority support ticket directly to our technical and escrow managers.
                  </p>

                  <div style={{ marginBottom: 24 }}>
                    <input 
                      type="text" 
                      placeholder="🔍 Search articles (e.g. escrow, passkeys, GOLD...)"
                      value={faqSearch}
                      onChange={(e) => setFaqSearch(e.target.value)}
                      style={{
                        width: "100%",
                        background: "rgba(255,255,255,0.02)",
                        border: "1px solid var(--border)",
                        borderRadius: 10,
                        padding: "12px 18px",
                        color: "#fff",
                        fontSize: 14,
                        outline: "none"
                      }}
                    />
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 32 }}>
                    {filteredFaqs.map((faq, idx) => (
                      <div key={idx} style={{
                        background: "rgba(255,255,255,0.01)",
                        border: "1px solid var(--border)",
                        borderRadius: 8,
                        padding: 16
                      }}>
                        <h4 style={{ margin: "0 0 8px", color: "#fff", fontSize: 14, fontWeight: 700 }}>{faq.q}</h4>
                        <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>{faq.a}</p>
                      </div>
                    ))}
                    {filteredFaqs.length === 0 && (
                      <div style={{ textAlign: "center", color: "var(--text-secondary)", padding: 20 }}>
                        No articles match your query. Try searching for "escrow" or create a ticket below.
                      </div>
                    )}
                  </div>

                  <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: "#fff" }}>
                    Submit Technical Priority Ticket
                  </h3>

                  <form onSubmit={handleSubmitTicket} style={{
                    background: "rgba(255,255,255,0.01)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    padding: 24
                  }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }} className="form-grid-2">
                      <div>
                        <label style={{ display: "block", fontSize: 12, color: "var(--text-secondary)", marginBottom: 6 }}>Your Email Address</label>
                        <input 
                          type="email" 
                          required
                          placeholder="e.g. trader@cloudexchange.in"
                          value={supportEmail}
                          onChange={(e) => setSupportEmail(e.target.value)}
                          style={{ width: "100%", background: "rgba(0,0,0,0.2)", border: "1px solid var(--border)", borderRadius: 6, padding: 10, color: "#fff", outline: "none" }}
                        />
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: 12, color: "var(--text-secondary)", marginBottom: 6 }}>Inquiry Category</label>
                        <select 
                          value={supportCategory}
                          onChange={(e) => setSupportCategory(e.target.value)}
                          style={{ width: "100%", background: "rgba(0,0,0,0.2)", border: "1px solid var(--border)", borderRadius: 6, padding: 10, color: "#fff", outline: "none" }}
                        >
                          <option value="Deposit Issue">Deposit / Ledger Issue</option>
                          <option value="KYC Verification">KYC & Selfie Liveness</option>
                          <option value="P2P Escrow Dispute">P2P Escrow Dispute</option>
                          <option value="Technical API">Technical API & FIX Gateway</option>
                        </select>
                      </div>
                    </div>

                    <div style={{ marginBottom: 16 }}>
                      <label style={{ display: "block", fontSize: 12, color: "var(--text-secondary)", marginBottom: 6 }}>Message / Dispute Details</label>
                      <textarea 
                        required
                        rows={4}
                        placeholder="Explain the issue in detail. Add transaction hashes if applicable."
                        value={supportMsg}
                        onChange={(e) => setSupportMsg(e.target.value)}
                        style={{ width: "100%", background: "rgba(0,0,0,0.2)", border: "1px solid var(--border)", borderRadius: 6, padding: 10, color: "#fff", outline: "none", resize: "none", fontSize: 13 }}
                      />
                    </div>

                    <button 
                      type="submit" 
                      disabled={isSubmittingTicket}
                      className="btn-yellow"
                      style={{
                        padding: "12px 24px",
                        fontSize: 13,
                        fontWeight: 700,
                        border: "none",
                        borderRadius: 6,
                        cursor: "pointer",
                        width: "100%"
                      }}
                    >
                      {isSubmittingTicket ? "Submitting Priority Ticket..." : "Create Support Ticket"}
                    </button>
                  </form>
                </div>
              )}

              {/* SECURITY AUDITS PAGE */}
              {activeSlug === "security-audits" && (
                <div>
                  <p style={{ lineHeight: 1.7, color: "var(--text-secondary)", marginBottom: 24 }}>
                    Security is CloudExchange's absolute priority. We operate under daily Merkle Tree Proof-of-Reserves audits to prove 1:1 asset collateralization in institutional custody vaults. Use the interactive explorer below to cryptographically verify your account inclusion.
                  </p>

                  <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: "#fff" }}>
                    Custodian Collateral Telemetry
                  </h3>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 32 }} className="form-grid-2">
                    <div style={{ background: "rgba(255,255,255,0.01)", border: "1px solid var(--border)", padding: 16, borderRadius: 8, textAlign: "center" }}>
                      <strong style={{ display: "block", fontSize: 20, color: "#fff", marginBottom: 4 }}>105.42%</strong>
                      <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>BTC Reserves Ratio</span>
                    </div>
                    <div style={{ background: "rgba(255,255,255,0.01)", border: "1px solid var(--border)", padding: 16, borderRadius: 8, textAlign: "center" }}>
                      <strong style={{ display: "block", fontSize: 20, color: "#fff", marginBottom: 4 }}>111.08%</strong>
                      <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>ETH Reserves Ratio</span>
                    </div>
                    <div style={{ background: "rgba(255,255,255,0.01)", border: "1px solid var(--border)", padding: 16, borderRadius: 8, textAlign: "center" }}>
                      <strong style={{ display: "block", fontSize: 20, color: "#fff", marginBottom: 4 }}>102.15%</strong>
                      <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>USDT Reserves Ratio</span>
                    </div>
                  </div>

                  <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: "#fff" }}>
                    Verify Ledger Inclusion Path
                  </h3>

                  <div style={{
                    background: "rgba(255,255,255,0.01)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    padding: 20
                  }}>
                    <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
                      <input 
                        type="text" 
                        placeholder="Enter Account Audit ID Hash"
                        value={auditUserId}
                        onChange={(e) => setAuditUserId(e.target.value)}
                        style={{
                          flex: 1,
                          background: "rgba(0,0,0,0.2)",
                          border: "1px solid var(--border)",
                          borderRadius: 6,
                          padding: "10px 14px",
                          color: "#fff",
                          fontSize: 13,
                          outline: "none"
                        }}
                      />
                      <button 
                        onClick={handleVerifyAudit}
                        disabled={isVerifyingAudit}
                        className="btn-yellow"
                        style={{
                          padding: "0 20px",
                          borderRadius: 6,
                          fontWeight: 700,
                          border: "none",
                          fontSize: 13,
                          cursor: "pointer"
                        }}
                      >
                        {isVerifyingAudit ? "Computing Tree..." : "Verify Proof"}
                      </button>
                    </div>

                    {auditResult && (
                      <pre style={{
                        background: "#05070e",
                        border: "1px solid var(--border)",
                        padding: 16,
                        borderRadius: 8,
                        color: "var(--green)",
                        fontFamily: "monospace",
                        fontSize: 11,
                        whiteSpace: "pre-wrap",
                        margin: 0
                      }}>
                        {auditResult}
                      </pre>
                    )}
                  </div>
                </div>
              )}

              {/* TERMS OF SERVICE PAGE */}
              {activeSlug === "terms-of-service" && (
                <div>
                  <p style={{ lineHeight: 1.7, color: "var(--text-secondary)", marginBottom: 24 }}>
                    These Terms of Service govern your access to the CloudExchange digital asset trading ecosystem. Please read the document thoroughly. By establishing an account, you consent to standard trading conditions and P2P arbitration protocols.
                  </p>

                  <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 32 }}>
                    <details style={{ background: "rgba(255,255,255,0.01)", border: "1px solid var(--border)", borderRadius: 8, padding: 14 }}>
                      <summary style={{ fontWeight: 700, color: "#fff", cursor: "pointer", outline: "none" }}>1. Account Registration & Security</summary>
                      <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 10, lineHeight: 1.6, margin: 0 }}>
                        Users agree to register using actual legal identities. Dynamic selfie liveness checks are utilized to verify registration integrity. You are solely responsible for securing your FIDO2 Passkeys and local account sessions.
                      </p>
                    </details>
                    <details style={{ background: "rgba(255, 255, 255, 0.01)", border: "1px solid var(--border)", borderRadius: 8, padding: 14 }}>
                      <summary style={{ fontWeight: 700, color: "#fff", cursor: "pointer", outline: "none" }}>2. Automated P2P Escrow Arbitration</summary>
                      <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 10, lineHeight: 1.6, margin: 0 }}>
                        All peer-to-peer fiat currency purchases rely on automated smart escrow. In the event of a payment dispute, matching verification occurs using uploaded document metadata logs. Decision rules are final.
                      </p>
                    </details>
                    <details style={{ background: "rgba(255, 255, 255, 0.01)", border: "1px solid var(--border)", borderRadius: 8, padding: 14 }}>
                      <summary style={{ fontWeight: 700, color: "#fff", cursor: "pointer", outline: "none" }}>3. Prohibited Exploitative Activities</summary>
                      <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 10, lineHeight: 1.6, margin: 0 }}>
                        API users must not exploit ring buffer latencies, perform wash trading, or manipulate prices across markets. Infractions result in immediate API key revocation.
                      </p>
                    </details>
                  </div>

                  <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: "#fff" }}>
                    Sign Agreement Hash Ledger
                  </h3>

                  <div style={{
                    background: "rgba(255,255,255,0.01)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    padding: 20
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                      <input 
                        type="checkbox" 
                        id="terms_agree_cb"
                        checked={termsAgreed}
                        onChange={(e) => setTermsAgreed(e.target.checked)}
                        style={{ width: 16, height: 16, cursor: "pointer" }}
                      />
                      <label htmlFor="terms_agree_cb" style={{ fontSize: 13, color: "var(--text-secondary)", cursor: "pointer" }}>
                        I agree to terms hash: <code style={{ color: "var(--yellow)" }}>0x7a83dcb899c922a105aefb20c9213f019a</code>
                      </label>
                    </div>

                    <button 
                      onClick={handleSignTerms}
                      className="btn-yellow"
                      style={{
                        padding: "10px 20px",
                        borderRadius: 6,
                        border: "none",
                        fontWeight: 700,
                        fontSize: 13,
                        cursor: "pointer",
                        width: "100%",
                        marginBottom: 16
                      }}
                    >
                      Sign Cryptographic Agreement Hash
                    </button>

                    {signatureHash && (
                      <div>
                        <span style={{ display: "block", fontSize: 11, color: "var(--text-secondary)", marginBottom: 6 }}>Your Local Browser Session Signature Hash</span>
                        <div style={{
                          background: "#05070e",
                          border: "1px solid var(--border)",
                          padding: 12,
                          borderRadius: 6,
                          fontFamily: "monospace",
                          fontSize: 11,
                          color: "var(--green)",
                          wordBreak: "break-all"
                        }}>
                          {signatureHash}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* PRIVACY POLICY PAGE */}
              {activeSlug === "privacy-policy" && (
                <div>
                  <p style={{ lineHeight: 1.7, color: "var(--text-secondary)", marginBottom: 24 }}>
                    We encrypt all user credentials, security logs, and KYC selfie uploads at rest using AES-256 protocols. Your data is stored within virtual private clouds and is never rented to third-party data brokers.
                  </p>

                  <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: "#fff" }}>
                    Configure Privacy Consent Panels
                  </h3>

                  <div style={{
                    background: "rgba(255,255,255,0.01)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    padding: 20,
                    marginBottom: 24,
                    display: "flex",
                    flexDirection: "column",
                    gap: 16
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <h4 style={{ margin: "0 0 4px", fontSize: 14, color: "#fff" }}>Anonymous Usage Analytics</h4>
                        <p style={{ margin: 0, fontSize: 11, color: "var(--text-secondary)" }}>Track trading layout preferences to improve terminal speeds.</p>
                      </div>
                      <input 
                        type="checkbox" 
                        checked={privacySettings.analytics} 
                        onChange={() => handleTogglePrivacy("analytics")}
                        style={{ width: 16, height: 16, cursor: "pointer" }}
                      />
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <h4 style={{ margin: "0 0 4px", fontSize: 14, color: "#fff" }}>Telemetry System Logs</h4>
                        <p style={{ margin: 0, fontSize: 11, color: "var(--text-secondary)" }}>Submit automated socket failure logs to engineers.</p>
                      </div>
                      <input 
                        type="checkbox" 
                        checked={privacySettings.telemetry} 
                        onChange={() => handleTogglePrivacy("telemetry")}
                        style={{ width: 16, height: 16, cursor: "pointer" }}
                      />
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <h4 style={{ margin: "0 0 4px", fontSize: 14, color: "#fff" }}>Session History Caching</h4>
                        <p style={{ margin: 0, fontSize: 11, color: "var(--text-secondary)" }}>Temporarily cache matching transaction orders locally.</p>
                      </div>
                      <input 
                        type="checkbox" 
                        checked={privacySettings.cookies} 
                        onChange={() => handleTogglePrivacy("cookies")}
                        style={{ width: 16, height: 16, cursor: "pointer" }}
                      />
                    </div>
                  </div>

                  <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: "#fff" }}>
                    Data Clear & Session Revocation
                  </h3>
                  <div style={{
                    background: "rgba(255, 23, 68, 0.03)",
                    border: "1px solid rgba(255, 23, 68, 0.2)",
                    borderRadius: 12,
                    padding: 20
                  }}>
                    <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: "0 0 16px" }}>
                      Clicking below will clear all locally stored API keys, whitelisted states, and authentication cookies in your browser session.
                    </p>
                    <button 
                      onClick={handleClearSessions}
                      style={{
                        padding: "10px 20px",
                        background: "rgba(255, 23, 68, 0.1)",
                        border: "1px solid rgba(255, 23, 68, 0.3)",
                        color: "var(--red)",
                        fontWeight: 700,
                        fontSize: 13,
                        borderRadius: 6,
                        cursor: "pointer",
                        width: "100%"
                      }}
                    >
                      Clear Browser Local State & Logs
                    </button>
                  </div>
                </div>
              )}

              {/* RISK WARNING PAGE */}
              {activeSlug === "risk-warning" && (
                <div>
                  <p style={{ lineHeight: 1.7, color: "var(--text-secondary)", marginBottom: 24 }}>
                    Trading digital assets carries high financial risk. Prices are volatile. Leveraged margin positions are subject to rapid liquidations if the market turns against you. Never trade with capital you cannot afford to lose.
                  </p>

                  <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: "#fff" }}>
                    Leverage Liquidation price calculator
                  </h3>

                  <div style={{
                    background: "rgba(255,255,255,0.01)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    padding: 20
                  }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 20 }} className="form-grid-2">
                      <div>
                        <label style={{ display: "block", fontSize: 11, color: "var(--text-secondary)", marginBottom: 6 }}>Asset</label>
                        <select value={riskAsset} onChange={(e) => setRiskAsset(e.target.value)} style={{ width: "100%", background: "rgba(0,0,0,0.2)", border: "1px solid var(--border)", borderRadius: 6, padding: 8, color: "#fff", fontSize: 12 }}>
                          <option value="BTC">BTC</option>
                          <option value="ETH">ETH</option>
                          <option value="SOL">SOL</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: 11, color: "var(--text-secondary)", marginBottom: 6 }}>Leverage multiplier ({riskLeverage}x)</label>
                        <input 
                          type="range" 
                          min={1} 
                          max={100}
                          value={riskLeverage} 
                          onChange={(e) => setRiskLeverage(parseInt(e.target.value))} 
                          style={{ width: "100%", cursor: "pointer", height: 28 }} 
                        />
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: 11, color: "var(--text-secondary)", marginBottom: 6 }}>Entry Price (USDT)</label>
                        <input 
                          type="number" 
                          value={riskEntryPrice} 
                          onChange={(e) => setRiskEntryPrice(e.target.value)} 
                          style={{ width: "100%", background: "rgba(0,0,0,0.2)", border: "1px solid var(--border)", borderRadius: 6, padding: 8, color: "#fff", fontSize: 12 }} 
                        />
                      </div>
                    </div>

                    <div style={{
                      background: riskLeverage >= 25 ? "rgba(255, 23, 68, 0.08)" : "rgba(245, 166, 35, 0.08)",
                      border: riskLeverage >= 25 ? "1px solid rgba(255, 23, 68, 0.2)" : "1px solid rgba(245, 166, 35, 0.2)",
                      padding: 16,
                      borderRadius: 8,
                      textAlign: "center"
                    }}>
                      <span style={{ fontSize: 12, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>Estimated Long Liquidation Price</span>
                      <strong style={{ fontSize: 24, color: riskLeverage >= 25 ? "var(--red)" : "var(--yellow)", display: "block", marginBottom: 4 }}>
                        ${liqInfo.price.toLocaleString()} USDT
                      </strong>
                      <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                        Liquidation triggers on a drop of <strong style={{ color: "#fff" }}>{liqInfo.changePercent}%</strong>
                      </span>
                    </div>

                    {riskLeverage >= 25 && (
                      <div style={{ display: "flex", gap: 10, marginTop: 16, alignItems: "center", color: "var(--red)" }}>
                        <AlertTriangle size={16} />
                        <span style={{ fontSize: 11, fontWeight: 700 }}>High Leverage Warning: Positions above 25x are highly susceptible to sudden market spreads.</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* COOKIE PREFERENCES PAGE */}
              {activeSlug === "cookie-preferences" && (
                <div>
                  <p style={{ lineHeight: 1.7, color: "var(--text-secondary)", marginBottom: 24 }}>
                    Manage how cookies are saved. Strictly necessary cookies are mandatory to keep you logged in and enforce FIDO2 matching sessions. Optional cookies allow page speeds personalization.
                  </p>

                  <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: "#fff" }}>
                    Select Allowed Cookie Clusters
                  </h3>

                  <div style={{
                    background: "rgba(255,255,255,0.01)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    padding: 20,
                    marginBottom: 24,
                    display: "flex",
                    flexDirection: "column",
                    gap: 16
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <h4 style={{ margin: "0 0 4px", fontSize: 14, color: "#fff" }}>Strictly Necessary Cookies</h4>
                        <p style={{ margin: 0, fontSize: 11, color: "var(--text-secondary)" }}>Required for user login tokens and API sessions. Cannot be disabled.</p>
                      </div>
                      <input type="checkbox" disabled checked style={{ width: 16, height: 16 }} />
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <h4 style={{ margin: "0 0 4px", fontSize: 14, color: "#fff" }}>Functional Cookies</h4>
                        <p style={{ margin: 0, fontSize: 11, color: "var(--text-secondary)" }}>Stores your preferred dark themes and selected language layers.</p>
                      </div>
                      <input 
                        type="checkbox" 
                        checked={cookieConsent.functional} 
                        onChange={() => setCookieConsent(prev => ({ ...prev, functional: !prev.functional }))} 
                        style={{ width: 16, height: 16, cursor: "pointer" }} 
                      />
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <h4 style={{ margin: "0 0 4px", fontSize: 14, color: "#fff" }}>Performance & Analytics Cookies</h4>
                        <p style={{ margin: 0, fontSize: 11, color: "var(--text-secondary)" }}>Tracks page latency measurements to optimize our ingestion nodes.</p>
                      </div>
                      <input 
                        type="checkbox" 
                        checked={cookieConsent.analytics} 
                        onChange={() => setCookieConsent(prev => ({ ...prev, analytics: !prev.analytics }))} 
                        style={{ width: 16, height: 16, cursor: "pointer" }} 
                      />
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <h4 style={{ margin: "0 0 4px", fontSize: 14, color: "#fff" }}>Targeting & Marketing Cookies</h4>
                        <p style={{ margin: 0, fontSize: 11, color: "var(--text-secondary)" }}>Personalize promotional banners and deposit alerts.</p>
                      </div>
                      <input 
                        type="checkbox" 
                        checked={cookieConsent.marketing} 
                        onChange={() => setCookieConsent(prev => ({ ...prev, marketing: !prev.marketing }))} 
                        style={{ width: 16, height: 16, cursor: "pointer" }} 
                      />
                    </div>
                  </div>

                  <button 
                    onClick={handleSaveCookies}
                    className="btn-yellow"
                    style={{
                      padding: "12px 24px",
                      fontSize: 13,
                      fontWeight: 700,
                      border: "none",
                      borderRadius: 6,
                      cursor: "pointer",
                      width: "100%"
                    }}
                  >
                    Save Preferences
                  </button>
                </div>
              )}

            </article>

          </div>

        </div>
      </main>

      {/* Global Toast Alert */}
      {toastMessage && (
        <div style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          background: "var(--yellow)",
          color: "#000",
          fontWeight: 700,
          padding: "12px 24px",
          borderRadius: 8,
          boxShadow: "0 4px 20px rgba(245, 166, 35, 0.4)",
          zIndex: 1000,
          display: "flex",
          alignItems: "center",
          gap: 10,
          fontSize: 13,
          animation: "slideIn 0.3s ease-out forwards"
        }}>
          <Check size={16} />
          {toastMessage}
        </div>
      )}

      <Footer />

      <style jsx global>{`
        .info-main-grid {
          box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
        }
        @media (max-width: 991px) {
          .info-main-grid {
            grid-template-columns: 1fr !important;
            padding: 20px !important;
          }
          .info-sidebar {
            display: none !important;
          }
          .mobile-nav-selector {
            display: block !important;
          }
        }
        @media (max-width: 576px) {
          .form-grid-2 {
            grid-template-columns: 1fr !important;
          }
        }
        @keyframes slideIn {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
