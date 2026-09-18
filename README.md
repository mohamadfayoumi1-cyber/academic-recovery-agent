# AI Academic Recovery Agent

A front-end for an agentic study-planning system. Students sign in, and four AI
agents read their real grades, assessment weights and deadlines to work out what
is still achievable — then rebuild their study week every time a grade changes.

Built for the Academic Impact track.

**Stack:** static HTML/CSS/JS on Vercel · n8n for orchestration · Google Gemini as
the LLM · Google Sheets as the data store.

---

## This repository is front-end only

There is no server code here. Every piece of data — accounts, courses, grades,
deadlines, generated plans — lives in Google Sheets and is handled by n8n
workflows. This app only renders what n8n returns.

| Page | File | Purpose |
| --- | --- | --- |
| Sign in | `index.html` | Student ID + password |
| Create account | `signup.html` | ID, name, weekly study hours, password |
| Dashboard | `dashboard.html` | Risk analysis, achievability, weekly plan |

### Ownership

| Area | Files |
| --- | --- |
| Pages, auth, wiring | `index.html`, `signup.html`, `dashboard.html`, `auth.js`, `login.js`, `signup.js`, `app.js`, `config.js` |
| Dashboard rendering | `dashboard.js` + the `DASHBOARD` section of `styles.css` |
| The data contract | `sample-data.js` — nobody edits this without telling the team |

---

## Running it locally

```bash
python -m http.server 5173
```

Then open <http://localhost:5173>.

It works immediately with sample data. Leave the URLs in `config.js` empty and
the app runs in offline demo mode, so the front-end can be built and demoed
before the n8n workflows exist.

---

## Connecting n8n

Paste the three production webhook URLs into `config.js`:

```js
window.CONFIG = {
  SIGNUP_URL:  "https://…/webhook/signup",
  LOGIN_URL:   "https://…/webhook/login",
  ANALYZE_URL: "https://…/webhook/academic-analysis",
  ALLOW_OFFLINE_DEMO: false,
};
```

Every webhook node needs **Allowed Origins (CORS)** set to `*`, otherwise the
browser blocks the request.

### Passwords

The browser hashes the password with SHA-256, salted with the student ID, before
it is ever sent. n8n and Google Sheets only ever see the hash — the plain
password never leaves the page.

> This is prototype-grade auth. The hash is effectively the credential in
> transit, so it relies on HTTPS. A production build would move authentication
> server-side.

---

## The n8n contract

### 1. Sign up

**Request**

```json
{
  "action": "signup",
  "student_id": "S001",
  "student_name": "Mohamad Fayoumi",
  "weekly_hours": 15,
  "password_hash": "1593cb47…"
}
```

n8n looks up `student_id` in the **Students** sheet. If it already exists, refuse.
Otherwise append the row.

**Response**

```json
{ "success": true }
```
```json
{ "success": false, "error": "An account with this student ID already exists." }
```

### 2. Sign in

**Request**

```json
{ "action": "login", "student_id": "S001", "password_hash": "1593cb47…" }
```

n8n looks up the student and compares the stored hash.

**Response**

```json
{
  "success": true,
  "student_id": "S001",
  "student_name": "Mohamad Fayoumi",
  "weekly_hours": 15
}
```
```json
{ "success": false, "error": "Incorrect student ID or password." }
```

### 3. Analyze

**Request**

```json
{ "student_id": "S001", "available_weekly_study_hours": 15 }
```

**Response** — the full shape is in `sample-data.js`. Abbreviated:

```json
{
  "success": true,
  "student_id": "S001",
  "student_name": "Mohamad Fayoumi",
  "overall_status": "RECOVERY_REQUIRED",
  "available_weekly_study_hours": 15,
  "today": "2026-09-18",
  "courses": [
    {
      "course_id": "C1",
      "course_name": "Calculus II",
      "target_grade": 80,
      "current_average": 48,
      "max_achievable_grade": 76.6,
      "needed_avg_on_remaining_for_target": 106.2,
      "needed_avg_on_remaining_to_pass": 69.8,
      "target_reachable": false,
      "pass_reachable": true,
      "risk_level": "CRITICAL",
      "priority": 1,
      "next_deadline_in_days": 4,
      "recommended_weekly_hours": 6,
      "reason": "…",
      "focus": ["Integration by parts"],
      "upcoming_assessments": [
        { "name": "Exam 2", "weight": 25, "due_date": "2026-09-22", "days_until_due": 4 }
      ]
    }
  ],
  "study_plan": [
    {
      "date": "2026-09-18",
      "course_id": "C1",
      "course_name": "Calculus II",
      "task": "Integration by parts — Exam 2 practice set A",
      "hours": 2,
      "priority": 1
    }
  ]
}
```

`risk_level` is one of `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`.
`overall_status` is one of `ON_TRACK`, `AT_RISK`, `RECOVERY_REQUIRED`.

---

## Design principle

Grades, risk levels and study-hour allocation are **computed deterministically**
in an n8n Code node, not by the model. Gemini receives finished numbers and does
what it is actually good at: judgement, prioritisation and explanation. Keeping
the LLM out of the arithmetic is deliberate.
