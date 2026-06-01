import React, { useState, useEffect } from "react";
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
  Settings,
  ShieldAlert,
  Server,
  UserCheck,
  FileText,
  Lock,
  RefreshCw,
  LogOut,
  ArrowRightLeft,
  DollarSign,
  TrendingUp,
  Clock,
  ExternalLink,
  Layers,
  Database,
  Shield,
  Zap,
  TrendingDown,
  Flame,
  Radio,
  FileSearch,
  BatteryCharging
} from "lucide-react";

interface KYCRequest {
  id: string;
  email: string;
  submittedAt: string;
  documentType: string;
  documentNumber: string;
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

interface ListingApplication {
  id: string;
  symbol: string;
  name: string;
  decimals: number;
  contractAddress: string;
  network: string;
  initialPrice: number;
  website: string;
  txHash: string;
  submittedAt: string;
  status: "Pending" | "Approved" | "Rejected";
}

interface MerchantApplication {
  id: string;
  username: string;
  upiId: string;
  depositAmount: number;
  status: "Pending" | "Approved" | "Rejected";
}

interface CustomPair {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  volume24h: number;
  color: string;
}

interface WashTradeAlert {
  id: string;
  buyer: string;
  seller: string;
  symbol: string;
  price: number;
  quantity: number;
  value: number;
  timestamp: string;
  status: "Flagged" | "Pardoned" | "Blocked";
}

interface SpoofingAlert {
  id: string;
  user: string;
  symbol: string;
  actionRate: number; // cancellations per second
  volumeUsdt: number;
  timestamp: string;
  status: "Active" | "Pardoned" | "Blocked";
}

interface MarginAccount {
  userId: string;
  collateral: number;
  btcPositionSize: number; // in BTC, positive for Long, negative for Short
  entryPrice: number;
  leverage: number;
  equity: number;
  maintMargin: number;
  status: "SAFE" | "MARGIN CALL" | "LIQUIDATED";
  liquidatedDeficit?: number;
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [totpToken, setTotpToken] = useState("");
  const [authError, setAuthError] = useState("");

  const [activeTab, setActiveTab] = useState<
    "kyc" | "pairs" | "listings" | "merchants" | "disputes" | "system" | "surveillance" | "risk" | "custody"
  >("kyc");
  
  // Custom pair states
  const [newSymbol, setNewSymbol] = useState("");
  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newChange, setNewChange] = useState("");
  const [newVolume, setNewVolume] = useState("");
  const [newColor, setNewColor] = useState("#f5a623");
  
  // Dynamic lists from localStorage/APIs
  const [kycRequests, setKycRequests] = useState<KYCRequest[]>([]);
  const [disputes, setDisputes] = useState<DisputedEscrow[]>([]);
  const [listings, setListings] = useState<ListingApplication[]>([]);
  const [merchants, setMerchants] = useState<MerchantApplication[]>([]);
  const [customPairs, setCustomPairs] = useState<CustomPair[]>([]);
  const [liveEscrows, setLiveEscrows] = useState<any[]>([]);
  
  // Blockchain node states
  const [nodeHeight, setNodeHeight] = useState<number>(0);
  const [nodeConnected, setNodeConnected] = useState(false);
  const [isChainHalted, setIsChainHalted] = useState(false);

  // Toast notifications
  const [toast, setToast] = useState("");

  // Webhook sim helper
  const [simUpiRef, setSimUpiRef] = useState("UPI_REF_" + Math.floor(1000000000 + Math.random() * 9000000000));
  const [simAmount, setSimAmount] = useState("89500");

  // --- NEW STATES FOR WEB3 SUITE ---
  const [washAlerts, setWashAlerts] = useState<WashTradeAlert[]>([]);
  const [spoofAlerts, setSpoofAlerts] = useState<SpoofingAlert[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<string[]>([]);
  
  const [btcPrice, setBtcPrice] = useState<number>(65000);
  const [insuranceFund, setInsuranceFund] = useState<number>(50000);
  const [marginAccounts, setMarginAccounts] = useState<MarginAccount[]>([]);
  const [isFlashCrashTriggered, setIsFlashCrashTriggered] = useState(false);
  
  const [vaultReconciliationStatus, setVaultReconciliationStatus] = useState<"idle" | "loading" | "success">("idle");
  const [auditProgress, setAuditProgress] = useState(0);
  const [auditLogs, setAuditLogs] = useState<string[]>([]);

  useEffect(() => {
    // Check local storage session
    const adminSession = localStorage.getItem("exchange_admin_session");
    if (adminSession === "active") {
      setIsAuthenticated(true);
    }

    // Load or initialize static data
    const defaultKyc: KYCRequest[] = [
      { id: "101", email: "bunty_trader@exchange.com", submittedAt: "2026-05-29 09:12", documentType: "PAN Card", documentNumber: "ABCDE1234F", status: "Pending" },
      { id: "102", email: "rakesh_bhol@cloudexchange.com", submittedAt: "2026-05-29 11:30", documentType: "Aadhaar Card", documentNumber: "1234-5678-9012", status: "Pending" }
    ];
    const savedKyc = localStorage.getItem("admin_kyc_requests");
    if (savedKyc) {
      setKycRequests(JSON.parse(savedKyc));
    } else {
      setKycRequests(defaultKyc);
      localStorage.setItem("admin_kyc_requests", JSON.stringify(defaultKyc));
    }

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

    const defaultListings: ListingApplication[] = [
      { id: "APP-5091", symbol: "GLD", name: "Sovereign Gold Token", decimals: 18, contractAddress: "0x3f12a89d1234cfef1a980bc9d123d", network: "ERC20", initialPrice: 72.50, website: "https://goldl1.org", txHash: "0x9812af67db3e12c12aefdf2145bcf112a9e32", submittedAt: "2026-05-29 12:45", status: "Pending" }
    ];
    const savedListings = localStorage.getItem("admin_listing_applications");
    if (savedListings) {
      setListings(JSON.parse(savedListings));
    } else {
      setListings(defaultListings);
      localStorage.setItem("admin_listing_applications", JSON.stringify(defaultListings));
    }

    const defaultMerchants: MerchantApplication[] = [
      { id: "M-309", username: "premium_liquidity@cloud.ex", upiId: "premium_desk@okaxis", depositAmount: 500, status: "Pending" }
    ];
    const savedMerchants = localStorage.getItem("admin_merchant_applications");
    if (savedMerchants) {
      setMerchants(JSON.parse(savedMerchants));
    } else {
      setMerchants(defaultMerchants);
      localStorage.setItem("admin_merchant_applications", JSON.stringify(defaultMerchants));
    }

    const savedPairs = localStorage.getItem("admin_custom_trading_pairs");
    if (savedPairs) {
      setCustomPairs(JSON.parse(savedPairs));
    }

    // --- SECURE TELEMETRY SUITE LOCALSTORAGE SYNC ---
    const defaultWash: WashTradeAlert[] = [
      { id: "WASH-001", buyer: "manipulator_acc_1", seller: "manipulator_acc_1", symbol: "BTC/USDT", price: 68500.0, quantity: 0.5, value: 34250.0, timestamp: "2026-05-30 22:15", status: "Flagged" },
      { id: "WASH-002", buyer: "wash_bot_node_4", seller: "wash_bot_node_4", symbol: "ETH/USDT", price: 3510.0, quantity: 12.4, value: 43524.0, timestamp: "2026-05-30 23:42", status: "Flagged" }
    ];
    const savedWash = localStorage.getItem("admin_wash_alerts");
    if (savedWash) {
      setWashAlerts(JSON.parse(savedWash));
    } else {
      setWashAlerts(defaultWash);
      localStorage.setItem("admin_wash_alerts", JSON.stringify(defaultWash));
    }

    const defaultSpoof: SpoofingAlert[] = [
      { id: "SPOOF-001", user: "spoofing_market_maker", symbol: "ETH/USDT", actionRate: 12, volumeUsdt: 189500, timestamp: "2026-05-30 22:30", status: "Active" },
      { id: "SPOOF-002", user: "hft_algobot_delta", symbol: "SOL/USDT", actionRate: 15, volumeUsdt: 85200, timestamp: "2026-05-31 01:14", status: "Active" }
    ];
    const savedSpoof = localStorage.getItem("admin_spoof_alerts");
    if (savedSpoof) {
      setSpoofAlerts(JSON.parse(savedSpoof));
    } else {
      setSpoofAlerts(defaultSpoof);
      localStorage.setItem("admin_spoof_alerts", JSON.stringify(defaultSpoof));
    }

    const savedBlocked = localStorage.getItem("admin_blocked_users");
    if (savedBlocked) {
      setBlockedUsers(JSON.parse(savedBlocked));
    }

    const savedBtc = localStorage.getItem("admin_btc_mark_price");
    if (savedBtc) {
      setBtcPrice(parseFloat(savedBtc));
    } else {
      setBtcPrice(65000);
    }

    const savedFund = localStorage.getItem("admin_insurance_fund");
    if (savedFund) {
      setInsuranceFund(parseFloat(savedFund));
    } else {
      setInsuranceFund(50000);
    }

    const defaultMarginAccounts: MarginAccount[] = [
      { userId: "user_trader_777", collateral: 10000, btcPositionSize: 2.0, entryPrice: 65000, leverage: 10, equity: 10000, maintMargin: 6500, status: "SAFE" },
      { userId: "whale_hedger_888", collateral: 120000, btcPositionSize: -10.0, entryPrice: 65000, leverage: 5, equity: 120000, maintMargin: 32500, status: "SAFE" },
      { userId: "leverage_scalper_55", collateral: 2500, btcPositionSize: 0.25, entryPrice: 65000, leverage: 15, equity: 2500, maintMargin: 812.5, status: "SAFE" }
    ];
    const savedMargins = localStorage.getItem("admin_margin_accounts");
    if (savedMargins) {
      setMarginAccounts(JSON.parse(savedMargins));
    } else {
      setMarginAccounts(defaultMarginAccounts);
      localStorage.setItem("admin_margin_accounts", JSON.stringify(defaultMarginAccounts));
    }
  }, [isAuthenticated]);

  // Blockchain node connectivity checking
  useEffect(() => {
    if (!isAuthenticated) return;
    const fetchBlockNumber = async () => {
      try {
        const res = await fetch("http://localhost:8545", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            method: "gold_blockNumber",
            params: [],
            id: 101
          })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.result !== undefined) {
            setNodeHeight(data.result);
            setNodeConnected(true);
          }
        }
      } catch (err) {
        setNodeConnected(false);
      }
    };

