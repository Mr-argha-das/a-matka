import React from "react";
import { Menu } from "lucide-react";
import logo from "../../assets/logo.png";
export default function Header({ setSidebarOpen }) {
  return (
    <div className="fixed top-0 flex items-center justify-between bg-[#0b244c]/95 px-4 py-3 shadow-[0_8px_30px_rgba(2,8,23,0.3)] backdrop-blur-xl left-0 right-0 z-50 border-b border-blue-300/20">
      <div className="flex items-center gap-3">
        <button
          onClick={() => setSidebarOpen((p) => !p)}
          className="px-2 py-1.5 rounded-md  border lg:hidden md:hidden block hover:bg-gray-700/30"
        >
          <Menu size={20} />
        </button>
        <h1 className="text-lg font-semibold text-white">Admin Dashboard</h1>
      </div>
      <img src={logo} alt="Admin" className="w-10 h-10 rounded-full " />
    </div>
  );
}
