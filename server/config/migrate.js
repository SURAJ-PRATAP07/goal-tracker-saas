require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { pool } = require('./database');
const logger = require('../utils/logger');

const migrations = `
-- ─── Extensions ─────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ─── Enum Types ──────────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('employee', 'manager', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE user_status AS ENUM ('active', 'inactive', 'suspended');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE goal_status AS ENUM (
    'draft', 'submitted', 'approved', 'rejected',
    'in_progress', 'completed', 'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE goal_category AS ENUM (
    'performance', 'development', 'learning', 'innovation', 'leadership', 'operational'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE checkin_status AS ENUM ('on_track', 'at_risk', 'behind', 'completed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE audit_action AS ENUM (
    'CREATE', 'READ', 'UPDATE', 'DELETE',
    'LOGIN', 'LOGOUT', 'APPROVE', 'REJECT', 'SUBMIT'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── Departments ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS departments (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          VARCHAR(100) NOT NULL UNIQUE,
  description   TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Users ───────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id     VARCHAR(20) UNIQUE NOT NULL,
  email           VARCHAR(255) UNIQUE NOT NULL,
  password_hash   VARCHAR(255) NOT NULL,
  first_name      VARCHAR(100) NOT NULL,
  last_name       VARCHAR(100) NOT NULL,
  role            user_role NOT NULL DEFAULT 'employee',
  status          user_status NOT NULL DEFAULT 'active',
  department_id   UUID REFERENCES departments(id) ON DELETE SET NULL,
  manager_id      UUID REFERENCES users(id) ON DELETE SET NULL,
  job_title       VARCHAR(150),
  avatar_url      TEXT,
  last_login_at   TIMESTAMPTZ,
  password_changed_at TIMESTAMPTZ,
  refresh_token   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_manager_id ON users(manager_id);
CREATE INDEX IF NOT EXISTS idx_users_department_id ON users(department_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- ─── Goal Cycles (Quarters) ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS goal_cycles (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        VARCHAR(100) NOT NULL,
  year        INTEGER NOT NULL,
  quarter     INTEGER NOT NULL CHECK (quarter BETWEEN 1 AND 4),
  start_date  DATE NOT NULL,
  end_date    DATE NOT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT false,
  created_by  UUID REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(year, quarter)
);

-- ─── Goals ───────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS goals (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  cycle_id          UUID NOT NULL REFERENCES goal_cycles(id) ON DELETE RESTRICT,
  title             VARCHAR(255) NOT NULL,
  description       TEXT,
  category          goal_category NOT NULL DEFAULT 'performance',
  status            goal_status NOT NULL DEFAULT 'draft',
  weightage         NUMERIC(5,2) NOT NULL CHECK (weightage >= 10 AND weightage <= 100),
  target_value      NUMERIC(10,2),
  current_value     NUMERIC(10,2) DEFAULT 0,
  unit_of_measure   VARCHAR(50),
  due_date          DATE,
  submitted_at      TIMESTAMPTZ,
  approved_at       TIMESTAMPTZ,
  approved_by       UUID REFERENCES users(id),
  rejection_reason  TEXT,
  completion_notes  TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_goals_employee_id ON goals(employee_id);
CREATE INDEX IF NOT EXISTS idx_goals_cycle_id ON goals(cycle_id);
CREATE INDEX IF NOT EXISTS idx_goals_status ON goals(status);
CREATE INDEX IF NOT EXISTS idx_goals_approved_by ON goals(approved_by);

-- ─── Goal Weightage Constraint (enforced via trigger) ─────────────────────────────
-- Total weightage per employee per cycle must be <= 100% (checked in application)
-- Total goals per employee per cycle must be <= 8 (checked in application)

-- ─── Key Results / Milestones ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS key_results (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  goal_id     UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  title       VARCHAR(255) NOT NULL,
  description TEXT,
  target      NUMERIC(10,2),
  current     NUMERIC(10,2) DEFAULT 0,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  due_date    DATE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_key_results_goal_id ON key_results(goal_id);

-- ─── Quarterly Check-ins ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS check_ins (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  goal_id           UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  employee_id       UUID NOT NULL REFERENCES users(id),
  cycle_id          UUID NOT NULL REFERENCES goal_cycles(id),
  check_in_date     DATE NOT NULL DEFAULT CURRENT_DATE,
  progress_value    NUMERIC(10,2),
  progress_percent  NUMERIC(5,2) CHECK (progress_percent BETWEEN 0 AND 100),
  status            checkin_status NOT NULL DEFAULT 'on_track',
  employee_notes    TEXT,
  manager_notes     TEXT,
  manager_id        UUID REFERENCES users(id),
  reviewed_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_checkins_goal_id ON check_ins(goal_id);
CREATE INDEX IF NOT EXISTS idx_checkins_employee_id ON check_ins(employee_id);
CREATE INDEX IF NOT EXISTS idx_checkins_cycle_id ON check_ins(cycle_id);

-- ─── Audit Logs ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID REFERENCES users(id) ON DELETE SET NULL,
  action        audit_action NOT NULL,
  entity_type   VARCHAR(50) NOT NULL,
  entity_id     UUID,
  old_values    JSONB,
  new_values    JSONB,
  ip_address    INET,
  user_agent    TEXT,
  metadata      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- ─── Notifications ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        VARCHAR(50) NOT NULL,
  title       VARCHAR(255) NOT NULL,
  message     TEXT NOT NULL,
  is_read     BOOLEAN NOT NULL DEFAULT false,
  entity_type VARCHAR(50),
  entity_id   UUID,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id, is_read);

-- ─── Auto-update updated_at trigger ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DO $$ 
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['users','departments','goals','key_results','check_ins','goal_cycles']
  LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS update_%s_updated_at ON %s;
      CREATE TRIGGER update_%s_updated_at
        BEFORE UPDATE ON %s
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    ', t, t, t, t);
  END LOOP;
END $$;
`;

const runMigrations = async () => {
  const client = await pool.connect();
  try {
    logger.info('Running database migrations...');
    await client.query(migrations);
    logger.info('✅ Migrations completed successfully');
  } catch (error) {
    logger.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
};

runMigrations();
