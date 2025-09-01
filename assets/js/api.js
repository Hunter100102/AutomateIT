// assets/js/api.js
const API_BASE_URL = window.API_BASE_URL || "https://RENDER-BACKEND-URL";

async function apiGet(path) {
  const res = await fetch(`${API_BASE_URL}${path}`, { credentials: "omit" });
  if (!res.ok) throw new Error(`GET ${path} ${res.status}`);
  return res.json();
}

async function apiPost(path, data) {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
    credentials: "omit"
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`POST ${path} ${res.status}: ${text}`);
  }
  return res.json();
}

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("contact-form");
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const payload = Object.fromEntries(fd.entries());
      const btn = form.querySelector("button[type=submit]");
      const prev = btn ? btn.textContent : null;
      if (btn) btn.textContent = "Sending...";
      try {
        await apiPost("/contact", payload);
        alert("Thanks! We'll be in touch shortly.");
        form.reset();
      } catch (err) {
        console.error(err);
        alert("Sorry—there was a problem submitting the form.");
      } finally {
        if (btn && prev) btn.textContent = prev;
      }
    });
  }
});