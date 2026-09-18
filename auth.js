/* =====================================================================
   auth.js  -  FRONT-END ONLY. Accounts live in Google Sheets via n8n.

   This file: hashes the password in the browser, calls the n8n auth
   webhooks, and keeps the signed-in session. The plain password never
   leaves this file - n8n and the Sheet only ever see a SHA-256 hash.
   ===================================================================== */

const SESSION_KEY = "ar_session";

/* ---- hashing --------------------------------------------------------- */
async function hashPassword(email, password) {
  const raw = "ar$" + String(email).trim().toLowerCase() + "$" + password;
  if (!(window.crypto && window.crypto.subtle)) {
    throw new Error("This browser cannot hash passwords. Open the site over https or localhost.");
  }
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

/* ---- validation ------------------------------------------------------ */
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
  return c.length && c.letter && c.number;
}
function emailIsValid(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim());
}

/* ---- sign up --------------------------------------------------------- */
async function signUp(form) {
  const email = String(form.email || "").trim();
  const name  = String(form.full_name || "").trim();
  const pw    = String(form.password || "");

  const studentId = String(form.student_id || "").trim();

  if (!name)                 throw new Error("Please enter your full name.");
  if (!studentId)            throw new Error("Please enter your student ID.");
  if (!emailIsValid(email))  throw new Error("Please enter a valid email address.");
  if (!passwordIsValid(pw))  throw new Error("Password must be at least 8 characters and include a letter and a number.");
  if (pw !== form.confirm)   throw new Error("The two passwords do not match.");

  const payload = {
    action: "signup",
    student_id: studentId,
    email,
    password_hash: await hashPassword(email, pw),
    full_name: name,
    university: String(form.university || "").trim(),
    major: String(form.major || "").trim(),
    semester: String(form.semester || "").trim(),
    weekly_study_hours: Number(form.weekly_study_hours) || 15,
    target_gpa: Number(form.target_gpa) || null,
  };

  const account = await window.API.signUp(payload);
  return saveSession(account, payload);
}

/* ---- sign in --------------------------------------------------------- */
async function signIn(email, password) {
  email = String(email || "").trim();
  if (!emailIsValid(email)) throw new Error("Please enter a valid email address.");
  if (!password)            throw new Error("Please enter your password.");

  const account = await window.API.signIn({
    action: "login",
    email,
    password_hash: await hashPassword(email, password),
  });
  return saveSession(account, { email });
}

/* ---- session --------------------------------------------------------- */
function saveSession(account, fallback) {
  const session = {
    student_id:         account.student_id,
    full_name:          account.full_name || fallback.full_name || "",
    email:              account.email || fallback.email || "",
    university:         account.university || fallback.university || "",
    major:              account.major || fallback.major || "",
    semester:           account.semester || fallback.semester || "",
    weekly_study_hours: Number(account.weekly_study_hours || fallback.weekly_study_hours) || 15,
    target_gpa:         account.target_gpa ?? fallback.target_gpa ?? null,
    signed_in_at:       new Date().toISOString(),
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

function getSession() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY)); } catch (e) { return null; }
}

function updateSession(patch) {
  const s = getSession();
  if (!s) return null;
  const next = Object.assign({}, s, patch);
  localStorage.setItem(SESSION_KEY, JSON.stringify(next));
  return next;
}

function signOut() {
  localStorage.removeItem(SESSION_KEY);
}

function requireSession() {
  const s = getSession();
  if (!s) { window.location.replace("signin.html"); return null; }
  return s;
}

window.Auth = {
  signUp, signIn, signOut, getSession, updateSession, requireSession,
  passwordChecks, passwordIsValid, emailIsValid, hashPassword,
};
