/* =====================================================================
   course.js  -  one course in detail, plus the adaptive recovery loop.

   Entering a grade sends it to n8n. n8n re-runs the Academic Analyst and
   the Planner and returns the new academic state. This page only compares
   the before and after to tell the student what changed.
   ===================================================================== */

const root = document.getElementById("root");
const courseId = new URLSearchParams(location.search).get("id");

let current = null;       // latest analysis
let editing = null;       // assessment_id being edited

/* ---- what changed between two analyses -------------------------------- */
function describeChange(before, after) {
  if (after.change_summary) return after.change_summary;

  const lines = [];
  (after.courses || []).forEach(nc => {
    const oc = (before.courses || []).find(c => c.course_id === nc.course_id);
    if (!oc) return;
    if (oc.risk_level !== nc.risk_level) {
      lines.push(nc.course_name + " has moved from " + oc.risk_level +
                 " to " + nc.risk_level + " risk.");
    } else if (oc.priority !== nc.priority) {
      lines.push(nc.course_name + " has moved from priority " + oc.priority +
                 " to priority " + nc.priority + ".");
    }
  });
  return lines.length ? lines.join(" ") : null;
}

/* ---- header ----------------------------------------------------------- */
function headerBlock(c) {
  const verdict = c.current_average === null
    ? "No grades recorded yet."
    : c.target_reachable
      ? "Needs " + c.needed_avg_on_remaining_for_target + "% average on remaining work to reach " + c.target_grade + "."
      : "The " + c.target_grade + " target is no longer reachable — the ceiling is " +
        c.max_achievable_grade + "%. Passing needs " + c.needed_avg_on_remaining_to_pass + "%.";

  const chips = (c.focus || []).map(f => '<span class="chip">' + UI.esc(f) + "</span>").join("");

  return `
  <div class="page-head">
    <a class="btn btn-quiet btn-sm" href="courses.html" style="margin-bottom:14px">&larr; All courses</a>
    <h1>${UI.esc(c.course_name)}</h1>
    <p>${UI.esc(c.course_code || "")}</p>
  </div>

  <div class="summary">
    <div class="card">
      <span class="k">Current grade</span>
      <span class="v">${UI.num(c.current_average)}<small>${c.current_average === null ? "" : "%"}</small></span>
      <span class="s">${c.completed_weight}% of the course graded</span>
    </div>
    <div class="card">
      <span class="k">Target grade</span>
      <span class="v">${c.target_grade}<small>%</small></span>
      <span class="s">Max possible now: ${c.max_achievable_grade}%</span>
    </div>
    <div class="card">
      <span class="k">Risk level</span>
      <span style="margin:4px 0">${UI.riskPill(c.risk_level)}</span>
      <span class="s">Priority ${UI.num(c.priority)} of your courses</span>
    </div>
    <div class="card">
      <span class="k">Planned this week</span>
      <span class="v">${UI.num(c.recommended_weekly_hours, "0")}<small>h</small></span>
      <span class="s">${UI.esc(UI.deadlineText(c.next_deadline_in_days))}</span>
    </div>
  </div>

  <div class="reason-box" style="margin-top:18px">
    <p class="k">Why this matters</p>
    <p>${UI.esc(c.reason || verdict)}</p>
    ${chips ? '<div class="chips">' + chips + "</div>" : ""}
  </div>`;
}

/* ---- assessment table ------------------------------------------------- */
function assessmentRow(a) {
  if (editing === a.assessment_id) {
    return `
    <tr data-id="${UI.esc(a.assessment_id)}">
      <td><strong>${UI.esc(a.name)}</strong></td>
      <td class="num">${a.weight}%</td>
      <td><input class="w" id="gradeInput" type="number" min="0" max="100" step="0.5"
                 value="${a.grade === null ? "" : a.grade}" placeholder="0-100" autofocus /></td>
      <td>${UI.shortDate(a.due_date)}</td>
      <td>
        <button class="btn btn-primary btn-sm" data-save="${UI.esc(a.assessment_id)}">Save</button>
        <button class="btn btn-quiet btn-sm" data-cancel="1">Cancel</button>
      </td>
    </tr>`;
  }

  return `
  <tr class="${a.status === "Completed" ? "done" : ""}">
    <td><strong>${UI.esc(a.name)}</strong></td>
    <td class="num">${a.weight}%</td>
    <td>${a.grade === null ? '<span class="faint">—</span>' : "<strong>" + a.grade + "%</strong>"}</td>
    <td>${UI.shortDate(a.due_date)}${a.status !== "Completed" && a.days_until_due !== null
        ? ' <span class="faint">(' + UI.esc(UI.deadlineText(a.days_until_due)) + ")</span>" : ""}</td>
    <td>
      <span class="state ${UI.esc(a.status)}">${UI.esc(a.status)}</span>
      <button class="btn btn-ghost btn-sm" data-edit="${UI.esc(a.assessment_id)}" style="margin-left:8px">
        ${a.grade === null ? "Add grade" : "Update"}
      </button>
    </td>
  </tr>`;
}

