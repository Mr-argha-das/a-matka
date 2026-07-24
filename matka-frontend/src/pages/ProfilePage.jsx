import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";
import {
  ArrowLeft,
  CalendarDays,
  LoaderCircle,
  Pencil,
  Phone,
  Save,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { API_URL } from "../config";

const API_BASE = `${API_URL}/user`;

export default function ProfilePage() {
  const [user, setUser] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [username, setUsername] = useState("");
  const [mobile, setMobile] = useState("");

  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  const token = localStorage.getItem("accessToken");

  // ---------------------------
  // GET PROFILE
  // ---------------------------

  const fetchProfile = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE}/profile2`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setUser(res?.data);
      setUsername(res?.data?.username || "");
      setMobile(res?.data?.mobile || "");
    } catch (err) {
      console.log("Profile load error:", err);
      setMsg(err.response?.data?.detail || "Profile load failed");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const updateProfile = async () => {
    setMsg("");

    if (!username.trim() || !mobile.trim()) {
      setMsg("All fields are required!");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("username", username);
      formData.append("mobile", mobile);

      await axios.put(`${API_BASE}/profile`, formData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setMsg("Profile Updated Successfully ✔");
      setEditMode(false);

      fetchProfile();
    } catch (err) {
      setMsg("Update failed!");
      console.log(err);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center gap-2 text-blue-100">
        <LoaderCircle className="animate-spin text-cyan-300" size={22} />
        Loading profile...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center text-white">
        <p className="text-lg font-semibold">Profile load nahi ho paayi.</p>
        <p className="mt-2 text-sm text-gray-400">{msg}</p>
        <button
          onClick={fetchProfile}
          className="mt-5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 px-5 py-2.5 text-sm font-bold text-white"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center">
      {/* Header */}
      <div className="relative flex w-full items-center justify-between bg-gradient-to-b from-[#06152d] to-[#071b3b]/70 py-2 shadow-lg shadow-black/20">
        <button
          onClick={() => window.history.back()}
          className="z-10 ml-2 rounded-full p-2 text-white transition hover:bg-white/10"
          aria-label="Go back"
        >
          <ArrowLeft size={22} />
        </button>

        <h2 className="absolute flex w-full items-center justify-center px-4 py-2 text-base font-bold text-white">
          <span className="tracking-wide">My Profile</span>
        </h2>

        <span className="z-10 mr-4 text-blue-200">
          <UserRound size={20} />
        </span>
      </div>

      {/* Profile Card */}
      <div className="relative mt-5 w-[93%] max-w-md overflow-hidden rounded-[24px] border border-blue-200/20 bg-gradient-to-br from-[#294878] via-[#203b69] to-[#172f59] p-4 shadow-xl shadow-black/20">
        <div className="absolute -right-12 -top-14 h-40 w-40 rounded-full bg-cyan-400/10 blur-2xl" />
        {/* Edit Button */}

        <button
          onClick={() => (editMode ? updateProfile() : setEditMode(true))}
          className={`absolute right-4 top-4 z-10 flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition ${
            editMode
              ? "border-emerald-300/20 bg-emerald-400/10 text-emerald-200 hover:bg-emerald-400/20"
              : "border-blue-200/15 bg-white/5 text-blue-100 hover:bg-white/10"
          }`}
        >
          {editMode ? (
            <>
              <Save size={15} /> Save
            </>
          ) : (
            <>
              <Pencil size={15} /> Edit
            </>
          )}
        </button>

        {/* Avatar */}
        <div className="relative flex flex-col items-center pt-3">
          <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-blue-200/25 bg-gradient-to-br from-blue-500 to-cyan-400 text-4xl font-extrabold text-white shadow-xl shadow-blue-950/35 ring-4 ring-white/5">
            {user.username.charAt(0).toUpperCase()}
          </div>
          <h3 className="mt-3 text-lg font-bold text-white">{user.username}</h3>
          <span className="mt-1 inline-flex items-center gap-1 rounded-full border border-emerald-300/15 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-200">
            <ShieldCheck size={12} /> Verified Account
          </span>
        </div>

        {msg && (
          <p
            className={`mt-3 rounded-xl border p-2.5 text-center text-xs font-semibold ${
              msg.toLowerCase().includes("success")
                ? "border-green-300/15 bg-green-400/10 text-green-300"
                : "border-red-300/15 bg-red-400/10 text-red-300"
            }`}
          >
            {msg}
          </p>
        )}

        <div className="mt-5 space-y-3">
          {/* Username */}
          <div className="rounded-xl border border-blue-200/10 bg-[#102747]/55 p-3">
            {editMode ? (
              <>
                <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-blue-100/50">
                  <UserRound size={13} /> Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full rounded-xl border border-blue-200/20 bg-[#0c2141] p-2.5 text-white outline-none focus:border-blue-300/60 focus:ring-2 focus:ring-blue-400/15"
                />
              </>
            ) : (
              <ProfileDetail icon={UserRound} label="Username" value={user.username} />
            )}
          </div>

          {/* Mobile */}
          <div className="rounded-xl border border-blue-200/10 bg-[#102747]/55 p-3">
            {editMode ? (
              <>
                <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-blue-100/50">
                  <Phone size={13} /> Mobile
                </label>
                <input
                  type="text"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  className="w-full rounded-xl border border-blue-200/20 bg-[#0c2141] p-2.5 text-white outline-none focus:border-blue-300/60 focus:ring-2 focus:ring-blue-400/15"
                />
              </>
            ) : (
              <ProfileDetail icon={Phone} label="Mobile" value={user.mobile} />
            )}
          </div>

          {/* Created At */}
          <div className="rounded-xl border border-blue-200/10 bg-[#102747]/55 p-3">
            <ProfileDetail
              icon={CalendarDays}
              label="Joined On"
              value={new Date(user.created_at?.$date ?? user.created_at)
                .toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })
                .replace(",", "")}
            />
          </div>
        </div>
      </div>

    </div>
  );
}

function ProfileDetail({ icon, label, value }) {
  return (
    <div className="flex items-center gap-3">
      <span className="rounded-lg bg-blue-400/10 p-2 text-blue-200">
        {React.createElement(icon, { size: 17 })}
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-100/45">
          {label}
        </p>
        <p className="truncate text-sm font-bold text-white">{value || "—"}</p>
      </div>
    </div>
  );
}
