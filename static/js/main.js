/**
 * LoanPredict AI — main.js
 * Global JS: dark/light toggle, nav, counters, reveal, toast, history
 */

/* ── Theme toggle ─────────────────────────────────────────── */
const THEME_KEY = "lp_theme";
const themeBtn  = document.getElementById("themeToggle");

function applyTheme(dark) {
  document.body.classList.toggle("light-mode", !dark);
  if (themeBtn) themeBtn.textContent = dark ? "☀️" : "🌙";
  localStorage.setItem(THEME_KEY, dark ? "dark" : "light");
}

const savedTheme = localStorage.getItem(THEME_KEY);
applyTheme(savedTheme !== "light");

if (themeBtn) themeBtn.addEventListener("click", () => {
  applyTheme(document.body.classList.contains("light-mode"));
});

/* ── Mobile nav ───────────────────────────────────────────── */
const hamburger  = document.getElementById("hamburger");
const mobileNav  = document.getElementById("mobileNav");

if (hamburger && mobileNav) {
  hamburger.addEventListener("click", () => {
    mobileNav.classList.toggle("open");
  });
  document.addEventListener("click", e => {
    if (!hamburger.contains(e.target) && !mobileNav.contains(e.target)) {
      mobileNav.classList.remove("open");
    }
  });
}

/* ── Scroll-reveal ────────────────────────────────────────── */
const revealObs = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add("visible"); } });
}, { threshold: 0.12 });
document.querySelectorAll(".reveal").forEach(el => revealObs.observe(el));

/* ── Animated counters ───────────────────────────────────── */
function animateCounter(el) {
  const target = parseFloat(el.dataset.target);
  const suffix = el.dataset.suffix || "";
  const prefix = el.dataset.prefix || "";
  const decimals = el.dataset.decimals ? parseInt(el.dataset.decimals) : 0;
  const duration = 1800;
  const step = 16;
  let current = 0;
  const increment = target / (duration / step);
  const timer = setInterval(() => {
    current = Math.min(current + increment, target);
    el.textContent = prefix + current.toFixed(decimals) + suffix;
    if (current >= target) clearInterval(timer);
  }, step);
}

const counterObs = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      animateCounter(e.target);
      counterObs.unobserve(e.target);
    }
  });
}, { threshold: 0.5 });
document.querySelectorAll("[data-target]").forEach(el => counterObs.observe(el));

/* ── Toast notifications ─────────────────────────────────── */
function showToast(message, type = "info") {
  const container = document.getElementById("toast-container") || (() => {
    const d = document.createElement("div");
    d.id = "toast-container";
    document.body.appendChild(d);
    return d;
  })();
  const icons = { success: "✅", error: "❌", info: "ℹ️", warning: "⚠️" };
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${icons[type] || "ℹ️"}</span><span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => { toast.style.opacity = "0"; toast.style.transform = "translateX(30px)"; }, 3500);
  setTimeout(() => toast.remove(), 3800);
}
window.showToast = showToast;

/* ── Prediction form ─────────────────────────────────────── */
const predictForm = document.getElementById("predictForm");
if (predictForm) {
  // Range slider live update
  predictForm.querySelectorAll("input[type='range']").forEach(range => {
    const valEl = document.getElementById(range.id + "_val");
    const update = () => {
      const pct = ((range.value - range.min) / (range.max - range.min)) * 100;
      range.style.setProperty("--pct", pct + "%");
      if (valEl) {
        const prefix = range.dataset.prefix || "";
        const suffix = range.dataset.suffix || "";
        valEl.textContent = prefix + Number(range.value).toLocaleString() + suffix;
      }
    };
    range.addEventListener("input", update);
    update();
  });

  // Submit
  predictForm.addEventListener("submit", async e => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(predictForm));
    const overlay = document.getElementById("loadingOverlay");
    if (overlay) overlay.classList.add("active");

    try {
      const res = await fetch("/api/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (overlay) overlay.classList.remove("active");
      if (json.success) {
        renderResult(json.result);
        document.getElementById("resultSection").scrollIntoView({ behavior: "smooth" });
      } else {
        showToast("Prediction failed: " + json.error, "error");
      }
    } catch (err) {
      if (overlay) overlay.classList.remove("active");
      showToast("Network error. Please try again.", "error");
    }
  });

  // Reset
  const resetBtn = document.getElementById("resetBtn");
  if (resetBtn) resetBtn.addEventListener("click", () => {
    predictForm.reset();
    predictForm.querySelectorAll("input[type='range']").forEach(r => r.dispatchEvent(new Event("input")));
    const rs = document.getElementById("resultSection");
    if (rs) rs.style.display = "none";
    showToast("Form reset.", "info");
  });
}

