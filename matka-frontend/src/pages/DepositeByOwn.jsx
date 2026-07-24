import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { IndianRupee, Loader2Icon, Sparkles } from "lucide-react";
import { API_URL } from "../config";
import PaymentReceiveDetails from "../components/layout/PaymentReceiveDetails";

export default function DepositeByOwn({ onRequestCreated }) {
  const [loading, setLoading] = useState(false);
  const [siteData, setSiteData] = useState(null);
  const [settings, setSettings] = useState(null);
  const [pendingTx, setPendingTx] = useState(null);

  const [amount, setAmount] = useState(
    () => localStorage.getItem("add_amount") || ""
  );

  useEffect(() => {
    localStorage.setItem("add_amount", amount);
  }, [amount]);

  const showPopup = (_type, message) => {
    alert(message);
  };

  const normalizeUpiResult = (result) => {
    if (!result) return { status: "FAILED", raw_response: result };

    if (typeof result === "string") {
      const parsed = {};
      result.split("&").forEach((part) => {
        const [key, value] = part.split("=");
        if (key) parsed[key.trim().toLowerCase()] = decodeURIComponent(value || "");
      });

      return {
        status: parsed.status || parsed.txnstatus || parsed.responsecode,
        upi_txn_id: parsed.txnid || parsed.txnref || parsed.transactionid,
        approval_ref_no: parsed.approvalrefno || parsed.approvalref || parsed.rrn,
        raw_response: result,
      };
    }

    return {
      status:
        result.status ||
        result.Status ||
        result.txnStatus ||
        result.responseCode ||
        "FAILED",
      upi_txn_id:
        result.txnId ||
        result.txnid ||
        result.transactionId ||
        result.txnRef ||
        null,
      approval_ref_no:
        result.ApprovalRefNo ||
        result.approvalRefNo ||
        result.approval_ref_no ||
        result.rrn ||
        null,
      raw_response: result,
    };
  };

  const confirmPayment = useCallback(async (txId, result) => {
    const token = localStorage.getItem("accessToken");
    const normalized = normalizeUpiResult(result);

    const res = await axios.post(
      `${API_URL}/payment/confirm-upi`,
      {
        tx_id: txId,
        status: normalized.status,
        upi_txn_id: normalized.upi_txn_id,
        approval_ref_no: normalized.approval_ref_no,
        raw_response: normalized.raw_response,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    localStorage.removeItem("pending_upi_tx_id");
    setPendingTx(null);

    if (res.data.status === "SUCCESS") {
      showPopup("success", "Payment successful. Wallet credited.");
    } else if (res.data.status === "PENDING") {
      showPopup("info", "Payment submitted. Status is pending.");
    } else {
      showPopup("error", "Payment failed.");
    }
  }, []);

  useEffect(() => {
    window.handleUpiPaymentResult = async (result) => {
      const txId = pendingTx || localStorage.getItem("pending_upi_tx_id");
      if (!txId) return;

      try {
        await confirmPayment(txId, result);
      } catch (error) {
        console.log("UPI confirm error:", error);
        showPopup("error", error.response?.data?.detail || "Payment status update failed");
      }
    };

    return () => {
      delete window.handleUpiPaymentResult;
    };
  }, [confirmPayment, pendingTx]);

  const openUpiApp = async (paymentData) => {
    const payload = {
      txn_id: paymentData.tx_id,
      amount: paymentData.amount,
      upi_id: paymentData.upi_id,
      upi_link: paymentData.upi_link,
    };

    if (window.flutter_inappwebview?.callHandler) {
      return window.flutter_inappwebview.callHandler("startUpiPayment", payload);
    }

    if (window.StartUpiPayment?.postMessage) {
      window.StartUpiPayment.postMessage(JSON.stringify(payload));
      return null;
    }

    window.location.href = paymentData.upi_link;
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!amount || Number(amount) < settings?.min_deposit) {
      showPopup("error", `Minimum deposit is Rs ${settings?.min_deposit}`);
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem("accessToken");

      const res = await axios.post(
        `${API_URL}/payment/create-order`,
        {
          amount: parseFloat(amount),
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      localStorage.setItem("pending_upi_tx_id", res.data.tx_id);
      setPendingTx(res.data.tx_id);

      const upiResult = await openUpiApp(res.data);
      if (upiResult) {
        await confirmPayment(res.data.tx_id, upiResult);
      } else {
        showPopup(
          "info",
          "UPI app opened. Complete payment and wait for status update."
        );
      }

      setAmount("");
      onRequestCreated?.();
    } catch (error) {
      console.log(error);
      showPopup("error", error.response?.data?.detail || "Something went wrong!");
    }

    setLoading(false);
  };

  useEffect(() => {

    async function load() {

      try {

        const res = await axios.get(`${API_URL}/settings/get`);
        const sited = await axios.get(`${API_URL}/sitedata/get`);

        setSiteData(sited?.data);
        setSettings(res?.data);

      } catch (error) {

        console.log("Settings API Error:", error);

      }

    }

    load();

  }, []);

  return (

    <div className="w-full">

      <form
        onSubmit={handleSubmit}
        className="mx-auto mt-4 w-[93%] rounded-[24px] border border-blue-200/20 bg-gradient-to-br from-[#294878] via-[#203b69] to-[#172f59] p-4 shadow-xl shadow-black/20"
      >

        <div className="mb-3 flex items-center gap-2">
          <span className="rounded-lg bg-blue-400/15 p-2 text-blue-200">
            <Sparkles size={17} />
          </span>
          <div>
            <h2 className="text-sm font-bold text-white">Add Points</h2>
            <p className="text-[11px] text-blue-100/55">Enter amount and pay securely</p>
          </div>
        </div>

        <PaymentReceiveDetails siteData={siteData} />

        <div className="relative mb-3">
          <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-600" size={18} />
          <input
            type="number"
            placeholder={`Add amount (Min ₹${settings?.min_deposit || 0})`}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full rounded-2xl border border-blue-200/30 bg-white py-3.5 pl-10 pr-4 text-lg font-semibold text-[#132a50] outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20"
          />
        </div>

        <div className="grid grid-cols-3 gap-3 mb-4">

          {[300, 500, 1000, 2000, 5000].map((amt) => (

            <button
              key={amt}
              type="button"
              onClick={() => setAmount(amt)}
              className={`rounded-xl border py-2.5 font-bold transition ${
                Number(amount) === amt
                  ? "border-cyan-300/50 bg-cyan-400/15 text-cyan-100"
                  : "border-blue-200/15 bg-[#102747]/45 text-white hover:bg-blue-400/10"
              }`}
            >

              {amt}

            </button>

          ))}

        </div>

        <button
          disabled={
            loading ||
            !settings?.min_deposit ||
            amount < settings?.min_deposit
          }
          className={`w-full
            flex items-center justify-center rounded-2xl py-3.5 font-extrabold text-white transition
            ${
              loading || amount < settings?.min_deposit
                ? "cursor-not-allowed bg-blue-950/50 opacity-50"
                : "bg-gradient-to-r from-blue-600 to-cyan-500 shadow-lg shadow-blue-950/30 hover:brightness-110 active:scale-[0.98]"
            }`}
        >

          {loading ? <Loader2Icon className="animate-spin" /> : "Proceed"}

        </button>

      </form>

      {siteData?.add_money_html ? (

        <div
          className="text-gray-200 mt-5 text-sm mx-5"
          dangerouslySetInnerHTML={{
            __html: siteData?.add_money_html,
          }}
        />

      ) : (

        <div className="mt-4 mx-5 text max-w-md text-sm text-gray-200 leading-6"></div>

      )}

    </div>

  );
}
