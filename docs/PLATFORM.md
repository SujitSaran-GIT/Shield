# Platform and tenancy audit

Inventory recorded before modifying the affected services. Existing Spring Boot/JPA/PostgreSQL implementation and REST paths are retained.

| Requirement | Existing evidence | Initial status / risk | Planned correction |
|---|---|---|---|
| Privileged provisioning | AdminController.register accepts caller-supplied adminRole, no authorization | broken / critical | Disable direct creation; operator secret plus OTP and locked singleton bootstrap; confirmed email-bound invitations |
| Tenant isolation | UserService lists/searches all users; client ownership absent | broken / critical | Explicit owner_user_id; database-filtered owned tenant reads; CLIENT_ADMIN-only ordinary user mutations |
| Client secrets | ClientService encrypts then overwrites managed entity with plaintext, decrypt fallback | broken / critical | Adaptive hashes; transient one-time response; rotation; migrate legacy keys on successful verification |
| User identity | email globally unique, one clientId per human record | partial | Preserve separate existing identity model; prohibit automatic cross-client merging; multi-membership remains future work |
| Client enrollment | public-register creates unowned active clients | broken / high | Authenticated owner registration; explicit opt-in email-verified CLIENT_ADMIN policy |
| User administration | global administrator blocks users; client admin cannot | broken / high | Invert authority; require verified ownership in service |
| Dashboard | true counts but full table scans, hardcoded success-rate change | partial / medium | Tenant-scoped real records; unavailable trend represented null |
| Notification ownership | mutation bound to userId; UUID principal expected | implemented with principal integration issue | Preserve ownership and enforce authenticated UUID contract |
| Schema | Hibernate update only, no migration history | missing / high | Versioned baseline and additive ownership/provisioning migrations; no database reset |

Legacy GUARDIAN_ADMIN remains a platform administrator compatibility role. New privileged accounts use SUPER_ADMIN. Legacy unowned clients deliberately remain inaccessible to CLIENT_ADMIN until an operator assigns an audited owner; ownership is never guessed from email.

## Follow-up API additions

| Method/path | Authorization | Behavior |
|---|---|---|
| GET `/api/admin/invitations?page=0&size=20` | SUPER_ADMIN, legacy GUARDIAN_ADMIN | Bounded invitation status page. Includes inviter and lifecycle timestamps; excludes OTPs and enrollment-token verifiers. Maximum page size 100. |
| DELETE `/api/users/{id}` | CLIENT_ADMIN owning the target USER's application | Soft deletion with session/token revocation and audit. Preserves the database row and history. Platform administrators cannot perform this ordinary user mutation. |
| GET `/api/users/{id}/activity?page=0&size=20` | Platform administrator or authorized owning CLIENT_ADMIN | Authorizes the target before querying their audit history. Maximum page size 100. |
| GET `/api/audits/{id}` | Platform administrator or authorized owning CLIENT_ADMIN | Scoped detail for an existing retained event. |

User list filtering is performed in database queries under the same authorization scope as the user directory. Invalid pagination and unsupported sort fields are rejected. Deactivated/deleted accounts and clients cannot recover their previously revoked credentials by being reactivated.
