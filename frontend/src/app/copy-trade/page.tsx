"use client";
import React, { useState, useEffect } from "react";
import { UserCheck, Users, TrendingUp, DollarSign, Wallet, ShieldAlert, Award, ArrowUpRight } from "lucide-react";
import Header from "../components/Header";
import SpaceBackground from "../components/SpaceBackground";

interface MasterTrader {
  id: string;
  name: string;
  avatar: string;
  pnl30d: number;
  winRate: number;
  copiers: number;
  aum: number;
  riskScore: number;
}

interface CopiedPosition {
  traderId: string;
  traderName: string;
  investment: number;
  pnlUSDT: number;
  pnlPercent: number;
  copyTime: string;
}

const MASTER_TRADERS: MasterTrader[] = [
  { id: "MT-302", name: "Galaxy Alpha Scalper", avatar: "🌌", pnl30d: 48.24, winRate: 92.4, copiers: 842, aum: 480200, riskScore: 3 },
  { id: "MT-419", name: "Nebula Trend Rider", avatar: "🪐", pnl30d: 31.85, winRate: 85.1, copiers: 1205, aum: 1250300, riskScore: 2 },
  { id: "MT-105", name: "Solar Flare Arbitrage", avatar: "☀️", pnl30d: 62.45, winRate: 78.9, copiers: 620, aum: 310800, riskScore: 5 },
  { id: "MT-884", name: "Quantum Yield Hedge", avatar: "🌀", pnl30d: 18.90, winRate: 98.2, copiers: 2012, aum: 2450100, riskScore: 1 },
];

