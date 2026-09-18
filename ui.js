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

/* ---- a stable colour per course, so the same course looks the same
   wherever it appears in the week ------------------------------------ */
function courseTone(courseId) {
  const str = String(courseId || "");
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return "tone-" + (h % 6);
}

/* ---- the recovery bar -----------------------------------------------
   Every course is 100 points. This splits them into what is already
   banked, what was dropped on graded work, and what is still winnable,
   with a marker showing where the target sits.                        */
function recoveryBar(course) {
  if (course.current_average === null) return "";

  const earned = Math.max(0, Number(course.points_earned_so_far) || 0);
  const done   = Math.max(0, Number(course.completed_weight) || 0);
  const open   = Math.max(0, Number(course.remaining_weight) || 0);
  const lost   = Math.max(0, done - earned);
  const target = Number(course.target_grade) || 0;

  const round = n => Math.round(n * 10) / 10;

  return `
    <div class="bar" role="img"
         aria-label="${round(earned)} points banked, ${round(lost)} lost, ${round(open)} still winnable">
      <span class="bar-seg earned" style="width:${earned}%"></span>
      <span class="bar-seg lost"   style="width:${lost}%"></span>
      <span class="bar-seg open"   style="width:${open}%"></span>
      <span class="bar-target" style="left:${Math.min(100, target)}%"
            title="Target: ${target}%"></span>
    </div>
    <div class="bar-key">
      <span><i class="sw earned"></i>${round(earned)} banked</span>
      <span><i class="sw open"></i>${round(open)} still winnable</span>
      <span><i class="sw lost"></i>${round(lost)} lost</span>
    </div>`;
}

/* ---- the one sentence that matters most ------------------------------ */
function headline(courses) {
  const list = (courses || []).filter(c => c.current_average !== null);
  if (!list.length) return null;

  const worst = [...list].sort((a, b) => (a.priority || 99) - (b.priority || 99))[0];

  if (!worst.pass_reachable) {
    return `${worst.course_name} can no longer be passed — the most you can reach is ` +
           `${worst.max_achievable_grade}%.`;
  }
  if (!worst.target_reachable) {
    return `${worst.course_name}: the ${worst.target_grade} target is out of reach, but you can still ` +
           `finish at ${worst.max_achievable_grade}% — and you need ` +
           `${worst.needed_avg_on_remaining_to_pass}% on what is left just to pass.`;
  }
  return `${worst.course_name}: you can still hit ${worst.target_grade} if you average ` +
         `${worst.needed_avg_on_remaining_for_target}% on everything that is left.`;
}

/* ---- the course card, used on the dashboard and My Courses ----------- */
function courseCard(course) {
  const next = nextAssessment(course);
  const urgent = next && next.days_until_due !== null && next.days_until_due <= 7;
  const nextLine = next
    ? esc(next.name) + " · " + shortDate(next.due_date) +
      ' <span class="' + (urgent ? "due-soon" : "muted") + '">(' +
      esc(deadlineText(next.days_until_due)) + ")</span>"
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

    ${recoveryBar(course)}

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
    <li class="plan-item ${courseTone(r.course_id)}">
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
  STATUS_LABEL, Store, riskPill, nextAssessment, recoveryBar, headline, courseTone,
  courseCard, groupPlanByDay, planDayBlock, emptyState,
};
