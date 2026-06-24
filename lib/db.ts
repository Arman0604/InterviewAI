import { Pool, types, type QueryResultRow } from "pg";

types.setTypeParser(1082, (value) => value);
types.setTypeParser(1114, (value) => value);
types.setTypeParser(1184, (value) => value);

const DEFAULT_DATABASE_URL = "postgres://postgres:postgres@localhost:5432/ai_interview";

let pool: Pool | null = null;
let schemaReady: Promise<void> | null = null;

function createPool() {
  const connectionString = process.env.DATABASE_URL || DEFAULT_DATABASE_URL;
  const ssl =
    process.env.PGSSLMODE === "require" || process.env.POSTGRES_SSL === "true"
      ? { rejectUnauthorized: false }
      : undefined;

  return new Pool({
    connectionString,
    ssl,
    max: Number(process.env.POSTGRES_POOL_MAX || 10),
  });
}

async function initSchema(database: Pool) {
  await database.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      user_type TEXT NOT NULL,
      company_name TEXT,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS interview_sessions (
      id TEXT PRIMARY KEY,
      short_id TEXT UNIQUE,
      created_by TEXT NOT NULL REFERENCES users(id),
      role TEXT NOT NULL,
      title TEXT,
      custom_questions TEXT DEFAULT '[]',
      is_active INTEGER DEFAULT 1,
      round TEXT DEFAULT 'technical',
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS interview_attempts (
      id TEXT PRIMARY KEY,
      session_id TEXT REFERENCES interview_sessions(id),
      candidate_id TEXT NOT NULL REFERENCES users(id),
      role TEXT NOT NULL,
      is_mock INTEGER DEFAULT 0,
      status TEXT DEFAULT 'in_progress',
      conversation TEXT DEFAULT '[]',
      score INTEGER,
      feedback TEXT DEFAULT '{}',
      summary TEXT,
      resume_text TEXT,
      tab_switch_count INTEGER DEFAULT 0,
      proctored INTEGER DEFAULT 0,
      proctoring_camera_status TEXT DEFAULT 'unknown',
      proctoring_violation_count INTEGER DEFAULT 0,
      proctoring_flagged INTEGER DEFAULT 0,
      proctoring_summary TEXT DEFAULT '{}',
      selected_questions TEXT,
      round TEXT DEFAULT 'technical',
      dsa_submission TEXT,
      started_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      completed_at TIMESTAMPTZ
    );

    CREATE TABLE IF NOT EXISTS proctoring_events (
      id TEXT PRIMARY KEY,
      attempt_id TEXT NOT NULL REFERENCES interview_attempts(id) ON DELETE CASCADE,
      candidate_id TEXT NOT NULL REFERENCES users(id),
      event_type TEXT NOT NULL,
      message TEXT,
      metadata TEXT DEFAULT '{}',
      occurred_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await database.query("ALTER TABLE interview_sessions ADD COLUMN IF NOT EXISTS short_id TEXT");
  await database.query("ALTER TABLE interview_sessions ADD COLUMN IF NOT EXISTS round TEXT DEFAULT 'technical'");
  await database.query("ALTER TABLE interview_attempts ADD COLUMN IF NOT EXISTS resume_text TEXT");
  await database.query("ALTER TABLE interview_attempts ADD COLUMN IF NOT EXISTS tab_switch_count INTEGER DEFAULT 0");
  await database.query("ALTER TABLE interview_attempts ADD COLUMN IF NOT EXISTS proctored INTEGER DEFAULT 0");
  await database.query("ALTER TABLE interview_attempts ADD COLUMN IF NOT EXISTS proctoring_camera_status TEXT DEFAULT 'unknown'");
  await database.query("ALTER TABLE interview_attempts ADD COLUMN IF NOT EXISTS proctoring_violation_count INTEGER DEFAULT 0");
  await database.query("ALTER TABLE interview_attempts ADD COLUMN IF NOT EXISTS proctoring_flagged INTEGER DEFAULT 0");
  await database.query("ALTER TABLE interview_attempts ADD COLUMN IF NOT EXISTS proctoring_summary TEXT DEFAULT '{}'");
  await database.query("ALTER TABLE interview_attempts ADD COLUMN IF NOT EXISTS round TEXT DEFAULT 'technical'");
  await database.query("ALTER TABLE interview_attempts ADD COLUMN IF NOT EXISTS dsa_submission TEXT");
  await database.query("ALTER TABLE interview_attempts ADD COLUMN IF NOT EXISTS selected_questions TEXT");

  await database.query("UPDATE interview_attempts SET role = 'online-assessment' WHERE round = 'aptitude'");

  await database.query(`
    CREATE INDEX IF NOT EXISTS idx_attempts_candidate_status_completed
      ON interview_attempts(candidate_id, status, completed_at DESC);
    CREATE INDEX IF NOT EXISTS idx_attempts_session_status_score
      ON interview_attempts(session_id, status, score DESC);
    CREATE INDEX IF NOT EXISTS idx_attempts_session_started
      ON interview_attempts(session_id, started_at DESC);
    CREATE INDEX IF NOT EXISTS idx_proctoring_events_attempt_time
      ON proctoring_events(attempt_id, occurred_at ASC);
    CREATE INDEX IF NOT EXISTS idx_proctoring_events_candidate_time
      ON proctoring_events(candidate_id, occurred_at DESC);
    CREATE INDEX IF NOT EXISTS idx_sessions_created_by_created
      ON interview_sessions(created_by, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_sessions_short_active
      ON interview_sessions(short_id, is_active);
  `);
}

export default async function getDb(): Promise<Pool> {
  if (!pool) pool = createPool();
  if (!schemaReady) schemaReady = initSchema(pool);
  await schemaReady;
  return pool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = []
): Promise<T[]> {
  const database = await getDb();
  const result = await database.query<T>(text, params);
  return result.rows;
}

export async function queryOne<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = []
): Promise<T | undefined> {
  const rows = await query<T>(text, params);
  return rows[0];
}

export async function execute(text: string, params: unknown[] = []) {
  const database = await getDb();
  const result = await database.query(text, params);
  return { rowCount: result.rowCount ?? 0 };
}
