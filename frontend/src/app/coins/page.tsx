"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  LogOut, 
  ShieldCheck, 
  Search,
  Copy,
  QrCode,
  ArrowUpRight,
  ArrowDownLeft,
  TrendingUp,
  Coins,
  CheckCircle2,
  X
} from "lucide-react";
import CloudExchangeLogo from "../components/CloudExchangeLogo";
import SpaceBackground from "../components/SpaceBackground";
import Header from "../components/Header";

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

// 100 Top Coins List
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
  { symbol: "BOME", name: "Book of Meme", price: 0.011, change24h: 7.60, volume24h: 280, color: "#2ECC71" },
  // Remaining 49 Coins to hit exactly 100
  { symbol: "EGLD", name: "MultiversX", price: 38.20, change24h: 1.10, volume24h: 65, color: "#1E1E24" },
  { symbol: "ALGO", name: "Algorand", price: 0.18, change24h: -0.45, volume24h: 112, color: "#000000" },
  { symbol: "XLM", name: "Stellar Lumens", price: 0.11, change24h: 0.12, volume24h: 140, color: "#080F1A" },
  { symbol: "QNT", name: "Quant", price: 92.50, change24h: -1.30, volume24h: 38, color: "#2C3E50" },
  { symbol: "SAND", name: "The Sandbox", price: 0.41, change24h: 2.30, volume24h: 95, color: "#00ADEF" },
  { symbol: "MANA", name: "Decentraland", price: 0.44, change24h: -1.15, volume24h: 88, color: "#FF2D55" },
  { symbol: "AXS", name: "Axie Infinity", price: 6.75, change24h: -2.40, volume24h: 64, color: "#0052FF" },
  { symbol: "CHZ", name: "Chiliz", price: 0.11, change24h: 3.12, volume24h: 92, color: "#CD0124" },
  { symbol: "CRV", name: "Curve DAO", price: 0.38, change24h: -6.40, volume24h: 125, color: "#000000" },
  { symbol: "1INCH", name: "1inch Network", price: 0.35, change24h: -1.05, volume24h: 42, color: "#0E1C36" },
  { symbol: "SUSHI", name: "SushiSwap", price: 1.02, change24h: -2.35, volume24h: 38, color: "#FA5252" },
  { symbol: "DYDX", name: "dYdX", price: 2.12, change24h: 1.25, volume24h: 85, color: "#6966FF" },
  { symbol: "COMP", name: "Compound", price: 52.40, change24h: -1.10, volume24h: 24, color: "#00D395" },
  { symbol: "SNX", name: "Synthetix", price: 2.80, change24h: 0.85, volume24h: 49, color: "#00D1FF" },
  { symbol: "BAT", name: "Basic Attention", price: 0.23, change24h: -1.45, volume24h: 55, color: "#FF5000" },
  { symbol: "ZIL", name: "Zilliqa", price: 0.021, change24h: 0.50, volume24h: 44, color: "#4BDECB" },
  { symbol: "WOO", name: "WOO Network", price: 0.27, change24h: -2.80, volume24h: 31, color: "#00E5FF" },
  { symbol: "GMT", name: "STEPN", price: 0.21, change24h: -2.40, volume24h: 52, color: "#2AD587" },
  { symbol: "ETHFI", name: "Ether.fi", price: 3.75, change24h: -4.80, volume24h: 82, color: "#5D45FF" },
  { symbol: "ENA", name: "Ethena", price: 0.80, change24h: -2.15, volume24h: 140, color: "#0D0D11" },
  { symbol: "NOT", name: "Notcoin", price: 0.014, change24h: 16.50, volume24h: 345, color: "#EED139" },
  { symbol: "DRIFT", name: "Drift Protocol", price: 0.46, change24h: -2.10, volume24h: 22, color: "#3B82F6" },
  { symbol: "INJ", name: "Injective", price: 24.10, change24h: 4.50, volume24h: 110, color: "#00A3FF" },
  { symbol: "PYTH", name: "Pyth Network", price: 0.43, change24h: 1.85, volume24h: 62, color: "#A855F7" },
  { symbol: "CAKE", name: "PancakeSwap", price: 2.85, change24h: 3.12, volume24h: 75, color: "#D1884F" },
  { symbol: "ENJ", name: "Enjin Coin", price: 0.32, change24h: -2.10, volume24h: 28, color: "#6236FF" },
  { symbol: "HOT", name: "Holo", price: 0.0022, change24h: 0.85, volume24h: 19, color: "#323E4D" },
  { symbol: "RVN", name: "Ravencoin", price: 0.021, change24h: -0.90, volume24h: 14, color: "#F05A28" },
  { symbol: "CELO", name: "Celo", price: 0.65, change24h: 2.15, volume24h: 24, color: "#35D07F" },
  { symbol: "ONE", name: "Harmony", price: 0.018, change24h: -1.25, volume24h: 32, color: "#00AEEF" },
  { symbol: "KAVA", name: "Kava", price: 0.62, change24h: -2.85, volume24h: 41, color: "#FF433E" },
  { symbol: "ZRX", name: "0x Protocol", price: 0.38, change24h: 0.40, volume24h: 19, color: "#302C2C" },
  { symbol: "MINA", name: "Mina Protocol", price: 0.72, change24h: -3.10, volume24h: 48, color: "#F6851B" },
  { symbol: "YFI", name: "yearn.finance", price: 6850.00, change24h: 0.50, volume24h: 12, color: "#006AE6" },
  { symbol: "WAVES", name: "Waves", price: 1.15, change24h: -8.90, volume24h: 25, color: "#0055FF" },
  { symbol: "QTUM", name: "Qtum", price: 3.12, change24h: -1.15, volume24h: 18, color: "#2E9AD0" },
  { symbol: "OMG", name: "OMG Network", price: 0.45, change24h: -4.50, volume24h: 14, color: "#1A1A1A" },
  { symbol: "IOST", name: "IOST", price: 0.0092, change24h: 0.12, volume24h: 11, color: "#000000" },
  { symbol: "ONT", name: "Ontology", price: 0.28, change24h: -1.30, volume24h: 15, color: "#32A4DC" },
  { symbol: "SC", name: "Siacoin", price: 0.0075, change24h: 0.45, volume24h: 18, color: "#00CBA0" },
  { symbol: "FLOW", name: "Flow", price: 0.84, change24h: 1.10, volume24h: 21, color: "#00EF8B" },
  { symbol: "KAS", name: "Kaspa", price: 0.16, change24h: 4.80, volume24h: 98, color: "#70C4B8" },
  { symbol: "ZRO", name: "LayerZero", price: 3.82, change24h: 6.45, volume24h: 115, color: "#000000" },
  { symbol: "W", name: "Wormhole", price: 0.56, change24h: -3.80, volume24h: 75, color: "#0E0E1A" },
  { symbol: "TNSR", name: "Tensor", price: 0.82, change24h: -6.10, volume24h: 24, color: "#EC4899" },
  { symbol: "SXP", name: "Solar SXP", price: 0.31, change24h: -1.45, volume24h: 18, color: "#28D387" },
  { symbol: "MASK", name: "Mask Network", price: 2.85, change24h: 1.10, volume24h: 31, color: "#1C35FF" },
  { symbol: "GLMR", name: "Moonbeam", price: 0.28, change24h: -2.30, volume24h: 16, color: "#E1147F" },
  { symbol: "LUNA", name: "Terra Classic", price: 0.000085, change24h: 4.20, volume24h: 88, color: "#F3BA2F" }
];

