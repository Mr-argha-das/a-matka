import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  LogIn,
  User,
  Power,
  Loader2,
  Smartphone,
  ShieldAlert,
  KeyRound,
  Lock,
} from "lucide-react";
import { API_URL, getWhatsAppUrl, normalizePhoneNumber, openWhatsApp } from "../config";
import logo from "../assets/logo.png";
const API_BASE_URL = API_URL;
import { fetchSiteData } from "../components/layout/fetchSiteData";

// Spinner
const LoadingSpinner = () => <Loader2 className="animate-spin h-5 w-5 mr-2" />;

export default function Login() {
  const [mobile, setMobile] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [shake, setShake] = useState(false);
  const [site, setSite] = useState(null);
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [password, setPassword] = useState("");
  const [authMode, setAuthMode] = useState("otp");
  const whatsappNumber = normalizePhoneNumber(site?.whatsapp_number);
  useEffect(() => {
    const stored = localStorage.getItem("accessToken");
    if (stored) {
      setMessage({ type: "info", text: "You are already logged in!" });
    }
  }, []);

  const showError = (text) => {
    setMessage({ type: "error", text });
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const sendOtp = async () => {
    if (mobile.length !== 10) {
      showError("Enter a valid 10-digit mobile number.");
      return;
    }
    setIsLoading(true);
    setMessage(null);
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/send-otp`, {
        mobile,
        purpose: "login",
      });
      setOtpSent(true);
      setMessage({ type: "success", text: response.data?.message || "OTP sent successfully" });
    } catch (err) {
      showError(err.response?.data?.detail || "Unable to send OTP");
    } finally {
      setIsLoading(false);
    }
  };

  const completeLogin = (data) => {
    localStorage.setItem("accessToken", data.access_token);
    localStorage.setItem("userId", data.userId);
    setMessage({ type: "success", text: "Login Successful!" });
    setTimeout(() => {
      window.location.href = "/";
    }, 1200);
  };

  const handlePasswordLogin = async () => {
    if (mobile.length !== 10 || !password) {
      showError("Enter valid mobile number and password.");
      return;
    }
    setIsLoading(true);
    setMessage(null);
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/token`, {
        mobile,
        password,
      });
      completeLogin(response.data);
    } catch (err) {
      showError(err.response?.data?.detail || "Incorrect mobile or password");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!mobile || mobile.length !== 10 || !otpSent || !otp) {
      showError("Enter mobile number and the SMS OTP.");
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const otpResponse = await axios.post(`${API_BASE_URL}/auth/verify-otp`, {
        mobile,
        purpose: "login",
        otp,
      });
      const response = await axios.post(
        `${API_BASE_URL}/auth/token`,
        { mobile, otp_token: otpResponse.data.otp_token },
        { headers: { "Content-Type": "application/json" } }
      );

      // console.log(response);
      completeLogin(response.data);
    } catch (err) {
      console.log("LOGIN ERROR: ", err);

      if (err.response) {
        const detail = err.response.data.detail;

        if (typeof detail === "string") {
          showError(detail);
        } else if (Array.isArray(detail)) {
          showError(detail[0].msg || "Invalid credentials");
        } else {
          showError("OTP verification failed. Please try again.");
        }
      } else {
        showError("Server connection failed. Try again.");
      }
    }

    setIsLoading(false);
  };

  const Message = ({ type, text }) => {
    if (!text) return null;

    let bgColor = "theme-alert-info";
    let Icon = ShieldAlert;

    if (type === "error") {
      bgColor = "theme-alert-error";
      Icon = Power;
    }
    if (type === "success") {
      bgColor = "theme-alert-success";
      Icon = LogIn;
    }
    if (type === "info") {
      bgColor = "theme-alert-info";
      Icon = User;
    }

    return (
      <div
        className={`p-4 rounded-md flex items-center gap-3 mt-7 text-sm font-semibold ${bgColor} ${
          type === "error" && shake ? "animate-shake" : ""
        }`}
      >
        <Icon className="h-5 w-5" />
        <span>{text}</span>
      </div>
    );
  };

  useEffect(() => {
    (async () => {
      const data = await fetchSiteData();
      setSite(data);
    })();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <div className="theme-card w-full max-w-md rounded-[32px] px-8 py-10 backdrop-blur">
        <div className="flex items-center justify-center">
          <img
            src={logo}
            className="h-24 w-24 rounded-full place-items-center mb-7 shadow-[0_0_28px_rgba(96,165,250,0.3)]"
          />
        </div>
        <p className="text-center text-gray-300 text-sm tracking-[0.18em] uppercase">
          Login to your account
        </p>

        {message && <Message type={message.type} text={message.text} />}

        {/* MOBILE INPUT */}
        <label className="theme-label block mt-7 mb-2">
          Mobile Number
        </label>
        <div className="relative">
          <input
            type="text"
            maxLength={10}
            value={mobile}
            onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))}
            placeholder="Enter 10 digit mobile"
            className="theme-input px-12 py-4"
          />
          <Smartphone className="theme-icon absolute left-4 top-1/2 -translate-y-1/2" />
        </div>

        <div className="my-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-white/15" />
          <span className="text-xs font-bold tracking-[0.2em] text-blue-200">OR</span>
          <div className="h-px flex-1 bg-white/15" />
        </div>

        <div className="grid grid-cols-2 gap-2 rounded-2xl border border-blue-300/25 bg-white/5 p-1.5">
          <button
            type="button"
            onClick={() => {
              setAuthMode("otp");
              setMessage(null);
            }}
            className={`rounded-xl px-3 py-2.5 text-sm font-bold transition ${
              authMode === "otp" ? "bg-blue-500 text-white" : "text-blue-100 hover:bg-white/10"
            }`}
          >
            Login with OTP
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMode("password");
              setMessage(null);
            }}
            className={`rounded-xl px-3 py-2.5 text-sm font-bold transition ${
              authMode === "password" ? "bg-blue-500 text-white" : "text-blue-100 hover:bg-white/10"
            }`}
          >
            Login with Password
          </button>
        </div>

        {authMode === "password" ? (
          <>
            <label className="theme-label block mt-5 mb-2">Password</label>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="theme-input px-12 py-4"
              />
              <Lock className="theme-icon absolute left-4 top-1/2 -translate-y-1/2" />
            </div>
            <button
              type="button"
              onClick={handlePasswordLogin}
              disabled={isLoading || mobile.length !== 10 || !password}
              className="theme-button mt-6 w-full flex items-center justify-center gap-2 py-4 font-bold disabled:opacity-50"
            >
              {isLoading ? <LoadingSpinner /> : <Lock size={19} />}
              Login
            </button>
          </>
        ) : !otpSent ? (
          <button
            type="button"
            onClick={sendOtp}
            disabled={isLoading || mobile.length !== 10}
            className="theme-button mt-6 w-full flex items-center justify-center gap-2 py-4 font-bold disabled:opacity-50"
          >
            {isLoading ? <LoadingSpinner /> : null}
            Send OTP
          </button>
        ) : (
          <>
            <label className="theme-label block mt-5 mb-2">Enter OTP</label>
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                placeholder="Enter SMS OTP"
                className="theme-input px-12 py-4 tracking-[0.35em]"
              />
              <KeyRound className="theme-icon absolute left-4 top-1/2 -translate-y-1/2" />
            </div>
            <button
              type="button"
              onClick={handleLogin}
              disabled={isLoading || !otp}
              className="theme-button mt-6 w-full flex items-center justify-center gap-2 py-4 font-bold disabled:opacity-50"
            >
              {isLoading ? <LoadingSpinner /> : <KeyRound size={19} />}
              Verify OTP
            </button>
            <button
              type="button"
              onClick={sendOtp}
              disabled={isLoading}
              className="mt-3 w-full text-center text-sm font-semibold text-blue-200 underline underline-offset-4 disabled:opacity-50"
            >
              Resend OTP
            </button>
          </>
        )}

        <div className="h-px bg-white/8 mt-9" />

        <p className="text-center text-gray-400 text-sm mt-6">
          Register a new account?{" "}
          <a href="/signup" className="theme-link">
            SignUp
          </a>
        </p>

        <p className="text-center text-gray-400 mt-5 text-sm">
          Need help?{" "}
          <a
            href={getWhatsAppUrl(whatsappNumber)}
            onClick={(e) => {
              e.preventDefault();
              openWhatsApp(whatsappNumber);
            }}
            className="text-[#f6b64b] underline underline-offset-3"
            rel="noreferrer"
          >
            Contact Support
          </a>
        </p>
      </div>

      <style>{`
        @keyframes shake {
          0% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          50% { transform: translateX(4px); }
          75% { transform: translateX(-4px); }
          100% { transform: translateX(0); }
        }
        .animate-shake {
          animation: shake 0.3s ease-in-out;
        }
      `}</style>
    </div>
  );
}
