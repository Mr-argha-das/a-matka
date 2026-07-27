import React from "react";
import { Play, Info, X } from "lucide-react";
import { FaChartLine } from "react-icons/fa6";

export default function MarketList({ markets }) {
  const handleClosedMarket = () => {
    if (window.HapticFeedback?.postMessage) {
      window.HapticFeedback.postMessage("closed-market");
    } else if ("vibrate" in navigator) {
      navigator.vibrate([120, 60, 120]);
    }
  };

  return (
    <div className="space-y-3">
      {markets.map((mkt) => (
        <div
          key={mkt.id}
          className="theme-panel w-full rounded-[24px] backdrop-blur-2xl"
        >
          <div className="rounded-[24px] p-4 text-white">
            <div className="flex justify-between items-center mb-2">
              <div className="flex items-center gap-1">
                <h2 className="text-base font-semibold uppercase tracking-wide">
                  {mkt.name}
                </h2>
                <Info
                  size={18}
                  className="bg-gray-300 rounded-full text-black"
                />
              </div>

              <span
                className={`text-xs font-semibold ${
                  mkt.status === true ? "text-green-400" : "text-red-400"
                }`}
              >
                {mkt.status === true ? "Market Running" : "Market Closed"}
              </span>
            </div>

            {/* RESULT */}
            <div className="mb-3 border-b border-dashed border-red-400/20"></div>

            <div className="flex justify-between items-center text-xs text-gray-300">
              <div>
                <h3 className="mb-2 text-2xl font-extrabold tracking-wider text-red-400">
                  <td className="">
                    {mkt.open_panna}-{mkt.open_digit}
                  </td>
                  <td className="">
                    {mkt.close_digit}-{mkt.close_panna}
                  </td>
                </h3>

                <div className="flex gap-7">
                  <p>
                    <span className="text-gray-400">Open Time:</span>
                    <span className="block text-white font-medium">
                      {mkt.openTime}
                    </span>
                  </p>

                  <p>
                    <span className="text-gray-400">Close Time:</span>
                    <span className="block text-white font-medium">
                      {mkt.closeTime}
                    </span>
                  </p>
                </div>
              </div>

              <a href={`/charts/${mkt.id}`} className="text-[#f6b64b]">
                <FaChartLine size={26} />
              </a>

              <div className="flex flex-col items-center gap-1">
                {mkt.status === true ? (
                  <a
                    href={`/play/${mkt.id}`}
                    aria-label={`Play ${mkt.name}`}
                    className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-blue-400 bg-blue-500/15"
                  >
                    <Play className="text-blue-300" size={18} />
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={handleClosedMarket}
                    aria-label={`${mkt.name} market closed`}
                    title="Market Closed"
                    className="flex h-10 w-10 cursor-not-allowed items-center justify-center rounded-full border-2 border-red-400 bg-red-500/15"
                  >
                    <X className="text-red-400" size={22} strokeWidth={3} />
                  </button>
                )}
                <span className="text-[14px] font-semibold">
                  {mkt.status === true ? "Play" : "Closed"}
                </span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
