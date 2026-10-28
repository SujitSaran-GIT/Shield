# Shield Auth Platform - End-to-End Application Endpoint Testing Guide

## Overview

This document provides a comprehensive end-to-end (E2E) endpoint testing guide for the Shield Auth Platform — a centralized authentication and identity management platform built with Spring Boot 3.5.8, Java 21, PostgreSQL, Redis, and a React 19/TypeScript frontend.

**Important:** This document is for testing documentation only. No backend Guardian codebase files were modified or changed to create this guide.

## Table of Contents

1. Test Environment & Prerequisites
2. Base URLs & Ports
3. Test Data & Credentials
4. Test Execution Order
5. Phase 1: Platform Bootstrap & First Admin Provisioning
6. Phase 2: Client Registration & Management
7. Phase 3: User Authentication (Register/Login/Logout/Refresh)
8. Phase 4: Password & Email Management
9. Phase 5: User Management & Lifecycle
10. Phase 6: Administrator Provisioning (Invitations)
11. Phase 7: Audit Logging & Monitoring
12. Phase 8: Dashboard & Health
13. Phase 9: Notifications
14. Phase 10: Search & Global Search
15. Phase 11: User Activity & Sessions
16. Phase 12: Actuator Endpoints
17. Error Response Reference
18. Rate Limiting Reference
19. Security Headers & CORS
20. Postman Collection Variables
21. E2E Test Checklist
22. Running Backend Tests
23. Running Frontend Tests
24. Notes & Limitations
25. Document Metadata

## Test Environment & Prerequisites

### Required Services

| Service | Port | Purpose |
|---------|------|---------|
| Guardian Backend (Spring Boot) | 6061 | Main REST API |
| PostgreSQL | 5432 | Application database |
| Redis | 6379 | Rate limiting, sessions |
| SMTP Mail Server | 25/587 | Email OTP, invitations, password reset |
| Frontend (React/Vite) | 5173 | Web console (optional for E2E API testing) |

### Pre-conditions Before Testing

1. Database: PostgreSQL must be running with the Guardian schema migrated (Flyway V1, V2, V3).
2. Redis: Running and accessible (or configured for local Bucket4j mode).
3. SMTP: Configured for email-based OTP, invitations, and password reset flows.
4. GeoIP: Optional. Missing GeoIP does not block authentication; location is reported as Unknown.
5. Environment Variables: DB_PASSWORD, JWT_SECRET (32+ bytes), APP_BOOTSTRAP_SECRET, SMTP settings, CORS origins must be injected.

### Base URL

```
http://localhost:6061
```

For production, replace with https://<your-domain>:6061 or the reverse-proxy origin.

## Base URLs & Ports

| Component | Base URL | Notes |
|-----------|----------|-------|
| Auth API | http://localhost:6061/api/auth | Registration, login, refresh, logout, password/email flows |
| Admin API | http://localhost:6061/api/admin | Bootstrap, invitations, administrator lifecycle |
| Client API | http://localhost:6061/api/admin/clients | Client registration and management |
| Audit API | http://localhost:6061/api/audits or /api/admin/audits | Audit logs, KPIs, recent events |
| User API | http://localhost:6061/api/users | User directory, search, block/unblock, delete |
| Dashboard API | http://localhost:6061/api/dashboard | Metrics, activity, client distribution |
| Health API | http://localhost:6061/api/health | Health metrics, status, system metrics |
| Notification API | http://localhost:6061/api/notifications | User notifications (authenticated) |
| Search API | http://localhost:6061/api/search | Global, user, client search |
| Actuator | http://localhost:6061/actuator | Spring Boot Actuator endpoints |

## Test Data & Credentials

### Recommended Test Accounts

| Role | Username | Email | Password | Purpose |
|------|----------|-------|----------|---------|
| SUPER_ADMIN | super_admin | super@example.com | SecurePass123! | Platform-level operations |
| CLIENT_ADMIN A | client_admin_a | admin-a@example.com | SecurePass123! | Tenant A operations |
| CLIENT_ADMIN B | client_admin_b | admin-b@example.com | SecurePass123! | Tenant B operations (isolation testing) |
| USER A | user_a | user-a@example.com | SecurePass123! | Ordinary user in Tenant A |
| USER B | user_b | user-b@example.com | SecurePass123! | Ordinary user in Tenant B |

### Test Clients

| Client Name | Purpose |
|-------------|---------|
| Test Client A | Primary application client for USER A |
| Test Client B | Secondary application client for USER B |

**Password Policy:** Minimum 12 characters, maximum 72 UTF-8 bytes. Password and confirmation must match.

## Test Execution Order

Tests must be executed in order because each phase depends on outputs from previous phases:

1. Phase 1 — Bootstrap the first SUPER_ADMIN (operator secret + email OTP)
2. Phase 2 — Register clients
3. Phase 3 — Register and authenticate users (login, refresh, logout)
4. Phase 4 — Password reset, password change, email change
5. Phase 5 — User lifecycle (block, unblock, delete, sessions)
6. Phase 6 — Administrator invitations and lifecycle
7. Phase 7 — Audit logging verification across all operations
8. Phase 8 — Dashboard metrics and health checks
9. Phase 9 — Notification flows
10. Phase 10 — Search functionality
11. Phase 11 — User activity and session inspection
12. Phase 12 — Actuator endpoints

