/* =====================================================================
   ui.js  -  shared helpers: formatting, the cached academic state, and
   the render functions used on more than one page.
   ===================================================================== */

const ANALYSIS_CACHE = "ar_analysis";

/* ---- text ------------------------------------------------------------ */
function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function num(v, dash) {
  return (v === null || v === undefined || v === "") ? (dash || "—") : v;
}

/* ---- dates ----------------------------------------------------------- */
function parseDate(iso) {
  if (!iso) return null;
  const d = new Date(String(iso) + "T00:00:00");
  return isNaN(d.getTime()) ? null : d;
}
function dayName(iso) {
  const d = parseDate(iso);
  return d ? d.toLocaleDateString("en-US", { weekday: "long" }) : "";
}
function shortDate(iso) {
  const d = parseDate(iso);
  return d ? d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) : (iso || "—");
}
function deadlineText(days) {
  if (days === null || days === undefined) return "No date set";
  if (days < 0)  return Math.abs(days) + " days ago";
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  return "In " + days + " days";
}

/* ---- status labels --------------------------------------------------- */
const STATUS_LABEL = {
  ON_TRACK:          "On track",
  AT_RISK:           "At risk",
  RECOVERY_REQUIRED: "Recovery required",
};

/* ---- the cached academic state --------------------------------------- */
const Store = {
  read() {
    try { return JSON.parse(sessionStorage.getItem(ANALYSIS_CACHE)); } catch (e) { return null; }
  },
  write(data) {
    try { sessionStorage.setItem(ANALYSIS_CACHE, JSON.stringify(data)); } catch (e) {}
    return data;
  },
  clear() { sessionStorage.removeItem(ANALYSIS_CACHE); },

  /* Fetch from n8n, or reuse what a previous page already fetched. */
  async load(session, opts) {
    const force = opts && opts.force;
    if (!force) {
      const cached = this.read();
      if (cached) return cached;
    }
    const data = await window.API.analyze(session.student_id, session.weekly_study_hours);
    return this.write(data);
  },

  course(data, courseId) {
    return (data.courses || []).find(c => String(c.course_id) === String(courseId)) || null;
  },
};

/* ---- small pieces ---------------------------------------------------- */
function riskPill(level) {
  return '<span class="pill risk-' + esc(level) + '">' + esc(level) + "</span>";
}

function nextAssessment(course) {
  const upcoming = (course.assessments || [])
    .filter(a => a.status !== "Completed")
    .sort((a, b) => (a.days_until_due ?? 9999) - (b.days_until_due ?? 9999));
  return upcoming[0] || null;
}

/* ---- the course card, used on the dashboard and My Courses ----------- */
function courseCard(course) {
  const next = nextAssessment(course);
  const nextLine = next
    ? esc(next.name) + " · " + shortDate(next.due_date) +
      ' <span class="muted">(' + esc(deadlineText(next.days_until_due)) + ")</span>"
    : '<span class="muted">No upcoming assessments</span>';

  const verdict = course.current_average === null
    ? "No grades recorded yet"
    : course.target_reachable
      ? "Needs " + course.needed_avg_on_remaining_for_target + "% on remaining work"
      : "Target unreachable — ceiling is " + course.max_achievable_grade + "%";

  return `
  <article class="card course-card risk-${esc(course.risk_level)}">
    <div class="card-head">
      <div>
        <h3>${esc(course.course_name)}</h3>
        <p class="code">${esc(course.course_code || "")}</p>
      </div>
      ${riskPill(course.risk_level)}
    </div>

    <div class="stat-row">
      <div class="stat">
        <span class="k">Current</span>
        <span class="v">${num(course.current_average)}<small>${course.current_average === null ? "" : "%"}</small></span>
      </div>
      <div class="stat">
        <span class="k">Target</span>
        <span class="v">${num(course.target_grade)}<small>%</small></span>
      </div>
      <div class="stat">
        <span class="k">Priority</span>
        <span class="v">${num(course.priority)}</span>
      </div>
    </div>

    <p class="verdict ${course.target_reachable ? "" : "bad"}">${esc(verdict)}</p>

    <div class="card-row">
      <span class="k">Next</span>
      <span>${nextLine}</span>
    </div>

    <a class="btn btn-ghost btn-block" href="course.html?id=${encodeURIComponent(course.course_id)}">View course</a>
  </article>`;
}

/* ---- the weekly plan, grouped by day --------------------------------- */
function groupPlanByDay(plan) {
  const days = [];
  (plan || []).forEach(row => {
    let day = days.find(d => d.date === row.date);
    if (!day) { day = { date: row.date, rows: [] }; days.push(day); }
    day.rows.push(row);
  });
  days.forEach(d => d.rows.sort((a, b) => (a.priority || 99) - (b.priority || 99)));
  return days.sort((a, b) => String(a.date).localeCompare(String(b.date)));
}

function planDayBlock(day, opts) {
  const showReason = opts && opts.showReason;
  const total = day.rows.reduce((s, r) => s + Number(r.hours || 0), 0);

  const items = day.rows.map(r => `
    <li class="plan-item">
      <div class="plan-main">
        <p class="plan-course">${esc(r.course_name)}</p>
        <p class="plan-task">${esc(r.task)}</p>
        ${showReason && r.reason ? '<p class="plan-reason">' + esc(r.reason) + "</p>" : ""}
      </div>
      <div class="plan-side">
        <span class="plan-hours">${r.hours}h</span>
        <span class="plan-priority">Priority ${num(r.priority)}</span>
      </div>
    </li>`).join("");

  return `
  <section class="plan-day">
    <header class="plan-day-head">
      <h3>${esc(dayName(day.date))}</h3>
      <span class="muted">${esc(shortDate(day.date))} &middot; ${total}h</span>
    </header>
    <ul class="plan-list">${items}</ul>
  </section>`;
}

function emptyState(title, body, actionHtml) {
  return `
  <div class="empty">
    <h3>${esc(title)}</h3>
    <p>${esc(body)}</p>
    ${actionHtml || ""}
  </div>`;
}

window.UI = {
  esc, num, dayName, shortDate, deadlineText, parseDate,
  STATUS_LABEL, Store, riskPill, nextAssessment,
  courseCard, groupPlanByDay, planDayBlock, emptyState,
};
