ALTER TABLE workspace ADD COLUMN inbox_alias TEXT;
ALTER TABLE workspace ADD COLUMN inbox_json TEXT NOT NULL DEFAULT '[]';

CREATE UNIQUE INDEX IF NOT EXISTS workspace_inbox_alias_idx
  ON workspace(inbox_alias);
