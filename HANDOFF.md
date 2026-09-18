# HANDOFF — Academic Recovery Agent

Read this first if you are picking the project up in a new session.
Last updated: 18 September 2026, after an independent verification pass.

> **Verify before you trust anything in here, including this file.**
> Two sessions have now written confident status notes that were wrong.
> The endpoints are public — `curl` them. A claim is not a test.
> The quick sweep is at the bottom under "Verification sweep".

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

### Verified live on 18 Sep 2026 (by curl, against production)

| Path | Result |
|---|---|
| `auth` signup + login | `full_name` returned correctly — the name bug is gone |
| `academic-analysis` | real analysis, courses + study plan |
| `syllabus-upload` | returns `name` / `weight` / `due_date`; blank deadline preserved |
| `chapter-summary` | real summary in ~6s |

### Not verified — test these before demoing

- **`update-grade` (the adaptive re-plan) — demo step 6.** Its two Gemini
  nodes were re-pointed at a different model and it has not been run since.
  Testing it writes a real grade to the sheet, so pick a course you are happy
  to dirty.
- **`confirm-syllabus` (add course)** — also writes real data.

### Still to do

- Attach a **Gmail credential** to `Send Risk Alert Email` and enable the node.
- Fix the analyst exceeding the hours budget (see Known issues).

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
| `CHAPTER_SUMMARY_URL` | `chapter-summary` | 3 - Chapter Summary (`vNmENofDboWkBWkO`) | live |

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

### 2. ~~Chapter Summary workflow~~ — DONE, published

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

### 3. ~~HIGH/CRITICAL risk email~~ — DONE, published (Gmail node disabled)

**Live in project bootcamp (fixed)**: `Academic Analyst Agent` →
`Filter Risk Courses` → `Send Risk Alert Email`. Verified: an analysis for
S001 returns Computer Networks at HIGH risk, so the branch fires on real data.

**One step left to actually send mail:**

1. Click **Send Risk Alert Email** → attach a Gmail credential.
2. Right-click the node → **Enable** (it is deliberately disabled).
3. **Publish** (trap 13).

Until then the node is skipped and nothing is sent.

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

## Verified end to end (this session)

Live probes against the production webhooks:

| Path | Result |
|---|---|
| signup + login | S014, `full_name` returned correctly — the `name` bug is gone |
| `academic-analysis` | 200 in 31s, S001 AT_RISK, Computer Networks HIGH, 5 plan items |
| `syllabus-upload` | 200 in 13s, names + weights + dates all populate |
| `chapter-summary` | 200 in 6s, overview + 6 concepts + 4 definitions + 4 points |

### Demo step 6 was broken, and is now fixed

`update-grade` returned `{"message":"Error in workflow"}`. The n8n execution
log said: **Problem in node 'Re-Analyze Academic State' — Model output
doesn't fit required format.**

Cause: `Structured Output Parser3` and `Parser4` still had their JSON Schema
pasted into the **"Generate From JSON Example"** field — trap 4, exactly.
Parsers 0, 1 and 2 had been converted to "Define using JSON Schema"; 3 and 4
were missed.

**Watch for this pattern.** The same session-shaped mistake hit the Gemini
nodes: `Google Gemini Chat Model`/`1`/`2` were migrated to
`gemini-3.1-flash-lite` and the newer API key while `Model3` and `Model4`
were left behind. Whenever you fix one of these five-node families, fix all
five. Three of five is the recurring failure mode here, and both times the
casualty was the adaptive re-plan path.

Fixed by moving the identical schema text into `inputSchema` with
`schemaType: manual` — byte-identical to the working parsers, just in the
right field. Published and verified:

```
POST /webhook/update-grade  {student_id S001, assessment_id A001, grade 56}
-> success: true, 7 study plan items, "Grade updated and study plan adapted"
```

A001 was set to 56 for the test and **restored to its original 55**. The
Assessments sheet is unchanged.

**Not re-tested, and it writes real data to the sheet:**

- `confirm-syllabus` (add course) — the only path never exercised end to end.

### Bug found and fixed: syllabus assessment field names

The Syllabus Extractor returns `assessment_name` / `deadline`. The website's
data contract (README.md, `sample-data.js`, and what `confirm-syllabus`
expects back) is `name` / `weight` / `due_date`. Nothing mapped between them,
so the review screen rendered **every assessment with a blank name and blank
date**, and its own validation (`Every assessment needs a name`) then refused
to save the course. Demo step 5 was broken.

