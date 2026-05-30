"use client";
import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Play, Pause, Trash2, Cpu, LineChart, Wallet, ChevronRight, AlertTriangle, Terminal } from "lucide-react";
import Header from "../components/Header";
import SpaceBackground from "../components/SpaceBackground";

interface Bot {
  id: string;
  name: string;
  type: "Grid" | "DCA";
  status: "Running" | "Paused";
  pair: string;
  investment: number;
  runtime: string; // in hours/mins
  profit: number; // in percentage
  details: string;
  history: number[]; // Sparkline history ticks
  startTime: number; // Epoch starting timestamp
}

export default function BotsPage() {
  const [activeTab, setActiveTab] = useState<"Grid" | "DCA" | "Active">("Grid");
  const [walletBalance, setWalletBalance] = useState(15740.50);
  const [alertText, setAlertText] = useState("");
  const [activeBots, setActiveBots] = useState<Bot[]>([
    {
      id: "BOT-872A",
      name: "BTC Alpha Grid",
      type: "Grid",
      status: "Running",
      pair: "BTC/USDT",
      investment: 2500,
      runtime: "48h 12m",
      profit: 4.82,
      details: "Grids: 30 | Range: $62,000 - $68,000",
      history: [4.20, 4.35, 4.30, 4.45, 4.60, 4.50, 4.75, 4.68, 4.82],
      startTime: Date.now() - 48 * 3600 * 1000 - 12 * 60 * 1000
    },
    {
      id: "BOT-911D",
      name: "SOL Accumulator DCA",
      type: "DCA",
      status: "Running",
      pair: "SOL/USDT",
      investment: 1200,
      runtime: "120h 5m",
      profit: 8.15,
      details: "$50 every 4 Hours",
      history: [6.80, 7.10, 7.05, 7.30, 7.60, 7.85, 8.00, 7.95, 8.15],
      startTime: Date.now() - 120 * 3600 * 1000 - 5 * 60 * 1000
    }
  ]);

  const BotSparkline = ({ history, isUp }: { history: number[]; isUp: boolean }) => {
    if (!history || history.length < 2) return <div style={{ width: 60, height: 24 }} />;
    const min = Math.min(...history);
    const max = Math.max(...history);
    const range = max - min === 0 ? 1 : max - min;
    const width = 60;
    const height = 24;
    const points = history.map((val, idx) => {
      const x = (idx / (history.length - 1)) * width;
      const y = height - ((val - min) / range) * height;
      return `${x},${y}`;
    }).join(" ");

    return (
      <svg width={width} height={height} style={{ opacity: 0.85 }}>
        <polyline
          fill="none"
          stroke={isUp ? "var(--green)" : "var(--red)"}
          strokeWidth="1.5"
          points={points}
        />
      </svg>
    );
  };

  // Form states
  const [gridLower, setGridLower] = useState("62000");
  const [gridUpper, setGridUpper] = useState("68000");
  const [gridCount, setGridCount] = useState(25);
  const [gridInvestment, setGridInvestment] = useState("1000");

  const [dcaCoin, setDcaCoin] = useState("ETH");
  const [dcaAmount, setDcaAmount] = useState("100");
  const [dcaInterval, setDcaInterval] = useState("Daily");

  // Terminal Simulator Logs
  const [logs, setLogs] = useState<string[]>([
    "[00:01:05] [DCA System] Bot SOL Accumulator DCA online.",
    "[00:01:10] [Grid System] Grid Bot BTC Alpha Grid orders mapped successfully.",
    "[02:14:15] [Grid-BTC] Limit order matched at $64,800. Filled 0.038 BTC.",
    "[02:14:17] [Grid-BTC] Standard sell order placed at $65,200.",
    "[04:00:00] [DCA-SOL] Executed cycle purchase of 0.298 SOL at $168.10. Balance updated.",
    "[05:32:10] [Grid-BTC] Limit order matched at $65,200. Filled 0.038 BTC. Profit +$15.20 USDT."
  ]);
  const logTerminalRef = useRef<HTMLDivElement>(null);

  // Sync wallet balance
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

  // Log simulation ticking
  useEffect(() => {
    const logInterval = setInterval(() => {
      const randomCoin = ["BTC", "ETH", "SOL"][Math.floor(Math.random() * 3)];
      const randomPrice = randomCoin === "BTC" ? 65120 : randomCoin === "ETH" ? 3410 : 168.50;
      const actions = [
        `[${new Date().toLocaleTimeString()}] [Grid-${randomCoin}] Price hit grid tier $${randomPrice} - Executed limit buy step.`,
        `[${new Date().toLocaleTimeString()}] [Grid-${randomCoin}] Closed grid slice at profit boundary. Commission fee 0.08% deducted.`,
        `[${new Date().toLocaleTimeString()}] [DCA-${randomCoin}] Scheduled buying trigger completed: allocated capital.`,
        `[${new Date().toLocaleTimeString()}] [Engine] Recalculating grid profit margins for active bot pool.`
      ];
      setLogs(prev => [...prev, actions[Math.floor(Math.random() * actions.length)]].slice(-30));
    }, 4500);

    return () => clearInterval(logInterval);
  }, []);

  useEffect(() => {
    if (logTerminalRef.current) {
      logTerminalRef.current.scrollTop = logTerminalRef.current.scrollHeight;
    }
  }, [logs]);

  // Dynamic Bot profit & runtime updater
  useEffect(() => {
    const botTimer = setInterval(() => {
      setActiveBots(prev => prev.map(bot => {
        if (bot.status !== "Running") return bot;
        
        // Calculate dynamic runtime string
        const diffMs = Date.now() - bot.startTime;
        const totalMins = Math.floor(diffMs / 60000);
        const hours = Math.floor(totalMins / 60);
        const mins = totalMins % 60;
        const runtimeStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

        // Calculate a profit delta
        const delta = (Math.random() - 0.45) * 0.15; // slightly biased towards positive profits
        const newProfit = +(bot.profit + delta).toFixed(2);
        const newHistory = [...bot.history, newProfit].slice(-10);

        // Periodically log matching transaction execution in terminal console
        if (Math.random() > 0.6) {
          const matchedPrice = bot.pair.startsWith("BTC") 
            ? (65000 + (Math.random() - 0.5) * 400).toFixed(2)
            : bot.pair.startsWith("ETH")
            ? (3400 + (Math.random() - 0.5) * 30).toFixed(2)
            : (145 + (Math.random() - 0.5) * 2).toFixed(2);
            
          const actionLog = bot.type === "Grid"
            ? `[${new Date().toLocaleTimeString()}] [Grid-${bot.id}] matched limit order at $${matchedPrice}. PnL: ${newProfit >= 0 ? "+" : ""}${newProfit}%`
            : `[${new Date().toLocaleTimeString()}] [DCA-${bot.id}] cycle purchase filled at $${matchedPrice}. PnL: ${newProfit >= 0 ? "+" : ""}${newProfit}%`;

          setLogs(l => [...l, actionLog].slice(-30));
        }

        return {
          ...bot,
          runtime: runtimeStr,
          profit: newProfit,
          history: newHistory
        };
      }));
    }, 3000);

    return () => clearInterval(botTimer);
  }, []);

  // Handle grid bot generation
  const handleCreateGridBot = (e: React.FormEvent) => {
    e.preventDefault();
    const cost = parseFloat(gridInvestment);
    if (isNaN(cost) || cost <= 0) {
      triggerAlert("Please enter a valid investment amount.");
      return;
    }
    if (cost > walletBalance) {
      triggerAlert("Insufficient wallet balance for this bot collateral.");
      return;
    }

    // Deduct
    updateBalance(+(walletBalance - cost).toFixed(2));

    const newBot: Bot = {
      id: "BOT-" + Math.random().toString(36).substring(2, 6).toUpperCase(),
      name: `BTC Custom Grid (${gridCount})`,
      type: "Grid",
      status: "Running",
      pair: "BTC/USDT",
      investment: cost,
      runtime: "0h 01m",
      profit: 0.00,
      details: `Grids: ${gridCount} | Range: $${gridLower} - $${gridUpper}`,
      history: [0.0],
      startTime: Date.now()
    };

    setActiveBots(prev => [newBot, ...prev]);
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] [Grid System] Initialized Custom Grid Bot ${newBot.id} with $${cost} USDT.`]);
    setActiveTab("Active");
    triggerAlert("Grid Bot initialized successfully.");
  };

  // Handle DCA bot generation
  const handleCreateDcaBot = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(dcaAmount);
    if (isNaN(amt) || amt <= 0) {
      triggerAlert("Please enter a valid investment per cycle.");
      return;
    }
    if (amt > walletBalance) {
      triggerAlert("Insufficient balance for initial DCA run.");
      return;
    }

    updateBalance(+(walletBalance - amt).toFixed(2));

    const newBot: Bot = {
      id: "BOT-" + Math.random().toString(36).substring(2, 6).toUpperCase(),
      name: `${dcaCoin} DCA Strategy`,
      type: "DCA",
      status: "Running",
      pair: `${dcaCoin}/USDT`,
      investment: amt,
      runtime: "0h 01m",
      profit: 0.00,
      details: `$${amt} allocated ${dcaInterval}`,
      history: [0.0],
      startTime: Date.now()
    };

    setActiveBots(prev => [newBot, ...prev]);
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] [DCA System] Initialized DCA Bot ${newBot.id} investing $${amt} USDT ${dcaInterval}.`]);
    setActiveTab("Active");
    triggerAlert("DCA Bot started successfully.");
  };

  const handleTerminateBot = (id: string) => {
    const target = activeBots.find(b => b.id === id);
    if (target) {
      // refund initial collateral
      updateBalance(+(walletBalance + target.investment).toFixed(2));
      setActiveBots(prev => prev.filter(b => b.id !== id));
      setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] [Engine] Terminated bot ${id}. Collateral returned to account.`]);
      triggerAlert(`Bot ${id} terminated. Refunded $${target.investment} USDT.`);
    }
  };

  const triggerAlert = (msg: string) => {
    setAlertText(msg);
    setTimeout(() => setAlertText(""), 4000);
  };

  return (
    <div style={{ minHeight: "100vh", position: "relative", color: "var(--text-primary)", overflow: "hidden" }}>
      <SpaceBackground />
      <Header activeTab="coins" />

      {/* Main Panel Content */}
      <main style={{ position: "relative", zIndex: 10, maxWidth: 1200, margin: "40px auto", padding: "0 24px" }}>
        
        {/* Floating Banner */}
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
            <AlertTriangle size={18} /> {alertText}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32, flexWrap: "wrap", gap: 16 }}>
          <div>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--yellow)", textTransform: "uppercase", letterSpacing: 1.5 }}>Algorithmic Execution</span>
            <h1 style={{ fontSize: 32, fontWeight: 800, marginTop: 4, letterSpacing: -0.5 }}>Trading Bot Center</h1>
          </div>

          {/* Account Balance Widget */}
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

        {/* Dashboard Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 24 }} className="grid-responsive-bots">
          <div>
            {/* Nav Tabs */}
            <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
              {(["Grid", "DCA", "Active"] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setActiveTab(t)}
                  style={{
                    background: activeTab === t ? "var(--yellow)" : "rgba(255,255,255,0.03)",
                    border: activeTab === t ? "1px solid var(--yellow)" : "1px solid var(--border)",
                    color: activeTab === t ? "#000" : "var(--text-primary)",
                    padding: "10px 24px",
                    borderRadius: 8,
                    fontWeight: 700,
                    cursor: "pointer",
                    fontSize: 13,
                    transition: "all 0.2s"
                  }}
                >
                  {t === "Active" ? `Active Bots (${activeBots.length})` : `${t} Trading Bot`}
                </button>
              ))}
            </div>

            {/* TAB CONTENT: GRID BOT */}
            {activeTab === "Grid" && (
              <div style={{
                background: "rgba(6, 11, 30, 0.85)",
                border: "1px solid var(--border)",
                borderRadius: 16,
                padding: 28,
                backdropFilter: "blur(16px)"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
                  <Cpu color="var(--yellow)" size={22} />
                  <h2 style={{ fontSize: 18, fontWeight: 700 }}>Grid Trading Bot (Spot & Futures)</h2>
                </div>
                <p style={{ color: "var(--text-secondary)", fontSize: 13, lineHeight: 1.6, marginBottom: 24 }}>
                  Automate buying low and selling high in volatile ranges. The bot places limit buy and limit sell orders at equal spacing between your Upper and Lower boundaries.
                </p>

                <form onSubmit={handleCreateGridBot} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    <div>
                      <label style={{ fontSize: 11, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>LOWER BOUNDARY (USDT)</label>
                      <input
                        className="bn-input"
                        value={gridLower}
                        onChange={e => setGridLower(e.target.value)}
                        placeholder="e.g. 60000"
                        required
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>UPPER BOUNDARY (USDT)</label>
                      <input
                        className="bn-input"
                        value={gridUpper}
                        onChange={e => setGridUpper(e.target.value)}
                        placeholder="e.g. 70000"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <label style={{ fontSize: 11, color: "var(--text-secondary)" }}>NUMBER OF GRIDS</label>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "var(--yellow)" }}>{gridCount} Levels</span>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="100"
                      value={gridCount}
                      onChange={e => setGridCount(parseInt(e.target.value))}
                      style={{ width: "100%", accentColor: "var(--yellow)" }}
                    />
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--text-muted)", marginTop: 4 }}>
                      <span>5 levels (low cost)</span>
                      <span>100 levels (high frequency)</span>
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: 11, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>TOTAL COLLATERAL ALLOCATION (USDT)</label>
                    <input
                      className="bn-input"
                      value={gridInvestment}
                      onChange={e => setGridInvestment(e.target.value)}
                      placeholder="Min 100 USDT"
                      required
                    />
                  </div>

                  {/* Estimation Info */}
                  <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border-light)", borderRadius: 8, padding: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
                      <span style={{ color: "var(--text-secondary)" }}>Est. Profit Per Grid:</span>
                      <span style={{ fontWeight: 600, color: "var(--green)" }}>0.48% - 0.72% (Before fees)</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                      <span style={{ color: "var(--text-secondary)" }}>Liquidity Density:</span>
                      <span style={{ fontWeight: 600, color: "#fff" }}>High (Automated Rebalancing)</span>
                    </div>
                  </div>

                  <button type="submit" className="btn-green" style={{ width: "100%", height: 44, fontWeight: 800, fontSize: 14 }}>
                    Deploy Grid Bot
                  </button>
                </form>
              </div>
            )}

            {/* TAB CONTENT: DCA BOT */}
            {activeTab === "DCA" && (
              <div style={{
                background: "rgba(6, 11, 30, 0.85)",
                border: "1px solid var(--border)",
                borderRadius: 16,
                padding: 28,
                backdropFilter: "blur(16px)"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
                  <LineChart color="var(--yellow)" size={22} />
                  <h2 style={{ fontSize: 18, fontWeight: 700 }}>Dollar Cost Averaging (DCA) Bot</h2>
                </div>
                <p style={{ color: "var(--text-secondary)", fontSize: 13, lineHeight: 1.6, marginBottom: 24 }}>
                  Establish long-term positions using structured recurring buy orders. The DCA system automatically purchases designated tokens at steady intervals, smoothing out price volatility.
                </p>

                <form onSubmit={handleCreateDcaBot} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    <div>
                      <label style={{ fontSize: 11, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>SELECT COIN</label>
                      <select
                        className="bn-select"
                        value={dcaCoin}
                        onChange={e => setDcaCoin(e.target.value)}
                        style={{ height: 40, width: "100%" }}
                      >
                        <option value="BTC">BTC (Bitcoin)</option>
                        <option value="ETH">ETH (Ethereum)</option>
                        <option value="SOL">SOL (Solana)</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>FREQUENCY</label>
                      <select
                        className="bn-select"
                        value={dcaInterval}
                        onChange={e => setDcaInterval(e.target.value)}
                        style={{ height: 40, width: "100%" }}
                      >
                        <option value="Hourly">Every Hour</option>
                        <option value="4-Hours">Every 4 Hours</option>
                        <option value="Daily">Daily</option>
                        <option value="Weekly">Weekly</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: 11, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>INVESTMENT PER CYCLE (USDT)</label>
                    <input
                      className="bn-input"
                      value={dcaAmount}
                      onChange={e => setDcaAmount(e.target.value)}
                      placeholder="e.g. 50"
                      required
                    />
                  </div>

                  <button type="submit" className="btn-green" style={{ width: "100%", height: 44, fontWeight: 800, fontSize: 14 }}>
                    Start DCA Accumulator
                  </button>
                </form>
              </div>
            )}

            {/* TAB CONTENT: ACTIVE BOTS POOL */}
            {activeTab === "Active" && (
              <div style={{
                background: "rgba(6, 11, 30, 0.85)",
                border: "1px solid var(--border)",
                borderRadius: 16,
                padding: 24,
                backdropFilter: "blur(16px)"
              }}>
                <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 18 }}>Running Bots Portfolio</h2>
                
                {activeBots.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "48px 0", color: "var(--text-muted)", fontSize: 13 }}>
                    No automated bots currently active. Choose Grid or DCA tabs above to start.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    {activeBots.map(bot => (
                      <div
                        key={bot.id}
                        style={{
                          background: "rgba(255,255,255,0.02)",
                          border: "1px solid var(--border-light)",
                          borderRadius: 12,
                          padding: 20,
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          flexWrap: "wrap",
                          gap: 16
                        }}
                      >
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontSize: 11, color: "var(--yellow)", fontWeight: 700, background: "rgba(252,213,53,0.1)", padding: "2px 6px", borderRadius: 4 }}>
                              {bot.type}
                            </span>
                            <span style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>{bot.name}</span>
                            <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{bot.id}</span>
                          </div>
                          <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 6 }}>
                            {bot.details} • Active: <span style={{ color: "var(--cyan)" }}>{bot.runtime}</span>
                          </div>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
                          <div style={{ display: "flex", alignItems: "center", marginRight: 4 }}>
                            <BotSparkline history={bot.history} isUp={bot.profit >= 0} />
                          </div>
                          
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: 10, color: "var(--text-secondary)" }}>PROFIT (PnL)</div>
                            <div style={{ fontSize: 16, fontWeight: 750, color: bot.profit >= 0 ? "var(--green)" : "var(--red)" }}>
                              {bot.profit >= 0 ? "+" : ""}{bot.profit.toFixed(2)}%
                            </div>
                          </div>
                          
                          <button
                            onClick={() => handleTerminateBot(bot.id)}
                            style={{
                              background: "rgba(255,23,68,0.1)",
                              border: "1px solid rgba(255,23,68,0.3)",
                              borderRadius: 8,
                              padding: 8,
                              color: "var(--red)",
                              cursor: "pointer",
                              transition: "all 0.2s"
                            }}
                            title="Stop Bot & Release Collateral"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Side Module: Simulator Terminal */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            
            {/* Live Terminal Console */}
            <div style={{
              background: "#030712",
              border: "1px solid var(--border)",
              borderRadius: 16,
              padding: 20,
              flexGrow: 1,
              display: "flex",
              flexDirection: "column",
              height: 480
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, borderBottom: "1px solid var(--border-light)", paddingBottom: 10, marginBottom: 12, flexShrink: 0 }}>
                <Terminal size={16} color="var(--yellow)" />
                <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.5, color: "#fff", textTransform: "uppercase" }}>Real-time execution log</span>
              </div>

              <div
                ref={logTerminalRef}
                style={{
                  flexGrow: 1,
                  overflowY: "auto",
                  fontFamily: "monospace",
                  fontSize: 11,
                  lineHeight: 1.5,
                  color: "#10b981",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  paddingRight: 6
                }}
              >
                {logs.map((log, i) => (
                  <div key={i} style={{ wordBreak: "break-all" }}>{log}</div>
                ))}
              </div>
            </div>

            {/* Quick Tutorial Info */}
            <div style={{
              background: "rgba(252,213,53,0.03)",
              border: "1px solid rgba(252,213,53,0.15)",
              borderRadius: 12,
              padding: 16,
              fontSize: 12,
              lineHeight: 1.5
            }}>
              <h4 style={{ fontWeight: 700, color: "var(--yellow)", marginBottom: 6 }}>Algorithmic Trading Risks</h4>
              <p style={{ color: "var(--text-secondary)" }}>
                Automated grid and DCA software is subject to asset volatility and network liquidity changes. Always keep sufficient collateral bounds to prevent liquidation during flash crashes.
              </p>
            </div>

          </div>
        </div>

      </main>

      <style jsx global>{`
        .grid-responsive-bots {
          display: grid;
          grid-template-columns: 1fr 340px;
          gap: 24px;
        }
        @media (max-width: 900px) {
          .grid-responsive-bots {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
