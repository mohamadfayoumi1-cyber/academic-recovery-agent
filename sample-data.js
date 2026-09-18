/* =====================================================================
   sample-data.js  -  CANNED RESPONSES, NOT LOGIC.

   These are recorded examples of what the n8n workflows return, used
   only while ALLOW_OFFLINE_DEMO is on. Nothing here calculates anything
   - every number was produced by the n8n Code node and pasted in.

   This file doubles as THE CONTRACT. Lea builds n8n to return exactly
   these shapes. Nobody edits it without telling the team.
   ===================================================================== */

/* ---------- snapshot 1: the student's situation right now ------------- */
const ANALYSIS = {
  success: true,
  student_id: "S001",
  student_name: "Mohamad Fayoumi",
  overall_status: "RECOVERY_REQUIRED",          // ON_TRACK | AT_RISK | RECOVERY_REQUIRED
  available_weekly_study_hours: 15,
  today: "2026-09-18",

  courses: [
    {
      course_id: "C1",
      course_code: "CMPS 320",
      course_name: "Database Systems",
      target_grade: 80,
      current_average: 47.25,
      points_earned_so_far: 18.9,
      completed_weight: 40,
      remaining_weight: 60,
      max_achievable_grade: 78.9,
      needed_avg_on_remaining_for_target: 101.8,
      needed_avg_on_remaining_to_pass: 68.5,
      target_reachable: false,
      pass_reachable: true,
      risk_level: "CRITICAL",
      priority: 1,
      recommended_weekly_hours: 6,
      next_deadline_in_days: 6,
      reason: "Two graded assessments averaging 47% have locked in 18.9 of 100 points. The 80 target is no longer mathematically reachable - the ceiling is 78.9. Passing is, but it needs 68.5% average across everything left, starting with the Project due in 6 days.",
      focus: ["Normalization to 3NF", "SQL joins and subqueries", "ER modelling"],
      assessments: [
        { assessment_id: "A1", name: "Quiz 1",  weight: 10, grade: 45,   due_date: "2026-08-28", days_until_due: -21, status: "Completed" },
        { assessment_id: "A2", name: "Midterm", weight: 30, grade: 48,   due_date: "2026-09-10", days_until_due: -8,  status: "Completed" },
        { assessment_id: "A3", name: "Project", weight: 20, grade: null, due_date: "2026-09-24", days_until_due: 6,   status: "Upcoming"  },
        { assessment_id: "A4", name: "Final",   weight: 40, grade: null, due_date: "2026-12-18", days_until_due: 91,  status: "Upcoming"  }
      ]
    },
    {
      course_id: "C2",
      course_code: "CMPS 411",
      course_name: "Artificial Intelligence",
      target_grade: 85,
      current_average: 88,
      points_earned_so_far: 22,
      completed_weight: 25,
      remaining_weight: 75,
      max_achievable_grade: 97,
      needed_avg_on_remaining_for_target: 84,
      needed_avg_on_remaining_to_pass: 50.7,
      target_reachable: true,
      pass_reachable: true,
      risk_level: "MEDIUM",
      priority: 2,
      recommended_weekly_hours: 4,
      next_deadline_in_days: 25,
      reason: "A strong 88% on Exam 1 banked 22 points, but 75% of the course is still open. Reaching the 85 target needs an 84% average on the project and final - achievable, but it leaves no slack.",
      focus: ["Search algorithms", "Project write-up"],
      assessments: [
        { assessment_id: "B1", name: "Exam 1",  weight: 25, grade: 88,   due_date: "2026-09-08", days_until_due: -10, status: "Completed" },
        { assessment_id: "B2", name: "Project", weight: 30, grade: null, due_date: "2026-10-13", days_until_due: 25,  status: "Upcoming"  },
        { assessment_id: "B3", name: "Final",   weight: 45, grade: null, due_date: "2026-12-20", days_until_due: 93,  status: "Upcoming"  }
      ]
    },
    {
      course_id: "C3",
      course_code: "CMPS 315",
      course_name: "Computer Networks",
      target_grade: 80,
      current_average: 78,
      points_earned_so_far: 15.6,
      completed_weight: 20,
      remaining_weight: 80,
      max_achievable_grade: 95.6,
      needed_avg_on_remaining_for_target: 80.5,
      needed_avg_on_remaining_to_pass: 55.5,
      target_reachable: true,
      pass_reachable: true,
      risk_level: "MEDIUM",
      priority: 3,
      recommended_weekly_hours: 3,
      next_deadline_in_days: 12,
      reason: "78% on Exam 1 is close to the 80 target, and 80% of the course is still ahead. Holding the target needs an 80.5% average from here - essentially repeating current form.",
      focus: ["Routing protocols", "TCP congestion control"],
      assessments: [
        { assessment_id: "D1", name: "Exam 1",  weight: 20, grade: 78,   due_date: "2026-09-05", days_until_due: -13, status: "Completed" },
        { assessment_id: "D2", name: "Exam 2",  weight: 20, grade: null, due_date: "2026-09-30", days_until_due: 12,  status: "Upcoming"  },
        { assessment_id: "D3", name: "Project", weight: 20, grade: null, due_date: "2026-11-15", days_until_due: 58,  status: "Upcoming"  },
        { assessment_id: "D4", name: "Final",   weight: 40, grade: null, due_date: "2026-12-16", days_until_due: 89,  status: "Upcoming"  }
      ]
    },
    {
      course_id: "C4",
      course_code: "MATH 218",
      course_name: "Linear Algebra",
      target_grade: 78,
      current_average: 87.2,
      points_earned_so_far: 43.6,
      completed_weight: 50,
      remaining_weight: 50,
      max_achievable_grade: 93.6,
      needed_avg_on_remaining_for_target: 68.8,
      needed_avg_on_remaining_to_pass: 32.8,
      target_reachable: true,
      pass_reachable: true,
      risk_level: "LOW",
      priority: 4,
      recommended_weekly_hours: 2,
      next_deadline_in_days: 45,
      reason: "87.2% average with half the course banked. The 78 target only needs 68.8% on the final. This course can safely give study time to Database Systems.",
      focus: ["Eigenvalues"],
      assessments: [
        { assessment_id: "E1", name: "Homework", weight: 20, grade: 92,   due_date: "2026-08-30", days_until_due: -19, status: "Completed" },
        { assessment_id: "E2", name: "Midterm",  weight: 30, grade: 84,   due_date: "2026-09-12", days_until_due: -6,  status: "Completed" },
        { assessment_id: "E3", name: "Final",    weight: 50, grade: null, due_date: "2026-11-02", days_until_due: 45,  status: "Upcoming"  }
      ]
    }
  ],

  study_plan: [
    { date: "2026-09-18", course_id: "C1", course_name: "Database Systems",        task: "Project - build the ER diagram and normalise to 3NF", hours: 2,   priority: 1, reason: "Due in 6 days and worth 20%" },
    { date: "2026-09-18", course_id: "C2", course_name: "Artificial Intelligence", task: "Project - search algorithm implementation",           hours: 1.5, priority: 2, reason: "Start early, 30% of the grade" },
    { date: "2026-09-19", course_id: "C1", course_name: "Database Systems",        task: "Rework midterm mistakes on SQL joins",                hours: 2,   priority: 1, reason: "Weakest topic from the 48% midterm" },
    { date: "2026-09-20", course_id: "C3", course_name: "Computer Networks",       task: "Exam 2 prep - routing protocols",                     hours: 1.5, priority: 3, reason: "Exam 2 in 12 days" },
    { date: "2026-09-20", course_id: "C4", course_name: "Linear Algebra",          task: "Eigenvalues practice set",                            hours: 1,   priority: 4, reason: "Light upkeep, final is far off" },
    { date: "2026-09-21", course_id: "C1", course_name: "Database Systems",        task: "Project - write the queries and test them",           hours: 2,   priority: 1, reason: "Due in 3 days" },
    { date: "2026-09-21", course_id: "C2", course_name: "Artificial Intelligence", task: "Project - evaluation section",                        hours: 1.5, priority: 2, reason: "" },
    { date: "2026-09-22", course_id: "C3", course_name: "Computer Networks",       task: "Exam 2 prep - TCP congestion control",                hours: 1.5, priority: 3, reason: "" },
    { date: "2026-09-22", course_id: "C4", course_name: "Linear Algebra",          task: "Review midterm feedback",                             hours: 1,   priority: 4, reason: "" },
    { date: "2026-09-23", course_id: "C2", course_name: "Artificial Intelligence", task: "Project - finish write-up",                           hours: 1,   priority: 2, reason: "" }
  ]
};