/* ── Render prediction result ────────────────────────────── */
function renderResult(r) {
  const section = document.getElementById("resultSection");
  if (!section) return;

  const riskClass = { Low: "risk-low", Medium: "risk-medium", High: "risk-high" }[r.risk_level] || "";
  const gradColor = r.approved
    ? "linear-gradient(90deg, #34d399, #22d3ee)"
    : "linear-gradient(90deg, #f87171, #a855f7)";

  section.innerHTML = `
    <div class="result-wrapper glass-card" style="overflow:hidden">
      <div class="result-header ${r.approved ? 'approved' : 'rejected'}">
        <div class="result-icon-ring ${r.approved ? 'approved' : 'rejected'}">
          ${r.approved ? '✅' : '❌'}
        </div>
        <div class="result-status ${r.approved ? 'approved' : 'rejected'}">
          ${r.approved ? 'Loan Approved!' : 'Loan Rejected'}
        </div>
        <div class="result-sub">${r.timestamp} &mdash; AI Prediction Result</div>
      </div>

      <div style="padding:1.5rem">
        <!-- probability bar -->
        <div class="d-flex align-center justify-between mb-1">
          <span style="font-size:.85rem;color:var(--text-secondary)">Approval Probability</span>
          <span class="range-val">${r.probability}%</span>
        </div>
        <div class="prob-bar-wrap mb-3">
          <div class="prob-bar-fill" style="width:0%;background:${gradColor}" id="probBar"></div>
        </div>

        <div class="result-metrics mb-3">
          <div class="metric-item">
            <div class="metric-value" style="background:${gradColor};-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">
              ${r.probability}%
            </div>
            <div class="metric-label">Approval Probability</div>
          </div>
          <div class="metric-item">
            <div class="metric-value ${riskClass}">${r.risk_level}</div>
            <div class="metric-label">Risk Level</div>
          </div>
          <div class="metric-item">
            <div class="metric-value" style="color:var(--blue)">${r.confidence}%</div>
            <div class="metric-label">Confidence Score</div>
          </div>
        </div>

        <div class="recommendation-box mb-3">
          <strong>💡 Recommendation:</strong> ${r.recommendation}
        </div>

        <div class="d-flex gap-2 flex-wrap">
          <button class="btn-primary" onclick="downloadReport()">⬇️ Download Report</button>
          <button class="btn-secondary" onclick="document.getElementById('predictForm').scrollIntoView({behavior:'smooth'})">
            🔄 New Prediction
          </button>
        </div>
      </div>
    </div>`;

  section.style.display = "block";

  // Animate bar
  requestAnimationFrame(() => {
    setTimeout(() => {
      const bar = document.getElementById("probBar");
      if (bar) bar.style.width = r.probability + "%";
    }, 120);
  });

  // Store for PDF download
  window._lastResult = r;
  loadHistory();
}

