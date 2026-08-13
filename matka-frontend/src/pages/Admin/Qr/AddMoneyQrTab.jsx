import React, { useEffect, useState } from "react";
import axios from "axios";
import { Camera, CheckCircle2, IndianRupee, QrCode, Upload } from "lucide-react";
import { API_URL } from "../../../config";
import PaymentReceiveDetails from "../../../components/layout/PaymentReceiveDetails";

const API_BASE = `${API_URL}/user-deposit-withdrawal`;
const MAX_SCREENSHOT_SIZE = 10 * 1024 * 1024;

const AddMoneyQrTab = () => {
  const token = localStorage.getItem("accessToken");

  const [currentQR, setCurrentQR] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [utrNumber, setUtrNumber] = useState("");
  const [uploading, setUploading] = useState(false);
  const [amount, setAmount] = useState(
    () => localStorage.getItem("add_amount") || ""
  );
  const [showSuccess, setShowSuccess] = useState(false);
  const [siteData, setSiteData] = useState(null);
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await axios.get(`${API_URL}/settings/get`);
        const sited = await axios.get(`${API_URL}/sitedata/get`);

        console.log("siteed", sited);
        setSiteData(sited?.data);
        setSettings(res?.data);
      } catch (error) {
        console.log("Settings API Error:", error);
      }
    }

    load();
  }, []);

  // ------------------------------------------------------------
  // FETCH CURRENT QR FROM SERVER
  // ------------------------------------------------------------
  const fetchCurrentQR = async () => {
    try {
      const res = await axios.get(`${API_URL}/image/get`);

      if (res.data?.image_url) {
        setCurrentQR(
          `${API_URL}${res.data.image_url}?t=${new Date().getTime()}`
        );
      } else {
        setCurrentQR(null);
      }
    } catch (error) {
      console.log("QR FETCH ERROR:", error);
      setCurrentQR(null);
    }
  };

  useEffect(() => {
    fetchCurrentQR();
  }, []);

  // ------------------------------------------------------------
  // FILE PICKER
  // ------------------------------------------------------------
  const onSelect = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;

    if (f.type && !f.type.startsWith("image/")) {
      alert("Please select an image screenshot");
      e.target.value = "";
      return;
    }

    if (f.size > MAX_SCREENSHOT_SIZE) {
      alert("Screenshot size must be under 10 MB");
      e.target.value = "";
      return;
    }

    setSelectedFile(f);
    setPreviewImage(URL.createObjectURL(f));
    e.target.value = "";
  };

  const uploadNow = async () => {
    const amount = localStorage.getItem("add_amount") || "";

    if (!amount || Number(amount) < settings?.min_deposit) {
      alert(`Please enter minimum amount: ₹${settings?.min_deposit}`);
      return;
    }

    if (!selectedFile) {
      alert("Please upload a screenshot");
      return;
    }

    const normalizedUtr = utrNumber.trim();
    if (!/^\d{12}$/.test(normalizedUtr)) {
      alert("UTR number must be exactly 12 digits");
      return;
    }

    const fd = new FormData();
    fd.append("image", selectedFile);
    fd.append("amount", amount);
    fd.append("method", localStorage.getItem("add_method") || "UPI QR");
    fd.append("trnx", normalizedUtr);

    try {
      setUploading(true);
      const res = await axios.post(`${API_BASE}/upload`, fd, {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log("UPLOAD SUCCESS:", res.data);

      // CLEAR LOCAL STORAGE
      localStorage.removeItem("add_amount");
      localStorage.removeItem("add_method");

      setPreviewImage(null);
      setSelectedFile(null);
      setUtrNumber("");
      setShowSuccess(true);
      fetchCurrentQR();

      setTimeout(() => setShowSuccess(false), 2000);
    } catch (err) {
      console.log("UPLOAD ERROR:", err);
      alert(err.response?.data?.detail || "Screenshot upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="mx-auto mt-4 w-[93%] max-w-md rounded-[24px] border border-blue-200/20 bg-gradient-to-br from-[#294878] via-[#203b69] to-[#172f59] p-4 shadow-xl shadow-black/20">
      <div className="mb-3 flex items-center gap-2">
        <span className="rounded-lg bg-blue-400/15 p-2 text-blue-200">
          <QrCode size={17} />
        </span>
        <div>
          <h2 className="text-sm font-bold text-white">Pay Using QR Code</h2>
          <p className="text-[11px] text-blue-100/55">Scan, pay and upload the receipt</p>
        </div>
      </div>

      <PaymentReceiveDetails siteData={siteData} />

      {/* -------------------- QR IMAGE -------------------- */}
      <div className="mx-auto my-4 w-fit rounded-2xl border border-blue-200/20 bg-white p-2 shadow-xl shadow-black/25">
        <img
          src={currentQR || "/assets/logo.png"}
          className="h-48 w-48 rounded-xl object-cover"
          alt="UPI QR"
        />
      </div>

      <div className="relative mb-3">
        <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-600" size={18} />
        <input
          type="number"
          placeholder={`Add amount (Min ₹${settings?.min_deposit || 0})`}
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value);
            localStorage.setItem("add_amount", e.target.value);
          }}
          className="w-full rounded-2xl border border-blue-200/30 bg-white py-3.5 pl-10 pr-4 text-lg font-semibold text-[#132a50] outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20"
        />
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        {[300, 500, 1000, 2000, 5000].map((amt) => (
          <button
            key={amt}
            type="button"
            onClick={() => {
              setAmount(amt);
              localStorage.setItem("add_amount", amt);
            }}
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

      {siteData?.add_money_html ? (
        <div
          className="text-gray-200 mt-5 text-sm"
          dangerouslySetInnerHTML={{
            __html: siteData?.add_money_html,
          }}
        />
      ) : (
        <div className="mx-2 mt-4 max-w-md rounded-2xl border border-blue-200/10 bg-[#102747]/40 p-3 text-center text-sm leading-6 text-blue-50/80">
          <p>
            UPI पर पेमेंट करके नीचे स्क्रीनशॉट upload करें।
          </p>
          <p className="mt-2 text-gray-300">
            Screenshot admin panel me pending deposit request ke andar jayega.
          </p>

          <p className="mt-2 font-semibold text-gray-300">
            Payment will be added within 2 minutes.
          </p>
        </div>
      )}
      {/* -------------------- INFO -------------------- */}
      <div className="mb-5 mt-3 text-center text-sm leading-6">
        <p className="font-bold text-amber-300">
          Minimum Payment: ₹{settings?.min_deposit}
        </p>
      </div>

      {/* Keep the native input over the button so Android WebView receives a
          real user gesture instead of a programmatic hidden-input click. */}
      <label
        className={`flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500
    relative overflow-hidden py-3.5 font-bold text-white shadow-lg shadow-blue-950/30 transition hover:brightness-110
    ${
      !amount || Number(amount) < (settings?.min_deposit || 0)
        ? "pointer-events-none cursor-not-allowed opacity-40"
        : ""
    }`}
      >
        <Camera size={18} /> Upload Payment Screenshot
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
          onChange={onSelect}
          aria-label="Choose payment screenshot"
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </label>

      {/* ---------------- SUCCESS POPUP ---------------- */}
      {showSuccess && (
        <div className="fixed bottom-40 left-1/2 flex -translate-x-1/2 animate-fadeIn items-center gap-2 whitespace-nowrap rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-lg">
          <CheckCircle2 size={16} /> Uploaded Successfully!
        </div>
      )}

      {/* ---------------- PREVIEW MODAL ---------------- */}
      {previewImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-[320px] rounded-2xl border border-blue-200/20 bg-[#17325d] p-4 shadow-2xl">
            <div className="mb-3 flex items-center gap-2 font-bold text-white">
              <Upload size={18} className="text-blue-300" /> Confirm Screenshot
            </div>
            <img src={previewImage} alt="Payment screenshot preview" className="mb-4 w-full rounded-xl" />

            <label className="mb-4 block">
              <span className="mb-1.5 block text-xs font-semibold text-blue-100">
                UTR / UTC Number
              </span>
              <input
                type="text"
                value={utrNumber}
                onChange={(e) => setUtrNumber(e.target.value.replace(/\D/g, "").slice(0, 12))}
                placeholder="Enter 12 digit UTR number"
                maxLength={12}
                inputMode="numeric"
                pattern="[0-9]{12}"
                autoComplete="off"
                className="w-full rounded-xl border border-blue-200/25 bg-white px-3 py-2.5 font-semibold text-[#132a50] outline-none focus:border-cyan-400"
              />
            </label>

            <div className="flex gap-3">
              <button
                className="w-1/2 rounded-xl border border-white/10 bg-white/5 py-2.5 font-semibold text-white"
                onClick={() => {
                  setPreviewImage(null);
                  setSelectedFile(null);
                }}
              >
                Cancel
              </button>

              <button
                className="w-1/2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 py-2.5 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                onClick={uploadNow}
                disabled={uploading || !/^\d{12}$/.test(utrNumber)}
              >
                {uploading ? "Checking..." : "Upload"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddMoneyQrTab;
