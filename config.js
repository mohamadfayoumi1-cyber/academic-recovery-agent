/* =====================================================================
   config.js  -  THE ONLY FILE YOU EDIT WHEN LEA SENDS THE n8n URLs
   Paste each Production webhook URL between the quotes.
   Every webhook node needs Allowed Origins (CORS) set to *
   ===================================================================== */

window.CONFIG = {

  /* --- accounts ---------------------------------------------------- */
  // POST { action:"signup", email, password_hash, full_name, university,
  //        major, semester, weekly_study_hours, target_gpa }
  SIGNUP_URL: "https://mohamadfayoumi.app.n8n.cloud/webhook/auth",

  // POST { action:"login", email, password_hash }
  // Same workflow - it switches on the "action" field.
  LOGIN_URL: "https://mohamadfayoumi.app.n8n.cloud/webhook/auth",

  // POST { action:"update_profile", student_id, full_name, university,
  //        major, semester, weekly_study_hours, target_gpa }
  PROFILE_URL: "",

  /* --- academics --------------------------------------------------- */
  // POST { student_id, available_weekly_study_hours }
  ANALYZE_URL: "https://mohamadfayoumi.app.n8n.cloud/webhook/academic-analysis",

  // POST multipart/form-data: file=<pdf>, student_id, target_grade
  SYLLABUS_URL: "https://mohamadfayoumi.app.n8n.cloud/webhook/syllabus-upload",

  // POST { action:"add_course", student_id, course_name, course_code,
  //        target_grade, assessments:[{name,weight,due_date}] }
  ADD_COURSE_URL: "https://mohamadfayoumi.app.n8n.cloud/webhook/confirm-syllabus",

  // POST { action:"save_grade", student_id, course_id, assessment_id, grade }
  SAVE_GRADE_URL: "https://mohamadfayoumi.app.n8n.cloud/webhook/update-grade",

  /* --- AI Chapter Summarizer --------------------------------------- */
  // POST multipart/form-data: file=<pdf>, student_id, course_id, course_name
  CHAPTER_SUMMARY_URL: "https://mohamadfayoumi.app.n8n.cloud/webhook/chapter-summary",

  /* --- editing a deadline, removing a course ----------------------- */
  // POST { action:"update_deadline", assessment_id, due_date }
  // POST { action:"delete_course",   student_id, course_id }
  COURSE_ADMIN_URL: "https://mohamadfayoumi.app.n8n.cloud/webhook/course-admin",

  /* --- connection test only (test-n8n.html) ------------------------ */
  // Test URL: only works while "Listen for test event" is clicked in n8n,
  // and it stops working after one request.
  TEST_URL: "https://mohamadfayoumi.app.n8n.cloud/webhook-test/website",

  // Production URL: works always, but only after you press Publish in n8n.
  // Swap TEST_URL to this one when you are done testing:
  // "https://mohamadfayoumi.app.n8n.cloud/webhook/website"

  /* Keeps the demo alive while n8n is still being built.
     Set to false once the URLs above are filled in. */
  ALLOW_OFFLINE_DEMO: false,
};
