(function(){
  function escapeHTML(str){
    return String(str ?? "").replace(/[&<>"']/g, m => ({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
    }[m]));
  }
  function renderError(msg) {
    const el = document.getElementById("cards");
    if (el) el.innerHTML = `<div class="warning">${escapeHTML(msg)}</div>`;
  }
  function renderCards(reviews){
    const container = document.getElementById("cards");
    container.innerHTML = "";
    if (!reviews || !reviews.length){
      container.innerHTML = `<div class="warning">No reviews returned.</div>`;
      return;
    }
    for (const r of reviews){
      const card = document.createElement("div");
      card.className = "card";
      card.innerHTML = `
        <div class="author">${escapeHTML(r.author_name || "Anonymous")}</div>
        <div class="meta"><span class="star">★</span> ${r.rating ?? "—"} · ${escapeHTML(r.relative_time_description || "")}</div>
        <div class="text">${escapeHTML(r.text || "")}</div>
      `;
      container.appendChild(card);
    }
  }
  async function load(placeId){
    try {
      const data = await fetchReviews(placeId);
      document.getElementById("avg").textContent = `Average: ${data.rating ?? "—"}`;
      document.getElementById("total").textContent = `Reviews: ${data.user_ratings_total ?? "—"}`;
      document.getElementById("api-note").style.display = "block";
      const reviews = (data.reviews || []).map(r => ({ ...r, time: Number(r.time) || 0 }));
      renderCards(reviews);
    } catch (e) {
      console.error(e);
      renderError("Could not load reviews. Check BACKEND_URL and your Place ID.");
    }
  }
  document.addEventListener("DOMContentLoaded", () => {
    const def = (window.REVIEWS_CONFIG && window.REVIEWS_CONFIG.DEFAULT_PLACE_ID) || "";
    if (!def) return renderError("DEFAULT_PLACE_ID is not set in assets/js/api.js");
    load(def);
  });
})();