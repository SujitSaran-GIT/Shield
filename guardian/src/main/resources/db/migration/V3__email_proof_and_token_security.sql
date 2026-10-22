CREATE TABLE email_challenges (
    id UUID PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    purpose VARCHAR(255) NOT NULL,
    binding VARCHAR(255) NOT NULL,
    code_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    consumed BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE INDEX idx_email_challenge_expiry ON email_challenges(expires_at);
ALTER TABLE refresh_tokens ADD COLUMN version BIGINT;
-- Historic tokens were stored in plaintext and did not enforce persisted access sessions.
-- Require reauthentication once, retaining history without recoverable bearer credentials.
UPDATE refresh_tokens SET revoked = TRUE, token = encode(sha256(convert_to(token, 'UTF8')), 'hex');
UPDATE user_sessions SET active = FALSE, session_token = encode(sha256(convert_to(session_token, 'UTF8')), 'hex');
