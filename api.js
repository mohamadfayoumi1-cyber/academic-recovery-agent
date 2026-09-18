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
async function postFile(url, file, fields, failMessage) {
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

  if (data && data.success === false) {
    throw new Error(data.error || failMessage || "Could not read that syllabus.");
  }
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

  if (url) return post(url, payload);

  /* No profile webhook yet. The change still applies to this session, so
     the planner uses the new hours - it just is not written to the sheet. */
  const accounts = readLS(DEMO_ACCOUNTS, {});
  const key = Object.keys(accounts).find(k => accounts[k].student_id === payload.student_id);
  if (key) { Object.assign(accounts[key], payload); writeLS(DEMO_ACCOUNTS, accounts); }
  await pause(300);
  return { success: true, saved_locally: true };
}

/* =====================================================================
   ACADEMICS
   ===================================================================== */

/* A student who has not added any courses yet. n8n has nothing to
   analyse and replies with an empty body, which is not an error. */
function emptySemester(studentId, weeklyHours) {
  return {
    success: true,
    student_id: studentId,
    overall_status: "ON_TRACK",
    available_weekly_study_hours: Number(weeklyHours) || 15,
    today: new Date().toISOString().slice(0, 10),
    courses: [],
    study_plan: [],
  };
}

/* Full academic state + study plan, produced by the n8n agents. */
async function analyze(studentId, weeklyHours) {
  const url = window.CONFIG.ANALYZE_URL;

  if (!demoOn(url)) {
    let res;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: studentId,
          available_weekly_study_hours: Number(weeklyHours) || 15,
        }),
      });
    } catch (e) {
      throw new Error("Could not reach the server. Check your connection.");
    }

    const text = (await res.text()).trim();

    if (!res.ok) {
      if (text.indexOf("Error in workflow") !== -1) {
        throw new Error("The AI service is busy right now - it limits how many requests " +
                        "it accepts per minute. Wait about a minute and try again.");
      }
      throw new Error("The analysis workflow replied " + res.status + ".");
    }

    if (!text) return emptySemester(studentId, weeklyHours);

    let data;
    try { data = JSON.parse(text); }
    catch (e) { throw new Error("The analysis workflow did not return JSON."); }

    if (data && data.success === false) {
      throw new Error(data.error || data.message || "The analysis was refused.");
    }
    if (!Array.isArray(data.courses)) return emptySemester(studentId, weeklyHours);

    return data;
  }

  await pause(900);
  const stage = readLS(DEMO_STAGE, "baseline");
  const data = clone(stage === "updated" ? window.SAMPLE.analysisUpdated : window.SAMPLE.analysis);
  data.available_weekly_study_hours = Number(weeklyHours) || data.available_weekly_study_hours;
  readLS(DEMO_COURSES, []).forEach(c => data.courses.push(c));
  return data;
}

/* Gemini reads the PDF and returns the grading structure for review.
   n8n wraps it in { data: ... } and names the fields assessment_name /
   deadline, so normalise it to the shape the review page uses. */
async function extractSyllabus(file, studentId, targetGrade) {
  const url = window.CONFIG.SYLLABUS_URL;

  if (demoOn(url)) {
    await pause(1800);
    const extracted = clone(window.SAMPLE.syllabus);
    extracted.target_grade = Number(targetGrade) || 80;
    return extracted;
  }

  const raw = await postFile(url, file, { student_id: studentId, target_grade: targetGrade });
  const d = raw.data || raw;

  return {
    success: true,
    course_name: d.course_name || "",
    course_code: d.course_code || "",
    target_grade: Number(targetGrade) || 80,
    assessments: (d.assessments || []).map(a => ({
      name: a.assessment_name ?? a.name ?? "",
      weight: a.weight === null || a.weight === undefined ? "" : a.weight,
      due_date: a.deadline ?? a.due_date ?? "",
    })),
  };
}

/* n8n's confirm-syllabus expects assessment_name / deadline. */
async function addCourse(payload) {
  const url = window.CONFIG.ADD_COURSE_URL;

  if (demoOn(url)) {
    const courses = readLS(DEMO_COURSES, []);
    courses.push(window.SAMPLE.courseFromDraft(payload, "C" + (90 + courses.length)));
    writeLS(DEMO_COURSES, courses);
    await pause(600);
    return { success: true };
  }

  return post(url, {
    student_id: payload.student_id,
    course_name: payload.course_name,
    course_code: payload.course_code,
    credits: 0,
    target_grade: payload.target_grade,
    assessments: (payload.assessments || []).map(a => ({
      assessment_name: a.name,
      weight: a.weight,
      deadline: a.due_date || "",
    })),
  });
}

/* Save the grade, then ask for the fresh academic state. Two calls keeps
   the n8n side simple - update-grade only has to confirm the write. */
async function saveGrade(payload) {
  const url = window.CONFIG.SAVE_GRADE_URL;

  if (demoOn(url)) {
    await pause(1600);
    writeLS(DEMO_STAGE, "updated");
    return clone(window.SAMPLE.analysisUpdated);
  }

  await post(url, payload);
  return analyze(payload.student_id, payload.available_weekly_study_hours);
}

/* =====================================================================
   AI CHAPTER SUMMARIZER
   The PDF goes to n8n, which extracts the text and asks Gemini for a
   study summary. No AI processing happens in the browser.
   ===================================================================== */
async function summarizeChapter(file, fields) {
  const url = window.CONFIG.CHAPTER_SUMMARY_URL;

  if (!url) {
    throw new Error("The chapter summarizer is not connected yet. Add the webhook URL " +
                    "as CHAPTER_SUMMARY_URL in config.js once the n8n workflow is published.");
  }

  const data = await postFile(url, file, fields, "The chapter could not be summarized.");

  if (!data || !data.summary) {
    throw new Error("The summarizer did not return a summary. Try again in a moment.");
  }
  return data;
}

/* =====================================================================
   Editing a deadline and removing a course.

   Both go to the same n8n webhook, which switches on "action". Neither
   touches the sheet from the browser.
   ===================================================================== */
async function updateDeadline(fields) {
  const url = window.CONFIG.COURSE_ADMIN_URL;
  if (!url) throw new Error("Editing deadlines is not connected yet.");

  return post(url, {
    action: "update_deadline",
    assessment_id: fields.assessment_id,
    due_date: fields.due_date,
  });
}

async function deleteCourse(fields) {
  const url = window.CONFIG.COURSE_ADMIN_URL;
  if (!url) throw new Error("Removing a course is not connected yet.");

  return post(url, {
    action: "delete_course",
    student_id: fields.student_id,
    course_id: fields.course_id,
  });
}

/* Demo helper so the presenter can reset between run-throughs. */
function resetDemo() {
  localStorage.removeItem(DEMO_STAGE);
  localStorage.removeItem(DEMO_COURSES);
}

window.API = {
  signUp, signIn, updateProfile,
  analyze, extractSyllabus, addCourse, saveGrade, summarizeChapter,
  updateDeadline, deleteCourse,
  resetDemo,
};
