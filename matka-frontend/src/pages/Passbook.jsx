import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import {
  ArrowLeft,
  ArrowDownLeft,
  ArrowUpRight,
  CalendarDays,
  Coins,
  Filter,
  Loader,
  QrCode,
  ReceiptText,
  Trophy,
} from "lucide-react";
import { API_URL } from "../config";

const API_BASE = `${API_URL}/passbook/history`;

export default function Passbook() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const token = localStorage.getItem("accessToken");

  const fetchHistory = useCallback(async () => {
    setLoading(true);

    try {
      const res = await axios.get(API_BASE, {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          start_date: startDate || null,
          end_date: endDate || null,
        },
      });

      setHistory(res.data.history || []);
    } catch (err) {
      console.log("Passbook error:", err);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, token]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const getStyle = (type) => {
    if (type === "DEPOSIT")
      return {
        color: "text-emerald-300",
        badge: "border-emerald-300/20 bg-emerald-400/10 text-emerald-200",
        icon: ArrowDownLeft,
      };
    if (type === "WIN")
      return {
        color: "text-emerald-300",
        badge: "border-emerald-300/20 bg-emerald-400/10 text-emerald-200",
        icon: Trophy,
      };
    if (type === "QR_DEPOSIT")
      return {
        color: "text-amber-300",
        badge: "border-amber-300/20 bg-amber-400/10 text-amber-200",
        icon: QrCode,
      };
    if (type === "WITHDRAWAL")
      return {
        color: "text-rose-300",
        badge: "border-rose-300/20 bg-rose-400/10 text-rose-200",
        icon: ArrowUpRight,
      };
    return {
      color: "text-rose-300",
      badge: "border-rose-300/20 bg-rose-400/10 text-rose-200",
      icon: Coins,
    };
  };

  const getAmountText = (item) => {
    if (item.type === "BID") return `-${item.debit}`;
    if (item.type === "WITHDRAWAL") return `-${item.amount}`;
    return `+${item.amount}`;
  };

  const getTitle = (item) => {
    if (item.type === "DEPOSIT") return "Deposit Added";
    if (item.type === "WIN") return "Winning Amount";
    if (item.type === "WITHDRAWAL") return "Withdrawal";
    if (item.type === "BID") return `Bid Placed (${item.game_type})`;
    if (item.type === "QR_DEPOSIT") return "QR Deposit";
    return item.type;
  };

  const getDescription = (item) => {
    if (item.type === "BID")
      return `Market: ${item.market_id} | ${item.session} | Digit: ${item.digit}`;
    return item.status;
  };

  return (
    <div className="mx-auto max-w-md pb-30 font-sans text-white">
      {/* Header */}
      <div className="relative flex w-full items-center justify-between bg-gradient-to-b from-[#06152d] to-[#071b3b]/70 pb-2 shadow-lg shadow-black/20">
        <button
          onClick={() => window.history.back()}
          className="z-10 ml-2 rounded-full p-2 transition hover:bg-white/10"
          aria-label="Go back"
        >
          <ArrowLeft size={22} />
        </button>
        <h2 className="absolute flex w-full items-center justify-center gap-2 px-4 py-2 text-base font-bold">
          <span className="uppercase tracking-wide">Passbook</span>
        </h2>
        <span className="z-10 mr-4">
          <ReceiptText size={19} className="text-blue-200" />
        </span>
      </div>

      {/* FILTERS */}
      <div className="mx-3 mb-5 mt-3 overflow-hidden rounded-2xl border border-blue-300/20 bg-gradient-to-br from-[#294878] via-[#203b69] to-[#172f59] p-4 shadow-xl shadow-black/20">
        <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-blue-100">
          <span className="rounded-lg bg-blue-400/15 p-2 text-blue-200">
            <Filter size={17} />
          </span>
          Filter Transactions
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          {[
            ["Start Date", startDate, setStartDate],
            ["End Date", endDate, setEndDate],
          ].map(([label, value, setter]) => (
            <label key={label} className="block">
              <span className="mb-1.5 block text-xs font-medium text-blue-100/75">
                {label}
              </span>
              <input
                type="date"
                className="w-full rounded-xl border border-blue-200/15 bg-[#102749]/80 px-3 py-2.5 text-sm text-white outline-none transition focus:border-blue-300/60 focus:ring-2 focus:ring-blue-400/15"
                style={{ colorScheme: "dark" }}
                value={value}
                onChange={(e) => setter(e.target.value)}
              />
            </label>
          ))}
        </div>

        <div className="mt-4 flex gap-2">
          <button
            onClick={fetchHistory}
            className="flex-1 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 py-2.5 font-bold text-white shadow-lg shadow-blue-950/30 transition hover:brightness-110 active:scale-[0.99]"
          >
            Apply Filter
          </button>
          {(startDate || endDate) && (
            <button
              onClick={() => {
                setStartDate("");
                setEndDate("");
              }}
              className="rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-semibold text-blue-100 transition hover:bg-white/10"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* HISTORY LIST */}
      {loading ? (
        <div className="text-center py-10">
          <Loader size={28} className="animate-spin mx-auto text-cyan-400" />
          <p className="mt-2 text-gray-400">Loading history...</p>
        </div>
      ) : history.length === 0 ? (
        <div className="text-center py-10 text-gray-400">No records found.</div>
      ) : (
        <div className="mx-3 space-y-3">
          {history.map((item, index) => (
            <div key={`${item.type}-${item.created_at}-${index}`}>
              {(() => {
                const style = getStyle(item.type);
                const TransactionIcon = style.icon;
                return (
                  <article className="overflow-hidden rounded-2xl border border-blue-200/15 bg-gradient-to-br from-[#263f6b] via-[#21385f] to-[#1a3157] p-4 shadow-lg shadow-black/15">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-3">
                        <span
                          className={`mt-0.5 shrink-0 rounded-xl border p-2.5 ${style.badge}`}
                        >
                          <TransactionIcon size={20} />
                        </span>
                        <div className="min-w-0">
                          <h3 className="text-sm font-bold leading-5 text-white">
                            {getTitle(item)}
                          </h3>
                          <span
                            className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${style.badge}`}
                          >
                            {item.type.replace("_", " ")}
                          </span>
                        </div>
                      </div>

                      <div
                        className={`shrink-0 text-right text-lg font-extrabold ${style.color}`}
                      >
                        ₹{getAmountText(item)}
                      </div>
                    </div>

                    <div className="mt-3 rounded-xl border border-white/5 bg-[#102747]/55 px-3 py-2.5 text-sm leading-5 text-blue-50/85">
                      {getDescription(item) || "Transaction completed"}
                    </div>

                    <div className="mt-3 flex items-center gap-1.5 text-[11px] text-blue-100/50">
                      <CalendarDays size={13} />
                      {new Date(item.created_at).toLocaleString()}
                    </div>
                  </article>
                );
              })()}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
