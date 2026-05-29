"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Activity, TrendingUp, ShieldCheck, Cpu, ArrowRight, LogOut, CheckCircle, Smartphone, HelpCircle } from "lucide-react";
import CloudExchangeLogo from "./components/CloudExchangeLogo";
import SpaceBackground from "./components/SpaceBackground";

const MARKETS = [
  { symbol: "BTC", name: "Bitcoin", price: 65050, change: 2.45, vol: "$836M", icon: "₿" },
  { symbol: "ETH", name: "Ethereum", price: 3420, change: -1.20, vol: "$421M", icon: "Ξ" },
  { symbol: "SOL", name: "Solana", price: 168, change: 3.12, vol: "$210M", icon: "◎" },
  { symbol: "BNB", name: "BNB", price: 641, change: 0.85, vol: "$89M", icon: "B" },
  { symbol: "XRP", name: "XRP", price: 0.61, change: -0.40, vol: "$130M", icon: "✕" },
  { symbol: "DOGE", name: "Dogecoin", price: 0.165, change: 5.20, vol: "$98M", icon: "Ð" },
];

const FAQS = [
  { q: "What is CloudExchange?", a: "CloudExchange is a Tier-1 institutional-grade cryptocurrency exchange featuring a sub-millisecond memory-mapped order matching engine, real-time double-entry ledger verification, and custom P2P escrow mechanisms." },
  { q: "How do I secure my account?", a: "We support industry-standard FIDO2/WebAuthn Passkeys, Google Authenticator (TOTP), SMS codes, and strict device fingerprinting to protect user accounts from unauthorized access." },
  { q: "What is the P2P Escrow and Anti-Fraud receipt check?", a: "Our peer-to-peer trading system automatically locks the seller's assets in escrow. The anti-fraud analyzer parses uploaded payment receipts for metadata details and template duplicates to block scam attempts instantly." },
  { q: "What are the trading fees?", a: "Spot maker/taker fees start at just 0.08%, which can be reduced dynamically through our VIP Tier program depending on your 30-day trading volume." },
  { q: "How does the Liveness KYC verification work?", a: "Our identity portal includes a real-time web camera selfie check with dynamic gesture prompts (such as blinking or smiling) to guarantee physical presence and prevent identity forgery." }
];

