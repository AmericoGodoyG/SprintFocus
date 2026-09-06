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

    CREATE TABLE IF NOT EXISTS pdf_documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subject_id INTEGER,
      topic_id INTEGER,
      filename TEXT NOT NULL,
      filepath TEXT NOT NULL,
      extracted_text TEXT,
      summary TEXT,
      page_count INTEGER DEFAULT 0,
      file_size INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL,
      FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS flashcards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pdf_id INTEGER,
      subject_id INTEGER,
      topic_id INTEGER,
      question TEXT NOT NULL,
      answer TEXT NOT NULL,
      difficulty TEXT DEFAULT 'medium',
      source TEXT DEFAULT 'manual',
      review_count INTEGER DEFAULT 0,
      next_review DATETIME,
      ease_factor REAL DEFAULT 2.5,
      interval_days INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (pdf_id) REFERENCES pdf_documents(id) ON DELETE SET NULL,
      FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL,
      FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS flashcard_reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      flashcard_id INTEGER NOT NULL,
      reviewed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      result TEXT NOT NULL,
      difficulty_rating TEXT NOT NULL,
      response_time_ms INTEGER DEFAULT 0,
      FOREIGN KEY (flashcard_id) REFERENCES flashcards(id) ON DELETE CASCADE
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
      ('theme', 'dark'),
      ('ai_provider', 'gemini'),
      ('ai_model', 'gemini-2.0-flash'),
      ('ai_max_flashcards', '20'),
      ('ai_temperature', '0.7');

    -- Indexes for performance
    CREATE INDEX IF NOT EXISTS idx_sessions_started_at ON study_sessions(started_at);
    CREATE INDEX IF NOT EXISTS idx_sessions_subject ON study_sessions(subject_id);
    CREATE INDEX IF NOT EXISTS idx_flashcards_subject ON flashcards(subject_id);
    CREATE INDEX IF NOT EXISTS idx_flashcards_next_review ON flashcards(next_review);
    CREATE INDEX IF NOT EXISTS idx_reviews_flashcard ON flashcard_reviews(flashcard_id);
  `)
}
