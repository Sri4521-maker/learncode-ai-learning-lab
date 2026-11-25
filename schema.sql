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

CREATE TABLE IF NOT EXISTS learner_subscriptions (
  google_sub TEXT PRIMARY KEY,
  stripe_customer_id TEXT NOT NULL,
  stripe_subscription_id TEXT NOT NULL,
  subscription_status TEXT NOT NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS party_rooms (
  code TEXT PRIMARY KEY,
  host_player_id TEXT NOT NULL,
  game_json TEXT NOT NULL DEFAULT '{}',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS party_players (
  id TEXT PRIMARY KEY,
  room_code TEXT NOT NULL REFERENCES party_rooms(code) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  nickname TEXT NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  joined_at INTEGER NOT NULL,
  last_seen INTEGER NOT NULL,
  last_message_at INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY(room_code) REFERENCES party_rooms(code) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_party_players_room ON party_players(room_code, joined_at);

CREATE TABLE IF NOT EXISTS party_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  room_code TEXT NOT NULL REFERENCES party_rooms(code) ON DELETE CASCADE,
  player_id TEXT NOT NULL,
  nickname TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY(room_code) REFERENCES party_rooms(code) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_party_messages_room ON party_messages(room_code, id);