export default function HomePage() {
  const [email, setEmail] = useState("");
  const [btcPrice, setBtcPrice] = useState(65050);
  const [faqOpen, setFaqOpen] = useState<number | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState("");

  // Sync login status on mount
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

  useEffect(() => {
    const iv = setInterval(() => {
      setBtcPrice(p => Math.max(1000, +(p + (Math.random() - 0.48) * 15).toFixed(2)));
    }, 800);
    return () => clearInterval(iv);
  }, []);

  return (
    <div style={{ minHeight: "100vh", position: "relative", color: "var(--text-primary)", overflow: "hidden" }}>
      
      {/* Canvas space background behind sections */}
      <SpaceBackground />

      {/* ─── HEADER ─── */}
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
          {/* Rebranded Premium CloudExchange Logo */}
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
            <CloudExchangeLogo size={32} />
            <span style={{
              fontSize: 20,
              fontWeight: 800,
              background: "linear-gradient(90deg, #FFFFFF 0%, #D1D5DB 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              letterSpacing: -0.5
            }}>
              Cloud<span style={{ color: "var(--yellow)" }}>Exchange</span>
            </span>
          </Link>

          {/* Navigation Links */}
          <nav style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Link href="/coins" className="btn-ghost" style={{ fontSize: 13, textDecoration: "none", color: "var(--text-primary)" }}>Coins</Link>
            <Link href="/trade" className="btn-ghost" style={{ fontSize: 13, textDecoration: "none", color: "var(--text-primary)" }}>Trade</Link>
            <Link href="/p2p" className="btn-ghost" style={{ fontSize: 13, textDecoration: "none", color: "var(--text-primary)" }}>P2P Fiat</Link>
            <Link href="/kyc" className="btn-ghost" style={{ fontSize: 13, textDecoration: "none", color: "var(--text-primary)" }}>KYC & Wallet</Link>
            <Link href="/ledger" className="btn-ghost" style={{ fontSize: 13, textDecoration: "none", color: "var(--text-primary)" }}>Ledger Audit</Link>
          </nav>
        </div>

        {/* Right side controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {isLoggedIn ? (
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--green)" }} />
                <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{userEmail}</span>
              </div>
              <button onClick={handleLogout} className="btn-outline" style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 14px",
                fontSize: 12,
                cursor: "pointer",
                borderRadius: 6
              }}>
                <LogOut size={14} /> Log Out
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Link href="/login" style={{
                color: "var(--text-primary)",
                fontWeight: 600,
                fontSize: 13,
                padding: "8px 18px",
                borderRadius: 8,
                textDecoration: "none",
                border: "1px solid var(--border)"
              }}>Log In</Link>
              <Link href="/register" style={{
                background: "var(--yellow)",
                color: "#000",
                fontWeight: 700,
                fontSize: 13,
                padding: "8px 18px",
                borderRadius: 8,
                textDecoration: "none"
              }}>Sign Up</Link>
            </div>
          )}
        </div>
      </header>

      {/* ─── HERO SECTION ─── */}
      <section style={{
        background: "radial-gradient(ellipse at top, rgba(12, 26, 58, 0.4) 0%, rgba(4, 8, 20, 0.1) 70%)",
        padding: "80px 0 72px",
        borderBottom: "1px solid var(--border-light)"
      }}>
        <div className="container-xl" style={{ display: "flex", gap: 64, alignItems: "center" }}>
          {/* Left Hero Text */}
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
              <div className="trust-badge" style={{ borderColor: "var(--cyan)", color: "var(--cyan)", background: "var(--cyan-dim)" }}>
                ⚡ Sub-1ms Ingestion Latency
              </div>
              <div className="trust-badge" style={{ borderColor: "var(--yellow)", color: "var(--yellow)", background: "var(--yellow-dim)" }}>
                🛡️ Sharded Audit Ledger Guarantee
              </div>
            </div>
            
            <h1 style={{
              fontSize: 48,
              fontWeight: 900,
              lineHeight: 1.15,
              marginBottom: 16,
              letterSpacing: "-0.02em"
            }}>
              High-Frequency <br />
              Digital Asset <span style={{ color: "var(--yellow)", textShadow: "0 0 20px var(--yellow-dim)" }}>Exchange Engine</span>
            </h1>
            
            <p style={{ fontSize: 15, color: "var(--text-secondary)", marginBottom: 36, lineHeight: 1.7, maxWidth: 520 }}>
              CloudExchange delivers institutional-grade order matching, real-time double-entry settlement verification, secure P2P escrow with anti-fraud metadata checks, and cryptographic passkey authentication.
            </p>

            {/* Functional register input redirection */}
            {!isLoggedIn && (
              <div style={{ display: "flex", gap: 8, maxWidth: 480, marginBottom: 24 }}>
                <input
                  className="bn-input"
                  type="text"
                  placeholder="Enter email to get started"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  style={{ flex: 1, border: "1px solid var(--border)" }}
                />
                <Link href={`/register?email=${encodeURIComponent(email)}`} className="btn-yellow" style={{
                  padding: "12px 28px",
                  borderRadius: 8,
                  textDecoration: "none",
                  display: "flex",
                  alignItems: "center",
                  fontWeight: 700,
                  fontSize: 14
                }}>
                  Register &rsaquo;
                </Link>
              </div>
            )}

            <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
              <Link href="/trade" className="btn-yellow" style={{ textDecoration: "none", padding: "12px 24px" }}>Start Trading</Link>
              <Link href="/p2p" style={{ color: "var(--cyan)", textDecoration: "none", display: "flex", alignItems: "center", gap: 6, fontWeight: 600 }}>
                Explore P2P Escrow <ArrowRight size={16} />
              </Link>
            </div>
          </div>

          {/* Right Live market card */}
          <div style={{
            width: 400,
            background: "rgba(13, 27, 56, 0.45)",
            borderRadius: 16,
            border: "1px solid var(--border)",
            backdropFilter: "blur(12px)",
            overflow: "hidden",
            boxShadow: "0 10px 30px rgba(0,0,0,0.5)"
          }}>
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "16px 20px",
              borderBottom: "1px solid var(--border-light)",
              background: "rgba(10, 17, 40, 0.6)"
            }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>Live Markets</span>
              <span style={{ fontSize: 11, color: "var(--green)" }} className="glow-green">● ENGINE ONLINE</span>
            </div>
            
            <div style={{ padding: "8px 0" }}>
              {MARKETS.map((m) => {
                const isBtc = m.symbol === "BTC";
                const activePrice = isBtc ? btcPrice : m.price;
                return (
                  <Link key={m.symbol} href="/trade" style={{ textDecoration: "none" }}>
                    <div style={{
                      display: "grid",
                      gridTemplateColumns: "1.2fr 1fr 1fr",
                      padding: "14px 20px",
                      borderBottom: "1px solid rgba(255,255,255,0.02)",
                      alignItems: "center",
                      cursor: "pointer"
                    }}
                    className="pair-row">
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{
                          width: 32,
                          height: 32,
                          background: "var(--bg-hover)",
                          borderRadius: "50%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 14,
                          color: "var(--yellow)",
                          fontWeight: "bold"
                        }}>
                          {m.icon}
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>{m.symbol}/USDT</div>
                          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{m.name}</div>
                        </div>
                      </div>
                      <div style={{ textAlign: "right", fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
                        ${activePrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <span style={{
                          fontSize: 12,
                          fontWeight: 700,
                          color: m.change >= 0 ? "var(--green)" : "var(--red)",
                          padding: "3px 8px",
                          borderRadius: 4,
                          background: m.change >= 0 ? "var(--green-dim)" : "var(--red-dim)"
                        }}>
                          {m.change >= 0 ? "+" : ""}{m.change.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ─── CONTINUOUS RUNNING TICKER BAR ─── */}
      <div className="bn-ticker-bar" style={{ background: "rgba(10, 17, 40, 0.5)", backdropFilter: "blur(4px)", borderBottom: "1px solid var(--border)" }}>
        <div className="bn-ticker-content">
          {[...MARKETS, ...MARKETS].map((m, i) => (
            <div key={i} className="bn-ticker-item" style={{ borderRight: "1px solid var(--border)" }}>
              <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>{m.symbol}/USDT</span>
              <span style={{ color: m.symbol === "BTC" ? (btcPrice >= 65050 ? "var(--green)" : "var(--red)") : "var(--text-primary)" }}>
                ${(m.symbol === "BTC" ? btcPrice : m.price).toLocaleString()}
              </span>
              <span style={{ color: m.change >= 0 ? "var(--green)" : "var(--red)", fontSize: 11 }}>
                {m.change >= 0 ? "+" : ""}{m.change}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ─── INSTITUTIONAL CAPABILITIES ─── */}
      <section style={{ padding: "80px 0", background: "rgba(10, 17, 40, 0.4)", backdropFilter: "blur(6px)" }}>
        <div className="container-xl">
          <h2 style={{ fontSize: 32, fontWeight: 800, textAlign: "center", marginBottom: 12 }}>
            Engineered for Sub-Microsecond Performance
          </h2>
          <p style={{ fontSize: 15, color: "var(--text-secondary)", textAlign: "center", marginBottom: 56, maxWidth: 640, margin: "0 auto 56px" }}>
            CloudExchange incorporates high-performance systems architecture directly into our user interfaces.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
            {[
              {
                icon: <Cpu size={32} color="var(--cyan)" />,
                title: "Rust Matching Core",
                desc: "Pre-allocated flat vectors and cache-aligned memory access structures process 2.5 million transactions per second with microsecond tick times."
              },
              {
                icon: <ShieldCheck size={32} color="var(--green)" />,
                title: "Cryptographic Guardrails",
                desc: "Integrated biometric WebAuthn client setups bypass standard session hijack methods. Multi-factor checks verify administrative action logs."
              },
              {
                icon: <Activity size={32} color="var(--yellow)" />,
                title: "Double-Entry Ledger Audit",
                desc: "Every asset balance update undergoes verification via parallel shadow replay executors checking transaction balance integrity."
              },
              {
                icon: <Smartphone size={32} color="var(--cyan)" />,
                title: "Escrow Receipt Scanner",
                desc: "P2P escrow system locks digital tokens securely. Checks block receipt image forgery through perceptual fingerprint scanning."
              },
              {
                icon: <HelpCircle size={32} color="var(--green)" />,
                title: "Liveness Biometrics",
                desc: "Dynamic selfie check prompts users for live physical movements, analyzing webcam frames locally to approve Verification Tiers."
              },
              {
                icon: <CheckCircle size={32} color="var(--yellow)" />,
                title: "Surveillance Telemetry",
                desc: "Wash-trading detection monitors cancellation counts and order book frequency to flag potential spoofing or self-matching instantly."
              }
            ].map((f, i) => (
              <div key={i} className="bn-card" style={{
                padding: 32,
                background: "rgba(13, 27, 56, 0.45)",
                border: "1px solid var(--border)",
                backdropFilter: "blur(8px)",
                transition: "transform 0.2s",
                cursor: "default"
              }}
              onMouseEnter={e => e.currentTarget.style.transform = "translateY(-4px)"}
              onMouseLeave={e => e.currentTarget.style.transform = "none"}>
                <div style={{ marginBottom: 20 }}>{f.icon}</div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", marginBottom: 12 }}>{f.title}</h3>
                <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.7 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── SAFU SECURITY & PROOF OF RESERVES ─── */}
      <section style={{ padding: "80px 0", background: "transparent" }}>
        <div className="container-xl" style={{ display: "flex", gap: 64, alignItems: "center" }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--yellow)", letterSpacing: 2, marginBottom: 12 }}>
              100% COLLATERAL GUARANTEE
            </div>
            <h2 style={{ fontSize: 32, fontWeight: 800, color: "var(--text-primary)", marginBottom: 20 }}>
              Proof of Reserves Audit & SAFU Fund
            </h2>
            <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.8, marginBottom: 28 }}>
              We maintain absolute transparency. Our on-chain balances are verifiable via daily generated Merkle Tree hashes. In addition, 10% of all transaction fees are allocated to our Secure Asset Fund for Users (SAFU) insurance pool.
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              {[
                { count: "1.2x", text: "Minimum collateral backing ratio" },
                { count: "100%", text: "Fully audited reserved backing" },
                { count: "Daily", text: "Merkle Tree cryptographic audits" },
                { count: "< 850ns", text: "Ingestion Latency Matching Engine" }
              ].map((s, i) => (
                <div key={i} style={{ borderLeft: "2px solid var(--cyan)", paddingLeft: 16 }}>
                  <div style={{ fontSize: 24, fontWeight: 800, color: "var(--text-primary)" }}>{s.count}</div>
                  <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4 }}>{s.text}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ flex: 1, display: "flex", justifyContent: "flex-end" }}>
            <div style={{
              width: "100%",
              maxWidth: 440,
              padding: 40,
              borderRadius: 20,
              background: "linear-gradient(135deg, rgba(13, 27, 56, 0.75) 0%, rgba(20, 35, 75, 0.35) 100%)",
              border: "1px solid var(--border)",
              backdropFilter: "blur(12px)",
              textAlign: "center"
            }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🛡️</div>
              <h3 style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)", marginBottom: 12 }}>
                SAFU Safety Activated
              </h3>
              <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.7, marginBottom: 24 }}>
                User balances are isolated from exchange operating assets. Circuit breakers suspend settlement cycles in the event of an engine anomaly.
              </p>
              <Link href="/ledger" className="btn-yellow" style={{ textDecoration: "none", padding: "10px 24px" }}>
                Verify Ledger Balance
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FAQ SECTION ─── */}
      <section style={{ padding: "80px 0", background: "rgba(10, 17, 40, 0.4)", backdropFilter: "blur(6px)", borderTop: "1px solid var(--border)" }}>
        <div className="container-xl" style={{ maxWidth: 800 }}>
          <h2 style={{ fontSize: 32, fontWeight: 800, textAlign: "center", marginBottom: 16 }}>
            Frequently Asked Questions
          </h2>
          <p style={{ fontSize: 15, color: "var(--text-secondary)", textAlign: "center", marginBottom: 48 }}>
            Clear explanations of exchange core operations and security frameworks.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {FAQS.map((faq, i) => (
              <div key={i} style={{
                background: "rgba(13, 27, 56, 0.45)",
                borderRadius: 12,
                border: "1px solid var(--border)",
                backdropFilter: "blur(8px)",
                overflow: "hidden"
              }}>
                <button
                  onClick={() => setFaqOpen(faqOpen === i ? null : i)}
                  style={{
                    width: "100%",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "20px 24px",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    textAlign: "left",
                    color: "var(--text-primary)"
                  }}
                >
                  <span style={{ fontSize: 15, fontWeight: 700 }}>{faq.q}</span>
                  <span style={{ fontSize: 20, color: "var(--cyan)", fontWeight: "300" }}>
                    {faqOpen === i ? "−" : "+"}
                  </span>
                </button>
                {faqOpen === i && (
                  <div style={{
                    padding: "0 24px 20px 24px",
                    fontSize: 13,
                    color: "var(--text-secondary)",
                    lineHeight: 1.8,
                    borderTop: "1px solid rgba(255,255,255,0.02)",
                    paddingTop: 16
                  }}>
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA BANNER ─── */}
      <section style={{
        padding: "80px 0",
        background: "radial-gradient(circle at center, rgba(13, 34, 72, 0.4) 0%, rgba(4, 8, 20, 0.1) 100%)",
        borderTop: "1px solid var(--border)",
        textAlign: "center"
      }}>
        <div className="container-xl">
          <h2 style={{ fontSize: 36, fontWeight: 900, marginBottom: 12 }}>
            Join the Next Era of Digital Trading
          </h2>
          <p style={{ fontSize: 15, color: "var(--text-secondary)", marginBottom: 32, maxWidth: 540, margin: "0 auto 32px" }}>
            Create an account in less than two minutes and access premium charting, API connectivity, and fee-free peer-to-peer liquidity matching.
          </p>

          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            {isLoggedIn ? (
              <Link href="/trade" className="btn-yellow" style={{ textDecoration: "none", padding: "14px 40px", fontSize: 15 }}>
                Enter Trading Terminal
              </Link>
            ) : (
              <>
                <Link href="/register" className="btn-yellow" style={{ textDecoration: "none", padding: "14px 40px", fontSize: 15 }}>
                  Get Started Now
                </Link>
                <Link href="/login" className="btn-outline" style={{ textDecoration: "none", padding: "14px 40px", fontSize: 15 }}>
                  Log In to Account
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer style={{
        background: "rgba(10, 17, 40, 0.75)",
        backdropFilter: "blur(12px)",
        borderTop: "1px solid var(--border)",
        padding: "64px 0 32px",
        fontSize: 13,
        color: "var(--text-secondary)"
      }}>
        <div className="container-xl">
          <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr 1fr", gap: 48, marginBottom: 48 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <CloudExchangeLogo size={24} />
                <span style={{ fontSize: 18, fontWeight: 800, color: "var(--text-primary)" }}>
                  Cloud<span style={{ color: "var(--yellow)" }}>Exchange</span>
                </span>
              </div>
              <p style={{ lineHeight: 1.8, marginBottom: 24 }}>
                Sub-microsecond high-performance decentralized ledger execution matching portal.
              </p>
              <div style={{ display: "flex", gap: 12 }}>
                {["𝕏", "Discord", "Telegram", "Github"].map((s) => (
                  <button key={s} style={{
                    background: "var(--bg-hover)",
                    border: "none",
                    color: "var(--text-primary)",
                    borderRadius: 6,
                    padding: "6px 12px",
                    cursor: "pointer",
                    fontSize: 11,
                    fontWeight: 600
                  }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {[
              { title: "Core Features", links: [["Terminal", "/trade"], ["P2P Escrow", "/p2p"], ["KYC Liveness", "/kyc"], ["Ledger Audit", "/ledger"]] },
              { title: "Technical Layers", links: [["API Whitelist", "#"], ["Shadow Replay", "#"], ["Disruptor Buffer", "#"], ["FIX Gateway", "#"]] },
              { title: "Legal & Support", links: [["Help Center", "#"], ["Security Audits", "#"], ["Terms of Service", "#"], ["Privacy Policy", "#"]] }
            ].map((col, idx) => (
              <div key={idx}>
                <h4 style={{ color: "var(--text-primary)", fontWeight: 700, marginBottom: 16 }}>{col.title}</h4>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {col.links.map((link, lidx) => (
                    <Link key={lidx} href={link[1]} style={{ color: "var(--text-secondary)", textDecoration: "none" }}
                      onMouseEnter={e => e.currentTarget.style.color = "var(--yellow)"}
                      onMouseLeave={e => e.currentTarget.style.color = "var(--text-secondary)"}>
                      {link[0]}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div style={{
            borderTop: "1px solid var(--border-light)",
            paddingTop: 24,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 12
          }}>
            <span>© 2026 CloudExchange Group. All rights reserved.</span>
            <div style={{ display: "flex", gap: 16 }}>
              <a href="#" style={{ color: "var(--text-secondary)", textDecoration: "none" }}>Risk Warning</a>
              <a href="#" style={{ color: "var(--text-secondary)", textDecoration: "none" }}>Cookie Preferences</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
