"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  LogOut, 
  ShieldCheck, 
  Camera, 
  FileText, 
  CheckCircle2, 
  User, 
  RefreshCw,
  Search,
  Copy,
  QrCode,
  ArrowUpRight,
  ArrowDownLeft,
  Wallet,
  DollarSign,
  History,
  Lock,
  Mail,
  X,
  TrendingUp,
  ShieldAlert,
  Coins
} from "lucide-react";
import CloudExchangeLogo from "../components/CloudExchangeLogo";
import SpaceBackground from "../components/SpaceBackground";

interface AssetBalance {
  symbol: string;
  name: string;
  amount: number;
  inOrder: number;
  color: string;
}

interface TxHistoryItem {
  id: string;
  time: string;
  type: "Deposit" | "Withdrawal";
  coin: string;
  amount: number;
  address: string;
  status: "Completed" | "Processing" | "Failed";
}

interface CoinDirectoryItem {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  volume24h: number;
  color: string;
}

const COIN_DIRECTORY_LIST: CoinDirectoryItem[] = [
  { symbol: "BTC", name: "Bitcoin", price: 65050.00, change24h: 2.45, volume24h: 28450, color: "#F7931A" },
  { symbol: "ETH", name: "Ethereum", price: 3450.00, change24h: -1.20, volume24h: 15120, color: "#627EEA" },
  { symbol: "USDT", name: "Tether USD", price: 1.00, change24h: 0.01, volume24h: 42800, color: "#26A17B" },
  { symbol: "SOL", name: "Solana", price: 145.00, change24h: 6.82, volume24h: 3890, color: "#14F195" },
  { symbol: "BNB", name: "BNB Smart Chain", price: 580.00, change24h: 0.75, volume24h: 1240, color: "#F3BA2F" },
  { symbol: "XRP", name: "Ripple", price: 0.52, change24h: -0.85, volume24h: 980, color: "#23292F" },
  { symbol: "DOGE", name: "Dogecoin", price: 0.14, change24h: 4.12, volume24h: 840, color: "#C2A633" },
  { symbol: "ADA", name: "Cardano", price: 0.46, change24h: -2.30, volume24h: 350, color: "#0033AD" },
  { symbol: "SHIB", name: "Shiba Inu", price: 0.000022, change24h: 8.90, volume24h: 620, color: "#FFA143" },
  { symbol: "DOT", name: "Polkadot", price: 6.75, change24h: -1.15, volume24h: 180, color: "#E6007A" },
  { symbol: "MATIC", name: "Polygon", price: 0.68, change24h: 1.55, volume24h: 210, color: "#8247E5" },
  { symbol: "SUI", name: "Sui Network", price: 1.15, change24h: 12.45, volume24h: 450, color: "#6FB1E4" },
  { symbol: "LINK", name: "Chainlink", price: 16.50, change24h: -0.40, volume24h: 310, color: "#375BD2" },
  { symbol: "LTC", name: "Litecoin", price: 78.40, change24h: 0.25, volume24h: 290, color: "#BFBBBB" },
  { symbol: "TRX", name: "TRON", price: 0.12, change24h: 0.90, volume24h: 190, color: "#EC0623" },
  { symbol: "NEAR", name: "Near Protocol", price: 6.10, change24h: 5.60, volume24h: 380, color: "#000000" },
  { symbol: "AVAX", name: "Avalanche", price: 32.50, change24h: -3.40, volume24h: 420, color: "#E84142" },
  { symbol: "PEPE", name: "Pepe Coin", price: 0.000014, change24h: 14.80, volume24h: 750, color: "#00FF00" },
  { symbol: "FLOKI", name: "Floki Inu", price: 0.00021, change24h: 9.30, volume24h: 280, color: "#FF9800" },
  { symbol: "BONK", name: "Bonk Token", price: 0.000032, change24h: 11.20, volume24h: 310, color: "#E67E22" },
  { symbol: "WIF", name: "dogwifhat", price: 2.85, change24h: -5.40, volume24h: 340, color: "#8E44AD" },
  { symbol: "FTM", name: "Fantom", price: 0.76, change24h: 7.15, volume24h: 230, color: "#1969FF" },
  { symbol: "ICP", name: "Internet Computer", price: 9.80, change24h: -2.10, volume24h: 140, color: "#292929" },
  { symbol: "UNI", name: "Uniswap", price: 8.90, change24h: 4.80, volume24h: 175, color: "#FF007A" },
  { symbol: "FIL", name: "Filecoin", price: 5.20, change24h: -1.80, volume24h: 90, color: "#00C2FF" },
  { symbol: "ETC", name: "Ethereum Classic", price: 26.50, change24h: 0.40, volume24h: 110, color: "#328332" },
  { symbol: "VET", name: "VeChain", price: 0.032, change24h: -0.70, volume24h: 80, color: "#15BDFF" },
  { symbol: "THETA", name: "Theta Network", price: 1.85, change24h: 2.30, volume24h: 70, color: "#22C55E" },
  { symbol: "OP", name: "Optimism", price: 2.10, change24h: 4.10, volume24h: 195, color: "#FF0420" },
  { symbol: "ARB", name: "Arbitrum", price: 0.95, change24h: -3.80, volume24h: 220, color: "#28A0F0" },
  { symbol: "IMX", name: "Immutable", price: 1.80, change24h: 1.65, volume24h: 115, color: "#0D0D0D" },
  { symbol: "STX", name: "Stacks", price: 1.95, change24h: -2.25, volume24h: 95, color: "#5546FF" },
  { symbol: "RNDR", name: "Render Token", price: 7.80, change24h: 8.40, volume24h: 310, color: "#E02020" },
  { symbol: "GALA", name: "Gala Games", price: 0.041, change24h: -4.10, volume24h: 160, color: "#0A0A0A" },
  { symbol: "FET", name: "Fetch.ai", price: 1.65, change24h: 6.80, volume24h: 290, color: "#00003C" },
  { symbol: "JUP", name: "Jupiter", price: 0.98, change24h: 3.12, volume24h: 185, color: "#1B3B36" },
  { symbol: "SEI", name: "Sei Network", price: 0.48, change24h: -1.50, volume24h: 140, color: "#9E2A2B" },
  { symbol: "TIA", name: "Celestia", price: 8.90, change24h: -3.45, volume24h: 175, color: "#7B2CBF" },
  { symbol: "STRK", name: "Starknet", price: 1.10, change24h: -2.80, volume24h: 130, color: "#0C0F24" },
  { symbol: "AAVE", name: "Aave", price: 92.50, change24h: 1.20, volume24h: 145, color: "#B6509E" },
  { symbol: "LDO", name: "Lido DAO", price: 1.85, change24h: 3.40, volume24h: 110, color: "#00A3FF" },
  { symbol: "MKR", name: "Maker", price: 2750.00, change24h: 0.80, volume24h: 85, color: "#1AAB9B" },
  { symbol: "RUNE", name: "THORChain", price: 5.60, change24h: -2.15, volume24h: 160, color: "#00CCFF" },
  { symbol: "BEAM", name: "Beam", price: 0.024, change24h: 5.15, volume24h: 45, color: "#00FFE0" },
  { symbol: "JTO", name: "Jito", price: 3.10, change24h: 4.80, volume24h: 75, color: "#050505" },
  { symbol: "ONDO", name: "Ondo Finance", price: 1.22, change24h: 8.90, volume24h: 210, color: "#111111" },
  { symbol: "WLD", name: "Worldcoin", price: 4.65, change24h: -6.40, volume24h: 390, color: "#000000" },
  { symbol: "ARKM", name: "Arkham", price: 2.15, change24h: 9.30, volume24h: 125, color: "#05080E" },
  { symbol: "POPCAT", name: "Popcat", price: 0.42, change24h: 18.20, volume24h: 145, color: "#F39C12" },
  { symbol: "TURBO", name: "Turbo", price: 0.0052, change24h: 24.50, volume24h: 95, color: "#F1C40F" },
  { symbol: "BOME", name: "Book of Meme", price: 0.011, change24h: 7.60, volume24h: 280, color: "#2ECC71" }
];

