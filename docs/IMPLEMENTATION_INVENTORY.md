# Shield implementation inventory

Final automated verification completed 2026-10-22: clean backend build with 85 passing tests, PostgreSQL migration tests, frontend build/lint and 12 passing frontend tests. See [VALIDATION.md](VALIDATION.md) for the implemented corrections, actual results and outstanding deployment/browser acceptance. The status tables below record audit-time findings, not unresolved final failures.

## Follow-up audit, 2026-10-21

The repository already contains the hardening described in the historical inventory below. This pass preserves those implementations and checks the remaining behavior. Existing backend working-tree changes predate this pass and are retained.

| Requirement | Current files / evidence | Audited status | Priority / correction |
|---|---|---|---|
| Durable suspension | UserService.blockUser, ClientService.deactivateClient, AdminService.changeStatus | Broken: persisted refresh credentials could survive suspension and work after reactivation | Critical: revoke access and refresh credentials transactionally; lifecycle regression tests |
| Privileged password policy | AdminService.checkPassword compared Java character count; BCrypt supports 72 UTF-8 bytes | Broken for multibyte input | High: reuse shared byte-aware validation before OTP consumption |
| Invitation administration | Create/verify/confirm/accept/revoke endpoints exist; no pending invitation list | Partial: invitation state cannot be recovered in console | High: bounded authorized status list, safe response projection, frontend workflow |
| Bootstrap and invitation concurrency | Pessimistic singleton/invitation row locks; mock provisioning unit tests | Implemented, insufficient concurrency evidence | High: real JPA concurrent bootstrap and acceptance tests |
| Local rate-limit outage mode | RateLimitService.getFailedLoginAttempts returns zero outside Redis | Broken: failed-login account/IP safeguards incomplete in explicit local mode | High: bounded local counters and fallback tests |
| Browser throttling response | RateLimitFilter precedes CORS processing | Broken: browser cannot read 429/503 on allowed cross-origin deployments | High: security-chain filter order and HTTP regression |
| Secret injection | application.yaml contains database password fallback | Broken | Critical: require injected DB_PASSWORD, retain placeholder-only env example |
| Frontend build and controls | Strict TypeScript fails; components/index exports null controls; client search/delete defective | Broken | High: repair shared types and real controls without relaxing compiler settings |
| User deletion | frontend delete thunk calls absent API method/endpoint | Missing | High: scoped soft deletion, durable credential revocation and audit |
| OIDC and multiple memberships | Custom JWT integrations; one client per USER, globally unique email | Missing / documented architecture limit | Retain honest integration plan; no invented protocol or accidental account merge |

Executed checks and unresolved limitations for this pass are recorded in VALIDATION.md when verification finishes.

Audit captured 2026-10-19 before implementation. This is an existing Spring Boot 3.5.8 / Java 21 / PostgreSQL / Redis application and React 19 / TypeScript / Vite / Redux / Tailwind frontend. Backend has pre-existing uncommitted changes; these are preserved. No repository-level AGENTS.md was present. Backend and frontend are separate directories; only backend contains a Git repository.

| Requirement | Existing evidence/files | Initial status | Priority and implementation |
|---|---|---|---|
| Registration/login/password hashing | AuthService, UserService, AuthController; BCrypt | Partial | Critical: email verification, generic failures, active account and client checks |
| Privileged provisioning | AdminController /api/admin/register public, AdminService | Broken | Critical: operator secret, transactional singleton bootstrap state, OTP, invitations |
| Roles and tenant isolation | UserRole GUARDIAN_ADMIN/CLIENT_ADMIN/USER; broad admin URL rule | Broken | Critical: SUPER_ADMIN alias preserving legacy records, persisted ownership and service scope |
| Client credentials | Client.clientKey encrypted; ClientService and frontend credentials views | Broken | Critical: one-way verifier, one-time provisioning, rotate, no routine retrieval |
| OTP/reset/email change | No implementation | Missing | High: short-lived attempt-limited single-use challenges, secure reset; document remaining email-change workflow |
| JWT/session/logout | JwtService, JwtAuthenticationFilter, RefreshToken, UserSession | Broken | Critical: token types, issuer, current identity/status, hashed tokens, rotation/replay revocation |
| Location tracking | IpUtil accepts arbitrary proxy headers; GeoIpService MaxMind database | Broken | High: literal IP validation, explicit proxy trust, reserved IPs, graceful unavailable database, reader cleanup |
| Rate limiting | RateLimitService local Bucket4j, Redis failure counters | Partial | High: atomic shared Redis windows, retained Bucket4j explicit single-instance mode/fallback, bounded memory, all write/auth endpoints |
| Audit history | AuditLog entity, AuditService, AuditController | Partial | High: preserve events, redact sensitive details, scope access, publish after commit, retention |
| Live updates | WebSocketConfig allows all origins, anonymous STOMP broadcasts | Broken | Critical: authenticate STOMP, global streams SUPER_ADMIN only, validate every outbound delivery |
| Health/metrics | ActuatorConfig, HealthController; mock fallback metrics | Broken | High: protect diagnostics, real measurements only, sanitized health, dependency state |
| Persistence | Hibernate ddl-auto update, no migrations | Partial | High: baseline schema and additive migrations; disposable DB verification; no production reset |
| Dashboard/search/notifications | Existing controllers and Redux feature pages | Partial | High: scope backend reads and remove fabricated values |
| UI/navigation | React Router, Redux, Tailwind; dashboard/auth/users/clients/audit/health/settings | Partial | Medium: audit route delays, requested palette, responsive accessible role-specific pages |
| Deployment | docker-compose.yml only app, ignored application.yaml, debug logging | Partial | High: committed safe defaults, env example, SMTP/Redis/DB instructions, readiness and migration runbook |
| OAuth/OIDC | Custom JWT endpoints only | Missing | High: document established provider integration plan; do not claim protocol compliance |
| Automated tests | Single environment-dependent contextLoads | Broken baseline | High: meaningful security tests and disposable database tests; baseline mvn test failed creating test class |

Detailed subsystem inventories and final validation are recorded in AUTHENTICATION.md, PLATFORM.md, FRONTEND.md, and VALIDATION.md. Initial statuses above are historical evidence, not completion claims.

No production database has been changed by this audit. Deployment requires explicit database backup, migration rehearsal, credentials, and SMTP configuration.
