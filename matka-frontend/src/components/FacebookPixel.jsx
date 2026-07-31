import { useEffect } from "react";
import axios from "axios";
import { API_URL } from "../config";

const PIXEL_SCRIPT_ID = "meta-pixel-script";

function initializePixel(pixelId) {
  if (!/^\d{5,30}$/.test(pixelId)) return;

  if (!window.fbq) {
    const fbq = function (...args) {
      if (fbq.callMethod) {
        fbq.callMethod(...args);
      } else {
        fbq.queue.push(args);
      }
    };

    window.fbq = fbq;
    window._fbq = fbq;
    fbq.push = fbq;
    fbq.loaded = true;
    fbq.version = "2.0";
    fbq.queue = [];

    if (!document.getElementById(PIXEL_SCRIPT_ID)) {
      const script = document.createElement("script");
      script.id = PIXEL_SCRIPT_ID;
      script.async = true;
      script.src = "https://connect.facebook.net/en_US/fbevents.js";
      document.head.appendChild(script);
    }
  }

  if (window.__activeFacebookPixelId === pixelId) return;

  window.fbq("init", pixelId);
  window.fbq("track", "PageView");
  window.__activeFacebookPixelId = pixelId;
}

export default function FacebookPixel() {
  useEffect(() => {
    let cancelled = false;

    axios
      .get(`${API_URL}/settings/get`)
      .then(({ data }) => {
        const pixelId = String(data?.facebook_pixel_id || "").trim();
        if (!cancelled) initializePixel(pixelId);
      })
      .catch(() => {
        // Tracking failure must never block the application.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
