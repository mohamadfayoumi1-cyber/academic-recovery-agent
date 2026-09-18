/* =====================================================================
   auth.js   -   FRONT-END ONLY. No server code lives here.

   Accounts are stored in Google Sheets and handled entirely by n8n.
   This file does exactly three things:
     1. hashes the password in the browser (SHA-256, salted with the ID)
     2. POSTs to the n8n webhooks in config.js
     3. keeps the signed-in session in the browser

   The plain password NEVER leaves this file - n8n and the Sheet only
   ever see the hash.
   ===================================================================== */

const SESSION_KEY = "ar_session";

/* ---- hashing -------------------------------------------------------- */
async function hashPassword(studentId, password) {
  const raw = "ar$" + String(studentId).toLowerCase() + "$" + password;

  if (window.crypto && window.crypto.subtle) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
    return Array.from(new Uint8Array(buf))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");
  }
  throw new Error("This browser cannot hash passwords. Open the site over https or localhost.");
}

/* ---- password rules ------------------------------------------------- */
function passwordChecks(pw) {
  return {
    length: pw.length >= 8,
    letter: /[A-Za-z]/.test(pw),
    number: /[0-9]/.test(pw),
    symbol: /[^A-Za-z0-9]/.test(pw),
  };
}
function passwordIsValid(pw) {
  const c = passwordChecks(pw);
  return c.length && c.letter && c.number;   // symbol encouraged, not required
}

/* ---- talking to n8n -------------------------------------------------- */
async function postToN8n(url, body) {
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

/* =====================================================================
   OFFLINE DEMO  -  only used when a URL in config.js is still empty.
   Delete this block once n8n is live and set ALLOW_OFFLINE_DEMO to false.
   ===================================================================== */
const DEMO_KEY = "ar_demo_accounts";

function demoRead() {
  try { return JSON.parse(localStorage.getItem(DEMO_KEY)) || {}; } catch (e) { return {}; }
}
function demoWrite(a) { localStorage.setItem(DEMO_KEY, JSON.stringify(a)); }

function offlineAllowed(url) {
  return !url && window.CONFIG && window.CONFIG.ALLOW_OFFLINE_DEMO;
}

/* ---- create account -------------------------------------------------- */
async function createAccount(form) {
  const id   = String(form.student_id || "").trim();
  const name = String(form.student_name || "").trim();
  const pw   = String(form.password || "");

  if (!id)                  throw new Error("Student ID is required.");
  if (!name)                throw new Error("Please enter your full name.");
  if (!passwordIsValid(pw)) throw new Error("Password must be at least 8 characters and include a letter and a number.");
  if (pw !== form.confirm)  throw new Error("The two passwords do not match.");

  const password_hash = await hashPassword(id, pw);
  const payload = {
    action: "signup",
    student_id: id,
    student_name: name,
    weekly_hours: Number(form.weekly_hours) || 15,
    password_hash,
  };

  const url = window.CONFIG.SIGNUP_URL;

  if (offlineAllowed(url)) {
    const accounts = demoRead();
    if (accounts[id.toLowerCase()]) throw new Error("An account with this student ID already exists. Try signing in.");
    accounts[id.toLowerCase()] = payload;
    demoWrite(accounts);
    return payload;
  }

  return postToN8n(url, payload);
}

/* ---- sign in --------------------------------------------------------- */
async function login(studentId, password) {
  const id = String(studentId || "").trim();
  if (!id) throw new Error("Enter your student ID.");

  const password_hash = await hashPassword(id, String(password || ""));
  const url = window.CONFIG.LOGIN_URL;

  let account;

  if (offlineAllowed(url)) {
    account = demoRead()[id.toLowerCase()];
    if (!account) throw new Error("No account found for that student ID.");
    if (account.password_hash !== password_hash) throw new Error("Incorrect password. Try again.");
  } else {
    account = await postToN8n(url, { action: "login", student_id: id, password_hash });
    if (!account || !account.student_id) throw new Error("Incorrect student ID or password.");
  }

  const session = {
    student_id:   account.student_id,
    student_name: account.student_name || account.student_id,
    weekly_hours: Number(account.weekly_hours) || 15,
    signed_in_at: new Date().toISOString(),
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

/* ---- session --------------------------------------------------------- */
function getSession() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY)); } catch (e) { return null; }
}
function logout() { localStorage.removeItem(SESSION_KEY); }
function requireSession(redirectTo) {
  const session = getSession();
  if (!session) { window.location.replace(redirectTo || "index.html"); return null; }
  return session;
}

window.Auth = {
  createAccount, login, logout, getSession, requireSession,
  passwordChecks, passwordIsValid, hashPassword,
};