Fixed in `Validate Syllabus Extraction`, which now normalises both shapes.

## Editing a deadline and removing a course

Workflow **4 - Course Admin** (`HBJl4v4Uq1llHcoM`), webhook `course-admin`,
`COURSE_ADMIN_URL` in `config.js`. Two actions:

- `update_deadline` {assessment_id, due_date} - writes the Assessments sheet,
  then the page re-reads the academic state from n8n, because a deadline
  changes risk and urgency.
- `delete_course` {student_id, course_id} - **permanent**. Erases the course
  row and every assessment row belonging to it. It refuses unless the course
  belongs to the student who asked.

Verified live: A001's deadline moved and its grade, weight and status were
untouched; a throwaway course plus its 3 assessments were removed with the
Courses tab going 12 to 11 rows and Assessments 55 to 52, leaving A001 intact.
The same test exercised `confirm-syllabus`, which had never been run end to
end before.

**Row-number mechanics.** The Sheets node deletes by row number, so the code
maps the Nth record of a full-tab read to sheet row N+1, and deletes
assessment rows bottom-up - deleting a row shifts everything below it up.
This assumes no blank rows in the middle of a tab.

## Ungraded courses are not given a risk level

A course with no graded assessment is returned as **`NOT_ANALYZED`**, shown as
"Not analyzed yet", with `current_average`, `priority` all null and
`recommended_weekly_hours` 0.

Before this, `Build Analysis Response` ended with `a.risk_level || 'MEDIUM'`
and `current_average: Number(s.current_average)`. A course added seconds ago
therefore came back as **MEDIUM (or worse) at 0%** — `Number(null)` is 0 — so a
brand new course looked like a student who had scored zero.

The guard is `hasGrades = completed_weight > 0`, decided **in code, not by the
agent**. `NOT_ANALYZED` was also added to both output parser enums and both
analyst prompts so the model can return it, but the code decides regardless.
`overall_status` is `NOT_ANALYZED` when no course has any grade.

Nothing downstream needed changing: the dashboard alert filter already tests
for HIGH/CRITICAL only, `headline()` already skips courses whose average is
null, and `if (c.recommended_weekly_hours)` hides the hours line at 0.

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

7. **Retry On Fail must be on all FIVE agents**, not three. Earlier notes
   said "all three agents", which is how `Re-Analyze Academic State` and
   `Adaptive Planner Agent` ended up with no retry at all. Gemini returns
   transient schema-mismatch and service errors; without retry a single
   hiccup fails the whole request. All five now have 3 tries / 5000 ms.

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

14. **Committing is not pushing, and pushing is not deployed.** A whole
    session's work sat in three local commits that were never pushed. n8n was
    correct, the repo was correct locally, and the *live site* still had
    `CHAPTER_SUMMARY_URL: ""` — so the Chapter Summarizer was dead in
    production while everything looked finished. Always finish with
    `git status -sb` (it prints `[ahead N]` if you have not pushed) and then
    curl the deployed file, not the local one:
    `curl -s https://academic-recovery-agent.vercel.app/config.js | grep URL`.
    Note `raw.githubusercontent.com` is CDN-cached for a few minutes; use the
    GitHub contents API if you need the truth immediately.

15. **THE THREE-OF-FIVE PATTERN — check this first on any new bug.**
    There are five AI agents in `project bootcamp (fixed)`. Three sit on the
    main path (Analyst, Planner, Syllabus) and two on the adaptive re-plan
    path (`Re-Analyze Academic State`, `Adaptive Planner Agent`). **Three
    separate fixes were applied to the first three and never to the last
    two:**

    | Fix | Main three | Adaptive two |
    |---|---|---|
    | Gemini model + newer API key | done | **missed** |
    | Output parser set to JSON Schema mode | done | **missed** |
    | Retry On Fail | done | **missed** |

    All three are corrected now. But when you change anything on an agent,
    change it on all five, and grep the JSON to confirm. Every time this was
    missed, the casualty was demo step 6, and it failed with a different
    error each time, which is why it read as three unrelated bugs.

16. **A pasted workflow's Sheets nodes will not publish until each one is
    opened.** Importing `4 - Course Admin` gave "5 nodes have issues, fix
    them before publishing" with no visible error inside the nodes. Two
    causes: `sheetName` must use the `list` mode with the tab's real gid
    (Students `gid=0`, Courses `503525301`, Assessments `1677987941`), not
    `name` mode; and after fixing that, each Sheets node still has to be
    opened once so the editor re-validates it. Open them, then Publish.

