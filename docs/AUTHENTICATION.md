# Authentication inventory and integration contract

The existing Spring Boot authentication API, BCrypt password hashing, JWT signing,
refresh-token repository, session history, location enrichment, rate limiting and
audit hooks were retained. This document records the authentication-specific audit
and changes; platform provisioning and tenant authorization are documented separately.

## Audit inventory

| Requirement | Existing implementation and evidence | Initial status / risk | Repair |
| --- | --- | --- | --- |
| Password authentication | `UserService.authenticateUser`, `AuthService.login` | Partial: status-specific errors disclosed account state | Generic credential failures and current account state checked |
| JWT authenticity | `JwtService` signed HS256 tokens | Broken: issuer unchecked; UUID claim extraction requested unsupported UUID conversion | Require issuer; parse string UUID; random `jti` prevents token collisions |
| Access authorization | `JwtAuthenticationFilter` accepted every valid JWT and its embedded role | Critical: refresh tokens accepted as access; stale status/role trusted | Require access type, persisted active session, current active user and client; current DB role; UUID principal |
| Logout | Session deactivation existed but filter never consulted it | Broken: signed access tokens continued working | All access sessions and refresh tokens revoked; checked on subsequent requests |
| Refresh rotation | `AuthService.refreshToken` revoked old rows | Broken: unlocked race, plaintext tokens, no reuse detection, no new session | Pessimistic row lock and version; hash fingerprints; reuse revokes all user sessions; successor access session persisted |
| Expiration | JWT configuration plus hardcoded 1h/7d database times | Broken when configured expiration changed | Persist exact signed token expiration |
| Email OTP | No implementation, mail configuration or tests | Missing / high | SMTP-backed purpose/context-bound OTP challenges, 10-minute expiry, 5 attempts, single use, hashed codes, locked durable consumption |
| Password reset/change | No API or service | Missing / high | Email proof reset and current-password change; strong password confirmation; revoke all sessions |
| Browser token handling | Responses exposed refresh tokens for browser persistence | Partial / high | HttpOnly refresh cookie supported; access token remains memory-only in updated frontend |
| Standards-based external sign-in | Existing proprietary confidential-client JWT API only | Missing | Existing API preserved for trusted backend integrations; OIDC/PKCE authorization server still required before browser-only third-party integrations |
| Session inspection | Existing user session API | Partial: bearer token returned with entity | Token fields excluded from JSON; own-session projection and revoke-all APIs |

## HTTP contract

Follow-up lifecycle correction: blocking/deleting an ordinary user, suspending an administrator, or deactivating a client revokes persisted access and refresh credentials. Reactivating the identity/client does not restore those credentials. Password validation in privileged provisioning now uses the same 72-byte UTF-8 boundary as ordinary password management.

All API authentication failures use a generic 401. Invalid fields/proofs use 400;
authorization failures use 403; throttling uses 429 with retry guidance; unavailable
security/email dependencies use 503. Account and IP limits both apply where relevant.
Passwords require at least 12 characters and no more than 72 UTF-8 bytes because
BCrypt only handles 72 bytes. Password and confirmation must match.

| Method/path | Access | Request | Result |
| --- | --- | --- | --- |
| POST `/api/auth/login` | Public, confidential backend client | `email,password,clientId,clientKey` | Access token, refresh token, user DTO |
| POST `/api/auth/login/admin` | Public | `email,password` | Server-confirmed administrator role, tokens and HttpOnly cookie; SUPER_ADMIN, legacy GUARDIAN_ADMIN and CLIENT_ADMIN supported |
| POST `/api/auth/register/otp` | Public, valid confidential backend client | `email,clientId,clientKey` | `challengeId,message`; verification mail sent |
| POST `/api/auth/register` | Public, valid client plus email proof | Existing fields plus `confirmPassword,challengeId,otp` | USER role only, tokens and user DTO |
| POST `/api/auth/refresh` | Refresh credential | Existing `refreshToken,clientId`, or empty body plus cookie and `X-Refresh-Request: true` | Rotated pair and updated refresh cookie |
| GET `/api/auth/me` | Bearer access token | None | Current safe user DTO and server role |
| POST `/api/auth/logout` | Bearer access token | None | Revoke all user sessions/tokens and clear cookie |
| POST `/api/auth/password/reset/request` | Public | `email` | Neutral `message,challengeId` for all addresses |
| POST `/api/auth/password/reset` | Public plus OTP proof | `email,challengeId,otp,password,confirmPassword` | Reset and revoke sessions |
| POST `/api/auth/password/change` | Bearer plus current password | `currentPassword,password,confirmPassword` | Change and revoke sessions |
| POST `/api/auth/email/change/request` | Bearer plus current password | `email,currentPassword` | OTP sent to new address |
| POST `/api/auth/email/change` | Bearer, current password and OTP | `email,currentPassword,challengeId,otp` | Change email and revoke sessions |
| GET `/api/auth/sessions` | Bearer | None | Own active session metadata, excluding bearer credentials |
| POST `/api/auth/sessions/revoke-all` | Bearer | None | Revoke every session/token; sign in again |

