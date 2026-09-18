/* signup.js */

if (window.Auth.getSession()) window.location.replace("dashboard.html");

const form = document.getElementById("form");
const msg  = document.getElementById("msg");
const pw   = document.getElementById("password");
const list = document.getElementById("pwChecks");

function showMsg(text, kind) {
  if (!text) { msg.hidden = true; return; }
  msg.hidden = false;
  msg.className = "form-msg " + (kind || "");
  msg.textContent = text;
}

document.querySelectorAll(".pw-toggle").forEach(btn => {
  btn.addEventListener("click", () => {
    const input = document.getElementById(btn.dataset.target);
    const show = input.type === "password";
    input.type = show ? "text" : "password";
    btn.textContent = show ? "Hide" : "Show";
    input.focus();
  });
});

pw.addEventListener("input", () => {
  const checks = window.Auth.passwordChecks(pw.value);
  list.querySelectorAll("li").forEach(li => {
    li.classList.toggle("ok", !!checks[li.dataset.check]);
  });
});

form.addEventListener("submit", async e => {
  e.preventDefault();
  const btn = form.querySelector("button[type=submit]");
  showMsg("");
  btn.disabled = true;
  btn.textContent = "Creating account...";

  try {
    await window.Auth.signUp({
      full_name:          document.getElementById("fullName").value,
      student_id:         document.getElementById("studentId").value,
      email:              document.getElementById("email").value,
      password:           pw.value,
      confirm:            document.getElementById("confirm").value,
      university:         document.getElementById("university").value,
      major:              document.getElementById("major").value,
      semester:           document.getElementById("semester").value,
      weekly_study_hours: document.getElementById("hours").value,
      target_gpa:         document.getElementById("gpa").value,
    });
    sessionStorage.removeItem("ar_analysis");
    window.location.href = "dashboard.html";
  } catch (err) {
    showMsg(err.message, "error");
    btn.disabled = false;
    btn.textContent = "Create Account";
  }
});