---

## Phase 1: Platform Bootstrap & First Admin Provisioning

Bootstrap is disabled by default (APP_BOOTSTRAP_SECRET is blank → fails closed). A separate random APP_BOOTSTRAP_SECRET must be injected via environment.

### 1.1 Request Bootstrap Challenge

Endpoint: POST /api/admin/bootstrap/request

Headers:
Content-Type: application/json
X-Bootstrap-Secret: <APP_BOOTSTRAP_SECRET>

Request Body:
{
  "email": "super@example.com"
}

Expected Response (200 OK):
{
  "challengeId": "uuid-challenge-id"
}

Negative Test: Wrong X-Bootstrap-Secret → 403 Forbidden (no email sent).

### 1.2 Complete Bootstrap

Endpoint: POST /api/admin/bootstrap/complete

Headers:
Content-Type: application/json
X-Bootstrap-Secret: <APP_BOOTSTRAP_SECRET>

Request Body:
{
  "email": "super@example.com",
  "username": "super_admin",
  "password": "SecurePass123!",
  "confirmPassword": "SecurePass123!",
  "challengeId": "<challengeId from 1.1>",
  "code": "<OTP from email>"
}

Expected Response (200 OK): UserDTO with SUPER_ADMIN role.

Negative Tests:
- Wrong OTP code (5 attempts) → challenge locked, 400 Bad Request
- Replay of consumed code → 400 Bad Request
- Expired challenge (10 min) → 400 Bad Request

### 1.3 Verify Bootstrap is Closed

After successful bootstrap, retry POST /api/admin/bootstrap/request with the same secret. Remove APP_BOOTSTRAP_SECRET from deployment after setup.

---

## Phase 2: Client Registration & Management

Clients represent applications (tenants). A client must exist before users can register under it.

### 2.1 Register a Client (Authenticated, SUPER_ADMIN/GUARDIAN_ADMIN/CLIENT_ADMIN)

Endpoint: POST /api/admin/clients

Headers:
Content-Type: application/json
Authorization: Bearer <SUPER_ADMIN_ACCESS_TOKEN>

Request Body:
{
  "email": "client-a@example.com",
  "name": "Test Client A",
  "description": "Primary application client for E2E testing",
  "allowedOrigins": ["http://localhost:3000", "http://localhost:5173"],
  "idleTimeout": 3600
}

Expected Response (201 Created):
{
  "clientId": "generated-client-id-uuid",
  "clientKey": "generated-client-key-plaintext-shown-once",
  "message": "Store these credentials securely. The client key cannot be retrieved again."
}

CRITICAL: clientKey is shown only once. Save it immediately. It cannot be retrieved again.

Negative Tests:
- Missing Authorization header → 401 Unauthorized
- USER role token → 403 Forbidden
- Invalid email format → 400 Bad Request
- Empty allowedOrigins → 400 Bad Request

### 2.2 List All Clients

Endpoint: GET /api/admin/clients?page=0&size=10&sortBy=createdAt&sortDir=DESC

Headers:
Authorization: Bearer <SUPER_ADMIN_ACCESS_TOKEN>

Expected Response (200 OK): Paged list of ClientDTO objects.

### 2.3 Get Client by ID

Endpoint: GET /api/admin/clients/{clientId}

Headers:
Authorization: Bearer <SUPER_ADMIN_ACCESS_TOKEN>

Expected Response (200 OK): ClientDTO with userCount.

### 2.4 Update Client

Endpoint: PUT /api/admin/clients/{clientId}

Headers:
Content-Type: application/json
Authorization: Bearer <SUPER_ADMIN_ACCESS_TOKEN>

Request Body:
{
  "name": "Test Client A Updated",
  "description": "Updated description",
  "allowedOrigins": ["http://localhost:3000"],
  "idleTimeout": 7200
}

Expected Response (200 OK): Updated ClientDTO.

### 2.5 Deactivate / Activate Client

Deactivate:
PUT /api/admin/clients/{clientId}/deactivate
Authorization: Bearer <SUPER_ADMIN_ACCESS_TOKEN>
Expected: {"message": "Client deactivated successfully"}

Activate:
PUT /api/admin/clients/{clientId}/activate
Authorization: Bearer <SUPER_ADMIN_ACCESS_TOKEN>
Expected: {"message": "Client activated successfully"}

Security Test: After deactivation, existing client credentials must fail for authentication. Reactivation does NOT restore revoked credentials.

### 2.6 Rotate Client Secret

Endpoint: POST /api/admin/clients/{clientId}/rotate-secret

Headers:
Authorization: Bearer <SUPER_ADMIN_ACCESS_TOKEN>

Expected Response (200 OK):
{
  "clientId": "existing-client-id",
  "clientKey": "new-client-key-plaintext",
  "message": "Previous credential revoked. Store the new secret securely."
}

Security Test: Old client key must fail authentication after rotation.

### 2.7 Public Client Registration (CLIENT_ADMIN only, if enabled)

Endpoint: POST /api/admin/clients/public-register

Headers:
Content-Type: application/json
Authorization: Bearer <CLIENT_ADMIN_ACCESS_TOKEN>

