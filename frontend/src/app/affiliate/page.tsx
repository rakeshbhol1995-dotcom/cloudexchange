"use client";
import React, { useState, useEffect } from "react";
import { Users, Link as LinkIcon, Award, DollarSign, Wallet, Percent, ShieldCheck, ArrowUpRight } from "lucide-react";
import Header from "../components/Header";
import SpaceBackground from "../components/SpaceBackground";

interface Referree {
  id: string;
  username: string;
  tier: 1 | 2;
  registeredAt: string;
  volume30d: number;
  commissionsPaid: number;
}

export default function AffiliatePage() {
  const [walletBalance, setWalletBalance] = useState(15740.50);
  const [alertText, setAlertText] = useState("");
  const [copied, setCopied] = useState(false);

  // Referral Calculator states
  const [referredTraders, setReferredTraders] = useState(25);
  const [avgDailyVolume, setAvgDailyVolume] = useState(5000);
  const [selectedTier, setSelectedTier] = useState<1 | 2>(1);

  // Mock ledger data
  const [invitees] = useState<Referree[]>([
    { id: "REF-912", username: "AlphaCrypto", tier: 1, registeredAt: "2026-05-15", volume30d: 48500, commissionsPaid: 116.40 },
    { id: "REF-390", username: "MoonHodler", tier: 1, registeredAt: "2026-05-19", volume30d: 125000, commissionsPaid: 300.00 },
    { id: "REF-004", username: "WhaleSlayer", tier: 2, registeredAt: "2026-05-22", volume30d: 34000, commissionsPaid: 40.80 },
    { id: "REF-781", username: "BitcoinGuru", tier: 1, registeredAt: "2026-05-25", volume30d: 12000, commissionsPaid: 28.80 },
    { id: "REF-502", username: "SolSlinger", tier: 2, registeredAt: "2026-05-27", volume30d: 22000, commissionsPaid: 26.40 }
  ]);

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

  // Calculate estimated earnings
  // Trading Fee is 0.08%.
  // Tier 1 receives 30% of fees. Tier 2 receives 15% of fees.
  const commissionPercentage = selectedTier === 1 ? 0.30 : 0.15;
  const estMonthlyEarnings = referredTraders * avgDailyVolume * 30 * 0.0008 * commissionPercentage;

  const handleCopyLink = () => {
    navigator.clipboard.writeText("https://cloudexchange.in/register?ref=CE-849X2");
    setCopied(true);
    triggerAlert("Referral link copied to clipboard.");
    setTimeout(() => setCopied(false), 3000);
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
            <ShieldCheck size={18} /> {alertText}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 36, flexWrap: "wrap", gap: 16 }}>
          <div>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--yellow)", textTransform: "uppercase", letterSpacing: 1.5 }}>Partner Network</span>
            <h1 style={{ fontSize: 32, fontWeight: 800, marginTop: 4, letterSpacing: -0.5 }}>Affiliate Ledger</h1>
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
              <div style={{ fontSize: 10, color: "var(--text-secondary)" }}>TOTAL BALANCE</div>
              <div style={{ fontSize: 16, fontWeight: 750, color: "#fff" }}>${walletBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT</div>
            </div>
          </div>
        </div>

        {/* Top summary cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 20, marginBottom: 32 }}>
          <div style={{ background: "rgba(6, 11, 30, 0.85)", border: "1px solid var(--border)", borderRadius: 16, padding: 24 }}>
            <div style={{ color: "var(--text-secondary)", fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>TOTAL REFERRALS</div>
            <div style={{ fontSize: 28, fontWeight: 850, color: "#fff", marginTop: 8 }}>18 Traders</div>
            <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 6 }}>12 Tier 1 • 6 Tier 2</div>
          </div>
          <div style={{ background: "rgba(6, 11, 30, 0.85)", border: "1px solid var(--border)", borderRadius: 16, padding: 24 }}>
            <div style={{ color: "var(--text-secondary)", fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>COMMISSION RATE</div>
            <div style={{ fontSize: 28, fontWeight: 850, color: "var(--yellow)", marginTop: 8 }}>30% / 15%</div>
            <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 6 }}>Direct Tier 1 / Sub-tier Tier 2</div>
          </div>
          <div style={{ background: "rgba(6, 11, 30, 0.85)", border: "1px solid var(--border)", borderRadius: 16, padding: 24 }}>
            <div style={{ color: "var(--text-secondary)", fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>TOTAL COMMISSIONS PAID</div>
            <div style={{ fontSize: 28, fontWeight: 850, color: "var(--green)", marginTop: 8 }}>$512.40 USDT</div>
            <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 6 }}>Settled in real-time to wallet</div>
          </div>
        </div>

        {/* Share Section and Calculator */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, marginBottom: 32 }} className="grid-responsive-affiliate">
          
          {/* Share Links */}
          <div style={{
            background: "rgba(6, 11, 30, 0.85)",
            border: "1px solid var(--border)",
            borderRadius: 16,
            padding: 24,
            backdropFilter: "blur(16px)"
          }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 18, display: "flex", alignItems: "center", gap: 8 }}>
              <LinkIcon size={20} color="var(--yellow)" /> Share Referral Link
            </h2>
            <p style={{ color: "var(--text-secondary)", fontSize: 12, lineHeight: 1.5, marginBottom: 20 }}>
              Invite friends to trade on CloudExchange and earn up to 30% of their maker/taker trading fees. Settlement is processed in real-time directly to your account balance.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ fontSize: 10, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>PARTNER REFERRAL URL</label>
                <div style={{ display: "flex", gap: 10 }}>
                  <input
                    className="bn-input"
                    value="https://cloudexchange.in/register?ref=CE-849X2"
                    readOnly
                    style={{ height: 38, flexGrow: 1, background: "rgba(0,0,0,0.25)" }}
                  />
                  <button
                    onClick={handleCopyLink}
                    className="btn-green"
                    style={{ height: 38, padding: "0 20px", fontWeight: 700, fontSize: 13 }}
                  >
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
              </div>

              <div>
                <label style={{ fontSize: 10, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>PROMOTIONAL REFERRAL CODE</label>
                <input
                  className="bn-input"
                  value="CE-849X2"
                  readOnly
                  style={{ height: 38, width: "100%", background: "rgba(0,0,0,0.25)" }}
                />
              </div>
            </div>
          </div>

          {/* Dynamic Calculator */}
          <div style={{
            background: "rgba(6, 11, 30, 0.85)",
            border: "1px solid var(--border)",
            borderRadius: 16,
            padding: 24,
            backdropFilter: "blur(16px)"
          }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 18, display: "flex", alignItems: "center", gap: 8 }}>
              <Percent size={20} color="var(--yellow)" /> Earnings Estimator
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 6 }}>
                  <span style={{ color: "var(--text-secondary)" }}>REFERRED TRADERS</span>
                  <span style={{ fontWeight: 700, color: "#fff" }}>{referredTraders} Active Traders</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="200"
                  value={referredTraders}
                  onChange={e => setReferredTraders(parseInt(e.target.value))}
                  style={{ width: "100%", accentColor: "var(--yellow)" }}
                />
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 6 }}>
                  <span style={{ color: "var(--text-secondary)" }}>AVERAGE DAILY VOL PER TRADER</span>
                  <span style={{ fontWeight: 700, color: "#fff" }}>${avgDailyVolume.toLocaleString()} USDT</span>
                </div>
                <input
                  type="range"
                  min="500"
                  max="25000"
                  step="500"
                  value={avgDailyVolume}
                  onChange={e => setAvgDailyVolume(parseInt(e.target.value))}
                  style={{ width: "100%", accentColor: "var(--yellow)" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, alignItems: "center" }}>
                <div>
                  <label style={{ fontSize: 10, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>COMMISSION LEVEL</label>
                  <select
                    className="bn-select"
                    value={selectedTier}
                    onChange={e => setSelectedTier(parseInt(e.target.value) as 1 | 2)}
                    style={{ height: 38, width: "100%" }}
                  >
                    <option value="1">Tier 1 (30% Commission)</option>
                    <option value="2">Tier 2 (15% Commission)</option>
                  </select>
                </div>
                
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 10, color: "var(--text-secondary)" }}>EST. MONTHLY PAYOUT</div>
                  <div style={{ fontSize: 20, fontWeight: 850, color: "var(--green)" }}>
                    ${estMonthlyEarnings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Invitees list */}
        <div style={{
          background: "rgba(6, 11, 30, 0.85)",
          border: "1px solid var(--border)",
          borderRadius: 16,
          padding: 24,
          backdropFilter: "blur(16px)"
        }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 18, display: "flex", alignItems: "center", gap: 8 }}>
            <Users size={20} color="var(--yellow)" /> Referral Commissions Ledger
          </h2>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 600 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-light)", textAlign: "left", fontSize: 11, color: "var(--text-secondary)" }}>
                  <th style={{ padding: "10px 8px" }}>INVITEE ID</th>
                  <th style={{ padding: "10px 8px" }}>TIER</th>
                  <th style={{ padding: "10px 8px" }}>REGISTERED DATE</th>
                  <th style={{ padding: "10px 8px" }}>30D VOL GENERATED</th>
                  <th style={{ padding: "10px 8px", textAlign: "right" }}>TOTAL PAID COMMISSIONS</th>
                </tr>
              </thead>
              <tbody>
                {invitees.map(invite => (
                  <tr key={invite.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.03)", fontSize: 13 }}>
                    <td style={{ padding: "14px 8px", fontWeight: 700, color: "#fff" }}>{invite.username}</td>
                    <td style={{ padding: "14px 8px" }}>
                      <span style={{ fontSize: 10, fontWeight: 700, background: "rgba(252,213,53,0.1)", color: "var(--yellow)", padding: "2px 6px", borderRadius: 4 }}>
                        Tier {invite.tier}
                      </span>
                    </td>
                    <td style={{ padding: "14px 8px", color: "var(--text-secondary)" }}>{invite.registeredAt}</td>
                    <td style={{ padding: "14px 8px", color: "var(--text-secondary)" }}>${invite.volume30d.toLocaleString()} USDT</td>
                    <td style={{ padding: "14px 8px", textAlign: "right", fontWeight: 750, color: "var(--green)" }}>
                      +${invite.commissionsPaid.toFixed(2)} USDT
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </main>

      <style jsx global>{`
        .grid-responsive-affiliate {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 32px;
        }
        @media (max-width: 900px) {
          .grid-responsive-affiliate {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
