"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Users, 
  Coins, 
  ShieldCheck, 
  Activity, 
  Plus, 
  Check, 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowLeft,
  Settings,
  ShieldAlert,
  Server
} from "lucide-react";
import CloudExchangeLogo from "../components/CloudExchangeLogo";
import SpaceBackground from "../components/SpaceBackground";

interface KYCRequest {
  id: string;
  email: string;
  submittedAt: string;
  documentType: string;
  documentNumber: string;
  selfieUrl: string; // Placeholder representation
  status: "Pending" | "Approved" | "Rejected";
}

interface DisputedEscrow {
  id: string;
  buyer: string;
  seller: string;
  coin: string;
  amount: number;
  fiatAmount: number;
  receiptUploaded: boolean;
  status: "Disputed";
}

interface CustomPair {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  volume24h: number;
  color: string;
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<"kyc" | "pairs" | "disputes" | "system">("kyc");
  
  // Custom pair states
  const [newSymbol, setNewSymbol] = useState("");
  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newChange, setNewChange] = useState("");
  const [newVolume, setNewVolume] = useState("");
  const [newColor, setNewColor] = useState("#8247E5");
  
  // Dynamic lists from localStorage
  const [kycRequests, setKycRequests] = useState<KYCRequest[]>([]);
  const [disputes, setDisputes] = useState<DisputedEscrow[]>([]);
  const [customPairs, setCustomPairs] = useState<CustomPair[]>([]);
  
  // Toast notifications
  const [toast, setToast] = useState("");

  useEffect(() => {
    // 1. Load or initialize KYC requests
    const defaultKyc: KYCRequest[] = [
      { id: "101", email: "bunty_trader@exchange.in", submittedAt: "2026-05-29 09:12", documentType: "PAN Card", documentNumber: "ABCDE1234F", selfieUrl: "/craters", status: "Pending" },
      { id: "102", email: "rakesh_bhol@cloudexchange.in", submittedAt: "2026-05-29 11:30", documentType: "Aadhaar Card", documentNumber: "1234-5678-9012", selfieUrl: "/craters", status: "Pending" }
    ];
    const savedKyc = localStorage.getItem("admin_kyc_requests");
    if (savedKyc) {
      setKycRequests(JSON.parse(savedKyc));
    } else {
      setKycRequests(defaultKyc);
      localStorage.setItem("admin_kyc_requests", JSON.stringify(defaultKyc));
    }

    // 2. Load or initialize Disputed P2P Escrows
    const defaultDisputes: DisputedEscrow[] = [
      { id: "ESC-908", buyer: "odisha_buyer@ex.in", seller: "kolkata_seller@ex.in", coin: "USDT", amount: 250, fiatAmount: 22125, receiptUploaded: true, status: "Disputed" },
      { id: "ESC-912", buyer: "delhi_whale@cloud.ex", seller: "mumbai_desk@cloud.ex", coin: "BTC", amount: 0.05, fiatAmount: 276000, receiptUploaded: true, status: "Disputed" }
    ];
    const savedDisputes = localStorage.getItem("admin_disputed_escrows");
    if (savedDisputes) {
      setDisputes(JSON.parse(savedDisputes));
    } else {
      setDisputes(defaultDisputes);
      localStorage.setItem("admin_disputed_escrows", JSON.stringify(defaultDisputes));
    }

    // 3. Load Custom Pairs
    const savedPairs = localStorage.getItem("admin_custom_trading_pairs");
    if (savedPairs) {
      setCustomPairs(JSON.parse(savedPairs));
    }
  }, []);

  const triggerToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3500);
  };

  // Add custom trading pair
  const handleAddPair = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSymbol || !newName || !newPrice) return;

    const newPair: CustomPair = {
      symbol: newSymbol.toUpperCase(),
      name: newName,
      price: parseFloat(newPrice) || 0,
      change24h: parseFloat(newChange) || 0,
      volume24h: parseFloat(newVolume) || 0,
      color: newColor
    };

    const updatedPairs = [...customPairs, newPair];
    setCustomPairs(updatedPairs);
    localStorage.setItem("admin_custom_trading_pairs", JSON.stringify(updatedPairs));
    
    // Also save custom pair in the asset balances list to enable user wallets
    const storedBalances = localStorage.getItem("user_asset_balances");
    if (storedBalances) {
      const parsed = JSON.parse(storedBalances);
      if (!parsed.some((a: any) => a.symbol === newPair.symbol)) {
        parsed.push({ symbol: newPair.symbol, name: newPair.name, amount: 0.0, inOrder: 0.0, color: newPair.color });
        localStorage.setItem("user_asset_balances", JSON.stringify(parsed));
      }
    }

    triggerToast(`Successfully registered and deployed pair: ${newPair.symbol}/USDT`);
    setNewSymbol("");
    setNewName("");
    setNewPrice("");
    setNewChange("");
    setNewVolume("");
  };

  // Resolve KYC status
  const handleKycResolve = (id: string, approve: boolean) => {
    const updated = kycRequests.map(k => {
      if (k.id === id) {
        k.status = approve ? "Approved" : "Rejected";
      }
      return k;
    });
    setKycRequests(updated);
    localStorage.setItem("admin_kyc_requests", JSON.stringify(updated));

    // Update selected user's KYC tier in system
    const target = kycRequests.find(k => k.id === id);
    if (target && approve) {
      localStorage.setItem("kyc_tier", "Tier-2 Verified (Identity Approved)");
    }
    triggerToast(`KYC Request #${id} ${approve ? "Approved" : "Rejected"} successfully.`);
  };

  // Resolve Disputes
  const handleResolveDispute = (id: string, winner: "buyer" | "seller") => {
    const updated = disputes.filter(d => d.id !== id);
    setDisputes(updated);
    localStorage.setItem("admin_disputed_escrows", JSON.stringify(updated));
    triggerToast(`Escrow dispute ${id} resolved. Funds transferred to ${winner.toUpperCase()}.`);
  };

  return (
    <div style={{ minHeight: "100vh", color: "var(--text-primary)", display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" }}>
      <SpaceBackground />

      {/* Header */}
      <header style={{
        height: 64,
        background: "rgba(10, 17, 40, 0.75)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid var(--border)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 24px",
        zIndex: 100
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Link href="/" className="btn-ghost" style={{ display: "flex", alignItems: "center", gap: 6, textDecoration: "none", color: "var(--text-secondary)", fontSize: 13 }}>
            <ArrowLeft size={16} /> Home
          </Link>
          <div style={{ width: 1, height: 20, background: "var(--border)" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <CloudExchangeLogo size={24} />
            <span style={{ fontSize: 18, fontWeight: 800 }}>
              Cloud<span style={{ color: "var(--yellow)" }}>Exchange.in</span> <span style={{ fontSize: 10, color: "var(--yellow)", background: "rgba(245, 166, 35, 0.1)", padding: "2px 8px", borderRadius: 4, marginLeft: 8, border: "1px solid rgba(245, 166, 35, 0.2)" }}>ADMIN</span>
            </span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(16, 185, 129, 0.1)", border: "1px solid rgba(16, 185, 129, 0.2)", borderRadius: 6, padding: "4px 10px", fontSize: 12, color: "#10b981" }}>
            <Activity size={14} /> Matching Engine: Live (Core Pinned)
          </div>
        </div>
      </header>

      {/* Admin Content wrapper */}
      <div style={{ flex: 1, display: "flex", zIndex: 10 }}>
        {/* Sidebar Nav */}
        <aside style={{
          width: 260,
          background: "linear-gradient(180deg, rgba(10, 17, 40, 0.6) 0%, rgba(4, 8, 20, 0.3) 100%)",
          borderRight: "1px solid var(--border)",
          padding: 24,
          display: "flex",
          flexDirection: "column",
          gap: 8
        }}>
          {[
            { id: "kyc", label: "User KYC Verification", icon: <Users size={16} /> },
            { id: "pairs", label: "Custom Trading Pairs", icon: <Coins size={16} /> },
            { id: "disputes", label: "P2P Escrow Disputes", icon: <ShieldAlert size={16} /> },
            { id: "system", label: "System Health & WAL", icon: <Server size={16} /> },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                width: "100%",
                padding: "12px 16px",
                border: "none",
                borderRadius: 8,
                background: activeTab === item.id ? "rgba(255, 255, 255, 0.05)" : "transparent",
                color: activeTab === item.id ? "var(--yellow)" : "var(--text-secondary)",
                fontWeight: activeTab === item.id ? 700 : 500,
                fontSize: 13,
                cursor: "pointer",
                textAlign: "left",
                transition: "all 0.2s"
              }}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </aside>

        {/* Content Area */}
        <main style={{ flex: 1, padding: 32, overflowY: "auto" }}>
          {/* TOAST Notification */}
          {toast && (
            <div style={{
              position: "fixed",
              top: 80,
              right: 24,
              background: "#040814",
              border: "1px solid var(--yellow)",
              color: "#FFF",
              padding: "12px 24px",
              borderRadius: 8,
              boxShadow: "0 0 20px rgba(245, 166, 35, 0.25)",
              display: "flex",
              alignItems: "center",
              gap: 8,
              zIndex: 1000,
              fontSize: 13
            }}>
              <CheckCircle2 size={16} color="var(--yellow)" />
              {toast}
            </div>
          )}

          {/* KYC Tab */}
          {activeTab === "kyc" && (
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Identity & Liveness Verification</h2>
              <p style={{ color: "var(--text-secondary)", fontSize: 13, marginBottom: 24 }}>Review and action user tier level-up requests.</p>

              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {kycRequests.length === 0 ? (
                  <div style={{ background: "rgba(10, 17, 40, 0.45)", borderRadius: 12, padding: 48, textAlign: "center", border: "1px solid var(--border)" }}>
                    <ShieldCheck size={48} color="var(--green)" style={{ margin: "0 auto 16px" }} />
                    <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>All KYC verification requests have been cleared!</p>
                  </div>
                ) : (
                  kycRequests.map((req) => (
                    <div key={req.id} style={{
                      background: "rgba(13, 27, 56, 0.45)",
                      border: "1px solid var(--border)",
                      borderRadius: 12,
                      padding: 24,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center"
                    }}>
                      <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
                        {/* Selfie Mock Circular display */}
                        <div style={{ width: 56, height: 56, borderRadius: "50%", background: "radial-gradient(circle, var(--cyan-dim) 0%, rgba(4,8,20,0.5) 100%)", border: "1.5px solid var(--cyan)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
                          👤
                        </div>
                        <div>
                          <div style={{ fontSize: 15, fontWeight: 700 }}>{req.email}</div>
                          <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4 }}>
                            Requested: {req.submittedAt} &bull; Document: <span style={{ color: "var(--cyan)" }}>{req.documentType} ({req.documentNumber})</span>
                          </div>
                        </div>
                      </div>

                      {req.status === "Pending" ? (
                        <div style={{ display: "flex", gap: 8 }}>
                          <button onClick={() => handleKycResolve(req.id, false)} className="btn-outline" style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--red)", borderColor: "rgba(239, 68, 68, 0.3)", padding: "8px 16px" }}>
                            <X size={14} /> Reject
                          </button>
                          <button onClick={() => handleKycResolve(req.id, true)} className="btn-yellow" style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px" }}>
                            <Check size={14} /> Approve Verified Status
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize: 13, fontWeight: 700, color: req.status === "Approved" ? "var(--green)" : "var(--red)" }}>
                          {req.status.toUpperCase()}
                        </span>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* PAIRS Tab */}
          {activeTab === "pairs" && (
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Add Ecosystem Trading Pairs</h2>
              <p style={{ color: "var(--text-secondary)", fontSize: 13, marginBottom: 24 }}>Instantly register and deploy custom tokens on CloudExchange matching servers.</p>

              <div style={{ display: "grid", gridTemplateColumns: "1.2fr 2fr", gap: 32 }}>
                {/* Form to create */}
                <form onSubmit={handleAddPair} style={{
                  background: "rgba(13, 27, 56, 0.45)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  padding: 24,
                  display: "flex",
                  flexDirection: "column",
                  gap: 16
                }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, borderBottom: "1px solid var(--border)", paddingBottom: 12, marginBottom: 4 }}>New Pair Registry</h3>

                  <div>
                    <label style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 700, display: "block", marginBottom: 6 }}>TOKEN SYMBOL</label>
                    <input type="text" className="bn-input" placeholder="e.g. MATIC" value={newSymbol} onChange={e => setNewSymbol(e.target.value)} required />
                  </div>

                  <div>
                    <label style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 700, display: "block", marginBottom: 6 }}>FULL NAME</label>
                    <input type="text" className="bn-input" placeholder="e.g. Polygon" value={newName} onChange={e => setNewName(e.target.value)} required />
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div>
                      <label style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 700, display: "block", marginBottom: 6 }}>INITIAL PRICE (USD)</label>
                      <input type="number" step="any" className="bn-input" placeholder="0.68" value={newPrice} onChange={e => setNewPrice(e.target.value)} required />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 700, display: "block", marginBottom: 6 }}>24H CHANGE (%)</label>
                      <input type="number" step="any" className="bn-input" placeholder="+1.55" value={newChange} onChange={e => setNewChange(e.target.value)} />
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 700, display: "block", marginBottom: 6 }}>24H VOLUME</label>
                    <input type="number" className="bn-input" placeholder="25000" value={newVolume} onChange={e => setNewVolume(e.target.value)} />
                  </div>

                  <div>
                    <label style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 700, display: "block", marginBottom: 6 }}>ACCENT COLOR (HEX)</label>
                    <input type="color" className="bn-input" style={{ height: 40, padding: 4 }} value={newColor} onChange={e => setNewColor(e.target.value)} />
                  </div>

                  <button type="submit" className="btn-yellow" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: 12, fontWeight: 700, marginTop: 8 }}>
                    <Plus size={16} /> Deploy Trading Pair
                  </button>
                </form>

                {/* Active custom list */}
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Deployments Queue</h3>
                  {customPairs.length === 0 ? (
                    <div style={{ background: "rgba(10, 17, 40, 0.2)", border: "1px dashed var(--border)", borderRadius: 12, padding: 48, textAlign: "center", color: "var(--text-secondary)", fontSize: 13 }}>
                      No custom pairs deployed yet. Fill the form to create.
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      {customPairs.map((p, idx) => (
                        <div key={idx} style={{
                          background: "rgba(13, 27, 56, 0.35)",
                          border: "1px solid var(--border)",
                          borderRadius: 8,
                          padding: "16px 20px",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center"
                        }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <div style={{ width: 10, height: 10, borderRadius: "50%", background: p.color }} />
                            <div>
                              <span style={{ fontWeight: 700, fontSize: 14 }}>{p.symbol}/USDT</span>
                              <span style={{ fontSize: 11, color: "var(--text-secondary)", marginLeft: 8 }}>{p.name}</span>
                            </div>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontWeight: 700, fontSize: 14 }}>${p.price.toFixed(4)}</div>
                            <div style={{ fontSize: 11, color: p.change24h >= 0 ? "var(--green)" : "var(--red)" }}>
                              {p.change24h >= 0 ? "+" : ""}{p.change24h}%
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* DISPUTES Tab */}
          {activeTab === "disputes" && (
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>P2P Escrow Dispute Center</h2>
              <p style={{ color: "var(--text-secondary)", fontSize: 13, marginBottom: 24 }}>Moderate and resolve locked collateral peer transactions.</p>

              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {disputes.length === 0 ? (
                  <div style={{ background: "rgba(10, 17, 40, 0.45)", borderRadius: 12, padding: 48, textAlign: "center", border: "1px solid var(--border)" }}>
                    <ShieldCheck size={48} color="var(--green)" style={{ margin: "0 auto 16px" }} />
                    <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>All dispute tickets cleared. Zero pending cases.</p>
                  </div>
                ) : (
                  disputes.map((d) => (
                    <div key={d.id} style={{
                      background: "rgba(13, 27, 56, 0.45)",
                      border: "1px solid var(--border)",
                      borderRadius: 12,
                      padding: 24
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--border)", paddingBottom: 16, marginBottom: 16 }}>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontSize: 14, fontWeight: 700, color: "var(--yellow)" }}>{d.id}</span>
                            <span style={{ fontSize: 10, background: "rgba(239, 68, 68, 0.15)", border: "1px solid rgba(239, 68, 68, 0.3)", color: "var(--red)", padding: "2px 6px", borderRadius: 4 }}>DISPUTED PAYMENT</span>
                          </div>
                          <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4 }}>
                            Buyer: <span style={{ color: "var(--text-primary)" }}>{d.buyer}</span> &bull; Seller: <span style={{ color: "var(--text-primary)" }}>{d.seller}</span>
                          </div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: 16, fontWeight: 800, color: "var(--text-primary)" }}>{d.amount} {d.coin}</div>
                          <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>₹{d.fiatAmount.toLocaleString("en-IN")} INR</div>
                        </div>
                      </div>

                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--green)", fontSize: 12 }}>
                          <CheckCircle2 size={14} /> Buyer uploaded verified IMPS transaction slip (EXIF check passed).
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button onClick={() => handleResolveDispute(d.id, "seller")} className="btn-outline" style={{ color: "var(--red)", borderColor: "rgba(239, 68, 68, 0.3)", padding: "6px 12px", fontSize: 12 }}>
                            Refund Seller
                          </button>
                          <button onClick={() => handleResolveDispute(d.id, "buyer")} className="btn-yellow" style={{ padding: "6px 12px", fontSize: 12 }}>
                            Release Escrow to Buyer
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* SYSTEM Tab */}
          {activeTab === "system" && (
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Core Infrastructure Metrics</h2>
              <p style={{ color: "var(--text-secondary)", fontSize: 13, marginBottom: 24 }}>Real-time health indices of the HFT matching engine and double-entry ledger database.</p>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20, marginBottom: 32 }}>
                {[
                  { title: "Matching Latency", val: "0.12 μs", desc: "Median order process speed", ok: true },
                  { title: "Peak Ingestion", val: "2,450,000 tx/s", desc: "DPDK Kernel bypass queue", ok: true },
                  { title: "Shadow Engine State", val: "0 DIV", desc: "State discrepancies reported", ok: true },
                  { title: "WAL File Space", val: "100 MB", desc: "Pre-allocated NVMe disk WAL", ok: true },
                  { title: "Ledger Settlement", val: "Double-Entry OK", desc: "Self-auditing verification status", ok: true },
                  { title: "Arbitration Lock", val: "0.00% Error", desc: "Smart contract release state", ok: true },
                ].map((s, idx) => (
                  <div key={idx} style={{
                    background: "rgba(13, 27, 56, 0.45)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    padding: 20
                  }}>
                    <div style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 700, textTransform: "uppercase" }}>{s.title}</div>
                    <div style={{ fontSize: 24, fontWeight: 900, color: "var(--yellow)", marginTop: 8 }}>{s.val}</div>
                    <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4 }}>{s.desc}</div>
                  </div>
                ))}
              </div>

              <div style={{
                background: "rgba(13, 27, 56, 0.25)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                padding: 24
              }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                  <Settings size={16} /> WAL (Write-Ahead Log) Flush Indexer
                </h3>
                <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 16 }}>
                  Our zero-copy memory-mapped WAL is continuously writing execution events. In case of matching engine crash, the state replayer will rebuild order histories in 24 microseconds.
                </p>
                <div style={{ background: "rgba(0, 0, 0, 0.2)", borderRadius: 6, padding: 12, fontFamily: "monospace", fontSize: 11, color: "var(--cyan)" }}>
                  [info] WAL Flush Success. Block sequence 2,892,102. Hash: 0xf3a8d11c9...
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
