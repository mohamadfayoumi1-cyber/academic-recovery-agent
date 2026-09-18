/* =====================================================================
   config.js   -   THE ONLY FILE YOU EDIT WHEN LEA SENDS THE URLs
   Paste each n8n Production webhook URL between the quotes.
   ===================================================================== */

window.CONFIG = {

  // POST { action:"signup", student_id, student_name, weekly_hours, password_hash }
  SIGNUP_URL: "",

  // POST { action:"login", student_id, password_hash }
  LOGIN_URL: "",

  // POST { student_id, available_weekly_study_hours }
  ANALYZE_URL: "",

  /* Keeps the demo alive if n8n is down or not ready yet.
     Set to false once all three URLs above are filled in. */
  ALLOW_OFFLINE_DEMO: true,
};
