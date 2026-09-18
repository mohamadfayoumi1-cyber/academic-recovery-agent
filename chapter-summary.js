/* =====================================================================
   chapter-summary.js  -  AI Chapter Summarizer

   Self-contained dashboard section. The student picks one of their real
   courses, uploads a chapter PDF, and n8n + Gemini return a study
   summary. No AI work happens here - this file only collects the input,
   posts it to n8n, and renders whatever comes back.

   Mounted by dashboard.js:  ChapterSummary.mount(courses)
   ===================================================================== */

(function () {
  const HOST_ID = "chapterSummary";

  let courses = [];
  let busy = false;
  let result = null;   // last successful response from n8n
  let message = null;  // { text, kind }

  /* ---- helpers ------------------------------------------------------ */
  function host() { return document.getElementById(HOST_ID); }

  function say(text, kind) {
    message = text ? { text: text, kind: kind || "error" } : null;
  }

  function isPdf(file) {
    return file && (file.type === "application/pdf" || /\.pdf$/i.test(file.name));
  }

  /* ---- the form ----------------------------------------------------- */
  function formHtml() {
    const options = courses.map(c =>
      '<option value="' + UI.esc(c.course_id) + '">' +
      UI.esc(c.course_name) + (c.course_code ? " (" + UI.esc(c.course_code) + ")" : "") +
      "</option>").join("");

    return `
      <div class="grid-2">
        <div class="field">
          <label for="csCourse">Select course</label>
          <select id="csCourse" ${busy ? "disabled" : ""}>
            <option value="">Choose a course...</option>
            ${options}
          </select>
        </div>

        <div class="field">
          <label for="csFile">Upload chapter (PDF)</label>
          <input id="csFile" type="file" accept="application/pdf,.pdf" ${busy ? "disabled" : ""} />
          <span class="hint">Only PDF files are supported.</span>
        </div>
      </div>

      ${message ? '<div class="form-msg ' + UI.esc(message.kind) + '" style="margin-top:14px">' +
                  UI.esc(message.text) + "</div>" : ""}

      <div class="actions-row">
        <button class="btn btn-primary" id="csGo" ${busy ? "disabled" : ""}>
          ${busy ? "Analyzing your chapter..." : "Generate Summary"}
        </button>
        ${result && !busy
          ? '<button class="btn btn-quiet" id="csAnother">Summarize another chapter</button>'
          : ""}
      </div>

      ${busy ? `
        <div class="loading" style="margin-top:16px">
          <span class="spinner"></span>
          Analyzing your chapter...
        </div>
        <p class="muted" style="margin-top:10px;font-size:.86rem">
          The chapter is being read and summarized. This usually takes under a minute.
        </p>` : ""}
    `;
  }

  /* ---- the summary -------------------------------------------------- */
  function summaryHtml() {
    if (!result) return "";

    const s = result.summary || {};
    const concepts    = Array.isArray(s.key_concepts) ? s.key_concepts.filter(Boolean) : [];
    const definitions = Array.isArray(s.important_definitions)
      ? s.important_definitions.filter(d => d && (d.term || d.definition)) : [];
    const points      = Array.isArray(s.key_points) ? s.key_points.filter(Boolean) : [];

    const nothing = !s.overview && !concepts.length && !definitions.length && !points.length;

    return `
      <section class="summary-out">
        <header class="summary-out-head">
          <p class="k">Chapter summary</p>
          <h3>${UI.esc(result.course_name || "")}</h3>
        </header>

        ${nothing
          ? '<p class="muted">The summarizer returned no content for this chapter.</p>'
          : ""}

        ${s.overview ? `
          <div class="summary-part">
            <h4>Overview</h4>
            <p>${UI.esc(s.overview)}</p>
          </div>` : ""}

        ${concepts.length ? `
          <div class="summary-part">
            <h4>Key concepts</h4>
            <ul>${concepts.map(c => "<li>" + UI.esc(c) + "</li>").join("")}</ul>
          </div>` : ""}

        ${definitions.length ? `
          <div class="summary-part">
            <h4>Important definitions</h4>
            <dl class="defs">
              ${definitions.map(d =>
                "<dt>" + UI.esc(d.term || "") + "</dt><dd>" + UI.esc(d.definition || "") + "</dd>"
              ).join("")}
            </dl>
          </div>` : ""}

        ${points.length ? `
          <div class="summary-part">
            <h4>Key points to remember</h4>
            <ul>${points.map(p => "<li>" + UI.esc(p) + "</li>").join("")}</ul>
          </div>` : ""}
      </section>`;
  }

  /* ---- render ------------------------------------------------------- */
  function draw() {
    const el = host();
    if (!el) return;

    if (!courses.length) {
      el.innerHTML = `
        <div class="section-head"><h2>AI Chapter Summarizer</h2></div>
        ${UI.emptyState(
          "No courses yet",
          "Add a course first, then you can upload a chapter from it for a study summary.",
          '<a class="btn btn-primary" href="add-course.html">+ Add Course</a>')}`;
      return;
    }

    el.innerHTML = `
      <div class="section-head">
        <h2>AI Chapter Summarizer</h2>
        <span class="muted">Upload a chapter and get a study summary</span>
      </div>

      <div class="card">
        ${formHtml()}
      </div>

      ${summaryHtml()}`;

    wire();
  }

  function wire() {
    const go = document.getElementById("csGo");
    if (go) go.addEventListener("click", submit);

    const again = document.getElementById("csAnother");
    if (again) again.addEventListener("click", () => {
      result = null;
      say(null);
      draw();
      const el = host();
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  /* ---- submit ------------------------------------------------------- */
  async function submit() {
    if (busy) return;

    const courseSel = document.getElementById("csCourse");
    const fileIn    = document.getElementById("csFile");

    const courseId = courseSel ? courseSel.value : "";
    const file     = fileIn && fileIn.files ? fileIn.files[0] : null;

    if (!courseId) { say("Choose which course this chapter belongs to."); return draw(); }
    if (!file)     { say("Choose a chapter PDF to upload."); return draw(); }
    if (!isPdf(file)) { say("That file is not a PDF. Only PDF chapters are supported."); return draw(); }
    if (file.size > 20 * 1024 * 1024) {
      say("That file is larger than 20 MB. Try uploading a single chapter.");
      return draw();
    }

    const course = courses.find(c => String(c.course_id) === String(courseId));

    busy = true;
    say(null);
    result = null;
    draw();

    try {
      const data = await window.API.summarizeChapter(file, {
        student_id: SESSION.student_id,
        course_id: courseId,
        course_name: course ? course.course_name : "",
      });

      result = data;
      if (!result.course_name && course) result.course_name = course.course_name;
    } catch (err) {
      say(err && err.message ? err.message : "The chapter could not be summarized. Please try again.");
    } finally {
      busy = false;
      draw();
    }
  }

  /* ---- public ------------------------------------------------------- */
  function mount(courseList) {
    courses = (courseList || []).filter(c => c && c.course_id);
    result = null;
    say(null);
    busy = false;
    draw();
  }

  window.ChapterSummary = { mount };
})();
