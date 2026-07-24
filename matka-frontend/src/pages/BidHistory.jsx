// src/pages/BidHistory.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { API_URL } from "../config";
import {
  ArrowLeft,
  CalendarClock,
  Coins,
  Hash,
  Loader,
  Store,
} from "lucide-react";

const API_BASE = `${API_URL}`;

export default function BidHistoryPage() {
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const [selectedType, setSelectedType] = useState("All"); // <-- FILTER STATE
  const [marketCache, setMarketCache] = useState({}); // <-- MARKET DATA CACHE

  const token = localStorage.getItem("accessToken");

  const authHeader = useMemo(
    () => ({
      Authorization: `Bearer ${token}`,
    }),
    [token]
  );

  // Fetch market details by ID
  const fetchMarketInfo = useCallback(
    async (marketId) => {
      if (!marketId) return null;

      // Already cached?
      if (marketCache[marketId]) return marketCache[marketId];

      try {
        const res = await axios.get(
          `${API_BASE}/api/admin/market/${marketId}`,
          {
            headers: authHeader,
          }
        );

        const data = res?.data?.data;
        if (data) {
          setMarketCache((prev) => ({
            ...prev,
            [marketId]: data,
          }));
          return data;
        }
      } catch (err) {
        console.log("Market fetch failed:", marketId, err);
      }
      return null;
    },
    [authHeader, marketCache]
  );

  // Fetch History
  const fetchHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const res = await axios.get(`${API_BASE}/bid/my-bids`, {
        headers: authHeader,
      });

      const rawHistory = Array.isArray(res.data)
        ? res.data
        : res.data.history || [];

      // Attach market info for each history item
      const historyWithMarket = await Promise.all(
        rawHistory.map(async (item) => {
          const market = await fetchMarketInfo(item.market_id);
          return { ...item, market };
        })
      );

      setHistory(historyWithMarket);
    } catch (err) {
      console.warn(
        "Failed to fetch history:",
        err?.response?.data || err.message
      );
      setHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  }, [authHeader, fetchMarketInfo]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // FILTERED HISTORY
  const filteredHistory = useMemo(() => {
    if (selectedType === "All") return history;

    return history.filter((h) => h.market?.marketType === selectedType);
  }, [history, selectedType]);

  const formatLabel = (value) =>
    String(value || "")
      .replace(/_/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());

  return (
    <div className="max-w-md mx-auto pb-30 text-white font-sans min-h-screen">
      {/* Header */}
      <div className="w-full mb-2 relative bg-gradient-to-b from-black to-black/0 py-2 flex items-center justify-between">
        <button
          onClick={() => window.history.back()}
          className="p-2 pl-4 z-10 rounded-full hover:bg-white/10 transition"
        >
          <ArrowLeft size={22} />
        </button>

        <h2 className="text-md z-0 absolute top-2 w-full text-center font-bold">
          Bid History
        </h2>

        <div className="pr-4 z-10"></div>
      </div>

      {/* FILTER DROPDOWN */}
      <div className="px-4 mb-4">
        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="w-full bg-white/10 text-white p-2 rounded-md border border-white/20"
        >
          <option value="All">All Markets</option>
          <option value="Market">Market</option>
          <option value="Starline">Starline</option>
        </select>
      </div>

      {/* CONTENT */}
      {loadingHistory ? (
        <div className="text-center text-gray-400">
          <Loader className="animate-spin inline-block" /> Loading...
        </div>
      ) : filteredHistory.length === 0 ? (
        <div className="text-gray-500 text-center">No bids found.</div>
      ) : (
        <div className="space-y-4 px-3">
          {filteredHistory.map((h) => (
            <div
              key={h.id}
              className="group relative overflow-hidden rounded-2xl border border-blue-300/20 bg-gradient-to-br from-[#24477f]/95 via-[#1a3768]/95 to-[#102b58]/95 p-4 shadow-[0_14px_35px_rgba(2,8,23,0.3)] transition duration-200 hover:-translate-y-0.5 hover:border-blue-300/40"
            >
              <div className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-blue-400/10 blur-2xl" />

              <div className="relative flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-blue-200/20 bg-white/10 text-blue-200">
                      <Store size={18} />
                    </span>
                    <div className="min-w-0">
                      <h3 className="truncate text-base font-extrabold uppercase tracking-wide text-white">
                        {h.market?.name || "Unknown Market"}
                      </h3>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-200/70">
                        {h.market?.marketType || "Market"}
                      </p>
                    </div>
                  </div>
                </div>

                <span className="shrink-0 rounded-full border border-cyan-300/25 bg-cyan-300/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-cyan-100">
                  {formatLabel(h.session)}
                </span>
              </div>

              <div className="relative mt-4 grid grid-cols-[1fr_auto_auto] gap-2">
                <div className="rounded-xl border border-white/10 bg-black/10 px-3 py-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-blue-200/70">
                    Game Type
                  </p>
                  <p className="mt-1 text-sm font-bold text-white">
                    {formatLabel(h.game_type)}
                  </p>
                </div>

                <div className="min-w-18 rounded-xl border border-white/10 bg-white/10 px-3 py-2.5 text-center">
                  <p className="flex items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-wide text-blue-200/70">
                    <Hash size={11} /> Digit
                  </p>
                  <p className="mt-1 text-xl font-black text-white">{h.digit}</p>
                </div>

                <div className="min-w-18 rounded-xl border border-amber-300/20 bg-amber-300/10 px-3 py-2.5 text-center">
                  <p className="flex items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-wide text-amber-100/80">
                    <Coins size={11} /> Points
                  </p>
                  <p className="mt-1 text-xl font-black text-amber-300">{h.points}</p>
                </div>
              </div>

              <div className="relative mt-3 flex items-center gap-2 border-t border-white/10 pt-3 text-[11px] text-blue-100/60">
                <CalendarClock size={14} className="text-blue-300" />
                <span>
                  {new Date(
                    new Date(h.created_at).getTime() + 5.5 * 60 * 60 * 1000
                  ).toLocaleString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: true,
                  })}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
