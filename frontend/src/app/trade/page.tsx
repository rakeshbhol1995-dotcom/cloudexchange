"use client";
import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";

import { LogOut, LayoutGrid, Search, Play, Pause, Trash2, ArrowUpRight, Key, ShieldCheck, Eye, EyeOff, Trash } from "lucide-react";
import CloudExchangeLogo from "../components/CloudExchangeLogo";
import SpaceBackground from "../components/SpaceBackground";
import { generateDeviceFingerprint, DeviceFingerprint } from "../utils/fingerprint";

interface OrderLevel { price: number; size: number; total: number; }
interface Trade { time: string; price: number; size: number; side: "BUY" | "SELL"; }
interface UserOrder { id: string; time: string; pair: string; type: string; side: "Buy" | "Sell"; price: number; amount: number; filled: string; status: string; leverage?: number; }
interface ApiKeyInfo { key: string; secret: string; scopes: string[]; createdAt: string; }

interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

function getTimeStep(tf: string): number {
  if (tf === "1m") return 60 * 1000;
  if (tf === "5m") return 5 * 60 * 1000;
  if (tf === "15m") return 15 * 60 * 1000;
  if (tf === "1H") return 60 * 60 * 1000;
  if (tf === "4H") return 4 * 60 * 60 * 1000;
  if (tf === "1D") return 24 * 60 * 60 * 1000;
  return 15 * 60 * 1000;
}

function generateCandles(basePrice: number, count: number, tf: string): Candle[] {
  const list: Candle[] = [];
  const multiplier = tf.includes("m") ? 0.0008 : tf.includes("H") ? 0.003 : 0.012;
  
  let currentVal = basePrice * (1 + (Math.random() - 0.5) * 0.03);
  let time = Date.now() - count * getTimeStep(tf);
  
  for (let i = 0; i < count; i++) {
    const open = currentVal;
    const change = (Math.random() - 0.49) * (open * multiplier);
    const close = +(open + change).toFixed(4);
    
    // wicks
    const wickHigh = Math.random() * (open * multiplier * 0.8);
    const wickLow = Math.random() * (open * multiplier * 0.8);
    
    const high = +(Math.max(open, close) + wickHigh).toFixed(4);
    const low = +(Math.min(open, close) - wickLow).toFixed(4);
    
    const volume = Math.round(100 + Math.random() * 900);
    
    list.push({
      time,
      open,
      high,
      low,
      close,
      volume
    });
    
    currentVal = close;
    time += getTimeStep(tf);
  }
  
  // Make the last candle's close exactly basePrice for alignment
  if (list.length > 0) {
    const last = list[list.length - 1];
    last.close = basePrice;
    last.high = Math.max(last.open, last.close) + Math.random() * (last.open * multiplier * 0.5);
    last.low = Math.min(last.open, last.close) - Math.random() * (last.open * multiplier * 0.5);
  }
  
  return list;
}

const BASE_COINS = [
  { symbol: "BTC", price: 65050, change: 2.45, vol: "12.8B" },
  { symbol: "ETH", price: 3420,  change: -1.2, vol: "4.2B" },
  { symbol: "BNB", price: 641,   change: 0.85, vol: "890M" },
  { symbol: "SOL", price: 168,   change: 3.12, vol: "2.1B" },
  { symbol: "XRP", price: 0.61,  change: -0.4, vol: "1.3B" },
  { symbol: "DOGE", price: 0.165, change: 5.2,  vol: "980M" },
  { symbol: "ADA", price: 0.48,  change: -2.1, vol: "420M" },
  { symbol: "AVAX", price: 37.2,  change: 1.8,  vol: "380M" },
  { symbol: "SHIB", price: 0.000024, change: 8.45, vol: "290M" },
  { symbol: "DOT", price: 6.85, change: -1.15, vol: "164M" },
  { symbol: "MATIC", price: 0.72, change: -0.85, vol: "188M" },
  { symbol: "LINK", price: 15.4, change: 2.50, vol: "245M" },
  { symbol: "UNI", price: 7.85, change: -3.20, vol: "176M" },
  { symbol: "LTC", price: 82.4, change: 1.10, vol: "192M" },
  { symbol: "NEAR", price: 6.15, change: 4.60, vol: "255M" },
  { symbol: "SUI", price: 1.24, change: 5.80, vol: "212M" },
  { symbol: "APT", price: 8.95, change: -0.50, vol: "167M" },
  { symbol: "FTM", price: 0.84, change: 12.40, vol: "235M" },
  { symbol: "OP", price: 2.45, change: 2.15, vol: "154M" },
  { symbol: "ARB", price: 0.98, change: -1.75, vol: "173M" },
  { symbol: "INJ", price: 24.5, change: 4.80, vol: "181M" },
  { symbol: "RNDR", price: 8.12, change: 6.30, vol: "224M" },
  { symbol: "AAVE", price: 92.4, change: -2.30, vol: "118M" },
  { symbol: "MKR", price: 2420, change: 1.50, vol: "85M" },
  { symbol: "RUNE", price: 5.42, change: 7.20, vol: "128M" },
  { symbol: "ATOM", price: 8.24, change: -1.80, vol: "96M" },
  { symbol: "ICP", price: 12.1, change: -3.40, vol: "142M" },
  { symbol: "FIL", price: 5.82, change: 0.40, vol: "74M" },
  { symbol: "LDO", price: 2.15, change: 4.20, vol: "110M" },
  { symbol: "TIA", price: 9.85, change: 5.10, vol: "134M" }
];

const FILLERS = [
  { symbol: "SEI", price: 0.54, change: 3.2, vol: "48M" },
  { symbol: "ONDO", price: 0.92, change: 6.8, vol: "82M" },
  { symbol: "JASMY", price: 0.021, change: -4.5, vol: "95M" },
  { symbol: "AR", price: 32.4, change: 1.2, vol: "74M" },
  { symbol: "GRT", price: 0.28, change: -2.1, vol: "39M" },
  { symbol: "THETA", price: 2.12, change: 1.8, vol: "62M" },
  { symbol: "IMX", price: 1.95, change: -3.2, vol: "41M" },
  { symbol: "ALGO", price: 0.18, change: 0.5, vol: "35M" },
  { symbol: "FLOW", price: 0.85, change: 1.1, vol: "22M" },
  { symbol: "VET", price: 0.032, change: -1.4, vol: "51M" },
  { symbol: "HBAR", price: 0.085, change: 2.4, vol: "46M" },
  { symbol: "XLM", price: 0.11, change: -0.2, vol: "63M" },
  { symbol: "QNT", price: 94.2, change: 0.8, vol: "15M" },
  { symbol: "EGLD", price: 38.4, change: -1.9, vol: "28M" },
  { symbol: "SAND", price: 0.42, change: -2.5, vol: "34M" },
  { symbol: "MANA", price: 0.45, change: -1.7, vol: "31M" },
  { symbol: "AXS", price: 6.82, change: 3.1, vol: "29M" },
  { symbol: "GALA", price: 0.042, change: 8.9, vol: "58M" },
  { symbol: "CHZ", price: 0.12, change: -0.9, vol: "27M" },
  { symbol: "CRV", price: 0.38, change: -8.4, vol: "85M" },
  { symbol: "1INCH", price: 0.36, change: -1.1, vol: "19M" },
  { symbol: "SUSHI", price: 1.05, change: -2.7, vol: "24M" },
  { symbol: "DYDX", price: 2.15, change: 1.4, vol: "32M" },
  { symbol: "COMP", price: 54.2, change: -1.6, vol: "18M" },
  { symbol: "SNX", price: 2.85, change: 0.9, vol: "25M" },
  { symbol: "BAT", price: 0.24, change: -1.2, vol: "14M" },
  { symbol: "ZIL", price: 0.022, change: 0.4, vol: "12M" },
  { symbol: "WOO", price: 0.28, change: -3.1, vol: "17M" },
  { symbol: "GMT", price: 0.22, change: -2.5, vol: "21M" },
  { symbol: "WLD", price: 4.82, change: 12.5, vol: "115M" },
  { symbol: "PENDLE", price: 5.12, change: 9.4, vol: "48M" },
  { symbol: "JTO", price: 3.42, change: 4.2, vol: "34M" },
  { symbol: "ETHFI", price: 3.85, change: -5.1, vol: "28M" },
  { symbol: "ENA", price: 0.82, change: -2.8, vol: "62M" },
  { symbol: "NOT", price: 0.015, change: 18.2, vol: "135M" },
  { symbol: "STRK", price: 1.12, change: -3.9, vol: "42M" },
  { symbol: "W", price: 0.58, change: -4.2, vol: "38M" },
  { symbol: "TNSR", price: 0.85, change: -6.1, vol: "14M" },
  { symbol: "DRIFT", price: 0.48, change: -2.4, vol: "11M" },
  { symbol: "ZRO", price: 3.85, change: 5.4, vol: "58M" },
  { symbol: "PEPE", price: 0.000012, change: 14.5, vol: "185M" },
  { symbol: "FLOKI", price: 0.00021, change: 9.8, vol: "94M" },
  { symbol: "BONK", price: 0.000028, change: 6.4, vol: "56M" },
  { symbol: "WIF", price: 2.85, change: 11.2, vol: "108M" },
  { symbol: "KAS", price: 0.16, change: 2.5, vol: "25M" },
  { symbol: "FET", price: 2.12, change: 7.8, vol: "48M" },
  { symbol: "JUP", price: 0.95, change: 3.8, vol: "74M" },
  { symbol: "PYTH", price: 0.44, change: 1.9, vol: "29M" },
  { symbol: "BOME", price: 0.011, change: -5.4, vol: "18M" }
];

