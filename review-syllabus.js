/* =====================================================================
   review-syllabus.js  -  the student checks what was extracted before
   anything is saved. Everything is editable, and blanks stay blank -
   the AI never fills in what the syllabus did not say.
   ===================================================================== */

const root = document.getElementById("root");

let draft = null;
try { draft = JSON.parse(sessionStorage.getItem("ar_syllabus_draft")); } catch (e) {}

if (!draft) {
  root.innerHTML = UI.emptyState(
    "Nothing to review",
    "Upload a syllabus first and the extracted structure will appear here.",
    '<a class="btn btn-primary" href="add-course.html">Upload a syllabus</a>');
} else {
  draft.assessments = draft.assessments || [];
  render();
}

function totalWeight() {
  return draft.assessments.reduce((s, a) => s + (Number(a.weight) || 0), 0);
}

function rowHtml(a, i) {
  return `
  <tr>
    <td><input data-i="${i}" data-f="name" type="text" value="${UI.esc(a.name || "")}" placeholder="Assessment name" /></td>
    <td><input data-i="${i}" data-f="weight" class="w" type="number" min="0" max="100" step="0.5"
               value="${a.weight === "" || a.weight === null || a.weight === undefined ? "" : a.weight}" placeholder="%" /></td>
    <td><input data-i="${i}" data-f="due_date" type="date" value="${UI.esc(a.due_date || "")}" /></td>
    <td><button class="btn btn-danger btn-sm" data-del="${i}">Delete</button></td>
  </tr>`;
}

function render(flash) {
  const total = totalWeight();
  const ok = Math.abs(total - 100) < 0.01;
  const missingDates = draft.assessments.filter(a => !a.due_date).length;

  root.innerHTML = `
    <div class="page-head">
      <h1>AI Syllabus Review</h1>
      <p>We analyzed your syllabus. Please verify the information before saving.</p>
    </div>

    ${flash || ""}

    <div class="card" style="max-width:860px">
      <div class="grid-2">
        <div class="field">
          <label for="courseName">Course name</label>
          <input id="courseName" type="text" value="${UI.esc(draft.course_name || "")}" placeholder="e.g. Operating Systems" />
        </div>
        <div class="field">
          <label for="courseCode">Course code</label>
          <input id="courseCode" type="text" value="${UI.esc(draft.course_code || "")}" placeholder="e.g. CMPS 330" />
        </div>
      </div>

      <div class="field" style="margin-top:15px;max-width:240px">
        <label for="target">Target grade</label>
        <input id="target" type="number" min="0" max="100" step="1" value="${UI.esc(draft.target_grade ?? 80)}" />
      </div>
    </div>

    <div class="section-head">
      <h2>Assessments</h2>
      <button class="btn btn-ghost btn-sm" id="addRow">+ Add assessment</button>
    </div>

    <div class="table-wrap" style="max-width:860px">
      <table>
        <thead>
          <tr><th>Assessment</th><th>Weight</th><th>Deadline</th><th></th></tr>
        </thead>
        <tbody>${draft.assessments.map(rowHtml).join("")}</tbody>
      </table>
    </div>

    <div class="total-bar ${ok ? "ok" : "bad"}" style="max-width:860px;margin-top:14px">
      <span>Total Weight: ${Math.round(total * 100) / 100}%</span>
      <span>${ok ? "Adds up correctly" : "Weights should add up to 100%"}</span>
    </div>

    ${missingDates ? `<div class="form-msg warn" style="max-width:860px;margin-top:12px">
      ${missingDates} assessment${missingDates === 1 ? " has" : "s have"} no deadline.
      The syllabus did not state one, so it was left blank rather than guessed.
      Add the date if you know it &mdash; the planner uses deadlines to decide what is urgent.
    </div>` : ""}

    <div id="msg" class="form-msg error" hidden style="max-width:860px;margin-top:12px"></div>

    <div class="actions-row">
      <button class="btn btn-primary" id="confirm">Confirm &amp; Add Course</button>
      <a class="btn btn-quiet" href="add-course.html">Cancel</a>
    </div>`;

  wire();
}

function wire() {
  root.querySelectorAll("input[data-i]").forEach(input => {
    input.addEventListener("input", () => {
      const a = draft.assessments[Number(input.dataset.i)];
      a[input.dataset.f] = input.dataset.f === "weight"
        ? (input.value === "" ? "" : Number(input.value))
        : input.value;
      if (input.dataset.f === "weight") refreshTotal();
    });
  });

  root.querySelectorAll("[data-del]").forEach(b =>
    b.addEventListener("click", () => {
      draft.assessments.splice(Number(b.dataset.del), 1);
      render();
    }));

  document.getElementById("addRow").addEventListener("click", () => {
    draft.assessments.push({ name: "", weight: "", due_date: "" });
    render();
  });

  document.getElementById("confirm").addEventListener("click", save);
}

/* update the total without redrawing the inputs the student is typing in */
function refreshTotal() {
  const bar = root.querySelector(".total-bar");
  if (!bar) return;
  const total = totalWeight();
  const ok = Math.abs(total - 100) < 0.01;
  bar.className = "total-bar " + (ok ? "ok" : "bad");
  bar.style.maxWidth = "860px";
  bar.innerHTML = "<span>Total Weight: " + (Math.round(total * 100) / 100) + "%</span>" +
                  "<span>" + (ok ? "Adds up correctly" : "Weights should add up to 100%") + "</span>";
}

async function save() {
  const msg = document.getElementById("msg");
  const btn = document.getElementById("confirm");
  const show = t => { msg.hidden = false; msg.textContent = t; };
  msg.hidden = true;

  const courseName = document.getElementById("courseName").value.trim();
  const target = Number(document.getElementById("target").value);

  if (!courseName) return show("Give the course a name.");
  if (!draft.assessments.length) return show("Add at least one assessment.");
  if (draft.assessments.some(a => !String(a.name).trim())) return show("Every assessment needs a name.");
  if (draft.assessments.some(a => !(Number(a.weight) > 0))) return show("Every assessment needs a weight above 0.");
  if (!target || target < 0 || target > 100) return show("Enter a target grade between 0 and 100.");

  const total = totalWeight();
  if (Math.abs(total - 100) > 0.01) {
    if (!confirm("The weights add up to " + total + "%, not 100%.\n\nSave the course anyway?")) return;
  }

  btn.disabled = true;
  btn.textContent = "Saving...";

  try {
    await window.API.addCourse({
      action: "add_course",
      student_id: SESSION.student_id,
      course_name: courseName,
      course_code: document.getElementById("courseCode").value.trim(),
      target_grade: target,
      assessments: draft.assessments.map(a => ({
        name: String(a.name).trim(),
        weight: Number(a.weight),
        due_date: a.due_date || "",
      })),
    });

    sessionStorage.removeItem("ar_syllabus_draft");
    UI.Store.clear();                       // force a fresh analysis
    window.location.href = "courses.html";
  } catch (err) {
    btn.disabled = false;
    btn.textContent = "Confirm & Add Course";
    show(err.message);
  }
}
