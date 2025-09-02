// assets/js/api.js
// Configure your backend URL and optional token.
// IMPORTANT: No Google API keys in the browser.
window.REVIEWS_CONFIG = {
  BACKEND_URL: "https://automateit.onrender.com", // <-- set this
  PROXY_TOKEN: "",  // optional: must match Render PROXY_TOKEN if set
  DEFAULT_PLACE_ID: "" // optional: set your Place ID for auto-load
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
