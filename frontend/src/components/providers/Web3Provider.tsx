"use client";
import React, { createContext, useContext, useState, useEffect } from "react";

interface Web3ContextType {
  isConnected: boolean;
  address: string | null;
  chainId: string | null;
  balance: string;
  isConnecting: boolean;
  connectWallet: (providerType: "metamask" | "coinbase" | "trust") => Promise<void>;
  disconnectWallet: () => void;
}

const Web3Context = createContext<Web3ContextType>({
  isConnected: false,
  address: null,
  chainId: null,
  balance: "0.00",
  isConnecting: false,
  connectWallet: async () => {},
  disconnectWallet: () => {}
});

export const useWeb3 = () => useContext(Web3Context);

export default function Web3Provider({ children }: { children: React.ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<string | null>(null);
  const [balance, setBalance] = useState("0.00");
  const [isConnecting, setIsConnecting] = useState(false);

  // Auto-connect if already authorized
  useEffect(() => {
    const wasConnected = localStorage.getItem("web3_previously_connected");
    if (wasConnected === "true" && typeof window !== "undefined" && (window as any).ethereum) {
      checkActiveConnection();
    }
  }, []);

  const checkActiveConnection = async () => {
    try {
      const provider = (window as any).ethereum;
      if (!provider) return;
      const accounts = await provider.request({ method: "eth_accounts" });
      if (accounts.length > 0) {
        setupAccount(accounts[0], provider);
      }
    } catch (err) {
      console.error("Auto connect failed", err);
    }
  };

  const setupAccount = async (account: string, provider: any) => {
    setAddress(account);
    setIsConnected(true);
    localStorage.setItem("web3_previously_connected", "true");
    
    // Fetch chainId
    const chain = await provider.request({ method: "eth_chainId" });
    setChainId(chain);

    // Fetch balance
    const rawBalance = await provider.request({
      method: "eth_getBalance",
      params: [account, "latest"]
    });
    const ethVal = (parseInt(rawBalance, 16) / 1e18).toFixed(4);
    setBalance(ethVal);

    // Event listeners
    provider.on("accountsChanged", (accounts: string[]) => {
      if (accounts.length > 0) {
        setupAccount(accounts[0], provider);
      } else {
        disconnectWallet();
      }
    });

    provider.on("chainChanged", () => {
      window.location.reload();
    });
  };

  const connectWallet = async (providerType: "metamask" | "coinbase" | "trust") => {
    if (typeof window === "undefined") return;
    setIsConnecting(true);

    try {
      let provider = (window as any).ethereum;
      
      // Handle multi-providers
      if ((window as any).ethereum?.providers) {
        const providers = (window as any).ethereum.providers;
        if (providerType === "metamask") {
          provider = providers.find((p: any) => p.isMetaMask);
        } else if (providerType === "coinbase") {
          provider = providers.find((p: any) => p.isCoinbaseWallet);
        } else if (providerType === "trust") {
          provider = providers.find((p: any) => p.isTrust);
        }
      }

      if (!provider) {
        alert(`No wallet extension detected for ${providerType}. Please install it to proceed.`);
        setIsConnecting(false);
        return;
      }

      const accounts = await provider.request({ method: "eth_requestAccounts" });
      if (accounts.length > 0) {
        await setupAccount(accounts[0], provider);
      }
    } catch (err: any) {
      console.error("Wallet connection failed", err);
      alert(err.message || "Failed to establish Web3 wallet handshake.");
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    setIsConnected(false);
    setAddress(null);
    setChainId(null);
    setBalance("0.00");
    localStorage.removeItem("web3_previously_connected");
  };

  return (
    <Web3Context.Provider value={{
      isConnected,
      address,
      chainId,
      balance,
      isConnecting,
      connectWallet,
      disconnectWallet
    }}>
      {children}
    </Web3Context.Provider>
  );
}
