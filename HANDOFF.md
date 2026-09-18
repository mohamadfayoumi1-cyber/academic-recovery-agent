# HANDOFF — Academic Recovery Agent

Read this first if you are picking the project up in a new session.
Last updated: 18 September 2026.

---

## Live links

| What | Where |
|---|---|
| Website | <https://academic-recovery-agent.vercel.app> |
| Repo | <https://github.com/mohamadfayoumi1-cyber/academic-recovery-agent> |
| n8n | <https://mohamadfayoumi.app.n8n.cloud> (trial, ~11 days left, 66/1000 executions) |
| Google Sheet | "AI Academic Recovery System" — tabs: Students, Courses, Syllabi, CourseKnowledge, Assessments, StudentGoals, Analysis, StudyPlans |

Vercel auto-deploys on every push to `main`. Commit in GitHub Desktop → Push → live in ~30s.

---

## Status

### Working and verified end to end

- Sign up / sign in, accounts saved to the **Students** sheet, works across devices
- Academic analysis + study planner (real data, verified repeatedly)
- Syllabus PDF upload → Gemini extraction → review screen → add course
- Grade entry → adaptive re-plan
- 10-page website: landing, signup, signin, dashboard, my courses, course detail, add course, syllabus review, study plan, profile
- Dashboard visuals: hero achievability line, recovery bars, colour-coded plan, urgent deadline flags
- HIGH/CRITICAL risk alert cards on the dashboard
- Chapter Summarizer **frontend** (waiting on its n8n workflow)

### Not done — 3 tasks, all in n8n

See "Remaining work" below.

---

## Architecture

```
Browser (static site on Vercel)
    -> n8n webhooks
        -> Google Sheets  (all data)
        -> Gemini         (analysis, syllabus extraction, summaries)
    -> back to the browser
```

**The frontend never computes academic analysis and holds no credentials.**
Grades, risk levels, priorities and study plans all come from n8n.

`api.js` is the only file that touches the network. `config.js` is the only
file holding webhook URLs.

---

## Webhooks

All in `config.js`. Base: `https://mohamadfayoumi.app.n8n.cloud/webhook/`

| Config key | Path | Workflow | Status |
|---|---|---|---|
| `SIGNUP_URL` / `LOGIN_URL` | `auth` | 2 - Auth (Signup + Login) | live |
| `ANALYZE_URL` | `academic-analysis` | project bootcamp (fixed) | live |
| `SYLLABUS_URL` | `syllabus-upload` | project bootcamp (fixed) | live |
| `ADD_COURSE_URL` | `confirm-syllabus` | project bootcamp (fixed) | live |
| `SAVE_GRADE_URL` | `update-grade` | project bootcamp (fixed) | live |
| `PROFILE_URL` | — | not built | empty, falls back to session-only |
| `CHAPTER_SUMMARY_URL` | `chapter-summary` | not imported yet | **empty — task 2** |

`ALLOW_OFFLINE_DEMO` is `false`. Set it `true` and blank a URL to fall back
to the fixtures in `sample-data.js` if you need to demo without n8n.

Two published workflows: **project bootcamp (fixed)** (`GoD7hKR3XZ0BcgWV`)
and **2 - Auth (Signup + Login)** (`ypUGe4yrdbdOxuzw`). The original
**project bootcamp** is inactive — leave it that way, the webhook paths collide.

---

## Remaining work

### 1. The `name` bug — signups save a blank name

The Students sheet column is **`name`**. The live `Handle Auth` code writes
**`full_name`**, and the Append node ignores extra fields, so it is dropped
silently.

Proven with a live probe:

```
signup -> "full_name":"Name Probe"   (only echoing the request back)
login  -> full_name missing entirely (the sheet cell is blank)
```

**Fix:** open **2 - Auth (Signup + Login)**, click the **Handle Auth** node
once and press **Enter** (double-click is unreliable on sub-nodes), then in
the SIGN UP branch change:

```javascript
  full_name: body.full_name || '',   // wrong
  name:      body.full_name || '',   // right - matches the sheet column
```

The LOGIN branch should already read `full_name: found.name`. Save, Publish.

Retest by signing up and then logging in — `full_name` must come back.

Existing blank rows will not backfill; type those names in by hand.

### 2. Chapter Summary workflow — not imported

The file is ready and validated: `n8n/3-chapter-summary.json`, or import from
<https://raw.githubusercontent.com/mohamadfayoumi1-cyber/academic-recovery-agent/main/n8n/3-chapter-summary.json>

Create a **blank workflow first**, then `...` → Import → From file/URL.

Then: click `Google Gemini Chat Model` → credential →
**`Google Gemini(PaLM) Api account 2`** (the newer key — the old one is
rate-limited). Save → Publish.

Finally put the production URL in `config.js`:

```javascript
CHAPTER_SUMMARY_URL: "https://mohamadfayoumi.app.n8n.cloud/webhook/chapter-summary",
```

Commit and push. Test by uploading a chapter PDF from the dashboard.

### 3. HIGH/CRITICAL risk email — not built

Inside **project bootcamp (fixed)**, after the Academic Analyst:

