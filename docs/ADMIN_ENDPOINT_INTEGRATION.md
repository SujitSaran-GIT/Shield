# Administrator endpoint integration

User Management now offers **Manage administrator** for platform administrators viewing SUPER_ADMIN, GUARDIAN_ADMIN, or CLIENT_ADMIN records. The dialog loads the administrator using `GET /api/admin/admins/{id}`. Activation and deactivation use bodyless PUT requests through the existing authenticated Axios client. Confirmation is required, duplicate submissions are blocked, and the current actor cannot change their own status. Deleted accounts have no status action.

After a successful mutation, the dialog fetches the administrator again, updates Redux, and refreshes the directory with its existing filters and pagination. Failed mutations never display success. If the mutation succeeds but the read fails, the dialog explains that the change was saved and prevents resubmission. Administrator errors use fixed safe messages for bad requests, expired sessions, forbidden access, rate limits, server failures, and connection failures.

Role changes remain disabled because `AdminService.updateAdminRole` rejects them. The disabled selector shows the existing administrator roles and explains verified invitation provisioning. The unused legacy registration client method was removed. `/register` retains verified client administrator enrollment and links to invitation acceptance and operator bootstrap. Existing enrollment and invitation implementations were preserved. Backend production code, security configuration, migrations, and existing database records were not changed.

## Changed files

Paths are relative to `E:/sts projects/Shield_Auth`.

- `guardian_frontend/src/api/adminApi.ts` — administrator read and lifecycle API calls.
- `guardian_frontend/src/api/authApi.ts` — remove unused disabled legacy registration call.
- `guardian_frontend/src/features/auth/Register.tsx` — supported provisioning navigation.
- `guardian_frontend/src/features/users/adminManagement.ts` — eligibility, role capability explanation, safe errors.
- `guardian_frontend/src/features/users/Users.tsx` — integrate management dialog and directory refresh; recognize both platform roles in role styling.
- `guardian_frontend/src/features/users/usersSlice.ts` — apply refreshed administrator records.
- `guardian_frontend/src/features/users/components/AdministratorModal.tsx` — administrator role/status UI and confirmed lifecycle operations.
- `guardian_frontend/src/features/users/components/UserTable.tsx` — privileged management action.
- `guardian_frontend/src/features/users/components/UserFilters.tsx` — legacy administrator role filter.
- `guardian_frontend/tests/admin.test.mjs` — API, auth interceptor, capability, error, and Redux regression tests.
- `guardian_frontend/tests/admin-browser.html` — isolated browser fixture entry.
- `guardian_frontend/tests/admin-browser.tsx` — real component rendering with a test-only API adapter.
- `guardian_frontend/tests/admin-browser-check.js` — browser assertions.
- `guardian/src/test/java/com/guardian/SecurityHttpIntegrationTest.java` — real lifecycle and disabled-operation HTTP contract tests.
- `docs/ADMIN_ENDPOINT_INTEGRATION.md` — this implementation and verification report.

## Verification on October 22, 2026

From `guardian_frontend`:

- `npm.cmd run build` — passed (TypeScript and production Vite build).
- `npm.cmd run lint` — passed after exporting the browser fixture component.
- `npm.cmd test` — 19 tests passed.
- Browser fixture assertions — 18 passed at 1262 × 624 and 18 passed at 390 × 844. Checks include viewport fit, accessible dialog name, loading/confirmation controls, pending duplicate prevention, cancellation protection, focus restoration, both status refreshes, forbidden errors, and a saved mutation followed by a failed refresh.

From `guardian`:

```powershell
mvn -o '-Dtest=AdminProvisioningTest,SecurityHttpIntegrationTest' '-Dshield.build.directory=target-admin-endpoints' test
```

26 tests passed. The HTTP tests use the existing H2 test profile and real controllers/services/security/data access. They verify suspend/activate with GET status checks, self-deactivation rejection, anonymous and tenant-admin rejection, and 403 for authenticated legacy registration and role mutation. Existing H2 duplicate-index warnings did not fail the test run. Production PostgreSQL deployment and a browser session against production data were not exercised.

## Repeat the browser checks

From `guardian_frontend`, start Vite with `npm.cmd run dev -- --host 127.0.0.1 --port 5174` in another terminal. With agent-browser installed or available through npx:

```powershell
npx.cmd --yes agent-browser open http://127.0.0.1:5174/tests/admin-browser.html
Get-Content -Raw tests/admin-browser-check.js | npx.cmd --yes agent-browser eval --stdin
npx.cmd --yes agent-browser set viewport 390 844
npx.cmd --yes agent-browser open http://127.0.0.1:5174/tests/admin-browser.html
Get-Content -Raw tests/admin-browser-check.js | npx.cmd --yes agent-browser eval --stdin
npx.cmd --yes agent-browser close
```

The fixture adapter exists only under `tests`; production code always uses the real API. Reload the fixture before each assertion run.
