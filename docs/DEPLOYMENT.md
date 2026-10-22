# Deployment and initial provisioning

This update preserves PostgreSQL, Spring Data JPA, Redis/Bucket4j, MaxMind GeoIP, AuditLog event types, and the existing REST integration. It adds versioned schema changes and hardens authorization. Back up and rehearse on a restored database before deploying. No production database is reset by the implementation.

## Configuration

Use `guardian/.env.example` as an operator reference; inject secrets via the service environment or secret manager. Spring Boot does not automatically import `.env`. Docker Compose explicitly imports `guardian/.env`. Existing real frontend environment files are preserved. `application.yaml` now has safe environment references rather than embedded credentials. Application startup requires `DB_PASSWORD` and a random `JWT_SECRET` of at least 32 bytes. Replace the example placeholders; they are not valid production credentials.

Required deployment settings: database URL/user/password; Redis endpoint/password; SMTP endpoint/user/password/from address; explicit CORS origins; HTTPS; secure refresh cookies. Set `COOKIE_SECURE=false` only for local HTTP development. For same-site Strict cookies, host the console and API on the same site (a reverse proxy on one origin is simplest). Cross-site browser deployments require a separate reviewed cookie/CSRF architecture; do not weaken CORS or copy client secrets into a browser.

`RATE_LIMIT_MODE=redis` and `RATE_LIMIT_OUTAGE_POLICY=fail-closed` are defaults. Redis outages return 503 for protected write/authentication operations. Explicit `RATE_LIMIT_MODE=local` retains Bucket4j for a single-instance development deployment. `RATE_LIMIT_OUTAGE_POLICY=local` is an operator-chosen degraded mode and cannot guarantee shared limits across instances; monitor the storage error metric. Redis is still a readiness dependency unless the readiness group is deliberately configured otherwise for a local-only deployment.

Only `TRUSTED_PROXIES` listed by exact IP or CIDR may supply `X-Forwarded-For`. Leave empty when directly exposed. Configure the edge proxy to replace forwarded headers, terminate TLS, redirect HTTP to HTTPS, and enforce body/connection limits. Do not enable Spring forwarded-header processing in addition to the application resolver.

GeoIP is optional: set `GEOIP_DB_PATH` to a licensed MaxMind City database. Missing or failed lookups return Unknown and never reject valid authentication. Locations are approximate. Location metadata expires after `LOCATION_RETENTION_DAYS` (30 by default); audit event history expires after `AUDIT_RETENTION_DAYS` (90). Align retention with the deployment's privacy policy and backup retention. Keep location retention no longer than audit retention.

## Database adoption

1. Back up database and encryption/signing configuration securely. Restore to an isolated database and test migrations there.
2. Inspect legacy privileged usernames for case-insensitive duplicates. Resolve conflicts explicitly before creating the privileged username index; migration fails safely instead of deleting accounts.
3. New empty databases run V1, V2, and V3. Existing Hibernate-created databases require a deliberate one-time `DB_BASELINE_ON_MIGRATE=true` at version 1 after verifying the legacy schema. Disable this setting after adoption.
4. V2 adds explicit ownership and privileged provisioning state. Existing clients without ownership remain visible to platform admins and inaccessible to client admins until an operator assigns verified ownership. Never infer ownership from request parameters or email alone.
5. V3 irreversibly hashes historic persisted bearer tokens and revokes their sessions. Users must sign in once after deployment. User data, passwords, client metadata, and audit history remain intact. Keep PostgreSQL at version 17 for the tested migration path.
6. Legacy encrypted client credentials require the old encryption/signing material through `LEGACY_ENCRYPTION_KEY` during conversion. Complete credential migration or authorized rotations before discarding the old key. A new signing key cannot decrypt older credentials. Never accept ciphertext or stored password verifiers as replacement credentials.
7. Hibernate uses `validate`; it no longer edits production schema at runtime. Grant runtime DB access only to required tables/sequences. Use a separate migration role where operationally possible. Limit audit mutation permissions to the application retention process and archive/security operators.

Do not restore an old application version over the migrated token tables: older code expects plaintext tokens. Rollback requires an application-aware recovery plan and reauthentication, not reversing one-way hashes.

## First SUPER_ADMIN

Provision a separate random `APP_BOOTSTRAP_SECRET` through the deployment environment. The default is blank and bootstrap fails closed. Ensure SMTP delivers to the operator's administrator email.

1. POST `/api/admin/bootstrap/request` with `X-Bootstrap-Secret` and `{ "email": "owner@example.com" }`.
2. Read the short-lived OTP from that email. It is never returned or logged by the API.
3. POST `/api/admin/bootstrap/complete` with the same secret header and `{ "email": "owner@example.com", "password": "...", "confirmPassword": "...", "challengeId": "...", "code": "..." }`. A unique username is generated if omitted.
4. Sign in at `/api/auth/login/admin` with email/password. The backend supplies the trusted role. Store personal passwords separately from application credentials.
5. Remove the bootstrap secret from the deployment after success. The locked singleton state permanently closes bootstrap even if the administrator account is later deactivated. Existing legacy GUARDIAN_ADMIN accounts also close bootstrap.

Bootstrap is transactional and serializes on a pre-provisioned singleton database row. A failed provisioning attempt can require a new OTP; successful OTP consumption is single-use even if a later operation fails. Do not reopen completed state manually.

## Additional administrators and enrollment

An existing SUPER_ADMIN creates an invitation with POST `/api/admin/invitations`. Deliver the invitation identifier to the intended recipient through the enrollment flow. The recipient proves control of their email at POST `/api/admin/invitations/{id}/verify`, receiving a temporary enrollment token. The original inviter confirms using PUT `/api/admin/invitations/{id}/confirm`. The recipient then submits their own username/password/confirmation/token to POST `/api/admin/invitations/{id}/accept`. Expired, accepted, or revoked invitations cannot be reused. DELETE `/api/admin/invitations/{id}` revokes an invitation. Never copy personal passwords or use the bootstrap endpoint to add subsequent admins.

CLIENT_ADMIN public enrollment is disabled by default. Enable `APP_CLIENT_ADMIN_PUBLIC_ENABLED=true` only when self-service tenant ownership is an intended business policy. Email verification is still mandatory and ownership is confined to clients registered by that account. Enforce edge/signup capacity limits and monitor abuse before opening broad enrollment.

## Operations

Public `/actuator/health`, `/actuator/health/liveness`, and `/actuator/health/readiness` reveal status only. Detailed health, metrics, global streams, and `/api/health/**` require SUPER_ADMIN. CPU/memory/request metrics are actual Micrometer readings; unavailable readings are omitted or explicitly unavailable.

Monitor `http.server.requests`, `security.rate_limit.requests`, `security.rate_limit.storage_errors`, and `security.audit.write_failures`. Logs carry generated X-Request-ID values. Never enable verbose SQL parameter, authentication payload, SMTP protocol, or STOMP header logging in production.

Docker Compose preserves the existing app service and expects separately managed PostgreSQL, Redis, and SMTP through environment settings. The app binds locally by default for an HTTPS reverse proxy. Its image runs as a non-root user. The GeoIP file in the mounted directory must match `GEOIP_DB_PATH`.

Test backups by restoring data and migration history together. Encrypt backups, restrict access to location/audit records, and rehearse key rotation and recovery. Do not deploy until the validation report's remaining limitations are accepted and SMTP/HTTPS/proxy behavior is verified in the target environment.
