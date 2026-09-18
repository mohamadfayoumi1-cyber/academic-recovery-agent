/* =====================================================================
   app.js   -   OWNER: Mohamad
   Dashboard page logic: session guard, form, talks to n8n, then hands
   the JSON to Raghid's renderDashboard(). Raghid never touches this file.
   ===================================================================== */

/* ---- 1. the analysis endpoint lives in config.js --------------------- */
const WEBHOOK_URL = window.CONFIG.ANALYZE_URL;

/* ---- 2. must be signed in ------------------------------------------- */
const session = window.Auth.requireSession("index.html");

const els = {
  hours:     document.getElementById("hours"),
  analyze:   document.getElementById("analyzeBtn"),
  recalc:    document.getElementById("recalcBtn"),
  demoMode:  document.getElementById("demoMode"),
  status:    document.getElementById("status"),
  dashboard: document.getElementById("dashboard"),
  whoName:   document.getElementById("whoName"),
  whoId:     document.getElementById("whoId"),
  greetHead: document.getElementById("greetHead"),
  logout:    document.getElementById("logoutBtn"),
};

if (session) {
  const first = (session.student_name || "").split(" ")[0] || session.student_id;
  els.whoName.textContent = session.student_name || session.student_id;
  els.whoId.textContent = session.student_id;
  els.greetHead.textContent = "Welcome back, " + first + ".";
  if (session.weekly_hours) els.hours.value = session.weekly_hours;
}

els.logout.addEventListener("click", () => {
  window.Auth.logout();
  window.location.replace("index.html");
});

/* ---- status helpers -------------------------------------------------- */
function setStatus(message, kind) {
  if (!message) { els.status.hidden = true; return; }
  els.status.hidden = false;
  els.status.className = "status" + (kind ? " " + kind : "");
  els.status.textContent = message;
}

function setBusy(busy) {
  els.analyze.disabled = busy;
  els.recalc.disabled = busy;
  els.analyze.textContent = busy ? "Analyzing..." : "Analyze my semester";
}

/* ---- ask n8n (or return the sample) --------------------------------- */
async function fetchAnalysis() {
  const payload = {
    student_id: session.student_id,
    available_weekly_study_hours: Number(els.hours.value),
  };

  if (els.demoMode.checked || !WEBHOOK_URL) {
    await new Promise(r => setTimeout(r, 700));      // fake the round trip
    const data = JSON.parse(JSON.stringify(window.SAMPLE_DATA));
    data.student_id = session.student_id;
    data.student_name = session.student_name;
    data.available_weekly_study_hours = Number(els.hours.value);
    return data;
  }

  const res = await fetch(WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) throw new Error("n8n replied " + res.status + " " + res.statusText);

  const data = await res.json();
  if (!data || !Array.isArray(data.courses)) {
    throw new Error("The response had no 'courses' array. Check the Respond to Webhook node.");
  }
  return data;
}

/* ---- run ------------------------------------------------------------- */
async function run(isRecalc) {
  setBusy(true);
  setStatus(isRecalc ? "Re-reading your grades and rebuilding the plan..."
                     : "Agents are analyzing your semester...", "loading");

  try {
    const data = await fetchAnalysis();
    setStatus("");
    window.renderDashboard(data, els.dashboard);
    els.recalc.hidden = false;
    els.dashboard.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (err) {
    console.error(err);
    setStatus("Could not reach the agent: " + err.message +
              "  -  tick Demo mode to keep presenting.", "error");
  } finally {
    setBusy(false);
  }
}

els.analyze.addEventListener("click", () => run(false));
els.recalc.addEventListener("click", () => run(true));
els.hours.addEventListener("keydown", e => { if (e.key === "Enter") run(false); });