Request Body: Same as 2.1 but without email field (uses PublicClientRegistrationRequest).

Disabled by default. Enable via APP_CLIENT_ADMIN_PUBLIC_ENABLED=true.

---

## Phase 3: User Authentication (Register/Login/Logout/Refresh)

### 3.1 Request Registration OTP (Email Verification)

Endpoint: POST /api/auth/register/otp

Headers:
Content-Type: application/json

Request Body:
{
  "email": "user-a@example.com",
  "clientId": "<client-id-from-phase-2>",
  "clientKey": "<client-key-from-phase-2>"
}

Expected Response (200 OK):
{
  "challengeId": "uuid-challenge-id",
  "message": "Verification email sent"
}

The OTP is delivered via SMTP and is never returned by the API. Check the mail server or test mail capture.

### 3.2 Register a User

Endpoint: POST /api/auth/register

Headers:
Content-Type: application/json

Request Body:
{
  "username": "user_a",
  "email": "user-a@example.com",
  "password": "SecurePass123!",
  "confirmPassword": "SecurePass123!",
  "clientId": "<client-id-from-phase-2>",
  "clientKey": "<client-key-from-phase-2>",
  "challengeId": "<challengeId-from-3.1>",
  "otp": "<OTP-from-email>"
}

Expected Response (201 Created):
{
  "accessToken": "jwt-access-token",
  "refreshToken": "jwt-refresh-token",
  "user": {
    "id": "user-id-uuid",
    "username": "user_a",
    "email": "user-a@example.com",
    "roles": ["USER"],
    "isBlocked": false,
    "createdAt": "2025-01-01T00:00:00",
    "lastLoginAt": "2025-01-01T00:00:00"
  }
}

Negative Tests:
- Wrong OTP → 400 Bad Request
- Expired OTP challenge → 400 Bad Request
- Password < 12 chars → 400 Bad Request
- Password > 72 UTF-8 bytes → 400 Bad Request
- Password != confirmPassword → 400 Bad Request
- Invalid clientId/clientKey → 400 Bad Request
- Duplicate email → 400 Bad Request

### 3.3 Login

Endpoint: POST /api/auth/login

Headers:
Content-Type: application/json

Request Body:
{
  "email": "user-a@example.com",
  "password": "SecurePass123!",
  "clientId": "<client-id-from-phase-2>",
  "clientKey": "<client-key-from-phase-2>"
}

Expected Response (200 OK): Same structure as registration response with accessToken, refreshToken, user.

Browser/Admin Login with Cookie Refresh:

Endpoint: POST /api/auth/login/admin

Headers:
Content-Type: application/json
X-Refresh-Request: true

Request Body:
{
  "email": "super@example.com",
  "password": "SecurePass123!",
  "clientId": "<client-id>",
  "clientKey": "<client-key>"
}

Expected Response: Access token in JSON body; refresh token delivered as HttpOnly shield_refresh cookie (not in JSON body).

Negative Tests:
- Wrong password → 401 Unauthorized (generic message, no account enumeration)
- Non-existent email → 401 Unauthorized (same generic message)
- Account blocked → 401 Unauthorized
- Client deactivated → 401 Unauthorized

### 3.4 Refresh Access Token

Endpoint: POST /api/auth/refresh

Headers:
Content-Type: application/json
X-Refresh-Request: true (optional, for cookie-based refresh)

Cookie: shield_refresh=<refresh-token> (HttpOnly, Secure, SameSite=Strict)

Expected Response (200 OK):
{
  "accessToken": "new-jwt-access-token",
  "refreshToken": "new-jwt-refresh-token-or-null-if-cookie-mode",
  "user": { ... }
}

Security Tests:
- Reuse old refresh token after rotation → all sessions revoked, 401 Unauthorized
- Missing refresh cookie → 401 Unauthorized
- Tampered refresh token → 401 Unauthorized

### 3.5 Logout

Endpoint: POST /api/auth/logout

Headers:
Authorization: Bearer <ACCESS_TOKEN>
Cookie: shield_refresh=<refresh-token>

Expected Response (200 OK): {"message": "Logged out successfully"}

Security Test: After logout, the access token and refresh token must both be rejected on subsequent requests.

---

## Phase 4: Password & Email Management

### 4.1 Request Password Reset

Endpoint: POST /api/auth/password/reset/request

Headers:
Content-Type: application/json

Request Body:
{
  "email": "user-a@example.com"
}

Expected Response (200 OK): {"message": "Password reset instructions sent if email exists"}

Same response whether email exists or not (prevents account enumeration). Check SMTP for the OTP.

### 4.2 Complete Password Reset

Endpoint: POST /api/auth/password/reset

Headers:
Content-Type: application/json

Request Body:
{
  "email": "user-a@example.com",
  "challengeId": "<uuid-from-email-challenge>",
  "otp": "<OTP-from-email>",
  "password": "NewSecurePass123!",
  "confirmPassword": "NewSecurePass123!"
}

Expected Response (200 OK): {"message": "Password reset completed. Sign in again."}

Security Test: After reset, old password must fail login; all existing sessions/tokens revoked.

### 4.3 Change Password (Authenticated)

Endpoint: POST /api/auth/password/change

