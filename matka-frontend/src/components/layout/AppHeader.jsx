// AppHeader.jsx
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Menu, Wallet2Icon } from "lucide-react";
import { API_URL } from "../../config";

// IMPORTANT: Replace with your actual base URL
const API_BASE_URL = API_URL;
const WALLET_REFRESH_INTERVAL = 5000;

// Utility function to get the token (assumes JWT is stored in localStorage)
const getAuthToken = () => {
  return localStorage.getItem("accessToken");
};

export default function AppHeader({ setSidebar }) {
  const [balance, setBalance] = useState("...");
  const [loading, setLoading] = useState(true);
  const requestRef = useRef(null);

  const fetchWalletBalance = useCallback(async (showInitialLoader = false) => {
    if (showInitialLoader) setLoading(true);
    const token = getAuthToken();

    if (!token) {
      setBalance("Login");
      setLoading(false);
      return;
    }

    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;

    try {
      const response = await fetch(`${API_BASE_URL}/user/balance`, {
        method: "GET",
        cache: "no-store",
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        const nextBalance = Number(data.balance || 0).toFixed(2);
        setBalance((current) =>
          current === nextBalance ? current : nextBalance
        );
      } else {
        if (showInitialLoader) setBalance("N/A");
      }
    } catch (error) {
      if (error.name !== "AbortError" && showInitialLoader) {
        setBalance("Error");
      }
    } finally {
      if (requestRef.current === controller) {
        requestRef.current = null;
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchWalletBalance(true);

    const refreshIfVisible = () => {
      if (document.visibilityState === "visible") fetchWalletBalance();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") fetchWalletBalance();
    };

    const intervalId = window.setInterval(
      refreshIfVisible,
      WALLET_REFRESH_INTERVAL
    );
    window.addEventListener("focus", refreshIfVisible);
    window.addEventListener("wallet:refresh", refreshIfVisible);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refreshIfVisible);
      window.removeEventListener("wallet:refresh", refreshIfVisible);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      requestRef.current?.abort();
    };
  }, [fetchWalletBalance]);

  return (
    <header className="w-full z-40">
      <div className="theme-card mx-auto flex max-w-md items-center justify-between rounded-b-[30px] border-x-0 border-t-0 px-4 py-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebar(true)}
            className="rounded-full border border-white/25 bg-white/10 p-2 text-white hover:border-blue-200 hover:bg-white/20"
          >
            <Menu size={22} />
          </button>
          {/* <img src="/logo.png" alt="Logo" className="w-8 h-8" /> */}
          <h1 className="text-white text-lg font-extrabold tracking-wide">
            Natraj777
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-1.5 text-sm font-bold text-white transition duration-150 hover:bg-white/20">
            <Wallet2Icon size={18} />
            {loading ? (
              <span className="animate-pulse">Loading...</span>
            ) : (
              `₹${balance}`
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
