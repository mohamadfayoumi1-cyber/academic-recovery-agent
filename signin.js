/* signin.js */

if (window.Auth.getSession()) window.location.replace("dashboard.html");

const form = document.getElementById("form");
const msg  = document.getElementById("msg");

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

form.addEventListener("submit", async e => {
  e.preventDefault();
  const btn = form.querySelector("button[type=submit]");
  showMsg("");
  btn.disabled = true;
  btn.textContent = "Signing in...";

  try {
    await window.Auth.signIn(
      document.getElementById("email").value,
      document.getElementById("password").value
    );
    sessionStorage.removeItem("ar_analysis");
    window.location.href = "dashboard.html";
  } catch (err) {
    showMsg(err.message, "error");
    btn.disabled = false;
    btn.textContent = "Sign In";
  }
});
