/* =====================================================================
   add-course.js  -  send the syllabus PDF to n8n, then hand the extracted
   structure to the review page. Nothing is saved until the student
   confirms it.
   ===================================================================== */

const form   = document.getElementById("form");
const drop   = document.getElementById("drop");
const fileIn = document.getElementById("file");
const chip   = document.getElementById("chip");
const name   = document.getElementById("fileName");
const msg    = document.getElementById("msg");
const busy   = document.getElementById("busy");

let chosen = null;

function showMsg(text, kind) {
  if (!text) { msg.hidden = true; return; }
  msg.hidden = false;
  msg.className = "form-msg " + (kind || "");
  msg.textContent = text;
}

function setFile(file) {
  if (!file) return;
  const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
  if (!isPdf) { showMsg("Please choose a PDF file.", "error"); return; }
  if (file.size > 15 * 1024 * 1024) { showMsg("That file is larger than 15 MB.", "error"); return; }

  chosen = file;
  name.textContent = file.name + "  (" + Math.round(file.size / 1024) + " KB)";
  chip.hidden = false;
  drop.hidden = true;
  showMsg("");
}

drop.addEventListener("click", () => fileIn.click());
fileIn.addEventListener("change", () => setFile(fileIn.files[0]));

["dragenter", "dragover"].forEach(ev =>
  drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add("over"); }));
["dragleave", "drop"].forEach(ev =>
  drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove("over"); }));
drop.addEventListener("drop", e => setFile(e.dataTransfer.files[0]));

document.getElementById("clearFile").addEventListener("click", () => {
  chosen = null;
  fileIn.value = "";
  chip.hidden = true;
  drop.hidden = false;
});

form.addEventListener("submit", async e => {
  e.preventDefault();

  const target = Number(document.getElementById("target").value);
  if (!target || target < 0 || target > 100) {
    showMsg("Enter a target grade between 0 and 100.", "error");
    return;
  }
  if (!chosen) {
    showMsg("Choose your syllabus PDF first.", "error");
    return;
  }

  showMsg("");
  form.hidden = true;
  busy.hidden = false;

  try {
    const extracted = await window.API.extractSyllabus(chosen, SESSION.student_id, target);

    if (!extracted || !Array.isArray(extracted.assessments)) {
      throw new Error("The syllabus could not be read. Try a clearer PDF, or add the course manually.");
    }

    extracted.target_grade = extracted.target_grade || target;
    sessionStorage.setItem("ar_syllabus_draft", JSON.stringify(extracted));
    window.location.href = "review-syllabus.html";
  } catch (err) {
    busy.hidden = true;
    form.hidden = false;
    showMsg(err.message, "error");
  }
});