const generatePAIRS = () => {
  const list = [...BASE_COINS];
  const seen = new Set(list.map(c => c.symbol));
  FILLERS.forEach(f => {
    if (!seen.has(f.symbol)) {
      seen.add(f.symbol);
      list.push(f);
    }
  });

  let index = 1;
  while (list.length < 100) {
    const sym = `TKN${index}`;
    if (!seen.has(sym)) {
      seen.add(sym);
      list.push({
        symbol: sym,
        price: +(Math.random() * 20 + 1).toFixed(2),
        change: +((Math.random() - 0.48) * 10).toFixed(2),
        vol: `${(Math.random() * 20 + 2).toFixed(1)}M`
      });
    }
    index++;
  }

  return list.map(c => ({
    symbol: `${c.symbol}/USDT`,
    price: c.price,
    change: c.change,
    vol: c.vol
  }));
};

const PAIRS = generatePAIRS();

function generateBook(center: number): { bids: OrderLevel[]; asks: OrderLevel[] } {
  const bids: OrderLevel[] = []; const asks: OrderLevel[] = [];
  let bt = 0, at = 0;
  for (let i = 1; i <= 12; i++) {
    const bsize = +(Math.random() * 3 + 0.05).toFixed(3);
    const asize = +(Math.random() * 3 + 0.05).toFixed(3);
    bt += bsize; at += asize;
    bids.push({ price: +(center * (1 - i * 0.00035)).toFixed(2), size: bsize, total: +bt.toFixed(3) });
    asks.push({ price: +(center * (1 + i * 0.00035)).toFixed(2), size: asize, total: +at.toFixed(3) });
  }
  return { bids: bids.reverse(), asks };
}

