export const ensureRuntimeSchema = async (pool) => {
  await pool.query(`
    CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public
  `);

  await pool.query(`
    CREATE OR REPLACE FUNCTION trigger_set_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql
  `);

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
    ADD COLUMN IF NOT EXISTS story TEXT NULL,
    ADD COLUMN IF NOT EXISTS current_amount INTEGER NOT NULL DEFAULT 0
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
    DO $$
    BEGIN
      CREATE TYPE donation_status AS ENUM ('PENDING', 'PAID', 'FAILED', 'EXPIRED', 'CANCELED');
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END
    $$;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS donations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE RESTRICT ON UPDATE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
      provider VARCHAR(30) NOT NULL DEFAULT 'manual',
      amount_millimes INTEGER NOT NULL CHECK (amount_millimes > 0),
      currency_token VARCHAR(10) NOT NULL DEFAULT 'TND',
      status donation_status NOT NULL DEFAULT 'PENDING',
      provider_payment_ref TEXT NULL,
      provider_short_id TEXT NULL,
      provider_order_id TEXT NULL,
      provider_status VARCHAR(80) NULL,
      provider_payload_init JSONB NULL,
      provider_payload_details JSONB NULL,
      description TEXT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      paid_at TIMESTAMPTZ NULL
    )
  `);

  await pool.query(`
    ALTER TABLE donations
    ADD COLUMN IF NOT EXISTS provider VARCHAR(30) DEFAULT 'manual',
    ADD COLUMN IF NOT EXISTS currency_token VARCHAR(10) DEFAULT 'TND',
    ADD COLUMN IF NOT EXISTS provider_payment_ref TEXT NULL,
    ADD COLUMN IF NOT EXISTS provider_short_id TEXT NULL,
    ADD COLUMN IF NOT EXISTS provider_order_id TEXT NULL,
    ADD COLUMN IF NOT EXISTS provider_payload_init JSONB NULL,
    ADD COLUMN IF NOT EXISTS provider_payload_details JSONB NULL,
    ADD COLUMN IF NOT EXISTS description TEXT NULL,
    ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ NULL
  `);

  await pool.query(`
    ALTER TABLE donations
    ALTER COLUMN provider SET DEFAULT 'manual',
    ALTER COLUMN currency_token SET DEFAULT 'TND'
  `);

  await pool.query(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'donations'
          AND column_name = 'provider_payment_id'
      ) THEN
        UPDATE donations
        SET currency_token = COALESCE(currency_token, 'TND'),
            provider_payment_ref = COALESCE(provider_payment_ref, provider_payment_id),
            provider_order_id = COALESCE(provider_order_id, developer_tracking_id),
            provider_payload_init = COALESCE(provider_payload_init, provider_payload_generate),
            provider_payload_details = COALESCE(provider_payload_details, provider_payload_verify),
            provider = CASE
              WHEN provider IS NULL OR provider = '' OR provider <> 'manual' THEN 'manual'
              ELSE provider
            END;
      ELSE
        UPDATE donations
        SET currency_token = COALESCE(currency_token, 'TND'),
            provider = CASE
              WHEN provider IS NULL OR provider = '' OR provider <> 'manual' THEN 'manual'
              ELSE provider
            END;
      END IF;
    END
    $$;
  `);

  await pool.query(`
    ALTER TABLE donations
    ALTER COLUMN currency_token SET NOT NULL
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_donations_campaign_id
    ON donations (campaign_id)
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_donations_user_id
    ON donations (user_id)
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_donations_status
    ON donations (status)
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_donations_provider_payment_ref
    ON donations (provider_payment_ref)
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_donations_provider_order_id
    ON donations (provider_order_id)
  `);

  await pool.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_donations_provider_payment_ref_unique
    ON donations (provider_payment_ref)
    WHERE provider_payment_ref IS NOT NULL
  `);

  await pool.query(`
    DROP TABLE IF EXISTS payment_webhook_events
  `);

  await pool.query(`
    UPDATE campaigns c
    SET current_amount = COALESCE((
      SELECT SUM(p.amount)
      FROM pledges p
      WHERE p.campaign_id = c.id
        AND p.status = 'SUCCESS'
    ), 0) + COALESCE((
      SELECT SUM(d.amount_millimes)
      FROM donations d
      WHERE d.campaign_id = c.id
        AND d.status = 'PAID'
    ), 0)
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

  await pool.query(`
    CREATE TABLE IF NOT EXISTS comments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE ON UPDATE CASCADE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
      content TEXT NOT NULL CHECK (char_length(trim(content)) > 0 AND char_length(content) <= 1000),
      is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_comments_campaign_id
    ON comments (campaign_id, created_at DESC)
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_comments_user_id
    ON comments (user_id)
  `);

  await pool.query(`
    DO $$
    BEGIN
      CREATE TYPE support_ticket_status AS ENUM ('OPEN', 'IN_PROGRESS', 'WAITING_USER', 'RESOLVED', 'CLOSED');
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END
    $$;
  `);

  await pool.query(`
    DO $$
    BEGIN
      CREATE TYPE support_ticket_priority AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END
    $$;
  `);

  await pool.query(`
    DO $$
    BEGIN
      CREATE TYPE support_ticket_category AS ENUM ('GENERAL', 'CAMPAIGN', 'PAYMENT', 'ACCOUNT', 'TECHNICAL', 'REPORT_ABUSE', 'OTHER');
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END
    $$;
  `);

  await pool.query(`
    DO $$
    BEGIN
      CREATE TYPE support_sender_role AS ENUM ('USER', 'ADMIN');
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END
    $$;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS support_tickets (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      code VARCHAR(24) NOT NULL UNIQUE,
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
      related_campaign_id UUID NULL REFERENCES campaigns(id) ON DELETE SET NULL ON UPDATE CASCADE,
      title VARCHAR(200) NOT NULL CHECK (char_length(trim(title)) > 0),
      category support_ticket_category NOT NULL DEFAULT 'GENERAL',
      priority support_ticket_priority NOT NULL DEFAULT 'MEDIUM',
      status support_ticket_status NOT NULL DEFAULT 'OPEN',
      assigned_admin_id UUID NULL REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
      last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      closed_at TIMESTAMPTZ NULL
    )
  `);

  await pool.query(`
    ALTER TABLE support_tickets
    ADD COLUMN IF NOT EXISTS related_campaign_id UUID NULL REFERENCES campaigns(id) ON DELETE SET NULL ON UPDATE CASCADE
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS support_ticket_messages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE ON UPDATE CASCADE,
      sender_id UUID NULL REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
      sender_role support_sender_role NOT NULL,
      sender_name VARCHAR(255) NOT NULL,
      message TEXT NOT NULL CHECK (char_length(trim(message)) > 0 AND char_length(message) <= 4000),
      attachment_url TEXT NULL,
      attachment_name VARCHAR(255) NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    ALTER TABLE support_ticket_messages
    ADD COLUMN IF NOT EXISTS sender_name VARCHAR(255) DEFAULT 'Support'
  `);

  await pool.query(`
    ALTER TABLE support_ticket_messages
    ADD COLUMN IF NOT EXISTS attachment_name VARCHAR(255)
  `);

  await pool.query(`
    UPDATE support_ticket_messages
    SET sender_name = COALESCE(NULLIF(sender_name, ''), 'Support')
    WHERE sender_name IS NULL OR sender_name = ''
  `);

  await pool.query(`
    ALTER TABLE support_ticket_messages
    ALTER COLUMN sender_name SET NOT NULL
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS support_ticket_internal_notes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE ON UPDATE CASCADE,
      admin_id UUID NULL REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
      admin_name VARCHAR(255) NOT NULL,
      note TEXT NOT NULL CHECK (char_length(trim(note)) > 0 AND char_length(note) <= 4000),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id
    ON support_tickets (user_id, created_at DESC)
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_support_tickets_status
    ON support_tickets (status)
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned_admin
    ON support_tickets (assigned_admin_id)
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_support_tickets_last_message_at
    ON support_tickets (last_message_at DESC)
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_support_ticket_messages_ticket_created
    ON support_ticket_messages (ticket_id, created_at ASC)
  `);

  await pool.query(`
    CREATE INDEX IF NOT EXISTS idx_support_ticket_internal_notes_ticket_created
    ON support_ticket_internal_notes (ticket_id, created_at DESC)
  `);

  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'set_updated_at_support_tickets'
      ) THEN
        CREATE TRIGGER set_updated_at_support_tickets
        BEFORE UPDATE ON support_tickets
        FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
      END IF;
    END
    $$;
  `);

  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'set_updated_at_donations'
      ) THEN
        CREATE TRIGGER set_updated_at_donations
        BEFORE UPDATE ON donations
        FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
      END IF;
    END
    $$;
  `);

  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'set_updated_at_support_ticket_messages'
      ) THEN
        CREATE TRIGGER set_updated_at_support_ticket_messages
        BEFORE UPDATE ON support_ticket_messages
        FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
      END IF;
    END
    $$;
  `);

  await pool.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'set_updated_at_support_ticket_internal_notes'
      ) THEN
        CREATE TRIGGER set_updated_at_support_ticket_internal_notes
        BEFORE UPDATE ON support_ticket_internal_notes
        FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
      END IF;
    END
    $$;
  `);
};
