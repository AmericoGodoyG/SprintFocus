import Database from 'better-sqlite3'

export function runMigrations(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS subjects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      color TEXT NOT NULL DEFAULT '#6366f1',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS topics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subject_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS study_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subject_id INTEGER,
      topic_id INTEGER,
      started_at DATETIME NOT NULL,
      finished_at DATETIME,
      planned_minutes INTEGER NOT NULL DEFAULT 25,
      actual_minutes INTEGER DEFAULT 0,
      session_type TEXT NOT NULL DEFAULT 'study',
      cycle_number INTEGER DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'in_progress',
      notes TEXT,
      FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL,
      FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Default settings
    INSERT OR IGNORE INTO app_settings (key, value) VALUES
      ('pomodoro_study_minutes', '50'),
      ('pomodoro_short_break', '10'),
      ('pomodoro_long_break', '30'),
      ('pomodoro_cycles', '4'),
      ('pomodoro_sound', 'true'),
      ('pomodoro_notifications', 'true'),
      ('theme', 'dark');

    -- Indexes for performance
    CREATE INDEX IF NOT EXISTS idx_sessions_started_at ON study_sessions(started_at);
    CREATE INDEX IF NOT EXISTS idx_sessions_subject ON study_sessions(subject_id);
  `)
}
