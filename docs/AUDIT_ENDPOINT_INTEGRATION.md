# Audit endpoint integration

All five AuditController operations are available on the existing `/audit` page. The frontend uses `/api/audits`; the backend also supports `/api/admin/audits` as an alias.

| Endpoint | Frontend behavior |
| --- | --- |
| `GET /api/audits` | All retained events in the authorized scope, with server pagination and sorting. Used when no search filters are applied. |
| `GET /api/audits/filter` | Application, event type, exact IP, dates, pagination, and sorting. Filters are submitted explicitly; empty values are omitted. Invalid date ordering is rejected before submission. |
| `GET /api/audits/{id}` | Opening or refreshing an event fetches its current details. Loading, forbidden/not-found errors, retry, and export availability are handled in the dialog. |
| `GET /api/audits/kpis` | Analytics shows server-provided counts and rates, with independent loading/error state. |
| `GET /api/audits/recent?days=…` | Timeline offers 1, 7, 30, and 90 days and describes the backend's maximum 500-record sample. |

## Credentials and authorization

All calls use the existing centralized Axios client and API base URL. The current access token is injected as `Authorization: Bearer …`; credentialed cookies are enabled. A 401 uses the existing refresh-cookie mechanism, including `X-Refresh-Request`, and retries the request once. Failed refresh clears the access token and signals session expiry. A 403 is never treated as a reason to refresh.

The existing protected route permits platform and client administrators. Legacy GUARDIAN_ADMIN identities continue through the existing server-identity normalization. Backend authorization remains authoritative: client administrators see only authorized application events; platform administrators have platform-wide scope. No credentials were hardcoded or persisted, and no backend production security code was changed.

Audit responses now have typed page, event, KPI, and query contracts matching AuditDTO, including nullable HTTP status and string location. Arbitrary backend error messages are not rendered. A failed detail refresh clears previous detail content; stale or cancelled responses cannot replace newer results. KPI, timeline, and detail errors do not hide a working event list.

## Changed files

Paths are relative to `E:/sts projects/Shield_Auth`.

- `guardian_frontend/src/api/auditApi.ts`
- `guardian_frontend/src/features/audit/auditTypes.ts`
- `guardian_frontend/src/features/audit/auditRequests.ts`
- `guardian_frontend/src/features/audit/auditSlice.ts`
- `guardian_frontend/src/features/audit/Audit.tsx`
- `guardian_frontend/src/features/audit/components/AuditFilters.tsx`
- `guardian_frontend/src/features/audit/components/AuditDetails.tsx`
- `guardian_frontend/src/features/audit/components/AuditTable.tsx`
- `guardian_frontend/src/features/audit/components/TimelineChart.tsx`
- `guardian_frontend/tests/audit.test.mjs`
- `guardian_frontend/tests/audit-browser.html`
- `guardian_frontend/tests/audit-browser.tsx`
- `guardian_frontend/tests/audit-browser-check.js`
- `guardian/src/test/java/com/guardian/SecurityHttpIntegrationTest.java`
- `docs/AUDIT_ENDPOINT_INTEGRATION.md`

## Verification on October 22, 2026

From `guardian_frontend`:

- `npm.cmd run build`: passed.
- `npm.cmd run lint`: passed.
- `npm.cmd test`: all 28 tests passed. Coverage includes all five authenticated request contracts, cookie credentials, expired-token refresh, failed refresh, forbidden responses, safe errors, optional filter cleanup, date validation, cancellation, detail state, and request ordering.
- All 23 browser assertions passed at 1280 × 800 desktop and 390 × 844 mobile sizes using the real audit page and a test-only transport adapter. They exercise endpoint selection, filters, pagination, fresh detail loading, errors, loading/export controls, KPI values, timeline selection, dialog naming/focus restoration, and viewport fit.

From `guardian`:

```powershell
mvn '-Dtest=SecurityHttpIntegrationTest' '-Dshield.build.directory=target-admin-endpoints' test
```

All 17 HTTP integration tests passed. New assertions exercise all five operations under both URL prefixes, missing/invalid credentials, forbidden ordinary users, authorized client-admin results, cross-tenant detail rejection, filtering, counts, pagination, and invalid timeline periods. They use the existing isolated H2 profile with real controllers, services, security, and persistence. The run log is `guardian/audit-endpoint-verification.log`.

To repeat browser checks, start `npm.cmd run dev -- --host 127.0.0.1 --port 5174` in another terminal, then:

```powershell
npx.cmd --yes agent-browser open http://127.0.0.1:5174/tests/audit-browser.html
Get-Content -Raw tests/audit-browser-check.js | npx.cmd --yes agent-browser eval --stdin
npx.cmd --yes agent-browser set viewport 390 844
npx.cmd --yes agent-browser open http://127.0.0.1:5174/tests/audit-browser.html
Get-Content -Raw tests/audit-browser-check.js | npx.cmd --yes agent-browser eval --stdin
npx.cmd --yes agent-browser close
```

Reload the fixture before each assertion run. Test adapters are confined to `tests`; production code uses the backend. A browser session with real deployed credentials and production PostgreSQL was not exercised. No existing database records or migrations were changed.
