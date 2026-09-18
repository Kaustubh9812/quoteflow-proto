CREATE TABLE IF NOT EXISTS workspace (
  user_id TEXT PRIMARY KEY,
  briefs_json TEXT NOT NULL DEFAULT '[]',
  quotes_json TEXT NOT NULL DEFAULT '[]',
  jobs_json TEXT NOT NULL DEFAULT '[]',
  settings_json TEXT NOT NULL DEFAULT '{}',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS workspace_updated_at_idx ON workspace(updated_at);