1. **Code** node — keep courses where `risk_level` is `HIGH` or `CRITICAL`
2. **Google Sheets** read — Students, match on `student_id`, to get the email
3. **Gmail** node — send

Template:

```
Subject: Academic Risk Alert - [Course Name]

Hi [Student Name],

Your Academic Recovery Agent has detected that [Course Name] is currently at
[RISK LEVEL] academic risk.

Reason:
[reason from the Academic Analyst]

Recommended Study Time:
[recommended_weekly_hours] hours this week

Focus Areas:
[focus]

Open your Academic Recovery Agent dashboard to review your recovery plan.
```

**This must stay entirely inside n8n.** The frontend has no email code,
credentials or webhook for it, by design.

---

## Traps already hit — do not repeat these

Every one of these cost real debugging time.

1. **CORS.** Every webhook node needs Options → **Allowed Origins** = `*`.
   Without it the browser blocks everything while curl still works, so it
   looks like the whole site is broken.

2. **Respond bodies need the `=` prefix.** `{{ ... }}` without a leading `=`
   is returned as literal text instead of being evaluated.

3. **Extract from File reads `data` by default.** The uploads send a field
   called `file`. Set **Input Binary Field** to `file`.

4. **Structured Output Parser mode.** Use **"Define using JSON Schema"** and
   paste a schema. The "Generate From JSON Example" mode expects a sample
   *output*, not a schema — pasting a schema there makes Gemini fail with
   "Model output doesn't fit required format".

5. **No union types in the schema.** `"type": ["string","null"]` breaks
   Gemini. Use `"type": "string"` and tell the prompt to return `""`.

6. **Model choice matters more than the API key.** `gemini-3-flash-preview`
   has a near-zero free quota and rate-limits almost immediately. Use
   **`gemini-3.1-flash-lite`**. Note the newer API key can reach gemini-3
   models but 404s on gemini-2.5 ones.

7. **Retry On Fail** is on all three agents (3 tries, 5000 ms). Keep it —
   Gemini returns transient "service unavailable" errors.

8. **A Sheets read after a multi-item node runs once per item**, returning
   the whole tab each time. Both assessment reads have **Execute Once** on.

9. **Publishing one workflow can silently deactivate another.** Check both
   say "Published" before demoing.

10. **Opening a sub-node on the canvas:** single-click then press **Enter**.
    Double-click often hits the connection line behind it and opens the
    "add node" panel instead.

11. **Production executions do not show on the canvas.** Green ticks only
    appear for test runs. Use the **Executions** tab to see real traffic.

12. **A POST webhook opened in the address bar returns 404** — that is a GET
    request. It does not mean the webhook is broken.

---

## Known issues

- **Google Sheet is shared as "Anyone with the link can edit"**, and the
  sheet URL is inside the workflow JSON in this public repo. Restrict it to
  named teammates before presenting.
- **Prototype auth.** Passwords are SHA-256 hashed in the browser (salted
  with the email) and only the hash is ever stored — but anyone with sheet
  access can read the hashes.
- **Webhooks are unauthenticated** and their URLs are public in `config.js`.
- **Profile edits are session-only** until `PROFILE_URL` exists.
- **Syllabus upload is PDF-only** — no manual course entry fallback.
- **n8n Chrome canvas broke** during the last session: nodes rendered
  off-screen with no text and screenshots timed out. A browser restart fixes
  it. If it happens again, use a different browser rather than fighting it.

---

## Test data to clean up

- Students sheet: row **S010** (`nametest1789754905@probe.test`) and any
  other `@probe.test` / `test@test.com` rows.
- An "Operating Systems" test course and its 4 assessments were already
  removed.

---

## File ownership

| Area | Files |
|---|---|
| Pages, auth, wiring | `index.html`, `signin.html`, `signup.html`, `dashboard.html`, `auth.js`, `login.js`, `signup.js`, `dashboard.js`, `config.js`, `api.js`, `nav.js`, `ui.js` |
| Dashboard rendering (Raghid) | `dashboard.js` + the DASHBOARD section of `styles.css` |
| Chapter summarizer | `chapter-summary.js` |
| The data contract | `sample-data.js` and `README.md` — do not change field names without telling the team |
| n8n workflow files | `n8n/` |

Team: Mohamad (web), Raghid (dashboard visuals, owns the Google Sheet),
Lea (n8n), Alaa (slides + demo video).

---

## Demo script

1. Show the Google Sheet — real courses, weights, grades
2. Sign in on the live site
3. Dashboard: risk alert card + the achievability headline
4. Say the line: *"A normal app shows the grade you have. Ours shows the
   grade you can still reach, and exactly what it takes."*
5. Upload a syllabus PDF — point out any blank deadline, the AI refused to
   invent a date the syllabus never gave
6. Enter a bad grade — the plan rewrites itself
7. Close with: *"We deliberately kept the AI out of the arithmetic. Grades,
   risk and hour allocation are computed; the agents do judgement and
   explanation."*

Do not click Analyze repeatedly — each click is two Gemini calls.
Record a backup video before presenting.