export default function KycWalletHub() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [kycStatus, setKycStatus] = useState("Tier-1 Basic (Email Verified)");
  
  // Navigation Tabs: "all-coins", "wallet", or "kyc"
  const [activeTab, setActiveTab] = useState<"all-coins" | "wallet" | "kyc">("all-coins");

  // Wallet and Assets State
  const [assetSearch, setAssetSearch] = useState("");
  const [assets, setAssets] = useState<AssetBalance[]>([]);
  const [walletTotalUsd, setWalletTotalUsd] = useState(15740.50);
  
  // Modal states: "deposit" | "withdraw" | "none"
  const [modalType, setModalType] = useState<"deposit" | "withdraw" | "none">("none");
  const [activeModalCoin, setActiveModalCoin] = useState<string>("USDT");
  const [selectedNetwork, setSelectedNetwork] = useState<string>("TRC20");
  const [depositAddress, setDepositAddress] = useState<string>("");
  const [copyFeedback, setCopyFeedback] = useState(false);

  // Withdrawal form states
  const [withdrawAddress, setWithdrawAddress] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [show2faOverlay, setShow2faOverlay] = useState(false);
  const [authCode, setAuthCode] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [emailCountdown, setEmailCountdown] = useState(0);
  const [txHistory, setTxHistory] = useState<TxHistoryItem[]>([]);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");

  // KYC form fields
  const [country, setCountry] = useState("India");
  const [idType, setIdType] = useState("Passport");
  const [idNumber, setIdNumber] = useState("");
  const [uploadedFront, setUploadedFront] = useState(false);
  
  // Selfie simulation states
  const [livenessStep, setLivenessStep] = useState<"none" | "position" | "blink" | "smile" | "analyzing" | "completed">("none");
  const [biometricLogs, setBiometricLogs] = useState<string>("");
  const [progressVal, setProgressVal] = useState(0);

  // Coin price multiplier map to calculate approximate USD values in real time
  const coinPriceMap: Record<string, number> = {
    USDT: 1.00,
    BTC: 65050.00,
    ETH: 3450.00,
    SOL: 145.00,
    BNB: 580.00,
    XRP: 0.52,
    DOGE: 0.14,
    SHIB: 0.000022,
    PEPE: 0.000014,
    LINK: 16.50,
    SUI: 1.15
  };

  // Sync state with localStorage
  useEffect(() => {
    const logged = localStorage.getItem("user_logged_in");
    const storedEmail = localStorage.getItem("username");
    if (logged === "true") {
      setIsLoggedIn(true);
      setUserEmail(storedEmail || "institutional_trader@cloud.ex");
    }
    const status = localStorage.getItem("kyc_tier") || "Tier-1 Basic (Email Verified)";
    setKycStatus(status);

    // Initial asset balances setup
    const defaultBalances: AssetBalance[] = [
      { symbol: "USDT", name: "Tether USD", amount: 15740.50, inOrder: 0.00, color: "#26A17B" },
      { symbol: "BTC", name: "Bitcoin", amount: 0.2450, inOrder: 0.00, color: "#F7931A" },
      { symbol: "ETH", name: "Ethereum", amount: 2.8500, inOrder: 0.00, color: "#627EEA" },
      { symbol: "SOL", name: "Solana", amount: 15.40, inOrder: 0.00, color: "#14F195" },
      { symbol: "BNB", name: "BNB Smart Chain", amount: 4.80, inOrder: 0.00, color: "#F3BA2F" },
      { symbol: "XRP", name: "Ripple", amount: 450.00, inOrder: 0.00, color: "#23292F" },
      { symbol: "DOGE", name: "Dogecoin", amount: 3500.00, inOrder: 0.00, color: "#C2A633" },
      { symbol: "SHIB", name: "Shiba Inu", amount: 12000000.00, inOrder: 0.00, color: "#FFA143" },
      { symbol: "PEPE", name: "Pepe Coin", amount: 88000000.00, inOrder: 0.00, color: "#00FF00" },
      { symbol: "LINK", name: "Chainlink", amount: 25.00, inOrder: 0.00, color: "#375BD2" },
      { symbol: "SUI", name: "Sui Network", amount: 120.00, inOrder: 0.00, color: "#6FB1E4" }
    ];

    const storedBalances = localStorage.getItem("user_asset_balances");
    let loadedAssets: AssetBalance[] = [];
    if (storedBalances) {
      loadedAssets = JSON.parse(storedBalances);
    } else {
      loadedAssets = defaultBalances;
      localStorage.setItem("user_asset_balances", JSON.stringify(defaultBalances));
    }

    // Sync USDT balance from global wallet_balance parameter
    const globalUsdt = localStorage.getItem("wallet_balance");
    if (globalUsdt) {
      const usdtVal = parseFloat(globalUsdt);
      loadedAssets = loadedAssets.map(a => a.symbol === "USDT" ? { ...a, amount: usdtVal } : a);
      localStorage.setItem("user_asset_balances", JSON.stringify(loadedAssets));
    } else {
      localStorage.setItem("wallet_balance", "15740.50");
    }

    setAssets(loadedAssets);

    // Initial simulated Transaction history setup
    const defaultTxHistory: TxHistoryItem[] = [
      { id: "TXN-84729", time: "2026-05-28 14:22:10", type: "Deposit", coin: "USDT", amount: 5000.00, address: "TGD91x...83jK21", status: "Completed" },
      { id: "TXN-29183", time: "2026-05-27 09:12:45", type: "Withdrawal", coin: "BTC", amount: 0.015, address: "1A1zP1e...P5QGfi", status: "Completed" }
    ];
    const storedHistory = localStorage.getItem("user_transaction_history");
    if (storedHistory) {
      setTxHistory(JSON.parse(storedHistory));
    } else {
      setTxHistory(defaultTxHistory);
      localStorage.setItem("user_transaction_history", JSON.stringify(defaultTxHistory));
    }

    // Sync storage events
    const handleStorageChange = () => {
      const currentHalted = localStorage.getItem("exchange_halted") === "true";
      const status = localStorage.getItem("kyc_tier") || "Tier-1 Basic (Email Verified)";
      setKycStatus(status);

      const updatedBalance = localStorage.getItem("wallet_balance");
      if (updatedBalance) {
        setAssets(prev => prev.map(a => a.symbol === "USDT" ? { ...a, amount: parseFloat(updatedBalance) } : a));
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  // Update total USD wallet value based on asset balances and mock prices
  useEffect(() => {
    const total = assets.reduce((sum, asset) => {
      const price = coinPriceMap[asset.symbol] || 0;
      return sum + (asset.amount * price);
    }, 0);
    setWalletTotalUsd(total);
  }, [assets]);

  // Generate simulated addresses when coin or network changes
  useEffect(() => {
    if (modalType === "deposit") {
      const randomPart = Math.random().toString(36).substring(2, 10).toUpperCase();
      if (activeModalCoin === "USDT") {
        if (selectedNetwork === "TRC20") setDepositAddress(`TY83h7d${randomPart}m39sJ9aW12`);
        else if (selectedNetwork === "ERC20") setDepositAddress(`0x4f87A${randomPart}d69612a45fb2`);
        else setDepositAddress(`SOL${randomPart}kP98h23gNs9`);
      } else if (activeModalCoin === "BTC") {
        setDepositAddress(`1A1zP1eP5QGf${randomPart}87a912Gf`);
      } else if (activeModalCoin === "ETH") {
        setDepositAddress(`0x71C56X${randomPart}274F3b98c3`);
      } else {
        setDepositAddress(`0x${activeModalCoin}${randomPart}d921B436e2`);
      }
    }
  }, [modalType, activeModalCoin, selectedNetwork]);

  // 2FA Email code verification timer countdown
  useEffect(() => {
    if (emailCountdown > 0) {
      const timer = setTimeout(() => setEmailCountdown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [emailCountdown]);

  const handleLogout = () => {
    localStorage.removeItem("user_logged_in");
    localStorage.removeItem("username");
    setIsLoggedIn(false);
    setUserEmail("");
  };

  const triggerToast = (msg: string, type: "success" | "error" = "success") => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => setToastMessage(""), 4000);
  };

  // Deposit/Withdraw button click handler
  const openModal = (type: "deposit" | "withdraw", coin: string) => {
    setActiveModalCoin(coin);
    setModalType(type);
    setWithdrawAddress("");
    setWithdrawAmount("");
    setShow2faOverlay(false);
    setSelectedNetwork(coin === "USDT" ? "TRC20" : "ERC20");
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(depositAddress);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  const handleSendEmailCode = () => {
    setEmailCountdown(60);
    triggerToast("Email confirmation verification code sent to security inbox.");
  };

  const handleWithdrawalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!withdrawAddress) {
      triggerToast("Recipient wallet address is required.", "error");
      return;
    }
    const amt = parseFloat(withdrawAmount);
    const asset = assets.find(a => a.symbol === activeModalCoin);
    if (!asset || isNaN(amt) || amt <= 0) {
      triggerToast("Please enter a valid withdrawal amount.", "error");
      return;
    }
    if (amt > asset.amount) {
      triggerToast(`Insufficient ${activeModalCoin} available balance.`, "error");
      return;
    }

    // Launch security screen
    setShow2faOverlay(true);
    setAuthCode("");
    setEmailCode("");
  };

  // Complete Withdrawal transaction after security verification
  const handleVerifyWithdrawal = () => {
    if (authCode.length < 6 || emailCode.length < 6) {
      triggerToast("Invalid authorization code sequence.", "error");
      return;
    }

    const amt = parseFloat(withdrawAmount);
    const updatedAssets = assets.map(a => {
      if (a.symbol === activeModalCoin) {
        return { ...a, amount: +(a.amount - amt).toFixed(6) };
      }
      return a;
    });

    // Write back and sync
    setAssets(updatedAssets);
    localStorage.setItem("user_asset_balances", JSON.stringify(updatedAssets));

    // If USDT, sync global wallet balance for Trade component
    if (activeModalCoin === "USDT") {
      const usdtAsset = updatedAssets.find(a => a.symbol === "USDT");
      if (usdtAsset) {
        localStorage.setItem("wallet_balance", String(usdtAsset.amount));
        window.dispatchEvent(new Event("storage"));
      }
    }

    // Add transaction to history list
    const newTx: TxHistoryItem = {
      id: "TXN-" + Math.floor(10000 + Math.random() * 90000),
      time: new Date().toISOString().replace('T', ' ').slice(0, 19),
      type: "Withdrawal",
      coin: activeModalCoin,
      amount: amt,
      address: withdrawAddress.slice(0, 8) + "..." + withdrawAddress.slice(-6),
      status: "Completed"
    };
    
    const nextHistory = [newTx, ...txHistory];
    setTxHistory(nextHistory);
    localStorage.setItem("user_transaction_history", JSON.stringify(nextHistory));

    // Reset modals and trigger success alert
    setModalType("none");
    setShow2faOverlay(false);
    triggerToast(`Withdrawal of ${amt} ${activeModalCoin} completed. Processing ledger dispatch.`);
  };

  // KYC Submit trigger liveness
  const handleStartBiometric = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoggedIn) {
      triggerToast("Please log in to initiate regulatory KYC updates.", "error");
      return;
    }
    if (!idNumber) {
      triggerToast("Please enter your Document ID Number first.", "error");
      return;
    }
    setLivenessStep("position");
    setBiometricLogs("Align face within circular alignment boundary...");
  };

  // Biometric selfie state simulator progression
  useEffect(() => {
    if (livenessStep === "position") {
      const timer = setTimeout(() => {
        setLivenessStep("blink");
        setBiometricLogs("BLINK YOUR EYES 3 TIMES");
      }, 3500);
      return () => clearTimeout(timer);
    } else if (livenessStep === "blink") {
      const timer = setTimeout(() => {
        setLivenessStep("smile");
        setBiometricLogs("HOLD A STILL SMILE");
      }, 4000);
      return () => clearTimeout(timer);
    } else if (livenessStep === "smile") {
      const timer = setTimeout(() => {
        setLivenessStep("analyzing");
        setBiometricLogs("Computing liveness telemetry... checking matching node models...");
      }, 3500);
      return () => clearTimeout(timer);
    } else if (livenessStep === "analyzing") {
      let currentVal = 0;
      const progressIv = setInterval(() => {
        currentVal += 10;
        setProgressVal(currentVal);
        if (currentVal >= 100) {
          clearInterval(progressIv);
          setLivenessStep("completed");
          setKycStatus("Tier-2 Verified (Biometrics Approved)");
          localStorage.setItem("kyc_tier", "Tier-2 Verified (Biometrics Approved)");
          setBiometricLogs("BIOMETRIC PROFILE CORRESPONDS. IDENTITY TIER UPGRADED.");
        }
      }, 300);
      return () => clearInterval(progressIv);
    }
  }, [livenessStep]);

  const handleResetKyc = () => {
    localStorage.setItem("kyc_tier", "Tier-1 Basic (Email Verified)");
    setKycStatus("Tier-1 Basic (Email Verified)");
    setLivenessStep("none");
    setIdNumber("");
    setUploadedFront(false);
    setProgressVal(0);
    triggerToast("Sandbox identity tier reset to Tier-1.");
  };

  // Tech simulated QR code drawing block
  const TechQRCode = ({ text }: { text: string }) => (
    <div style={{
      width: 140,
      height: 140,
      background: "#fff",
      padding: 8,
      borderRadius: 8,
      display: "grid",
      gridTemplateColumns: "repeat(6, 1fr)",
      gridTemplateRows: "repeat(6, 1fr)",
      gap: 3,
      boxShadow: "0 0 15px rgba(255,255,255,0.15)",
      position: "relative"
    }}>
      {/* Target squares in corners */}
      <div style={{ background: "#040814", gridColumn: "1/3", gridRow: "1/3", borderRadius: 2 }} />
      <div style={{ background: "#fff", gridColumn: "1/2", gridRow: "1/2", margin: 2 }} />
      
      <div style={{ background: "#040814", gridColumn: "5/7", gridRow: "1/3", borderRadius: 2 }} />
      <div style={{ background: "#fff", gridColumn: "6/7", gridRow: "1/2", margin: 2 }} />
      
      <div style={{ background: "#040814", gridColumn: "1/3", gridRow: "5/7", borderRadius: 2 }} />
      <div style={{ background: "#fff", gridColumn: "1/2", gridRow: "6/7", margin: 2 }} />
      
      {/* Center gold mark */}
      <div style={{ background: "var(--yellow)", gridColumn: "3/5", gridRow: "3/5", borderRadius: "50%", margin: 2 }} />

      {/* Random dummy matrix noise */}
      <div style={{ background: "#040814", gridColumn: "3", gridRow: "1" }} />
      <div style={{ background: "#040814", gridColumn: "4", gridRow: "2" }} />
      <div style={{ background: "#040814", gridColumn: "5", gridRow: "3" }} />
      <div style={{ background: "#040814", gridColumn: "3", gridRow: "5" }} />
      <div style={{ background: "#040814", gridColumn: "4", gridRow: "6" }} />
      <div style={{ background: "#040814", gridColumn: "6", gridRow: "4" }} />
      <div style={{ background: "#040814", gridColumn: "1", gridRow: "4" }} />
      <div style={{ background: "#040814", gridColumn: "5", gridRow: "5" }} />
    </div>
  );

  // Filter asset balance lists
  const filteredAssets = assets.filter(a => 
    a.symbol.toLowerCase().includes(assetSearch.toLowerCase()) || 
    a.name.toLowerCase().includes(assetSearch.toLowerCase())
  );

  // Filter global coins directory
  const filteredCoins = COIN_DIRECTORY_LIST.filter(c => 
    c.symbol.toLowerCase().includes(assetSearch.toLowerCase()) || 
    c.name.toLowerCase().includes(assetSearch.toLowerCase())
  );

  return (
    <div style={{ minHeight: "100vh", position: "relative", color: "var(--text-primary)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      
      {/* Animated canvas starfield background */}
      <SpaceBackground />

      {/* GLOBAL TOAST BANNER */}
      {toastMessage && (
        <div style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          background: toastType === "success" ? "rgba(0, 230, 118, 0.95)" : "rgba(255, 23, 68, 0.95)",
          color: toastType === "success" ? "#000" : "#FFF",
          padding: "12px 24px",
          borderRadius: 8,
          boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          gap: 10,
          fontWeight: 700,
          fontSize: 13,
          backdropFilter: "blur(8px)"
        }}>
          <CheckCircle2 size={16} />
          {toastMessage}
        </div>
      )}

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
              Cloud<span style={{ color: "var(--yellow)" }}>Exchange</span>
            </span>
          </Link>

          <nav style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Link href="/" className="btn-ghost" style={{ fontSize: 13, textDecoration: "none", color: "var(--text-primary)" }}>Home</Link>
            <Link href="/coins" className="btn-ghost" style={{ fontSize: 13, textDecoration: "none", color: "var(--text-primary)" }}>Coins</Link>
            <Link href="/trade" className="btn-ghost" style={{ fontSize: 13, textDecoration: "none", color: "var(--text-primary)" }}>Trade Terminal</Link>
            <Link href="/p2p" className="btn-ghost" style={{ fontSize: 13, textDecoration: "none", color: "var(--text-primary)" }}>P2P Fiat</Link>
            <Link href="/kyc" className="btn-ghost active" style={{ fontSize: 13, textDecoration: "none", color: "var(--yellow)" }}>KYC & Wallet</Link>
            <Link href="/ledger" className="btn-ghost" style={{ fontSize: 13, textDecoration: "none", color: "var(--text-primary)" }}>Ledger Audit</Link>
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
      <div className="container-xl" style={{ flex: 1, padding: "30px 24px", display: "flex", flexDirection: "column", gap: 24, zIndex: 10 }}>
        
        {/* Header Summary */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ background: "var(--yellow-dim)", color: "var(--yellow)", padding: "4px 12px", borderRadius: 20, fontSize: 10, fontWeight: 700 }}>PORTFOLIO CONTROL DESK</span>
              <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Audit & Identity Services</span>
            </div>
            <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.01em", marginTop: 6 }}>
              {activeTab === "wallet" ? "Assets & Wallet Ledger" : "Identity Verification Center"}
            </h1>
          </div>

          {/* Tab Selector buttons */}
          <div style={{ display: "flex", background: "rgba(0,0,0,0.25)", border: "1px solid var(--border)", padding: 4, borderRadius: 8 }}>
            <button 
              onClick={() => setActiveTab("wallet")}
              style={{
                background: activeTab === "wallet" ? "var(--yellow)" : "transparent",
                color: activeTab === "wallet" ? "#000" : "var(--text-secondary)",
                border: "none",
                borderRadius: 6,
                padding: "8px 20px",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                transition: "all 0.2s"
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Wallet size={14} /> My Wallet Assets
              </span>
            </button>
            <button 
              onClick={() => setActiveTab("kyc")}
              style={{
                background: activeTab === "kyc" ? "var(--yellow)" : "transparent",
                color: activeTab === "kyc" ? "#000" : "var(--text-secondary)",
                border: "none",
                borderRadius: 6,
                padding: "8px 20px",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                transition: "all 0.2s"
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <ShieldCheck size={14} /> KYC Verification
              </span>
            </button>
          </div>
        </div>

        {/* ==================== TAB 1: WALLET / ASSETS ==================== */}
        {activeTab === "wallet" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {/* Total Balance Card */}
            <div style={{
              background: "rgba(10, 17, 40, 0.65)",
              border: "1px solid var(--border)",
              borderRadius: 16,
              padding: 24,
              display: "grid",
              gridTemplateColumns: "1.5fr 1fr 1fr",
              alignItems: "center",
              gap: 32,
              backdropFilter: "blur(12px)"
            }}>
              <div>
                <div style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 700 }}>ESTIMATED TOTAL BALANCE</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 8 }}>
                  <span style={{ fontSize: 32, fontWeight: 900, color: "var(--text-primary)" }}>
                    ${walletTotalUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span style={{ fontSize: 16, color: "var(--yellow)", fontWeight: 700 }}>USD</span>
                </div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6 }}>
                  Includes Spot limits, collateral, and locked margins.
                </div>
              </div>

              <div style={{ borderLeft: "1px solid var(--border-light)", paddingLeft: 32 }}>
                <div style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 700 }}>IDENTITY SECURITY TIER</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: kycStatus.includes("Tier-2") ? "var(--green)" : "var(--yellow)", marginTop: 10, display: "flex", alignItems: "center", gap: 6 }}>
                  <ShieldCheck size={18} /> {kycStatus.split(" ")[0]} Verified
                </div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
                  {kycStatus.includes("Tier-2") ? "Unlimited deposits & withdrawals unlocked." : "KYC Step 2 required for withdrawals."}
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", gap: 10 }}>
                  <button onClick={() => openModal("deposit", "USDT")} className="btn-yellow" style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, height: 40 }}>
                    <ArrowDownLeft size={16} /> Deposit
                  </button>
                  <button onClick={() => openModal("withdraw", "USDT")} className="btn-outline" style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, height: 40 }}>
                    <ArrowUpRight size={16} /> Withdraw
                  </button>
                </div>
                <Link href="/p2p" className="btn-outline" style={{ textDecoration: "none", textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: 12, height: 36 }}>
                  <DollarSign size={14} /> Buy Crypto on P2P Escrow
                </Link>
              </div>
            </div>

            {/* Assets list with search */}
            <div style={{
              background: "rgba(10, 17, 40, 0.45)",
              border: "1px solid var(--border)",
              borderRadius: 16,
              padding: 24,
              backdropFilter: "blur(12px)"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <h3 style={{ fontSize: 16, fontWeight: 800 }}>Account Asset Holdings</h3>
                <div style={{ position: "relative", width: 280 }}>
                  <Search size={14} style={{ position: "absolute", left: 10, top: 12, color: "var(--text-secondary)" }} />
                  <input 
                    className="bn-input bn-input-sm" 
                    placeholder="Search asset symbol or name..." 
                    value={assetSearch}
                    onChange={e => setAssetSearch(e.target.value)}
                    style={{ paddingLeft: 30 }}
                  />
                </div>
              </div>

              {/* Table */}
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border)", fontSize: 11, color: "var(--text-secondary)" }}>
                      <th style={{ padding: "12px 16px" }}>Asset</th>
                      <th style={{ padding: "12px 16px" }}>Available Balance</th>
                      <th style={{ padding: "12px 16px" }}>In Order Balance</th>
                      <th style={{ padding: "12px 16px" }}>Estimated Value (USD)</th>
                      <th style={{ padding: "12px 16px", textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAssets.map(asset => {
                      const usdPrice = coinPriceMap[asset.symbol] || 0;
                      const usdValue = asset.amount * usdPrice;
                      
                      return (
                        <tr key={asset.symbol} style={{ borderBottom: "1px solid var(--border-light)", transition: "background 0.15s" }} className="pair-row">
                          <td style={{ padding: "14px 16px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                              <div style={{
                                width: 28,
                                height: 28,
                                borderRadius: "50%",
                                background: asset.color,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontWeight: 800,
                                fontSize: 11,
                                color: "#fff",
                                boxShadow: "0 2px 8px rgba(0,0,0,0.3)"
                              }}>
                                {asset.symbol.slice(0, 2)}
                              </div>
                              <div>
                                <strong style={{ color: "var(--text-primary)", fontSize: 14 }}>{asset.symbol}</strong>
                                <span style={{ display: "block", fontSize: 10, color: "var(--text-muted)" }}>{asset.name}</span>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: "14px 16px" }}>
                            <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                              {asset.amount.toLocaleString(undefined, { maximumFractionDigits: 6 })}
                            </span>
                          </td>
                          <td style={{ padding: "14px 16px", color: "var(--text-secondary)" }}>
                            {asset.inOrder.toFixed(4)}
                          </td>
                          <td style={{ padding: "14px 16px" }}>
                            <span style={{ fontWeight: 600, color: "var(--cyan)" }}>
                              ${usdValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </td>
                          <td style={{ padding: "14px 16px", textAlign: "right" }}>
                            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                              <button onClick={() => openModal("deposit", asset.symbol)} className="btn-outline bn-tab-sm" style={{ padding: "4px 12px", fontSize: 11, display: "flex", alignItems: "center", gap: 4 }}>
                                <ArrowDownLeft size={12} /> Deposit
                              </button>
                              <button onClick={() => openModal("withdraw", asset.symbol)} className="btn-outline bn-tab-sm" style={{ padding: "4px 12px", fontSize: 11, display: "flex", alignItems: "center", gap: 4 }}>
                                <ArrowUpRight size={12} /> Withdraw
                              </button>
                              <Link href={`/trade?pair=${asset.symbol}/USDT`} className="btn-yellow bn-tab-sm" style={{ padding: "4px 12px", fontSize: 11, display: "flex", alignItems: "center", gap: 4, textDecoration: "none" }}>
                                <TrendingUp size={12} /> Trade
                              </Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Transaction History Logs */}
            <div style={{
              background: "rgba(10, 17, 40, 0.45)",
              border: "1px solid var(--border)",
              borderRadius: 16,
              padding: 24,
              backdropFilter: "blur(12px)"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <History size={16} color="var(--yellow)" />
                <h3 style={{ fontSize: 16, fontWeight: 800 }}>Simulated Wallet Ledger Logs</h3>
              </div>
              
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--border)", color: "var(--text-secondary)" }}>
                      <th style={{ padding: 10 }}>TxID</th>
                      <th style={{ padding: 10 }}>Date & Time</th>
                      <th style={{ padding: 10 }}>Action</th>
                      <th style={{ padding: 10 }}>Asset</th>
                      <th style={{ padding: 10 }}>Amount</th>
                      <th style={{ padding: 10 }}>Address</th>
                      <th style={{ padding: 10 }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {txHistory.map(tx => (
                      <tr key={tx.id} style={{ borderBottom: "1px solid var(--border-light)" }}>
                        <td style={{ padding: 10, fontFamily: "monospace", color: "var(--cyan)" }}>{tx.id}</td>
                        <td style={{ padding: 10, color: "var(--text-secondary)" }}>{tx.time}</td>
                        <td style={{ padding: 10 }}>
                          <span style={{ 
                            background: tx.type === "Deposit" ? "var(--green-dim)" : "var(--red-dim)",
                            color: tx.type === "Deposit" ? "var(--green)" : "var(--red)",
                            padding: "2px 6px",
                            borderRadius: 4,
                            fontWeight: 700,
                            fontSize: 10
                          }}>{tx.type}</span>
                        </td>
                        <td style={{ padding: 10, fontWeight: 700 }}>{tx.coin}</td>
                        <td style={{ padding: 10, fontWeight: 700 }}>{tx.amount}</td>
                        <td style={{ padding: 10, fontFamily: "monospace", color: "var(--text-secondary)" }}>{tx.address}</td>
                        <td style={{ padding: 10 }}>
                          <span style={{ color: tx.status === "Completed" ? "var(--green)" : "var(--yellow)", fontWeight: 700 }}>
                            {tx.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ==================== TAB 2: KYC HUB ==================== */}
        {activeTab === "kyc" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {/* Current KYC status summary */}
            <div style={{
              background: "rgba(10, 17, 40, 0.65)",
              border: "1px solid var(--border)",
              borderRadius: 16,
              padding: 24,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              backdropFilter: "blur(12px)"
            }}>
              <div>
                <div style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 700 }}>CURRENT IDENTITY COMPLIANCE STATUS</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: kycStatus.includes("Tier-2") ? "var(--green)" : "var(--yellow)", marginTop: 6, display: "flex", alignItems: "center", gap: 8 }}>
                  <ShieldCheck size={22} /> {kycStatus}
                </div>
              </div>

              <div style={{ display: "flex", gap: 12 }}>
                {kycStatus.includes("Tier-2") && (
                  <button onClick={handleResetKyc} className="btn-outline" style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 12, borderRadius: 6, padding: "8px 16px" }}>
                    <RefreshCw size={14} /> Reset Sandbox Status
                  </button>
                )}
                <Link href="/trade" className="btn-yellow" style={{ textDecoration: "none", fontSize: 12, padding: "10px 20px" }}>Open Trading Desk</Link>
              </div>
            </div>

            {/* Grid forms */}
            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 24, alignItems: "flex-start" }}>
              
              {/* STEP 1: DOCUMENT SUBMISSION */}
              <div style={{ background: "rgba(10, 17, 40, 0.45)", backdropFilter: "blur(12px)", border: "1px solid var(--border)", borderRadius: 16, padding: 24 }}>
                <h3 style={{ fontSize: 16, fontWeight: 800, borderBottom: "1px solid var(--border-light)", paddingBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                  <FileText size={18} color="var(--cyan)" /> Step 1: Official Documentation Verification
                </h3>

                <form onSubmit={handleStartBiometric} style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 20 }}>
                  <div>
                    <label style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 700, display: "block", marginBottom: 6 }}>ISSUING REGION / COUNTRY</label>
                    <select className="bn-select" style={{ width: "100%", height: 40 }} value={country} onChange={e => setCountry(e.target.value)}>
                      <option>India</option>
                      <option>United States</option>
                      <option>United Kingdom</option>
                      <option>Singapore</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 700, display: "block", marginBottom: 6 }}>DOCUMENT TYPE</label>
                    <select className="bn-select" style={{ width: "100%", height: 40 }} value={idType} onChange={e => setIdType(e.target.value)}>
                      <option>Passport</option>
                      <option>Aadhaar / National ID Card</option>
                      <option>Driver&apos;s License</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 700, display: "block", marginBottom: 6 }}>DOCUMENT ID NUMBER</label>
                    <input
                      type="text"
                      className="bn-input"
                      placeholder="Enter official serial identification sequence"
                      value={idNumber}
                      onChange={e => setIdNumber(e.target.value)}
                      required
                    />
                  </div>

                  {/* Upload boxes */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div>
                      <label style={{ fontSize: 10, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>FRONT SIDE SCAN</label>
                      <div
                        style={{ border: "1px dashed var(--border)", borderRadius: 8, padding: "16px 8px", textAlign: "center", cursor: "pointer", background: "rgba(0,0,0,0.2)" }}
                        onClick={() => setUploadedFront(true)}>
                        <FileText size={20} style={{ color: "var(--text-secondary)", margin: "0 auto 6px" }} />
                        <span style={{ fontSize: 10, color: "var(--text-secondary)" }}>
                          {uploadedFront ? "document_scanned_front.png" : "Click to select dummy"}
                        </span>
                      </div>
                    </div>
                    
                    <div>
                      <label style={{ fontSize: 10, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>BACK SIDE SCAN (OPTIONAL)</label>
                      <div style={{ border: "1px dashed var(--border)", borderRadius: 8, padding: "16px 8px", textAlign: "center", cursor: "pointer", background: "rgba(0,0,0,0.2)" }}>
                        <FileText size={20} style={{ color: "var(--text-secondary)", margin: "0 auto 6px" }} />
                        <span style={{ fontSize: 10, color: "var(--text-secondary)" }}>Select back scan</span>
                      </div>
                    </div>
                  </div>

                  <button type="submit" className="btn-yellow" style={{ width: "100%", padding: 12, fontWeight: 700, fontSize: 13, marginTop: 12 }}
                    disabled={livenessStep !== "none" && livenessStep !== "completed"}>
                    {livenessStep === "completed" ? "ID Validation Successful" : "Launch Webcam Liveness Verification"}
                  </button>
                </form>
              </div>

              {/* STEP 2: LIVENESS CAMERA SIMULATOR */}
              <div style={{
                background: "rgba(10, 17, 40, 0.45)",
                backdropFilter: "blur(12px)",
                border: "1px solid var(--border)",
                borderRadius: 16,
                padding: 24,
                display: "flex",
                flexDirection: "column",
                alignItems: "center"
              }}>
                <h3 style={{ fontSize: 14, fontWeight: 800, width: "100%", borderBottom: "1px solid var(--border-light)", paddingBottom: 12, display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
                  <Camera size={16} color="var(--green)" /> Step 2: Biometric Liveness Verification
                </h3>

                {/* Circular Preview Container */}
                <div style={{
                  width: 200,
                  height: 200,
                  borderRadius: "50%",
                  border: `4px solid ${livenessStep === "completed" ? "var(--green)" : livenessStep === "none" ? "var(--border)" : "var(--cyan)"}`,
                  position: "relative",
                  overflow: "hidden",
                  background: "#020408",
                  boxShadow: livenessStep !== "none" && livenessStep !== "completed" ? "0 0 20px rgba(0, 229, 255, 0.25)" : "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}>
                  {livenessStep === "none" && (
                    <div style={{ textAlign: "center", color: "var(--text-muted)", padding: 20 }}>
                      <User size={48} style={{ margin: "0 auto 8px" }} />
                      <span style={{ fontSize: 10, display: "block" }}>Biometric Frame Ready</span>
                    </div>
                  )}

                  {/* Simulated Camera Scan Animations */}
                  {livenessStep !== "none" && livenessStep !== "completed" && (
                    <>
                      {/* Scanner scan lines */}
                      <div style={{
                        position: "absolute",
                        left: 0,
                        width: "100%",
                        height: 2,
                        background: "rgba(0, 229, 255, 0.7)",
                        boxShadow: "0 0 8px rgba(0, 229, 255, 0.8)",
                        top: "50%",
                        animation: "scanLine 2s linear infinite"
                      }} />
                      <div style={{
                        position: "absolute",
                        inset: 10,
                        border: "1px dashed rgba(0, 229, 255, 0.25)",
                        borderRadius: "50%"
                      }} />
                      {/* Dummy webcam status */}
                      <div style={{ fontSize: 56, animation: "pulseFace 2s ease-in-out infinite" }}>
                        {livenessStep === "position" ? "👁️_👁️" : livenessStep === "blink" ? "✖️_✖️" : livenessStep === "smile" ? "😊" : "🧬"}
                      </div>
                    </>
                  )}

                  {livenessStep === "completed" && (
                    <div style={{ textAlign: "center", color: "var(--green)" }}>
                      <CheckCircle2 size={48} style={{ margin: "0 auto 12px" }} />
                      <span style={{ fontSize: 11, fontWeight: 700 }}>MATCH SUCCESS</span>
                    </div>
                  )}
                </div>

                {/* Instruction console */}
                <div style={{
                  width: "100%",
                  background: "rgba(0,0,0,0.15)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  padding: 16,
                  marginTop: 20,
                  textAlign: "center"
                }}>
                  {livenessStep === "none" ? (
                    <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>Pending documentation submission to release webcam node.</span>
                  ) : livenessStep === "analyzing" ? (
                    <div style={{ width: "100%" }}>
                      <span style={{ fontSize: 11, color: "var(--cyan)", fontWeight: 700, display: "block" }}>ANALYZING FACIAL TELEMETRY</span>
                      <div style={{ background: "var(--border)", height: 4, borderRadius: 2, marginTop: 8, overflow: "hidden" }}>
                        <div style={{ background: "var(--cyan)", height: "100%", width: `${progressVal}%`, transition: "width 0.3s" }} />
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <span style={{ fontSize: 10, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: 1 }}>SYSTEM DIRECTIVE:</span>
                      <span style={{
                        fontSize: 13,
                        fontWeight: 800,
                        color: livenessStep === "completed" ? "var(--green)" : "var(--cyan)",
                        textShadow: "0 0 8px rgba(0, 229, 255, 0.2)"
                      }}>{biometricLogs}</span>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

      </div>

      {/* ==================== BINANCE-STYLE WALLET MODAL ==================== */}
      {modalType !== "none" && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(2, 4, 10, 0.8)",
          backdropFilter: "blur(8px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
          padding: 16
        }}>
          
          <div style={{
            background: "#0A1128",
            border: "1px solid var(--border)",
            borderRadius: 16,
            width: "100%",
            maxWidth: 480,
            overflow: "hidden",
            boxShadow: "0 10px 40px rgba(0,0,0,0.6)",
            position: "relative"
          }}>
            
            {/* Modal Header */}
            <div style={{
              padding: "16px 20px",
              borderBottom: "1px solid var(--border-light)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  background: assets.find(a => a.symbol === activeModalCoin)?.color || "var(--yellow)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 9,
                  fontWeight: 900,
                  color: "#fff"
                }}>
                  {activeModalCoin.slice(0, 2)}
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 800 }}>
                  {modalType === "deposit" ? `Deposit ${activeModalCoin} Crypto` : `Withdraw ${activeModalCoin} Assets`}
                </h3>
              </div>
              <button 
                onClick={() => setModalType("none")} 
                style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer" }}
              >
                <X size={18} />
              </button>
            </div>

            {/* DEPOSIT MODAL VIEW */}
            {modalType === "deposit" && (
              <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
                
                {/* Select network */}
                <div>
                  <label style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 700, display: "block", marginBottom: 6 }}>DEPOSIT NETWORK</label>
                  <select 
                    value={selectedNetwork} 
                    onChange={e => setSelectedNetwork(e.target.value)}
                    className="bn-select"
                    style={{ width: "100%", height: 38 }}
                  >
                    {activeModalCoin === "USDT" ? (
                      <>
                        <option value="TRC20">TRX (TRC20) - Fast & Low Fee</option>
                        <option value="ERC20">ETH (ERC20) - High Fee</option>
                        <option value="SOL">SOL (Solana) - Superfast</option>
                      </>
                    ) : activeModalCoin === "BTC" ? (
                      <option value="BTC">BTC Network</option>
                    ) : activeModalCoin === "ETH" ? (
                      <option value="ERC20">ETH (ERC20) network</option>
                    ) : (
                      <>
                        <option value="ERC20">ERC-20 network</option>
                        <option value="BSC">BNB Chain (BEP20)</option>
                      </>
                    )}
                  </select>
                </div>

                {/* QR Code and Address Container */}
                <div style={{
                  background: "rgba(0,0,0,0.25)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  padding: 20,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 16
                }}>
                  {/* CSS Simulated QR Code */}
                  <TechQRCode text={depositAddress} />

                  <div style={{ width: "100%" }}>
                    <div style={{ fontSize: 10, color: "var(--text-secondary)", marginBottom: 4, textAlign: "center" }}>
                      DEPOSIT ACCOUNT ADDRESS ({selectedNetwork})
                    </div>
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      background: "rgba(0,0,0,0.4)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      padding: "8px 12px",
                      gap: 10
                    }}>
                      <span style={{ 
                        fontFamily: "monospace", 
                        fontSize: 11, 
                        color: "var(--cyan)", 
                        wordBreak: "break-all",
                        flex: 1
                      }}>
                        {depositAddress}
                      </span>
                      <button 
                        onClick={copyToClipboard}
                        style={{ 
                          background: copyFeedback ? "var(--green)" : "var(--bg-hover)", 
                          border: "none", 
                          color: copyFeedback ? "#000" : "var(--yellow)", 
                          padding: 6, 
                          borderRadius: 6,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center"
                        }}
                      >
                        <Copy size={12} />
                      </button>
                    </div>
                    {copyFeedback && (
                      <span style={{ color: "var(--green)", fontSize: 10, display: "block", textAlign: "center", marginTop: 4 }}>
                        Address copied to clipboard successfully!
                      </span>
                    )}
                  </div>
                </div>

                {/* Instructions */}
                <div style={{
                  background: "rgba(245, 166, 35, 0.05)",
                  border: "1px solid rgba(245, 166, 35, 0.15)",
                  padding: 12,
                  borderRadius: 8,
                  fontSize: 11,
                  color: "var(--text-secondary)",
                  lineHeight: 1.4
                }}>
                  <strong style={{ color: "var(--yellow)", display: "block", marginBottom: 4 }}>Important Audit Notice:</strong>
                  Send only {activeModalCoin} to this address using the {selectedNetwork} network. Sending other assets will cause permanent loss. Requires 2 validations.
                </div>

                <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                  <button onClick={() => setModalType("none")} className="btn-outline" style={{ flex: 1 }}>Close Window</button>
                  <Link href={`/trade?pair=${activeModalCoin}/USDT`} className="btn-yellow" style={{ flex: 1, textDecoration: "none", textAlign: "center", lineHeight: "38px", height: 38, padding: 0 }}>
                    Enter Trading Desk
                  </Link>
                </div>

              </div>
            )}

            {/* WITHDRAW MODAL VIEW */}
            {modalType === "withdraw" && (
              <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
                
                {/* 2FA Authenticator Challenge Screen overlay */}
                {show2faOverlay ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: "10px 0" }}>
                    <div style={{ textAlign: "center", marginBottom: 12 }}>
                      <Lock size={32} style={{ color: "var(--yellow)", margin: "0 auto 8px" }} />
                      <h4 style={{ fontSize: 15, fontWeight: 800 }}>Audit Authentication Challenge</h4>
                      <p style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                        Confirm secure withdrawal of {withdrawAmount} {activeModalCoin}
                      </p>
                    </div>

                    {/* Email verify code */}
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                        <label style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 700 }}>EMAIL VERIFICATION CODE</label>
                        <button 
                          type="button" 
                          onClick={handleSendEmailCode}
                          disabled={emailCountdown > 0}
                          style={{ background: "none", border: "none", color: "var(--cyan)", fontSize: 10, fontWeight: 700, cursor: "pointer" }}
                        >
                          {emailCountdown > 0 ? `Resend (${emailCountdown}s)` : "Get Code"}
                        </button>
                      </div>
                      <div style={{ position: "relative" }}>
                        <Mail size={14} style={{ position: "absolute", left: 12, top: 12, color: "var(--text-muted)" }} />
                        <input 
                          type="text" 
                          maxLength={6} 
                          placeholder="Enter 6-digit confirmation code" 
                          className="bn-input bn-input-sm" 
                          value={emailCode}
                          onChange={e => setEmailCode(e.target.value.replace(/\D/g, ""))}
                          style={{ paddingLeft: 34 }} 
                        />
                      </div>
                    </div>

                    {/* Google Authenticator */}
                    <div>
                      <label style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 700, display: "block", marginBottom: 6 }}>
                        GOOGLE AUTHENTICATOR 2FA CODE
                      </label>
                      <div style={{ position: "relative" }}>
                        <ShieldAlert size={14} style={{ position: "absolute", left: 12, top: 12, color: "var(--text-muted)" }} />
                        <input 
                          type="text" 
                          maxLength={6} 
                          placeholder="Enter 6-digit dynamic Authenticator key" 
                          className="bn-input bn-input-sm" 
                          value={authCode}
                          onChange={e => setAuthCode(e.target.value.replace(/\D/g, ""))}
                          style={{ paddingLeft: 34 }} 
                        />
                      </div>
                    </div>

                    <div style={{
                      background: "rgba(255, 23, 68, 0.05)",
                      border: "1px solid rgba(255, 23, 68, 0.12)",
                      padding: 10,
                      borderRadius: 8,
                      fontSize: 10,
                      color: "var(--text-secondary)"
                    }}>
                      Ensure network correctness. Assets dispatched to incorrect recipient nodes cannot be refunded.
                    </div>

                    <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                      <button type="button" onClick={() => setShow2faOverlay(false)} className="btn-outline" style={{ flex: 1 }}>Back</button>
                      <button 
                        type="button" 
                        onClick={handleVerifyWithdrawal} 
                        className="btn-yellow" 
                        style={{ flex: 1 }}
                        disabled={authCode.length < 6 || emailCode.length < 6}
                      >
                        Confirm Dispatch
                      </button>
                    </div>

                  </div>
                ) : (
                  <form onSubmit={handleWithdrawalSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    
                    {/* Recipient Address */}
                    <div>
                      <label style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 700, display: "block", marginBottom: 6 }}>RECIPIENT ADDRESS</label>
                      <input 
                        type="text" 
                        className="bn-input" 
                        placeholder="Enter target external blockchain wallet address"
                        value={withdrawAddress}
                        onChange={e => setWithdrawAddress(e.target.value)}
                        required
                      />
                    </div>

                    {/* Network selector */}
                    <div>
                      <label style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 700, display: "block", marginBottom: 6 }}>WITHDRAWAL NETWORK</label>
                      <select 
                        value={selectedNetwork} 
                        onChange={e => setSelectedNetwork(e.target.value)}
                        className="bn-select"
                        style={{ width: "100%", height: 38 }}
                      >
                        {activeModalCoin === "USDT" ? (
                          <>
                            <option value="TRC20">TRX (TRC20) - Arrival: ~2 min, Fee: 1.0 USDT</option>
                            <option value="ERC20">ETH (ERC20) - Arrival: ~5 min, Fee: 8.5 USDT</option>
                            <option value="SOL">SOL (Solana) - Arrival: ~1 min, Fee: 0.5 USDT</option>
                          </>
                        ) : activeModalCoin === "BTC" ? (
                          <option value="BTC">BTC Blockchain Network - Fee: 0.0005 BTC</option>
                        ) : activeModalCoin === "ETH" ? (
                          <option value="ERC20">ETH (ERC20) - Fee: 0.005 ETH</option>
                        ) : (
                          <>
                            <option value="ERC20">ERC-20 smart network - Fee: 10 {activeModalCoin}</option>
                            <option value="BSC">BNB Chain (BEP20) - Fee: 0.5 {activeModalCoin}</option>
                          </>
                        )}
                      </select>
                    </div>

                    {/* Amount Input */}
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                        <label style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 700 }}>WITHDRAWAL AMOUNT</label>
                        <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>
                          Available: <strong>{assets.find(a => a.symbol === activeModalCoin)?.amount || 0} {activeModalCoin}</strong>
                        </span>
                      </div>
                      <div style={{ position: "relative" }}>
                        <input 
                          type="text" 
                          className="bn-input" 
                          placeholder="0.00"
                          value={withdrawAmount}
                          onChange={e => setWithdrawAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                          required
                        />
                        <button 
                          type="button"
                          onClick={() => setWithdrawAmount(String(assets.find(a => a.symbol === activeModalCoin)?.amount || 0))}
                          style={{
                            position: "absolute",
                            right: 12,
                            top: 11,
                            background: "none",
                            border: "none",
                            color: "var(--yellow)",
                            fontWeight: 800,
                            fontSize: 12,
                            cursor: "pointer"
                          }}
                        >
                          MAX
                        </button>
                      </div>
                    </div>

                    {/* Transaction breakdown details */}
                    <div style={{
                      background: "rgba(0,0,0,0.15)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      padding: 12,
                      display: "flex",
                      flexDirection: "column",
                      gap: 6,
                      fontSize: 11
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "var(--text-secondary)" }}>Transaction Network Fee:</span>
                        <strong style={{ color: "var(--text-primary)" }}>
                          {activeModalCoin === "USDT" ? "1.00 USDT" : activeModalCoin === "BTC" ? "0.0005 BTC" : "0.005 ETH"}
                        </strong>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ color: "var(--text-secondary)" }}>Est. Received Amount:</span>
                        <strong style={{ color: "var(--green)", fontSize: 13 }}>
                          {Math.max(0, parseFloat(withdrawAmount || "0") - (activeModalCoin === "USDT" ? 1.00 : activeModalCoin === "BTC" ? 0.0005 : 0.005)).toLocaleString(undefined, { maximumFractionDigits: 6 })} {activeModalCoin}
                        </strong>
                      </div>
                    </div>

                    {/* Submit Button */}
                    <button 
                      type="submit" 
                      className="btn-yellow" 
                      style={{ width: "100%", height: 42, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
                      disabled={!kycStatus.includes("Tier-2")}
                    >
                      <ArrowUpRight size={16} /> 
                      {kycStatus.includes("Tier-2") ? "Execute Withdrawal Request" : "Identity Verification Required (KYC Step 2)"}
                    </button>
                    
                    {!kycStatus.includes("Tier-2") && (
                      <span style={{ color: "var(--red)", fontSize: 10, display: "block", textAlign: "center" }}>
                        Please complete Tier-2 Biometric selfie validation inside KYC tab before executing withdrawals.
                      </span>
                    )}

                  </form>
                )}

              </div>
            )}

          </div>

        </div>
      )}

      {/* global style overrides */}
      <style jsx global>{`
        @keyframes scanLine {
          0% { top: 0%; }
          50% { top: 100%; }
          100% { top: 0%; }
        }
        @keyframes pulseFace {
          0% { transform: scale(0.95); opacity: 0.8; }
          50% { transform: scale(1.02); opacity: 1; }
          100% { transform: scale(0.95); opacity: 0.8; }
        }
      `}</style>

      {/* FOOTER */}
      <footer style={{
        background: "rgba(10, 17, 40, 0.75)",
        backdropFilter: "blur(12px)",
        borderTop: "1px solid var(--border)",
        padding: "24px 0",
        fontSize: 12,
        color: "var(--text-secondary)",
        marginTop: "auto"
      }}>
        <div className="container-xl" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>© 2026 CloudExchange Ledger & Assets. All rights reserved. Regulatory verified compliance desk.</span>
          <div style={{ display: "flex", gap: 16 }}>
            <Link href="/" style={{ color: "var(--text-secondary)", textDecoration: "none" }}>Back to Home</Link>
            <a href="#" style={{ color: "var(--text-secondary)", textDecoration: "none" }}>Risk Disclaimer</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
