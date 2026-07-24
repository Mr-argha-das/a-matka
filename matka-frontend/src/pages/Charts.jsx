// Updated Chats.jsx UI with clean layout and no extra images
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { API_URL } from "../config";
import dayjs from "dayjs";
import { ArrowLeft } from "lucide-react";

export default function Chats() {
  const [marketName, setMarketName] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [noData, setNoData] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const { marketId } = useParams();

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      setNoData(false);
      try {
        const url = marketId
          ? `${API_URL}/api/admin/market-chart?market_id=${marketId}`
          : `${API_URL}/api/admin/market-chart`;

        const res = await axios.get(url);

        console.log("charts", res);
        const data = Array.isArray(res.data)
          ? res.data
          : res.data.chart || res.data.results || [];

        if (!data.length) {
          setNoData(true);
          setItems([]);
        } else {
          const normalized = data.map((it) => ({
            ...it,
            date: it.date,
            open_panna: (it.open_panna || "000").toString().padStart(3, "0"),
            close_panna: (it.close_panna || "000").toString().padStart(3, "0"),
            open_digit: (it.open_digit || "-").toString(),
            close_digit: (it.close_digit || "-").toString(),
          }));

          normalized.sort((a, b) => (a.date > b.date ? 1 : -1));

          setItems(normalized);
          setMarketName(normalized[0]?.market_name || "Market");
          const latest = normalized[normalized.length - 1]?.date;
          setSelectedMonth(dayjs(latest).format("MM"));
          setSelectedYear(dayjs(latest).format("YYYY"));
        }
      } catch (err) {
        console.log(err);
        setNoData(true);
      } finally {
        setLoading(false);
      }
    };

    fetch();
  }, [marketId]);

  const availableYears = [...new Set(items.map((item) => dayjs(item.date).format("YYYY")))].sort().reverse();
  const months = [
    ["01", "January"],
    ["02", "February"],
    ["03", "March"],
    ["04", "April"],
    ["05", "May"],
    ["06", "June"],
    ["07", "July"],
    ["08", "August"],
    ["09", "September"],
    ["10", "October"],
    ["11", "November"],
    ["12", "December"],
  ];
  const monthlyItems = items.filter((item) => {
    const date = dayjs(item.date);
    return date.format("YYYY") === selectedYear && date.format("MM") === selectedMonth;
  });
  const rows = [];
  for (let i = 0; i < monthlyItems.length; i += 6) rows.push(monthlyItems.slice(i, i + 6));

  const getDayLabel = (d) => dayjs(d).format("ddd");

  if (loading)
    return <div className="text-center text-white p-6">Loading...</div>;

  if (noData)
    return (
      <div className="text-center text-white p-6 text-lg font-semibold">
        No data available
      </div>
    );

  return (
    <div className="min-h-screen bg-[#edf7fd] text-black">
      {/* Header */}

      <div className="relative mx-auto flex w-full max-w-2xl items-center justify-between bg-[#0b244c] py-3 text-white">
        <button
          onClick={() => window.history.back()}
          className="p-2 pl-4 z-10 rounded-full  transition"
        >
          <ArrowLeft size={22} />
        </button>

        <h2 className="absolute z-0 flex w-full items-center justify-center px-12 text-sm font-bold tracking-wide">
          <span>
            {marketName.toUpperCase()}
          </span>
        </h2>
        <a className="pr-4 z-10"></a>
      </div>

      {/* Calendar Grid */}
      <div>
        <div className="mx-auto mt-4 max-w-2xl px-2 pb-8 sm:px-4">
          <div className="mb-3 rounded border border-slate-300 bg-white p-2 shadow-sm">
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-600">
              Monthly Result Card
            </label>
            <div className="grid grid-cols-[1fr_0.72fr_auto] items-center gap-2">
              <select
                aria-label="Select result month"
                value={selectedMonth}
                onChange={(event) => setSelectedMonth(event.target.value)}
                className="min-w-0 rounded border border-slate-400 bg-white px-2 py-1.5 text-xs font-semibold text-black"
              >
                {months.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              <select
                aria-label="Select result year"
                value={selectedYear}
                onChange={(event) => setSelectedYear(event.target.value)}
                className="min-w-0 rounded border border-slate-400 bg-white px-2 py-1.5 text-xs font-semibold text-black"
              >
                {availableYears.map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              <span className="whitespace-nowrap rounded bg-blue-50 px-2 py-1.5 text-[10px] font-semibold text-blue-800">
                {monthlyItems.length} results
              </span>
            </div>
          </div>
          <div className="border-l border-t border-slate-500 bg-white shadow-sm">
            {[...rows].reverse().map((week, idx) => (
              <div key={idx} className="grid grid-cols-6">
                {[...week].reverse().map((item, i) => {
                  const openPanna = item.open_panna === "000" ? "XXX" : item.open_panna;
                  const closePanna = item.close_panna === "000" ? "XXX" : item.close_panna;
                  const jodi = `${item.open_digit}${item.close_digit}`;
                  const isDouble = item.open_digit !== "-" && item.open_digit === item.close_digit;
                  return (
                  <div
                    key={`${item.date}-${i}`}
                    className={`min-w-0 border-b border-r border-slate-500 bg-white ${isDouble ? "text-red-600" : "text-black"}`}
                  >
                    <div className="border-b border-slate-400 px-0.5 py-0.5 text-center text-black">
                      <div className="text-[8px] font-bold leading-tight sm:text-[10px]">
                        {getDayLabel(item.date)}
                      </div>
                      <div className="whitespace-nowrap text-[6px] font-semibold leading-tight sm:text-[8px]">
                        ({dayjs(item.date).format("D-MMM-YYYY")})
                      </div>
                    </div>
                    <div className="grid min-h-10 grid-cols-[1fr_1.25fr_1fr] items-center px-0.5 py-0.5 sm:min-h-12">
                      <div className="flex flex-col items-center text-[8px] font-semibold leading-[1.05] sm:text-[10px]">
                        {[...openPanna].map((digit, digitIndex) => <span key={digitIndex}>{digit}</span>)}
                      </div>
                      <div className="text-center text-sm font-black leading-none sm:text-lg">
                        {jodi.includes("-") ? "--" : jodi}
                      </div>
                      <div className="flex flex-col items-center text-[8px] font-semibold leading-[1.05] sm:text-[10px]">
                        {[...closePanna].map((digit, digitIndex) => <span key={digitIndex}>{digit}</span>)}
                      </div>
                    </div>
                  </div>
                  );
                })}
                {week.length < 6 && Array.from({ length: 6 - week.length }).map((_, emptyIndex) => (
                  <div key={`empty-${emptyIndex}`} className="border-b border-r border-slate-500 bg-white" />
                ))}
              </div>
            ))}
          </div>
          {monthlyItems.length === 0 && (
            <div className="rounded border border-slate-300 bg-white p-6 text-center text-slate-500">
              No results available for this month.
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="pb-6 text-center text-xs text-slate-500">
        Monthly Result Chart
      </div>
    </div>
  );
}