export default function CopyTradingPage() {
  const [walletBalance, setWalletBalance] = useState(15740.50);
  const [alertText, setAlertText] = useState("");
  const [copiedPositions, setCopiedPositions] = useState<CopiedPosition[]>([
    {
      traderId: "MT-419",
      traderName: "Nebula Trend Rider",
      investment: 1000,
      pnlUSDT: 85.10,
      pnlPercent: 8.51,
      copyTime: "2d 4h ago"
    }
  ]);

  // Modal setup
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [selectedTrader, setSelectedTrader] = useState<MasterTrader | null>(null);
  const [copyInvestment, setCopyInvestment] = useState("500");
  const [maxLeverage, setMaxLeverage] = useState("20");

  useEffect(() => {
    const bal = localStorage.getItem("wallet_balance");
    if (bal) setWalletBalance(parseFloat(bal));

    const syncBal = () => {
      const b = localStorage.getItem("wallet_balance");
      if (b) setWalletBalance(parseFloat(b));
    };
    window.addEventListener("storage", syncBal);
    return () => window.removeEventListener("storage", syncBal);
  }, []);

  const updateBalance = (newVal: number) => {
    setWalletBalance(newVal);
    localStorage.setItem("wallet_balance", String(newVal));
    window.dispatchEvent(new Event("storage"));
  };

  // Simulate active copy trading returns ticking
  useEffect(() => {
    const iv = setInterval(() => {
      setCopiedPositions(prev =>
        prev.map(pos => {
          const change = (Math.random() - 0.45) * 4; // slight upward drift
          const nextPnl = +(pos.pnlUSDT + change).toFixed(2);
          const nextPct = +((nextPnl / pos.investment) * 100).toFixed(2);
          return {
            ...pos,
            pnlUSDT: nextPnl,
            pnlPercent: nextPct
          };
        })
      );
    }, 5000);
    return () => clearInterval(iv);
  }, []);

  const handleOpenCopy = (trader: MasterTrader) => {
    setSelectedTrader(trader);
    setShowCopyModal(true);
  };

  const handleConfirmCopy = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTrader) return;

    const amt = parseFloat(copyInvestment);
    if (isNaN(amt) || amt <= 0) {
      triggerAlert("Please enter a valid copy amount.");
      return;
    }
    if (amt > walletBalance) {
      triggerAlert("Insufficient balance to allocate for copy trading.");
      return;
    }

    // Deduct balance
    updateBalance(+(walletBalance - amt).toFixed(2));

    const newPos: CopiedPosition = {
      traderId: selectedTrader.id,
      traderName: selectedTrader.name,
      investment: amt,
      pnlUSDT: 0.00,
      pnlPercent: 0.00,
      copyTime: "Just now"
    };

    setCopiedPositions(prev => [newPos, ...prev]);
    setShowCopyModal(false);
    triggerAlert(`Successfully copying ${selectedTrader.name} with $${amt} USDT.`);
  };

  const handleStopCopying = (traderId: string) => {
    const target = copiedPositions.find(p => p.traderId === traderId);
    if (target) {
      const refund = target.investment + target.pnlUSDT;
      updateBalance(+(walletBalance + refund).toFixed(2));
      setCopiedPositions(prev => prev.filter(p => p.traderId !== traderId));
      triggerAlert(`Stopped copying. Returned initial collateral plus accrued PnL: $${refund.toFixed(2)} USDT.`);
    }
  };

  const triggerAlert = (msg: string) => {
    setAlertText(msg);
    setTimeout(() => setAlertText(""), 4500);
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

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 36, flexWrap: "wrap", gap: 16 }}>
          <div>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--yellow)", textTransform: "uppercase", letterSpacing: 1.5 }}>Social Trading Hub</span>
            <h1 style={{ fontSize: 32, fontWeight: 800, marginTop: 4, letterSpacing: -0.5 }}>Copy Trading Center</h1>
          </div>

          <div style={{
            background: "rgba(6, 11, 30, 0.85)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            padding: "12px 20px",
            display: "flex",
            alignItems: "center",
            gap: 14
          }}>
            <div style={{ background: "rgba(252,213,53,0.1)", borderRadius: 8, padding: 8 }}>
              <Wallet size={20} color="var(--yellow)" />
            </div>
            <div>
              <div style={{ fontSize: 10, color: "var(--text-secondary)" }}>AVAILABLE ASSETS</div>
              <div style={{ fontSize: 16, fontWeight: 750, color: "#fff" }}>${walletBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT</div>
            </div>
          </div>
        </div>

        {/* Section 1: My Copy Portfolio */}
        <div style={{
          background: "rgba(6, 11, 30, 0.85)",
          border: "1px solid var(--border)",
          borderRadius: 16,
          padding: 24,
          marginBottom: 32,
          backdropFilter: "blur(16px)"
        }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 18, display: "flex", alignItems: "center", gap: 8 }}>
            <UserCheck size={20} color="var(--yellow)" />
            My Active Copy Portfolio
          </h2>

          {copiedPositions.length === 0 ? (
            <div style={{ textAlign: "center", padding: "36px 0", color: "var(--text-muted)", fontSize: 13 }}>
              You are not copying any master traders currently. Explore the top traders list below to select one.
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 600 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border-light)", textAlign: "left", fontSize: 11, color: "var(--text-secondary)" }}>
                    <th style={{ padding: "10px 8px" }}>MASTER TRADER</th>
                    <th style={{ padding: "10px 8px" }}>ALLOCATED MARGIN</th>
                    <th style={{ padding: "10px 8px" }}>TIME RUNNING</th>
                    <th style={{ padding: "10px 8px" }}>UNREALIZED PNL (USDT)</th>
                    <th style={{ padding: "10px 8px" }}>PNL (%)</th>
                    <th style={{ padding: "10px 8px", textAlign: "right" }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {copiedPositions.map(pos => (
                    <tr key={pos.traderId} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)", fontSize: 13 }}>
                      <td style={{ padding: "14px 8px", fontWeight: 700, color: "#fff" }}>{pos.traderName}</td>
                      <td style={{ padding: "14px 8px", color: "var(--text-secondary)" }}>${pos.investment.toLocaleString()} USDT</td>
                      <td style={{ padding: "14px 8px", color: "var(--text-secondary)" }}>{pos.copyTime}</td>
                      <td style={{ padding: "14px 8px", fontWeight: 700, color: pos.pnlUSDT >= 0 ? "var(--green)" : "var(--red)" }}>
                        {pos.pnlUSDT >= 0 ? "+" : ""}${pos.pnlUSDT.toFixed(2)}
                      </td>
                      <td style={{ padding: "14px 8px", fontWeight: 700, color: pos.pnlPercent >= 0 ? "var(--green)" : "var(--red)" }}>
                        {pos.pnlPercent >= 0 ? "+" : ""}{pos.pnlPercent}%
                      </td>
                      <td style={{ padding: "14px 8px", textAlign: "right" }}>
                        <button
                          onClick={() => handleStopCopying(pos.traderId)}
                          style={{
                            background: "rgba(255,23,68,0.1)",
                            border: "1px solid rgba(255,23,68,0.3)",
                            borderRadius: 6,
                            padding: "6px 12px",
                            color: "var(--red)",
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: "pointer",
                            transition: "all 0.2s"
                          }}
                        >
                          Stop Copying
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Section 2: Explorer / Leaderboard */}
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>Top 30D Master Traders Leaderboard</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20 }}>
          {MASTER_TRADERS.map(trader => (
            <div
              key={trader.id}
              style={{
                background: "rgba(6, 11, 30, 0.85)",
                border: "1px solid var(--border)",
                borderRadius: 16,
                padding: 24,
                backdropFilter: "blur(16px)",
                display: "flex",
                flexDirection: "column",
                gap: 16
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <div style={{ fontSize: 32 }}>{trader.avatar}</div>
                  <div>
                    <h3 style={{ fontSize: 15, fontWeight: 750, color: "#fff" }}>{trader.name}</h3>
                    <span style={{ fontSize: 10, color: "var(--text-muted)" }}>ID: {trader.id}</span>
                  </div>
                </div>
                <div style={{
                  background: trader.riskScore <= 2 ? "rgba(10,230,120,0.1)" : "rgba(255,23,68,0.1)",
                  border: `1px solid ${trader.riskScore <= 2 ? "var(--green)" : "var(--red)"}`,
                  color: trader.riskScore <= 2 ? "var(--green)" : "var(--red)",
                  borderRadius: 4,
                  padding: "2px 6px",
                  fontSize: 10,
                  fontWeight: 700
                }}>
                  Risk {trader.riskScore}
                </div>
              </div>

              {/* Stats Table */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 8px", background: "rgba(255,255,255,0.02)", padding: 12, borderRadius: 8 }}>
                <div>
                  <div style={{ fontSize: 10, color: "var(--text-secondary)" }}>30D PNL</div>
                  <div style={{ fontSize: 14, fontWeight: 750, color: "var(--green)" }}>+{trader.pnl30d}%</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: "var(--text-secondary)" }}>WIN RATE</div>
                  <div style={{ fontSize: 14, fontWeight: 750, color: "#fff" }}>{trader.winRate}%</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: "var(--text-secondary)" }}>COPIERS</div>
                  <div style={{ fontSize: 14, fontWeight: 750, color: "#fff" }}>{trader.copiers}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: "var(--text-secondary)" }}>TOTAL AUM</div>
                  <div style={{ fontSize: 14, fontWeight: 750, color: "#fff" }}>${trader.aum.toLocaleString()}</div>
                </div>
              </div>

              <button
                onClick={() => handleOpenCopy(trader)}
                className="btn-green"
                style={{ width: "100%", height: 38, fontWeight: 800, fontSize: 13 }}
              >
                Copy Strategy
              </button>
            </div>
          ))}
        </div>

        {/* Modal: Setup Copier Allocation */}
        {showCopyModal && selectedTrader && (
          <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.8)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24
          }}>
            <div style={{
              background: "rgba(6, 11, 30, 0.95)",
              border: "1px solid var(--border)",
              boxShadow: "0 10px 40px rgba(0,0,0,0.5)",
              borderRadius: 16,
              maxWidth: 440,
              width: "100%",
              padding: 28,
              backdropFilter: "blur(20px)"
            }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 6 }}>Copy Strategy Allocation</h2>
              <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 20 }}>
                You are setting up copy trading for <span style={{ color: "var(--yellow)", fontWeight: 700 }}>{selectedTrader.name}</span>.
              </p>

              <form onSubmit={handleConfirmCopy} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <label style={{ fontSize: 11, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>ALLOCATE USDT AMOUNT</label>
                  <input
                    className="bn-input"
                    value={copyInvestment}
                    onChange={e => setCopyInvestment(e.target.value)}
                    placeholder="Min 100 USDT"
                    required
                  />
                  <span style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 4, display: "block" }}>Available: ${walletBalance.toFixed(2)} USDT</span>
                </div>

                <div>
                  <label style={{ fontSize: 11, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>LEVERAGE RISK MULTIPLIER</label>
                  <select
                    className="bn-select"
                    value={maxLeverage}
                    onChange={e => setMaxLeverage(e.target.value)}
                    style={{ height: 40, width: "100%" }}
                  >
                    <option value="1">1x (Conservative)</option>
                    <option value="5">5x (Standard)</option>
                    <option value="10">10x (Aggressive)</option>
                    <option value="20">20x (Extreme Limit)</option>
                  </select>
                </div>

                <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
                  <button
                    type="button"
                    onClick={() => setShowCopyModal(false)}
                    className="btn-outline"
                    style={{ flex: 1, height: 40, borderRadius: 8, cursor: "pointer" }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-green"
                    style={{ flex: 1, height: 40, borderRadius: 8, cursor: "pointer", fontWeight: 800 }}
                  >
                    Confirm Copy
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