17. **The gviz CSV endpoint silently blanks values whose type does not match
    the column.** Reading Courses through
    `gviz/tq?tqx=out:csv` showed `student_id` empty for every `S0xx` row,
    because the column now also holds numeric ids and gviz typed the whole
    column as a number. It looks exactly like data loss. Use
    `/export?format=csv&gid=<gid>` instead, which returns the raw cells.

18. **The `n8n/` files in this repo drift from what is live.** Before trusting
    one, export the workflow from n8n and diff it. `project-bootcamp-fixed.json`
    was stale by five nodes' worth of fixes — importing it would have undone
    traps 3, 4, 5 and 6 in one go. It has now been rebased on a live export.

---

## Known issues

- **`student_id` is an internal key, not a university ID.** It is generated
  in `Handle Auth` as `S001`, `S002`, ... Its only job is to join Students →
  Courses → Assessments → StudyPlans. Nothing shows it to the student, and
  the real university ID is not collected anywhere. If you ever do want the
  real one, note that every Courses and Assessments row points at the
  generated id, so those rows have to be repointed at the same time.
- It used to be computed as `rows.length + 1`, which produced **duplicate
  ids** as soon as any row was deleted: 9 students, delete S005, 8 rows
  remain, next signup is handed a second S009 and the two students' courses
  and grades merge. Now computed as highest existing id + 1. Verified with
  S001/S003/S004 present: the next signup correctly returned S005, where the
  old formula would have returned a duplicate S004.

- **`Google Gemini Chat Model3` and `Model4` were misconfigured** — no
  `modelName` set (so, the default preview model) *and* still on the **old,
  rate-limited API key**, while the other three had been moved to
  `gemini-3.1-flash-lite` and `Google Gemini(PaLM) Api account 2`. Those two
  feed **Re-Analyze Academic State** and **Adaptive Planner Agent** — the
  adaptive re-plan path, which is **demo step 6**. Most likely cause of the
  **21 failed executions out of 65** on the n8n overview. **Fixed and published
  live**, but the grade-update path has not been re-tested end to end since —
  do that before demoing, it writes a real grade to the sheet.
- **The analyst can exceed the hours budget.** A live S001 analysis with
  `available_weekly_study_hours: 15` returned `recommended_weekly_hours: 20`
  for one course, although the system prompt forbids the total exceeding what
  the student has. It also returned an empty `reason` for the MEDIUM course
  while the schema marks `reason` required. Worth a prompt tweak before the
  demo, since "exactly what it takes" is the pitch line.
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

- Students sheet: rows **S010 through S015** — all six are `@probe.test`.
  Read off the live sheet, not from memory; an earlier version of this list
  said "S010, S011, S012 and S015" and silently missed S013 and S014.

  S010–S012 have blank names (written before the `name` fix). S013, S014 and
  S015 have names filled in — those three are the proof the fix works, so
  delete them last.

- **Eight real accounts have blank names and will not backfill.** S002–S009
  are real people (including Mohamad, Lea, Raghid and three RHU students).
  They signed up while the `name` bug was live, so their `name` cells are
  empty and the dashboard greets them with nothing. Only S001 (Raghid) has a
  name. **Type these eight in by hand before the demo** — a fresh signup is
  fine now, but nothing repairs the existing rows.
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

---

## Verification sweep

Run this before believing any status, including this document's.

```bash
B="https://mohamadfayoumi.app.n8n.cloud/webhook"

# is the deployed site pointing at n8n at all?
curl -s https://academic-recovery-agent.vercel.app/config.js | grep -E "URL|OFFLINE"

# auth round trip - full_name must come back on login
E="check$(date +%s)@probe.test"
curl -s -X POST "$B/auth" -H "Content-Type: application/json"   -d "{\"action\":\"signup\",\"email\":\"$E\",\"password_hash\":\"p\",\"full_name\":\"Check\"}"
curl -s -X POST "$B/auth" -H "Content-Type: application/json"   -d "{\"action\":\"login\",\"email\":\"$E\",\"password_hash\":\"p\"}"

# analysis
curl -s --max-time 200 -X POST "$B/academic-analysis" -H "Content-Type: application/json"   -d '{"student_id":"S001","available_weekly_study_hours":15}'
```

And in the repo:

```bash
git status -sb      # "[ahead N]" means the work is not on GitHub yet
```

`{"message":"Error in workflow"}` means an n8n node threw — open the
**Executions** tab in n8n, click the red run, and read the node error. It is
almost always one of the traps above.