/* ---------- snapshot 2: after a 52% on Computer Networks Exam 2 ------- */
const ANALYSIS_UPDATED = JSON.parse(JSON.stringify(ANALYSIS));

ANALYSIS_UPDATED.change_summary =
  "Computer Networks has moved from MEDIUM to HIGH risk following your Exam 2 result. It now needs a 90% average on the work that remains, so 2 hours have been moved to it from Linear Algebra and Artificial Intelligence.";
ANALYSIS_UPDATED.changed = true;

(function applyNewGrade() {
  const cn = ANALYSIS_UPDATED.courses.find(c => c.course_id === "C3");
  cn.current_average = 65;
  cn.points_earned_so_far = 26;
  cn.completed_weight = 40;
  cn.remaining_weight = 60;
  cn.max_achievable_grade = 86;
  cn.needed_avg_on_remaining_for_target = 90;
  cn.needed_avg_on_remaining_to_pass = 56.67;
  cn.risk_level = "HIGH";
  cn.priority = 2;
  cn.recommended_weekly_hours = 5;
  cn.next_deadline_in_days = 58;          // Exam 2 is done; the Project is next
  cn.reason = "A 52% on Exam 2 dropped the average to 65% and halved the margin. The 80 target survives but now demands a 90% average across the project and final - a real step up from current form.";
  cn.focus = ["TCP congestion control", "Subnetting", "Routing protocols"];
  const exam2 = cn.assessments.find(a => a.assessment_id === "D2");
  exam2.grade = 52;
  exam2.status = "Completed";
  exam2.days_until_due = 0;

  ANALYSIS_UPDATED.courses.find(c => c.course_id === "C2").priority = 3;
  ANALYSIS_UPDATED.courses.find(c => c.course_id === "C2").recommended_weekly_hours = 3;
  ANALYSIS_UPDATED.courses.find(c => c.course_id === "C4").recommended_weekly_hours = 1.5;
  ANALYSIS_UPDATED.courses.find(c => c.course_id === "C1").recommended_weekly_hours = 5.5;
})();

