// assets/js/reviews-client.js
(function(){
  function escapeHTML(str){
    return String(str ?? "").replace(/[&<>"']/g, m => ({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
    }[m]));
  }
  function renderError(msg) {
    document.getElementById("cards").innerHTML = `<div class="warning">${escapeHTML(msg)}</div>`;
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
  function hookSortButtons(originalReviews){
    document.getElementById("sort-newest")?.addEventListener("click", () => {
      const sorted = [...originalReviews].sort((a,b)=>b.time-a.time);
      renderCards(sorted);
    });
    document.getElementById("sort-highest")?.addEventListener("click", () => {
      const sorted = [...originalReviews].sort((a,b)=>b.rating-a.rating);
      renderCards(sorted);
    });
    document.getElementById("sort-lowest")?.addEventListener("click", () => {
      const sorted = [...originalReviews].sort((a,b)=>a.rating-b.rating);
      renderCards(sorted);
    });
  }
  async function load(placeId){
    try {
      const data = await fetchReviews(placeId);
      document.getElementById("avg").textContent = `Average: ${data.rating ?? "—"}`;
      document.getElementById("total").textContent = `Reviews: ${data.user_ratings_total ?? "—"}`;
      document.getElementById("api-note").style.display = "block";
      const originalReviews = (data.reviews || []).map(r => ({ ...r, time: Number(r.time) || 0 }));
      renderCards(originalReviews);
      hookSortButtons(originalReviews);
    } catch (e) {
      console.error(e);
      renderError("Could not load reviews. Check BACKEND_URL, token, and your Place ID.");
    }
  }
  document.addEventListener("DOMContentLoaded", () => {
    const input = document.getElementById("placeIdInput");
    document.getElementById("load").addEventListener("click", () => {
      const id = input.value.trim();
      if (!id) return renderError("Please paste a Place ID or set DEFAULT_PLACE_ID in assets/js/api.js");
      load(id);
    });
    const def = (window.REVIEWS_CONFIG && window.REVIEWS_CONFIG.DEFAULT_PLACE_ID) || "";
    if (def) { input.value = def; load(def); }
  });
})();
