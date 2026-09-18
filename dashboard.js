/* =====================================================================
   dashboard.js  -  How am I doing? What needs attention? What next?
   ===================================================================== */

const root = document.getElementById("root");

function soonestAssessment(courses) {
  let best = null;
  (courses || []).forEach(c => {
    (c.assessments || []).forEach(a => {
      if (a.status === "Completed") return;
      if (a.days_until_due === null || a.days_until_due === undefined) return;
      if (a.days_until_due < 0) return;
      if (!best || a.days_until_due < best.days_until_due) {
        best = { days_until_due: a.days_until_due, name: a.name, due_date: a.due_date, course: c.course_name };
      }
    });
  });
  return best;
}

function summaryBlock(data) {
  const next = soonestAssessment(data.courses);
  const planned = (data.study_plan || []).reduce((s, r) => s + Number(r.hours || 0), 0);

  return `
  <div class="summary">
    <div class="card">
      <span class="k">Active courses</span>
      <span class="v">${(data.courses || []).length}</span>
      <span class="s">Tracked this semester</span>
    </div>
    <div class="card">
      <span class="k">Weekly study hours</span>
      <span class="v">${data.available_weekly_study_hours}<small>h</small></span>
      <span class="s">${planned}h planned by the agent</span>
    </div>
    <div class="card">
      <span class="k">Academic status</span>
      <span class="status-chip status-${UI.esc(data.overall_status)}">
        ${UI.esc(UI.STATUS_LABEL[data.overall_status] || data.overall_status)}
      </span>
      <span class="s">Across all courses</span>
    </div>
    <div class="card">
      <span class="k">Next assessment</span>
      <span class="v" style="font-size:1.05rem">${next ? UI.esc(next.name) : "—"}</span>
      <span class="s">${next
        ? UI.esc(next.course) + " · " + UI.esc(UI.deadlineText(next.days_until_due))
        : "Nothing scheduled"}</span>
    </div>
  </div>`;
}

/* The single most useful sentence on the whole site: not the grade you
   have, but the grade you can still reach. */
function heroBlock(data) {
  const line = UI.headline(data.courses);
  if (!line) return "";

  const critical = (data.courses || []).filter(c => c.risk_level === "CRITICAL").length;
  const high     = (data.courses || []).filter(c => c.risk_level === "HIGH").length;

  let sub = "Every course is on track.";
  if (critical) sub = critical + " course" + (critical === 1 ? "" : "s") + " in recovery" +
                      (high ? ", " + high + " at high risk" : "");
  else if (high) sub = high + " course" + (high === 1 ? " needs" : "s need") + " attention";

  return `
  <section class="hero-card status-${UI.esc(data.overall_status)}">
    <p class="hero-eyebrow">${UI.esc(UI.STATUS_LABEL[data.overall_status] || data.overall_status)}</p>
    <h2>${UI.esc(line)}</h2>
    <p class="hero-sub">${UI.esc(sub)}</p>
  </section>`;
}

/* =====================================================================
   HIGH / CRITICAL RISK ALERTS

   The risk level is decided by the n8n Academic Analyst. This only reads
   `risk_level` and renders whichever fields the backend actually sent -
   anything missing is left out rather than invented.
   ===================================================================== */
function riskFact(label, valueHtml) {
  return '<div class="risk-fact"><span class="k">' + UI.esc(label) +
         '</span><span class="v">' + valueHtml + "</span></div>";
}

