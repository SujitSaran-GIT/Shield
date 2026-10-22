import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSync } from 'esbuild';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, sep, basename } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const temporary = mkdtempSync(join(tmpdir(), 'shield-reducers-'));
const require = createRequire(import.meta.url);
function loadSource(relativePath, outputName) {
  const result = buildSync({
    entryPoints: [fileURLToPath(new URL(relativePath, import.meta.url))],
    bundle: true, platform: 'node', format: 'cjs', write: false,
    define: { 'import.meta.env': '{}' }, logLevel: 'silent',
  });
  const output = join(temporary, outputName + '.cjs');
  writeFileSync(output, result.outputFiles[0].text);
  return require(output);
}
test.after(() => {
  assert.ok(resolve(temporary).startsWith(resolve(tmpdir()) + sep));
  assert.ok(basename(temporary).startsWith('shield-reducers-'));
  rmSync(temporary, { recursive: true, force: true });
});
const users = loadSource('../src/features/users/usersSlice.ts', 'users');
const audit = loadSource('../src/features/audit/auditSlice.ts', 'audit');
const auth = loadSource('../src/features/auth/authSlice.ts', 'auth');

test('user pagination changes affect pagination and clear old selection', () => {
  let state = users.default(undefined, { type: 'init' });
  state = users.default(state, users.setSelectedRows(['previous-user']));
  state = users.default(state, users.setFilters({ page: 2, pageSize: 50, search: 'example' }));
  assert.equal(state.pagination.currentPage, 2);
  assert.equal(state.pagination.pageSize, 50);
  assert.equal(state.filters.search, 'example');
  assert.deepEqual(state.selectedRows, []);
});

test('late user-directory responses cannot replace newer results', () => {
  let state = users.default(undefined, { type: 'init' });
  state = users.default(state, users.fetchUsers.pending('old', {}));
  state = users.default(state, users.fetchUsers.pending('new', {}));
  const page = { content: [{ id: 'correct-user' }], number: 0, size: 20, totalPages: 1, totalElements: 1 };
  state = users.default(state, users.fetchUsers.fulfilled(page, 'new', {}));
  state = users.default(state, users.fetchUsers.fulfilled({ ...page, content: [{ id: 'stale-user' }] }, 'old', {}));
  assert.equal(state.users[0].id, 'correct-user');
});

test('late audit responses cannot cross a newer filter selection', () => {
  let state = audit.default(undefined, { type: 'init' });
  state = audit.default(state, audit.fetchFilteredAudits.pending('old', { clientId: 'a' }));
  state = audit.default(state, audit.fetchFilteredAudits.pending('new', { clientId: 'b' }));
  const page = { content: [{ id: 'event-b' }], number: 0, size: 20, totalPages: 1, totalElements: 1 };
  state = audit.default(state, audit.fetchFilteredAudits.fulfilled(page, 'new', { clientId: 'b' }));
  state = audit.default(state, audit.fetchFilteredAudits.fulfilled({ ...page, content: [{ id: 'event-a' }] }, 'old', { clientId: 'a' }));
  assert.equal(state.audits[0].id, 'event-b');
});

test('audit reset rejects late metrics and timeline responses from the previous identity', () => {
  let state = audit.default(undefined, audit.fetchAuditKPIs.pending('previous-metrics'));
  state = audit.default(state, audit.fetchRecentLogs.pending('previous-timeline', 7));
  state = audit.default(state, audit.resetAudit());
  state = audit.default(state, audit.fetchAuditKPIs.fulfilled({ totalEvents: 999 }, 'previous-metrics'));
  state = audit.default(state, audit.fetchRecentLogs.fulfilled([{ id: 'private-event' }], 'previous-timeline', 7));
  assert.equal(state.kpis, null);
  assert.deepEqual(state.recentLogs, []);
});

test('session expiry clears the authenticated identity and role', () => {
  let state = auth.default(undefined, auth.loginAdmin.fulfilled({ id: 'admin', role: 'SUPER_ADMIN' }, 'login', { email: 'admin@example.test', password: 'test-only-password' }));
  assert.equal(state.isAuthenticated, true);
  state = auth.default(state, auth.sessionExpired());
  assert.equal(state.isAuthenticated, false);
  assert.equal(state.user, null);
});

test('failed login does not grant an authenticated role', () => {
  const state = auth.default(undefined, auth.loginAdmin.rejected(new Error('Invalid credentials'), 'login',
    { email: 'unknown@example.test', password: 'test-only-password' }, 'Invalid credentials'));
  assert.equal(state.isAuthenticated, false);
  assert.equal(state.user, null);
  assert.equal(state.error, 'Invalid credentials');
});

test('legacy platform role is normalized only from the server-confirmed identity', () => {
  const state = auth.default(undefined, auth.loginAdmin.fulfilled({ id: 'admin', role: 'GUARDIAN_ADMIN' },
    'login', { email: 'admin@example.test', password: 'test-only-password' }));
  assert.equal(state.user.role, 'SUPER_ADMIN');
});
