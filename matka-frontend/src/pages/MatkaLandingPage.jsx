import React, { useState, useEffect, useCallback } from "react";
import { Play, Star, Wallet, WalletCards } from "lucide-react";
import { BsWhatsapp } from "react-icons/bs";
import { API_URL, getWhatsAppUrl, normalizePhoneNumber, openWhatsApp } from "../config";
import axios from "axios";
import MarketList from "./Client/MarketList";
import { fetchSiteData } from "../components/layout/fetchSiteData";
import NotificationModal from "../components/layout/NotificationModal";
import { SiMarketo } from "react-icons/si";

export default function Dashboard() {
  const token = localStorage.getItem("accessToken");
  const [markets, setMarkets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [site, setSite] = useState(null);
  const whatsappNumber = normalizePhoneNumber(site?.whatsapp_number);
  const [error, setError] = useState(null);

  // Redirect if NOT logged in
  useEffect(() => {
    if (!token) {
      window.location.href = "/login";
    }
  }, [token]);

  const displayDigit = (v) => (!v || v === "-" ? "X" : v);
  const displayPanna = (v) => (!v || v === "-" ? "XXX" : v);

  const fetchMarkets = useCallback(async (silent = false) => {
    try {
      if (!silent) setIsLoading(true);

      const res = await axios.get(`${API_URL}/api/admin/user/markets`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const list = res.data.data.map((m) => {
        const today = m.today_result || {};

        return {
          id: m._id?.$oid,
          name: m.name,
          openTime: m.open_time,
          closeTime: m.close_time,

          status: m.status,
          // If backend adds final_result later
          result: m.final_result || "xxx-x-xxx",
          open_digit: displayDigit(today.open_digit),
          close_digit: displayDigit(today.close_digit),
          open_panna: displayPanna(today.open_panna),
          close_panna: displayPanna(today.close_panna),
        };
      });

      setMarkets(list);

      console.log("list", list);
    } catch (err) {
      console.error(err);
      setError("Failed to load markets");
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchMarkets();
    const refreshId = window.setInterval(() => {
      if (document.visibilityState === "visible") fetchMarkets(true);
    }, 10000);
    return () => window.clearInterval(refreshId);
  }, [fetchMarkets]);

  useEffect(() => {
    (async () => {
      const data = await fetchSiteData();
      console.log("data ======", data);
      setSite(data);
    })();
  }, []);

  const [siteData, setSiteData] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get(`${API_URL}/sitedata/get`);
        setSiteData(res.data);

        const alreadyShown = localStorage.getItem("notice_shown");

        // Show modal only if notice_board_html exists and not shown before
        if (res.data.notice_board_html && !alreadyShown) {
          setShowModal(true);
        }
      } catch (err) {
        console.log(err);
      }
    };

    fetchData();
  }, []);

  const handleClose = () => {
    setShowModal(false);
    localStorage.setItem("notice_shown", "true"); // show only once
  };

  return (
    <div className="h-full overflow-hidden font-sans text-white">
      <div className="mx-auto flex h-full min-h-0 max-w-md flex-col overflow-hidden">
        {/* FIXED DASHBOARD ACTIONS */}
        <div className="theme-card z-10 flex shrink-0 flex-col items-center rounded-b-[30px] border-x-0 border-t-0 px-4 py-4 text-sm shadow-lg shadow-black/15">
          <div className="w-full flex justify-between items-center">
            <a
              href="/add-points"
              className="flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-2 text-sm font-semibold hover:bg-white/20"
            >
              <Wallet size={18} /> Add Funds
            </a>

            <a
              href="/withdrawal-request"
              className="flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3 py-2 text-sm font-semibold hover:bg-white/20"
            >
              <WalletCards size={18} /> Withdraw
            </a>
          </div>

          <div
            className="mt-4 w-full overflow-hidden rounded-full border border-white/10 bg-white/[0.06] p-1 px-2 text-center backdrop-blur-2xl 
               whitespace-nowrap inline-block"
          >
            <p
              className="w-full"
              style={{
                animation: " marquee 8s linear infinite",
              }}
            >
              {site?.dashboard_notification_line}
            </p>
          </div>

          <div className="flex gap-3 w-full justify-between">
            {/* <a
              href="/how-to-play"
              className="backdrop-blur-md px-3 py-1 mt-3 bg-white/30 flex items-center gap-2 text-sm rounded-full hover:bg-gray-700"
            >
              <Play size={15} /> How to Play
            </a> */}

            <a
              href={`/starline`}
              className="mt-3 flex items-center gap-2 rounded-full border border-white/20 px-3 py-2 text-sm font-semibold hover:border-blue-200 hover:bg-white/10"
            >
              <Star size={18} /> Starline
            </a>

            <a
              href={getWhatsAppUrl(whatsappNumber)}
              onClick={(e) => {
                e.preventDefault();
                openWhatsApp(whatsappNumber);
              }}
              rel="noopener noreferrer"
              className="mt-3 flex items-center gap-2 rounded-full border border-white/20 px-3 py-2 text-sm font-semibold hover:border-blue-200 hover:bg-white/10"
            >
              <BsWhatsapp size={18} /> Whatsapp
            </a>
          </div>
        </div>

        {/* MARKET LIST */}
        <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3 pb-28 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {isLoading && (
            <p className="text-center text-cyan-400">Loading markets...</p>
          )}
          {error && (
            <div className="mt-4 rounded-[22px] border border-red-500 bg-red-800/40 p-4 text-center">
              <p className="text-red-300">{error}</p>
            </div>
          )}
          {!isLoading && !error && <MarketList markets={markets} />}
        </main>
      </div>

      {showModal && (
        <NotificationModal
          html={siteData?.notice_board_html}
          onClose={handleClose}
        />
      )}

    </div>
  );
}
