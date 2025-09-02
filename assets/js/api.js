// assets/js/api.js
// Configure ONLY your backend URL. API key lives in Render, not here.
window.REVIEWS_CONFIG = {
  BACKEND_URL: "https://automateit.onrender.com", // <-- change if different
  PROXY_TOKEN: "",                                 // leave blank if not set on backend
  DEFAULT_PLACE_ID: "5177255978048155758"          // locked to your business
};

async function fetchReviews(placeId){
  const { BACKEND_URL, PROXY_TOKEN } = window.REVIEWS_CONFIG;
  if (!BACKEND_URL) throw new Error("BACKEND_URL not configured in assets/js/api.js");
  const url = `${BACKEND_URL.replace(/\/+$/,'')}/api/reviews?placeId=${encodeURIComponent(placeId)}`;
  const headers = PROXY_TOKEN ? { "x-proxy-token": PROXY_TOKEN } : {};
  const res = await fetch(url, { headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Backend error ${res.status}: ${text}`);
  }
  return res.json();
}