ANALYSIS_UPDATED.study_plan = [
  { date: "2026-09-18", course_id: "C3", course_name: "Computer Networks", task: "Exam 2 post-mortem - list every topic you lost marks on", hours: 2,   priority: 2, reason: "Risk just rose to HIGH" },
  { date: "2026-09-18", course_id: "C1", course_name: "Database Systems",  task: "Project - build the ER diagram and normalise to 3NF",      hours: 2,   priority: 1, reason: "Due in 6 days" },
  { date: "2026-09-19", course_id: "C3", course_name: "Computer Networks", task: "TCP congestion control from first principles",             hours: 1.5, priority: 2, reason: "Weakest Exam 2 topic" },
  { date: "2026-09-19", course_id: "C1", course_name: "Database Systems",  task: "Rework midterm mistakes on SQL joins",                     hours: 1.5, priority: 1, reason: "" },
  { date: "2026-09-20", course_id: "C3", course_name: "Computer Networks", task: "Subnetting drills",                                        hours: 1.5, priority: 2, reason: "" },
  { date: "2026-09-20", course_id: "C2", course_name: "Artificial Intelligence", task: "Project - search algorithm implementation",          hours: 1,   priority: 3, reason: "" },
  { date: "2026-09-21", course_id: "C1", course_name: "Database Systems",  task: "Project - write the queries and test them",                hours: 2,   priority: 1, reason: "Due in 3 days" },
  { date: "2026-09-21", course_id: "C2", course_name: "Artificial Intelligence", task: "Project - evaluation section",                       hours: 1,   priority: 3, reason: "" },
  { date: "2026-09-22", course_id: "C2", course_name: "Artificial Intelligence", task: "Project - finish write-up",                          hours: 1,   priority: 3, reason: "" },
  { date: "2026-09-22", course_id: "C4", course_name: "Linear Algebra",    task: "Eigenvalues practice set",                                 hours: 1.5, priority: 4, reason: "Reduced - lowest risk course" }
];

/* ---------- what Gemini returns after reading a syllabus PDF ---------- */
const SYLLABUS = {
  success: true,
  course_name: "Operating Systems",
  course_code: "CMPS 330",
  target_grade: 80,
  assessments: [
    { name: "Exam 1",  weight: 20, due_date: "2026-09-30" },
    { name: "Exam 2",  weight: 20, due_date: "2026-10-28" },
    // The syllabus gave no date for the project, so the field stays blank.
    // The AI must never invent information that is not in the document.
    { name: "Project", weight: 20, due_date: "" },
    { name: "Final",   weight: 40, due_date: "2026-12-18" }
  ]
};

/* ---------- a newly added course, before any grade exists ------------- */
function courseFromDraft(draft, courseId) {
  return {
    course_id: courseId,
    course_code: draft.course_code || "",
    course_name: draft.course_name,
    target_grade: Number(draft.target_grade) || 80,
    current_average: null,
    points_earned_so_far: 0,
    completed_weight: 0,
    remaining_weight: draft.assessments.reduce((s, a) => s + Number(a.weight || 0), 0),
    max_achievable_grade: 100,
    needed_avg_on_remaining_for_target: Number(draft.target_grade) || 80,
    needed_avg_on_remaining_to_pass: 60,
    target_reachable: true,
    pass_reachable: true,
    risk_level: "MEDIUM",
    priority: 5,
    recommended_weekly_hours: 0,
    next_deadline_in_days: null,
    reason: "No grades recorded yet. Enter your first assessment result and the analyst will assess this course.",
    focus: [],
    assessments: draft.assessments.map((a, i) => ({
      assessment_id: courseId + "-" + (i + 1),
      name: a.name,
      weight: Number(a.weight) || 0,
      grade: null,
      due_date: a.due_date || "",
      days_until_due: null,
      status: "Upcoming",
    })),
  };
}

window.SAMPLE = {
  analysis: ANALYSIS,
  analysisUpdated: ANALYSIS_UPDATED,
  syllabus: SYLLABUS,
  courseFromDraft,
};
