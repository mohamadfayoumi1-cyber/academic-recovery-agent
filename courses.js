/* courses.js  -  every course, ordered by how much attention it needs */

const root = document.getElementById("root");

function render(data) {
  const courses = [...(data.courses || [])].sort((a, b) => (a.priority || 99) - (b.priority || 99));

  const body = courses.length
    ? '<div class="cards">' + courses.map(UI.courseCard).join("") + "</div>"
    : UI.emptyState(
        "No courses yet",
        "Upload a syllabus and the grading structure will be read out for you.",
        '<a class="btn btn-primary" href="add-course.html">+ Add Course</a>');

  root.innerHTML = `
    <div class="page-head">
      <h1>My Courses</h1>
      <p>Ordered by priority &mdash; the courses needing the most attention come first.</p>
    </div>

    <div class="section-head">
      <h2>${courses.length} course${courses.length === 1 ? "" : "s"}</h2>
      <a class="btn btn-primary btn-sm" href="add-course.html">+ Add Course</a>
    </div>

    ${body}`;
}

async function start() {
  root.innerHTML = '<div class="loading"><span class="spinner"></span> Loading your courses...</div>';
  try {
    render(await UI.Store.load(SESSION));
  } catch (err) {
    root.innerHTML = '<div class="form-msg error">' + UI.esc(err.message) + "</div>";
  }
}

start();
