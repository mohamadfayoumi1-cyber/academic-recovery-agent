/* login.js  -  OWNER: Mohamad */

// already signed in? go straight through
if (window.Auth.getSession()) window.location.replace("dashboard.html");

const form = document.getElementById("loginForm");
const msg  = document.getElementById("loginMsg");

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

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = form.querySelector("button[type=submit]");

  showMsg("");
  btn.disabled = true;
  btn.textContent = "Signing in...";

  try {
    await window.Auth.login(
      document.getElementById("studentId").value,
      document.getElementById("password").value
    );
    window.location.href = "dashboard.html";
  } catch (err) {
    showMsg(err.message, "error");
    btn.disabled = false;
    btn.textContent = "Sign in";
  }
});