Headers:
Content-Type: application/json
Authorization: Bearer <ACCESS_TOKEN>

Request Body:
{
  "currentPassword": "SecurePass123!",
  "password": "NewSecurePass123!",
  "confirmPassword": "NewSecurePass123!"
}

Expected Response (200 OK): {"message": "Password changed. Sign in again."}

Negative Tests:
- Wrong currentPassword → 400 Bad Request
- Missing Authorization header → 401 Unauthorized

### 4.4 Request Email Change (Authenticated)

Endpoint: POST /api/auth/email/change/request

Headers:
Content-Type: application/json
Authorization: Bearer <ACCESS_TOKEN>

Request Body:
{
  "email": "new-email@example.com",
  "currentPassword": "SecurePass123!"
}

Expected Response (200 OK):
{
  "challengeId": "uuid-challenge-id",
  "message": "Verification email sent"
}

### 4.5 Complete Email Change (Authenticated)

Endpoint: POST /api/auth/email/change

Headers:
Content-Type: application/json
Authorization: Bearer <ACCESS_TOKEN>

Request Body:
{
  "email": "new-email@example.com",
  "currentPassword": "SecurePass123!",
  "challengeId": "<uuid-from-request>",
  "otp": "<OTP-from-email>"
}

Expected Response (200 OK): {"message": "Email changed. Sign in again."}

---

## Phase 5: User Management & Lifecycle

