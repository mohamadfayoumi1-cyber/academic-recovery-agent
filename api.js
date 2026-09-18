/* =====================================================================
   api.js  -  every call to n8n lives here. Nothing else does networking.

   The frontend NEVER calculates academic analysis. Grades, risk levels,
   priorities and study plans are produced by the n8n workflows and this
   file only passes them through.

   When a URL in config.js is empty and ALLOW_OFFLINE_DEMO is true, the
   matching call returns a static fixture from sample-data.js so the UI
   can be built and demoed before n8n is finished. Fixtures are canned
   responses - no analysis is computed here.
   ===================================================================== */

const DEMO_ACCOUNTS = "ar_demo_accounts";
const DEMO_COURSES  = "ar_demo_courses";
const DEMO_STAGE    = "ar_demo_stage";     // "baseline" | "updated"

function demoOn(url) {
  return !url && window.CONFIG && window.CONFIG.ALLOW_OFFLINE_DEMO;
}
function readLS(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch (e) { return fallback; }
}
function writeLS(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
function pause(ms) { return new Promise(r => setTimeout(r, ms)); }
function clone(o) { return JSON.parse(JSON.stringify(o)); }

/* ---- plain JSON POST -------------------------------------------------- */
async function post(url, body) {
  let res;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (e) {
    throw new Error("Could not reach the server. Check your connection.");
  }
  if (!res.ok) throw new Error("Server replied " + res.status + ". Check the n8n workflow is active.");

  let data;
  try { data = await res.json(); }
  catch (e) { throw new Error("The server did not return JSON."); }

  if (data && data.success === false) throw new Error(data.error || "Request refused.");
  return data;
}

/* ---- file upload POST -------------------------------------------------- */
async function postFile(url, file, fields) {
  const fd = new FormData();
  fd.append("file", file, file.name);
  Object.keys(fields || {}).forEach(k => fd.append(k, fields[k]));

  let res;
  try { res = await fetch(url, { method: "POST", body: fd }); }
  catch (e) { throw new Error("Could not upload the file. Check your connection."); }

  if (!res.ok) throw new Error("Upload failed (" + res.status + ").");

  let data;
  try { data = await res.json(); }
  catch (e) { throw new Error("The server did not return JSON."); }

  if (data && data.success === false) throw new Error(data.error || "Could not read that syllabus.");
  return data;
}

/* =====================================================================
   ACCOUNTS
   ===================================================================== */

async function signUp(payload) {
  const url = window.CONFIG.SIGNUP_URL;
  if (!demoOn(url)) return post(url, payload);

  const accounts = readLS(DEMO_ACCOUNTS, {});
  const key = payload.email.toLowerCase();
  if (accounts[key]) throw new Error("An account with this email already exists. Try signing in.");

  const account = Object.assign({}, payload, {
    student_id: "S" + String(Object.keys(accounts).length + 1).padStart(3, "0"),
  });
  delete account.action;
  accounts[key] = account;
  writeLS(DEMO_ACCOUNTS, accounts);
  await pause(500);
  return account;
}

async function signIn(payload) {
  const url = window.CONFIG.LOGIN_URL;
  if (!demoOn(url)) return post(url, payload);

  const account = readLS(DEMO_ACCOUNTS, {})[payload.email.toLowerCase()];
  if (!account) throw new Error("No account found for that email.");
  if (account.password_hash !== payload.password_hash) throw new Error("Incorrect email or password.");
  await pause(400);
  return account;
}

async function updateProfile(payload) {
  const url = window.CONFIG.PROFILE_URL;
  if (!demoOn(url)) return post(url, payload);

  const accounts = readLS(DEMO_ACCOUNTS, {});
  const key = Object.keys(accounts).find(k => accounts[k].student_id === payload.student_id);
  if (key) { Object.assign(accounts[key], payload); writeLS(DEMO_ACCOUNTS, accounts); }
  await pause(400);
  return { success: true };
}

/* =====================================================================
   ACADEMICS
   ===================================================================== */

/* Full academic state + study plan, produced by the n8n agents. */
async function analyze(studentId, weeklyHours) {
  const url = window.CONFIG.ANALYZE_URL;
  if (!demoOn(url)) {
    const data = await post(url, {
      student_id: studentId,
      available_weekly_study_hours: Number(weeklyHours) || 15,
    });
    if (!Array.isArray(data.courses)) {
      throw new Error("The response had no 'courses' array. Check the Respond to Webhook node.");
    }
    return data;
  }

  await pause(900);
  const stage = readLS(DEMO_STAGE, "baseline");
  const data = clone(stage === "updated" ? window.SAMPLE.analysisUpdated : window.SAMPLE.analysis);
  data.available_weekly_study_hours = Number(weeklyHours) || data.available_weekly_study_hours;
  readLS(DEMO_COURSES, []).forEach(c => data.courses.push(c));
  return data;
}

/* Gemini reads the PDF and returns the grading structure for review. */
async function extractSyllabus(file, studentId, targetGrade) {
  const url = window.CONFIG.SYLLABUS_URL;
  if (!demoOn(url)) {
    return postFile(url, file, { student_id: studentId, target_grade: targetGrade });
  }
  await pause(1800);
  const extracted = clone(window.SAMPLE.syllabus);
  extracted.target_grade = Number(targetGrade) || 80;
  return extracted;
}

async function addCourse(payload) {
  const url = window.CONFIG.ADD_COURSE_URL;
  if (!demoOn(url)) return post(url, payload);

  const courses = readLS(DEMO_COURSES, []);
  courses.push(window.SAMPLE.courseFromDraft(payload, "C" + (90 + courses.length)));
  writeLS(DEMO_COURSES, courses);
  await pause(600);
  return { success: true };
}

/* Sends the grade, then n8n re-runs the analyst + planner and returns
   the new academic state. */
async function saveGrade(payload) {
  const url = window.CONFIG.SAVE_GRADE_URL;
  if (!demoOn(url)) return post(url, payload);

  await pause(1600);
  writeLS(DEMO_STAGE, "updated");
  return clone(window.SAMPLE.analysisUpdated);
}

/* Demo helper so the presenter can reset between run-throughs. */
function resetDemo() {
  localStorage.removeItem(DEMO_STAGE);
  localStorage.removeItem(DEMO_COURSES);
}

window.API = {
  signUp, signIn, updateProfile,
  analyze, extractSyllabus, addCourse, saveGrade,
  resetDemo,
};
