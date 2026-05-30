"use client";
import React, { useState, useEffect } from "react";
import { Coins, HelpCircle, ArrowUpRight, DollarSign, Wallet, ShieldCheck, Flame, Scale } from "lucide-react";
import Header from "../components/Header";
import SpaceBackground from "../components/SpaceBackground";

interface StakingPool {
  symbol: string;
  name: string;
  apy: number;
  duration: number; // in days
  minStake: number;
  staked: number;
}

interface ActiveStake {
  id: string;
  symbol: string;
  amount: number;
  apy: number;
  earned: number;
  daysRemaining: number;
}

interface ActiveLoan {
  id: string;
  borrowed: number;
  collateralAsset: string;
  collateralAmount: number;
  ltv: number;
  interest: number;
}

export default function EarnPage() {
  const [walletBalance, setWalletBalance] = useState(15740.50);
  const [alertText, setAlertText] = useState("");
  const [stakingPools, setStakingPools] = useState<StakingPool[]>([
    { symbol: "SOL", name: "Solana Super Stake", apy: 6.80, duration: 30, minStake: 1, staked: 0 },
    { symbol: "ETH", name: "Ethereum Yield Vault", apy: 4.25, duration: 60, minStake: 0.1, staked: 0 },
    { symbol: "USDT", name: "USDT High-Yield Vault", apy: 11.20, duration: 30, minStake: 50, staked: 0 }
  ]);

  const [activeStakes, setActiveStakes] = useState<ActiveStake[]>([
    { id: "STK-112", symbol: "USDT", amount: 2000, apy: 11.20, earned: 18.42, daysRemaining: 24 }
  ]);

  // Loans states
  const [borrowAsset, setBorrowAsset] = useState("USDT");
  const [collateralAsset, setCollateralAsset] = useState("BTC");
  const [collateralAmount, setCollateralAmount] = useState("0.5");
  const [ltv, setLtv] = useState(65); // percentage slider
  const [activeLoans, setActiveLoans] = useState<ActiveLoan[]>([
    { id: "LN-84", borrowed: 5000, collateralAsset: "ETH", collateralAmount: 2.2, ltv: 65, interest: 24.12 }
  ]);

  // Stake modal states
  const [showStakeModal, setShowStakeModal] = useState(false);
  const [selectedPool, setSelectedPool] = useState<StakingPool | null>(null);
  const [stakeAmount, setStakeAmount] = useState("100");

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

  // Simulate staking rewards ticking
  useEffect(() => {
    const iv = setInterval(() => {
      setActiveStakes(prev =>
        prev.map(stk => {
          const rewardRate = (stk.amount * (stk.apy / 100)) / (365 * 24 * 3600); // per second
          return {
            ...stk,
            earned: +(stk.earned + rewardRate * 5).toFixed(6)
          };
        })
      );
    }, 5000);
    return () => clearInterval(iv);
  }, []);

  // Handle Stake submission
  const handleOpenStake = (pool: StakingPool) => {
    setSelectedPool(pool);
    setShowStakeModal(true);
  };

  const handleConfirmStake = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPool) return;

    const amt = parseFloat(stakeAmount);
    if (isNaN(amt) || amt < selectedPool.minStake) {
      triggerAlert(`Minimum stake amount is ${selectedPool.minStake} ${selectedPool.symbol}.`);
      return;
    }

    // For USDT stake, we check and deduct from wallet balance.
    // For other staking types, we assume on-chain delegation or check balance
    if (selectedPool.symbol === "USDT" && amt > walletBalance) {
      triggerAlert("Insufficient USDT wallet balance.");
      return;
    }

    if (selectedPool.symbol === "USDT") {
      updateBalance(+(walletBalance - amt).toFixed(2));
    }

    const newStake: ActiveStake = {
      id: "STK-" + Math.random().toString(36).substring(2, 6).toUpperCase(),
      symbol: selectedPool.symbol,
      amount: amt,
      apy: selectedPool.apy,
      earned: 0.00,
      daysRemaining: selectedPool.duration
    };

    setActiveStakes(prev => [newStake, ...prev]);
    setShowStakeModal(false);
    triggerAlert(`Successfully staked ${amt} ${selectedPool.symbol} into ${selectedPool.name}.`);
  };

  const handleUnstake = (id: string) => {
    const target = activeStakes.find(s => s.id === id);
    if (target) {
      // Refund principal for USDT staking
      if (target.symbol === "USDT") {
        updateBalance(+(walletBalance + target.amount + target.earned).toFixed(2));
      }
      setActiveStakes(prev => prev.filter(s => s.id !== id));
      triggerAlert(`Unstaked successfully! Claimed ${target.amount} ${target.symbol} + ${target.earned.toFixed(4)} rewards.`);
    }
  };

  // Loans calculation
  const collateralValue = parseFloat(collateralAmount) || 0;
  const mockPrices: Record<string, number> = { BTC: 65050, ETH: 3420, SOL: 168 };
  const price = mockPrices[collateralAsset] || 0;
  const totalCollateralValue = collateralValue * price;
  const maxBorrow = totalCollateralValue * (ltv / 100);
  const dailyInterestRate = 0.0002; // 0.02% daily
  const liquidationPrice = price * (ltv / 100) * 1.15; // LTV ratio safeguard

  const handleTakeLoan = (e: React.FormEvent) => {
    e.preventDefault();
    if (maxBorrow <= 0) {
      triggerAlert("Please enter a valid collateral quantity.");
      return;
    }

    // Add borrowed money to wallet
    updateBalance(+(walletBalance + maxBorrow).toFixed(2));

    const newLoan: ActiveLoan = {
      id: "LN-" + Math.random().toString(36).substring(2, 6).toUpperCase(),
      borrowed: Math.round(maxBorrow),
      collateralAsset,
      collateralAmount: parseFloat(collateralAmount),
      ltv,
      interest: 0.00
    };

    setActiveLoans(prev => [newLoan, ...prev]);
    triggerAlert(`Loan approved! Credited $${Math.round(maxBorrow)} USDT to your wallet.`);
  };

  const handleRepayLoan = (id: string) => {
    const loan = activeLoans.find(l => l.id === id);
    if (loan) {
      const repaymentCost = loan.borrowed + loan.interest;
      if (repaymentCost > walletBalance) {
        triggerAlert(`Insufficient balance to repay loan. Need $${repaymentCost.toFixed(2)} USDT.`);
        return;
      }

      updateBalance(+(walletBalance - repaymentCost).toFixed(2));
      setActiveLoans(prev => prev.filter(l => l.id !== id));
      triggerAlert(`Loan ${id} repaid in full. Collateral has been unlocked.`);
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
            <Coins size={18} /> {alertText}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 36, flexWrap: "wrap", gap: 16 }}>
          <div>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--yellow)", textTransform: "uppercase", letterSpacing: 1.5 }}>Capital Efficiency</span>
            <h1 style={{ fontSize: 32, fontWeight: 800, marginTop: 4, letterSpacing: -0.5 }}>CloudEarn &amp; Lending</h1>
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
              <div style={{ fontSize: 10, color: "var(--text-secondary)" }}>AVAILABLE BALANCE</div>
              <div style={{ fontSize: 16, fontWeight: 750, color: "#fff" }}>${walletBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT</div>
            </div>
          </div>
        </div>

        {/* Layout Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }} className="grid-responsive-earn">
          
          {/* LEFT COLUMN: Staking Pools */}
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div style={{
              background: "rgba(6, 11, 30, 0.85)",
              border: "1px solid var(--border)",
              borderRadius: 16,
              padding: 24,
              backdropFilter: "blur(16px)"
            }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 18, display: "flex", alignItems: "center", gap: 8 }}>
                <Flame size={20} color="var(--yellow)" /> Staking Pools
              </h2>

              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {stakingPools.map(pool => (
                  <div
                    key={pool.symbol}
                    style={{
                      background: "rgba(255,255,255,0.02)",
                      border: "1px solid var(--border-light)",
                      borderRadius: 12,
                      padding: 18,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center"
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 18 }}>{pool.symbol === "SOL" ? "◎" : pool.symbol === "ETH" ? "Ξ" : "₮"}</span>
                        <div>
                          <div style={{ fontWeight: 750, color: "#fff", fontSize: 14 }}>{pool.name}</div>
                          <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>Duration: {pool.duration} Days locked</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 10, color: "var(--text-secondary)" }}>EST. APY</div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: "var(--green)" }}>{pool.apy}%</div>
                      </div>

                      <button
                        onClick={() => handleOpenStake(pool)}
                        className="btn-green bn-tab-sm"
                        style={{ height: 32, padding: "0 16px", borderRadius: 6, fontWeight: 700, fontSize: 12 }}
                      >
                        Stake
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Active locks portfolio */}
            <div style={{
              background: "rgba(6, 11, 30, 0.85)",
              border: "1px solid var(--border)",
              borderRadius: 16,
              padding: 24,
              backdropFilter: "blur(16px)"
            }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>My Active Locking Vaults</h2>

              {activeStakes.length === 0 ? (
                <div style={{ textAlign: "center", padding: "24px 0", color: "var(--text-muted)", fontSize: 12 }}>
                  No active vaults or stakes locked.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {activeStakes.map(stk => (
                    <div
                      key={stk.id}
                      style={{
                        background: "rgba(255,255,255,0.01)",
                        border: "1px solid var(--border-light)",
                        padding: 14,
                        borderRadius: 10,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center"
                      }}
                    >
                      <div>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <span style={{ fontWeight: 700, color: "#fff", fontSize: 13 }}>{stk.amount} {stk.symbol}</span>
                          <span style={{ fontSize: 9, color: "var(--green)", fontWeight: 700, background: "rgba(16,185,129,0.1)", padding: "1px 4px", borderRadius: 3 }}>
                            {stk.apy}% APY
                          </span>
                        </div>
                        <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 4 }}>
                          Days Lock Left: {stk.daysRemaining} days • {stk.id}
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: 9, color: "var(--text-secondary)" }}>INTEREST EARNED</div>
                          <div style={{ fontSize: 13, fontWeight: 750, color: "var(--green)" }}>
                            +${stk.earned.toFixed(5)} USDT
                          </div>
                        </div>

                        <button
                          onClick={() => handleUnstake(stk.id)}
                          className="btn-outline bn-tab-sm"
                          style={{ height: 26, fontSize: 11, padding: "0 10px", color: "var(--yellow)", borderColor: "var(--yellow)" }}
                        >
                          Claim
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: Crypto Collateralized Loans */}
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div style={{
              background: "rgba(6, 11, 30, 0.85)",
              border: "1px solid var(--border)",
              borderRadius: 16,
              padding: 24,
              backdropFilter: "blur(16px)"
            }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 18, display: "flex", alignItems: "center", gap: 8 }}>
                <Scale size={20} color="var(--yellow)" /> Instant Collateral Loans
              </h2>
              <p style={{ color: "var(--text-secondary)", fontSize: 12, lineHeight: 1.5, marginBottom: 20 }}>
                Get liquid cash (USDT) instantly without selling your crypto. Deposit Bitcoin, Ethereum, or Solana as collateral and withdraw the funds to your trade wallet.
              </p>

              <form onSubmit={handleTakeLoan} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <div>
                    <label style={{ fontSize: 10, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>COLLATERAL ASSET</label>
                    <select
                      className="bn-select"
                      value={collateralAsset}
                      onChange={e => setCollateralAsset(e.target.value)}
                      style={{ height: 38, width: "100%" }}
                    >
                      <option value="BTC">BTC (Bitcoin)</option>
                      <option value="ETH">ETH (Ethereum)</option>
                      <option value="SOL">SOL (Solana)</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 10, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>COLLATERAL QUANTITY</label>
                    <input
                      className="bn-input"
                      value={collateralAmount}
                      onChange={e => setCollateralAmount(e.target.value)}
                      style={{ height: 38 }}
                      required
                    />
                  </div>
                </div>

                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 6 }}>
                    <span style={{ color: "var(--text-secondary)" }}>LOAN-TO-VALUE (LTV) TARGET</span>
                    <span style={{ fontWeight: 700, color: "var(--yellow)" }}>{ltv}% LTV</span>
                  </div>
                  <input
                    type="range"
                    min="30"
                    max="75"
                    value={ltv}
                    onChange={e => setLtv(parseInt(e.target.value))}
                    style={{ width: "100%", accentColor: "var(--yellow)" }}
                  />
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "var(--text-muted)", marginTop: 4 }}>
                    <span>30% LTV (Safe)</span>
                    <span>75% LTV (Risk Threshold)</span>
                  </div>
                </div>

                {/* Calculation breakdown */}
                <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border-light)", borderRadius: 8, padding: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 6 }}>
                    <span style={{ color: "var(--text-secondary)" }}>Collateral Market Value:</span>
                    <span style={{ color: "#fff", fontWeight: 600 }}>${totalCollateralValue.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDT</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 6 }}>
                    <span style={{ color: "var(--text-secondary)" }}>Withdrawal Credit Amount:</span>
                    <span style={{ color: "var(--green)", fontWeight: 700 }}>${Math.round(maxBorrow).toLocaleString()} USDT</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 6 }}>
                    <span style={{ color: "var(--text-secondary)" }}>Liquidation Trigger Price:</span>
                    <span style={{ color: "var(--red)", fontWeight: 600 }}>${liquidationPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDT</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                    <span style={{ color: "var(--text-secondary)" }}>Daily Interest Accrual:</span>
                    <span style={{ color: "#fff", fontWeight: 600 }}>0.02% Daily</span>
                  </div>
                </div>

                <button type="submit" className="btn-green" style={{ width: "100%", height: 40, fontWeight: 800, fontSize: 13 }}>
                  Borrow USDT Instantly
                </button>
              </form>
            </div>

            {/* Active loans panel */}
            <div style={{
              background: "rgba(6, 11, 30, 0.85)",
              border: "1px solid var(--border)",
              borderRadius: 16,
              padding: 24,
              backdropFilter: "blur(16px)"
            }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>My Active Borrowed Loans</h2>

              {activeLoans.length === 0 ? (
                <div style={{ textAlign: "center", padding: "24px 0", color: "var(--text-muted)", fontSize: 12 }}>
                  No active borrow positions outstanding.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {activeLoans.map(loan => (
                    <div
                      key={loan.id}
                      style={{
                        background: "rgba(255,255,255,0.01)",
                        border: "1px solid var(--border-light)",
                        padding: 14,
                        borderRadius: 10,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center"
                      }}
                    >
                      <div>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <span style={{ fontWeight: 700, color: "#fff", fontSize: 13 }}>${loan.borrowed.toLocaleString()} USDT</span>
                          <span style={{ fontSize: 9, color: "var(--red)", fontWeight: 700, background: "rgba(255,23,68,0.1)", padding: "1px 4px", borderRadius: 3 }}>
                            LTV {loan.ltv}%
                          </span>
                        </div>
                        <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 4 }}>
                          Collateral: {loan.collateralAmount} {loan.collateralAsset} • ID: {loan.id}
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: 9, color: "var(--text-secondary)" }}>INTEREST DUE</div>
                          <div style={{ fontSize: 13, fontWeight: 750, color: "var(--red)" }}>
                            +${loan.interest.toFixed(2)} USDT
                          </div>
                        </div>

                        <button
                          onClick={() => handleRepayLoan(loan.id)}
                          className="btn-outline bn-tab-sm"
                          style={{ height: 26, fontSize: 11, padding: "0 10px", color: "var(--red)", borderColor: "var(--red)" }}
                        >
                          Repay
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

        </div>

      </main>

      {/* Stake Modal */}
      {showStakeModal && selectedPool && (
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
            maxWidth: 400,
            width: "100%",
            padding: 28,
            backdropFilter: "blur(20px)"
          }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 6 }}>Staking Delegation</h2>
            <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 20 }}>
              You are delegating to <span style={{ color: "var(--yellow)", fontWeight: 700 }}>{selectedPool.name}</span>. APY of {selectedPool.apy}% is fixed for the duration.
            </p>

            <form onSubmit={handleConfirmStake} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ fontSize: 11, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>ENTER AMOUNT</label>
                <div style={{ position: "relative" }}>
                  <input
                    className="bn-input"
                    value={stakeAmount}
                    onChange={e => setStakeAmount(e.target.value)}
                    required
                  />
                  <span style={{ position: "absolute", right: 12, top: 12, fontSize: 12, fontWeight: 700, color: "var(--text-muted)" }}>{selectedPool.symbol}</span>
                </div>
                <span style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 6, display: "block" }}>
                  Minimum staking threshold: {selectedPool.minStake} {selectedPool.symbol}
                </span>
              </div>

              <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
                <button
                  type="button"
                  onClick={() => setShowStakeModal(false)}
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
                  Delegate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx global>{`
        .grid-responsive-earn {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 32px;
        }
        @media (max-width: 900px) {
          .grid-responsive-earn {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
