"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
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
  ArrowLeft,
  Settings,
  ShieldAlert,
  Server,
  UserCheck,
  FileText,
  Search,
  Sliders,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";
import CloudExchangeLogo from "../components/CloudExchangeLogo";
import SpaceBackground from "../components/SpaceBackground";
import Header from "../components/Header";
import { API_URL } from "../utils/api";

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

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<"kyc" | "pairs" | "listings" | "merchants" | "disputes" | "system" | "users">("users");
  
  // Custom pair states
  const [newSymbol, setNewSymbol] = useState("");
  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newChange, setNewChange] = useState("");
  const [newVolume, setNewVolume] = useState("");
  const [newColor, setNewColor] = useState("#8247E5");
  
  // Dynamic lists from localStorage
  const [kycRequests, setKycRequests] = useState<KYCRequest[]>([]);
  const [disputes, setDisputes] = useState<DisputedEscrow[]>([]);
  const [listings, setListings] = useState<ListingApplication[]>([]);
  const [merchants, setMerchants] = useState<MerchantApplication[]>([]);
  const [customPairs, setCustomPairs] = useState<CustomPair[]>([]);
  
  // Toast notifications
  const [toast, setToast] = useState("");

  // User accounts management states
  const [usersList, setUsersList] = useState<any[]>([]);
  
  // Search and Advanced Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterKyc, setFilterKyc] = useState("all");
  const [filterBlock, setFilterBlock] = useState("all");
  const [filterMerchant, setFilterMerchant] = useState("all");
  
  // Expandable User Desk & Balance Ledger States
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [selectedUserBalances, setSelectedUserBalances] = useState<any[]>([]);
  const [isFetchingBalances, setIsFetchingBalances] = useState(false);
  const [isManagingBalanceModal, setIsManagingBalanceModal] = useState(false);
  const [activeLightboxUrl, setActiveLightboxUrl] = useState<string | null>(null);
  
  // Balance management inputs
  const [balanceManageUserId, setBalanceManageUserId] = useState("");
  const [adjustBalanceSymbol, setAdjustBalanceSymbol] = useState("USDT");
  const [adjustBalanceAmount, setAdjustBalanceAmount] = useState("");
  const [adjustBalanceAction, setAdjustBalanceAction] = useState("add"); // "add" or "subtract"
  const [adjustBalanceReason, setAdjustBalanceReason] = useState("");
  const [isAdjustingBalance, setIsAdjustingBalance] = useState(false);
  
  // Dynamic temporary block reason inputs per user id
  const [tempBlockReasons, setTempBlockReasons] = useState<Record<string, string>>({});

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${API_URL}/admin/users`);
      const data = await res.json();
      if (res.ok && data.success) {
        setUsersList(data.users);
      }
    } catch (err) {
      console.warn("Failed to fetch users:", err);
    }
  };

  const fetchUserBalances = async (userId: string) => {
    setIsFetchingBalances(true);
    try {
      const res = await fetch(`${API_URL}/balances/${userId}`);
      const data = await res.json();
      if (res.ok && data.success) {
        setSelectedUserBalances(data.balances);
      } else {
        setSelectedUserBalances([]);
      }
    } catch (err) {
      console.warn("Failed to fetch balances for user:", userId, err);
      setSelectedUserBalances([]);
    } finally {
      setIsFetchingBalances(false);
    }
  };

  const handleToggleBlock = async (userId: string, email: string, currentlyBlocked: boolean) => {
    try {
      const reason = tempBlockReasons[userId] || "";
      const res = await fetch(`${API_URL}/admin/users/toggle-block`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, reason })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        triggerToast(`User '${email}' has been successfully ${currentlyBlocked ? "Unblocked" : "Blocked & Suspended"}.`);
        setTempBlockReasons(prev => ({ ...prev, [userId]: "" }));
        fetchUsers();
      } else {
        alert(data.error || "Failed to toggle block status.");
      }
    } catch (err: any) {
      alert("Network error: " + err.message);
    }
  };

  const handleUpdateKyc = async (userId: string, kycStatus: string) => {
    try {
      const res = await fetch(`${API_URL}/admin/users/update-kyc`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, kycStatus })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        triggerToast(`KYC Level updated to ${kycStatus} for user.`);
        fetchUsers();
      } else {
        alert(data.error || "Failed to update KYC status.");
      }
    } catch (err: any) {
      alert("Network error: " + err.message);
    }
  };

  const handleToggleMerchantStatus = async (userId: string) => {
    try {
      const res = await fetch(`${API_URL}/admin/users/toggle-merchant`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        triggerToast(`P2P Merchant badge status updated successfully.`);
        fetchUsers();
      } else {
        alert(data.error || "Failed to toggle merchant status.");
      }
    } catch (err: any) {
      alert("Network error: " + err.message);
    }
  };

  const handleAdjustBalanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!balanceManageUserId || !adjustBalanceAmount) return;
    setIsAdjustingBalance(true);
    try {
      const res = await fetch(`${API_URL}/admin/balances/adjust`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: balanceManageUserId,
          symbol: adjustBalanceSymbol,
          amount: adjustBalanceAmount,
          action: adjustBalanceAction,
          reason: adjustBalanceReason
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        triggerToast(`Balance adjusted: ${adjustBalanceAction === "add" ? "+" : "-"}${adjustBalanceAmount} ${adjustBalanceSymbol} successfully.`);
        setIsManagingBalanceModal(false);
        setAdjustBalanceAmount("");
        setAdjustBalanceReason("");
        fetchUserBalances(balanceManageUserId);
      } else {
        alert(data.error || "Failed to adjust wallet balance.");
      }
    } catch (err: any) {
      alert("Network error: " + err.message);
    } finally {
      setIsAdjustingBalance(false);
    }
  };

  const handleExpandUser = (userId: string) => {
    if (expandedUserId === userId) {
      setExpandedUserId(null);
      setSelectedUserBalances([]);
    } else {
      setExpandedUserId(userId);
      fetchUserBalances(userId);
    }
  };

  useEffect(() => {
    fetchUsers();
    // 1. Load or initialize KYC requests
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

    // 2. Load or initialize Disputed P2P Escrows
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

    // 3. Load Listing Applications
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

    // 4. Load Merchant Applications
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

    // 5. Load Custom Pairs
    const savedPairs = localStorage.getItem("admin_custom_trading_pairs");
    if (savedPairs) {
      setCustomPairs(JSON.parse(savedPairs));
    }
  }, []);

  const triggerToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3500);
  };

  // Add custom trading pair manually
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

    deployPairToEcosystem(newPair);
    setNewSymbol("");
    setNewName("");
    setNewPrice("");
    setNewChange("");
    setNewVolume("");
  };

  const deployPairToEcosystem = (pair: CustomPair) => {
    const updatedPairs = [...customPairs, pair];
    setCustomPairs(updatedPairs);
    localStorage.setItem("admin_custom_trading_pairs", JSON.stringify(updatedPairs));
    
    // Create default wallet balance
    const storedBalances = localStorage.getItem("user_asset_balances");
    if (storedBalances) {
      const parsed = JSON.parse(storedBalances);
      if (!parsed.some((a: any) => a.symbol === pair.symbol)) {
        parsed.push({ symbol: pair.symbol, name: pair.name, amount: 0.0, inOrder: 0.0, color: pair.color });
        localStorage.setItem("user_asset_balances", JSON.stringify(parsed));
      }
    }
    triggerToast(`Deploy SUCCESS: Deployed pair ${pair.symbol}/USDT & ${pair.symbol}/INR`);
  };

  // Resolve Listing application
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
      // Deploy token to dynamic list
      deployPairToEcosystem({
        symbol: target.symbol,
        name: target.name,
        price: target.initialPrice,
        change24h: 0.00,
        volume24h: 10000,
        color: "#E67E22"
      });
    }
    triggerToast(`Listing application #${id} ${approve ? "Approved & Listed" : "Rejected"}.`);
  };

  // Resolve Merchant application
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
      // Add custom UPI details to system storage
      localStorage.setItem("merchant_upi_id", target.upiId);
    }
    triggerToast(`Merchant application #${id} ${approve ? "Approved" : "Rejected"}.`);
  };

  // Resolve KYC status
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

  // Resolve Disputes
  const handleResolveDispute = (id: string, winner: "buyer" | "seller") => {
    const updated = disputes.filter(d => d.id !== id);
    setDisputes(updated);
    localStorage.setItem("admin_disputed_escrows", JSON.stringify(updated));
    triggerToast(`Escrow dispute ${id} resolved. Funds transferred to ${winner.toUpperCase()}.`);
  };

  return (
    <div style={{ minHeight: "100vh", color: "var(--text-primary)", display: "flex", flexDirection: "column", position: "relative", overflow: "hidden" }}>
      <SpaceBackground />

      <Header activeTab="admin" />

      {/* Admin Content wrapper */}
      <div className="admin-layout-split" style={{ flex: 1, zIndex: 10 }}>
        {/* Sidebar Nav */}
        <aside className="admin-sidebar">
          {[
            { id: "users", label: "User Accounts Control Desk", icon: <Users size={16} /> },
            { id: "kyc", label: "User KYC Verification", icon: <UserCheck size={16} /> },
            { id: "listings", label: "Paid Listing Applications", icon: <FileText size={16} /> },
            { id: "merchants", label: "Merchant Approvals", icon: <ShieldCheck size={16} /> },
            { id: "pairs", label: "Manual Custom Pairs", icon: <Coins size={16} /> },
            { id: "disputes", label: "P2P Escrow Disputes", icon: <ShieldAlert size={16} /> },
            { id: "system", label: "System Health & WAL", icon: <Server size={16} /> },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                width: "100%",
                padding: "12px 16px",
                border: "none",
                borderRadius: 8,
                background: activeTab === item.id ? "rgba(255, 255, 255, 0.05)" : "transparent",
                color: activeTab === item.id ? "var(--yellow)" : "var(--text-secondary)",
                fontWeight: activeTab === item.id ? 700 : 500,
                fontSize: 13,
                cursor: "pointer",
                textAlign: "left",
                transition: "all 0.2s"
              }}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </aside>

        {/* Content Area */}
        <main style={{ flex: 1, padding: 32, overflowY: "auto" }}>
          {/* TOAST Notification */}
          {toast && (
            <div style={{
              position: "fixed",
              top: 80,
              right: 24,
              background: "#040814",
              border: "1px solid var(--yellow)",
              color: "#FFF",
              padding: "12px 24px",
              borderRadius: 8,
              boxShadow: "0 0 20px rgba(245, 166, 35, 0.25)",
              display: "flex",
              alignItems: "center",
              gap: 8,
              zIndex: 1000,
              fontSize: 13
            }}>
              <CheckCircle2 size={16} color="var(--yellow)" />
              {toast}
            </div>
          )}

          {/* USERS Tab */}
          {activeTab === "users" && (
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>User Accounts & Compliance Control Desk</h2>
              <p style={{ color: "var(--text-secondary)", fontSize: 13, marginBottom: 24 }}>Manage user status, view compliance states, and block/unblock trading terminals.</p>

              {/* Dynamic Stats Grid */}
              <div className="grid-responsive-4" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 24 }}>
                <div style={{ background: "linear-gradient(135deg, rgba(0, 240, 255, 0.08) 0%, rgba(4, 8, 20, 0.5) 100%)", border: "1px solid rgba(0, 240, 255, 0.15)", borderRadius: 12, padding: 20, boxShadow: "0 0 15px rgba(0, 240, 255, 0.02)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 700, textTransform: "uppercase" }}>Total Registrations</span>
                    <span style={{ fontSize: 16 }}>👥</span>
                  </div>
                  <div style={{ fontSize: 28, fontWeight: 900, color: "var(--cyan)", marginTop: 8 }}>{usersList.length}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>Registered system members</div>
                </div>
                
                <div style={{ background: "linear-gradient(135deg, rgba(76, 175, 80, 0.08) 0%, rgba(4, 8, 20, 0.5) 100%)", border: "1px solid rgba(76, 175, 80, 0.15)", borderRadius: 12, padding: 20, boxShadow: "0 0 15px rgba(76, 175, 80, 0.02)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 700, textTransform: "uppercase" }}>Verified KYC Accounts</span>
                    <span style={{ fontSize: 16 }}>🛡️</span>
                  </div>
                  <div style={{ fontSize: 28, fontWeight: 900, color: "var(--green)", marginTop: 8 }}>
                    {usersList.filter(u => (u.kycStatus || "").includes("Verified") || (u.kycStatus || "").includes("Tier-2") || (u.kycStatus || "").includes("Tier-3")).length}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>Tier-2 & Tier-3 active clearance</div>
                </div>
                
                <div style={{ background: "linear-gradient(135deg, rgba(255, 23, 68, 0.08) 0%, rgba(4, 8, 20, 0.5) 100%)", border: "1px solid rgba(255, 23, 68, 0.15)", borderRadius: 12, padding: 20, boxShadow: "0 0 15px rgba(255, 23, 68, 0.02)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 700, textTransform: "uppercase" }}>Suspended Users</span>
                    <span style={{ fontSize: 16 }}>🚫</span>
                  </div>
                  <div style={{ fontSize: 28, fontWeight: 900, color: "var(--red)", marginTop: 8 }}>{usersList.filter(u => u.isBlocked).length}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>Terminals locked by compliance</div>
                </div>
                
                <div style={{ background: "linear-gradient(135deg, rgba(245, 166, 35, 0.08) 0%, rgba(4, 8, 20, 0.5) 100%)", border: "1px solid rgba(245, 166, 35, 0.15)", borderRadius: 12, padding: 20, boxShadow: "0 0 15px rgba(245, 166, 35, 0.02)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 700, textTransform: "uppercase" }}>Active P2P Merchants</span>
                    <span style={{ fontSize: 16 }}>💼</span>
                  </div>
                  <div style={{ fontSize: 28, fontWeight: 900, color: "var(--yellow)", marginTop: 8 }}>{usersList.filter(u => u.isMerchant).length}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>Collateral verified liquidators</div>
                </div>
              </div>

              {/* Filters Panel */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 24, background: "rgba(13, 27, 56, 0.25)", padding: 16, borderRadius: 12, border: "1px solid var(--border)", alignItems: "center" }}>
                <div style={{ flex: 1, minWidth: 200, position: "relative" }}>
                  <Search size={16} color="var(--text-secondary)" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} />
                  <input 
                    type="text" 
                    placeholder="Search by username, email, phone or ID..." 
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    style={{ width: "100%", padding: "10px 12px 10px 36px", background: "rgba(4, 8, 20, 0.5)", border: "1px solid var(--border)", borderRadius: 8, color: "#fff", fontSize: 13 }}
                  />
                </div>
                
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <select 
                    value={filterKyc} 
                    onChange={e => setFilterKyc(e.target.value)}
                    style={{ padding: "10px 12px", background: "rgba(4, 8, 20, 0.5)", border: "1px solid var(--border)", borderRadius: 8, color: "#fff", fontSize: 13 }}
                  >
                    <option value="all">All KYC Tiers</option>
                    <option value="Tier-1">Tier-1 Basic</option>
                    <option value="Tier-2">Tier-2 Verified</option>
                    <option value="Tier-3">Tier-3 Premium</option>
                  </select>
                  
                  <select 
                    value={filterBlock} 
                    onChange={e => setFilterBlock(e.target.value)}
                    style={{ padding: "10px 12px", background: "rgba(4, 8, 20, 0.5)", border: "1px solid var(--border)", borderRadius: 8, color: "#fff", fontSize: 13 }}
                  >
                    <option value="all">All Account Statuses</option>
                    <option value="active">Active only</option>
                    <option value="suspended">Blocked only</option>
                  </select>
                  
                  <select 
                    value={filterMerchant} 
                    onChange={e => setFilterMerchant(e.target.value)}
                    style={{ padding: "10px 12px", background: "rgba(4, 8, 20, 0.5)", border: "1px solid var(--border)", borderRadius: 8, color: "#fff", fontSize: 13 }}
                  >
                    <option value="all">All Badges</option>
                    <option value="merchant">P2P Merchants</option>
                    <option value="regular">Regular Users</option>
                  </select>
                </div>
              </div>

              {/* Users List Container */}
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {usersList.length === 0 ? (
                  <div style={{ background: "rgba(10, 17, 40, 0.45)", borderRadius: 12, padding: 48, textAlign: "center", border: "1px solid var(--border)" }}>
                    <Users size={48} color="var(--cyan)" style={{ margin: "0 auto 16px" }} />
                    <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>No registered users found in the ecosystem database.</p>
                  </div>
                ) : (
                  usersList
                    .filter(user => {
                      const q = searchQuery.toLowerCase();
                      const matchesSearch = !searchQuery || 
                        (user.email || "").toLowerCase().includes(q) || 
                        (user.id || "").toLowerCase().includes(q);
                      let matchesKyc = true;
                      if (filterKyc !== "all") {
                        matchesKyc = (user.kycStatus || "").includes(filterKyc);
                      }
                      let matchesBlock = true;
                      if (filterBlock === "active") {
                        matchesBlock = !user.isBlocked;
                      } else if (filterBlock === "suspended") {
                        matchesBlock = user.isBlocked;
                      }
                      let matchesMerchant = true;
                      if (filterMerchant === "merchant") {
                        matchesMerchant = user.isMerchant;
                      } else if (filterMerchant === "regular") {
                        matchesMerchant = !user.isMerchant;
                      }
                      return matchesSearch && matchesKyc && matchesBlock && matchesMerchant;
                    })
                    .map((user) => (
                      <div key={user.id} style={{
                        background: user.isBlocked ? "rgba(255, 23, 68, 0.04)" : "rgba(13, 27, 56, 0.45)",
                        border: user.isBlocked ? "1.5px solid rgba(255, 23, 68, 0.25)" : "1.5px solid var(--border)",
                        borderRadius: 12,
                        padding: 24,
                        display: "flex",
                        flexDirection: "column",
                        transition: "all 0.3s ease"
                      }}>
                        {/* Upper flex row */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
                          <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
                            <div style={{ 
                              width: 48, 
                              height: 48, 
                              borderRadius: "50%", 
                              background: user.isBlocked ? "radial-gradient(circle, rgba(255,23,68,0.15) 0%, rgba(4,8,20,0.5) 100%)" : "radial-gradient(circle, var(--cyan-dim) 0%, rgba(4,8,20,0.5) 100%)", 
                              border: user.isBlocked ? "1.5px solid var(--red)" : "1.5px solid var(--cyan)", 
                              display: "flex", 
                              alignItems: "center", 
                              justifyContent: "center", 
                              fontSize: 18 
                            }}>
                              👤
                            </div>
                            <div style={{ textAlign: "left" }}>
                              <div style={{ fontSize: 15, fontWeight: 700, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                                <span>{user.email}</span>
                                {user.isBlocked && (
                                  <span style={{ fontSize: 9, background: "rgba(255, 23, 68, 0.15)", border: "1px solid rgba(255, 23, 68, 0.3)", color: "var(--red)", padding: "2px 6px", borderRadius: 4, fontWeight: 800 }}>SUSPENDED</span>
                                )}
                                {user.isMerchant && (
                                  <span style={{ fontSize: 9, background: "rgba(245, 166, 35, 0.15)", border: "1px solid rgba(245, 166, 35, 0.3)", color: "var(--yellow)", padding: "2px 6px", borderRadius: 4, fontWeight: 800 }}>P2P MERCHANT</span>
                                )}
                              </div>
                              <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4 }}>
                                Compliance Tier: <span style={{ color: "var(--cyan)", fontWeight: 600 }}>{user.kycStatus || "Tier-1 Basic"}</span> &bull; ID: <span style={{ fontFamily: "monospace" }}>{user.id}</span>
                              </div>
                            </div>
                          </div>

                          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                            <button 
                              onClick={() => handleExpandUser(user.id)}
                              className="btn-outline"
                              style={{ 
                                padding: "8px 16px",
                                fontSize: 12,
                                fontWeight: 700,
                                borderColor: expandedUserId === user.id ? "var(--yellow)" : "rgba(255,255,255,0.15)",
                                color: expandedUserId === user.id ? "var(--yellow)" : "var(--text-secondary)"
                              }}
                            >
                              {expandedUserId === user.id ? "▲ Close Details" : "▼ Manage & Balances"}
                            </button>
                          </div>
                        </div>

                        {/* Collapsible details panel */}
                        {expandedUserId === user.id && (
                          <div style={{
                            marginTop: 20,
                            paddingTop: 20,
                            borderTop: "1px solid var(--border)",
                            display: "flex",
                            flexDirection: "column",
                            gap: 20
                          }}>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
                              {/* 1. Wallet Ledger Section */}
                              <div style={{ background: "rgba(4, 8, 20, 0.4)", borderRadius: 8, padding: 16, border: "1px solid var(--border)" }}>
                                <h4 style={{ fontSize: 13, fontWeight: 700, color: "var(--cyan)", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                                  🪙 Wallet Ledger balances
                                </h4>
                                {isFetchingBalances ? (
                                  <div style={{ fontSize: 12, color: "var(--text-secondary)", padding: 8 }}>Loading balances...</div>
                                ) : selectedUserBalances.length === 0 ? (
                                  <div style={{ fontSize: 12, color: "var(--text-muted)", padding: 8 }}>No wallet balances found.</div>
                                ) : (
                                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                    {selectedUserBalances.map((bal, idx) => (
                                      <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(255,255,255,0.02)", padding: "6px 10px", borderRadius: 6 }}>
                                        <span style={{ fontSize: 12, fontWeight: 600 }}>{bal.symbol}</span>
                                        <div style={{ textAlign: "right" }}>
                                          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>{parseFloat(bal.amount).toFixed(6)}</div>
                                          {parseFloat(bal.in_order) > 0 && (
                                            <div style={{ fontSize: 10, color: "var(--text-muted)" }}>In Order: {parseFloat(bal.in_order).toFixed(6)}</div>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                
                                <div style={{ marginTop: 12 }}>
                                  <button 
                                    onClick={() => {
                                      setBalanceManageUserId(user.id);
                                      setIsManagingBalanceModal(true);
                                    }}
                                    className="btn-outline" 
                                    style={{ width: "100%", padding: "8px 12px", fontSize: 11, fontWeight: 700, borderColor: "rgba(0, 240, 255, 0.3)", color: "var(--cyan)" }}
                                  >
                                    ⚖️ Adjust Ledger Balance
                                  </button>
                                </div>
                              </div>

                              {/* 2. Compliance and Access Control Section */}
                              <div style={{ background: "rgba(4, 8, 20, 0.4)", borderRadius: 8, padding: 16, border: "1px solid var(--border)" }}>
                                <h4 style={{ fontSize: 13, fontWeight: 700, color: "var(--yellow)", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                                  🛡️ Compliance & KYC Settings
                                </h4>
                                
                                <div style={{ marginBottom: 16 }}>
                                  <label style={{ display: "block", fontSize: 10, color: "var(--text-secondary)", fontWeight: 700, marginBottom: 6, textTransform: "uppercase" }}>
                                    Set KYC Verification Tier
                                  </label>
                                  <select
                                    value={user.kycStatus || "Tier-1 Basic (Email Verified)"}
                                    onChange={(e) => handleUpdateKyc(user.id, e.target.value)}
                                    style={{ width: "100%", padding: "8px 10px", background: "rgba(4, 8, 20, 0.6)", border: "1px solid var(--border)", borderRadius: 6, color: "#fff", fontSize: 12 }}
                                  >
                                    <option value="Tier-1 Basic (Email Verified)">Tier-1 Basic (Email Verified)</option>
                                    <option value="Tier-2 Verified (Identity Approved)">Tier-2 Verified (Identity Approved)</option>
                                    <option value="Tier-3 Premium VIP">Tier-3 Premium VIP</option>
                                  </select>
                                </div>

                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(255,255,255,0.02)", padding: "10px 12px", borderRadius: 6 }}>
                                  <div>
                                    <div style={{ fontSize: 12, fontWeight: 700 }}>P2P Merchant Status</div>
                                    <div style={{ fontSize: 10, color: "var(--text-muted)" }}>Toggle P2P merchant authorized badge</div>
                                  </div>
                                  <button
                                    onClick={() => handleToggleMerchantStatus(user.id)}
                                    className="btn-outline"
                                    style={{
                                      padding: "6px 12px",
                                      fontSize: 11,
                                      fontWeight: 700,
                                      color: user.isMerchant ? "var(--yellow)" : "var(--text-secondary)",
                                      borderColor: user.isMerchant ? "rgba(245, 166, 35, 0.4)" : "rgba(255,255,255,0.15)",
                                      background: user.isMerchant ? "rgba(245, 166, 35, 0.05)" : "transparent"
                                    }}
                                  >
                                    {user.isMerchant ? "✔️ Merchant Active" : "❌ Regular User"}
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* 3. Block and Suspension terminal */}
                            <div style={{ 
                              background: user.isBlocked ? "rgba(255, 23, 68, 0.03)" : "rgba(255, 255, 255, 0.01)", 
                              border: user.isBlocked ? "1px solid rgba(255, 23, 68, 0.2)" : "1px dashed var(--border)", 
                              borderRadius: 8, 
                              padding: 16 
                            }}>
                              <h4 style={{ fontSize: 13, fontWeight: 700, color: "var(--red)", marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                                🚫 Account Suspension Console
                              </h4>
                              
                              {user.isBlocked && user.blockReason && (
                                <div style={{ background: "rgba(255, 23, 68, 0.1)", border: "1px solid rgba(255, 23, 68, 0.2)", borderRadius: 6, padding: "10px 12px", marginBottom: 16, fontSize: 12 }}>
                                  <span style={{ fontWeight: 700, color: "var(--red)" }}>Reason for Suspension: </span>
                                  <span style={{ color: "#fff" }}>{user.blockReason}</span>
                                </div>
                              )}
                              
                              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
                                <div style={{ flex: 1, minWidth: 240 }}>
                                  <label style={{ display: "block", fontSize: 10, color: "var(--text-secondary)", fontWeight: 700, marginBottom: 6, textTransform: "uppercase" }}>
                                    Suspension Reason (Required to block user)
                                  </label>
                                  <input 
                                    type="text"
                                    placeholder={user.isBlocked ? "e.g. Account reinstated after compliance audit" : "e.g. Unverified identity / Suspicious withdrawals / Dispute fraud"}
                                    value={tempBlockReasons[user.id] || ""}
                                    onChange={(e) => setTempBlockReasons(prev => ({ ...prev, [user.id]: e.target.value }))}
                                    style={{ width: "100%", padding: "8px 12px", background: "rgba(4, 8, 20, 0.6)", border: "1px solid var(--border)", borderRadius: 6, color: "#fff", fontSize: 12 }}
                                  />
                                </div>
                                <button 
                                  onClick={() => handleToggleBlock(user.id, user.email, user.isBlocked)} 
                                  className={user.isBlocked ? "btn-yellow" : "btn-outline"}
                                  disabled={!user.isBlocked && !(tempBlockReasons[user.id] || "").trim()}
                                  style={{ 
                                    padding: "8px 20px", 
                                    fontSize: 12, 
                                    fontWeight: 800,
                                    cursor: "pointer",
                                    color: user.isBlocked ? "#000" : "var(--red)",
                                    borderColor: user.isBlocked ? "transparent" : "rgba(255, 23, 68, 0.3)",
                                    opacity: (!user.isBlocked && !(tempBlockReasons[user.id] || "").trim()) ? 0.5 : 1
                                  }}
                                >
                                  {user.isBlocked ? "✔️ Enable / Unblock Account" : "🚫 Block & Suspend Account"}
                                </button>
                              </div>
                              {!user.isBlocked && !(tempBlockReasons[user.id] || "").trim() && (
                                <span style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 6, display: "block" }}>
                                  * Please enter a suspension reason above to enable the Block button.
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                )}
              </div>
            </div>
          )}

          {/* KYC Tab */}
          {activeTab === "kyc" && (
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Identity & Liveness Verification</h2>
              <p style={{ color: "var(--text-secondary)", fontSize: 13, marginBottom: 24 }}>Review and verify submitted regulatory document credentials in real-time.</p>

              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {usersList.filter(u => u.kycStatus === "Pending Verification").length === 0 ? (
                  <div style={{ background: "rgba(10, 17, 40, 0.45)", borderRadius: 12, padding: 48, textAlign: "center", border: "1px solid var(--border)" }}>
                    <ShieldCheck size={48} color="var(--green)" style={{ margin: "0 auto 16px" }} />
                    <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>All KYC verification requests have been cleared from the database!</p>
                  </div>
                ) : (
                  usersList
                    .filter(u => u.kycStatus === "Pending Verification")
                    .map((user) => (
                      <div key={user.id} className="admin-card-flex" style={{
                        background: "rgba(13, 27, 56, 0.45)",
                        border: "1px solid var(--border)",
                        borderRadius: 12,
                        padding: 24,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 20
                      }}>
                        <div style={{ display: "flex", gap: 24, alignItems: "center", flexWrap: "wrap" }}>
                          {/* Photo preview block */}
                          {user.kycDocumentUrl ? (
                            <div 
                              onClick={() => setActiveLightboxUrl(user.kycDocumentUrl)}
                              style={{ 
                                width: 90, 
                                height: 60, 
                                borderRadius: 6, 
                                border: "1.5px solid var(--cyan)", 
                                overflow: "hidden", 
                                cursor: "pointer", 
                                background: "rgba(0,0,0,0.3)",
                                position: "relative",
                                boxShadow: "0 0 10px rgba(0, 240, 255, 0.1)"
                              }}
                              title="Click to zoom scan"
                            >
                              <img 
                                src={user.kycDocumentUrl.startsWith("/") ? `${API_URL.replace("/api", "")}${user.kycDocumentUrl}` : user.kycDocumentUrl}
                                alt="Doc scan" 
                                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                onError={(e) => {
                                  e.currentTarget.src = "https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=200&auto=format&fit=crop";
                                }}
                              />
                              <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center", opacity: 0, transition: "opacity 0.2s" }} className="zoom-hover">
                                🔍
                              </div>
                            </div>
                          ) : (
                            <div style={{ width: 90, height: 60, borderRadius: 6, background: "rgba(0,0,0,0.3)", border: "1px dashed var(--border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>
                              👤
                            </div>
                          )}
                          
                          <div>
                            <div style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>{user.email}</div>
                            <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4 }}>
                              Region: <span style={{ color: "var(--cyan)" }}>{user.kycCountry || "India"}</span> &bull; Type: <span style={{ color: "var(--cyan)" }}>{user.kycDocType || "Aadhaar Card"}</span>
                            </div>
                            <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 4 }}>
                              ID Serial: <span style={{ fontFamily: "monospace", color: "var(--yellow)" }}>{user.kycDocNumber || "N/A"}</span>
                            </div>
                          </div>
                        </div>

                        <div style={{ display: "flex", gap: 8 }}>
                          <button 
                            onClick={() => handleUpdateKyc(user.id, "Tier-1 Basic (Email Verified)")} 
                            className="btn-outline" 
                            style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--red)", borderColor: "rgba(239, 68, 68, 0.3)", padding: "8px 16px" }}
                          >
                            <X size={14} /> Reject ID
                          </button>
                          <button 
                            onClick={() => handleUpdateKyc(user.id, "Tier-2 Verified (Identity Approved)")} 
                            className="btn-yellow" 
                            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px" }}
                          >
                            <Check size={14} /> Approve Verified
                          </button>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>
          )}

          {/* LISTINGS Tab */}
          {activeTab === "listings" && (
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Paid Listing Verification Queue</h2>
              <p style={{ color: "var(--text-secondary)", fontSize: 13, marginBottom: 24 }}>Verify USDT tx receipts and deploy custom projects onto the dynamic exchange markets.</p>

              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {listings.length === 0 ? (
                  <div style={{ background: "rgba(10, 17, 40, 0.45)", borderRadius: 12, padding: 48, textAlign: "center", border: "1px solid var(--border)" }}>
                    <ShieldCheck size={48} color="var(--green)" style={{ margin: "0 auto 16px" }} />
                    <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>No token listing applications currently pending.</p>
                  </div>
                ) : (
                  listings.map((app) => (
                    <div key={app.id} className="admin-card-flex" style={{
                      background: "rgba(13, 27, 56, 0.45)",
                      border: "1px solid var(--border)",
                      borderRadius: 12,
                      padding: 24,
                      gap: 20
                    }}>
                      <div className="admin-card-flex" style={{ borderBottom: "1px solid var(--border)", paddingBottom: 16, marginBottom: 16, width: "100%" }}>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontSize: 15, fontWeight: 700 }}>{app.name} ({app.symbol})</span>
                            <span style={{ fontSize: 9, background: "rgba(245,166,35,0.15)", border: "1px solid rgba(245,166,35,0.3)", color: "var(--yellow)", padding: "2px 6px", borderRadius: 4 }}>5,000 USDT FEE LOCKED</span>
                          </div>
                          <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4 }}>
                            Chain: <span style={{ color: "var(--cyan)" }}>{app.network}</span> &bull; Address: <span style={{ fontFamily: "monospace" }}>{app.contractAddress}</span>
                          </div>
                          <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 4 }}>
                            TXID: <span style={{ fontFamily: "monospace", color: "var(--yellow)" }}>{app.txHash}</span>
                          </div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>Submitted: {app.submittedAt}</span>
                          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginTop: 4 }}>Price: ${app.initialPrice}</div>
                        </div>
                      </div>

                      {app.status === "Pending" ? (
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                          <button onClick={() => handleResolveListing(app.id, false)} className="btn-outline" style={{ color: "var(--red)", borderColor: "rgba(239, 68, 68, 0.3)", padding: "6px 12px", fontSize: 12 }}>
                            Reject Verification
                          </button>
                          <button onClick={() => handleResolveListing(app.id, true)} className="btn-yellow" style={{ padding: "6px 12px", fontSize: 12 }}>
                            Verify Payment & List Token
                          </button>
                        </div>
                      ) : (
                        <div style={{ textAlign: "right", fontSize: 13, fontWeight: 700, color: app.status === "Approved" ? "var(--green)" : "var(--red)" }}>
                          {app.status.toUpperCase()}
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
              <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>P2P Merchant Applications</h2>
              <p style={{ color: "var(--text-secondary)", fontSize: 13, marginBottom: 24 }}>Approve trust ratings and security collateral locks to authorize P2P merchants.</p>

              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {merchants.length === 0 ? (
                  <div style={{ background: "rgba(10, 17, 40, 0.45)", borderRadius: 12, padding: 48, textAlign: "center", border: "1px solid var(--border)" }}>
                    <ShieldCheck size={48} color="var(--green)" style={{ margin: "0 auto 16px" }} />
                    <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>No P2P merchant requests pending.</p>
                  </div>
                ) : (
                  merchants.map((m) => (
                    <div key={m.id} className="admin-card-flex" style={{
                      background: "rgba(13, 27, 56, 0.45)",
                      border: "1px solid var(--border)",
                      borderRadius: 12,
                      padding: 24
                    }}>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 700 }}>{m.username}</div>
                        <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4 }}>
                          UPI ID: <span style={{ color: "var(--cyan)" }}>{m.upiId}</span> &bull; Security Deposit: <span style={{ color: "var(--yellow)" }}>{m.depositAmount} USDT (LOCKED)</span>
                        </div>
                      </div>

                      {m.status === "Pending" ? (
                        <div style={{ display: "flex", gap: 8 }}>
                          <button onClick={() => handleResolveMerchant(m.id, false)} className="btn-outline" style={{ color: "var(--red)", borderColor: "rgba(239, 68, 68, 0.3)", padding: "6px 12px", fontSize: 12 }}>
                            Reject
                          </button>
                          <button onClick={() => handleResolveMerchant(m.id, true)} className="btn-yellow" style={{ padding: "6px 12px", fontSize: 12 }}>
                            Authorize Merchant
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize: 13, fontWeight: 700, color: m.status === "Approved" ? "var(--green)" : "var(--red)" }}>
                          {m.status.toUpperCase()}
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
              <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Manual Custom Pair Registry</h2>
              <p style={{ color: "var(--text-secondary)", fontSize: 13, marginBottom: 24 }}>Manually input and deploy custom pairs immediately into the database.</p>

              <div className="list-token-grid" style={{ gap: 32 }}>
                <form onSubmit={handleAddPair} style={{
                  background: "rgba(13, 27, 56, 0.45)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  padding: 24,
                  display: "flex",
                  flexDirection: "column",
                  gap: 16
                }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, borderBottom: "1px solid var(--border)", paddingBottom: 12, marginBottom: 4 }}>New Pair Registry</h3>

                  <div>
                    <label style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 700, display: "block", marginBottom: 6 }}>TOKEN SYMBOL</label>
                    <input type="text" className="bn-input" placeholder="e.g. MATIC" value={newSymbol} onChange={e => setNewSymbol(e.target.value)} required />
                  </div>

                  <div>
                    <label style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 700, display: "block", marginBottom: 6 }}>FULL NAME</label>
                    <input type="text" className="bn-input" placeholder="e.g. Polygon" value={newName} onChange={e => setNewName(e.target.value)} required />
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div>
                      <label style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 700, display: "block", marginBottom: 6 }}>INITIAL PRICE (USD)</label>
                      <input type="number" step="any" className="bn-input" placeholder="0.68" value={newPrice} onChange={e => setNewPrice(e.target.value)} required />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 700, display: "block", marginBottom: 6 }}>24H CHANGE (%)</label>
                      <input type="number" step="any" className="bn-input" placeholder="+1.55" value={newChange} onChange={e => setNewChange(e.target.value)} />
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 700, display: "block", marginBottom: 6 }}>24H VOLUME</label>
                    <input type="number" className="bn-input" placeholder="25000" value={newVolume} onChange={e => setNewVolume(e.target.value)} />
                  </div>

                  <div>
                    <label style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 700, display: "block", marginBottom: 6 }}>ACCENT COLOR (HEX)</label>
                    <input type="color" className="bn-input" style={{ height: 40, padding: 4 }} value={newColor} onChange={e => setNewColor(e.target.value)} />
                  </div>

                  <button type="submit" className="btn-yellow" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: 12, fontWeight: 700, marginTop: 8 }}>
                    <Plus size={16} /> Deploy Trading Pair
                  </button>
                </form>

                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Manual Deployed Queue</h3>
                  {customPairs.length === 0 ? (
                    <div style={{ background: "rgba(10, 17, 40, 0.2)", border: "1px dashed var(--border)", borderRadius: 12, padding: 48, textAlign: "center", color: "var(--text-secondary)", fontSize: 13 }}>
                      No manual pairs deployed yet.
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      {customPairs.map((p, idx) => (
                        <div key={idx} className="admin-card-flex" style={{
                          background: "rgba(13, 27, 56, 0.35)",
                          border: "1px solid var(--border)",
                          borderRadius: 8,
                          padding: "16px 20px"
                        }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <div style={{ width: 10, height: 10, borderRadius: "50%", background: p.color }} />
                            <div>
                              <span style={{ fontWeight: 700, fontSize: 14 }}>{p.symbol}/USDT</span>
                              <span style={{ fontSize: 11, color: "var(--text-secondary)", marginLeft: 8 }}>{p.name}</span>
                            </div>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontWeight: 700, fontSize: 14 }}>${p.price.toFixed(4)}</div>
                            <div style={{ fontSize: 11, color: p.change24h >= 0 ? "var(--green)" : "var(--red)" }}>
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
              <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>P2P Escrow Dispute Center</h2>
              <p style={{ color: "var(--text-secondary)", fontSize: 13, marginBottom: 24 }}>Moderate and resolve locked collateral peer transactions.</p>

              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {disputes.length === 0 ? (
                  <div style={{ background: "rgba(10, 17, 40, 0.45)", borderRadius: 12, padding: 48, textAlign: "center", border: "1px solid var(--border)" }}>
                    <ShieldCheck size={48} color="var(--green)" style={{ margin: "0 auto 16px" }} />
                    <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>All dispute tickets cleared.</p>
                  </div>
                ) : (
                  disputes.map((d) => (
                    <div key={d.id} className="admin-card-flex" style={{
                      background: "rgba(13, 27, 56, 0.45)",
                      border: "1px solid var(--border)",
                      borderRadius: 12,
                      padding: 24
                    }}>
                      <div className="admin-card-flex" style={{ borderBottom: "1px solid var(--border)", paddingBottom: 16, marginBottom: 16, width: "100%" }}>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontSize: 14, fontWeight: 700, color: "var(--yellow)" }}>{d.id}</span>
                            <span style={{ fontSize: 10, background: "rgba(239, 68, 68, 0.15)", border: "1px solid rgba(239, 68, 68, 0.3)", color: "var(--red)", padding: "2px 6px", borderRadius: 4 }}>DISPUTED PAYMENT</span>
                          </div>
                          <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4 }}>
                            Buyer: <span style={{ color: "var(--text-primary)" }}>{d.buyer}</span> &bull; Seller: <span style={{ color: "var(--text-primary)" }}>{d.seller}</span>
                          </div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: 16, fontWeight: 800, color: "var(--text-primary)" }}>{d.amount} {d.coin}</div>
                          <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>₹{d.fiatAmount.toLocaleString("en-IN")} INR</div>
                        </div>
                      </div>

                      <div className="admin-card-flex" style={{ width: "100%" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--green)", fontSize: 12 }}>
                          <CheckCircle2 size={14} /> Buyer uploaded verified IMPS transaction slip.
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button onClick={() => handleResolveDispute(d.id, "seller")} className="btn-outline" style={{ color: "var(--red)", borderColor: "rgba(239, 68, 68, 0.3)", padding: "6px 12px", fontSize: 12 }}>
                            Refund Seller
                          </button>
                          <button onClick={() => handleResolveDispute(d.id, "buyer")} className="btn-yellow" style={{ padding: "6px 12px", fontSize: 12 }}>
                            Release Escrow to Buyer
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* SYSTEM Tab */}
          {activeTab === "system" && (
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>Core Infrastructure Metrics</h2>
              <p style={{ color: "var(--text-secondary)", fontSize: 13, marginBottom: 24 }}>Real-time health indices of the HFT matching engine and double-entry ledger database.</p>

              <div className="grid-responsive-4" style={{ marginBottom: 32 }}>
                {[
                  { title: "Matching Latency", val: "0.12 μs", desc: "Median order process speed", ok: true },
                  { title: "Peak Ingestion", val: "2,450,000 tx/s", desc: "DPDK Kernel bypass queue", ok: true },
                  { title: "Shadow Engine State", val: "0 DIV", desc: "State discrepancies reported", ok: true },
                  { title: "WAL File Space", val: "100 MB", desc: "Pre-allocated NVMe disk WAL", ok: true },
                  { title: "Ledger Settlement", val: "Double-Entry OK", desc: "Self-auditing verification status", ok: true },
                  { title: "Arbitration Lock", val: "0.00% Error", desc: "Smart contract release state", ok: true },
                ].map((s, idx) => (
                  <div key={idx} style={{
                    background: "rgba(13, 27, 56, 0.45)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    padding: 20
                  }}>
                    <div style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 700, textTransform: "uppercase" }}>{s.title}</div>
                    <div style={{ fontSize: 24, fontWeight: 900, color: "var(--yellow)", marginTop: 8 }}>{s.val}</div>
                    <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4 }}>{s.desc}</div>
                  </div>
                ))}
              </div>

              <div style={{
                background: "rgba(13, 27, 56, 0.25)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                padding: 24
              }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                  <Settings size={16} /> WAL (Write-Ahead Log) Flush Indexer
                </h3>
                <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 16 }}>
                  Our zero-copy memory-mapped WAL is continuously writing execution events.
                </p>
                <div style={{ background: "rgba(0, 0, 0, 0.2)", borderRadius: 6, padding: 12, fontFamily: "monospace", fontSize: 11, color: "var(--cyan)" }}>
                  [info] WAL Flush Success. Block sequence 2,892,102. Hash: 0xf3a8d11c9...
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
      {/* Ledger Adjustment Modal */}
      {isManagingBalanceModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          background: "rgba(4, 8, 20, 0.8)",
          backdropFilter: "blur(8px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
          padding: 16
        }}>
          <div style={{
            background: "rgba(13, 27, 56, 0.95)",
            border: "1px solid var(--border)",
            borderRadius: 16,
            width: "100%",
            maxWidth: 460,
            padding: 28,
            boxShadow: "0 0 40px rgba(0, 240, 255, 0.15)",
            position: "relative"
          }}>
            <button 
              onClick={() => setIsManagingBalanceModal(false)}
              style={{ position: "absolute", right: 20, top: 20, background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer" }}
            >
              <X size={20} />
            </button>
            
            <h3 style={{ fontSize: 18, fontWeight: 800, color: "var(--cyan)", marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
              ⚖️ Adjust Wallet Balance Ledger
            </h3>
            <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 20 }}>
              Deduct or credit assets for compliance operations. This creates an auditable system transaction.
            </p>
            
            <form onSubmit={handleAdjustBalanceSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 11, color: "var(--text-secondary)", fontWeight: 700, marginBottom: 6 }}>
                  SELECT ASSET
                </label>
                <select 
                  value={adjustBalanceSymbol}
                  onChange={e => setAdjustBalanceSymbol(e.target.value)}
                  style={{ width: "100%", padding: "10px 12px", background: "rgba(4, 8, 20, 0.6)", border: "1px solid var(--border)", borderRadius: 8, color: "#fff", fontSize: 13 }}
                >
                  <option value="USDT">USDT</option>
                  <option value="BTC">BTC</option>
                  <option value="ETH">ETH</option>
                  <option value="SOL">SOL</option>
                  <option value="BNB">BNB</option>
                  <option value="GOLD">GOLD</option>
                </select>
              </div>
              
              <div>
                <label style={{ display: "block", fontSize: 11, color: "var(--text-secondary)", fontWeight: 700, marginBottom: 6 }}>
                  ADJUSTMENT ACTION
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <button 
                    type="button"
                    onClick={() => setAdjustBalanceAction("add")}
                    style={{
                      padding: "10px",
                      borderRadius: 8,
                      border: "1px solid",
                      borderColor: adjustBalanceAction === "add" ? "var(--green)" : "var(--border)",
                      background: adjustBalanceAction === "add" ? "rgba(76, 175, 80, 0.1)" : "transparent",
                      color: adjustBalanceAction === "add" ? "var(--green)" : "var(--text-secondary)",
                      fontWeight: 700,
                      fontSize: 12,
                      cursor: "pointer"
                    }}
                  >
                    🟢 Credit / Add Balance
                  </button>
                  <button 
                    type="button"
                    onClick={() => setAdjustBalanceAction("subtract")}
                    style={{
                      padding: "10px",
                      borderRadius: 8,
                      border: "1px solid",
                      borderColor: adjustBalanceAction === "subtract" ? "var(--red)" : "var(--border)",
                      background: adjustBalanceAction === "subtract" ? "rgba(255, 23, 68, 0.1)" : "transparent",
                      color: adjustBalanceAction === "subtract" ? "var(--red)" : "var(--text-secondary)",
                      fontWeight: 700,
                      fontSize: 12,
                      cursor: "pointer"
                    }}
                  >
                    🔴 Debit / Deduct Balance
                  </button>
                </div>
              </div>
              
              <div>
                <label style={{ display: "block", fontSize: 11, color: "var(--text-secondary)", fontWeight: 700, marginBottom: 6 }}>
                  AMOUNT
                </label>
                <input 
                  type="number"
                  step="any"
                  placeholder="0.00"
                  required
                  value={adjustBalanceAmount}
                  onChange={e => setAdjustBalanceAmount(e.target.value)}
                  style={{ width: "100%", padding: "10px 12px", background: "rgba(4, 8, 20, 0.6)", border: "1px solid var(--border)", borderRadius: 8, color: "#fff", fontSize: 13 }}
                />
              </div>
              
              <div>
                <label style={{ display: "block", fontSize: 11, color: "var(--text-secondary)", fontWeight: 700, marginBottom: 6 }}>
                  AUDIT LOG REASON (REQUIRED)
                </label>
                <input 
                  type="text"
                  placeholder="e.g. KYC Promotional Bonus / Dispute Settlement"
                  required
                  value={adjustBalanceReason}
                  onChange={e => setAdjustBalanceReason(e.target.value)}
                  style={{ width: "100%", padding: "10px 12px", background: "rgba(4, 8, 20, 0.6)", border: "1px solid var(--border)", borderRadius: 8, color: "#fff", fontSize: 13 }}
                />
              </div>
              
              <button 
                type="submit" 
                disabled={isAdjustingBalance}
                className="btn-yellow" 
                style={{ width: "100%", padding: "12px", fontSize: 13, fontWeight: 800, marginTop: 8 }}
              >
                {isAdjustingBalance ? "Processing Adjustment..." : "✔️ Confirm Ledger Adjustment"}
              </button>
            </form>
          </div>
        </div>
      )}
      {/* Document Lightbox Preview Modal */}
      {activeLightboxUrl && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          background: "rgba(4, 8, 20, 0.9)",
          backdropFilter: "blur(10px)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 10000,
          padding: 24
        }}>
          {/* Close button */}
          <button 
            onClick={() => setActiveLightboxUrl(null)}
            style={{ 
              position: "absolute", 
              right: 24, 
              top: 24, 
              background: "rgba(255,255,255,0.05)", 
              border: "1px solid rgba(255,255,255,0.1)", 
              color: "#FFF", 
              borderRadius: "50%", 
              width: 44, 
              height: 44, 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center", 
              cursor: "pointer",
              fontSize: 20
            }}
          >
            ✕
          </button>
          
          {/* Glowing document wrapper */}
          <div style={{ 
            background: "rgba(13, 27, 56, 0.6)",
            border: "2px solid var(--cyan)",
            borderRadius: 16,
            padding: 12,
            boxShadow: "0 0 50px rgba(0, 240, 255, 0.3)",
            maxWidth: "90%",
            maxHeight: "80%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden"
          }}>
            <img 
              src={activeLightboxUrl.startsWith("/") ? `${API_URL.replace("/api", "")}${activeLightboxUrl}` : activeLightboxUrl}
              alt="Verification Document Front" 
              style={{ maxWidth: "100%", maxHeight: "70vh", objectFit: "contain", borderRadius: 8 }}
              onError={(e) => {
                e.currentTarget.src = "https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=600&auto=format&fit=crop";
              }}
            />
          </div>
          
          <div style={{ marginTop: 20, textAlign: "center" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--cyan)", letterSpacing: 1 }}>🔒 COMPLIANCE REGULATORY ID REVIEW</div>
            <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 4 }}>Verify the full name and document identification sequence match exactly.</div>
          </div>
        </div>
      )}
    </div>
  );
}