/* ── Download report (simple text PDF via print) ─────────── */
function downloadReport() {
  const r = window._lastResult;
  if (!r) return;
  const win = window.open("", "_blank");
  win.document.write(`
    <html><head><title>LoanPredict AI Report</title>
    <style>
      body{font-family:sans-serif;padding:40px;color:#111;max-width:700px;margin:0 auto}
      h1{color:#4f8ef7}
      .badge{display:inline-block;padding:4px 12px;border-radius:999px;font-weight:700;font-size:1.1rem}
      .approved{background:#dcfce7;color:#16a34a}
      .rejected{background:#fee2e2;color:#dc2626}
      table{width:100%;border-collapse:collapse;margin:16px 0}
      td,th{padding:8px 12px;border:1px solid #e5e7eb;font-size:.9rem}
      th{background:#f9fafb;font-weight:600}
    </style></head><body>
    <h1>🏦 LoanPredict AI — Prediction Report</h1>
    <p>Generated: ${r.timestamp}</p>
    <h2>Decision: <span class="badge ${r.approved?'approved':'rejected'}">${r.approved?'✅ APPROVED':'❌ REJECTED'}</span></h2>
    <table>
      <tr><th>Metric</th><th>Value</th></tr>
      <tr><td>Approval Probability</td><td>${r.probability}%</td></tr>
      <tr><td>Risk Level</td><td>${r.risk_level}</td></tr>
      <tr><td>Confidence Score</td><td>${r.confidence}%</td></tr>
    </table>
    <h3>Recommendation</h3>
    <p>${r.recommendation}</p>
    <hr><p style="color:#888;font-size:.8rem">LoanPredict AI &mdash; For demonstration purposes only. Not financial advice.</p>
    </body></html>`);
  win.document.close();
  win.print();
}
window.downloadReport = downloadReport;

/* ── Prediction history table ────────────────────────────── */
async function loadHistory() {
  const tbody = document.getElementById("historyBody");
  if (!tbody) return;
  try {
    const res = await fetch("/api/history");
    const json = await res.json();
    if (!json.success) return;
    tbody.innerHTML = json.history.map(h => `
      <tr>
        <td>#${h.id}</td>
        <td>${h.timestamp}</td>
        <td>$${Number(h.applicant_income).toLocaleString()}</td>
        <td>$${Number(h.loan_amount).toLocaleString()}K</td>
        <td>${h.credit_history}</td>
        <td><span class="badge ${h.approved?'badge-green':'badge-red'}">${h.approved?'Approved':'Rejected'}</span></td>
        <td>${h.probability}%</td>
        <td><span class="badge ${h.risk_level==='Low'?'badge-green':h.risk_level==='Medium'?'badge-yellow':'badge-red'}">${h.risk_level}</span></td>
      </tr>`).join("") || `<tr><td colspan="8" style="text-align:center;color:var(--text-muted)">No predictions yet</td></tr>`;
  } catch {}
}
loadHistory();

/* ── Analytics dashboard ─────────────────────────────────── */
async function loadAnalytics() {
  if (!document.getElementById("chartDonut")) return;
  try {
    const res = await fetch("/api/analytics");
    const json = await res.json();
    if (!json.success) return;

    const layout_patch = { paper_bgcolor:"rgba(0,0,0,0)", plot_bgcolor:"rgba(0,0,0,0)", font:{color:"#e2e8f0"} };
    const cfg = { responsive: true, displayModeBar: false };

    Plotly.newPlot("chartDonut",  json.charts.donut.data,  {...json.charts.donut.layout,  ...layout_patch}, cfg);
    Plotly.newPlot("chartIncome", json.charts.income.data, {...json.charts.income.layout, ...layout_patch}, cfg);
    Plotly.newPlot("chartCredit", json.charts.credit.data, {...json.charts.credit.layout, ...layout_patch}, cfg);
    Plotly.newPlot("chartArea",   json.charts.area.data,   {...json.charts.area.layout,   ...layout_patch}, cfg);

    // KPIs
    const k = json.kpis;
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.dataset.target = val; };
    set("kpiTotal",    k.total);
    set("kpiApproved", k.approved);
    set("kpiRate",     k.approval_rate);
    set("kpiIncome",   k.avg_income);
    set("kpiLoan",     k.avg_loan);
    document.querySelectorAll("[data-target]").forEach(el => { animateCounter(el); });
  } catch(e) { console.error(e); }
}
loadAnalytics();
