/* =====================================================================
   dashboard.js   -   OWNER: Raghid
   This is a WORKING BASELINE so the demo never breaks. Your job is to
   make it good. Change anything in here and in the DASHBOARD section of
   styles.css. Do not edit app.js, index.html or sample-data.js.

   You get one argument: `data`, shaped exactly like SAMPLE_DATA.
   Open sample-data.js to see every field you can use.

   Ideas worth your time, in order:
     1. Make the headline number huge - it is the whole pitch
     2. A progress bar per course: earned / needed / lost
     3. Colour-code the plan table rows by course
     4. A little "days left" countdown on the nearest deadline
   ===================================================================== */

const RISK_ORDER = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };

const STATUS_TEXT = {
  ON_TRACK:          "You are on track.",
  AT_RISK:           "Some courses need attention.",
  RECOVERY_REQUIRED: "Recovery mode.",
};

function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function dayName(iso) {
  const d = new Date(iso + "T00:00:00");
  return isNaN(d) ? "" : d.toLocaleDateString("en-US", { weekday: "long" });
}

function shortDate(iso) {
  const d = new Date(iso + "T00:00:00");
  return isNaN(d) ? iso : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/* ---- the one sentence that matters most ---------------------------- */
function headlineFor(courses) {
  const worst = [...courses].sort(
    (a, b) => RISK_ORDER[a.risk_level] - RISK_ORDER[b.risk_level]
  )[0];
  if (!worst) return "No courses found.";

  if (!worst.pass_reachable) {
    return `${worst.course_name} can no longer be passed — the maximum left is ${worst.max_achievable_grade}%.`;
  }
  if (!worst.target_reachable) {
    return `${worst.course_name}: the ${worst.target_grade} target is out of reach, but you can still finish at ${worst.max_achievable_grade}% — and you need ${worst.needed_avg_on_remaining_to_pass}% on what is left just to pass.`;
  }
  return `${worst.course_name}: you can still hit ${worst.target_grade} if you average ${worst.needed_avg_on_remaining_for_target}% on everything that is left.`;
}

/* ---- one course card ------------------------------------------------ */
function courseCard(c) {
  const needed = c.target_reachable
    ? c.needed_avg_on_remaining_for_target
    : c.needed_avg_on_remaining_to_pass;

  const verdict = c.target_reachable
    ? `Needs ${needed}% on remaining work to reach ${c.target_grade}`
    : `Target ${c.target_grade} unreachable — ceiling is ${c.max_achievable_grade}%. Needs ${needed}% to pass.`;

  const deadline = c.next_deadline_in_days == null
    ? "No deadline set"
    : `Next deadline in ${c.next_deadline_in_days} day${c.next_deadline_in_days === 1 ? "" : "s"}`;

  return `
    <article class="card risk-${esc(c.risk_level)}">
      <div class="card-head">
        <h3>${esc(c.course_name)}</h3>
        <span class="pill risk-${esc(c.risk_level)}">${esc(c.risk_level)}</span>
      </div>

      <div class="stat-row">
        <div class="stat">
          <div class="k">Current</div>
          <div class="v">${c.current_average == null ? "—" : c.current_average}<small>%</small></div>
        </div>
        <div class="stat">
          <div class="k">Max possible</div>
          <div class="v">${c.max_achievable_grade}<small>%</small></div>
        </div>
        <div class="stat">
          <div class="k">Target</div>
          <div class="v">${c.target_grade}<small>%</small></div>
        </div>
      </div>

      <div class="verdict ${c.target_reachable ? "" : "bad"}">${esc(verdict)}</div>

      <p class="reason">${esc(c.reason)}</p>

      <div class="meta">
        <span>${esc(deadline)}</span>
        <span>${c.recommended_weekly_hours}h this week &middot; priority ${c.priority}</span>
      </div>
    </article>`;
}

/* ---- the weekly plan table ------------------------------------------ */
function planTable(plan) {
  if (!plan || !plan.length) return "<p class='reason'>No study plan was returned.</p>";

  let lastDate = null;
  const rows = plan.map(row => {
    const newDay = row.date !== lastDate;
    lastDate = row.date;
    return `
      <tr>
        <td class="day">${newDay ? esc(dayName(row.date)) + "<span>" + esc(shortDate(row.date)) + "</span>" : ""}</td>
        <td><strong>${esc(row.course_name)}</strong></td>
        <td>${esc(row.task)}</td>
        <td class="hrs">${row.hours}h</td>
      </tr>`;
  }).join("");

  return `
    <div class="plan">
      <table>
        <thead>
          <tr><th>Day</th><th>Course</th><th>What to do</th><th style="text-align:right">Hours</th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

/* ---- entry point (app.js calls this) -------------------------------- */
window.renderDashboard = function renderDashboard(data, mount) {
  const courses = [...(data.courses || [])].sort((a, b) => a.priority - b.priority);
  const totalHours = (data.study_plan || []).reduce((s, r) => s + Number(r.hours || 0), 0);

  mount.innerHTML = `
    <section class="headline">
      <div class="eyebrow">${esc(STATUS_TEXT[data.overall_status] || data.overall_status)}</div>
      <h2>${esc(headlineFor(courses))}</h2>
      <p class="sub">${courses.length} courses analyzed &middot; ${totalHours}h planned
        out of ${data.available_weekly_study_hours}h available this week</p>
    </section>

    <h3 class="section-title">Your courses, most urgent first</h3>
    <div class="cards">${courses.map(courseCard).join("")}</div>

    <h3 class="section-title">This week's plan</h3>
    ${planTable(data.study_plan)}
  `;
};