function tableBlock(c) {
  return `
  <div class="section-head"><h2>Assessment Breakdown</h2></div>
  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th>Assessment</th><th class="num">Weight</th><th>Grade</th><th>Deadline</th><th>Status</th>
        </tr>
      </thead>
      <tbody id="rows">${(c.assessments || []).map(assessmentRow).join("")}</tbody>
    </table>
  </div>`;
}

/* ---- render ----------------------------------------------------------- */
function render(banner) {
  const c = UI.Store.course(current, courseId);
  if (!c) {
    root.innerHTML = UI.emptyState("Course not found",
      "That course is not in your current academic state.",
      '<a class="btn btn-primary" href="courses.html">Back to my courses</a>');
    return;
  }
  root.innerHTML = (banner || "") + headerBlock(c) + tableBlock(c);
  wire();
}

function wire() {
  root.querySelectorAll("[data-edit]").forEach(b =>
    b.addEventListener("click", () => { editing = b.dataset.edit; render(); }));

  const cancel = root.querySelector("[data-cancel]");
  if (cancel) cancel.addEventListener("click", () => { editing = null; render(); });

  const save = root.querySelector("[data-save]");
  if (save) save.addEventListener("click", () => submitGrade(save.dataset.save));

  const input = document.getElementById("gradeInput");
  if (input) {
    input.focus();
    input.addEventListener("keydown", e => { if (e.key === "Enter") submitGrade(editing); });
  }
}

/* ---- the adaptive recovery loop --------------------------------------- */
async function submitGrade(assessmentId) {
  const input = document.getElementById("gradeInput");
  const grade = Number(input.value);

  if (input.value === "" || isNaN(grade) || grade < 0 || grade > 100) {
    editing = assessmentId;
    render('<div class="form-msg error">Enter a grade between 0 and 100.</div>');
    return;
  }

  const before = JSON.parse(JSON.stringify(current));

  root.innerHTML = `
    <div class="loading">
      <span class="spinner"></span>
      Re-evaluating your academic plan...
    </div>
    <p class="muted" style="margin-top:12px;font-size:.88rem">
      The Academic Analyst is reassessing your risk levels, then the Planner rebuilds your week.
    </p>`;

  try {
    const updated = await window.API.saveGrade({
      action: "save_grade",
      student_id: SESSION.student_id,
      course_id: courseId,
      assessment_id: assessmentId,
      grade: grade,
      available_weekly_study_hours: SESSION.weekly_study_hours,
    });

    editing = null;
    current = UI.Store.write(updated);

    const summary = describeChange(before, updated);
    let banner = "";

    if (summary) {
      sessionStorage.setItem("ar_last_change", JSON.stringify({ summary }));
      banner = `
      <div class="alert update">
        <h3>Your study plan has been updated</h3>
        <p>${UI.esc(summary)}</p>
        <div class="actions">
          <a class="btn btn-primary btn-sm" href="study-plan.html">View updated plan</a>
          <a class="btn btn-ghost btn-sm" href="dashboard.html">Back to dashboard</a>
        </div>
      </div>`;
    } else {
      banner = '<div class="form-msg">Grade saved. Your risk levels and study plan are unchanged.</div>';
    }

    render(banner);
  } catch (err) {
    editing = null;
    render('<div class="form-msg error">Could not save that grade: ' + UI.esc(err.message) + "</div>");
  }
}

/* ---- boot -------------------------------------------------------------- */
async function start() {
  root.innerHTML = '<div class="loading"><span class="spinner"></span> Loading course...</div>';
  try {
    current = await UI.Store.load(SESSION);
    render();
  } catch (err) {
    root.innerHTML = '<div class="form-msg error">' + UI.esc(err.message) + "</div>";
  }
}

start();
