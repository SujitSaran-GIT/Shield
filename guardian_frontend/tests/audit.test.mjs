import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSync } from 'esbuild';
import { createRequire } from 'node:module';

const bundle = buildSync({ stdin: { contents: `
export { default as api } from './src/api/axiosConfig';
export { default as axios } from 'axios';
export { auditApi } from './src/api/auditApi';
export { setAccessToken, getAccessToken } from './src/api/session';
export * from './src/features/audit/auditRequests';
export * from './src/features/audit/auditSlice';
export { default as reducer } from './src/features/audit/auditSlice';
`, resolveDir: process.cwd() }, bundle: true, platform: 'node', format: 'cjs', write: false, define: { 'import.meta.env': '{}' } });
const mod = { exports: {} };
new Function('module', 'exports', 'require', bundle.outputFiles[0].text)(mod, mod.exports, createRequire(import.meta.url));
const { api, axios, auditApi, setAccessToken, getAccessToken, auditQuery, hasAuditFilters, auditDateError, auditError, reducer, fetchAudits, fetchFilteredAudits, fetchAuditKPIs, fetchRecentLogs, fetchAuditDetails, clearSelectedAudit } = mod.exports;
const id = '01234567-89ab-cdef-0123-456789abcdef';
const reply = (config, data = {}) => ({ config, data, status: 200, statusText: 'OK', headers: {} });
const fail = (config, status) => Promise.reject(new axios.AxiosError('private detail', 'ERR_BAD_RESPONSE', config, null, { ...reply(config, { message: 'private secret stack trace' }), status }));
const operations = [() => auditApi.getAllAudits({ page: 2, size: 10, sortBy: 'createdAt', sortDir: 'ASC' }), () => auditApi.getFilteredAudits({ clientId: 'tenant-a', eventType: 'LOGIN_FAILED', ipAddress: '198.51.100.9', startDate: '2026-10-01T00:00', endDate: '2026-10-22T00:00', page: 0, size: 20 }), () => auditApi.getAuditDetails(id), () => auditApi.getAuditKPIs(), () => auditApi.getRecentLogs(30)];

test('all five audit endpoints use centralized bearer and cookie credentials with correct contracts', async () => {
  setAccessToken('test-access');
  const calls = [];
  api.defaults.adapter = async config => { calls.push(config); return reply(config); };
  for (const operation of operations) await operation();
  assert.deepEqual(calls.map(config => config.url), ['/audits', '/audits/filter', `/audits/${id}`, '/audits/kpis', '/audits/recent']);
  for (const config of calls) { assert.equal(config.method, 'get'); assert.equal(config.headers.Authorization, 'Bearer test-access'); assert.equal(config.withCredentials, true); assert.equal(config.baseURL, '/api'); }
  assert.equal(calls[0].params.page, 2); assert.equal(calls[0].params.sortDir, 'ASC');
  assert.equal(calls[1].params.clientId, 'tenant-a'); assert.equal(calls[1].params.startDate, '2026-10-01T00:00');
  assert.deepEqual(calls[4].params, { days: 30 });
});

test('blank optional filters are omitted and sorting alone uses the unfiltered list', () => {
  assert.deepEqual(auditQuery({ clientId: '', eventType: '', ipAddress: '  ', startDate: null, endDate: null, page: 0, size: 20 }), { page: 0, size: 20 });
  assert.equal(hasAuditFilters({ sortBy: 'createdAt', sortDir: 'ASC', clientId: ' ' }), false);
  assert.equal(hasAuditFilters({ ipAddress: '198.51.100.9' }), true);
  assert.equal(auditDateError({ startDate: '2026-10-22T00:00', endDate: '2026-10-01T00:00' }), 'The start date must be before the end date.');
  assert.equal(auditDateError({ startDate: 'invalid' }), 'Enter valid start and end dates.');
  assert.equal(auditDateError({ startDate: '2026-10-01T00:00' }), '');
});

test('all audit calls refresh an expired token once, preserving the original request', async () => {
  let refreshes = 0;
  axios.defaults.adapter = async config => { refreshes++; assert.equal(config.headers['X-Refresh-Request'], 'true'); assert.equal(config.withCredentials, true); return reply(config, { accessToken: 'fresh' }); };
  for (const operation of operations) {
    let attempts = 0;
    setAccessToken('expired');
    api.defaults.adapter = config => { attempts++; return attempts === 1 ? fail(config, 401) : Promise.resolve(reply(config)); };
    await operation(); assert.equal(attempts, 2); assert.equal(getAccessToken(), 'fresh');
  }
  assert.equal(refreshes, 5);
});