The confidential-client routes must be called by an external application's trusted
backend. Never embed its client secret in a browser, local storage, URL or mobile
bundle. The current platform has one identity per globally unique email, with one
client for ordinary USER identities. Accounts from different clients are not merged.
Multiple user-to-client memberships and OIDC discovery/authorization/token/PKCE/consent
are not implemented and must not be advertised as available.

## Cookie and CSRF policy

The browser administrator frontend holds access tokens in memory and sends them in
the Authorization header. The refresh cookie is HttpOnly, SameSite=Strict, scoped
to `/api/auth`, and Secure by default (`app.security.cookie-secure=true`). Local HTTP
development must explicitly set the secure-cookie property false. Cookie-based
refresh requires the custom `X-Refresh-Request: true` header and approved CORS origin;
cross-origin HTML forms cannot add this header. State-changing protected operations
require a bearer header, so they do not authenticate from cookies. Spring session
creation is disabled. Deployment must use HTTPS and explicit trusted CORS origins.

The console sends `X-Refresh-Request: true` on administrator login to request cookie-only refresh credential delivery. Cookie-based refresh also excludes that credential from the JSON body. Existing confidential integrations supplying an explicit body refresh token continue receiving a rotated body credential. The optional browser header on login preserves existing server/native integration behavior.

## Email proof semantics

`EmailVerificationService.issue(email,purpose,binding)` sends a neutral verification
message and returns a random challenge UUID. `consume(id,email,purpose,binding,code)`
requires every bound value to match. Each challenge expires in 10 minutes and allows
five guesses. Verification uses a database row lock. Attempts and consumption commit
in an independent transaction even when the outer operation fails, preventing retries
from resetting the counter or replaying a consumed code. If provisioning fails after
proof consumption, request a new challenge. No passwords, OTPs or bearer tokens are
written to audit messages.

Password-reset requests deliver the same verification email for unknown addresses,
bound to a random ineligible identity. This keeps response timing and SMTP failure
behavior independent of account existence. Such a proof cannot reset any account.

## Deployment and migration

Configure real SMTP via Spring `spring.mail.*`, `app.mail.from`, a strong injected
JWT signing secret, explicit CORS origins and production Redis rate-limit settings.
No development mail bypass or fixed OTP exists. Failed SMTP delivery reports 503.

Flyway V3 creates `email_challenges`, adds the refresh-token version field, hashes
historic stored token values using PostgreSQL 17 SHA-256, and revokes existing access
sessions and refresh tokens once. This deliberately requires all users to sign in
again at rollout. It preserves user accounts, password hashes, client data and session
history. New database token values are SHA-256 fingerprints of high-entropy JWTs;
verification codes use adaptive BCrypt rather than a fast unsalted digest.

The Maven property `shield.build.directory` defaults to `target`. On an active STS
workspace use `-Dshield.build.directory=target-codex` to avoid the IDE's incremental
compiler overwriting Maven class files during tests.

## Verification

New tests: `JwtServiceTest`, `EmailVerificationServiceTest`, and
`TokenRotationIntegrationTest`. They check issuer, UUID handling, token uniqueness,
expiration/type separation, real mail invocation and hashed OTP persistence,
purpose/email binding, expiry, five-attempt lockout, replay rejection, persisted
rotation sessions, durable reuse revocation and two concurrent refresh attempts.

Initial compile succeeded. The first test launch failed before test discovery because
the IDE concurrently wrote an invalid class to `target/classes`; isolated build output
is used for subsequent runs. Final executed test results are reported in the main
verification report rather than assuming success here.

Manual verification: request an email challenge, use a wrong code five times, verify
that the correct code is then rejected; obtain a new challenge and enroll once; try
reusing it; sign in, refresh once, reuse the old refresh token, and verify all access
tokens are rejected; sign in again, change/reset the password and verify old sessions
fail; block/suspend a user or their external client and verify existing access and
refresh credentials immediately fail. Inspect HTTP cookies and network responses for
HttpOnly/Secure/SameSite and verify no secrets persist in browser storage.
