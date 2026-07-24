import React, { useState, useEffect } from "react";
import {
  Loader2,
  User2,
  History,
  ArrowLeft,
  BadgeIndianRupee,
  CircleCheck,
  Info,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import { API_URL } from "../config";
import axios from "axios";
import { getUserById } from "../components/layout/fetchUser";

const API_BASE_URL = API_URL; // Replace with your actual base URL

const getAuthToken = () => localStorage.getItem("accessToken");

export default function WithdrawRequest() {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("Paytm");
  const [number, setNumber] = useState("");
  const [bankholderName, setBankholderName] = useState("");
  const [account, setAccount] = useState("");
  const [ifsc, setIfsc] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [currentBalance, setCurrentBalance] = useState(null);
  const [minWithdraw, setMinWithdraw] = useState(200);
  const [siteData, setSiteData] = useState(null);
  const userId = localStorage.getItem("userId");
  const [user, setUser] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await axios.get(`${API_URL}/sitedata/get`);
        setSiteData(res.data);
      } catch (error) {
        console.log("Site data fetch error:", error);
      }
    };

    load();
  }, []);

  useEffect(() => {
    async function load() {
      try {
        const res = await axios.get(`${API_URL}/settings/get`);
        const nextSettings = res?.data || {};
        setMinWithdraw(Number(nextSettings.min_withdraw || 0));
      } catch (error) {
        console.log("Settings API Error:", error);
      }
    }

    load();
  }, []);

  // --- Fetch Current Balance and User ID ---

  const fetchBalance = async () => {
    const token = getAuthToken();
    if (!token) return;

    try {
      const response = await fetch(`${API_BASE_URL}/user/balance`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) {
        setCurrentBalance(data.balance);
      }
    } catch (error) {
      console.log("Balance fetch error:", error);
    }
  };

  useEffect(() => {
    fetchBalance();
  }, []);

  // console.log(user);
  useEffect(() => {
    async function fetchUser() {
      const { data, error } = await getUserById(userId);

      if (error) {
        console.log("User fetch error:", error);
      } else {
        setUser(data);
      }
    }

    fetchUser();
  }, [userId]);

  // --- Handle Form Submission ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);
    const token = getAuthToken();

    if (!token) {
      setMessage({ type: "error", text: "Please log in to submit a request." });
      return;
    }

    const withdrawAmount = parseFloat(amount);

    if (Number.isNaN(withdrawAmount) || withdrawAmount < minWithdraw) {
      setMessage({
        type: "error",
        text: `Minimum withdrawal is ₹${minWithdraw}.`,
      });
      return;
    }

    if (withdrawAmount > currentBalance) {
      setMessage({ type: "error", text: "Insufficient balance." });
      return;
    }

    setLoading(true);

    let payload;

    if (method === "Bank Transfer") {
      payload = {
        amount: withdrawAmount,
        method: method,
        account_holder_name: bankholderName,
        account_no: account,
        ifc_code: ifsc,
      };
    } else {
      payload = {
        amount: withdrawAmount,
        method: method,
        number: number,
      };
    }

    try {
      const response = await axios.post(
        `${API_URL}/user-deposit-withdrawal/withdraw/request`,
        new URLSearchParams(payload),
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );

      const data = response.data;
      // console.log(data);
      setMessage({
        type: "success",
        text:
          data.message +
          `. ID: ${data.withdrawal_id.substring(
            0,
            8
          )}... Your request is now pending review.`,
      });

      setAmount("");
      setNumber("");
      setCurrentBalance((cb) =>
        typeof data.available_balance === "number"
          ? data.available_balance
          : cb - withdrawAmount
      );
    } catch (error) {
      if (error.response) {
        // Server responded
        const errText =
          error.response.data?.detail ||
          "Request failed. Check balance and withdrawal limits.";

        setMessage({ type: "error", text: errText });
      } else {
        // Network error
        setMessage({
          type: "error",
          text: "Network error. Could not connect to server.",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const paymentMethods = ["Paytm", "Google Pay", "PhonePe", "Bank Transfer"];

  return (
    <div className="mx-auto max-w-md pb-60 font-sans text-white">
      <div className="relative flex w-full items-center justify-between bg-gradient-to-b from-[#06152d] to-[#071b3b]/70 py-2 shadow-lg shadow-black/20">
        <button
          onClick={() => window.history.back()}
          className="z-10 ml-2 rounded-full p-2 transition hover:bg-white/10"
          aria-label="Go back"
        >
          <ArrowLeft size={22} />
        </button>
        <h2 className="absolute flex w-full items-center justify-center px-4 py-2 text-base font-bold">
          <span className="tracking-wide">Withdraw Funds</span>
        </h2>
        <a
          href="/withdrawal-history"
          className="z-10 mr-2 rounded-full p-2 text-blue-200 transition hover:bg-white/10"
          aria-label="Withdrawal history"
        >
          <History size={21} />
        </a>
      </div>

      {/* Balance Info */}
      <div className="mx-3 mb-4 mt-3 overflow-hidden rounded-2xl border border-blue-200/20 bg-gradient-to-br from-[#294878] via-[#203b69] to-[#172f59] p-4 shadow-xl shadow-black/20">
        <div className="flex items-start justify-between">
          <div>
            <p className="flex items-center gap-1.5 text-sm capitalize text-blue-100/70">
              <User2 size={15} /> {user?.username || "User"}
            </p>
            <p className="mt-3 text-xs font-medium uppercase tracking-wider text-blue-100/45">
              Available Balance
            </p>
            <p className="mt-0.5 text-3xl font-extrabold text-emerald-300">
              ₹{Number(currentBalance || 0).toFixed(2)}
            </p>
          </div>
          <span className="rounded-2xl border border-emerald-300/20 bg-emerald-400/10 p-3 text-emerald-300">
            <WalletCards size={24} />
          </span>
        </div>
        <div className="mt-3 flex items-center gap-1.5 rounded-xl border border-white/5 bg-[#102747]/45 px-3 py-2 text-xs text-blue-100/65">
          <Info size={14} />
          Minimum withdrawal: <b className="text-white">₹{minWithdraw}</b>
        </div>
      </div>

      {/* Message Display */}
      {message && (
        <div
          className={`mx-3 mb-4 flex items-start gap-2 rounded-xl border p-3 text-sm ${
            message.type === "success"
              ? "border-green-300/15 bg-green-600/15 text-green-300"
              : "border-red-300/15 bg-red-600/15 text-red-300"
          }`}
        >
          {message.type === "success" ? <CircleCheck size={18} /> : <Info size={18} />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Withdrawal Form */}
      <form
        onSubmit={handleSubmit}
        className="mx-3 space-y-4 rounded-2xl border border-blue-200/20 bg-gradient-to-br from-[#294878] via-[#203b69] to-[#172f59] p-4 shadow-xl shadow-black/20"
      >
        <div className="flex items-center gap-2 border-b border-blue-200/10 pb-3">
          <span className="rounded-lg bg-blue-400/15 p-2 text-blue-200">
            <BadgeIndianRupee size={18} />
          </span>
          <div>
            <h3 className="text-sm font-bold">Withdrawal Details</h3>
            <p className="text-[11px] text-blue-100/50">Fill in your payment information</p>
          </div>
        </div>

        {/* Amount Input */}
        <div>
          <label htmlFor="amount" className="mb-1.5 block text-xs font-semibold text-blue-100/75">
            Amount (₹)
          </label>
          <div className="relative">
            <BadgeIndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-600" size={18} />
            <input
              type="number"
              id="amount"
              placeholder={`Minimum ₹${minWithdraw}`}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-xl border border-blue-200/25 bg-white py-3.5 pl-10 pr-4 font-semibold text-[#132a50] outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20"
              min={minWithdraw}
              disabled={loading}
            />
          </div>
        </div>

        {/* Payment Method Selection */}
        <div>
          <label htmlFor="method" className="mb-1.5 block text-xs font-semibold text-blue-100/75">
            Payment Method
          </label>
          <select
            id="method"
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className="w-full rounded-xl border border-blue-200/15 bg-[#102747]/70 p-3.5 text-white outline-none transition focus:border-blue-300/60 focus:ring-2 focus:ring-blue-400/15"
            disabled={loading}
          >
            {paymentMethods.map((m) => (
              <option key={m} value={m} className="">
                {m}
              </option>
            ))}
          </select>
        </div>

        {/* Payment Number/ID Input */}
        {/* Payment Number / UPI ID OR Bank Fields */}
        {method !== "Bank Transfer" ? (
          // ---------- UPI / Wallet Section ----------
          <div>
            <label htmlFor="number" className="mb-1.5 block text-xs font-semibold text-blue-100/75">
              {method} Number / UPI ID
            </label>
            <input
              type="text"
              id="number"
              placeholder={`Enter your ${method} number or UPI ID`}
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              className="w-full rounded-xl border border-blue-200/15 bg-[#102747]/70 p-3.5 text-white outline-none transition placeholder:text-blue-100/35 focus:border-blue-300/60 focus:ring-2 focus:ring-blue-400/15"
              required
              disabled={loading}
            />
          </div>
        ) : (
          // ---------- BANK TRANSFER SECTION ----------
          <>
            {/* Holder Name */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-blue-100/75">
                Bank Holder Name
              </label>
              <input
                type="text"
                placeholder="Enter account holder name"
                value={bankholderName}
                onChange={(e) => setBankholderName(e.target.value)}
                className="w-full rounded-xl border border-blue-200/15 bg-[#102747]/70 p-3.5 text-white outline-none placeholder:text-blue-100/35 focus:border-blue-300/60 focus:ring-2 focus:ring-blue-400/15"
                required
                disabled={loading}
              />
            </div>

            {/* Account Number */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-blue-100/75">
                Account Number
              </label>
              <input
                type="text"
                placeholder="Enter bank account number"
                value={account}
                onChange={(e) => setAccount(e.target.value)}
                className="w-full rounded-xl border border-blue-200/15 bg-[#102747]/70 p-3.5 text-white outline-none placeholder:text-blue-100/35 focus:border-blue-300/60 focus:ring-2 focus:ring-blue-400/15"
                required
                disabled={loading}
              />
            </div>

            {/* IFSC Code */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-blue-100/75">
                IFSC Code
              </label>
              <input
                type="text"
                placeholder="Enter IFSC code"
                value={ifsc}
                onChange={(e) => setIfsc(e.target.value)}
                className="w-full rounded-xl border border-blue-200/15 bg-[#102747]/70 p-3.5 text-white uppercase outline-none placeholder:normal-case placeholder:text-blue-100/35 focus:border-blue-300/60 focus:ring-2 focus:ring-blue-400/15"
                required
                disabled={loading}
              />
            </div>
          </>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={
            loading ||
            Number(amount) < minWithdraw ||
            Number(amount) > currentBalance ||
            (method !== "Bank Transfer"
              ? !number
              : !bankholderName || !account || !ifsc) // Bank Transfer validation
          }
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 py-3.5 font-bold text-white shadow-lg shadow-blue-950/30 transition hover:brightness-110 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Processing...
            </>
          ) : (
            "Submit Withdrawal Request"
          )}
        </button>
      </form>

      <div className="mx-3 mt-4 rounded-2xl border border-blue-200/15 bg-[#17325d]/70 p-4 shadow-lg shadow-black/10">
        <div className="mb-2 flex items-center gap-2 text-sm font-bold text-blue-100">
          <ShieldCheck size={18} className="text-cyan-300" />
          Withdrawal Rules
        </div>
        {siteData?.withdraw_terms_html ? (
          <div
            className="text-sm leading-6 text-blue-50/80"
            dangerouslySetInnerHTML={{
              __html: siteData?.withdraw_terms_html,
            }}
          />
        ) : (
          <span className="text-sm text-blue-50/80">
            <ul className="list-disc space-y-1 pl-5">
              <li>Withdrawal time: 9 AM to 6 PM</li>
              <li>All withdrawals will be processed within 30 minutes</li>
              <li>UPI ID must be correct and verified</li>
            </ul>
          </span>
        )}
      </div>
    </div>
  );
}