test('forbidden audit reads never refresh tokens; failures expose only safe messages', async () => {
  let refreshes = 0;
  axios.defaults.adapter = async config => { refreshes++; return reply(config); };
  for (const operation of operations) {
    api.defaults.adapter = config => fail(config, 403);
    await assert.rejects(operation(), error => { assert.match(auditError(error), /permission/); return true; });
  }
  assert.equal(refreshes, 0);
  for (const status of [400, 401, 404, 429, 500, 503]) {
    try { await fail({}, status); } catch (error) { assert.doesNotMatch(auditError(error), /private|secret|stack/); }
  }
});

test('failed audit token refresh clears credentials and emits session expiry', async () => {
  const events = [];
  globalThis.window = { dispatchEvent: event => events.push(event.type) };
  api.defaults.adapter = config => fail(config, 401);
  axios.defaults.adapter = config => fail(config, 401);
  await assert.rejects(auditApi.getAuditKPIs());
  assert.equal(getAccessToken(), null); assert.deepEqual(events, ['shield:session-expired']);
  delete globalThis.window;
});

test('audit requests forward cancellation to all endpoint transports', async () => {
  const controller = new AbortController();
  const calls = [];
  api.defaults.adapter = async config => { calls.push(config); return reply(config); };
  await auditApi.getAllAudits({}, controller.signal); await auditApi.getFilteredAudits({}, controller.signal);
  await auditApi.getAuditDetails(id, controller.signal); await auditApi.getAuditKPIs(controller.signal); await auditApi.getRecentLogs(7, controller.signal);
  assert.equal(calls.length, 5); assert.ok(calls.every(config => config.signal === controller.signal));
});

test('detail failures clear previous content and cannot overwrite a closed or newer event', () => {
  let state = reducer(undefined, fetchAuditDetails.pending('first', id));
  state = reducer(state, fetchAuditDetails.fulfilled({ id, details: 'old event' }, 'first', id));
  state = reducer(state, fetchAuditDetails.pending('second', 'new-id'));
  assert.equal(state.selectedAudit, null); assert.equal(state.loadingDetails, true);
  state = reducer(state, fetchAuditDetails.rejected(null, 'second', 'new-id', 'Event unavailable'));
  assert.equal(state.detailError, 'Event unavailable'); assert.equal(state.error, null);
  state = reducer(state, clearSelectedAudit());
  state = reducer(state, fetchAuditDetails.fulfilled({ id }, 'second', 'new-id'));
  assert.equal(state.selectedAudit, null); assert.equal(state.detailError, null);
});

test('KPI and recent errors are isolated and clear independently on retry', () => {
  let state = reducer(undefined, fetchAuditKPIs.pending('kpi'));
  state = reducer(state, fetchRecentLogs.pending('recent', 7));
  state = reducer(state, fetchAuditKPIs.rejected(null, 'kpi', undefined, 'Metrics forbidden'));
  state = reducer(state, fetchRecentLogs.rejected(null, 'recent', 7, 'Timeline unavailable'));
  assert.equal(state.kpiError, 'Metrics forbidden'); assert.equal(state.recentError, 'Timeline unavailable'); assert.equal(state.error, null);
  state = reducer(state, fetchAuditKPIs.pending('retry'));
  assert.equal(state.kpiError, null); assert.equal(state.recentError, 'Timeline unavailable');
});

test('list and filtered responses share request ordering and pagination', () => {
  let state = reducer(undefined, fetchAudits.pending('old', {}));
  state = reducer(state, fetchFilteredAudits.pending('new', { eventType: 'LOGIN_FAILED' }));
  const page = { content: [{ id }], number: 2, size: 10, totalPages: 4, totalElements: 31 };
  state = reducer(state, fetchFilteredAudits.fulfilled(page, 'new', {}));
  state = reducer(state, fetchAudits.fulfilled({ ...page, content: [] }, 'old', {}));
  assert.equal(state.audits[0].id, id); assert.equal(state.pagination.currentPage, 2); assert.equal(state.pagination.totalElements, 31);
});