function riskAlerts(data) {
  const flagged = (data.courses || [])
    .filter(c => c.risk_level === "HIGH" || c.risk_level === "CRITICAL")
    .sort((a, b) => (a.priority || 99) - (b.priority || 99));

  if (!flagged.length) return "";

  const cards = flagged.map(c => {
    const facts = [];

    if (c.current_average !== null && c.current_average !== undefined) {
      facts.push(riskFact("Current grade", UI.esc(c.current_average) + "%"));
    }
    if (c.target_grade !== null && c.target_grade !== undefined) {
      facts.push(riskFact("Target grade", UI.esc(c.target_grade) + "%"));
    }

    const next = UI.nextAssessment(c);
    if (next) {
      let when = next.due_date ? UI.shortDate(next.due_date) : "";
      if (next.days_until_due !== null && next.days_until_due !== undefined) {
        when += (when ? " · " : "") + UI.deadlineText(next.days_until_due);
      }
      facts.push(riskFact("Upcoming",
        UI.esc(next.name) + (when ? '<br><span class="muted">' + UI.esc(when) + "</span>" : "")));
    }

    if (c.recommended_weekly_hours) {
      facts.push(riskFact("Recommended study time",
        UI.esc(c.recommended_weekly_hours) + " hours this week"));
    }

    const focus = Array.isArray(c.focus) ? c.focus.filter(Boolean) : [];

    return `
      <article class="risk-alert risk-${UI.esc(c.risk_level)}">
        <header class="risk-alert-head">
          <span class="pill risk-${UI.esc(c.risk_level)}">${UI.esc(c.risk_level)} RISK</span>
          <h3>${UI.esc(c.course_name)}</h3>
          ${c.course_code ? '<p class="code">' + UI.esc(c.course_code) + "</p>" : ""}
        </header>

        ${facts.length ? '<div class="risk-facts">' + facts.join("") + "</div>" : ""}

        ${c.reason ? `
          <div class="risk-part">
            <p class="k">Why this is flagged</p>
            <p>${UI.esc(c.reason)}</p>
          </div>` : ""}

        ${focus.length ? `
          <div class="risk-part">
            <p class="k">Focus on</p>
            <ul>${focus.map(f => "<li>" + UI.esc(f) + "</li>").join("")}</ul>
          </div>` : ""}

        <a class="btn btn-primary btn-sm" href="study-plan.html">View Recovery Plan</a>
      </article>`;
  }).join("");

  const n = flagged.length;
  return `
    <div class="section-head">
      <h2>Needs your attention</h2>
      <span class="muted">${n} course${n === 1 ? "" : "s"} flagged by the academic analysis</span>
    </div>
    <div class="risk-alert-grid">${cards}</div>`;
}

function changeAlert() {
  let change = null;
  try { change = JSON.parse(sessionStorage.getItem("ar_last_change")); } catch (e) {}
  if (!change) return "";
  sessionStorage.removeItem("ar_last_change");

  return `
  <div class="alert update">
    <h3>Your study plan has been updated</h3>
    <p>${UI.esc(change.summary)}</p>
    <div class="actions">
      <a class="btn btn-primary btn-sm" href="study-plan.html">View updated plan</a>
    </div>
  </div>`;
}

function render(data) {
  const courses = [...(data.courses || [])].sort((a, b) => (a.priority || 99) - (b.priority || 99));
  const days = UI.groupPlanByDay(data.study_plan).slice(0, 3);

  const coursesHtml = courses.length
    ? '<div class="cards">' + courses.map(UI.courseCard).join("") + "</div>"
    : UI.emptyState(
        "No courses yet",
        "Upload a syllabus and the grading structure will be read out for you.",
        '<a class="btn btn-primary" href="add-course.html">+ Add Course</a>');

  const planHtml = days.length
    ? '<div class="plan-days">' + days.map(d => UI.planDayBlock(d)).join("") + "</div>"
    : UI.emptyState("No study plan yet", "Add a course and enter a grade, then the planner will build your week.");

  root.innerHTML = `
    ${changeAlert()}

    <div class="page-head">
      <h1>Welcome, ${UI.esc((SESSION.full_name || "student").split(" ")[0])}</h1>
      <p>Here is where your semester stands today.</p>
    </div>

    ${heroBlock(data)}

    ${summaryBlock(data)}

    ${riskAlerts(data)}

    <div class="section-head">
      <h2>My Courses</h2>
      <a class="btn btn-primary btn-sm" href="add-course.html">+ Add Course</a>
    </div>
    ${coursesHtml}

    <div class="section-head">
      <h2>This Week's Study Plan</h2>
      <a class="btn btn-ghost btn-sm" href="study-plan.html">View full plan</a>
    </div>
    ${planHtml}

    <section id="chapterSummary"></section>
  `;

  if (window.ChapterSummary) window.ChapterSummary.mount(courses);
}

async function start() {
  root.innerHTML = '<div class="loading"><span class="spinner"></span> Loading your academic state...</div>';
  try {
    render(await UI.Store.load(SESSION));
  } catch (err) {
    root.innerHTML = '<div class="form-msg error">' + UI.esc(err.message) + "</div>";
  }
}

start();
