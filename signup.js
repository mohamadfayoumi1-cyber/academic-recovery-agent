/* signup.js  -  OWNER: Mohamad */

const form = document.getElementById("signupForm");
const msg  = document.getElementById("signupMsg");
const pw   = document.getElementById("password");
const list = document.getElementById("pwChecks");

function showMsg(text, kind) {
  if (!text) { msg.hidden = true; return; }
  msg.hidden = false;
  msg.className = "form-msg " + (kind || "");
  msg.textContent = text;
}

// show / hide password
document.querySelectorAll(".pw-toggle").forEach(btn => {
  btn.addEventListener("click", () => {
    const input = document.getElementById(btn.dataset.target);
    const show = input.type === "password";
    input.type = show ? "text" : "password";
    btn.textContent = show ? "Hide" : "Show";
    input.focus();
  });
});

// live password requirements
pw.addEventListener("input", () => {
  const checks = window.Auth.passwordChecks(pw.value);
  list.querySelectorAll("li").forEach(li => {
    li.classList.toggle("ok", !!checks[li.dataset.check]);
  });
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = form.querySelector("button[type=submit]");

  showMsg("");
  btn.disabled = true;
  btn.textContent = "Creating...";

  try {
    await window.Auth.createAccount({
      student_id:   document.getElementById("studentId").value,
      student_name: document.getElementById("studentName").value,
      weekly_hours: document.getElementById("weeklyHours").value,
      password:     pw.value,
      confirm:      document.getElementById("confirm").value,
    });

    // straight into the dashboard
    await window.Auth.login(document.getElementById("studentId").value, pw.value);
    window.location.href = "dashboard.html";
  } catch (err) {
    showMsg(err.message, "error");
    btn.disabled = false;
    btn.textContent = "Create account";
  }
});
