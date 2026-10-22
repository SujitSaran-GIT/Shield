ALTER TABLE clients ADD COLUMN IF NOT EXISTS owner_user_id UUID REFERENCES users(id);
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('SUPER_ADMIN','GUARDIAN_ADMIN','CLIENT_ADMIN','USER'));
CREATE INDEX IF NOT EXISTS idx_clients_owner ON clients(owner_user_id);
-- Only privileged usernames become newly unique. Existing ordinary usernames are preserved.
CREATE UNIQUE INDEX IF NOT EXISTS uq_platform_admin_username ON users(LOWER(username)) WHERE role IN ('SUPER_ADMIN','GUARDIAN_ADMIN');
CREATE TABLE IF NOT EXISTS platform_bootstrap (
 id INTEGER PRIMARY KEY CHECK (id = 1), completed BOOLEAN NOT NULL,
 completed_at TIMESTAMP, administrator_id UUID REFERENCES users(id)
);
INSERT INTO platform_bootstrap(id,completed) SELECT 1, EXISTS(SELECT 1 FROM users WHERE role IN ('SUPER_ADMIN','GUARDIAN_ADMIN'))
 WHERE NOT EXISTS (SELECT 1 FROM platform_bootstrap WHERE id=1);
CREATE TABLE IF NOT EXISTS admin_invitations (
 id UUID PRIMARY KEY, email VARCHAR(255) NOT NULL, invited_by UUID NOT NULL REFERENCES users(id),
 created_at TIMESTAMP NOT NULL, expires_at TIMESTAMP NOT NULL, challenge_id UUID,
 verified_at TIMESTAMP, confirmed_at TIMESTAMP, accepted_at TIMESTAMP, revoked_at TIMESTAMP,
 enrollment_token_hash VARCHAR(255)
);
CREATE INDEX IF NOT EXISTS idx_admin_invites_email ON admin_invitations(email);