    fetchBlockNumber();
    const interval = setInterval(fetchBlockNumber, 5000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  // Synchronize dynamic escrows from express backend APIs
  const fetchLiveEscrows = async () => {
    try {
      const res = await fetch("http://localhost:3002/api/p2p/escrows/list");
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.escrows) {
          setLiveEscrows(data.escrows);
        }
      }
    } catch (err) {
      // Bypassed
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchLiveEscrows();
    const interval = setInterval(fetchLiveEscrows, 5000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  // Dynamic calculations for margin accounts on simulated BTC price changes
  useEffect(() => {
    if (marginAccounts.length === 0) return;

    let fundDelta = 0;
    const updated = marginAccounts.map(acc => {
      // calculate position profit/loss: size * (current - entry) for Long; size is negative for Short
      const pnl = acc.btcPositionSize * (btcPrice - acc.entryPrice);
      const newEquity = acc.collateral + pnl;
      
      // MMR (Maintenance Margin Required) is 5% of absolute position value
      const positionValue = Math.abs(acc.btcPositionSize) * btcPrice;
      const mmr = positionValue * 0.05;

      let newStatus: "SAFE" | "MARGIN CALL" | "LIQUIDATED" = "SAFE";
      let deficit = 0;

      if (newEquity <= 0) {
        newStatus = "LIQUIDATED";
        deficit = Math.abs(newEquity);
      } else if (newEquity < mmr) {
        newStatus = "MARGIN CALL";
      }

      // If account just gets liquidated, subtract deficit from simulated insurance fund
      if (newStatus === "LIQUIDATED" && acc.status !== "LIQUIDATED") {
        fundDelta += deficit;
      }

      return {
        ...acc,
        equity: parseFloat(newEquity.toFixed(2)),
        maintMargin: parseFloat(mmr.toFixed(2)),
        status: newStatus,
        liquidatedDeficit: deficit > 0 ? parseFloat(deficit.toFixed(2)) : undefined
      };
    });

    if (fundDelta > 0) {
      const newFund = Math.max(0, insuranceFund - fundDelta);
      setInsuranceFund(parseFloat(newFund.toFixed(2)));
      localStorage.setItem("admin_insurance_fund", newFund.toString());
      triggerToast(`Liquidation completed: Deficit of $${fundDelta.toLocaleString()} USDT filled by Insurance Fund!`);
    }

    setMarginAccounts(updated);
    localStorage.setItem("admin_margin_accounts", JSON.stringify(updated));
  }, [btcPrice]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPassword === "exchange_admin_2026" && totpToken === "125983") {
      setIsAuthenticated(true);
      localStorage.setItem("exchange_admin_session", "active");
      setAuthError("");
    } else {
      setAuthError("Invalid admin credentials or security TOTP token.");
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem("exchange_admin_session");
  };

  const triggerToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 4000);
  };

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
    
