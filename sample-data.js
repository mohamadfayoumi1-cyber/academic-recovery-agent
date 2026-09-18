/* =====================================================================
   THE CONTRACT  -  do not change the field names without telling everyone.
   This is exactly what the n8n webhook must return.
   Raghid builds the dashboard against this. Lea makes n8n produce this.
   ===================================================================== */

const SAMPLE_DATA = {
  success: true,
  student_id: "S001",
  student_name: "Mohamad F.",
  overall_status: "RECOVERY_REQUIRED",   // ON_TRACK | AT_RISK | RECOVERY_REQUIRED
  available_weekly_study_hours: 15,
  today: "2026-09-18",

  courses: [
    {
      course_id: "C1",
      course_name: "Calculus II",
      target_grade: 80,
      current_average: 48,
      points_earned_so_far: 21.6,
      completed_weight: 45,
      remaining_weight: 55,
      max_achievable_grade: 76.6,
      needed_avg_on_remaining_for_target: 106.2,
      needed_avg_on_remaining_to_pass: 69.8,
      target_reachable: false,
      pass_reachable: true,
      risk_level: "CRITICAL",
      priority: 1,
      next_deadline_in_days: 4,
      recommended_weekly_hours: 6,
      reason:
        "Two graded assessments averaging 48% have already locked in 21.6 of 100 points. The 80 target is no longer reachable - the ceiling is 76.6. Passing still is, but it needs 69.8% average on everything left, starting with Exam 2 in 4 days.",
      focus: ["Integration by parts", "Series convergence", "Improper integrals"],
      upcoming_assessments: [
        { name: "Exam 2", weight: 25, due_date: "2026-09-22", days_until_due: 4 },
        { name: "Final", weight: 30, due_date: "2026-10-20", days_until_due: 32 }
      ]
    },
    {
      course_id: "C2",
      course_name: "Physics I",
      target_grade: 85,
      current_average: 64,
      points_earned_so_far: 22.4,
      completed_weight: 35,
      remaining_weight: 65,
      max_achievable_grade: 87.4,
      needed_avg_on_remaining_for_target: 96.3,
      needed_avg_on_remaining_to_pass: 57.8,
      target_reachable: true,
      pass_reachable: true,
      risk_level: "HIGH",
      priority: 2,
      next_deadline_in_days: 9,
      recommended_weekly_hours: 4.5,
      reason:
        "Current average of 64% leaves the 85 target technically alive but demanding - it needs 96.3% on the remaining 65% of the course. The midterm in 9 days carries 30% and is the deciding assessment.",
      focus: ["Rotational dynamics", "Conservation of momentum"],
      upcoming_assessments: [
        { name: "Midterm", weight: 30, due_date: "2026-09-27", days_until_due: 9 },
        { name: "Lab Report 3", weight: 10, due_date: "2026-10-05", days_until_due: 17 },
        { name: "Final", weight: 25, due_date: "2026-10-22", days_until_due: 34 }
      ]
    },
    {
      course_id: "C3",
      course_name: "Linear Algebra",
      target_grade: 78,
      current_average: 74,
      points_earned_so_far: 37,
      completed_weight: 50,
      remaining_weight: 50,
      max_achievable_grade: 87,
      needed_avg_on_remaining_for_target: 82,
      needed_avg_on_remaining_to_pass: 46,
      target_reachable: true,
      pass_reachable: true,
      risk_level: "MEDIUM",
      priority: 3,
      next_deadline_in_days: 12,
      recommended_weekly_hours: 3,
      reason:
        "Steady at 74% with half the course still to play for. Hitting 78 needs 82% on what remains - a stretch, not a crisis. Nothing is due for 12 days.",
      focus: ["Eigenvalues", "Diagonalization"],
      upcoming_assessments: [
        { name: "Project", weight: 20, due_date: "2026-09-30", days_until_due: 12 },
        { name: "Final", weight: 30, due_date: "2026-10-24", days_until_due: 36 }
      ]
    },
    {
      course_id: "C4",
      course_name: "Intro to Programming",
      target_grade: 80,
      current_average: 92,
      points_earned_so_far: 55.2,
      completed_weight: 60,
      remaining_weight: 40,
      max_achievable_grade: 95.2,
      needed_avg_on_remaining_for_target: 62,
      needed_avg_on_remaining_to_pass: 12,
      target_reachable: true,
      pass_reachable: true,
      risk_level: "LOW",
      priority: 4,
      next_deadline_in_days: 15,
      recommended_weekly_hours: 1.5,
      reason:
        "92% average with 60% of the course banked. The 80 target only needs 62% on what is left. This course can safely give up study time to Calculus.",
      focus: ["Recursion"],
      upcoming_assessments: [
        { name: "Final Project", weight: 40, due_date: "2026-10-03", days_until_due: 15 }
      ]
    }
  ],

  study_plan: [
    { date: "2026-09-18", course_id: "C1", course_name: "Calculus II",          task: "Integration by parts - work through Exam 2 practice set A", hours: 2,   priority: 1 },
    { date: "2026-09-18", course_id: "C2", course_name: "Physics I",            task: "Rotational dynamics - lecture notes ch. 9",                 hours: 1,   priority: 2 },
    { date: "2026-09-19", course_id: "C1", course_name: "Calculus II",          task: "Series convergence tests - Exam 2 topic list",              hours: 2,   priority: 1 },
    { date: "2026-09-19", course_id: "C3", course_name: "Linear Algebra",       task: "Eigenvalues - start Project section 1",                     hours: 1.5, priority: 3 },
    { date: "2026-09-20", course_id: "C1", course_name: "Calculus II",          task: "Improper integrals + full past Exam 2 under time",          hours: 2,   priority: 1 },
    { date: "2026-09-21", course_id: "C2", course_name: "Physics I",            task: "Conservation of momentum - Midterm problem set",            hours: 1.5, priority: 2 },
    { date: "2026-09-21", course_id: "C4", course_name: "Intro to Programming", task: "Recursion - Final Project skeleton",                        hours: 1,   priority: 4 },
    { date: "2026-09-22", course_id: "C2", course_name: "Physics I",            task: "Midterm review - rotational dynamics recap",                hours: 2,   priority: 2 },
    { date: "2026-09-23", course_id: "C3", course_name: "Linear Algebra",       task: "Diagonalization - Project section 2",                       hours: 1.5, priority: 3 },
    { date: "2026-09-23", course_id: "C4", course_name: "Intro to Programming", task: "Recursion exercises - Final Project tests",                 hours: 0.5, priority: 4 }
  ]
};

window.SAMPLE_DATA = SAMPLE_DATA;
