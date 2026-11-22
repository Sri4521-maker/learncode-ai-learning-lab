CREATE TABLE IF NOT EXISTS survey_responses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id TEXT NOT NULL,
  student_name TEXT NOT NULL,
  survey_level TEXT NOT NULL CHECK(survey_level IN ('foundations', 'advanced')),
  module_or_week TEXT NOT NULL,
  ai_tools_used TEXT NOT NULL,
  q1_what_each_ai_does TEXT NOT NULL,
  q2_ai_comparison TEXT NOT NULL,
  web_dev_skills_used TEXT NOT NULL,
  q3_web_dev_progress TEXT NOT NULL,
  q4_daily_life_help TEXT NOT NULL,
  q5_real_world_examples TEXT NOT NULL,
  q6_confidence_rating INTEGER NOT NULL CHECK(q6_confidence_rating BETWEEN 1 AND 5),
  q7_biggest_challenge TEXT NOT NULL,
  quiz_score INTEGER NOT NULL,
  quiz_total INTEGER NOT NULL,
  xp_earned INTEGER NOT NULL,
  milestones_json TEXT NOT NULL,
  quiz_details_json TEXT NOT NULL,
  submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_student_id ON survey_responses(student_id);
CREATE INDEX IF NOT EXISTS idx_survey_level ON survey_responses(survey_level);
CREATE INDEX IF NOT EXISTS idx_module_week ON survey_responses(module_or_week);
CREATE INDEX IF NOT EXISTS idx_submitted_at ON survey_responses(submitted_at);
