// src/pages/AddMoney.jsx
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, HistoryIcon, QrCode, Smartphone } from "lucide-react";
import AddMoneyQrTab from "./Admin/Qr/AddMoneyQrTab";
import axios from "axios";
import DepositeByOwn from "./DepositeByOwn";
import { API_URL } from "../config";

export default function AddMoney() {
  const [activeTab, setActiveTab] = useState("auto");

  const [showAutoNotice, setShowAutoNotice] = useState(false);
  const qrRef = useRef(null);

  const [settings, setSettings] = useState(null);

  console.log(settings);

  async function load() {
    try {
      const res = await axios.get(`${API_URL}/settings/get`);

      console.log("siteed", res);
      setSettings(res?.data);
    } catch (error) {
      console.log("Settings API Error:", error);
    }
  }

  useEffect(() => {
    // if (activeTab === "auto") {
    load();
    // }
  }, [activeTab]);

  const goToQrSection = () => {
    setActiveTab("qr");
    setTimeout(() => {
      qrRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 300);
  };

  // Trigger 3-sec notification
  const triggerAutoNotice = () => {
    setShowAutoNotice(true);
    goToQrSection();
    setTimeout(() => setShowAutoNotice(false), 3000);
  };

  return (
    <div className="mx-auto flex max-w-md flex-col items-center pb-22 font-sans">
      <div className="relative flex w-full items-center justify-between bg-gradient-to-b from-[#06152d] to-[#071b3b]/70 py-2 shadow-lg shadow-black/20">
        <button
          onClick={() => window.history.back()}
          className="z-10 ml-2 rounded-full p-2 transition hover:bg-white/10"
          aria-label="Go back"
        >
          <ArrowLeft size={22} />
        </button>
        <h2 className="absolute flex w-full items-center justify-center px-4 py-2 text-base font-bold text-white">
          <span className="tracking-wide">Add Points</span>
        </h2>
        <a
          href="/deposit-history"
          className="z-10 mr-2 rounded-full p-2 text-blue-200 transition hover:bg-white/10"
          aria-label="Deposit history"
        >
          <HistoryIcon size={21} />
        </a>
      </div>

      {/* Tabs */}
      <div className="mx-auto mt-3 flex w-[93%] max-w-md rounded-2xl border border-blue-200/15 bg-[#132d54]/75 p-1.5 shadow-lg shadow-black/10">
        <button
          onClick={() => setActiveTab("auto")}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-center text-xs font-bold transition ${
            activeTab === "auto"
              ? "bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-md"
              : "text-blue-100/50 hover:bg-white/5"
          }`}
        >
          <Smartphone size={15} /> AUTO DEPOSIT
        </button>

        <button
          onClick={() => setActiveTab("qr")}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-center text-xs font-bold transition ${
            activeTab === "qr"
              ? "bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-md"
              : "text-blue-100/50 hover:bg-white/5"
          }`}
        >
          <QrCode size={15} /> QR CODE
        </button>
      </div>

      {/* Auto Tab */}
      {activeTab === "auto" && (
        <DepositeByOwn
          settings={settings}
          onRequestCreated={triggerAutoNotice}
        />
      )}

      {/* QR Code Tab */}
      <div ref={qrRef} className="w-full">
        {activeTab === "qr" && <AddMoneyQrTab settings={settings} />}
      </div>

      {/* SLIDE-UP notification */}
      {showAutoNotice && (
        <div className="fixed bottom-40 left-1/2 text-sm font-medium  animate-fadeIn -translate-x-1/2 bg-green-700 text-white px-4 py-2 rounded-full shadow-lg">
          Pay And Upload Screenshot
        </div>
      )}
    </div>
  );
}