Requires CLIENT_ADMIN (owner of the user's client) or SUPER_ADMIN/GUARDIAN_ADMIN.

### 5.1 List All Users

Endpoint: GET /api/users?page=0&size=10&sortBy=createdAt&sortDir=DESC&query=&status=&role=&clientName=

Headers:
Authorization: Bearer <CLIENT_ADMIN_OR_SUPER_ADMIN_ACCESS_TOKEN>

Expected Response (200 OK): Paged list of UserDTO objects.

Query Parameters:
| Parameter | Type | Description |
|-----------|------|-------------|
| page | int | Page number (default: 0) |
| size | int | Page size 1-100 (default: 10) |
| sortBy | string | Sort field (default: createdAt) |
| sortDir | string | ASC or DESC (default: DESC) |
| query | string | Search filter |
| status | UserStatus | Filter by account status |
| role | UserRole | Filter by role |
| clientName | string | Filter by client name |

### 5.2 Search Users

Endpoint: GET /api/users/search?query=<text>&page=0&size=10

Headers:
Authorization: Bearer <CLIENT_ADMIN_OR_SUPER_ADMIN_ACCESS_TOKEN>

### 5.3 Get User by ID

Endpoint: GET /api/users/{userId}

Headers:
Authorization: Bearer <CLIENT_ADMIN_OR_SUPER_ADMIN_ACCESS_TOKEN>

Expected Response (200 OK): UserDTO.

### 5.4 Get User Sessions

Endpoint: GET /api/users/{userId}/sessions

Headers:
Authorization: Bearer <CLIENT_ADMIN_OR_SUPER_ADMIN_ACCESS_TOKEN>

Expected Response (200 OK): List of UserSession objects with id, ipAddress, location, userAgent, createdAt, expiresAt.

### 5.5 Block User

Endpoint: PUT /api/users/{userId}/block

Headers:
Authorization: Bearer <CLIENT_ADMIN_ACCESS_TOKEN>

Expected Response (200 OK): {"message": "User blocked successfully"}

Security Test: After blocking, user's access and refresh tokens must be rejected.

### 5.6 Unblock User

Endpoint: PUT /api/users/{userId}/unblock

Headers:
Authorization: Bearer <CLIENT_ADMIN_ACCESS_TOKEN>

Expected Response (200 OK): {"message": "User unblocked successfully"}

Reactivation does NOT restore previously revoked credentials. User must sign in again.

### 5.7 Delete User (Soft Delete)

Endpoint: DELETE /api/users/{userId}

Headers:
Authorization: Bearer <CLIENT_ADMIN_ACCESS_TOKEN>

Expected Response (200 OK): {"message": "User deleted successfully"}

Soft deletion preserves the database row and history. Revokes sessions and tokens.

### 5.8 Cross-Tenant Isolation Test

As CLIENT_ADMIN A, attempt operations against USER B (belongs to Client B):
- GET /api/users/{userB-id} → 403 Forbidden
- PUT /api/users/{userB-id}/block → 403 Forbidden
- DELETE /api/users/{userB-id} → 403 Forbidden

---

## Phase 6: Administrator Provisioning (Invitations)

### 6.1 Create Invitation (SUPER_ADMIN / GUARDIAN_ADMIN)

Endpoint: POST /api/admin/invitations

Headers:
Content-Type: application/json
Authorization: Bearer <SUPER_ADMIN_ACCESS_TOKEN>

Request Body:
{
  "email": "new-admin@example.com"
}

Expected Response (200 OK):
{
  "id": "invitation-uuid",
  "email": "new-admin@example.com",
  "challengeId": "uuid-challenge-id",
  "expiresAt": "2025-01-01T00:00:00"
}

### 6.2 List Invitations

Endpoint: GET /api/admin/invitations?page=0&size=20

Headers:
Authorization: Bearer <SUPER_ADMIN_ACCESS_TOKEN>

Expected Response (200 OK): Paged InvitationStatus list (excludes OTPs and enrollment tokens).

### 6.3 Verify Invitation (Recipient proves email control)

Endpoint: POST /api/admin/invitations/{invitationId}/verify

Headers:
Content-Type: application/json

Request Body:
{
  "code": "<OTP-from-email>"
}

Expected Response (200 OK):
{
  "enrollmentToken": "temporary-enrollment-token"
}

PermitAll endpoint — no authentication required.

### 6.4 Confirm Invitation (Inviter confirms)

Endpoint: PUT /api/admin/invitations/{invitationId}/confirm

Headers:
Authorization: Bearer <SUPER_ADMIN_ACCESS_TOKEN>

Expected Response (200 OK): {"message": "Invitation confirmed"}

### 6.5 Accept Invitation (Recipient sets own credentials)

Endpoint: POST /api/admin/invitations/{invitationId}/accept

Headers:
Content-Type: application/json

Request Body:
{
  "username": "new-admin",
  "password": "SecurePass123!",
  "confirmPassword": "SecurePass123!",
  "enrollmentToken": "<token-from-6.3>"
}

Expected Response (200 OK): UserDTO with the assigned admin role.

### 6.6 Revoke Invitation

Endpoint: DELETE /api/admin/invitations/{invitationId}

Headers:
Authorization: Bearer <SUPER_ADMIN_ACCESS_TOKEN>

Expected Response (200 OK): {"message": "Invitation revoked"}

### 6.7 Administrator Lifecycle

Get Admin:
GET /api/admin/admins/{adminId}
Authorization: Bearer <SUPER_ADMIN_ACCESS_TOKEN>

Update Role:
PUT /api/admin/admins/{adminId}/role
Authorization: Bearer <SUPER_ADMIN_ACCESS_TOKEN>
Content-Type: application/json

{"newAdminRole": "SUPER_ADMIN"}
Note: AdminService.updateAdminRole rejects role changes in the current implementation. Expect 400 or error.

Deactivate Admin:
PUT /api/admin/admins/{adminId}/deactivate
Authorization: Bearer <SUPER_ADMIN_ACCESS_TOKEN>

Activate Admin:
PUT /api/admin/admins/{adminId}/activate
Authorization: Bearer <SUPER_ADMIN_ACCESS_TOKEN>

Update Username (Authenticated):
PUT /api/admin/profile/username
Authorization: Bearer <ACCESS_TOKEN>
Content-Type: application/json

{"username": "new-username"}

Negative Tests:
- Ordinary USER token on admin endpoints → 403 Forbidden
- Self-deactivation → 403 Forbidden (current actor cannot deactivate themselves)

---

## Phase 7: Audit Logging & Monitoring

Audit endpoints available at both /api/audits and /api/admin/audits.

### 7.1 List All Audits

Endpoint: GET /api/audits?page=0&size=20&sortBy=createdAt&sortDir=DESC

Headers:
Authorization: Bearer <CLIENT_ADMIN_OR_SUPER_ADMIN_ACCESS_TOKEN>

Expected Response (200 OK): Paged AuditDTO list.

### 7.2 Get Audit Details by ID

Endpoint: GET /api/audits/{auditId}

Headers:
Authorization: Bearer <CLIENT_ADMIN_OR_SUPER_ADMIN_ACCESS_TOKEN>

Expected Response (200 OK): AuditDTO with event details.

### 7.3 Filter Audits

Endpoint: GET /api/audits/filter?clientId=<uuid>&eventType=LOGIN_SUCCESS&ipAddress=127.0.0.1&startDate=2025-01-01T00:00:00&endDate=2025-12-31T23:59:59&page=0&size=20

Headers:
Authorization: Bearer <CLIENT_ADMIN_OR_SUPER_ADMIN_ACCESS_TOKEN>

Query Parameters:
| Parameter | Type | Description |
|-----------|------|-------------|
| clientId | string | Filter by client ID |
| eventType | string | LOGIN_SUCCESS, LOGIN_FAILED, LOGOUT, etc. |
| ipAddress | string | Filter by IP address |
| startDate | datetime | ISO format (default: 30 days ago) |
| endDate | datetime | ISO format (default: now) |
| page | int | Page number (default: 0) |
| size | int | Page size (default: 20) |
| sortBy | string | Sort field |
| sortDir | string | ASC or DESC |

### 7.4 Get Audit KPIs

Endpoint: GET /api/audits/kpis

Headers:
Authorization: Bearer <CLIENT_ADMIN_OR_SUPER_ADMIN_ACCESS_TOKEN>

Expected Response (200 OK):
{
  "totalEvents": 100,
  "eventsLast24Hours": 10,
  "eventsByType": {
    "LOGIN_SUCCESS": 50,
    "LOGIN_FAILED": 20,
    "LOGOUT": 30
  },
  "topIpAddresses": [
    {
      "ipAddress": "127.0.0.1",
      "count": 25
    }
  ]
}

### 7.5 Get Recent Logs

Endpoint: GET /api/audits/recent?days=7

Headers:
Authorization: Bearer <CLIENT_ADMIN_OR_SUPER_ADMIN_ACCESS_TOKEN>

Expected Response (200 OK): List of recent AuditDTO (max 500 records).

Audit Security Test: As CLIENT_ADMIN A, attempt to access audit detail for an event belonging to Client B → 403 Forbidden (scope enforcement).

---

## Phase 8: Dashboard & Health

### 8.1 Dashboard Metrics

Endpoint: GET /api/dashboard/metrics

Headers:
Authorization: Bearer <CLIENT_ADMIN_OR_SUPER_ADMIN_ACCESS_TOKEN>

Expected Response (200 OK): DashboardMetricsDTO with tenant-scoped counts.

### 8.2 Dashboard Activity Data

Endpoint: GET /api/dashboard/activity?days=7

Headers:
Authorization: Bearer <CLIENT_ADMIN_OR_SUPER_ADMIN_ACCESS_TOKEN>

Expected Response (200 OK): ActivityDataDTO.

### 8.3 Client Distribution

Endpoint: GET /api/dashboard/clients/distribution

Headers:
Authorization: Bearer <CLIENT_ADMIN_OR_SUPER_ADMIN_ACCESS_TOKEN>

Expected Response (200 OK): ClientDistributionDTO.

### 8.4 Health Metrics

Endpoint: GET /api/health/metrics

Headers:
Authorization: Bearer <SUPER_ADMIN_ACCESS_TOKEN>

Expected Response (200 OK): HealthMetricsDTO with uptime, user/session/client counts, memory, CPU, database/Redis connections.

### 8.5 System Metrics

Endpoint: GET /api/health/system-metrics

Headers:
Authorization: Bearer <SUPER_ADMIN_ACCESS_TOKEN>

Expected Response (200 OK): Map of Micrometer metric readings.

### 8.6 Health Status

Endpoint: GET /api/health/status

Headers:
Authorization: Bearer <SUPER_ADMIN_ACCESS_TOKEN>

Expected Response (200 OK):
{
  "status": "OK",
  "message": "Guardian Auth Platform is running"
}

Non-200 (503) indicates a dependency is unavailable.

---

## Phase 9: Notifications

All notification endpoints require authentication (isAuthenticated()).

### 9.1 Get User Notifications

Endpoint: GET /api/notifications?page=0&size=20

Headers:
Authorization: Bearer <ACCESS_TOKEN>

Expected Response (200 OK): Paged NotificationDTO list.

### 9.2 Get Unread Notifications

Endpoint: GET /api/notifications/unread

Headers:
Authorization: Bearer <ACCESS_TOKEN>

### 9.3 Get Unread Count

Endpoint: GET /api/notifications/unread/count

Headers:
Authorization: Bearer <ACCESS_TOKEN>

Expected Response (200 OK): {"count": 5}

### 9.4 Mark Notification as Read

Endpoint: PUT /api/notifications/{notificationId}/read

Headers:
Authorization: Bearer <ACCESS_TOKEN>

Expected Response (200 OK): {"message": "Notification marked as read"}

### 9.5 Mark All as Read

Endpoint: PUT /api/notifications/mark-all-read

Headers:
Authorization: Bearer <ACCESS_TOKEN>

Expected Response (200 OK): {"message": "All notifications marked as read"}

### 9.6 Delete Notification

Endpoint: DELETE /api/notifications/{notificationId}

Headers:
Authorization: Bearer <ACCESS_TOKEN>

Expected Response (200 OK): {"message": "Notification deleted successfully"}

### 9.7 Get Recent Notifications

Endpoint: GET /api/notifications/recent?days=7

Headers:
Authorization: Bearer <ACCESS_TOKEN>

---

## Phase 10: Search & Global Search

### 10.1 Global Search (Users + Clients)

Endpoint: GET /api/search/global?query=<text>&page=0&size=10

Headers:
Authorization: Bearer <CLIENT_ADMIN_OR_SUPER_ADMIN_ACCESS_TOKEN>

Expected Response (200 OK):
{
  "users": { ...paged UserDTO... },
  "clients": [ ...client list... ],
  "query": "<search-text>",
  "totalResults": 42
}

### 10.2 Search Users Only

Endpoint: GET /api/search/users?query=<text>&page=0&size=10

Headers:
Authorization: Bearer <CLIENT_ADMIN_OR_SUPER_ADMIN_ACCESS_TOKEN>

### 10.3 Search Clients Only

Endpoint: GET /api/search/clients?query=<text>&limit=10

Headers:
Authorization: Bearer <CLIENT_ADMIN_OR_SUPER_ADMIN_ACCESS_TOKEN>

---

## Phase 11: User Activity & Sessions

### 11.1 Get User Activity (Audit History for a User)

Endpoint: GET /api/users/{userId}/activity?page=0&size=20

Headers:
Authorization: Bearer <CLIENT_ADMIN_OR_SUPER_ADMIN_ACCESS_TOKEN>

Expected Response (200 OK): Paged AuditDTO list for the specified user.

Security Test: CLIENT_ADMIN A accessing activity of USER B (different client) → 403 Forbidden.

---

## Phase 12: Actuator Endpoints

Spring Boot Actuator endpoints are available at /actuator/*.

### Public Endpoints (no auth required)

| Endpoint | Method | Description |
|----------|--------|-------------|
| /actuator/health | GET | Basic health status |
| /actuator/health/liveness | GET | Liveness probe |
| /actuator/health/readiness | GET | Readiness probe |

### Protected Endpoints (SUPER_ADMIN required)

| Endpoint | Method | Description |
|----------|--------|-------------|
| /actuator/metrics | GET | Application metrics |
| /actuator/prometheus | GET | Prometheus-format metrics |
| /actuator/** | GET | Other actuator endpoints |

Example:
GET /actuator/health

Expected (200 OK):
{
  "status": "UP",
  "components": { ... }
}

Security Test: Ordinary USER token on /actuator/metrics → 403 Forbidden.

---

## Error Response Reference

### Standard Error Format

{
  "timestamp": "2025-01-01T00:00:00",
  "status": 400,
  "error": "Bad Request",
  "message": "Validation failed",
  "path": "/api/auth/register"
}

### HTTP Status Codes

| Code | Meaning | Typical Causes |
|------|---------|----------------|
| 200 | OK | Successful request |
| 201 | Created | Resource created (registration) |
| 400 | Bad Request | Validation error, invalid input, wrong OTP |
| 401 | Unauthorized | Missing/invalid token, wrong credentials, generic auth failure |
| 403 | Forbidden | Insufficient role/authority, cross-tenant access, self-deactivation |
| 404 | Not Found | Resource not found (user, client, audit, invitation) |
| 429 | Too Many Requests | Rate limit exceeded |
| 503 | Service Unavailable | Dependency down (Redis, SMTP), missing metrics |

### Rate Limit Headers

HTTP 429 Too Many Requests
X-Rate-Limit-Remaining: 0
X-Rate-Limit-Retry-After: 1800

## Rate Limiting Reference

| Operation | Limit | Window | Retry After |
|-----------|-------|--------|-------------|
| Login | 5 attempts | 5 minutes | 30 minutes |
| Registration | 5 successful | 1 minute | 15 minutes |
| OTP verification | 5 attempts | 10 minutes | Challenge locked |
| General auth/write | Configurable | Configurable | Via Retry-After header |

Redis outage: RATE_LIMIT_MODE=local uses Bucket4j (single-instance). RATE_LIMIT_OUTAGE_POLICY=fail-closed returns 503 when Redis is down.

## Security Headers & CORS

### CORS Configuration

| Setting | Value |
|---------|-------|
| Allowed Origins | Configured via cors.allowed-origins (comma-separated) |
| Allowed Methods | GET, POST, PUT, PATCH, DELETE, OPTIONS |
| Allowed Headers | Authorization, Content-Type, X-Refresh-Request, X-Client-ID, X-Client-Key, X-Bootstrap-Secret |
| Exposed Headers | X-Request-ID, Retry-After |
| Allow Credentials | true |
| Max Age | 3600 seconds |

### Cookie Configuration (Refresh Token)

| Attribute | Value |
|-----------|-------|
| Name | shield_refresh |
| HttpOnly | true |
| Secure | app.security.cookie-secure (true in production, false for local HTTP) |
| SameSite | Strict |
| Path | /api/auth |
| Max Age | JWT refresh expiration |

### Trusted Proxies

Only IPs/CIDRs listed in TRUSTED_PROXIES may supply X-Forwarded-For. Arbitrary values are ignored to prevent IP spoofing.

## Postman Collection Variables

Create a Postman environment with these variables:

| Variable | Example Value | Description |
|----------|---------------|-------------|
| base_url | http://localhost:6061 | Base URL for all API calls |
| bootstrap_secret | <APP_BOOTSTRAP_SECRET> | Operator bootstrap secret |
| client_id | <uuid> | Client ID from registration |
| client_key | <plaintext-key> | Client key (shown once) |
| access_token | <jwt> | JWT access token from login/register |
| refresh_token | <jwt> | JWT refresh token |
| user_id | <uuid> | User ID |
| challenge_id | <uuid> | Email OTP challenge ID |
| otp_code | <6-digit-code> | OTP from email/SMTP |
| admin_id | <uuid> | Administrator ID |
| invitation_id | <uuid> | Invitation ID |
| audit_id | <uuid> | Audit event ID |
| notification_id | <uuid> | Notification ID |

### Suggested Postman Test Scripts

Save tokens after login/register:
javascript
pm.environment.set("access_token", pm.response.json().accessToken);
pm.environment.set("refresh_token", pm.response.json().refreshToken);
pm.environment.set("user_id", pm.response.json().user.id);

Save client credentials:
javascript
pm.environment.set("client_id", pm.response.json().clientId);
pm.environment.set("client_key", pm.response.json().clientKey);

Validate status code:
javascript
pm.response.to.have.status(200); // or 201, 400, 401, 403 as expected

Validate response has accessToken:
javascript
pm.expect(pm.response.json().accessToken).to.not.be.undefined;

## E2E Test Checklist

### Phase 1: Bootstrap

[ ] Wrong bootstrap secret → 403, no email sent
[ ] Request bootstrap challenge → 200, challengeId returned
[ ] Complete bootstrap with valid OTP → 200, SUPER_ADMIN created
[ ] Complete bootstrap with wrong OTP (5x) → challenge locked
[ ] Replay consumed OTP → 400
[ ] Bootstrap remains closed after setup

### Phase 2: Client Management

[ ] Register client → 201, clientId + clientKey returned (once)
[ ] List clients → 200, paginated
[ ] Get client by ID → 200
[ ] Update client → 200
[ ] Deactivate client → 200; auth fails after deactivation
[ ] Activate client → 200; old credentials still invalid
[ ] Rotate secret → 200, new key returned; old key fails
[ ] Cross-tenant: CLIENT_ADMIN A cannot manage Client B → 403

### Phase 3: Authentication

[ ] Request registration OTP → 200
[ ] Register user → 201, tokens returned
[ ] Register with invalid client credentials → 400
[ ] Login → 200, tokens returned
[ ] Login with wrong password → 401 (generic message)
[ ] Login admin with cookie refresh → 200, HttpOnly cookie set
[ ] Refresh token → 200, new access token
[ ] Reuse old refresh token after rotation → 401, all sessions revoked
[ ] Logout → 200; tokens rejected afterward

### Phase 4: Password/Email

[ ] Request password reset → 200 (same response for unknown email)
[ ] Complete password reset → 200; old password fails
[ ] Change password (authenticated) → 200; sessions revoked
[ ] Request email change → 200, challengeId returned
[ ] Complete email change → 200

### Phase 5: User Lifecycle

[ ] List users → 200, paginated
[ ] Search users → 200
[ ] Get user by ID → 200
[ ] Get user sessions → 200
[ ] Block user → 200; user tokens rejected
[ ] Unblock user → 200; user must re-login
[ ] Delete user → 200 (soft delete)
[ ] Cross-tenant isolation → 403 for all operations

### Phase 6: Administrator Invitations

[ ] Create invitation → 200
[ ] List invitations → 200
[ ] Verify invitation (recipient) → 200, enrollmentToken
[ ] Confirm invitation (inviter) → 200
[ ] Accept invitation → 200, new admin created
[ ] Revoke invitation → 200
[ ] Self-deactivation → 403
[ ] Ordinary user on admin endpoints → 403

### Phase 7: Audit

[ ] List audits → 200
[ ] Get audit details → 200
[ ] Filter audits → 200
[ ] Get audit KPIs → 200
[ ] Get recent logs → 200
[ ] Cross-tenant audit access → 403
[ ] Audit contains no passwords/OTPs/secrets → verified

### Phase 8: Dashboard/Health

[ ] Dashboard metrics → 200
[ ] Dashboard activity → 200
[ ] Client distribution → 200
[ ] Health metrics (SUPER_ADMIN) → 200
[ ] Health status → 200, status=OK
[ ] Actuator health (public) → 200
[ ] Actuator metrics (SUPER_ADMIN) → 200
[ ] Actuator metrics (ordinary user) → 403

### Phase 9: Notifications

[ ] Get notifications → 200
[ ] Get unread count → 200
[ ] Mark as read → 200
[ ] Mark all as read → 200
[ ] Delete notification → 200
[ ] Get recent notifications → 200
[ ] Unauthenticated request → 401

### Phase 10: Search

[ ] Global search → 200, users + clients
[ ] Search users → 200
[ ] Search clients → 200

### Phase 11: User Activity

[ ] Get user activity → 200
[ ] Cross-tenant activity → 403

### Phase 12: Rate Limiting

[ ] Exceed login attempts → 429 with Retry-After
[ ] Exceed registration limit → 429
[ ] 429 response includes CORS headers → browser-readable

## Running Backend Tests (Maven)

From the guardian directory:

powershell
cd guardian
mvn test -Dshield.build.directory=target-test-services

To run specific integration tests:

powershell
mvn test -Dtest=SecurityHttpIntegrationTest -Dshield.build.directory=target-admin-endpoints

## Running Frontend Tests

From the guardian_frontend directory:

powershell
npm.cmd test
npm.cmd run build
npm.cmd run lint

## Notes & Limitations

1. No backend code was modified to create this document. It is a testing guide based on the existing Guardian codebase as of commit 1aadd71.

2. Browser/E2E UI tests were not executed in this session (browser launch permission was denied). API-level E2E testing can be performed using Postman, curl, or any HTTP client.

3. Live SMTP, production HTTPS, and Redis cluster testing remains outstanding. Unit/integration tests cover application behavior; real delivery and proxy configuration require deployment acceptance.

4. OAuth/OIDC is not implemented. The platform provides a custom confidential-client JWT API only.

5. Bootstrap secret must be removed from deployment after the first SUPER_ADMIN is provisioned.

6. Client keys are shown once at registration. Rotate immediately if lost.

## Document Metadata

| Field | Value |
|-------|-------|
| Application | Shield Authentication Platform |
| Backend | Spring Boot 3.5.8, Java 21 |
| Frontend | React 19, TypeScript, Vite |
| Database | PostgreSQL 17 |
| Cache/Rate Limit | Redis / Bucket4j |
| Base URL | http://localhost:6061 |
| Document Version | 1.0 |
| Last Updated | 2026-10-22 |
| Source | Guardian controller classes + existing docs (POSTMAN_API_TESTING.md, ADMIN_ENDPOINT_INTEGRATION.md, AUDIT_ENDPOINT_INTEGRATION.md, VALIDATION.md, MANUAL_VERIFICATION.md) |