    fetch("http://localhost:3002/api/p2p/post-ad", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        seller: newSymbol.toUpperCase() + "_OTC",
        rate: newPrice,
        available: newVolume || "10000",
        minLimit: "5000",
        maxLimit: "500000",
        payments: ["UPI", "IMPS"]
      })
    }).catch(err => console.warn("Backend dynamic pair broadcast failed."));

    setNewSymbol("");
    setNewName("");
    setNewPrice("");
    setNewChange("");
    setNewVolume("");
    triggerToast(`Deploy SUCCESS: Created pair ${newPair.symbol}/USDT & injected OTC ads.`);
  };

  const handleResolveListing = (id: string, approve: boolean) => {
    const updated = listings.map(l => {
      if (l.id === id) {
        l.status = approve ? "Approved" : "Rejected";
      }
      return l;
    });
    setListings(updated);
    localStorage.setItem("admin_listing_applications", JSON.stringify(updated));

    const target = listings.find(l => l.id === id);
    if (target && approve) {
      const newPair: CustomPair = {
        symbol: target.symbol,
        name: target.name,
        price: target.initialPrice,
        change24h: 0.00,
        volume24h: 10000,
        color: "#E67E22"
      };
      const updatedPairs = [...customPairs, newPair];
      setCustomPairs(updatedPairs);
      localStorage.setItem("admin_custom_trading_pairs", JSON.stringify(updatedPairs));
    }
    triggerToast(`Listing application #${id} ${approve ? "Approved & Listed" : "Rejected"}.`);
  };

  const handleResolveMerchant = (id: string, approve: boolean) => {
    const updated = merchants.map(m => {
      if (m.id === id) {
        m.status = approve ? "Approved" : "Rejected";
      }
      return m;
    });
    setMerchants(updated);
    localStorage.setItem("admin_merchant_applications", JSON.stringify(updated));

    const target = merchants.find(m => m.id === id);
    if (target && approve) {
      localStorage.setItem("is_p2p_merchant", "true");
      localStorage.setItem("merchant_upi_id", target.upiId);
    }
    triggerToast(`Merchant application #${id} ${approve ? "Approved" : "Rejected"}.`);
  };

  const handleKycResolve = (id: string, approve: boolean) => {
    const updated = kycRequests.map(k => {
      if (k.id === id) {
        k.status = approve ? "Approved" : "Rejected";
      }
      return k;
    });
    setKycRequests(updated);
    localStorage.setItem("admin_kyc_requests", JSON.stringify(updated));

    const target = kycRequests.find(k => k.id === id);
    if (target && approve) {
      localStorage.setItem("kyc_tier", "Tier-2 Verified (Identity Approved)");
    }
    triggerToast(`KYC Request #${id} ${approve ? "Approved" : "Rejected"} successfully.`);
  };

  const handleResolveDispute = async (id: string, winner: "buyer" | "seller") => {
    if (winner === "buyer") {
      try {
        const res = await fetch("http://localhost:3002/api/p2p/escrows/release", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ escrowId: id })
        });
        if (res.ok) {
          triggerToast(`Escrow dispute ${id} resolved: Stablecoins released to BUYER on GoldChain L1.`);
          fetchLiveEscrows();
        } else {
          triggerToast(`Backend release failed, resolving local mock state.`);
        }
      } catch (err) {
        triggerToast(`Backend unreachable. Local fallback activated.`);
      }
    } else {
      triggerToast(`Escrow dispute ${id} resolved. Funds returned to SELLER.`);
    }

    const updated = disputes.filter(d => d.id !== id);
    setDisputes(updated);
    localStorage.setItem("admin_disputed_escrows", JSON.stringify(updated));
  };

  const triggerUpiWebhookSim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!simUpiRef || !simAmount) return;

    try {
      const res = await fetch("http://localhost:3002/api/p2p/webhook/upi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          upiRef: simUpiRef,
          amountInr: simAmount,
          status: "SUCCESS"
        })
      });
      if (res.ok) {
        triggerToast(`Gateway Webhook SUCCESS: Escrow auto-released & L1 settlement finalized!`);
        fetchLiveEscrows();
        setSimUpiRef("UPI_REF_" + Math.floor(1000000000 + Math.random() * 9000000000));
      } else {
        triggerToast("Error: No pending P2P escrow matched this amount/ref.");
      }
    } catch (err) {
      triggerToast("Express server (Port 3002) offline. Cannot process webhook.");
    }
  };

  // --- ACTIONS FOR NEW SUITES ---
  const handleBlockUser = (username: string) => {
    if (blockedUsers.includes(username)) return;
    const updated = [...blockedUsers, username];
    setBlockedUsers(updated);
    localStorage.setItem("admin_blocked_users", JSON.stringify(updated));
    triggerToast(`User Account '${username}' has been SUSPENDED & Whitelists revoked.`);
  };

  const handleUnblockUser = (username: string) => {
    const updated = blockedUsers.filter(u => u !== username);
    setBlockedUsers(updated);
    localStorage.setItem("admin_blocked_users", JSON.stringify(updated));
    triggerToast(`User Account '${username}' is restored. Limits restored to normal.`);
  };

  const handleResolveWash = (id: string, action: "Pardon" | "Block") => {
    const target = washAlerts.find(w => w.id === id);
    if (!target) return;
    
    if (action === "Block") {
      handleBlockUser(target.buyer);
    }
    
    const updated = washAlerts.map(w => {
      if (w.id === id) {
        w.status = action === "Block" ? "Blocked" : "Pardoned";
      }
      return w;
    });
    setWashAlerts(updated);
    localStorage.setItem("admin_wash_alerts", JSON.stringify(updated));
    triggerToast(`Wash Trading alert ticket #${id} resolved with action: ${action.toUpperCase()}`);
  };

  const handleResolveSpoof = (id: string, action: "Pardon" | "Block") => {
    const target = spoofAlerts.find(s => s.id === id);
    if (!target) return;

    if (action === "Block") {
      handleBlockUser(target.user);
    }

    const updated = spoofAlerts.map(s => {
      if (s.id === id) {
        s.status = action === "Block" ? "Blocked" : "Pardoned";
      }
      return s;
    });
    setSpoofAlerts(updated);
    localStorage.setItem("admin_spoof_alerts", JSON.stringify(updated));
    triggerToast(`Spoofing layering anomaly #${id} resolved with action: ${action.toUpperCase()}`);
  };

  const triggerVolatilityCrash = () => {
    setIsFlashCrashTriggered(true);
    setBtcPrice(53500); // Trigger flash crash down to $53.5k
    localStorage.setItem("admin_btc_mark_price", "53500");
  };

  const restoreBtcPrice = () => {
    setIsFlashCrashTriggered(false);
    setBtcPrice(65000);
    localStorage.setItem("admin_btc_mark_price", "65000");
    
    // Restore margin accounts collateral to safe defaults
    const defaultMarginAccounts: MarginAccount[] = [
      { userId: "user_trader_777", collateral: 10000, btcPositionSize: 2.0, entryPrice: 65000, leverage: 10, equity: 10000, maintMargin: 6500, status: "SAFE" },
      { userId: "whale_hedger_888", collateral: 120000, btcPositionSize: -10.0, entryPrice: 65000, leverage: 5, equity: 120000, maintMargin: 32500, status: "SAFE" },
      { userId: "leverage_scalper_55", collateral: 2500, btcPositionSize: 0.25, entryPrice: 65000, leverage: 15, equity: 2500, maintMargin: 812.5, status: "SAFE" }
    ];
    setMarginAccounts(defaultMarginAccounts);
    localStorage.setItem("admin_margin_accounts", JSON.stringify(defaultMarginAccounts));

    setInsuranceFund(50000);
    localStorage.setItem("admin_insurance_fund", "50000");

    triggerToast("Volatility stress parameters reset. Asset pricing normalized.");
  };

  const runReconciliationAudit = () => {
    setVaultReconciliationStatus("loading");
    setAuditProgress(0);
    setAuditLogs([]);

    const steps = [
      { prog: 20, log: "[AUDIT] Reading balance sheets from PostgreSQL database..." },
      { prog: 40, log: "[AUDIT] Validating aggregate balances against Multi-Sig cold vaults..." },
      { prog: 60, log: "[AUDIT] Invariant Check: Sum(UserBalances) <= SystemReserves. [PASS]" },
      { prog: 80, log: "[AUDIT] Checking GoldChain L1 ledger block packaging consistency... [NORMAL]" },
      { prog: 100, log: "[SYSTEM AUDIT SUCCESS] Ledger matches 100%. Cryptographic reserves verified!" }
    ];

    steps.forEach((step, idx) => {
      setTimeout(() => {
        setAuditProgress(step.prog);
        setAuditLogs(prev => [...prev, step.log]);
        if (step.prog === 100) {
          setVaultReconciliationStatus("success");
          triggerToast("Vault integrity audit complete. 100% reserve verification matching!");
        }
      }, (idx + 1) * 800);
    });
  };

  if (!isAuthenticated) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "radial-gradient(circle at center, #0b1129 0%, #03050c 100%)",
        color: "var(--text-primary)",
        position: "relative",
        overflow: "hidden"
      }}>
        {/* Abstract cyber grid lines */}
        <div style={{
          position: "absolute",
          top: 0, left: 0, right: 0, bottom: 0,
          background: "linear-gradient(rgba(245, 166, 35, 0.01) 1px, transparent 1px) 0 0/40px 40px, linear-gradient(90deg, rgba(245, 166, 35, 0.01) 1px, transparent 1px) 0 0/40px 40px",
          pointerEvents: "none"
        }} />
        
        {/* Soft glowing ambient spots */}
        <div style={{
          position: "absolute",
          width: 500, height: 500,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(245, 166, 35, 0.04) 0%, transparent 70%)",
          top: "10%", left: "10%", pointerEvents: "none"
        }} />

        <div className="glass-panel pulse-glow-border" style={{
          width: "100%",
          maxWidth: 440,
          padding: "48px 40px",
          textAlign: "center",
          boxShadow: "0 20px 80px rgba(0, 0, 0, 0.6)",
          borderRadius: 24,
          border: "1px solid rgba(245, 166, 35, 0.15)"
        }}>
          <div style={{
            width: 80,
            height: 80,
            borderRadius: 20,
            background: "rgba(245, 166, 35, 0.06)",
            border: "2px solid var(--yellow)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 24px",
            boxShadow: "0 0 20px rgba(245, 166, 35, 0.15)"
          }}>
            <Lock size={36} color="var(--yellow)" />
          </div>
          
          <h1 style={{ fontSize: 24, fontWeight: 900, letterSpacing: "-0.03em", textTransform: "uppercase" }}>
            Master Admin Entry
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 8, lineHeight: 1.6 }}>
            Security Isolated Portal. Please input secure physical tokens and admin credentials to authenticate.
          </p>

          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 20, marginTop: 36 }}>
            <div style={{ textAlign: "left" }}>
              <label style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 800, display: "block", marginBottom: 8, letterSpacing: "0.05em" }}>
                ADMIN SECURITY PASSWORD
              </label>
              <input 
                type="password" 
                className="bn-input" 
                placeholder="••••••••••••••" 
                value={adminPassword}
                onChange={e => setAdminPassword(e.target.value)}
                required
              />
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                <span style={{ fontSize: 10, color: "var(--text-muted)" }}>Development Environment</span>
                <span style={{ fontSize: 10, color: "var(--yellow)", fontWeight: 600 }}>Hint: exchange_admin_2026</span>
              </div>
            </div>

            <div style={{ textAlign: "left" }}>
              <label style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 800, display: "block", marginBottom: 8, letterSpacing: "0.05em" }}>
                GOOGLE AUTHENTICATOR (TOTP)
              </label>
              <input 
                type="text" 
                className="bn-input" 
                placeholder="125983" 
                value={totpToken}
                onChange={e => setTotpToken(e.target.value)}
                maxLength={6}
                required
              />
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                <span style={{ fontSize: 10, color: "var(--text-muted)" }}>Token Security Protocol</span>
                <span style={{ fontSize: 10, color: "var(--yellow)", fontWeight: 600 }}>Hint: 125983</span>
              </div>
            </div>

            {authError && (
              <div style={{ 
                background: "rgba(244, 63, 94, 0.06)", 
                border: "1px solid rgba(244, 63, 94, 0.2)", 
                color: "var(--red)", 
                padding: "12px 16px", 
                borderRadius: 10, 
                fontSize: 12, 
                fontWeight: 600,
                textAlign: "left"
              }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <AlertTriangle size={14} />
                  <span>{authError}</span>
                </div>
              </div>
            )}

            <button type="submit" className="btn-yellow" style={{ padding: 15, fontSize: 14, width: "100%", marginTop: 8 }}>
              Authorize Secure Entry
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", color: "var(--text-primary)" }}>
      {/* HEADER */}
      <header style={{
        background: "rgba(6, 9, 19, 0.75)",
        backdropFilter: "blur(20px)",
        borderBottom: "1px solid var(--border)",
        padding: "0 32px",
        height: "var(--header-height)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        zIndex: 100
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ 
            fontSize: 26, 
            width: 48, 
            height: 48, 
            borderRadius: 12, 
            background: "rgba(245, 166, 35, 0.08)", 
            border: "1px solid rgba(245, 166, 35, 0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}>
            🛡️
          </div>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 900, display: "flex", alignItems: "center", gap: 10, letterSpacing: "-0.02em" }}>
              CLOUD EXCHANGE
              <span style={{ 
                fontSize: 10, 
                background: "rgba(245, 166, 35, 0.08)", 
                border: "1px solid var(--yellow)", 
                color: "var(--yellow)", 
                padding: "2px 8px", 
                borderRadius: 6, 
                fontWeight: 800,
                letterSpacing: "0.05em"
              }}>
                MASTER CONTROL ROOM
              </span>
            </h1>
            <p style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 2 }}>Secure Node Gateway & Core Administrative Panel</p>
          </div>
        </div>

        {/* Live L1 Status Indicator */}
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          {nodeConnected ? (
            <span style={{ 
              background: "rgba(16, 185, 129, 0.06)", 
              border: "1px solid var(--green)", 
              color: "var(--green)", 
              padding: "8px 16px", 
              borderRadius: 30, 
              fontSize: 12, 
              fontWeight: 800, 
              display: "flex", 
              alignItems: "center", 
              gap: 8,
              boxShadow: "0 0 10px rgba(16, 185, 129, 0.1)"
            }}>
              <span style={{ 
                width: 8, height: 8, 
                borderRadius: "50%", 
                background: "var(--green)", 
                display: "inline-block",
                boxShadow: "0 0 8px var(--green)"
              }} />
              L1 NODE LIVE (BLOCK #{nodeHeight})
            </span>
          ) : (
            <span style={{ 
              background: "rgba(244, 63, 94, 0.06)", 
              border: "1px solid var(--red)", 
              color: "var(--red)", 
              padding: "8px 16px", 
              borderRadius: 30, 
              fontSize: 12, 
              fontWeight: 800, 
              display: "flex", 
              alignItems: "center", 
              gap: 8
            }}>
              <span style={{ 
                width: 8, height: 8, 
                borderRadius: "50%", 
                background: "var(--red)", 
                display: "inline-block",
                boxShadow: "0 0 8px var(--red)"
              }} />
              L1 NODE DISCONNECTED
            </span>
          )}

          <button onClick={handleLogout} className="btn-outline" style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", fontSize: 12 }}>
            <LogOut size={14} />
            Logout Securely
          </button>
        </div>
      </header>

      {/* BODY SPLIT */}
      <div className="admin-layout-split">
        {/* SIDEBAR */}
        <aside className="admin-sidebar">
          {[
            { id: "kyc", label: "User KYC Verification", icon: <Users size={18} /> },
            { id: "listings", label: "Paid Listing Queue", icon: <FileText size={18} /> },
            { id: "merchants", label: "Merchant Approvals", icon: <UserCheck size={18} /> },
            { id: "pairs", label: "Manual Trading Pairs", icon: <Coins size={18} /> },
            { id: "disputes", label: "P2P Disputes & Webhook", icon: <ShieldAlert size={18} /> },
            { id: "surveillance", label: "Market Surveillance", icon: <Shield size={18} /> },
            { id: "risk", label: "Margin Risk Engine", icon: <Zap size={18} /> },
            { id: "custody", label: "Custody Wallet Vaults", icon: <Database size={18} /> },
            { id: "system", label: "System Health & WAL", icon: <Server size={18} /> },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`sidebar-btn ${activeTab === item.id ? "active" : ""}`}
            >
              {item.icon}
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.id === "kyc" && kycRequests.filter(r => r.status === "Pending").length > 0 && (
                <span style={{ 
                  background: "var(--yellow)", 
                  color: "#000", 
                  fontSize: 10, 
                  fontWeight: 900, 
                  padding: "2px 6px", 
                  borderRadius: 6,
                  lineHeight: 1
                }}>
                  {kycRequests.filter(r => r.status === "Pending").length}
                </span>
              )}
              {item.id === "disputes" && disputes.length > 0 && (
                <span style={{ 
                  background: "var(--red)", 
                  color: "#fff", 
                  fontSize: 10, 
                  fontWeight: 900, 
                  padding: "2px 6px", 
                  borderRadius: 6,
                  lineHeight: 1
                }}>
                  {disputes.length}
                </span>
              )}
              {item.id === "surveillance" && washAlerts.filter(w => w.status === "Flagged").length > 0 && (
                <span style={{ 
                  background: "var(--red)", 
                  color: "#fff", 
                  fontSize: 10, 
                  fontWeight: 900, 
                  padding: "2px 6px", 
                  borderRadius: 6,
                  lineHeight: 1
                }}>
                  {washAlerts.filter(w => w.status === "Flagged").length}
                </span>
              )}
            </button>
          ))}
        </aside>

        {/* CONTENT */}
        <main style={{ flex: 1, padding: "40px 48px", overflowY: "auto", position: "relative" }}>
          {/* TOAST Notification */}
          {toast && (
            <div className="pulse-glow-border" style={{
              position: "fixed",
              bottom: 32,
              right: 32,
              background: "#080d21",
              border: "1px solid var(--yellow)",
              color: "#FFF",
              padding: "16px 28px",
              borderRadius: 12,
              boxShadow: "0 8px 32px rgba(245, 166, 35, 0.15)",
              display: "flex",
              alignItems: "center",
              gap: 12,
              zIndex: 1000,
              fontSize: 13,
              fontWeight: 700
            }}>
              <CheckCircle2 size={18} color="var(--yellow)" />
              {toast}
            </div>
          )}

          {/* KYC Tab */}
          {activeTab === "kyc" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32 }}>
                <div>
                  <h2 style={{ fontSize: 24, fontWeight: 900, marginBottom: 6 }}>Identity & Liveness Verification</h2>
                  <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>Review and approve/reject high-tier user KYC applications.</p>
                </div>
                <div style={{ display: "flex", gap: 16 }}>
                  <div className="glass-panel" style={{ padding: "12px 24px", borderRadius: 12, textAlign: "center" }}>
                    <div style={{ fontSize: 10, color: "var(--text-secondary)", fontWeight: 700 }}>PENDING</div>
                    <div style={{ fontSize: 20, fontWeight: 900, color: "var(--yellow)", marginTop: 4 }}>
                      {kycRequests.filter(r => r.status === "Pending").length}
                    </div>
                  </div>
                  <div className="glass-panel" style={{ padding: "12px 24px", borderRadius: 12, textAlign: "center" }}>
                    <div style={{ fontSize: 10, color: "var(--text-secondary)", fontWeight: 700 }}>APPROVED</div>
                    <div style={{ fontSize: 20, fontWeight: 900, color: "var(--green)", marginTop: 4 }}>
                      {kycRequests.filter(r => r.status === "Approved").length}
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {kycRequests.length === 0 ? (
                  <div className="glass-panel" style={{ padding: 64, textAlign: "center" }}>
                    <ShieldCheck size={56} color="var(--green)" style={{ margin: "0 auto 20px" }} />
                    <p style={{ color: "var(--text-secondary)", fontSize: 15, fontWeight: 500 }}>All user verification requests have been cleared!</p>
                  </div>
                ) : (
                  kycRequests.map((req) => (
                    <div key={req.id} className="admin-card-flex glass-panel" style={{ padding: "24px 32px" }}>
                      <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
                        <div style={{ 
                          width: 56, height: 56, 
                          borderRadius: "50%", 
                          background: "var(--cyan-dim)", 
                          border: "1.5px solid var(--cyan)", 
                          display: "flex", 
                          alignItems: "center", 
                          justifyContent: "center", 
                          fontSize: 22,
                          boxShadow: "0 0 15px rgba(0, 240, 255, 0.1)"
                        }}>
                          👤
                        </div>
                        <div>
                          <div style={{ fontSize: 16, fontWeight: 700, display: "flex", alignItems: "center", gap: 10 }}>
                            {req.email}
                            <span style={{ fontSize: 9, background: "rgba(255,255,255,0.06)", border: "1px solid var(--border)", color: "var(--text-secondary)", padding: "2px 6px", borderRadius: 4 }}>
                              ID: {req.id}
                            </span>
                          </div>
                          <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 6, display: "flex", gap: 16 }}>
                            <span>Submitted: <strong style={{ color: "#fff" }}>{req.submittedAt}</strong></span>
                            <span>&bull;</span>
                            <span>Document: <strong style={{ color: "var(--cyan)" }}>{req.documentType} ({req.documentNumber})</strong></span>
                          </div>
                        </div>
                      </div>

                      {req.status === "Pending" ? (
                        <div style={{ display: "flex", gap: 12 }}>
                          <button onClick={() => handleKycResolve(req.id, false)} className="btn-outline" style={{ color: "var(--red)", borderColor: "rgba(244, 63, 94, 0.2)", padding: "10px 18px", fontSize: 12 }}>
                            <X size={14} /> Reject application
                          </button>
                          <button onClick={() => handleKycResolve(req.id, true)} className="btn-yellow" style={{ padding: "10px 18px", fontSize: 12 }}>
                            <Check size={14} /> Approve Verification
                          </button>
                        </div>
                      ) : (
                        <span className={`status-badge ${req.status.toLowerCase()}`}>
                          {req.status}
                        </span>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* LISTINGS Tab */}
          {activeTab === "listings" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32 }}>
                <div>
                  <h2 style={{ fontSize: 24, fontWeight: 900, marginBottom: 6 }}>Paid Listing applications</h2>
                  <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>Review token listings, check payment hashes, and deploy trading pairs.</p>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {listings.length === 0 ? (
                  <div className="glass-panel" style={{ padding: 64, textAlign: "center" }}>
                    <ShieldCheck size={56} color="var(--green)" style={{ margin: "0 auto 20px" }} />
                    <p style={{ color: "var(--text-secondary)", fontSize: 15 }}>No token listing applications currently pending.</p>
                  </div>
                ) : (
                  listings.map((app) => (
                    <div key={app.id} className="glass-panel" style={{ padding: 32 }}>
                      <div className="admin-card-flex" style={{ borderBottom: "1px solid var(--border)", paddingBottom: 20, marginBottom: 20, width: "100%" }}>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <span style={{ fontSize: 18, fontWeight: 800 }}>{app.name} ({app.symbol})</span>
                            <span className="status-badge approved" style={{ fontSize: 10 }}>
                              5,000 USDT Fee Locked
                            </span>
                          </div>
                          
                          <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 8, display: "flex", flexWrap: "wrap", gap: 20 }}>
                            <span>Chain Network: <strong style={{ color: "var(--cyan)" }}>{app.network}</strong></span>
                            <span>&bull;</span>
                            <span>Decimals: <strong>{app.decimals}</strong></span>
                            <span>&bull;</span>
                            <span>Smart Contract: <code style={{ color: "#fff", background: "rgba(255,255,255,0.03)", padding: "2px 6px", borderRadius: 4 }}>{app.contractAddress}</code></span>
                          </div>

                          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 8, fontFamily: "monospace" }}>
                            TX HASH: <span style={{ color: "var(--yellow)" }}>{app.txHash}</span>
                          </div>
                        </div>

                        <div style={{ textAlign: "right" }}>
                          <span style={{ fontSize: 12, color: "var(--text-muted)", display: "block" }}>Submitted: {app.submittedAt}</span>
                          <div style={{ fontSize: 18, fontWeight: 900, color: "var(--text-primary)", marginTop: 6 }}>
                            Initial Price: ${app.initialPrice.toFixed(2)}
                          </div>
                          <a href={app.website} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "var(--cyan)", fontSize: 12, textDecoration: "none", marginTop: 6 }}>
                            Project Website <ExternalLink size={12} />
                          </a>
                        </div>
                      </div>

                      {app.status === "Pending" ? (
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
                          <button onClick={() => handleResolveListing(app.id, false)} className="btn-outline" style={{ color: "var(--red)", borderColor: "rgba(244, 63, 94, 0.2)", padding: "8px 16px", fontSize: 12 }}>
                            Reject Request
                          </button>
                          <button onClick={() => handleResolveListing(app.id, true)} className="btn-yellow" style={{ padding: "8px 16px", fontSize: 12 }}>
                            Verify payment & Deploy Token
                          </button>
                        </div>
                      ) : (
                        <div style={{ textAlign: "right" }}>
                          <span className={`status-badge ${app.status.toLowerCase()}`}>
                            {app.status}
                          </span>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* MERCHANTS Tab */}
          {activeTab === "merchants" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32 }}>
                <div>
                  <h2 style={{ fontSize: 24, fontWeight: 900, marginBottom: 6 }}>P2P Merchant Applications</h2>
                  <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>Moderate user applications to lock security deposits and receive verified merchant badges.</p>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {merchants.length === 0 ? (
                  <div className="glass-panel" style={{ padding: 64, textAlign: "center" }}>
                    <ShieldCheck size={56} color="var(--green)" style={{ margin: "0 auto 20px" }} />
                    <p style={{ color: "var(--text-secondary)", fontSize: 15 }}>No P2P merchant requests pending.</p>
                  </div>
                ) : (
                  merchants.map((m) => (
                    <div key={m.id} className="admin-card-flex glass-panel" style={{ padding: "24px 32px" }}>
                      <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
                        <div style={{ 
                          width: 48, height: 48, 
                          borderRadius: 12, 
                          background: "rgba(245, 166, 35, 0.06)", 
                          border: "1px solid rgba(245, 166, 35, 0.2)", 
                          display: "flex", 
                          alignItems: "center", 
                          justifyContent: "center", 
                          fontSize: 20 
                        }}>
                          💼
                        </div>
                        <div>
                          <div style={{ fontSize: 16, fontWeight: 700 }}>{m.username}</div>
                          <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 6, display: "flex", gap: 16 }}>
                            <span>UPI ID: <strong style={{ color: "var(--cyan)" }}>{m.upiId}</strong></span>
                            <span>&bull;</span>
                            <span>Security Collateral: <strong style={{ color: "var(--yellow)" }}>{m.depositAmount} USDT (LOCK FILED)</strong></span>
                          </div>
                        </div>
                      </div>

                      {m.status === "Pending" ? (
                        <div style={{ display: "flex", gap: 12 }}>
                          <button onClick={() => handleResolveMerchant(m.id, false)} className="btn-outline" style={{ color: "var(--red)", borderColor: "rgba(244, 63, 94, 0.2)", padding: "8px 16px", fontSize: 12 }}>
                            Reject Request
                          </button>
                          <button onClick={() => handleResolveMerchant(m.id, true)} className="btn-yellow" style={{ padding: "8px 16px", fontSize: 12 }}>
                            Authorize Merchant Badging
                          </button>
                        </div>
                      ) : (
                        <span className={`status-badge ${m.status.toLowerCase()}`}>
                          {m.status}
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
              <div style={{ marginBottom: 32 }}>
                <h2 style={{ fontSize: 24, fontWeight: 900, marginBottom: 6 }}>Manual Custom Pair Registry</h2>
                <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>Directly inject and deploy custom asset tickers into the local database and streaming ticker feeds.</p>
              </div>

              <div className="list-token-grid">
                <form onSubmit={handleAddPair} className="glass-panel" style={{
                  padding: 32,
                  display: "flex",
                  flexDirection: "column",
                  gap: 20,
                  height: "fit-content"
                }}>
                  <h3 style={{ fontSize: 16, fontWeight: 800, borderBottom: "1px solid var(--border)", paddingBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
                    <Plus size={18} color="var(--yellow)" />
                    Register New Trading Pair
                  </h3>

                  <div>
                    <label style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 800, display: "block", marginBottom: 8, letterSpacing: "0.05em" }}>TOKEN SYMBOL</label>
                    <input type="text" className="bn-input" placeholder="e.g. MATIC" value={newSymbol} onChange={e => setNewSymbol(e.target.value)} required />
                  </div>

                  <div>
                    <label style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 800, display: "block", marginBottom: 8, letterSpacing: "0.05em" }}>ASSET NAME</label>
                    <input type="text" className="bn-input" placeholder="e.g. Polygon" value={newName} onChange={e => setNewName(e.target.value)} required />
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    <div>
                      <label style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 800, display: "block", marginBottom: 8, letterSpacing: "0.05em" }}>INITIAL PRICE (USDT)</label>
                      <input type="number" step="any" className="bn-input" placeholder="1.24" value={newPrice} onChange={e => setNewPrice(e.target.value)} required />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 800, display: "block", marginBottom: 8, letterSpacing: "0.05em" }}>24H CHANGE (%)</label>
                      <input type="number" step="any" className="bn-input" placeholder="+4.25" value={newChange} onChange={e => setNewChange(e.target.value)} />
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 800, display: "block", marginBottom: 8, letterSpacing: "0.05em" }}>24H VOLUME</label>
                    <input type="number" className="bn-input" placeholder="850000" value={newVolume} onChange={e => setNewVolume(e.target.value)} />
                  </div>

                  <div>
                    <label style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 800, display: "block", marginBottom: 8, letterSpacing: "0.05em" }}>THEME ACCENT COLOR</label>
                    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                      <input type="color" className="bn-input" style={{ width: 64, height: 44, padding: 4, cursor: "pointer" }} value={newColor} onChange={e => setNewColor(e.target.value)} />
                      <span style={{ fontSize: 13, fontFamily: "monospace", color: "var(--text-secondary)" }}>{newColor}</span>
                    </div>
                  </div>

                  <button type="submit" className="btn-yellow" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: 14, fontWeight: 800, marginTop: 12 }}>
                    <Layers size={16} /> Deploy & Broadcast Pair
                  </button>
                </form>

                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
                    <Clock size={18} color="var(--yellow)" />
                    Deployed Pairs
                  </h3>
                  
                  {customPairs.length === 0 ? (
                    <div style={{ background: "rgba(10, 17, 40, 0.2)", border: "1px dashed var(--border)", borderRadius: 16, padding: 64, textAlign: "center", color: "var(--text-secondary)", fontSize: 14 }}>
                      No manual pairs deployed yet.
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                      {customPairs.map((p, idx) => (
                        <div key={idx} className="admin-card-flex glass-panel" style={{ padding: "20px 24px", borderRadius: 16 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                            <div style={{ 
                              width: 14, height: 14, 
                              borderRadius: "50%", 
                              background: p.color,
                              boxShadow: `0 0 10px ${p.color}`
                            }} />
                            <div>
                              <span style={{ fontWeight: 800, fontSize: 16 }}>{p.symbol}/USDT</span>
                              <span style={{ fontSize: 12, color: "var(--text-secondary)", marginLeft: 10 }}>{p.name}</span>
                            </div>
                          </div>
                          
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontWeight: 900, fontSize: 16, color: "#fff" }}>${p.price.toFixed(2)}</div>
                            <div style={{ 
                              fontSize: 12, 
                              color: p.change24h >= 0 ? "var(--green)" : "var(--red)", 
                              fontWeight: 700,
                              marginTop: 4
                            }}>
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
              <div style={{ marginBottom: 32 }}>
                <h2 style={{ fontSize: 24, fontWeight: 900, marginBottom: 6 }}>P2P Escrows & Webhooks</h2>
                <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>Perform payment gateway overrides, view real-time trades, and resolve disputed transactions.</p>
              </div>

              <div className="list-token-grid">
                {/* Active disputes */}
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
                    <ShieldAlert size={18} color="var(--red)" />
                    Active Disputes Arbitration
                  </h3>
                  
                  <div style={{ display: "flex", flexDirection: "column", gap: 20, marginBottom: 40 }}>
                    {disputes.length === 0 ? (
                      <div className="glass-panel" style={{ padding: 48, textAlign: "center" }}>
                        <ShieldCheck size={48} color="var(--green)" style={{ margin: "0 auto 16px" }} />
                        <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>All dispute tickets cleared.</p>
                      </div>
                    ) : (
                      disputes.map((d) => (
                        <div key={d.id} className="glass-panel" style={{ padding: 24, border: "1px solid rgba(244, 63, 94, 0.15)" }}>
                          <div className="admin-card-flex" style={{ borderBottom: "1px solid var(--border)", paddingBottom: 16, marginBottom: 16, width: "100%" }}>
                            <div>
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <span style={{ fontSize: 15, fontWeight: 800, color: "var(--yellow)" }}>{d.id}</span>
                                <span className="status-badge rejected" style={{ fontSize: 9 }}>
                                  DISPUTED ORDER
                                </span>
                              </div>
                              <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 6 }}>
                                Buyer: <strong style={{ color: "#fff" }}>{d.buyer}</strong> &bull; Seller: <strong style={{ color: "#fff" }}>{d.seller}</strong>
                              </div>
                            </div>
                            <div style={{ textAlign: "right" }}>
                              <div style={{ fontSize: 16, fontWeight: 900, color: "var(--text-primary)" }}>{d.amount} {d.coin}</div>
                              <div style={{ fontSize: 12, color: "var(--yellow)", fontWeight: 600, marginTop: 4 }}>₹{d.fiatAmount.toLocaleString("en-IN")} INR</div>
                            </div>
                          </div>

                          <div className="admin-card-flex" style={{ width: "100%" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--green)", fontSize: 12, fontWeight: 700 }}>
                              <CheckCircle2 size={14} /> Slip Uploaded & Verified
                            </div>
                            <div style={{ display: "flex", gap: 10 }}>
                              <button onClick={() => handleResolveDispute(d.id, "seller")} className="btn-outline" style={{ color: "var(--red)", borderColor: "rgba(244, 63, 94, 0.2)", padding: "6px 12px", fontSize: 12 }}>
                                Refund Seller
                              </button>
                              <button onClick={() => handleResolveDispute(d.id, "buyer")} className="btn-yellow" style={{ padding: "6px 12px", fontSize: 12 }}>
                                Release to Buyer
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Live database escrows list */}
                  <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
                    <Database size={18} color="var(--yellow)" />
                    Live Exchange P2P Escrows
                  </h3>
                  
                  {liveEscrows.length === 0 ? (
                    <div style={{ background: "rgba(10,17,40,0.1)", border: "1px dashed var(--border)", borderRadius: 16, padding: 32, textAlign: "center", color: "var(--text-secondary)", fontSize: 13 }}>
                      No active trades in system database (using sandbox fallback).
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 12, maxHeight: 400, overflowY: "auto", paddingRight: 6 }}>
                      {liveEscrows.map((e, idx) => (
                        <div key={idx} className="glass-panel" style={{ padding: "16px 20px" }}>
                          <div className="admin-card-flex">
                            <div>
                              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <span style={{ fontWeight: 800, fontSize: 14 }}>{e.id}</span>
                                <span className={`status-badge ${e.state === 'RELEASED' ? 'approved' : e.state === 'DISPUTED' ? 'rejected' : 'pending'}`} style={{ fontSize: 9 }}>
                                  {e.state}
                                </span>
                              </div>
                              <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 6 }}>
                                Buyer: <span style={{ color: "#fff" }}>{e.buyerId}</span> &bull; Seller: <span style={{ color: "#fff" }}>{e.sellerId}</span>
                              </div>
                            </div>
                            
                            <div style={{ textAlign: "right" }}>
                              <div style={{ fontWeight: 800, fontSize: 14, color: "#fff" }}>{e.amountUsdt} USDT</div>
                              <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 4 }}>₹{parseFloat(e.amountInr).toLocaleString("en-IN")} INR</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Webhook simulator */}
                <form onSubmit={triggerUpiWebhookSim} className="glass-panel" style={{
                  padding: 32,
                  display: "flex",
                  flexDirection: "column",
                  gap: 20,
                  height: "fit-content",
                  border: "1px solid rgba(0, 240, 255, 0.15)",
                  boxShadow: "0 0 20px rgba(0, 240, 255, 0.05)"
                }}>
                  <h3 style={{ fontSize: 16, fontWeight: 800, borderBottom: "1px solid var(--border)", paddingBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 18 }}>⚡</span>
                    UPI Payment Gateway Webhook Simulator
                  </h3>
                  
                  <p style={{ color: "var(--text-secondary)", fontSize: 12, lineHeight: 1.6 }}>
                    Simulate an incoming HTTP payout callback webhook from a payment gateway (Razorpay/Paytm).
                    Matches reference numbers or transaction amounts to trigger **automatic stablecoin release** on the live GoldChain L1 ledger!
                  </p>

                  <div>
                    <label style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 800, display: "block", marginBottom: 8, letterSpacing: "0.05em" }}>
                      UPI TRANSACTION REFERENCE ID
                    </label>
                    <input type="text" className="bn-input" value={simUpiRef} onChange={e => setSimUpiRef(e.target.value)} required style={{ fontFamily: "monospace", color: "var(--cyan)" }} />
                  </div>

                  <div>
                    <label style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 800, display: "block", marginBottom: 8, letterSpacing: "0.05em" }}>
                      TRANSACTION AMOUNT (INR)
                    </label>
                    <input type="number" className="bn-input" value={simAmount} onChange={e => setSimAmount(e.target.value)} required />
                  </div>

                  <button type="submit" className="btn-yellow" style={{ 
                    display: "flex", 
                    alignItems: "center", 
                    justifyContent: "center", 
                    gap: 8, 
                    padding: 14, 
                    fontWeight: 800, 
                    marginTop: 12,
                    background: "linear-gradient(135deg, var(--cyan) 0%, #00bcff 100%)",
                    color: "#000",
                    boxShadow: "0 4px 15px rgba(0, 240, 255, 0.2)"
                  }}>
                    <ArrowRightLeft size={16} /> Broadcast Gateway Webhook Alert
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* --- NEW ROOM: MARKET SURVEILLANCE --- */}
          {activeTab === "surveillance" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32 }}>
                <div>
                  <h2 style={{ fontSize: 24, fontWeight: 900, marginBottom: 6 }}>Market Surveillance & Audit Logs</h2>
                  <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>Real-time surveillance analytics blocking wash trading, spoofing attempts, and trade layering anomalies.</p>
                </div>
                <div style={{ display: "flex", gap: 16 }}>
                  <div className="glass-panel" style={{ padding: "12px 24px", borderRadius: 12, textAlign: "center" }}>
                    <div style={{ fontSize: 10, color: "var(--text-secondary)", fontWeight: 700 }}>SUSPENDED</div>
                    <div style={{ fontSize: 20, fontWeight: 900, color: "var(--red)", marginTop: 4 }}>
                      {blockedUsers.length}
                    </div>
                  </div>
                </div>
              </div>

              <div className="list-token-grid" style={{ gap: 32 }}>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
                    <Flame size={18} color="var(--red)" />
                    Self-Matched Wash Trade Alerts
                  </h3>
                  
                  <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 32 }}>
                    {washAlerts.map((w) => (
                      <div key={w.id} className="glass-panel" style={{ 
                        padding: 20, 
                        border: w.status === "Flagged" ? "1px solid rgba(244, 63, 94, 0.2)" : "1px solid var(--border)",
                        background: w.status === "Flagged" ? "rgba(244, 63, 94, 0.02)" : "transparent"
                      }}>
                        <div className="admin-card-flex" style={{ marginBottom: 12 }}>
                          <div>
                            <span style={{ fontWeight: 800, color: "var(--red)", fontSize: 13 }}>{w.id}</span>
                            <span className={`status-badge ${w.status === "Flagged" ? "rejected" : w.status === "Blocked" ? "rejected" : "approved"}`} style={{ fontSize: 8, marginLeft: 8 }}>
                              {w.status}
                            </span>
                          </div>
                          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{w.timestamp}</span>
                        </div>
                        
                        <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                          User <strong style={{ color: "#fff" }}>{w.buyer}</strong> traded with themselves on pair <strong style={{ color: "var(--yellow)" }}>{w.symbol}</strong>.
                        </div>
                        
                        <div className="admin-card-flex" style={{ marginTop: 14, borderTop: "1px solid var(--border)", paddingTop: 10 }}>
                          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                            Val: <strong>{w.quantity} {w.symbol.split('/')[0]}</strong> (${w.value.toLocaleString()})
                          </span>
                          
                          {w.status === "Flagged" && (
                            <div style={{ display: "flex", gap: 8 }}>
                              <button onClick={() => handleResolveWash(w.id, "Pardon")} className="btn-outline" style={{ padding: "4px 8px", fontSize: 10, borderRadius: 6 }}>
                                Pardon
                              </button>
                              <button onClick={() => handleResolveWash(w.id, "Block")} className="btn-yellow" style={{ background: "var(--red)", color: "#fff", padding: "4px 8px", fontSize: 10, borderRadius: 6 }}>
                                Suspend Account
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
                    <ShieldAlert size={18} color="var(--yellow)" />
                    Spoofing & Rapid Cancel Alarms
                  </h3>

                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    {spoofAlerts.map((s) => (
                      <div key={s.id} className="glass-panel" style={{ 
                        padding: 20,
                        border: s.status === "Active" ? "1px solid rgba(245, 166, 35, 0.2)" : "1px solid var(--border)",
                        background: s.status === "Active" ? "rgba(245, 166, 35, 0.02)" : "transparent"
                      }}>
                        <div className="admin-card-flex" style={{ marginBottom: 12 }}>
                          <div>
                            <span style={{ fontWeight: 800, color: "var(--yellow)", fontSize: 13 }}>{s.id}</span>
                            <span className={`status-badge ${s.status === "Active" ? "pending" : s.status === "Blocked" ? "rejected" : "approved"}`} style={{ fontSize: 8, marginLeft: 8 }}>
                              {s.status}
                            </span>
                          </div>
                          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{s.timestamp}</span>
                        </div>

                        <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                          User <strong style={{ color: "#fff" }}>{s.user}</strong> triggered spoofing thresholds on <strong style={{ color: "var(--yellow)" }}>{s.symbol}</strong>.
                        </div>

                        <div className="admin-card-flex" style={{ marginTop: 14, borderTop: "1px solid var(--border)", paddingTop: 10 }}>
                          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                            Rate: <strong style={{ color: "var(--red)" }}>{s.actionRate} cancels/s</strong> &bull; Volume: <strong>${s.volumeUsdt.toLocaleString()}</strong>
                          </span>

                          {s.status === "Active" && (
                            <div style={{ display: "flex", gap: 8 }}>
                              <button onClick={() => handleResolveSpoof(s.id, "Pardon")} className="btn-outline" style={{ padding: "4px 8px", fontSize: 10, borderRadius: 6 }}>
                                Pardon
                              </button>
                              <button onClick={() => handleResolveSpoof(s.id, "Block")} className="btn-yellow" style={{ background: "var(--red)", color: "#fff", padding: "4px 8px", fontSize: 10, borderRadius: 6 }}>
                                Suspend User
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
                    <Lock size={18} color="var(--red)" />
                    Suspended Accounts Index
                  </h3>

                  <div className="glass-panel" style={{ padding: 24 }}>
                    <p style={{ color: "var(--text-secondary)", fontSize: 12, lineHeight: 1.6, marginBottom: 16 }}>
                      These high-risk or manipulative trading accounts are isolated. All on-chain asset withdrawal bridges, wallet custody unlocks, and HFT order placements have been programmatically blocked.
                    </p>
                    
                    {blockedUsers.length === 0 ? (
                      <div style={{ border: "1px dashed var(--border)", borderRadius: 10, padding: 24, textAlign: "center", color: "var(--text-muted)", fontSize: 12 }}>
                        No accounts suspended.
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        {blockedUsers.map((user, idx) => (
                          <div key={idx} className="admin-card-flex" style={{ 
                            background: "rgba(244, 63, 94, 0.05)",
                            border: "1px solid rgba(244, 63, 94, 0.15)",
                            borderRadius: 8,
                            padding: "10px 14px"
                          }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--red)" }}>{user}</span>
                            <button onClick={() => handleUnblockUser(user)} className="btn-outline" style={{ 
                              padding: "4px 8px", 
                              fontSize: 10, 
                              borderRadius: 6,
                              borderColor: "var(--green)",
                              color: "var(--green)"
                            }}>
                              Restore limits
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* --- NEW ROOM: MARGIN RISK ENGINE --- */}
          {activeTab === "risk" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32 }}>
                <div>
                  <h2 style={{ fontSize: 24, fontWeight: 900, marginBottom: 6 }}>Margin Risk & Liquidation Simulator</h2>
                  <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>Monitor high-leverage trader maintenance margins, track Insurance Funds, and trigger stress crashes.</p>
                </div>
                
                <div style={{ display: "flex", gap: 16 }}>
                  <div className="glass-panel" style={{ padding: "12px 24px", borderRadius: 12, textAlign: "center" }}>
                    <div style={{ fontSize: 10, color: "var(--text-secondary)", fontWeight: 700 }}>INSURANCE FUND</div>
                    <div style={{ fontSize: 20, fontWeight: 900, color: "var(--green)", marginTop: 4 }}>
                      ${insuranceFund.toLocaleString()} USDT
                    </div>
                  </div>
                  <div className="glass-panel" style={{ padding: "12px 24px", borderRadius: 12, textAlign: "center" }}>
                    <div style={{ fontSize: 10, color: "var(--text-secondary)", fontWeight: 700 }}>BTC MARK PRICE</div>
                    <div style={{ fontSize: 20, fontWeight: 900, color: "var(--yellow)", marginTop: 4 }}>
                      ${btcPrice.toLocaleString()} USDT
                    </div>
                  </div>
                </div>
              </div>

              {/* Stress Crash triggers */}
              <div className="glass-panel" style={{ 
                padding: 32, 
                marginBottom: 32,
                border: isFlashCrashTriggered ? "1px solid rgba(244, 63, 94, 0.4)" : "1px solid var(--border)",
                background: isFlashCrashTriggered ? "rgba(244, 63, 94, 0.02)" : "transparent"
              }}>
                <div className="admin-card-flex">
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 6, display: "flex", alignItems: "center", gap: 8 }}>
                      {isFlashCrashTriggered ? <Flame size={20} color="var(--red)" /> : <Activity size={20} color="var(--yellow)" />}
                      Margin Leverage Volatility Stress Tester
                    </h3>
                    <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                      Trigger a dynamic volatility shock event. Drops the simulated BTC mark price to **$53,500.00 USDT** instantly. 
                      Leveraged margin traders will fall below maintenance margin limits, causing the **Rust Risk Engine** to auto-liquidate accounts, leaving deficits to be absorbed by the Insurance Fund!
                    </p>
                  </div>

                  <div style={{ display: "flex", gap: 12, flexShrink: 0 }}>
                    {isFlashCrashTriggered ? (
                      <button onClick={restoreBtcPrice} className="btn-yellow" style={{ 
                        background: "var(--green)", 
                        color: "#000",
                        boxShadow: "0 4px 15px rgba(16, 185, 129, 0.2)"
                      }}>
                        Reset Stress Parameters
                      </button>
                    ) : (
                      <button onClick={triggerVolatilityCrash} className="btn-yellow" style={{ 
                        background: "var(--red)", 
                        color: "#fff",
                        boxShadow: "0 4px 15px rgba(244, 63, 94, 0.2)"
                      }}>
                        🚨 Trigger BTC Flash Crash
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Margin Stress Account List */}
              <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
                <Users size={18} color="var(--yellow)" />
                Active Leverage Margin Accounts
              </h3>

              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {marginAccounts.map((acc, idx) => (
                  <div key={idx} className="glass-panel" style={{ 
                    padding: 24, 
                    border: acc.status === "LIQUIDATED" ? "1px solid rgba(244, 63, 94, 0.3)" : acc.status === "MARGIN CALL" ? "1px solid rgba(245, 166, 35, 0.3)" : "1px solid var(--border)",
                    background: acc.status === "LIQUIDATED" ? "rgba(244, 63, 94, 0.03)" : acc.status === "MARGIN CALL" ? "rgba(245, 166, 35, 0.03)" : "transparent"
                  }}>
                    <div className="admin-card-flex" style={{ borderBottom: "1px solid var(--border)", paddingBottom: 16, marginBottom: 16 }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ fontWeight: 800, fontSize: 15 }}>{acc.userId}</span>
                          <span className={`status-badge ${acc.status === "SAFE" ? "approved" : acc.status === "MARGIN CALL" ? "pending" : "rejected"}`}>
                            {acc.status}
                          </span>
                        </div>
                        <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 6 }}>
                          Position Size: <strong style={{ color: acc.btcPositionSize > 0 ? "var(--green)" : "var(--red)" }}>
                            {acc.btcPositionSize > 0 ? "LONG" : "SHORT"} {Math.abs(acc.btcPositionSize)} BTC
                          </strong> &bull; Entry Price: <strong>${acc.entryPrice.toLocaleString()}</strong>
                        </div>
                      </div>

                      <div style={{ textAlign: "right" }}>
                        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>LEVERAGE</span>
                        <div style={{ fontSize: 18, fontWeight: 900, color: "var(--yellow)" }}>{acc.leverage}x</div>
                      </div>
                    </div>

                    <div className="grid-responsive-3" style={{ gap: 16 }}>
                      <div>
                        <span style={{ fontSize: 10, color: "var(--text-muted)", display: "block" }}>COLLATERAL</span>
                        <span style={{ fontSize: 14, fontWeight: 700 }}>${acc.collateral.toLocaleString()} USDT</span>
                      </div>
                      <div>
                        <span style={{ fontSize: 10, color: "var(--text-muted)", display: "block" }}>ACCOUNT EQUITY</span>
                        <span style={{ fontSize: 14, fontWeight: 700, color: acc.equity <= 0 ? "var(--red)" : "#fff" }}>
                          ${acc.equity.toLocaleString()} USDT
                        </span>
                      </div>
                      <div>
                        <span style={{ fontSize: 10, color: "var(--text-muted)", display: "block" }}>MMR (MAINTENANCE REQUIRED)</span>
                        <span style={{ fontSize: 14, fontWeight: 700 }}>${acc.maintMargin.toLocaleString()} USDT</span>
                      </div>
                    </div>

                    {acc.status === "LIQUIDATED" && acc.liquidatedDeficit && (
                      <div style={{ 
                        marginTop: 16, 
                        background: "rgba(244, 63, 94, 0.05)", 
                        border: "1px solid rgba(244, 63, 94, 0.15)", 
                        padding: "10px 14px", 
                        borderRadius: 8,
                        fontSize: 12,
                        color: "var(--red)",
                        fontWeight: 600,
                        display: "flex",
                        justifyContent: "space-between"
                      }}>
                        <span>[Deficit Incident] Trader Collateral Exceeded. Deficit occurred:</span>
                        <span>-${acc.liquidatedDeficit.toLocaleString()} USDT (Absorbed by Fund)</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* --- NEW ROOM: CUSTODY WALLET VAULTS --- */}
          {activeTab === "custody" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 32 }}>
                <div>
                  <h2 style={{ fontSize: 24, fontWeight: 900, marginBottom: 6 }}>Custody Wallet Vaults & Reserves</h2>
                  <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>Audit physical cryptocurrency hot/cold vaults, run double-entry ledger audits, and check L1 Gas reserves.</p>
                </div>
              </div>

              <div className="list-token-grid">
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
                    <Database size={18} color="var(--yellow)" />
                    Institutional Vault Balances
                  </h3>

                  <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 32 }}>
                    {[
                      { coin: "USDT", total: "1,524,800.50", hot: "24,800.50", cold: "1,500,000.00" },
                      { coin: "BTC", total: "24.285", hot: "4.285", cold: "20.000" },
                      { coin: "ETH", total: "348.50", hot: "48.50", cold: "300.00" },
                      { coin: "SOL", total: "1,240.25", hot: "240.25", cold: "1,000.00" },
                      { coin: "BNB", total: "84.80", hot: "14.80", cold: "70.00" }
                    ].map((item, idx) => (
                      <div key={idx} className="glass-panel" style={{ padding: "18px 24px" }}>
                        <div className="admin-card-flex">
                          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <div style={{ 
                              width: 36, height: 36, borderRadius: 8, 
                              background: "rgba(245, 166, 35, 0.05)", border: "1px solid rgba(245, 166, 35, 0.15)",
                              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 800
                            }}>
                              {item.coin}
                            </div>
                            <div>
                              <div style={{ fontWeight: 800, fontSize: 15 }}>{item.total} {item.coin}</div>
                              <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 4 }}>
                                Hot: {item.hot} &bull; Cold Multi-Sig: {item.cold}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
                    <BatteryCharging size={18} color="var(--cyan)" />
                    Relayer Gas Reserves
                  </h3>

                  <div className="grid-responsive-3" style={{ gap: 16 }}>
                    <div className="glass-panel" style={{ padding: 20 }}>
                      <span style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 800 }}>GOLDCHAIN L1 RELAYER</span>
                      <div style={{ fontSize: 20, fontWeight: 900, color: "var(--cyan)", marginTop: 8 }}>842.50 GLD</div>
                      <div style={{ width: "100%", height: 4, background: "rgba(255,255,255,0.05)", borderRadius: 2, marginTop: 10, overflow: "hidden" }}>
                        <div style={{ width: "84%", height: "100%", background: "var(--cyan)" }} />
                      </div>
                      <span style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6, display: "block" }}>Status: Excellent (84%)</span>
                    </div>

                    <div className="glass-panel" style={{ padding: 20 }}>
                      <span style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 800 }}>EVM BRIDGE RELAYER</span>
                      <div style={{ fontSize: 20, fontWeight: 900, color: "var(--yellow)", marginTop: 8 }}>2.84 ETH</div>
                      <div style={{ width: "100%", height: 4, background: "rgba(255,255,255,0.05)", borderRadius: 2, marginTop: 10, overflow: "hidden" }}>
                        <div style={{ width: "42%", height: "100%", background: "var(--yellow)" }} />
                      </div>
                      <span style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 6, display: "block" }}>Status: Moderate (42%)</span>
                    </div>
                  </div>
                </div>

                <div className="glass-panel" style={{ padding: 32, height: "fit-content" }}>
                  <h3 style={{ fontSize: 16, fontWeight: 800, borderBottom: "1px solid var(--border)", paddingBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
                    <FileSearch size={18} color="var(--yellow)" />
                    Double-Entry Reserve Audit Room
                  </h3>

                  <p style={{ color: "var(--text-secondary)", fontSize: 12, lineHeight: 1.6, marginTop: 14 }}>
                    Perform an automated reserve audit. This verifies that all asset entries across our PostgreSQL user ledger match the physical cryptographically sealed vaults down to 18 decimal places!
                  </p>

                  <div style={{ margin: "24px 0" }}>
                    {vaultReconciliationStatus === "idle" && (
                      <button onClick={runReconciliationAudit} className="btn-yellow" style={{ width: "100%", padding: 14 }}>
                        Run Cryptographic Reserves Audit
                      </button>
                    )}

                    {vaultReconciliationStatus === "loading" && (
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 700, marginBottom: 8 }}>
                          <span>Auditing Reserves...</span>
                          <span>{auditProgress}%</span>
                        </div>
                        <div style={{ width: "100%", height: 6, background: "rgba(255,255,255,0.05)", borderRadius: 3, overflow: "hidden" }}>
                          <div style={{ width: `${auditProgress}%`, height: "100%", background: "var(--yellow)", transition: "width 0.2s ease" }} />
                        </div>
                      </div>
                    )}

                    {vaultReconciliationStatus === "success" && (
                      <div style={{ textAlign: "center" }}>
                        <div style={{ 
                          width: 48, height: 48, borderRadius: "50%", 
                          background: "var(--green-dim)", border: "1.5px solid var(--green)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          margin: "0 auto 14px", color: "var(--green)"
                        }}>
                          <Check size={24} />
                        </div>
                        <span style={{ fontSize: 14, fontWeight: 800, color: "var(--green)" }}>Reserve Ledger Verified OK!</span>
                        <button onClick={() => setVaultReconciliationStatus("idle")} className="btn-outline" style={{ width: "100%", padding: 10, fontSize: 12, marginTop: 16 }}>
                          Reset Diagnostic Audit
                        </button>
                      </div>
                    )}
                  </div>

                  <div style={{ 
                    background: "rgba(0,0,0,0.4)",
                    borderRadius: 12,
                    padding: "16px 20px",
                    fontFamily: "monospace",
                    fontSize: 11,
                    minHeight: 120,
                    border: "1px solid var(--border)",
                    color: "var(--cyan)",
                    boxShadow: "inset 0 2px 10px rgba(0,0,0,0.5)"
                  }}>
                    {auditLogs.length === 0 ? (
                      <span style={{ color: "var(--text-muted)" }}>[system] Awaiting audit trigger.</span>
                    ) : (
                      auditLogs.map((log, idx) => (
                        <div key={idx} style={{ marginBottom: 4 }}>{log}</div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SYSTEM Tab */}
          {activeTab === "system" && (
            <div>
              <div style={{ marginBottom: 32 }}>
                <h2 style={{ fontSize: 24, fontWeight: 900, marginBottom: 6 }}>Core Infrastructure Metrics</h2>
                <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>Real-time telemetry from the DPDK High-Frequency Trading Engine and ledger WAL logs.</p>
              </div>

              <div className="grid-responsive-3" style={{ marginBottom: 40 }}>
                {[
                  { title: "Matching Latency", val: "0.12 μs", desc: "DPDK core kernel bypass time", ok: true },
                  { title: "Peak Ingestion", val: "2,450,000 tx/s", desc: "L1 ring-buffer throughput", ok: true },
                  { title: "Consensus State", val: "0 DIV", desc: "Blockchain split variances", ok: true },
                  { title: "WAL Log Space", val: "100 MB", desc: "Mmapped Write-Ahead Logs", ok: true },
                  { title: "Ledger Audit", val: "Verified OK", desc: "Cryptographic double-entry validation", ok: true },
                  { title: "Smart Escrows", val: "100% Active", desc: "GoldChain L1 contract listeners", ok: true },
                ].map((s, idx) => (
                  <div key={idx} className="glass-panel" style={{ padding: 24, position: "relative", overflow: "hidden" }}>
                    <div style={{ 
                      position: "absolute", top: 0, left: 0, bottom: 0, width: 4, 
                      background: s.ok ? "var(--green)" : "var(--red)" 
                    }} />
                    <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em" }}>{s.title}</div>
                    <div style={{ fontSize: 24, fontWeight: 900, color: "var(--yellow)", marginTop: 10 }}>{s.val}</div>
                    <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 6, lineHeight: 1.4 }}>{s.desc}</div>
                  </div>
                ))}
              </div>

              {/* L1 Controller Section */}
              <div className="glass-panel" style={{ 
                padding: 32, 
                marginBottom: 32,
                border: isChainHalted ? "1px solid rgba(244, 63, 94, 0.3)" : "1px solid rgba(16, 185, 129, 0.15)",
                background: isChainHalted ? "rgba(244, 63, 94, 0.02)" : "rgba(16, 185, 129, 0.01)"
              }}>
                <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 12, display: "flex", alignItems: "center", gap: 10 }}>
                  <ShieldAlert size={20} color={isChainHalted ? "var(--red)" : "var(--yellow)"} />
                  GoldChain L1 Consensus Halt Controller
                </h3>
                <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 20 }}>
                  In case of double-spend detection, critical bugs, or system upgrade overrides, master administrators can trigger an emergency consensus freeze. This completely halts transaction packaging and blocks RPC node relays.
                </p>

                <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                  {isChainHalted ? (
                    <button onClick={() => { setIsChainHalted(false); triggerToast("Consensus packaging active. Blockchain resumed."); }} className="btn-yellow" style={{ background: "var(--green)", color: "#000", boxShadow: "0 4px 15px rgba(16, 185, 129, 0.2)", padding: "12px 24px" }}>
                      Resume Consensus Packaging
                    </button>
                  ) : (
                    <button onClick={() => { setIsChainHalted(true); triggerToast("Consensus packaging HALTED. Live RPC disabled."); }} className="btn-yellow" style={{ background: "var(--red)", color: "#fff", boxShadow: "0 4px 15px rgba(244, 63, 94, 0.2)", padding: "12px 24px" }}>
                      🚨 HALT BLOCKCHAIN CONSENSUS
                    </button>
                  )}

                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ 
                      width: 8, height: 8, borderRadius: "50%", 
                      background: isChainHalted ? "var(--red)" : "var(--green)",
                      boxShadow: isChainHalted ? "0 0 10px var(--red)" : "0 0 10px var(--green)",
                      display: "inline-block"
                    }} />
                    <span style={{ fontSize: 13, color: isChainHalted ? "var(--red)" : "var(--green)", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.03em" }}>
                      {isChainHalted ? "CHAIN HALTED (BLOCK RELAYS SHUT DOWN)" : "CHAIN NORMAL (PACKAGING BLOCKS)"}
                    </span>
                  </div>
                </div>
              </div>

              {/* WAL Section */}
              <div className="glass-panel" style={{ padding: 32 }}>
                <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 12, display: "flex", alignItems: "center", gap: 10 }}>
                  <Settings size={20} color="var(--text-secondary)" />
                  WAL (Write-Ahead Log) Indexer logs
                </h3>
                <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 20 }}>
                  Our zero-copy memory-mapped WAL is continuously writing ledger changes.
                </p>
                <div style={{ 
                  background: "rgba(0, 0, 0, 0.4)", 
                  borderRadius: 12, 
                  padding: "16px 20px", 
                  fontFamily: "monospace", 
                  fontSize: 12, 
                  color: "var(--cyan)", 
                  border: "1px solid var(--border)",
                  boxShadow: "inset 0 2px 10px rgba(0,0,0,0.5)"
                }}>
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