export default function CoinsPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [kycStatus, setKycStatus] = useState("Tier-1 Basic (Email Verified)");
  const [assetSearch, setAssetSearch] = useState("");
  const [assets, setAssets] = useState<AssetBalance[]>([]);
  const [coinDirectory, setCoinDirectory] = useState<CoinDirectoryItem[]>(COIN_DIRECTORY_LIST);
  
  // Market display toggle state
  const [displayCurrency, setDisplayCurrency] = useState<"USDT" | "INR">("USDT");
  const INR_MULTIPLIER = 88.50;

  // Modal states: "deposit" | "withdraw" | "none"
  const [modalType, setModalType] = useState<"deposit" | "withdraw" | "none">("none");
  const [activeModalCoin, setActiveModalCoin] = useState<string>("USDT");
  const [selectedNetwork, setSelectedNetwork] = useState<string>("TRON (TRC20)");
  const [depositAddress, setDepositAddress] = useState<string>("");
  const [isGeneratingAddress, setIsGeneratingAddress] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);

  // Withdrawal form states
  const [withdrawAddress, setWithdrawAddress] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [show2faOverlay, setShow2faOverlay] = useState(false);
  const [authCode, setAuthCode] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [smsCode, setSmsCode] = useState("");
  const [emailCountdown, setEmailCountdown] = useState(0);
  const [smsCountdown, setSmsCountdown] = useState(0);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");

  // Multi-factor settings from Security portal
  const [selfieAuthActive, setSelfieAuthActive] = useState(true);
  const [smsOtpActive, setSmsOtpActive] = useState(true);
  const [emailOtpActive, setEmailOtpActive] = useState(true);
  const [isNewDevice, setIsNewDevice] = useState(true); // Default to true for simulated verification flow
  const [selfieVerified, setSelfieVerified] = useState(false);
  const [isScanningSelfie, setIsScanningSelfie] = useState(false);
  const [selfieProgress, setSelfieProgress] = useState("");

  // Sync balances and custom pairs
  useEffect(() => {
    const logged = localStorage.getItem("user_logged_in");
    const storedEmail = localStorage.getItem("username");
    if (logged === "true") {
      setIsLoggedIn(true);
      setUserEmail(storedEmail || "institutional_trader@cloud.ex");
    }
    const status = localStorage.getItem("kyc_tier") || "Tier-1 Basic (Email Verified)";
    setKycStatus(status);

    // Sync active security settings
    setSelfieAuthActive(localStorage.getItem("selfie_auth_active") !== "false");
    setSmsOtpActive(localStorage.getItem("sms_otp_active") !== "false");
    setEmailOtpActive(localStorage.getItem("email_otp_active") !== "false");

    const defaultBalances: AssetBalance[] = [
      { symbol: "USDT", name: "Tether USD", amount: 15740.50, inOrder: 0.00, color: "#26A17B" },
      { symbol: "BTC", name: "Bitcoin", amount: 0.2450, inOrder: 0.00, color: "#F7931A" },
      { symbol: "ETH", name: "Ethereum", amount: 2.8500, inOrder: 0.00, color: "#627EEA" },
      { symbol: "SOL", name: "Solana", amount: 15.40, inOrder: 0.00, color: "#14F195" },
      { symbol: "BNB", name: "BNB Smart Chain", amount: 4.80, inOrder: 0.00, color: "#F3BA2F" }
    ];

    const storedBalances = localStorage.getItem("user_asset_balances");
    if (storedBalances) {
      setAssets(JSON.parse(storedBalances));
    } else {
      setAssets(defaultBalances);
      localStorage.setItem("user_asset_balances", JSON.stringify(defaultBalances));
    }

    // Load custom pairs
    const savedCustomPairs = localStorage.getItem("admin_custom_trading_pairs");
    if (savedCustomPairs) {
      const parsed: CoinDirectoryItem[] = JSON.parse(savedCustomPairs);
      const combined = [...COIN_DIRECTORY_LIST];
      parsed.forEach(p => {
        if (!combined.some(c => c.symbol === p.symbol)) {
          combined.push(p);
        }
      });
      setCoinDirectory(combined);
    }
  }, []);

  // Fetch real-time coin prices from Binance public REST API
  useEffect(() => {
    const fetchAllPrices = async () => {
      try {
        const res = await fetch("https://api.binance.com/api/v3/ticker/24hr");
        if (!res.ok) throw new Error("Binance API error");
        const data = await res.json();
        
        setCoinDirectory(prev => prev.map(c => {
          if (c.symbol === "USDT") return c;
          
          const apiItem = data.find((item: any) => item.symbol === `${c.symbol}USDT`);
          if (apiItem) {
            return {
              ...c,
              price: parseFloat(apiItem.lastPrice),
              change24h: parseFloat(apiItem.priceChangePercent),
              volume24h: Math.round(parseFloat(apiItem.quoteVolume) / 1000)
            };
          }
          return c;
        }));
      } catch (err) {
        console.warn("Error fetching prices from Binance, using simulated rates: ", err);
        setCoinDirectory(prev => prev.map(c => {
          if (c.symbol === "USDT") return c;
          const delta = (Math.random() - 0.49) * (c.price * 0.001);
          return {
            ...c,
            price: +(c.price + delta).toFixed(c.price < 2 ? 4 : 2),
            change24h: +(c.change24h + (Math.random() - 0.5) * 0.1).toFixed(2)
          };
        }));
      }
    };

    fetchAllPrices();
    const interval = setInterval(fetchAllPrices, 8000);
    return () => clearInterval(interval);
  }, []);

  // Update total USD wallet value based on asset balances and dynamic prices
  const coinPriceMap: Record<string, number> = {
    USDT: 1.00, BTC: 65050.00, ETH: 3450.00, SOL: 145.00, BNB: 580.00
  };
  coinDirectory.forEach(c => {
    coinPriceMap[c.symbol] = c.price;
  });

  // Network list selector map helper
  const getNetworksForCoin = (coin: string): string[] => {
    if (coin === "USDT") return ["TRON (TRC20)", "Ethereum (ERC20)", "BNB Smart Chain (BEP20)", "Solana Network", "Polygon Network"];
    if (coin === "BTC") return ["Bitcoin Network", "BNB Smart Chain (BEP20)"];
    if (coin === "ETH") return ["Ethereum (ERC20)", "Arbitrum One", "Optimism", "BNB Smart Chain (BEP20)"];
    if (coin === "SOL") return ["Solana Network", "BNB Smart Chain (BEP20)"];
    if (coin === "BNB") return ["BNB Smart Chain (BEP20)", "Beacon Chain (BEP2)"];
    if (coin === "TRX") return ["TRON (TRC20)"];
    return ["Ethereum (ERC20)", "BNB Smart Chain (BEP20)"];
  };

  // Generate simulated addresses with loading state
  useEffect(() => {
    if (modalType === "deposit") {
      setIsGeneratingAddress(true);
      const timer = setTimeout(() => {
        const randomPart = Math.random().toString(36).substring(2, 10).toUpperCase();
        if (selectedNetwork.includes("TRON") || selectedNetwork.includes("TRC20")) {
          setDepositAddress(`TY83h7d${randomPart}m39sJ9aW12`);
        } else if (selectedNetwork.includes("Ethereum") || selectedNetwork.includes("ERC20") || selectedNetwork.includes("Polygon") || selectedNetwork.includes("Arbitrum") || selectedNetwork.includes("Optimism")) {
          setDepositAddress(`0x4f87A${randomPart}d69612a45fb2`);
        } else if (selectedNetwork.includes("BNB") || selectedNetwork.includes("BEP20") || selectedNetwork.includes("BEP2")) {
          setDepositAddress(`0x2d8E5${randomPart}a482bcf291`);
        } else if (selectedNetwork.includes("Solana")) {
          setDepositAddress(`SOL${randomPart}kP98h23gNs9`);
        } else if (selectedNetwork.includes("Bitcoin")) {
          setDepositAddress(`bc1q9d${randomPart.toLowerCase()}m8f7k29s12c`);
        } else {
          setDepositAddress(`0x${activeModalCoin}${randomPart}d921B436e2`);
        }
        setIsGeneratingAddress(false);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [modalType, activeModalCoin, selectedNetwork]);

  useEffect(() => {
    if (emailCountdown > 0) {
      const timer = setTimeout(() => setEmailCountdown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [emailCountdown]);

  useEffect(() => {
    if (smsCountdown > 0) {
      const timer = setTimeout(() => setSmsCountdown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [smsCountdown]);

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

  const openModal = (type: "deposit" | "withdraw", coin: string) => {
    setActiveModalCoin(coin);
    setModalType(type);
    setWithdrawAddress("");
    setWithdrawAmount("");
    setShow2faOverlay(false);
    
    // Reset OTP and Selfie states
    setSmsCode("");
    setEmailCode("");
    setAuthCode("");
    setSelfieVerified(false);
    setIsScanningSelfie(false);
    setSelfieProgress("");

    // Sync active security settings in case they changed
    setSelfieAuthActive(localStorage.getItem("selfie_auth_active") !== "false");
    setSmsOtpActive(localStorage.getItem("sms_otp_active") !== "false");
    setEmailOtpActive(localStorage.getItem("email_otp_active") !== "false");
    
    // Auto reset to first network in list
    const nets = getNetworksForCoin(coin);
    setSelectedNetwork(nets[0]);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(depositAddress);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  const handleSendEmailCode = () => {
    if (emailCountdown > 0) return;
    setEmailCountdown(60);
    triggerToast("Verification dispatch success. OTP sent to your registered secure email.");
  };

  const handleSendSmsCode = () => {
    if (smsCountdown > 0) return;
    setSmsCountdown(60);
    triggerToast("Verification dispatch success. OTP sent to your registered mobile phone via SMS.");
  };

  const handleStartSelfieVerify = () => {
    setIsScanningSelfie(true);
    setSelfieProgress("Accessing HD front-facing camera...");
    setTimeout(() => {
      setSelfieProgress("Detecting face footprint... Please blink twice.");
    }, 1200);
    setTimeout(() => {
      setSelfieProgress("Matching biometric geometry signature...");
    }, 2400);
    setTimeout(() => {
      setIsScanningSelfie(false);
      setSelfieVerified(true);
      triggerToast("Selfie biometric scan verified. Safe Device ID matched.", "success");
    }, 3800);
  };

  const handleVerifyWithdrawal = () => {
    if (emailOtpActive && !emailCode) {
      triggerToast("Please enter email verification OTP.", "error");
      return;
    }
    if (smsOtpActive && !smsCode) {
      triggerToast("Please enter mobile SMS verification OTP.", "error");
      return;
    }
    const totpActive = localStorage.getItem("2fa_totp_active") === "true";
    if (totpActive && !authCode) {
      triggerToast("Please enter Google Authenticator (TOTP) code.", "error");
      return;
    }
    if (selfieAuthActive && isNewDevice && !selfieVerified) {
      triggerToast("Selfie face verification is required to authorize this withdrawal.", "error");
      return;
    }

    const amt = parseFloat(withdrawAmount);
    const balance = assets.find(a => a.symbol === activeModalCoin)?.amount || 0;
    if (amt > balance) {
      triggerToast("Insufficient collateral funds.", "error");
      return;
    }

    const updatedAssets = assets.map(a => {
      if (a.symbol === activeModalCoin) {
        a.amount = +(a.amount - amt).toFixed(6);
      }
      return a;
    });

    setAssets(updatedAssets);
    localStorage.setItem("user_asset_balances", JSON.stringify(updatedAssets));

    if (activeModalCoin === "USDT") {
      const usdtAsset = updatedAssets.find(a => a.symbol === "USDT");
      if (usdtAsset) {
        localStorage.setItem("wallet_balance", String(usdtAsset.amount));
        window.dispatchEvent(new Event("storage"));
      }
    }

    // Add to simulated history
    const storedHistory = localStorage.getItem("user_transaction_history");
    const historyList = storedHistory ? JSON.parse(storedHistory) : [];
    const newTx: TxHistoryItem = {
      id: "TXN-" + Math.floor(10000 + Math.random() * 90000),
      time: new Date().toISOString().replace('T', ' ').slice(0, 19),
      type: "Withdrawal",
      coin: activeModalCoin,
      amount: amt,
      address: withdrawAddress.slice(0, 8) + "..." + withdrawAddress.slice(-6),
      status: "Completed"
    };
    localStorage.setItem("user_transaction_history", JSON.stringify([newTx, ...historyList]));

    setModalType("none");
    setShow2faOverlay(false);
    triggerToast(`Withdrawal of ${amt} ${activeModalCoin} completed.`);
  };

  const filteredCoins = coinDirectory.filter(c => 
    c.symbol.toLowerCase().includes(assetSearch.toLowerCase()) || 
    c.name.toLowerCase().includes(assetSearch.toLowerCase())
  );

  // Technical QR code block
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
      <div style={{ background: "#040814", gridColumn: "1/3", gridRow: "1/3", borderRadius: 2 }} />
      <div style={{ background: "#040814", gridColumn: "5/7", gridRow: "1/3", borderRadius: 2 }} />
      <div style={{ background: "#040814", gridColumn: "1/3", gridRow: "5/7", borderRadius: 2 }} />
      <div style={{ background: "var(--yellow)", gridColumn: "3/5", gridRow: "3/5", borderRadius: "50%", margin: 2 }} />
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

  return (
    <div style={{ minHeight: "100vh", position: "relative", color: "var(--text-primary)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <SpaceBackground />
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>

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

      <Header activeTab="coins" />

      {/* CORE BODY CONTAINER */}
      <div className="container-xl" style={{ flex: 1, padding: "40px 24px", display: "flex", flexDirection: "column", gap: 24, zIndex: 10 }}>
        
        {/* Intro strip */}
        <div className="kyc-header-strip">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ background: "var(--yellow-dim)", color: "var(--yellow)", padding: "4px 12px", borderRadius: 20, fontSize: 10, fontWeight: 700 }}>PORTFOLIO CONTROL DESK</span>
              <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Global Market Directory</span>
            </div>
            <h1 className="responsive-h1">
              Coins Market Directory
            </h1>
          </div>

          {/* Currency Toggle */}
          <div style={{ display: "flex", background: "rgba(10, 17, 40, 0.6)", border: "1px solid var(--border)", borderRadius: 8, padding: 3 }}>
            <button 
              onClick={() => setDisplayCurrency("USDT")}
              style={{
                background: displayCurrency === "USDT" ? "var(--yellow)" : "transparent",
                color: displayCurrency === "USDT" ? "#000" : "var(--text-secondary)",
                border: "none",
                borderRadius: 6,
                padding: "6px 14px",
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer"
              }}
            >
              USDT Markets
            </button>
            <button 
              onClick={() => setDisplayCurrency("INR")}
              style={{
                background: displayCurrency === "INR" ? "var(--yellow)" : "transparent",
                color: displayCurrency === "INR" ? "#000" : "var(--text-secondary)",
                border: "none",
                borderRadius: 6,
                padding: "6px 14px",
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer"
              }}
            >
              INR Markets (₹)
            </button>
          </div>
        </div>

        {/* Market Stats Panel */}
        <div className="grid-responsive-4" style={{
          background: "rgba(10, 17, 40, 0.45)",
          border: "1px solid var(--border)",
          borderRadius: 16,
          padding: "16px 24px",
          backdropFilter: "blur(12px)"
        }}>
          <div>
            <div style={{ fontSize: 10, color: "var(--text-secondary)", fontWeight: 700, letterSpacing: 0.5 }}>TOTAL CRYPTO MARKET CAP</div>
            <div style={{ fontSize: 18, fontWeight: 800, marginTop: 4, color: "var(--text-primary)" }}>
              {displayCurrency === "USDT" ? "$2.48T" : "₹219.48T"} <span style={{ color: "var(--green)", fontSize: 12, fontWeight: 700 }}>+1.85%</span>
            </div>
          </div>
          <div style={{ borderLeft: "1px solid var(--border-light)", paddingLeft: 20 }}>
            <div style={{ fontSize: 10, color: "var(--text-secondary)", fontWeight: 700, letterSpacing: 0.5 }}>24H TRADING VOLUME</div>
            <div style={{ fontSize: 18, fontWeight: 800, marginTop: 4, color: "var(--text-primary)" }}>
              {displayCurrency === "USDT" ? "$98.45B" : "₹8.71T"}
            </div>
          </div>
          <div style={{ borderLeft: "1px solid var(--border-light)", paddingLeft: 20 }}>
            <div style={{ fontSize: 10, color: "var(--text-secondary)", fontWeight: 700, letterSpacing: 0.5 }}>BTC DOMINANCE</div>
            <div style={{ fontSize: 18, fontWeight: 800, marginTop: 4, color: "var(--text-primary)" }}>
              54.20%
            </div>
          </div>
          <div style={{ borderLeft: "1px solid var(--border-light)", paddingLeft: 20 }}>
            <div style={{ fontSize: 10, color: "var(--text-secondary)", fontWeight: 700, letterSpacing: 0.5 }}>ACTIVE LISTINGS</div>
            <div style={{ fontSize: 18, fontWeight: 800, marginTop: 4, color: "var(--yellow)" }}>
              {coinDirectory.length} Coins Listed
            </div>
          </div>
        </div>

        {/* Coins Table container */}
        <div style={{
          background: "rgba(10, 17, 40, 0.45)",
          border: "1px solid var(--border)",
          borderRadius: 16,
          padding: 24,
          backdropFilter: "blur(12px)"
        }}>
          <div className="responsive-search-header" style={{ marginBottom: 20 }}>
            <div style={{ flex: 1, marginRight: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 800 }}>Institutional Coins & Tokens Directory</h3>
              <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>Select a coin to deposit, withdraw, buy on P2P escrow, or trade instantly on the HFT desk.</p>
            </div>
            <div style={{ position: "relative", width: "100%", maxWidth: 280, marginTop: 12 }}>
              <Search size={14} style={{ position: "absolute", left: 10, top: 12, color: "var(--text-secondary)" }} />
              <input 
                className="bn-input bn-input-sm" 
                placeholder="Search coin by name or symbol..." 
                value={assetSearch}
                onChange={e => setAssetSearch(e.target.value)}
                style={{ paddingLeft: 30 }}
              />
            </div>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table className="responsive-data-table" style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)", fontSize: 11, color: "var(--text-secondary)" }}>
                  <th style={{ padding: "12px 16px" }}>Asset Name</th>
                  <th style={{ padding: "12px 16px" }}>Market Price</th>
                  <th className="hide-mobile" style={{ padding: "12px 16px" }}>24H Change</th>
                  <th className="hide-mobile" style={{ padding: "12px 16px" }}>24H Volume</th>
                  <th style={{ padding: "12px 16px", textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCoins.map(coin => {
                  const isUp = coin.change24h >= 0;
                  const finalPrice = displayCurrency === "USDT" ? coin.price : coin.price * INR_MULTIPLIER;
                  const finalVol = displayCurrency === "USDT" ? coin.volume24h : coin.volume24h * INR_MULTIPLIER;
                  
                  return (
                    <tr key={coin.symbol} style={{ borderBottom: "1px solid var(--border-light)", transition: "background 0.15s" }} className="pair-row">
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <div style={{
                            width: 28,
                            height: 28,
                            borderRadius: "50%",
                            background: coin.color,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 800,
                            fontSize: 11,
                            color: "#fff",
                            boxShadow: "0 2px 8px rgba(0,0,0,0.3)"
                          }}>
                            {coin.symbol.slice(0, 2)}
                          </div>
                          <div>
                            <strong style={{ color: "var(--text-primary)", fontSize: 14 }}>{coin.symbol}</strong>
                            <span style={{ display: "block", fontSize: 10, color: "var(--text-muted)" }}>{coin.name}</span>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                          {displayCurrency === "USDT" ? "$" : "₹"}{finalPrice < 1 ? finalPrice.toFixed(6) : finalPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="hide-mobile" style={{ padding: "14px 16px" }}>
                        <span style={{ fontWeight: 700, color: isUp ? "var(--green)" : "var(--red)" }}>
                          {isUp ? "+" : ""}{coin.change24h.toFixed(2)}%
                        </span>
                      </td>
                      <td className="hide-mobile" style={{ padding: "14px 16px" }}>
                        <span style={{ fontWeight: 600, color: "var(--text-secondary)" }}>
                          {displayCurrency === "USDT" ? "$" : "₹"}{finalVol.toLocaleString()}M
                        </span>
                      </td>
                      <td style={{ padding: "14px 16px", textAlign: "right" }}>
                        <div className="action-buttons-wrap">
                          <button onClick={() => openModal("deposit", coin.symbol)} className="btn-outline bn-tab-sm" style={{ padding: "4px 12px", fontSize: 11, display: "flex", alignItems: "center", gap: 4 }}>
                            <ArrowDownLeft size={12} /> Deposit
                          </button>
                          <button onClick={() => openModal("withdraw", coin.symbol)} className="btn-outline bn-tab-sm" style={{ padding: "4px 12px", fontSize: 11, display: "flex", alignItems: "center", gap: 4 }}>
                            <ArrowUpRight size={12} /> Withdraw
                          </button>
                          <Link href={`/trade?pair=${coin.symbol}/${displayCurrency}`} className="btn-yellow bn-tab-sm" style={{ padding: "4px 12px", fontSize: 11, display: "flex", alignItems: "center", gap: 4, textDecoration: "none" }}>
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
      </div>

      {/* ==================== DEPOSIT MODAL ==================== */}
      {modalType === "deposit" && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(2, 4, 10, 0.85)",
          backdropFilter: "blur(8px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          padding: 20
        }}>
          <div style={{
            background: "rgba(10, 17, 40, 0.95)",
            border: "1px solid var(--border)",
            borderRadius: 16,
            width: "100%",
            maxWidth: 460,
            padding: 24,
            position: "relative",
            boxShadow: "0 10px 40px rgba(0,0,0,0.8)"
          }}>
            <button onClick={() => setModalType("none")} style={{ position: "absolute", right: 20, top: 20, background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer" }}>
              <X size={18} />
            </button>
            <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>Deposit Crypto Assets</h3>
            <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 20 }}>Send virtual digital assets directly to your institutional ledger account.</p>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ fontSize: 10, color: "var(--text-secondary)", fontWeight: 700, display: "block", marginBottom: 6 }}>SELECTED ASSET</label>
                <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 20, height: 20, borderRadius: "50%", background: coinDirectory.find(c => c.symbol === activeModalCoin)?.color || "var(--yellow)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: "#fff", fontWeight: 800 }}>
                    {activeModalCoin.slice(0, 2)}
                  </div>
                  <strong style={{ fontSize: 14 }}>{activeModalCoin}</strong>
                </div>
              </div>

              <div>
                <label style={{ fontSize: 10, color: "var(--text-secondary)", fontWeight: 700, display: "block", marginBottom: 6 }}>SELECT DEPOSIT NETWORK</label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
                  {getNetworksForCoin(activeModalCoin).map(net => (
                    <button key={net} type="button" onClick={() => setSelectedNetwork(net)} style={{
                      background: selectedNetwork === net ? "var(--yellow)" : "rgba(255,255,255,0.03)",
                      color: selectedNetwork === net ? "#000" : "var(--text-secondary)",
                      border: selectedNetwork === net ? "1px solid var(--yellow)" : "1px solid var(--border)",
                      padding: "8px 12px",
                      borderRadius: 6,
                      fontSize: 10,
                      fontWeight: 700,
                      cursor: "pointer",
                      textAlign: "center"
                    }}>{net}</button>
                  ))}
                </div>
              </div>

              {/* QR and Address display with Loader Spinner */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", background: "rgba(0,0,0,0.25)", border: "1px dashed var(--border)", borderRadius: 12, padding: 20, marginTop: 10, minHeight: 240, justifyContent: "center" }}>
                {isGeneratingAddress ? (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                    <div style={{
                      width: 32,
                      height: 32,
                      border: "3px solid rgba(255, 255, 255, 0.1)",
                      borderTop: "3px solid var(--yellow)",
                      borderRadius: "50%",
                      animation: "spin 1s linear infinite"
                    }} />
                    <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>Generating unique network address...</span>
                  </div>
                ) : (
                  <>
                    <TechQRCode text={depositAddress} />
                    <div style={{ width: "100%", marginTop: 20 }}>
                      <label style={{ fontSize: 9, color: "var(--text-muted)", fontWeight: 700, display: "block", marginBottom: 4, textAlign: "center" }}>YOUR UNIQUE {activeModalCoin} ADDRESS</label>
                      <div style={{ display: "flex", background: "rgba(255,255,255,0.05)", borderRadius: 6, padding: 8, alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ fontSize: 11, fontFamily: "monospace", color: "var(--cyan)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 10 }}>{depositAddress}</span>
                        <button onClick={copyToClipboard} style={{ background: "none", border: "none", color: "var(--yellow)", cursor: "pointer", display: "flex", alignItems: "center" }}>
                          <Copy size={14} />
                        </button>
                      </div>
                      {copyFeedback && <div style={{ fontSize: 10, color: "var(--green)", textAlign: "center", marginTop: 4, fontWeight: 700 }}>Copied to clipboard!</div>}
                    </div>
                  </>
                )}
              </div>

              <div style={{ background: "rgba(235, 94, 40, 0.08)", border: "1px solid rgba(235, 94, 40, 0.2)", borderRadius: 8, padding: 12, fontSize: 11, color: "var(--yellow)" }}>
                ⚠️ Send only {activeModalCoin} on {selectedNetwork} network to this address. Sending other assets will result in permanent loss.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== WITHDRAWAL MODAL ==================== */}
      {modalType === "withdraw" && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(2, 4, 10, 0.85)",
          backdropFilter: "blur(8px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          padding: 20
        }}>
          <div style={{
            background: "rgba(10, 17, 40, 0.95)",
            border: "1px solid var(--border)",
            borderRadius: 16,
            width: "100%",
            maxWidth: 460,
            padding: 24,
            position: "relative",
            boxShadow: "0 10px 40px rgba(0,0,0,0.8)"
          }}>
            <button onClick={() => setModalType("none")} style={{ position: "absolute", right: 20, top: 20, background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer" }}>
              <X size={18} />
            </button>
            <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>Withdraw Crypto Assets</h3>
            <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 20 }}>Dispatch locked tokens from your ledger directly to an external cold storage wallet.</p>

            <form onSubmit={(e) => { e.preventDefault(); setShow2faOverlay(true); }} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ fontSize: 10, color: "var(--text-secondary)", fontWeight: 700, display: "block", marginBottom: 6 }}>SELECTED ASSET</label>
                <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 20, height: 20, borderRadius: "50%", background: coinDirectory.find(c => c.symbol === activeModalCoin)?.color || "var(--yellow)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: "#fff", fontWeight: 800 }}>
                    {activeModalCoin.slice(0, 2)}
                  </div>
                  <strong style={{ fontSize: 14 }}>{activeModalCoin}</strong>
                </div>
              </div>

              <div>
                <label style={{ fontSize: 10, color: "var(--text-secondary)", fontWeight: 700, display: "block", marginBottom: 6 }}>RECIPIENT ADDRESS</label>
                <input
                  type="text"
                  className="bn-input"
                  placeholder={`Enter correct recipient ${activeModalCoin} address`}
                  value={withdrawAddress}
                  onChange={e => setWithdrawAddress(e.target.value)}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: 10, color: "var(--text-secondary)", fontWeight: 700, display: "block", marginBottom: 6 }}>WITHDRAWAL AMOUNT</label>
                <div style={{ position: "relative" }}>
                  <input
                    type="number"
                    step="any"
                    className="bn-input"
                    placeholder="0.00"
                    value={withdrawAmount}
                    onChange={e => setWithdrawAmount(e.target.value)}
                    required
                  />
                  <span style={{ position: "absolute", right: 14, top: 12, fontSize: 12, fontWeight: 700, color: "var(--text-muted)" }}>{activeModalCoin}</span>
                </div>
              </div>

              <button type="submit" className="btn-yellow" style={{ width: "100%", padding: 12, fontWeight: 700, fontSize: 13, marginTop: 12 }}>
                Submit Dispatch Request
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ==================== 2FA SECURITY OVERLAY ==================== */}
      {show2faOverlay && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(2, 4, 10, 0.95)",
          backdropFilter: "blur(12px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1100,
          padding: 20
        }}>
          <div style={{
            background: "rgba(10, 17, 40, 0.95)",
            border: "1px solid var(--border)",
            borderRadius: 16,
            width: "100%",
            maxWidth: 420,
            padding: 24,
            position: "relative"
          }}>
            <button onClick={() => setShow2faOverlay(false)} style={{ position: "absolute", right: 20, top: 20, background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer" }}>
              <X size={18} />
            </button>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, borderBottom: "1px solid var(--border-light)", paddingBottom: 10 }}>
              <h3 style={{ fontSize: 15, fontWeight: 800 }}>Multi-Factor Authorization</h3>
              <button 
                type="button"
                onClick={() => setIsNewDevice(!isNewDevice)}
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderRadius: 4, padding: "2px 6px", color: "var(--cyan)", fontSize: 9, fontWeight: 700, cursor: "pointer" }}
              >
                [Simulate: {isNewDevice ? "IP Mismatch" : "Saved Device"}]
              </button>
            </div>
            
            <p style={{ fontSize: 11, color: "var(--text-secondary)", marginBottom: 16 }}>Confirm withdrawal dispatch of {withdrawAmount} {activeModalCoin}.</p>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {emailOtpActive && (
                <div>
                  <label style={{ fontSize: 10, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>EMAIL VERIFICATION CODE</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      type="text"
                      maxLength={6}
                      className="bn-input"
                      placeholder="6-digit email code"
                      value={emailCode}
                      onChange={e => setEmailCode(e.target.value)}
                      style={{ flex: 1 }}
                    />
                    <button onClick={handleSendEmailCode} disabled={emailCountdown > 0} className="btn-outline" style={{ padding: "0 14px", fontSize: 11, cursor: "pointer", whiteSpace: "nowrap" }}>
                      {emailCountdown > 0 ? `Resend (${emailCountdown}s)` : "Send Code"}
                    </button>
                  </div>
                </div>
              )}

              {smsOtpActive && (
                <div>
                  <label style={{ fontSize: 10, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>MOBILE SMS VERIFICATION CODE</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      type="text"
                      maxLength={6}
                      className="bn-input"
                      placeholder="6-digit SMS code"
                      value={smsCode}
                      onChange={e => setSmsCode(e.target.value)}
                      style={{ flex: 1 }}
                    />
                    <button onClick={handleSendSmsCode} disabled={smsCountdown > 0} className="btn-outline" style={{ padding: "0 14px", fontSize: 11, cursor: "pointer", whiteSpace: "nowrap" }}>
                      {smsCountdown > 0 ? `Resend (${smsCountdown}s)` : "Send SMS"}
                    </button>
                  </div>
                </div>
              )}

              {localStorage.getItem("2fa_totp_active") === "true" && (
                <div>
                  <label style={{ fontSize: 10, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>GOOGLE AUTHENTICATOR (TOTP)</label>
                  <input
                    type="text"
                    maxLength={6}
                    className="bn-input"
                    placeholder="6-digit TOTP sequence code"
                    value={authCode}
                    onChange={e => setAuthCode(e.target.value)}
                  />
                </div>
              )}

              {/* Dynamic device signature and selfie face verify */}
              {selfieAuthActive && isNewDevice && (
                <div style={{ background: "rgba(252, 213, 53, 0.03)", border: "1px dashed var(--yellow)", borderRadius: 10, padding: 14 }}>
                  <div style={{ fontSize: 10, color: "var(--yellow)", fontWeight: 700, display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                    ⚠️ IP FOOTPRINT / NEW DEVICE DETECTED
                  </div>
                  <p style={{ fontSize: 10, color: "var(--text-muted)", lineHeight: 1.4, marginBottom: 12 }}>
                    Anti-Hijack safety active: Logged from a different device fingerprint. A camera selfie match is required to authorize the transaction.
                  </p>
                  {isScanningSelfie ? (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "8px 0" }}>
                      <div style={{
                        width: 36,
                        height: 36,
                        borderRadius: "50%",
                        border: "3px solid var(--yellow)",
                        borderTopColor: "transparent",
                        animation: "spin 1.2s linear infinite"
                      }} />
                      <span style={{ fontSize: 10, color: "var(--yellow)", fontWeight: 700 }}>{selfieProgress}</span>
                    </div>
                  ) : selfieVerified ? (
                    <div style={{ background: "rgba(0, 230, 118, 0.08)", border: "1px solid var(--green)", borderRadius: 6, padding: "8px 12px", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                      <span style={{ fontSize: 11, fontWeight: 800, color: "var(--green)" }}>✓ Selfie biometric scan verified (Matched)</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleStartSelfieVerify}
                      className="btn-green"
                      style={{ width: "100%", height: 36, fontSize: 11, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                    >
                      📸 Start Selfie Verification
                    </button>
                  )}
                </div>
              )}

              <button 
                onClick={handleVerifyWithdrawal} 
                className="btn-yellow" 
                style={{ width: "100%", padding: 12, fontWeight: 700, fontSize: 13, marginTop: 10 }}
              >
                Confirm Dispatch Authorization
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