export default function TradePage() {
  const [activePair, setActivePair] = useState(PAIRS[0]);
  const [price, setPrice] = useState(65050);
  const [bids, setBids] = useState<OrderLevel[]>([]);
  const [asks, setAsks] = useState<OrderLevel[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [orderTab, setOrderTab] = useState<"Limit" | "Market" | "Stop-Limit">("Limit");
  const [side, setSide] = useState<"Buy" | "Sell">("Buy");
  const [tradingMode, setTradingMode] = useState<"SPOT" | "FUTURES">("SPOT");
  const [leverage, setLeverage] = useState<number>(20);
  const [marginMode, setMarginMode] = useState<"Cross" | "Isolated">("Cross");
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  
  // Form fields
  const [orderPrice, setOrderPrice] = useState("65050");
  const [orderQty, setOrderQty] = useState("");
  const [stopPrice, setStopPrice] = useState("");
  
  const [pairSearch, setPairSearch] = useState("");
  const [pairTab, setPairTab] = useState("ALL");
  const [chartType, setChartType] = useState<"Candles" | "Line">("Candles");
  const [timeframe, setTimeframe] = useState("15m");
  const [posTab, setPosTab] = useState("Open Orders");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  
  // Account state
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [walletBalance, setWalletBalance] = useState(15740.50);
  
  // Custom orders state
  const [openOrders, setOpenOrders] = useState<UserOrder[]>([]);
  const [orderHistory, setOrderHistory] = useState<UserOrder[]>([]);
  const [alertText, setAlertText] = useState("");

  // API Credentials state
  const [apiKeys, setApiKeys] = useState<ApiKeyInfo[]>([]);
  const [scopeRead, setScopeRead] = useState(true);
  const [scopeTrade, setScopeTrade] = useState(true);
  const [scopeP2p, setScopeP2p] = useState(false);
  const [scopeWithdraw, setScopeWithdraw] = useState(false);
  const [revealSecrets, setRevealSecrets] = useState<{ [key: string]: boolean }>({});

  // Security Logs/Telemetry
  const [fingerprint, setFingerprint] = useState<DeviceFingerprint | null>(null);
  const [isHalted, setIsHalted] = useState(false);

  const canvas2dRef = useRef<HTMLCanvasElement>(null);
  const [chartData, setChartData] = useState<Candle[]>([]);
  const [candleWidth, setCandleWidth] = useState<number>(8); // zoom level
  const [scrollOffset, setScrollOffset] = useState<number>(0); // pan offset

  // Sync login status, wallet balance, and API keys
  useEffect(() => {
    const logged = localStorage.getItem("user_logged_in");
    const storedEmail = localStorage.getItem("username");
    if (logged === "true") {
      setIsLoggedIn(true);
      setUserEmail(storedEmail || "institutional_trader@cloud.ex");
    }

    const storedBalance = localStorage.getItem("wallet_balance");
    if (storedBalance) {
      setWalletBalance(parseFloat(storedBalance));
    } else {
      localStorage.setItem("wallet_balance", "15740.50");
    }

    const storedKeys = localStorage.getItem("api_credentials");
    if (storedKeys) {
      setApiKeys(JSON.parse(storedKeys));
    }

    // Set default order price when active pair changes
    setOrderPrice(String(activePair.price));
  }, [activePair]);

  // Wallet balance, api keys, and halt status sync via storage event listener
  useEffect(() => {
    setIsHalted(localStorage.getItem("exchange_halted") === "true");

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "wallet_balance" && e.newValue) {
        setWalletBalance(parseFloat(e.newValue));
      }
      if (e.key === "api_credentials" && e.newValue) {
        setApiKeys(JSON.parse(e.newValue));
      }
      setIsHalted(localStorage.getItem("exchange_halted") === "true");
    };

    const handleLocalUpdate = () => {
      setIsHalted(localStorage.getItem("exchange_halted") === "true");
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("storage", handleLocalUpdate);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("storage", handleLocalUpdate);
    };
  }, []);

  // Update localStorage when local wallet balance changes
  const updateWalletBalance = (newVal: number) => {
    setWalletBalance(newVal);
    localStorage.setItem("wallet_balance", String(newVal));
  };

  const handleLogout = () => {
    localStorage.removeItem("user_logged_in");
    localStorage.removeItem("username");
    setIsLoggedIn(false);
    setUserEmail("");
  };

  // Generate Device Fingerprint when Security tab opens
  useEffect(() => {
    if (posTab === "Security Logs") {
      generateDeviceFingerprint().then(res => setFingerprint(res));
    }
  }, [posTab]);

  // Live order book & price ticker simulation
  useEffect(() => {
    setPrice(activePair.price);
    setOrderPrice(String(activePair.price));
    
    // Seed initial historical chartData (150 candles) based on active pair's price
    const basePrice = activePair.price;
    const seeded = generateCandles(basePrice, 150, timeframe);
    setChartData(seeded);
    setScrollOffset(0); // Reset scroll position when pair/timeframe changes

    // Seed initial trades
    const seedTrades: Trade[] = [];
    for (let i = 0; i < 20; i++) {
      seedTrades.push({
        time: new Date(Date.now() - i * 15000).toLocaleTimeString([], { hour12: false }),
        price: +(activePair.price * (1 + (Math.random() - 0.5) * 0.002)).toFixed(2),
        size: +(Math.random() * 1.5 + 0.01).toFixed(4),
        side: Math.random() > 0.5 ? "BUY" : "SELL"
      });
    }
    setTrades(seedTrades);

    const book = generateBook(activePair.price);
    setBids(book.bids);
    setAsks(book.asks);

    if (isHalted) return;

    let currentPrice = activePair.price;
    const interval = setInterval(() => {
      const delta = (Math.random() - 0.485) * (activePair.price * 0.00035);
      const np = Math.max(0.0001, +(currentPrice + delta).toFixed(4));
      currentPrice = np;
      setPrice(np);

      setChartData(prevCandles => {
        if (prevCandles.length === 0) return prevCandles;
        
        const lastCandle = prevCandles[prevCandles.length - 1];
        const now = Date.now();
        const step = getTimeStep(timeframe);
        
        if (now >= lastCandle.time + step) {
          const newCandle: Candle = {
            time: lastCandle.time + step,
            open: lastCandle.close,
            high: np,
            low: np,
            close: np,
            volume: Math.round(10 + Math.random() * 50)
          };
          return [...prevCandles.slice(1), newCandle];
        } else {
          const copy = [...prevCandles];
          const last = { ...copy[copy.length - 1] };
          last.close = np;
          if (np > last.high) last.high = np;
          if (np < last.low) last.low = np;
          last.volume += Math.round(Math.random() * 5);
          copy[copy.length - 1] = last;
          return copy;
        }
      });
      
      const updatedBook = generateBook(np);
      setBids(updatedBook.bids);
      setAsks(updatedBook.asks);

      if (Math.random() > 0.35) {
        const tradeSide = Math.random() > 0.5 ? "BUY" : "SELL";
        setTrades(prev => [{
          time: new Date().toLocaleTimeString([], { hour12: false }),
          price: np,
          size: +(Math.random() * 2 + 0.01).toFixed(4),
          side: tradeSide
        }, ...prev.slice(0, 24)]);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activePair, isHalted, timeframe]);

  const isDraggingRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragStartOffsetRef = useRef(0);

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = true;
    dragStartXRef.current = e.clientX;
    dragStartOffsetRef.current = scrollOffset;
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvas2dRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setMousePos({ x, y });

    if (isDraggingRef.current) {
      const deltaX = e.clientX - dragStartXRef.current;
      const candlesMoved = Math.round(deltaX / (candleWidth + 2));
      const newOffset = Math.max(0, Math.min(chartData.length - 10, dragStartOffsetRef.current + candlesMoved));
      if (newOffset !== scrollOffset) {
        setScrollOffset(newOffset);
      }
    }
  };

  const handleCanvasMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleCanvasMouseLeave = () => {
    isDraggingRef.current = false;
    setMousePos(null);
  };

  // Add non-passive wheel event listener to handle zoom without scrolling the webpage
  useEffect(() => {
    const canvas = canvas2dRef.current;
    if (!canvas) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.deltaY < 0) {
        setCandleWidth(prev => Math.min(30, prev + 1));
      } else {
        setCandleWidth(prev => Math.max(3, prev - 1));
      }
    };

    canvas.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      canvas.removeEventListener("wheel", handleWheel);
    };
  }, []);

  // Render 2D Chart
  useEffect(() => {
    const canvas = canvas2dRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);

    const W = rect.width, H = rect.height;
    ctx.clearRect(0, 0, W, H);
    
    // Background Gradient (Sleek Space-Navy design)
    const gradient = ctx.createLinearGradient(0, 0, 0, H);
    gradient.addColorStop(0, "#080f26");
    gradient.addColorStop(1, "#03050c");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, W, H);

    const paddingRight = 75;
    const paddingBottom = 25;
    const paddingTop = 30;
    const plotW = W - paddingRight;
    const plotH = H - paddingBottom - paddingTop;

    // Grid Lines (TradingView Style)
    ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
    ctx.lineWidth = 1;
    const gridCols = 8;
    const gridRows = 6;
    for (let i = 1; i < gridRows; i++) {
      const y = paddingTop + (i / gridRows) * plotH;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(plotW, y);
      ctx.stroke();
    }
    for (let i = 1; i < gridCols; i++) {
      const x = (i / gridCols) * plotW;
      ctx.beginPath();
      ctx.moveTo(x, paddingTop);
      ctx.lineTo(x, H - paddingBottom);
      ctx.stroke();
    }

    if (chartData.length === 0) return;

    // Calculate visible range based on zoom (candleWidth) and pan (scrollOffset)
    const maxVisibleCandles = Math.ceil(plotW / (candleWidth + 2));
    const endIndex = chartData.length - 1 - scrollOffset;
    const startIndex = Math.max(0, endIndex - maxVisibleCandles);
    const visibleCandles = chartData.slice(startIndex, endIndex + 1);

    if (visibleCandles.length === 0) return;

    const min = Math.min(...visibleCandles.map(c => c.low));
    const max = Math.max(...visibleCandles.map(c => c.high));
    const range = max - min || 1;

    // Calculate Moving Averages for all candles (so they don't break at edges)
    const ma7Values = chartData.map((c, i) => {
      let sum = 0;
      let count = 0;
      for (let j = Math.max(0, i - 6); j <= i; j++) {
        sum += chartData[j].close;
        count++;
      }
      return sum / count;
    });

    const ma25Values = chartData.map((c, i) => {
      let sum = 0;
      let count = 0;
      for (let j = Math.max(0, i - 24); j <= i; j++) {
        sum += chartData[j].close;
        count++;
      }
      return sum / count;
    });

    // Helper to map index in visible list to screen X coordinate
    const getXCoordinate = (idx: number) => {
      // Right-aligned with a small margin of 10px from the axis border
      return plotW - 10 - (visibleCandles.length - 1 - idx) * (candleWidth + 2);
    };

    // Helper to map price value to screen Y coordinate
    const getYCoordinate = (priceVal: number) => {
      return H - paddingBottom - ((priceVal - min) / range) * plotH;
    };

    // 1. Draw Volume Bars at bottom (height: 40px max)
    const maxVol = Math.max(...visibleCandles.map(c => c.volume)) || 1;
    const volPlotH = 45;
    visibleCandles.forEach((c, idx) => {
      const x = getXCoordinate(idx);
      const volH = (c.volume / maxVol) * volPlotH;
      const isGreen = c.close >= c.open;
      ctx.fillStyle = isGreen ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)";
      const barW = Math.max(1, candleWidth * 0.75);
      ctx.fillRect(x - barW / 2, H - paddingBottom - volH, barW, volH);
    });

    // 2. Draw 7-Period & 25-Period Moving Averages
    const drawMA = (maVals: number[], color: string) => {
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.lineJoin = "round";
      let first = true;
      visibleCandles.forEach((c, idx) => {
        const origIdx = startIndex + idx;
        const maVal = maVals[origIdx];
        const x = getXCoordinate(idx);
        const maY = getYCoordinate(maVal);

        if (first) {
          ctx.moveTo(x, maY);
          first = false;
        } else {
          ctx.lineTo(x, maY);
        }
      });
      ctx.stroke();
    };
    drawMA(ma7Values, "#eab308"); // MA7 Gold/Yellow
    drawMA(ma25Values, "#c084fc"); // MA25 Light Purple

    // 3. Draw Candlesticks or Line chart
    if (chartType === "Candles") {
      visibleCandles.forEach((c, idx) => {
        const x = getXCoordinate(idx);
        const isGreen = c.close >= c.open;
        
        const openY = getYCoordinate(c.open);
        const closeY = getYCoordinate(c.close);
        const highY = getYCoordinate(c.high);
        const lowY = getYCoordinate(c.low);

        // Draw Wick Line
        ctx.strokeStyle = isGreen ? "#10b981" : "#ef4444";
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(x, highY);
        ctx.lineTo(x, lowY);
        ctx.stroke();

        // Draw Candle Body
        ctx.fillStyle = isGreen ? "#10b981" : "#ef4444";
        const bodyW = Math.max(1, candleWidth * 0.75);
        const bodyH = Math.abs(closeY - openY) || 1.2;
        ctx.fillRect(x - bodyW / 2, Math.min(closeY, openY), bodyW, bodyH);
        
        // Draw border stroke for extra sharpness
        ctx.strokeStyle = isGreen ? "#059669" : "#dc2626";
        ctx.lineWidth = 0.8;
        ctx.strokeRect(x - bodyW / 2, Math.min(closeY, openY), bodyW, bodyH);
      });
    } else {
      // Line chart mode — smooth glowing price line with area fill
      const pts = visibleCandles.map((c, idx) => ({ x: getXCoordinate(idx), y: getYCoordinate(c.close) }));

      if (pts.length > 1) {
        // Area fill under the line
        const areaGrad = ctx.createLinearGradient(0, paddingTop, 0, H - paddingBottom);
        areaGrad.addColorStop(0, "rgba(0, 229, 255, 0.18)");
        areaGrad.addColorStop(0.6, "rgba(0, 229, 255, 0.05)");
        areaGrad.addColorStop(1, "rgba(0, 229, 255, 0)");
        ctx.beginPath();
        ctx.moveTo(pts[0].x, H - paddingBottom);
        pts.forEach(p => ctx.lineTo(p.x, p.y));
        ctx.lineTo(pts[pts.length - 1].x, H - paddingBottom);
        ctx.closePath();
        ctx.fillStyle = areaGrad;
        ctx.fill();

        // Glowing price line
        ctx.shadowBlur = 8;
        ctx.shadowColor = "rgba(0, 229, 255, 0.6)";
        ctx.beginPath();
        ctx.strokeStyle = "#00e5ff";
        ctx.lineWidth = 2;
        ctx.lineJoin = "round";
        ctx.moveTo(pts[0].x, pts[0].y);
        pts.slice(1).forEach(p => ctx.lineTo(p.x, p.y));
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
    }

    // 4. Horizontal Current Price Tracker Line (drawn using the latest live candle)
    const latestCandle = chartData[chartData.length - 1];
    if (latestCandle) {
      const latestCloseY = getYCoordinate(latestCandle.close);
      if (latestCloseY >= paddingTop && latestCloseY <= H - paddingBottom) {
        ctx.setLineDash([3, 3]);
        ctx.strokeStyle = latestCandle.close >= latestCandle.open ? "rgba(16, 185, 129, 0.45)" : "rgba(239, 68, 68, 0.45)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, latestCloseY);
        ctx.lineTo(plotW, latestCloseY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Pulsing dot on live price coordinate
        // Find if the latest candle is visible
        if (scrollOffset < maxVisibleCandles) {
          const liveX = getXCoordinate(visibleCandles.length - 1);
          ctx.fillStyle = latestCandle.close >= latestCandle.open ? "#10b981" : "#ef4444";
          ctx.beginPath();
          ctx.arc(liveX, latestCloseY, 3.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // 5. Border Lines for Axis Separation
    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    // Vertical axis split line
    ctx.moveTo(plotW, 0);
    ctx.lineTo(plotW, H);
    // Horizontal axis split line
    ctx.moveTo(0, H - paddingBottom);
    ctx.lineTo(W, H - paddingBottom);
    ctx.stroke();

    // 6. Right Price Scale Axis values
    ctx.fillStyle = "rgba(4, 8, 20, 0.45)";
    ctx.fillRect(plotW + 1, 0, paddingRight - 1, H - paddingBottom);
    
    ctx.fillStyle = "var(--text-secondary)";
    ctx.font = "10px Outfit, sans-serif";
    ctx.textAlign = "left";
    for (let i = 0; i <= 5; i++) {
      const val = min + (i / 5) * range;
      const y = H - paddingBottom - (i / 5) * plotH;
      ctx.fillText(val < 2 ? val.toFixed(4) : val.toLocaleString(undefined, { maximumFractionDigits: 2 }), plotW + 8, y + 4);
    }

    // Live Price indicator on Axis
    if (latestCandle) {
      const curPrice = latestCandle.close;
      const liveY = getYCoordinate(curPrice);
      ctx.fillStyle = latestCandle.close >= latestCandle.open ? "#10b981" : "#ef4444";
      ctx.fillRect(plotW + 2, liveY - 8, paddingRight - 4, 16);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 9px monospace";
      ctx.fillText(curPrice < 2 ? curPrice.toFixed(4) : Math.round(curPrice).toLocaleString(), plotW + 6, liveY + 3);
    }

    // Helper to format simulated timestamps for Bottom Axis
    const getSimulatedTime = (c: Candle) => {
      const t = new Date(c.time);
      if (timeframe === "1D") {
        return t.toLocaleDateString([], { month: "short", day: "numeric" });
      }
      return t.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
    };

    // 7. Time Labels at bottom (5 markers spacing)
    ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
    ctx.font = "10px Outfit, sans-serif";
    ctx.textAlign = "center";
    const labelCount = 5;
    for (let i = 0; i < labelCount; i++) {
      const idx = Math.floor((i / (labelCount - 1)) * (visibleCandles.length - 1));
      const c = visibleCandles[idx];
      if (c) {
        const x = getXCoordinate(idx);
        ctx.fillText(getSimulatedTime(c), x, H - 8);
      }
    }

    // 8. Draw interactive crosshair, HUD, and axis badges on hover
    if (mousePos && mousePos.x < plotW && mousePos.y > paddingTop && mousePos.y < H - paddingBottom) {
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
      ctx.lineWidth = 1;

      // Horizontal cursor crosshair
      ctx.beginPath();
      ctx.moveTo(0, mousePos.y);
      ctx.lineTo(plotW, mousePos.y);
      ctx.stroke();

      // Find closest candle index
      let closestIdx = 0;
      let minD = Infinity;
      visibleCandles.forEach((c, idx) => {
        const x = getXCoordinate(idx);
        const d = Math.abs(x - mousePos.x);
        if (d < minD) {
          minD = d;
          closestIdx = idx;
        }
      });
      const c = visibleCandles[closestIdx];

      if (c) {
        const x = getXCoordinate(closestIdx);
        
        // Vertical cursor crosshair (aligned exactly to candle center)
        ctx.beginPath();
        ctx.moveTo(x, paddingTop);
        ctx.lineTo(x, H - paddingBottom);
        ctx.stroke();
        ctx.setLineDash([]);

        // Hover Price Badge on Right Axis
        const hoveredPrice = min + ((H - paddingBottom - mousePos.y) / plotH) * range;
        ctx.fillStyle = "var(--yellow)";
        ctx.fillRect(plotW + 2, mousePos.y - 8, paddingRight - 4, 16);
        ctx.fillStyle = "#000";
        ctx.font = "bold 9px monospace";
        ctx.textAlign = "left";
        ctx.fillText(hoveredPrice < 2 ? hoveredPrice.toFixed(4) : hoveredPrice.toLocaleString(undefined, { maximumFractionDigits: 2 }), plotW + 6, mousePos.y + 3);

        // Hover Time Badge on Bottom Axis
        ctx.fillStyle = "var(--yellow)";
        ctx.fillRect(x - 22, H - paddingBottom + 2, 44, 16);
        ctx.fillStyle = "#000";
        ctx.font = "bold 9px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(getSimulatedTime(c), x, H - paddingBottom + 13);

        // Full Candlestick Data Info Overlay (HUD) at top left
        const diffPercent = ((c.close - c.open) / c.open) * 100;
        ctx.fillStyle = "rgba(10, 17, 40, 0.9)";
        ctx.fillRect(5, 5, plotW - 10, 20);
        
        ctx.font = "bold 11px Outfit, sans-serif";
        ctx.textAlign = "left";
        ctx.fillStyle = "var(--yellow)";
        ctx.fillText(`${activePair.symbol} (${timeframe})`, 10, 18);
        
        ctx.font = "10px monospace";
        ctx.fillStyle = "rgba(255,255,255,0.55)";
        ctx.fillText("O:", 120, 18);
        ctx.fillStyle = c.close >= c.open ? "var(--green)" : "var(--red)";
        ctx.fillText(c.open.toLocaleString(undefined, { maximumFractionDigits: 4 }), 132, 18);

        ctx.fillStyle = "rgba(255,255,255,0.55)";
        ctx.fillText("H:", 200, 18);
        ctx.fillStyle = c.close >= c.open ? "var(--green)" : "var(--red)";
        ctx.fillText(c.high.toLocaleString(undefined, { maximumFractionDigits: 4 }), 212, 18);

        ctx.fillStyle = "rgba(255,255,255,0.55)";
        ctx.fillText("L:", 280, 18);
        ctx.fillStyle = c.close >= c.open ? "var(--green)" : "var(--red)";
        ctx.fillText(c.low.toLocaleString(undefined, { maximumFractionDigits: 4 }), 292, 18);

        ctx.fillStyle = "rgba(255,255,255,0.55)";
        ctx.fillText("C:", 360, 18);
        ctx.fillStyle = c.close >= c.open ? "var(--green)" : "var(--red)";
        ctx.fillText(c.close.toLocaleString(undefined, { maximumFractionDigits: 4 }), 372, 18);

        ctx.fillStyle = "rgba(255,255,255,0.55)";
        ctx.fillText("Chg:", 445, 18);
        ctx.fillStyle = c.close >= c.open ? "var(--green)" : "var(--red)";
        ctx.fillText(`${diffPercent >= 0 ? "+" : ""}${diffPercent.toFixed(2)}%`, 470, 18);
      }
    } else {
      // Default HUD showing active pair info when not hovering
      ctx.fillStyle = "rgba(10, 17, 40, 0.5)";
      ctx.fillRect(5, 5, 230, 20);
      ctx.font = "bold 11px Outfit, sans-serif";
      ctx.fillStyle = "var(--yellow)";
      ctx.textAlign = "left";
      ctx.fillText(`${activePair.symbol} • ${timeframe} • Live Market Feed`, 10, 18);
    }
  }, [chartData, chartType, mousePos, timeframe, activePair, candleWidth, scrollOffset]);

  // Order submission
  const handlePlaceOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (isHalted) {
      setAlertText("Emergency Halt Active: Order matching has been suspended by the Control Plane.");
      setTimeout(() => setAlertText(""), 4000);
      return;
    }
    if (!isLoggedIn) {
      setAlertText("Please Log In to place trading orders.");
      setTimeout(() => setAlertText(""), 3000);
      return;
    }
    
    const qty = parseFloat(orderQty);
    if (isNaN(qty) || qty <= 0) {
      setAlertText("Please enter a valid order quantity.");
      setTimeout(() => setAlertText(""), 3000);
      return;
    }

    const orderP = orderTab === "Market" ? price : parseFloat(orderPrice);
    if (isNaN(orderP) || orderP <= 0) {
      setAlertText("Please enter a valid order price.");
      setTimeout(() => setAlertText(""), 3000);
      return;
    }

    const cost = qty * orderP;
    const isFutures = tradingMode === "FUTURES";
    const marginRequired = isFutures ? (cost / leverage) : cost;

    if (side === "Buy" && marginRequired > walletBalance) {
      setAlertText("Insufficient collateral balance.");
      setTimeout(() => setAlertText(""), 3000);
      return;
    }
    if (side === "Sell" && isFutures && marginRequired > walletBalance) {
      setAlertText("Insufficient collateral balance for Short margin.");
      setTimeout(() => setAlertText(""), 3000);
      return;
    }

    // Deduct margin/balance
    if (side === "Buy" || isFutures) {
      updateWalletBalance(+(walletBalance - marginRequired).toFixed(2));
    }

    const newOrder: UserOrder = {
      id: Math.random().toString(36).substring(2, 9).toUpperCase(),
      time: new Date().toLocaleTimeString([], { hour12: false }),
      pair: activePair.symbol + (isFutures ? ` [${leverage}x]` : ""),
      type: orderTab + (isFutures ? " (Futures)" : ""),
      side: side,
      price: orderP,
      amount: qty,
      filled: orderTab === "Market" ? "100%" : "0%",
      status: orderTab === "Market" ? "Filled" : "New",
      leverage: isFutures ? leverage : undefined
    };

    if (orderTab === "Market") {
      setOrderHistory(prev => [newOrder, ...prev]);
      if (!isFutures && side === "Sell") {
        updateWalletBalance(+(walletBalance + cost).toFixed(2));
      }
      setAlertText(`Market Order Executed! Filled ${qty} ${activePair.symbol.split("/")[0]} at $${orderP}`);
    } else {
      setOpenOrders(prev => [newOrder, ...prev]);
      setAlertText(`Order Submitted: Limit ${side} ${qty} ${activePair.symbol.split("/")[0]} at $${orderP}`);
    }

    setOrderQty("");
    setTimeout(() => setAlertText(""), 4000);
  };

  const handleCancelOrder = (id: string) => {
    const orderToCancel = openOrders.find(o => o.id === id);
    if (orderToCancel) {
      const refund = orderToCancel.leverage 
        ? ((orderToCancel.price * orderToCancel.amount) / orderToCancel.leverage)
        : (orderToCancel.side === "Buy" ? (orderToCancel.price * orderToCancel.amount) : 0);
      
      updateWalletBalance(+(walletBalance + refund).toFixed(2));
      setOpenOrders(prev => prev.filter(o => o.id !== id));
      setAlertText(`Cancelled order ${id}`);
      setTimeout(() => setAlertText(""), 3000);
    }
  };

  // API Key operations
  const handleGenerateApiKey = () => {
    const scopesList = [
      scopeRead && "Read",
      scopeTrade && "Trade",
      scopeP2p && "P2P",
      scopeWithdraw && "Withdraw"
    ].filter(Boolean) as string[];

    if (scopesList.length === 0) {
      alert("Please select at least one permission scope.");
      return;
    }

    const newKey: ApiKeyInfo = {
      key: "CE-K-" + Math.random().toString(36).substring(2, 10).toUpperCase(),
      secret: "CE-S-" + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
      scopes: scopesList,
      createdAt: new Date().toISOString().replace("T", " ").substring(0, 19)
    };

    const updated = [newKey, ...apiKeys];
    setApiKeys(updated);
    localStorage.setItem("api_credentials", JSON.stringify(updated));
    setAlertText("API Key Pair successfully generated.");
    setTimeout(() => setAlertText(""), 3000);
  };

  const handleRevokeApiKey = (keyVal: string) => {
    const updated = apiKeys.filter(k => k.key !== keyVal);
    setApiKeys(updated);
    localStorage.setItem("api_credentials", JSON.stringify(updated));
    setAlertText("API Key revoked successfully.");
    setTimeout(() => setAlertText(""), 3000);
  };

  const toggleSecretReveal = (keyVal: string) => {
    setRevealSecrets(prev => ({ ...prev, [keyVal]: !prev[keyVal] }));
  };

  const filteredPairs = PAIRS.filter(p => {
    const base = p.symbol.split("/")[0];
    const matchesSearch = p.symbol.toLowerCase().includes(pairSearch.toLowerCase());
    if (!matchesSearch) return false;

    if (pairTab === "ALL") return true;
    if (pairTab === "L1") {
      const l1Coins = ["BTC", "ETH", "SOL", "BNB", "XRP", "ADA", "AVAX", "DOT", "NEAR", "SUI", "APT", "ATOM", "ICP", "FIL", "TIA", "SEI", "ALGO", "HBAR", "XLM", "EGLD"];
      return l1Coins.includes(base);
    }
    if (pairTab === "DeFi") {
      const defiCoins = ["LINK", "UNI", "AAVE", "MKR", "RUNE", "LDO", "ONDO", "GRT", "IMX", "DYDX", "COMP", "SNX", "BAT", "PENDLE", "JTO", "ETHFI", "ENA", "ZRO", "JUP", "PYTH", "CRV"];
      return defiCoins.includes(base);
    }
    if (pairTab === "Memes") {
      const memeCoins = ["DOGE", "SHIB", "PEPE", "FLOKI", "BONK", "WIF", "BOME", "NOT"];
      return memeCoins.includes(base);
    }
    return true;
  });
  const maxBidTotal = bids.length ? Math.max(...bids.map(b => b.total), 1) : 1;
  const maxAskTotal = asks.length ? Math.max(...asks.map(a => a.total), 1) : 1;

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" }}>
      
      {/* Dynamic Animated Space Background */}
      <SpaceBackground />

      {/* ─── HEADER ─── */}
      <header style={{
        background: "rgba(10, 17, 40, 0.75)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid var(--border)",
        height: 56,
        display: "flex",
        alignItems: "center",
        padding: "0 16px",
        gap: 16,
        flexShrink: 0,
        zIndex: 100
      }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
          <CloudExchangeLogo size={24} />
          <span style={{ fontSize: 16, fontWeight: 800, color: "var(--text-primary)" }}>
            Cloud<span style={{ color: "var(--yellow)" }}>Exchange</span>
          </span>
        </Link>
        <div style={{ width: 1, height: 24, background: "var(--border)" }} />
        
        {/* Active Trading Pair info */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 16, fontWeight: 800, color: "var(--text-primary)" }}>
            {activePair.symbol}{tradingMode === "FUTURES" && "-PERP"}
          </span>
          <span style={{
            fontSize: 10,
            background: "var(--bg-hover)",
            color: tradingMode === "SPOT" ? "var(--cyan)" : "var(--yellow)",
            padding: "2px 6px",
            borderRadius: 4,
            fontWeight: 700
          }}>
            {tradingMode === "SPOT" ? "SPOT" : `${leverage}x FUTURES`}
          </span>
          {tradingMode === "FUTURES" && (
            <>
              <div style={{ borderLeft: "1px solid var(--border-light)", paddingLeft: 8, display: "flex", flexDirection: "column" }}>
                <span style={{ color: "var(--text-secondary)", fontSize: 8 }}>Funding / Countdown</span>
                <span style={{ color: "var(--green)", fontWeight: 700, fontSize: 10 }}>+0.0150% / 07:44:12</span>
              </div>
            </>
          )}
          {isHalted && (
            <span style={{
              fontSize: 10,
              background: "var(--red-dim)",
              color: "var(--red)",
              border: "1px solid var(--red)",
              padding: "2px 6px",
              borderRadius: 4,
              fontWeight: 800,
              animation: "pulse 1.5s infinite"
            }}>HALTED</span>
          )}
        </div>

        {/* Real-time stats strip — hidden on small mobile */}
        <div style={{ display: "flex", gap: 24, flex: 1, fontSize: 12, marginLeft: 8, overflow: "hidden" }} className="hide-on-mobile">
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: price >= activePair.price ? "var(--green)" : "var(--red)" }}>
              ${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div style={{ color: "var(--text-secondary)", fontSize: 10 }}>≈ ${price.toLocaleString()}</div>
          </div>
          {[
            { label: "24h Change", value: `${activePair.change >= 0 ? "+" : ""}${activePair.change}%`, color: activePair.change >= 0 ? "var(--green)" : "var(--red)" },
            { label: "24h Vol", value: activePair.vol, color: "var(--text-primary)" },
            { label: "Collateral Limit", value: `$${walletBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, color: "var(--yellow)" }
          ].map(s => (
            <div key={s.label} style={{ borderLeft: "1px solid var(--border-light)", paddingLeft: 12 }}>
              <div style={{ color: "var(--text-secondary)", fontSize: 9 }}>{s.label}</div>
              <div style={{ color: s.color, fontWeight: 700, fontSize: 11, marginTop: 2 }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Navigation / User control flow — hidden on mobile, shown via drawer */}
        <div style={{ display: "flex", gap: 8, alignItems: "center" }} className="hide-on-mobile">
          <Link href="/coins" style={{ fontSize: 12, padding: "5px 10px", color: "var(--text-secondary)", textDecoration: "none" }} className="btn-ghost">Coins</Link>
          <Link href="/p2p" style={{ fontSize: 12, padding: "5px 10px", color: "var(--text-secondary)", textDecoration: "none" }} className="btn-ghost">P2P Escrow</Link>
          <Link href="/kyc" style={{ fontSize: 12, padding: "5px 10px", color: "var(--text-secondary)", textDecoration: "none" }} className="btn-ghost">KYC &amp; Wallet</Link>
          <Link href="/ledger" style={{ fontSize: 12, padding: "5px 10px", color: "var(--text-secondary)", textDecoration: "none" }} className="btn-ghost">Ledger Audit</Link>
          
          {isLoggedIn ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(255,255,255,0.03)", padding: "4px 10px", borderRadius: 6, border: "1px solid var(--border)" }}>
              <span style={{ fontSize: 12, color: "var(--text-primary)" }}>{userEmail}</span>
              <button onClick={handleLogout} style={{ background: "none", border: "none", color: "var(--red)", cursor: "pointer", display: "flex", alignItems: "center" }} title="Log Out">
                <LogOut size={14} />
              </button>
            </div>
          ) : (
            <>
              <Link href="/login" style={{ border: "1px solid var(--border)", color: "var(--text-primary)", fontWeight: 600, fontSize: 12, padding: "6px 14px", borderRadius: 6, textDecoration: "none" }}>Log In</Link>
              <Link href="/register" style={{ background: "var(--yellow)", color: "#000", fontWeight: 700, fontSize: 12, padding: "6px 14px", borderRadius: 6, textDecoration: "none" }}>Sign Up</Link>
            </>
          )}
        </div>

        {/* Mobile Hamburger Button */}
        <button
          className={`mobile-menu-btn ${mobileNavOpen ? "open" : ""}`}
          onClick={() => setMobileNavOpen(o => !o)}
          aria-label="Toggle navigation menu"
        >
          <span /><span /><span />
        </button>
      </header>

      {/* Mobile Nav Drawer */}
      {mobileNavOpen && (
        <div className="mobile-nav-drawer open" style={{ zIndex: 9999 }}>
          <button className="mobile-nav-close" onClick={() => setMobileNavOpen(false)}>✕</button>
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 12, color: "var(--text-secondary)", padding: "0 4px 8px", fontWeight: 700, letterSpacing: "0.08em" }}>NAVIGATION</div>
          </div>
          <Link href="/" onClick={() => setMobileNavOpen(false)}>🏠 Home</Link>
          <Link href="/trade" onClick={() => setMobileNavOpen(false)}>📊 Trade</Link>
          <Link href="/coins" onClick={() => setMobileNavOpen(false)}>🪙 Coins</Link>
          <Link href="/p2p" onClick={() => setMobileNavOpen(false)}>🔄 P2P Escrow</Link>
          <Link href="/kyc" onClick={() => setMobileNavOpen(false)}>🛡️ KYC &amp; Wallet</Link>
          <Link href="/ledger" onClick={() => setMobileNavOpen(false)}>📋 Ledger Audit</Link>
          <div className="nav-divider" />
          {isLoggedIn ? (
            <>
              <div style={{ padding: "10px 16px", fontSize: 13, color: "var(--text-secondary)", background: "rgba(255,255,255,0.02)", borderRadius: 10, border: "1px solid var(--border)" }}>
                👤 {userEmail}
              </div>
              <button onClick={() => { handleLogout(); setMobileNavOpen(false); }} style={{ color: "var(--red)", border: "1px solid rgba(255,23,68,0.3)", background: "rgba(255,23,68,0.06)" }}>
                🚪 Log Out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" onClick={() => setMobileNavOpen(false)} style={{ border: "1px solid var(--border)", fontWeight: 700 }}>🔑 Log In</Link>
              <Link href="/register" onClick={() => setMobileNavOpen(false)} style={{ background: "var(--yellow)", color: "#000", fontWeight: 800, border: "none" }}>⚡ Sign Up Free</Link>
            </>
          )}
        </div>
      )}

      {/* Alert toast notification */}
      {alertText && (
        <div style={{
          position: "absolute",
          top: 70,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 1000,
          background: "var(--bg-secondary)",
          border: "1px solid var(--cyan)",
          boxShadow: "0 0 15px rgba(0, 229, 255, 0.25)",
          color: "var(--text-primary)",
          padding: "12px 24px",
          borderRadius: 8,
          fontSize: 13,
          fontWeight: 600,
          display: "flex",
          alignItems: "center",
          gap: 10
        }}>
          <span style={{ color: "var(--cyan)" }}>⚡ STATE UPDATE:</span>
          <span>{alertText}</span>
        </div>
      )}

      {/* ─── MAIN TRADING MODULES ─── */}
      <div style={{ flex: 1, display: "grid", gridTemplateColumns: "260px 1fr 280px", overflow: "hidden", zIndex: 10 }}>
        
        {/* LEFT PANEL: Order Book */}
        <div style={{ background: "rgba(10, 17, 40, 0.45)", backdropFilter: "blur(12px)", borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ padding: "12px 16px 8px", borderBottom: "1px solid var(--border-light)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>Order Book</span>
            <span style={{ fontSize: 10, color: "var(--cyan)", background: "var(--cyan-dim)", padding: "1px 6px", borderRadius: 3, fontWeight: 700 }}>REAL-TIME</span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", padding: "6px 16px", borderBottom: "1px solid var(--border-light)" }}>
            <span style={{ fontSize: 9, color: "var(--text-secondary)" }}>Price(USDT)</span>
            <span style={{ fontSize: 9, color: "var(--text-secondary)", textAlign: "center" }}>Size(BTC)</span>
            <span style={{ fontSize: 9, color: "var(--text-secondary)", textAlign: "right" }}>Total</span>
          </div>

          {/* ASKS (sells, ordered high to low, showing top list descending) */}
          <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column-reverse" }}>
            {asks.slice(0, 10).map((a, i) => (
              <div key={i} className="ob-row" style={{ height: 20 }}>
                <div className="ob-bar-ask" style={{ width: `${(a.total / maxAskTotal) * 100}%` }} />
                <span style={{ color: "var(--red)", fontWeight: 700 }}>{a.price.toFixed(2)}</span>
                <span style={{ color: "var(--text-primary)", textAlign: "center" }}>{a.size.toFixed(3)}</span>
                <span style={{ color: "var(--text-secondary)", textAlign: "right" }}>{a.total.toFixed(3)}</span>
              </div>
            ))}
          </div>

          {/* Spread bar */}
          <div style={{ padding: "8px 16px", background: "rgba(0,0,0,0.15)", borderTop: "1px solid var(--border-light)", borderBottom: "1px solid var(--border-light)", textAlign: "center" }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: "var(--green)" }}>
              ${price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <div style={{ fontSize: 9, color: "var(--text-muted)", marginTop: 2 }}>
              MARKET SPREAD LOGS VERIFIED
            </div>
          </div>

          {/* BIDS (buys) */}
          <div style={{ flex: 1, overflow: "hidden" }}>
            {bids.slice(0, 10).map((b, i) => (
              <div key={i} className="ob-row" style={{ height: 20 }}>
                <div className="ob-bar-bid" style={{ width: `${(b.total / maxBidTotal) * 100}%` }} />
                <span style={{ color: "var(--green)", fontWeight: 700 }}>{b.price.toFixed(2)}</span>
                <span style={{ color: "var(--text-primary)", textAlign: "center" }}>{b.size.toFixed(3)}</span>
                <span style={{ color: "var(--text-secondary)", textAlign: "right" }}>{b.total.toFixed(3)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CENTER PANEL: Chart + Order Input */}
        <div style={{ display: "flex", flexDirection: "column", overflow: "hidden", borderRight: "1px solid var(--border)" }}>
          
          {/* Chart Header Options */}
          <div style={{ background: "rgba(6, 11, 30, 0.85)", backdropFilter: "blur(16px)", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px", height: 44, flexShrink: 0 }}>
            {/* Timeframe selectors */}
            <div style={{ display: "flex", gap: 2, alignItems: "center" }}>
              {["1m", "5m", "15m", "1H", "4H", "1D"].map(t => (
                <button
                  key={t}
                  onClick={() => setTimeframe(t)}
                  style={{
                    background: timeframe === t ? "rgba(234,179,8,0.12)" : "none",
                    border: timeframe === t ? "1px solid rgba(234,179,8,0.35)" : "1px solid transparent",
                    color: timeframe === t ? "#eab308" : "rgba(255,255,255,0.4)",
                    fontWeight: timeframe === t ? 700 : 400,
                    fontSize: 11,
                    cursor: "pointer",
                    padding: "4px 10px",
                    borderRadius: 5,
                    transition: "all 0.15s",
                    letterSpacing: "0.03em"
                  }}
                >
                  {t}
                </button>
              ))}

              {/* Vertical separator */}
              <div style={{ width: 1, height: 18, background: "rgba(255,255,255,0.08)", margin: "0 8px" }} />

              {/* Chart type toggle: Candles / Line */}
              {(["Candles", "Line"] as const).map(ct => (
                <button
                  key={ct}
                  onClick={() => setChartType(ct)}
                  style={{
                    background: chartType === ct ? "rgba(0,229,255,0.08)" : "none",
                    border: chartType === ct ? "1px solid rgba(0,229,255,0.3)" : "1px solid transparent",
                    color: chartType === ct ? "#00e5ff" : "rgba(255,255,255,0.35)",
                    fontWeight: chartType === ct ? 700 : 400,
                    fontSize: 10,
                    cursor: "pointer",
                    padding: "3px 9px",
                    borderRadius: 5,
                    transition: "all 0.15s"
                  }}
                >
                  {ct}
                </button>
              ))}
            </div>

            {/* Right side: MA indicator pills + live badge */}
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <span style={{ width: 22, height: 2, background: "#eab308", display: "inline-block", borderRadius: 2 }} />
                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.45)", fontFamily: "monospace" }}>MA7</span>
              </div>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <span style={{ width: 22, height: 2, background: "#c084fc", display: "inline-block", borderRadius: 2 }} />
                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.45)", fontFamily: "monospace" }}>MA25</span>
              </div>
              <div style={{ width: 1, height: 14, background: "rgba(255,255,255,0.08)", margin: "0 4px" }} />
              <span style={{ fontSize: 9, color: "#00e5ff", background: "rgba(0,229,255,0.08)", border: "1px solid rgba(0,229,255,0.25)", padding: "2px 7px", borderRadius: 4, fontWeight: 700, letterSpacing: "0.05em" }}>LIVE</span>
            </div>
          </div>

          {/* Interactive Chart Workspace — full-bleed, no padding */}
          <div style={{ flex: 1, background: "#040810", position: "relative", overflow: "hidden" }}>
            <canvas
              ref={canvas2dRef}
              style={{ width: "100%", height: "100%", display: "block", cursor: isDraggingRef.current ? "grabbing" : "crosshair" }}
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              onMouseLeave={handleCanvasMouseLeave}
            />
          </div>

          {/* Order Forms Panel */}
          <div style={{ background: "rgba(10, 17, 40, 0.75)", backdropFilter: "blur(12px)", borderTop: "1px solid var(--border)", padding: "16px 20px", flexShrink: 0 }}>
            {/* Spot / Futures Toggle */}
            <div style={{ display: "flex", background: "rgba(0,0,0,0.25)", borderRadius: 8, padding: 3, marginBottom: 12 }}>
              <button
                type="button"
                onClick={() => setTradingMode("SPOT")}
                style={{
                  flex: 1,
                  padding: "6px",
                  borderRadius: 6,
                  border: "none",
                  background: tradingMode === "SPOT" ? "rgba(255,255,255,0.06)" : "none",
                  color: tradingMode === "SPOT" ? "var(--yellow)" : "var(--text-secondary)",
                  fontWeight: 800,
                  fontSize: 11,
                  cursor: "pointer"
                }}
              >
                Spot Trading
              </button>
              <button
                type="button"
                onClick={() => setTradingMode("FUTURES")}
                style={{
                  flex: 1,
                  padding: "6px",
                  borderRadius: 6,
                  border: "none",
                  background: tradingMode === "FUTURES" ? "rgba(255,255,255,0.06)" : "none",
                  color: tradingMode === "FUTURES" ? "var(--yellow)" : "var(--text-secondary)",
                  fontWeight: 800,
                  fontSize: 11,
                  cursor: "pointer"
                }}
              >
                Futures & Options (F&O)
              </button>
            </div>

            {/* Bid/Ask Toggle buttons */}
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              <button type="button" onClick={() => setSide("Buy")} style={{ flex: 1, padding: "8px", borderRadius: 8, border: "none", background: side === "Buy" ? "var(--green)" : "rgba(255,255,255,0.02)", color: side === "Buy" ? "#040814" : "var(--text-secondary)", fontWeight: 800, cursor: "pointer", transition: "all 0.2s" }}>
                {tradingMode === "SPOT" ? "Buy Asset" : "Open Long"}
              </button>
              <button type="button" onClick={() => setSide("Sell")} style={{ flex: 1, padding: "8px", borderRadius: 8, border: "none", background: side === "Sell" ? "var(--red)" : "rgba(255,255,255,0.02)", color: side === "Sell" ? "#FFFFFF" : "var(--text-secondary)", fontWeight: 800, cursor: "pointer", transition: "all 0.2s" }}>
                {tradingMode === "SPOT" ? "Sell Asset" : "Open Short"}
              </button>
            </div>

            {/* Margin and Leverage Panel (Only visible in Futures mode) */}
            {tradingMode === "FUTURES" && (
              <div style={{ display: "flex", gap: 16, marginBottom: 12, background: "rgba(0,0,0,0.15)", padding: "10px 14px", borderRadius: 8, border: "1px solid var(--border-light)", alignItems: "center" }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 9, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>MARGIN MODE</label>
                  <select
                    value={marginMode}
                    onChange={e => setMarginMode(e.target.value as any)}
                    className="bn-select"
                    style={{ height: 28, padding: "2px 6px", fontSize: 11, width: "100%", background: "rgba(0,0,0,0.3)", color: "#fff", border: "1px solid var(--border)", borderRadius: 4 }}
                  >
                    <option value="Cross">Cross Margin</option>
                    <option value="Isolated">Isolated Margin</option>
                  </select>
                </div>
                <div style={{ flex: 2 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <label style={{ fontSize: 9, color: "var(--text-secondary)" }}>LEVERAGE LIMIT</label>
                    <strong style={{ fontSize: 11, color: "var(--cyan)" }}>{leverage}x</strong>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input
                      type="range"
                      min="1"
                      max="200"
                      value={leverage}
                      onChange={e => setLeverage(parseInt(e.target.value))}
                      style={{ flex: 1, accentColor: "var(--cyan)", height: 4, cursor: "pointer" }}
                    />
                    <select
                      value={leverage}
                      onChange={e => setLeverage(parseInt(e.target.value))}
                      className="bn-select"
                      style={{ height: 24, padding: "0 4px", fontSize: 10, background: "rgba(0,0,0,0.3)", color: "#fff", border: "1px solid var(--border)", borderRadius: 4 }}
                    >
                      <option value="1">1x</option>
                      <option value="10">10x</option>
                      <option value="20">20x</option>
                      <option value="50">50x</option>
                      <option value="100">100x</option>
                      <option value="200">200x</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Type tabs */}
            <div style={{ display: "flex", gap: 16, borderBottom: "1px solid var(--border-light)", marginBottom: 12, paddingBottom: 6 }}>
              {(["Limit", "Market", "Stop-Limit"] as const).map(t => (
                <button key={t} type="button" onClick={() => setOrderTab(t)} style={{ background: "none", border: "none", color: orderTab === t ? "var(--yellow)" : "var(--text-muted)", fontSize: 12, fontWeight: 700, paddingBottom: 4, borderBottom: orderTab === t ? "2px solid var(--yellow)" : "none", cursor: "pointer" }}>
                  {t} Order
                </button>
              ))}
            </div>

            {/* Form Inputs Grid */}
            <form onSubmit={handlePlaceOrder} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, alignItems: "flex-end" }}>
                {orderTab === "Stop-Limit" && (
                  <div>
                    <label style={{ fontSize: 10, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>Stop Price</label>
                    <div style={{ position: "relative" }}>
                      <input className="bn-input bn-input-sm" value={stopPrice} onChange={e => setStopPrice(e.target.value)} placeholder="0.00" disabled={isHalted} required />
                      <span style={{ position: "absolute", right: 8, top: 10, fontSize: 9, color: "var(--text-muted)" }}>USDT</span>
                    </div>
                  </div>
                )}
                {orderTab !== "Market" ? (
                  <div>
                    <label style={{ fontSize: 10, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>Order Price</label>
                    <div style={{ position: "relative" }}>
                      <input className="bn-input bn-input-sm" value={orderPrice} onChange={e => setOrderPrice(e.target.value)} placeholder="0.00" disabled={isHalted} required />
                      <span style={{ position: "absolute", right: 8, top: 10, fontSize: 9, color: "var(--text-muted)" }}>USDT</span>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label style={{ fontSize: 10, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>Order Price</label>
                    <input className="bn-input bn-input-sm" value="MARKET PRICE" disabled style={{ opacity: 0.6, color: "var(--cyan)", fontWeight: "bold" }} />
                  </div>
                )}

                <div>
                  <label style={{ fontSize: 10, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>Quantity</label>
                  <div style={{ position: "relative" }}>
                    <input className="bn-input bn-input-sm" value={orderQty} onChange={e => setOrderQty(e.target.value)} placeholder="0.000" disabled={isHalted} required />
                    <span style={{ position: "absolute", right: 8, top: 10, fontSize: 9, color: "var(--text-muted)" }}>{activePair.symbol.split("/")[0]}</span>
                  </div>
                </div>
              </div>

              {/* Position details */}
              <div style={{ padding: "8px 12px", background: "rgba(0,0,0,0.15)", borderRadius: 6, display: "flex", flexDirection: "column", gap: 6, border: "1px solid var(--border-light)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                  <span style={{ color: "var(--text-secondary)" }}>Est. Position Value:</span>
                  <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                    ${((parseFloat(orderQty || "0") || 0) * (orderTab === "Market" ? price : parseFloat(orderPrice || "0") || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT
                  </span>
                </div>
                {tradingMode === "FUTURES" && (
                  <>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                      <span style={{ color: "var(--text-secondary)" }}>Margin Required ({leverage}x):</span>
                      <span style={{ fontWeight: 700, color: "var(--cyan)" }}>
                        ${(((parseFloat(orderQty || "0") || 0) * (orderTab === "Market" ? price : parseFloat(orderPrice || "0") || 0)) / leverage).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT
                      </span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                      <span style={{ color: "var(--text-secondary)" }}>Est. Liquidation Price:</span>
                      <span style={{ fontWeight: 700, color: "var(--red)" }}>
                        ${(side === "Buy"
                          ? (orderTab === "Market" ? price : parseFloat(orderPrice || "0") || 0) * (1 - 1/leverage)
                          : (orderTab === "Market" ? price : parseFloat(orderPrice || "0") || 0) * (1 + 1/leverage)
                        ).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT
                      </span>
                    </div>
                  </>
                )}
              </div>

              <div>
                <button type="submit" disabled={isHalted} className={isHalted ? "btn-gray" : (side === "Buy" ? "btn-green" : "btn-red")} style={{ width: "100%", height: 38, fontSize: 13, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, opacity: isHalted ? 0.5 : 1 }}>
                  {isHalted ? "Trading Suspended" : `${tradingMode === "SPOT" ? (side === "Buy" ? "Buy" : "Sell") : (side === "Buy" ? "Open Long" : "Open Short")} Order`}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* RIGHT PANEL: Pair List + Trade History */}
        <div style={{ background: "rgba(10, 17, 40, 0.45)", backdropFilter: "blur(12px)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {/* Pair Search Filter */}
          <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border-light)", flexShrink: 0 }}>
            <div style={{ position: "relative", marginBottom: 10 }}>
              <Search size={14} style={{ position: "absolute", left: 10, top: 11, color: "var(--text-secondary)" }} />
              <input className="bn-input bn-input-sm" placeholder="Search markets..." value={pairSearch} onChange={e => setPairSearch(e.target.value)} style={{ paddingLeft: 30 }} />
            </div>
            <div style={{ display: "flex", borderBottom: "1px solid var(--border-light)" }}>
              {["ALL", "L1", "DeFi", "Memes"].map(tab => (
                <button key={tab} onClick={() => setPairTab(tab)} style={{
                  flex: 1,
                  padding: "6px 0",
                  background: "none",
                  border: "none",
                  borderBottom: pairTab === tab ? "2px solid var(--yellow)" : "none",
                  color: pairTab === tab ? "var(--yellow)" : "var(--text-secondary)",
                  fontSize: 10,
                  fontWeight: 700,
                  cursor: "pointer"
                }}>{tab}</button>
              ))}
            </div>
          </div>

          {/* List of markets */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            {filteredPairs.map(p => {
              const isActive = activePair.symbol === p.symbol;
              const baseSymbol = p.symbol.split("/")[0];
              // Get color hash for avatar
              let hash = 0;
              for (let i = 0; i < baseSymbol.length; i++) hash = baseSymbol.charCodeAt(i) + ((hash << 5) - hash);
              const avatarColor = `hsl(${Math.abs(hash) % 360}, 65%, 45%)`;

              return (
                <div key={p.symbol} onClick={() => setActivePair(p)} className="pair-row" style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 12px",
                  cursor: "pointer",
                  background: isActive ? "rgba(255, 193, 7, 0.08)" : "transparent",
                  borderLeft: isActive ? "3px solid var(--yellow)" : "3px solid transparent",
                  borderBottom: "1px solid rgba(255,255,255,0.03)",
                  transition: "all 0.2s ease"
                }}>
                  <div style={{
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    background: avatarColor,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 10,
                    fontWeight: 800,
                    color: "#fff",
                    boxShadow: "0 0 8px rgba(0,0,0,0.3)"
                  }}>
                    {baseSymbol.slice(0, 2)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {baseSymbol}
                      </span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-primary)" }}>
                        ${p.price < 0.1 ? p.price.toFixed(6) : p.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 2 }}>
                      <span style={{ fontSize: 9, color: "var(--text-muted)" }}>Vol: {p.vol}</span>
                      <span style={{
                        fontSize: 10,
                        color: p.change >= 0 ? "var(--green)" : "var(--red)",
                        fontWeight: 700
                      }}>
                        {p.change >= 0 ? "▲" : "▼"} {Math.abs(p.change)}%
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Recent Market Trades feed */}
          <div style={{ height: 220, borderTop: "1px solid var(--border)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ padding: "8px 16px", fontSize: 11, fontWeight: 700, borderBottom: "1px solid var(--border-light)" }}>Market Trades</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", padding: "4px 16px", borderBottom: "1px solid var(--border-light)", fontSize: 9, color: "var(--text-muted)" }}>
              <span>Price(USDT)</span>
              <span style={{ textAlign: "center" }}>Qty</span>
              <span style={{ textAlign: "right" }}>Time</span>
            </div>
            <div style={{ flex: 1, overflowY: "auto" }}>
              {trades.map((t, idx) => (
                <div key={idx} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", padding: "3px 16px", fontSize: 10 }}>
                  <span style={{ color: t.side === "BUY" ? "var(--green)" : "var(--red)", fontWeight: 600 }}>{t.price.toFixed(2)}</span>
                  <span style={{ color: "var(--text-primary)", textAlign: "center" }}>{t.size.toFixed(4)}</span>
                  <span style={{ color: "var(--text-muted)", textAlign: "right" }}>{t.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ─── BOTTOM PANEL: Active orders dashboard ─── */}
      <div style={{
        background: "rgba(10, 17, 40, 0.75)",
        backdropFilter: "blur(12px)",
        borderTop: "1px solid var(--border)",
        height: 220,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        zIndex: 100
      }}>
        
        {/* Tabs for Order Dashboard */}
        <div style={{ display: "flex", borderBottom: "1px solid var(--border-light)", padding: "0 16px" }}>
          {["Open Orders", "Order History", "Wallet Funds", "API Credentials", "Security Logs"].map(tab => (
            <button key={tab} onClick={() => setPosTab(tab)} style={{
              background: "none",
              border: "none",
              padding: "12px 16px",
              color: posTab === tab ? "var(--text-primary)" : "var(--text-muted)",
              fontSize: 12,
              fontWeight: 700,
              borderBottom: posTab === tab ? "2px solid var(--yellow)" : "none",
              cursor: "pointer"
            }}>
              {tab} {
                tab === "Open Orders" ? `(${openOrders.length})` :
                tab === "Order History" ? `(${orderHistory.length})` :
                tab === "API Credentials" ? `(${apiKeys.length})` : ""
              }
            </button>
          ))}
        </div>

        {/* Content of selected tab */}
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px" }}>
          {!isLoggedIn ? (
            <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Secure account state: disconnected.</span>
              <Link href="/login" style={{ color: "var(--yellow)", fontWeight: 700, fontSize: 12, textDecoration: "underline" }}>Log In to see active session telemetry</Link>
            </div>
          ) : (
            <>
              {posTab === "Open Orders" && (
                openOrders.length === 0 ? (
                  <div style={{ color: "var(--text-muted)", textAlign: "center", padding: 24, fontSize: 13 }}>No active limit orders pending fill.</div>
                ) : (
                  <table style={{ width: "100%", fontSize: 12, textAlign: "left", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ color: "var(--text-secondary)", borderBottom: "1px solid var(--border-light)" }}>
                        <th style={{ padding: "6px 8px" }}>Time</th>
                        <th>ID</th>
                        <th>Market</th>
                        <th>Type</th>
                        <th>Side</th>
                        <th>Price</th>
                        <th>Amount</th>
                        <th>Filled</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {openOrders.map(o => (
                        <tr key={o.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.01)" }}>
                          <td style={{ padding: "8px 8px", color: "var(--text-secondary)" }}>{o.time}</td>
                          <td style={{ fontWeight: 600, color: "var(--cyan)" }}>{o.id}</td>
                          <td>{o.pair}</td>
                          <td>{o.type}</td>
                          <td style={{ color: o.side === "Buy" ? "var(--green)" : "var(--red)", fontWeight: 700 }}>{o.side}</td>
                          <td>${o.price.toLocaleString()}</td>
                          <td>{o.amount}</td>
                          <td>{o.filled}</td>
                          <td>
                            <button onClick={() => handleCancelOrder(o.id)} style={{
                              background: "var(--red-dim)",
                              border: "1px solid var(--red)",
                              color: "var(--red)",
                              padding: "2px 8px",
                              borderRadius: 4,
                              cursor: "pointer",
                              fontSize: 10,
                              fontWeight: 700
                            }}>Cancel</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
              )}

              {posTab === "Order History" && (
                orderHistory.length === 0 ? (
                  <div style={{ color: "var(--text-muted)", textAlign: "center", padding: 24, fontSize: 13 }}>No historical executions in this session.</div>
                ) : (
                  <table style={{ width: "100%", fontSize: 12, textAlign: "left", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ color: "var(--text-secondary)", borderBottom: "1px solid var(--border-light)" }}>
                        <th style={{ padding: "6px 8px" }}>Time</th>
                        <th>ID</th>
                        <th>Market</th>
                        <th>Type</th>
                        <th>Side</th>
                        <th>Price</th>
                        <th>Amount</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orderHistory.map(o => (
                        <tr key={o.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.01)" }}>
                          <td style={{ padding: "8px 8px", color: "var(--text-secondary)" }}>{o.time}</td>
                          <td style={{ fontWeight: 600 }}>{o.id}</td>
                          <td>{o.pair}</td>
                          <td>{o.type}</td>
                          <td style={{ color: o.side === "Buy" ? "var(--green)" : "var(--red)", fontWeight: 700 }}>{o.side}</td>
                          <td>${o.price.toLocaleString()}</td>
                          <td>{o.amount}</td>
                          <td style={{ color: "var(--green)", fontWeight: 700 }}>{o.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
              )}

              {posTab === "Wallet Funds" && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, padding: "8px 16px" }}>
                  <div style={{ background: "rgba(0,0,0,0.15)", padding: 12, borderRadius: 8, border: "1px solid var(--border-light)" }}>
                    <div style={{ fontSize: 10, color: "var(--text-secondary)" }}>COLLATERAL BALANCE</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: "var(--yellow)", marginTop: 4 }}>
                      ${walletBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })} USDT
                    </div>
                  </div>
                  <div style={{ background: "rgba(0,0,0,0.15)", padding: 12, borderRadius: 8, border: "1px solid var(--border-light)" }}>
                    <div style={{ fontSize: 10, color: "var(--text-secondary)" }}>ESTIMATED ASSETS (BTC)</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: "var(--cyan)", marginTop: 4 }}>
                      0.0450 BTC
                    </div>
                  </div>
                  <div style={{ background: "rgba(0,0,0,0.15)", padding: 12, borderRadius: 8, border: "1px solid var(--border-light)" }}>
                    <div style={{ fontSize: 10, color: "var(--text-secondary)" }}>VIP LEVEL</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: "var(--green)", marginTop: 4, display: "flex", alignItems: "center", gap: 6 }}>
                      T1 VIP <ArrowUpRight size={14} />
                    </div>
                  </div>
                </div>
              )}

              {posTab === "API Credentials" && (
                <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 20 }}>
                  {/* Left: Generator Panel */}
                  <div style={{ background: "rgba(0,0,0,0.2)", padding: 16, borderRadius: 8, border: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 800, color: "var(--yellow)" }}>
                      <Key size={16} /> Generate API Key Pair
                    </div>
                    <p style={{ fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.4 }}>Select target scopes below to create programmatic trading telemetry credentials.</p>
                    
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      {[
                        { label: "Read", state: scopeRead, set: setScopeRead },
                        { label: "Trade", state: scopeTrade, set: setScopeTrade },
                        { label: "P2P", state: scopeP2p, set: setScopeP2p },
                        { label: "Withdraw", state: scopeWithdraw, set: setScopeWithdraw },
                      ].map(sc => (
                        <label key={sc.label} style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 11, color: "var(--text-primary)", cursor: "pointer" }}>
                          <input type="checkbox" checked={sc.state} onChange={e => sc.set(e.target.checked)} style={{ accentColor: "var(--yellow)" }} />
                          {sc.label}
                        </label>
                      ))}
                    </div>

                    <button onClick={handleGenerateApiKey} className="btn-yellow" style={{ padding: "8px 0", fontSize: 12, fontWeight: 700 }}>
                      Generate API Key
                    </button>
                  </div>

                  {/* Right: Key List */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 130, overflowY: "auto" }}>
                    {apiKeys.length === 0 ? (
                      <div style={{ color: "var(--text-muted)", fontSize: 11, textAlign: "center", padding: 20 }}>No active API keys found. Generate a key pair to get started.</div>
                    ) : (
                      <table style={{ width: "100%", fontSize: 11, textAlign: "left", borderCollapse: "collapse" }}>
                        <thead>
                          <tr style={{ color: "var(--text-secondary)", borderBottom: "1px solid var(--border-light)" }}>
                            <th style={{ padding: "4px 8px" }}>API Key ID</th>
                            <th>Secret Key</th>
                            <th>Permissions</th>
                            <th>Created At</th>
                            <th style={{ textAlign: "right" }}>Revoke</th>
                          </tr>
                        </thead>
                        <tbody>
                          {apiKeys.map(k => (
                            <tr key={k.key} style={{ borderBottom: "1px solid rgba(255,255,255,0.01)" }}>
                              <td style={{ padding: "6px 8px", fontFamily: "monospace", color: "var(--cyan)", fontWeight: 700 }}>{k.key}</td>
                              <td>
                                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                  <span style={{ fontFamily: "monospace" }}>
                                    {revealSecrets[k.key] ? k.secret : "••••••••••••••••••••"}
                                  </span>
                                  <button onClick={() => toggleSecretReveal(k.key)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", display: "flex", alignItems: "center" }}>
                                    {revealSecrets[k.key] ? <EyeOff size={12} /> : <Eye size={12} />}
                                  </button>
                                </div>
                              </td>
                              <td style={{ color: "var(--yellow)", fontWeight: 700 }}>{k.scopes.join(", ")}</td>
                              <td style={{ color: "var(--text-secondary)" }}>{k.createdAt}</td>
                              <td style={{ textAlign: "right" }}>
                                <button onClick={() => handleRevokeApiKey(k.key)} style={{ background: "none", border: "none", color: "var(--red)", cursor: "pointer" }}>
                                  <Trash size={13} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              )}

              {posTab === "Security Logs" && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: 20 }}>
                  {/* Left: Fingerprint Header & Hash */}
                  <div style={{ background: "rgba(0,0,0,0.2)", padding: 16, borderRadius: 8, border: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 800, color: "var(--cyan)" }}>
                      <ShieldCheck size={16} /> Device Identity Hash
                    </div>
                    <p style={{ fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.4 }}>
                      Verified browser sandbox telemetry signature calculated via hardware GPU / WebGL properties.
                    </p>
                    <div style={{ background: "#02040a", border: "1px solid var(--border)", borderRadius: 6, padding: "8px 12px", fontFamily: "monospace", fontSize: 11, color: "#39ff14", wordBreak: "break-all", textAlign: "center" }}>
                      {fingerprint ? fingerprint.hash : "Calculating..."}
                    </div>
                  </div>

                  {/* Right: Technical metrics */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 11 }}>
                    <div style={{ fontWeight: 700, color: "var(--text-primary)", borderBottom: "1px solid var(--border-light)", paddingBottom: 4, marginBottom: 4 }}>
                      TELEMETRY MATRIX METRICS:
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "130px 1fr", gap: 4 }}>
                      <span style={{ color: "var(--text-secondary)" }}>Canvas Hash:</span>
                      <span style={{ fontFamily: "monospace", color: "var(--cyan)" }}>{fingerprint ? fingerprint.canvasHash.substring(0, 32) + "..." : "Querying..."}</span>
                      
                      <span style={{ color: "var(--text-secondary)" }}>WebGL Renderer:</span>
                      <span style={{ color: "var(--text-primary)" }}>{fingerprint ? fingerprint.webglRenderer : "Querying..."}</span>

                      <span style={{ color: "var(--text-secondary)" }}>Audio Hardware Freq:</span>
                      <span style={{ color: "var(--text-primary)" }}>{fingerprint ? fingerprint.audioFrequency + " Hz" : "Querying..."}</span>

                      <span style={{ color: "var(--text-secondary)" }}>Viewport Matrix:</span>
                      <span style={{ color: "var(--text-primary)" }}>{fingerprint ? fingerprint.screenResolution : "Querying..."}</span>

                      <span style={{ color: "var(--text-secondary)" }}>User-Agent:</span>
                      <span style={{ color: "var(--text-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{fingerprint ? fingerprint.userAgent : "Querying..."}</span>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
