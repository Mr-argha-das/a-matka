import React, { useEffect, useState } from "react";
import {
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  Info,
  ArrowLeft,
  ArrowDownLeft,
  ArrowUpRight,
  CalendarDays,
  ReceiptText,
  WalletCards,
} from "lucide-react";
import axios from "axios";
import { API_URL } from "../../config";

const API_BASE_URL = API_URL;

const getAuthToken = () => localStorage.getItem("accessToken");

export default function WalletTransactionHistory() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // -------- Status Badge -------
  const getStatusBadge = (status) => {
    const base =
      "flex items-center gap-1 font-semibold text-sm px-2 py-1 rounded-full";

    if (status === "Approved" || status === "SUCCESS")
      return (
        <span className={`${base} bg-green-600/20 text-green-400`}>
          <CheckCircle size={14} /> Success
        </span>
      );

    if (status === "FAILED" || status === "Rejected")
      return (
        <span className={`${base} bg-red-600/20 text-red-400`}>
          <XCircle size={14} /> Failed
        </span>
      );

    return (
      <span className={`${base} bg-yellow-600/20 text-yellow-400`}>
        <Clock size={14} /> Pending
      </span>
    );
  };

  const formatDate = (iso) => {
    if (!iso) return "N/A";
    return new Date(iso).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const isDebit = (method = "") => {
    const normalized = method.toUpperCase();
    return (
      normalized.includes("WITHDRAW") ||
      (normalized.includes("BID") && !normalized.includes("REFUND"))
    );
  };

  // -------- Fetch API --------
  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);

      try {
        const token = getAuthToken();

        const res = await axios.get(
          `${API_BASE_URL}/user/transactions-wallet-history`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        console.log(res);

        setHistory(res.data || []);
      } catch (err) {
        console.log(err);
        setError("Failed to load transactions.");
      }

      setLoading(false);
    };

    fetchHistory();
  }, []);

  return (
    <div className="mx-auto max-w-md pb-10 font-sans text-white">
      {/* Header */}
      <div className="relative mb-2 flex w-full items-center justify-between bg-gradient-to-b from-[#06152d] to-[#071b3b]/70 py-2 shadow-lg shadow-black/20">
        <button
          onClick={() => window.history.back()}
          className="z-10 ml-2 rounded-full p-2 transition hover:bg-white/10"
          aria-label="Go back"
        >
          <ArrowLeft size={22} />
        </button>
        <h2 className="absolute flex w-full items-center justify-center px-4 py-2 text-base font-bold">
          <span className="uppercase tracking-wide">Wallet Transactions</span>
        </h2>
        <span className="z-10 mr-4 text-blue-200">
          <WalletCards size={20} />
        </span>
      </div>

      {/* Loading */}
      {loading && (
        <p className="text-center py-8 text-gray-400 flex items-center justify-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading history...
        </p>
      )}

      {/* Error */}
      {error && (
        <p className="mx-3 rounded-2xl border border-red-300/15 bg-red-900/20 py-6 text-center text-red-300">
          <Info className="mr-2 inline" size={18} /> {error}
        </p>
      )}

      {/* Empty */}
      {!loading && !error && history.length === 0 && (
        <p className="text-center py-8 text-gray-400">No transactions found.</p>
      )}

      {/* Transaction cards */}
      {!loading && history.length > 0 && (
        <div className="mx-3 space-y-3">
          {history.map((t) => {
            const debit = isDebit(t.method);
            const TransactionIcon = debit ? ArrowUpRight : ArrowDownLeft;

            return (
              <article
                key={t.tx_id}
                className="overflow-hidden rounded-2xl border border-blue-200/15 bg-gradient-to-br from-[#263f6b] via-[#21385f] to-[#1a3157] p-4 shadow-lg shadow-black/15"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <span
                      className={`shrink-0 rounded-xl border p-2.5 ${
                        debit
                          ? "border-rose-300/20 bg-rose-400/10 text-rose-300"
                          : "border-emerald-300/20 bg-emerald-400/10 text-emerald-300"
                      }`}
                    >
                      <TransactionIcon size={20} />
                    </span>

                    <div className="min-w-0">
                      <h3 className="break-words text-sm font-bold leading-5 text-white">
                        {t.method?.toUpperCase() || "WALLET TRANSACTION"}
                      </h3>
                      <div className="mt-1.5">{getStatusBadge(t.status)}</div>
                    </div>
                  </div>

                  <div
                    className={`shrink-0 text-lg font-extrabold ${
                      debit ? "text-rose-300" : "text-emerald-300"
                    }`}
                  >
                    {debit ? "−" : "+"}₹{Number(t.amount || 0).toFixed(2)}
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between rounded-xl border border-white/5 bg-[#102747]/55 px-3 py-2.5">
                  <span className="flex items-center gap-1.5 text-[11px] text-blue-100/55">
                    <CalendarDays size={13} />
                    {formatDate(t.created_at)}
                  </span>
                  <ReceiptText size={15} className="text-blue-200/45" />
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
