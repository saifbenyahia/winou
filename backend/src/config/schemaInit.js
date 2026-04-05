export const ensureRuntimeSchema = async (pool) => {
  await pool.query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS google_id TEXT,
    ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(20) DEFAULT 'local',
    ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE
  `);

  await pool.query(`
    ALTER TABLE users
    ALTER COLUMN password_hash DROP NOT NULL
  `);

  await pool.query(`
    UPDATE users
    SET auth_provider = CASE
      WHEN google_id IS NOT NULL AND password_hash IS NOT NULL THEN 'hybrid'
      WHEN google_id IS NOT NULL THEN 'google'
      ELSE 'local'
    END
    WHERE auth_provider IS NULL OR auth_provider = ''
  `);

  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_id_unique
    ON users (google_id)
    WHERE google_id IS NOT NULL
  `);

  await pool.query(`
    ALTER TABLE campaigns
    ADD COLUMN IF NOT EXISTS story TEXT NULL
  `);

  await pool.query(`
    DO $$
    BEGIN
      CREATE TYPE pledge_status AS ENUM ('PENDING', 'SUCCESS', 'FAILED');
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END
    $$;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS pledges (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE RESTRICT ON UPDATE CASCADE,
      donateur_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
      amount INTEGER NOT NULL CHECK (amount > 0),
      status pledge_status NOT NULL DEFAULT 'PENDING',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_pledges_campaign_id ON pledges (campaign_id)
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_pledges_donateur_id ON pledges (donateur_id)
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_pledges_status ON pledges (status)
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
      type VARCHAR(40) NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      link TEXT NULL,
      is_read BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_notifications_user_created
    ON notifications (user_id, created_at DESC)
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
    ON notifications (user_id, is_read)
  `);
};
