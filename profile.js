/* profile.js  -  update the student's details and study-hour budget */

const form = document.getElementById("form");
const msg  = document.getElementById("msg");

const fields = {
  fullName:   document.getElementById("fullName"),
  email:      document.getElementById("email"),
  university: document.getElementById("university"),
  major:      document.getElementById("major"),
  semester:   document.getElementById("semester"),
  gpa:        document.getElementById("gpa"),
  hours:      document.getElementById("hours"),
};

fields.fullName.value   = SESSION.full_name || "";
fields.email.value      = SESSION.email || "";
fields.university.value = SESSION.university || "";
fields.major.value      = SESSION.major || "";
fields.semester.value   = SESSION.semester || "";
fields.gpa.value        = SESSION.target_gpa ?? "";
fields.hours.value      = SESSION.weekly_study_hours || 15;

function showMsg(text, kind) {
  if (!text) { msg.hidden = true; return; }
  msg.hidden = false;
  msg.className = "form-msg " + (kind || "");
  msg.textContent = text;
}

form.addEventListener("submit", async e => {
  e.preventDefault();
  const btn = form.querySelector("button[type=submit]");
  showMsg("");

  const name  = fields.fullName.value.trim();
  const hours = Number(fields.hours.value);

  if (!name) return showMsg("Please enter your full name.", "error");
  if (!hours || hours <= 0 || hours > 80) return showMsg("Weekly study hours must be between 1 and 80.", "error");

  const hoursChanged = hours !== Number(SESSION.weekly_study_hours);

  btn.disabled = true;
  btn.textContent = "Saving...";

  try {
    await window.API.updateProfile({
      action: "update_profile",
      student_id: SESSION.student_id,
      full_name: name,
      university: fields.university.value.trim(),
      major: fields.major.value.trim(),
      semester: fields.semester.value.trim(),
      weekly_study_hours: hours,
      target_gpa: fields.gpa.value === "" ? null : Number(fields.gpa.value),
    });

    window.Auth.updateSession({
      full_name: name,
      university: fields.university.value.trim(),
      major: fields.major.value.trim(),
      semester: fields.semester.value.trim(),
      weekly_study_hours: hours,
      target_gpa: fields.gpa.value === "" ? null : Number(fields.gpa.value),
    });

    if (hoursChanged) UI.Store.clear();     // the planner needs to re-allocate

    showMsg(hoursChanged
      ? "Saved. Your study plan will be rebuilt with " + hours + " hours."
      : "Saved.");

    const who = document.querySelector(".who-name");
    if (who) who.textContent = name;
  } catch (err) {
    showMsg(err.message, "error");
  } finally {
    btn.disabled = false;
    btn.textContent = "Save Changes";
  }
});

document.getElementById("signOut").addEventListener("click", () => {
  window.Auth.signOut();
  UI.Store.clear();
  window.location.replace("signin.html");
});

document.getElementById("resetDemo").addEventListener("click", () => {
  window.API.resetDemo();
  UI.Store.clear();
  sessionStorage.removeItem("ar_last_change");
  sessionStorage.removeItem("ar_syllabus_draft");
  showMsg("Demo data reset. Go back to the dashboard to start again.");
});
