CREATE TABLE IF NOT EXISTS users (
 id UUID PRIMARY KEY, username VARCHAR(255) NOT NULL, email VARCHAR(255) NOT NULL UNIQUE,
 password_hash VARCHAR(255) NOT NULL, client_id VARCHAR(255), role VARCHAR(255) NOT NULL,
 status VARCHAR(255) NOT NULL, created_at TIMESTAMP NOT NULL, updated_at TIMESTAMP,
 last_login_at TIMESTAMP, last_login_ip VARCHAR(255), last_login_location VARCHAR(255)
);
CREATE TABLE IF NOT EXISTS clients (
 id UUID PRIMARY KEY, client_id VARCHAR(255) NOT NULL UNIQUE, client_key VARCHAR(255) NOT NULL,
 name VARCHAR(255) NOT NULL, description VARCHAR(1000), idle_timeout INTEGER,
 status VARCHAR(255) NOT NULL, created_at TIMESTAMP NOT NULL, updated_at TIMESTAMP
);
CREATE TABLE IF NOT EXISTS client_allowed_origins (
 client_id UUID NOT NULL REFERENCES clients(id), allowed_origin VARCHAR(255)
);
CREATE TABLE IF NOT EXISTS user_sessions (
 id UUID PRIMARY KEY, user_id UUID NOT NULL, client_id VARCHAR(255) NOT NULL,
 session_token TEXT NOT NULL UNIQUE, ip_address VARCHAR(255), location TEXT,
 user_agent TEXT, device_info TEXT, created_at TIMESTAMP NOT NULL,
 last_active_at TIMESTAMP NOT NULL, expires_at TIMESTAMP NOT NULL, active BOOLEAN NOT NULL
);
CREATE TABLE IF NOT EXISTS refresh_tokens (
 id UUID PRIMARY KEY, token VARCHAR(500) NOT NULL UNIQUE, user_id UUID NOT NULL,
 client_id VARCHAR(255) NOT NULL, expires_at TIMESTAMP NOT NULL, revoked BOOLEAN NOT NULL,
 created_at TIMESTAMP NOT NULL
);
CREATE TABLE IF NOT EXISTS audit_logs (
 id UUID PRIMARY KEY, client_id VARCHAR(255), client_name VARCHAR(255), user_id UUID,
 user_email VARCHAR(255), ip_address VARCHAR(255), location VARCHAR(500), user_agent VARCHAR(1000),
 event_type VARCHAR(255) NOT NULL, status_code INTEGER, details VARCHAR(2000), created_at TIMESTAMP NOT NULL
);
CREATE TABLE IF NOT EXISTS notifications (
 id UUID PRIMARY KEY, user_id UUID NOT NULL, title VARCHAR(255) NOT NULL, message VARCHAR(1000) NOT NULL,
 type VARCHAR(50) NOT NULL, is_read BOOLEAN NOT NULL, action_url VARCHAR(255), metadata VARCHAR(2000),
 created_at TIMESTAMP NOT NULL, read_at TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_users_client ON users(client_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_audits_client_created ON audit_logs(client_id,created_at);
CREATE INDEX IF NOT EXISTS idx_audits_event_created ON audit_logs(event_type,created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id,created_at);
