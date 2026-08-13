// src/pages/AddMoney.jsx
import { useEffect, useState } from "react";
import { ArrowLeft, HistoryIcon } from "lucide-react";
import AddMoneyQrTab from "./Admin/Qr/AddMoneyQrTab";
import axios from "axios";
import { API_URL } from "../config";

export default function AddMoney() {
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
    load();
  }, []);

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

      <div className="w-full">
        <AddMoneyQrTab settings={settings} />
      </div>
    </div>
  );
}
