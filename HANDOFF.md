# HANDOFF — Academic Recovery Agent

Read this first if you are picking the project up in a new session.
Last updated: 18 September 2026 (later session).

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

### Not done — 2 tasks, both in n8n

Task 1 (the `name` bug) is **done and published**. See "Remaining work" below.

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

### 1. ~~The `name` bug~~ — DONE, published

Fixed in **2 - Auth (Signup + Login)** and published. Three things the old
notes got wrong, recorded here because they cost time:

- **The LOGIN branch was broken too.** It read `found.full_name`; the sheet
  column is `name`. The old notes said login was already correct. It was not.
  Both branches needed fixing.
- **The live trigger node is `Webhook1`, not `Webhook`.** The repo copy
  `n8n/2-auth-signup-login.json` references `$('Webhook')`, which in the live
  graph is a *different, unrelated* trigger. Pasting the repo code in verbatim
  breaks auth. The live node now correctly references `$('Webhook1')`.
- **Saving over the API is not enough** — see trap 13.

The live code now has: `full_name: found.name` (login), `name: name` (the
sheet row), `full_name: name` (the signup response).

Note the repo copy still says `$('Webhook')` and so still does not match live.

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

### 3. HIGH/CRITICAL risk email — built as JSON, not yet in n8n

The nodes are written and validated: **`n8n/4-risk-email-nodes.json`**
(two nodes) — also already merged into `n8n/project-bootcamp-fixed.json`.

To install: open **project bootcamp (fixed)**, select all the JSON in
`n8n/4-risk-email-nodes.json`, copy it, click the n8n canvas and press
**Ctrl+V**. Both nodes appear wired to each other. Then:

1. Drag one connection: **Academic Analyst Agent** → **Filter Risk Courses**
   (a second line out of the analyst, alongside Planner Agent).
2. Click **Send Risk Alert Email** → pick your Gmail credential.
3. **Publish** (trap 13 — nothing is live until you do).

Design notes, which differ from the original plan on purpose:

- **No second Google Sheets read.** The original plan added one to fetch the
  student's email. It is unnecessary — `Get student` already read that row at
  the start of the execution, so `Filter Risk Courses` just reads
  `$('Get student')`. It also avoids trap 8 (a Sheets node after a multi-item
  node runs once per item and returns the whole tab each time).
- The Gmail node has `onError: continueRegularOutput`, so a mail failure can
  never break the analysis response the browser is waiting on.
- `Filter Risk Courses` returns `[]` when nothing is HIGH/CRITICAL, which
  stops the branch, so no mail goes out.

**Still unsolved:** every Analyze click re-sends alerts for every HIGH/CRITICAL
course. There is no dedupe. Do not demo Analyze repeatedly with this enabled,
or add a "last alerted" column before you turn it on.

**This stays entirely inside n8n.** The frontend has no email code, credentials
or webhook for it, by design.

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

13. **n8n cloud has a draft/publish model, and this is the big one.**
    Saving a workflow — including over the internal REST API — only writes a
    **draft**. The previously *published* version keeps serving live webhook
    traffic. Edits appear saved, the canvas shows them, and production still
    runs the old code. The tell is the top-right button: it reads **"Publish"**
    with an orange dot when a draft is pending, and greyed **"Published"** when
    it is not. Two test signups were burned proving this. If a fix appears to
    have no effect, check that button before debugging anything else.

14. **The `n8n/` files in this repo drift from what is live.** Before trusting
    one, export the workflow from n8n and diff it. `project-bootcamp-fixed.json`
    was stale by five nodes' worth of fixes — importing it would have undone
    traps 3, 4, 5 and 6 in one go. It has now been rebased on a live export.

---

## Known issues

- **The repo workflow file is ahead of live, and has not been applied.**
  `n8n/project-bootcamp-fixed.json` now contains two changes that are **not yet
  in n8n**: the risk-email nodes, and the Gemini fix below. Applying them is
  manual.
- **`Google Gemini Chat Model3` and `Model4` were misconfigured live** — no
  `modelName` set (so, the default preview model) *and* still on the **old,
  rate-limited API key**, while the other three had been moved to
  `gemini-3.1-flash-lite` and `Google Gemini(PaLM) Api account 2`. Those two
  feed **Re-Analyze Academic State** and **Adaptive Planner Agent** — the
  adaptive re-plan path, which is **demo step 6**. This is the most likely
  cause of the **21 failed executions out of 65 (32% failure rate)** showing on
  the n8n overview. Corrected in the repo file; **still needs applying live.**
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

- Students sheet: rows **S010**, **S011**, **S012** and any other
  `@probe.test` / `test@test.com` rows. S011 and S012 are from verifying the
  `name` fix; all have blank names.
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
