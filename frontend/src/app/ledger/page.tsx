"use client";
import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { LogOut, Activity, AlertTriangle, Play, ShieldAlert, Cpu, CheckCircle } from "lucide-react";
import CloudExchangeLogo from "../components/CloudExchangeLogo";
import SpaceBackground from "../components/SpaceBackground";

interface AuditLog { time: string; debit: string; credit: string; amount: number; coin: string; root: string; status: "VERIFIED" | "MATCHED"; }
interface WashAlert { id: string; time: string; severity: "INFO" | "WARNING" | "CRITICAL"; msg: string; }

export default function LedgerAudit() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [isHalted, setIsHalted] = useState(false);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [washAlerts, setWashAlerts] = useState<WashAlert[]>([]);
  
  // Stats
  const [ingestedCount, setIngestedCount] = useState(1480291);
  const [ledgerVolume, setLedgerVolume] = useState(1284501290.45);
  const [merkleRoot, setMerkleRoot] = useState("0x3f9a72b8d0c6411e");

  // Sync auth
  useEffect(() => {
    const logged = localStorage.getItem("user_logged_in");
    const storedEmail = localStorage.getItem("username");
    if (logged === "true") {
      setIsLoggedIn(true);
      setUserEmail(storedEmail || "institutional_trader@cloud.ex");
    }

    const halted = localStorage.getItem("exchange_halted") === "true";
    setIsHalted(halted);

    const handleStorageChange = () => {
      const currentHalted = localStorage.getItem("exchange_halted") === "true";
      setIsHalted(currentHalted);
    };
    window.addEventListener("storage", handleStorageChange);

    // Seed initial logs
    const seedLogs: AuditLog[] = [];
    for (let i = 0; i < 15; i++) {
      seedLogs.push(generateAuditItem(i));
    }
    setAuditLogs(seedLogs);

    // Seed initial alerts
    setWashAlerts([
      { id: "WA-01", time: new Date(Date.now() - 30000).toLocaleTimeString([], { hour12: false }), severity: "WARNING", msg: "Cross-Order matching attempt detected on accounts BTC-901" },
      { id: "WA-02", time: new Date(Date.now() - 60000).toLocaleTimeString([], { hour12: false }), severity: "INFO", msg: "Cancellation frequency exceeding 50/sec on trading pair SOL/USDT" }
    ]);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  const handleToggleHalt = () => {
    const nextHalted = !isHalted;
    setIsHalted(nextHalted);
    localStorage.setItem("exchange_halted", String(nextHalted));
    window.dispatchEvent(new Event("storage"));
  };

  const handleLogout = () => {
    localStorage.removeItem("user_logged_in");
    localStorage.removeItem("username");
    setIsLoggedIn(false);
    setUserEmail("");
  };

  const generateAuditItem = (indexOffset = 0): AuditLog => {
    const coins = ["USDT", "BTC", "ETH", "SOL", "BNB"];
    const coin = coins[Math.floor(Math.random() * coins.length)];
    const val = +(Math.random() * 5 + 0.1).toFixed(coin === "USDT" ? 2 : 4);
    const mockTime = new Date(Date.now() - indexOffset * 4000).toLocaleTimeString([], { hour12: false });
    return {
      time: mockTime,
      debit: `ACC-${Math.floor(1000 + Math.random() * 9000)}`,
      credit: `ACC-${Math.floor(1000 + Math.random() * 9000)}`,
      amount: val,
      coin,
      root: "0x" + Math.random().toString(16).substring(2, 10),
      status: Math.random() > 0.3 ? "VERIFIED" : "MATCHED"
    };
  };

  // Continuous telemetry stream
  useEffect(() => {
    if (isHalted) return;
    const interval = setInterval(() => {
      // Add new log
      setAuditLogs(prev => [generateAuditItem(0), ...prev.slice(0, 19)]);
      setIngestedCount(c => c + Math.floor(Math.random() * 3 + 1));
      setLedgerVolume(v => v + Math.random() * 200);
      setMerkleRoot("0x" + Math.random().toString(16).substring(2, 10) + Math.random().toString(16).substring(2, 10));

      // Random wash alert
      if (Math.random() > 0.85) {
        const severities: ("INFO" | "WARNING" | "CRITICAL")[] = ["INFO", "WARNING", "CRITICAL"];
        const sev = severities[Math.floor(Math.random() * severities.length)];
        const pairs = ["BTC/USDT", "ETH/USDT", "SOL/USDT"];
        const pair = pairs[Math.floor(Math.random() * pairs.length)];
        const messages = [
          `Rapid micro-order cancellation detected on ${pair}`,
          `Self-matching wash-trading warning flagged on ${pair} desk`,
          `Abnormal volume delta in block cycle on ${pair}`
        ];
        
        setWashAlerts(prev => [
          {
            id: `WA-${Math.floor(10 + Math.random() * 90)}`,
            time: new Date().toLocaleTimeString([], { hour12: false }),
            severity: sev,
            msg: messages[Math.floor(Math.random() * messages.length)]
          },
          ...prev.slice(0, 9)
        ]);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [isHalted]);

  return (
    <div style={{ minHeight: "100vh", position: "relative", color: "var(--text-primary)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      
      {/* Stars, shooting stars, and moon background */}
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
              Cloud<span style={{ color: "var(--yellow)" }}>Exchange.in</span>
            </span>
          </Link>

          <nav style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Link href="/" className="btn-ghost" style={{ fontSize: 13, textDecoration: "none", color: "var(--text-primary)" }}>Home</Link>
            <Link href="/coins" className="btn-ghost" style={{ fontSize: 13, textDecoration: "none", color: "var(--text-primary)" }}>Coins</Link>
            <Link href="/trade" className="btn-ghost" style={{ fontSize: 13, textDecoration: "none", color: "var(--text-primary)" }}>Trade Terminal</Link>
            <Link href="/p2p" className="btn-ghost" style={{ fontSize: 13, textDecoration: "none", color: "var(--text-primary)" }}>P2P Fiat</Link>
            <Link href="/kyc" className="btn-ghost" style={{ fontSize: 13, textDecoration: "none", color: "var(--text-primary)" }}>KYC & Wallet</Link>
            <Link href="/ledger" className="btn-ghost active" style={{ fontSize: 13, textDecoration: "none", color: "var(--yellow)" }}>Ledger Audit</Link>
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
        
        {/* Intro header with manual Circuit Breaker control */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <span style={{ background: "var(--cyan-dim)", color: "var(--cyan)", padding: "4px 12px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>DOUBLE-ENTRY SETTLEMENT</span>
              <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Real-Time Matching Engine Audits</span>
            </div>
            <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-0.01em" }}>Ledger Integrity Telemetry</h1>
          </div>

          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <span style={{
              fontSize: 12,
              fontWeight: 700,
              padding: "6px 16px",
              borderRadius: 6,
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: isHalted ? "var(--red-dim)" : "var(--green-dim)",
              color: isHalted ? "var(--red)" : "var(--green)",
              border: `1px solid ${isHalted ? "var(--red)" : "var(--green)"}`
            }}>
              <span style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: isHalted ? "var(--red)" : "var(--green)",
                animation: isHalted ? "none" : "pulse 1.5s infinite"
              }} />
              {isHalted ? "MATCHING SYSTEM HALTED" : "SYSTEM RUNNING"}
            </span>

            <button onClick={handleToggleHalt} className="btn-yellow" style={{
              background: isHalted ? "var(--green)" : "var(--red)",
              color: isHalted ? "#000" : "#FFF",
              fontWeight: 800,
              fontSize: 12,
              padding: "10px 20px"
            }}>
              {isHalted ? "Resume Engine" : "Halt Engine (Circuit Breaker)"}
            </button>
          </div>
        </div>

        {/* Stats boxes */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20 }}>
          {[
            { label: "Transactions Ingested", value: ingestedCount.toLocaleString(), color: "var(--cyan)" },
            { label: "Ledger Volume Verified", value: `$${ledgerVolume.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDT`, color: "var(--yellow)" },
            { label: "Active Audit Replayers", value: "3 Shards", color: "var(--green)" },
            { label: "Audit Merkle Root", value: merkleRoot.slice(0, 16), color: "var(--text-primary)", font: "monospace" }
          ].map((s, i) => (
            <div key={i} style={{ background: "rgba(13, 27, 56, 0.45)", backdropFilter: "blur(12px)", border: "1px solid var(--border)", borderRadius: 12, padding: 20 }}>
              <div style={{ fontSize: 10, color: "var(--text-secondary)", fontWeight: 700 }}>{s.label}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: s.color, marginTop: 8, fontFamily: s.font || "inherit" }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Content area: Real-time Ledger Feed (Left) & Wash Trading Detections (Right) */}
        <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 24, alignItems: "flex-start" }}>
          
          {/* LEDGER STREAM */}
          <div style={{ background: "rgba(13, 27, 56, 0.45)", backdropFilter: "blur(12px)", border: "1px solid var(--border)", borderRadius: 12, padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-light)", paddingBottom: 12 }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, display: "flex", alignItems: "center", gap: 8 }}>
                <Activity size={18} color="var(--cyan)" /> Transaction Ledger Feed
              </h3>
              <span style={{ fontSize: 10, color: "var(--text-secondary)" }}>Refreshed dynamically</span>
            </div>

            <table style={{ width: "100%", fontSize: 11, textAlign: "left", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ color: "var(--text-secondary)", borderBottom: "1px solid var(--border-light)" }}>
                  <th style={{ padding: "8px 4px" }}>Timestamp</th>
                  <th>Debit Account</th>
                  <th>Credit Account</th>
                  <th>Value Transferred</th>
                  <th>Merkle Leaf</th>
                  <th style={{ textAlign: "right" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log, idx) => (
                  <tr key={idx} style={{
                    borderBottom: "1px solid rgba(255,255,255,0.01)",
                    opacity: isHalted ? 0.6 : 1,
                    transition: "opacity 0.3s"
                  }} className="pair-row">
                    <td style={{ padding: "10px 4px", color: "var(--text-secondary)" }}>{log.time}</td>
                    <td style={{ color: "var(--text-primary)", fontWeight: 600 }}>{log.debit}</td>
                    <td style={{ color: "var(--text-primary)", fontWeight: 600 }}>{log.credit}</td>
                    <td style={{ color: "var(--yellow)", fontWeight: 700 }}>{log.amount} {log.coin}</td>
                    <td style={{ fontFamily: "monospace", color: "var(--cyan)" }}>{log.root}</td>
                    <td style={{ textAlign: "right" }}>
                      <span style={{
                        fontSize: 9,
                        fontWeight: 800,
                        padding: "2px 6px",
                        borderRadius: 3,
                        background: log.status === "VERIFIED" ? "var(--green-dim)" : "var(--cyan-dim)",
                        color: log.status === "VERIFIED" ? "var(--green)" : "var(--cyan)"
                      }}>{log.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* WASH TRADING TELEMETRY LOG */}
          <div style={{ background: "rgba(13, 27, 56, 0.45)", backdropFilter: "blur(12px)", border: "1px solid var(--border)", borderRadius: 12, padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-light)", paddingBottom: 12 }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, display: "flex", alignItems: "center", gap: 8 }}>
                <AlertTriangle size={18} color="var(--red)" /> Surveillance Telemetry Logs
              </h3>
              <span style={{ fontSize: 10, color: "var(--red)", background: "var(--red-dim)", padding: "1px 6px", borderRadius: 3, fontWeight: 700 }}>LIVE</span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12, maxHeight: 420, overflowY: "auto" }}>
              {washAlerts.map((alert) => (
                <div key={alert.id} style={{
                  background: "rgba(0,0,0,0.15)",
                  border: `1px solid ${alert.severity === "CRITICAL" ? "var(--red)" : alert.severity === "WARNING" ? "var(--yellow)" : "var(--border)"}`,
                  borderRadius: 8,
                  padding: 12,
                  display: "flex",
                  flexDirection: "column",
                  gap: 6
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10 }}>
                    <span style={{
                      fontWeight: 800,
                      color: alert.severity === "CRITICAL" ? "var(--red)" : alert.severity === "WARNING" ? "var(--yellow)" : "var(--text-secondary)"
                    }}>{alert.severity} ALERT - {alert.id}</span>
                    <span style={{ color: "var(--text-muted)" }}>{alert.time}</span>
                  </div>
                  <p style={{ fontSize: 11, color: "var(--text-primary)", lineHeight: 1.4 }}>{alert.msg}</p>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

      <style jsx global>{`
        @keyframes pulse {
          0% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.15); opacity: 1; }
          100% { transform: scale(1); opacity: 0.8; }
        }
      `}</style>

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
          <span>© 2026 CloudExchange Group. Wash Trading Surveillance module active.</span>
          <div style={{ display: "flex", gap: 16 }}>
            <Link href="/" style={{ color: "var(--text-secondary)", textDecoration: "none" }}>Back to Home</Link>
            <a href="#" style={{ color: "var(--text-secondary)", textDecoration: "none" }}>Risk Disclaimer</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
