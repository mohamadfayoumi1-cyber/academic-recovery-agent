# Academic Recovery Agent

**Stay on Track. Recover Smarter.**

An AI-powered academic assistant that analyzes a student's courses, identifies where
they need help, and creates an adaptive study plan based on their actual academic
performance. When a grade changes, the whole plan is reassessed and rewritten.

Built for the Academic Impact track.

**Stack:** static HTML/CSS/JS on Vercel · n8n for orchestration · Google Gemini for
analysis and syllabus extraction · Google Sheets as the data store.

---

## Front-end only

There is no server code in this repository. Accounts, courses, grades, deadlines
and generated plans all live in Google Sheets and are handled by n8n workflows.
**This app never calculates academic analysis** — it renders what n8n returns.

### Pages

| Page | File | Purpose |
| --- | --- | --- |
| Landing | `index.html` | Introduction, Get Started / Sign In |
| Sign Up | `signup.html` | Name, email, password, university, major, semester, weekly hours, target GPA |
| Sign In | `signin.html` | Email + password |
| Dashboard | `dashboard.html` | Summary, course cards, this week's plan |
| My Courses | `courses.html` | Every course, ordered by priority |
| Course | `course.html?id=…` | Assessment breakdown, grade entry, adaptive re-plan |
| Add Course | `add-course.html` | Syllabus PDF upload |
| Syllabus Review | `review-syllabus.html` | Verify and edit what Gemini extracted |
| Study Plan | `study-plan.html` | The full week from the Planner Agent |
| Profile | `profile.html` | Details and the weekly study-hour budget |

### Shared modules

| File | Responsibility |
| --- | --- |
| `config.js` | **The only file you edit to connect n8n.** All seven webhook URLs. |
| `api.js` | Every network call. Nothing else does networking. |
| `auth.js` | Password hashing, sign up / sign in, session. |
| `ui.js` | Formatting, the cached academic state, shared renderers. |
| `nav.js` | Sidebar and the signed-in route guard. |
| `sample-data.js` | **The contract.** Canned n8n responses for offline demo. |

---

## Running locally

```bash
python -m http.server 5173
```

Open <http://localhost:5173>. It works immediately with sample data, so the
front-end can be built and demoed before the n8n workflows exist.

---

## Connecting n8n

Fill in `config.js` and set `ALLOW_OFFLINE_DEMO: false`. Every webhook node needs
**Allowed Origins (CORS)** set to `*`, or the browser blocks the request.

### Passwords

The browser hashes the password with SHA-256, salted with the email, before it is
sent. n8n and Google Sheets only ever see the hash.

> Prototype-grade auth. The hash is effectively the credential in transit, so it
> relies on HTTPS. A production build would move authentication server-side.

---

## The n8n contract

### 1. `SIGNUP_URL`

```json
{ "action": "signup", "email": "you@uni.edu", "password_hash": "…",
  "full_name": "…", "university": "…", "major": "…", "semester": "…",
  "weekly_study_hours": 15, "target_gpa": 3.4 }
```

Refuse if the email already exists. On success return the account **including the
`student_id` you assign** — everything else keys off it.

```json
{ "success": true, "student_id": "S001", "full_name": "…", "email": "…",
  "university": "…", "major": "…", "semester": "…",
  "weekly_study_hours": 15, "target_gpa": 3.4 }
```

### 2. `LOGIN_URL`

```json
{ "action": "login", "email": "you@uni.edu", "password_hash": "…" }
```

Compare the hash. Return the same account object as signup, or
`{ "success": false, "error": "Incorrect email or password." }`.

### 3. `PROFILE_URL`

```json
{ "action": "update_profile", "student_id": "S001", "full_name": "…",
  "university": "…", "major": "…", "semester": "…",
  "weekly_study_hours": 20, "target_gpa": 3.4 }
```

Returns `{ "success": true }`. Changing the hours must change how the Planner
allocates time.

### 4. `ANALYZE_URL` — the main workflow

```json
{ "student_id": "S001", "available_weekly_study_hours": 15 }
```

Returns the full academic state. **The complete shape is in `sample-data.js`** —
build against that file. Summary:

```json
{
  "success": true,
  "student_id": "S001",
  "student_name": "…",
  "overall_status": "ON_TRACK | AT_RISK | RECOVERY_REQUIRED",
  "available_weekly_study_hours": 15,
  "today": "2026-09-18",
  "courses": [{
    "course_id": "C1", "course_code": "CMPS 320", "course_name": "Database Systems",
    "target_grade": 80, "current_average": 47.25, "points_earned_so_far": 18.9,
    "completed_weight": 40, "remaining_weight": 60, "max_achievable_grade": 78.9,
    "needed_avg_on_remaining_for_target": 101.8,
    "needed_avg_on_remaining_to_pass": 68.5,
    "target_reachable": false, "pass_reachable": true,
    "risk_level": "LOW | MEDIUM | HIGH | CRITICAL",
    "priority": 1, "recommended_weekly_hours": 6, "next_deadline_in_days": 6,
    "reason": "…", "focus": ["…"],
    "assessments": [{
      "assessment_id": "A1", "name": "Quiz 1", "weight": 10, "grade": 45,
      "due_date": "2026-08-28", "days_until_due": -21,
      "status": "Completed | Upcoming"
    }]
  }],
  "study_plan": [{
    "date": "2026-09-18", "course_id": "C1", "course_name": "Database Systems",
    "task": "…", "hours": 2, "priority": 1, "reason": "…"
  }]
}
```

### 5. `SYLLABUS_URL` — Gemini reads the PDF

`multipart/form-data` with `file`, `student_id`, `target_grade`.

```json
{ "success": true, "course_name": "Operating Systems", "course_code": "CMPS 330",
  "assessments": [
    { "name": "Exam 1",  "weight": 20, "due_date": "2026-09-30" },
    { "name": "Project", "weight": 20, "due_date": "" }
  ] }
```

**Nothing is saved at this point.** The student verifies it on the review screen
first. If the syllabus does not state a date, return an empty string — the AI must
never invent information that is not in the document.

### 6. `ADD_COURSE_URL`

```json
{ "action": "add_course", "student_id": "S001", "course_name": "…",
  "course_code": "…", "target_grade": 80,
  "assessments": [{ "name": "Exam 1", "weight": 20, "due_date": "2026-09-30" }] }
```

Returns `{ "success": true }`.

### 7. `SAVE_GRADE_URL` — the adaptive loop

```json
{ "action": "save_grade", "student_id": "S001", "course_id": "C3",
  "assessment_id": "D2", "grade": 52 }
```

Save the grade, then **re-run the Academic Analyst and the Planner** and return the
full academic state (same shape as `ANALYZE_URL`), plus:

```json
{ "changed": true,
  "change_summary": "Computer Networks has moved from MEDIUM to HIGH risk …" }
```

If `change_summary` is absent the front-end compares the before and after states
itself and describes the risk and priority changes.

---

## Design principle

Grades, risk levels and study-hour allocation are computed **deterministically** in
an n8n Code node, not by the model. Gemini receives finished numbers and does what
it is good at: judgement, prioritisation and explanation. Keeping the LLM out of the
arithmetic is deliberate — it is the part an LLM gets quietly wrong.

The dashboard is built to answer three questions immediately:

**How am I doing? · What needs my attention? · What should I study next?**
