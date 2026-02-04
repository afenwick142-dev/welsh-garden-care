// ====== IMPORTANT ======
// Paste your Google Apps Script "Web App" URL here:
const PRICING_API_URL = "PASTE_YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE";

// Optional: if you later add a Google Form endpoint for submissions, paste it here.
// For now we just show a "sent" message (concept phase).
const SUBMIT_ENDPOINT = ""; // e.g. "https://script.google.com/macros/s/...../exec"

// ------------------------
// Mobile menu
const burgerBtn = document.getElementById("burgerBtn");
const mobileNav = document.getElementById("mobileNav");

if (burgerBtn) {
  burgerBtn.addEventListener("click", () => {
    const open = !mobileNav.hasAttribute("hidden");
    if (open) {
      mobileNav.setAttribute("hidden", "true");
      burgerBtn.setAttribute("aria-expanded", "false");
    } else {
      mobileNav.removeAttribute("hidden");
      burgerBtn.setAttribute("aria-expanded", "true");
    }
  });

  mobileNav?.querySelectorAll("a").forEach(a => {
    a.addEventListener("click", () => {
      mobileNav.setAttribute("hidden", "true");
      burgerBtn.setAttribute("aria-expanded", "false");
    });
  });
}

// ------------------------
// Reveal on scroll (matches the "content appears as you scroll" feel)
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) entry.target.classList.add("is-visible");
  });
}, { threshold: 0.12 });

document.querySelectorAll(".reveal").forEach(el => observer.observe(el));

// ------------------------
// Drawer logic (Option A)
const overlay = document.getElementById("overlay");
const drawerQuote = document.getElementById("drawerQuote");
const drawerPlan = document.getElementById("drawerPlan");

function openDrawer(which) {
  overlay.hidden = false;
  overlay.classList.add("is-open");

  if (which === "quote") drawerQuote.classList.add("is-open");
  if (which === "plan") drawerPlan.classList.add("is-open");

  document.body.style.overflow = "hidden";
}

function closeDrawers() {
  drawerQuote.classList.remove("is-open");
  drawerPlan.classList.remove("is-open");
  overlay.hidden = true;
  overlay.classList.remove("is-open");
  document.body.style.overflow = "";
}

document.querySelectorAll("[data-open-drawer]").forEach(btn => {
  btn.addEventListener("click", () => openDrawer(btn.getAttribute("data-open-drawer")));
});

document.querySelectorAll("[data-close-drawer]").forEach(btn => {
  btn.addEventListener("click", closeDrawers);
});

overlay?.addEventListener("click", closeDrawers);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeDrawers();
});

// ------------------------
// Pricing loader from Google Sheet API
function formatMoney(n) {
  const num = Number(n);
  if (Number.isNaN(num)) return n;
  return `£${num}`;
}

async function loadPricing() {
  if (!PRICING_API_URL || PRICING_API_URL.includes("PASTE_YOUR")) return;

  const res = await fetch(PRICING_API_URL, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load pricing from API");

  const data = await res.json();

  // data.pricing + data.plans expected
  const map = { ...(data.pricing || {}), ...(data.plans || {}) };

  document.querySelectorAll("[data-price-key]").forEach(el => {
    const key = el.getAttribute("data-price-key");
    const val = map[key];
    if (val === undefined || val === null || val === "") return;

    // If val is [min,max], render range
    if (Array.isArray(val) && val.length === 2) {
      el.textContent = `${formatMoney(val[0])}–${formatMoney(val[1])}`;
    } else {
      el.textContent = formatMoney(val);
    }
  });
}

loadPricing().catch(console.error);

// ------------------------
// Form submissions (concept-friendly)
// If you later add a backend endpoint, this will POST JSON to it.
async function handleFormSubmit(form, type) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const fd = new FormData(form);
    const payload = { type };

    fd.forEach((value, key) => {
      if (key === "services") {
        payload.services = payload.services || [];
        payload.services.push(value);
      } else {
        payload[key] = value;
      }
    });

    // Simple UX: disable submit button
    const btn = form.querySelector('button[type="submit"]');
    const oldText = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Sending...";

    try {
      if (SUBMIT_ENDPOINT) {
        const res = await fetch(SUBMIT_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error("Submission failed");
      }

      btn.textContent = "Sent ✅";
      form.reset();

      // Close after a short moment
      setTimeout(() => {
        btn.textContent = oldText;
        btn.disabled = false;
        closeDrawers();
      }, 800);

    } catch (err) {
      console.error(err);
      btn.disabled = false;
      btn.textContent = "Try again";
      setTimeout(() => (btn.textContent = oldText), 1200);
    }
  });
}

const quoteForm = document.getElementById("quoteForm");
const planForm = document.getElementById("planForm");
if (quoteForm) handleFormSubmit(quoteForm, "quote");
if (planForm) handleFormSubmit(planForm, "plan");
