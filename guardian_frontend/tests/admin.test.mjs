import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSync } from 'esbuild';
import { createRequire } from 'node:module';

const bundle = buildSync({ stdin: { contents: `
  export { default as api, refreshSession } from './src/api/axiosConfig';
  export { default as axios } from 'axios';
  export { adminApi } from './src/api/adminApi';
  export { authApi } from './src/api/authApi';
  export { setAccessToken, getAccessToken } from './src/api/session';
  export * from './src/features/users/adminManagement';
  export { default as reducer, administratorRefreshed, fetchUsers } from './src/features/users/usersSlice';
`, resolveDir: process.cwd() }, bundle: true, platform: 'node', format: 'cjs', write: false, define: { 'import.meta.env': '{}' } });
const mod = { exports: {} };
new Function('module', 'exports', 'require', bundle.outputFiles[0].text)(mod, mod.exports, createRequire(import.meta.url));
const { api, axios, adminApi, authApi, setAccessToken, getAccessToken, adminError, administratorAction, canManageAdministrator, reducer, administratorRefreshed, fetchUsers, roleUnavailable } = mod.exports;
const actor = { id: 'actor', role: 'SUPER_ADMIN' };
const target = { id: '01234567-89ab-cdef-0123-456789abcdef', username: 'admin', email: 'admin@example.test', role: 'CLIENT_ADMIN', status: 'ACTIVE' };
const response = (config, data) => ({ config, data, status: 200, statusText: 'OK', headers: {} });
const reject = (config, status) => Promise.reject(new axios.AxiosError('private server detail', 'ERR_BAD_RESPONSE', config, null, { ...response(config, { message: 'secret stack trace' }), status }));

test('administrator actions respect privileges, status and self protection', () => {
  assert.equal(administratorAction(actor, target), 'deactivate');
  assert.equal(administratorAction(actor, { ...target, status: 'SUSPENDED' }), 'activate');
  assert.equal(administratorAction(actor, { ...target, status: 'BLOCKED' }), 'activate');
  assert.equal(administratorAction(actor, { ...target, status: 'DELETED' }), null);
  assert.equal(administratorAction(actor, { ...target, id: actor.id }), null);
  assert.equal(administratorAction({ ...actor, role: 'CLIENT_ADMIN' }, target), null);
  assert.equal(canManageAdministrator(null, target), false);
  assert.equal(canManageAdministrator(actor, { ...target, role: 'USER' }), false);
  assert.equal(canManageAdministrator({ ...actor, role: 'GUARDIAN_ADMIN' }, target), true);
});

test('activate and deactivate use bodyless PUT, authenticated UUID paths, then refresh server state', async () => {
  setAccessToken('test-access');
  for (const action of ['activate', 'deactivate']) {
    const calls = [];
    const updated = { ...target, status: action === 'activate' ? 'ACTIVE' : 'SUSPENDED' };
    api.defaults.adapter = async config => { calls.push(config); return response(config, config.method === 'get' ? updated : { message: 'saved' }); };
    await adminApi[action](target.id);
    const { data } = await adminApi.get(target.id);
    assert.equal(calls[0].method, 'put');
    assert.equal(calls[0].url, `/admin/admins/${target.id}/${action}`);
    assert.equal(calls[0].data, undefined);
    assert.equal(calls[0].headers.Authorization, 'Bearer test-access');
    assert.equal(calls[1].url, `/admin/admins/${target.id}`);
    let state = reducer(undefined, fetchUsers.pending('load', {}));
    state = reducer(state, fetchUsers.fulfilled({ content: [target], number: 0, size: 20, totalPages: 1, totalElements: 1 }, 'load', {}));
    state = reducer(state, administratorRefreshed(data));
    assert.equal(state.users[0].status, updated.status);
  }
});

test('expired access token refreshes once and retries the administrator request', async () => {
  let attempts = 0, refreshes = 0;
  setAccessToken('expired');
  axios.defaults.adapter = async config => { refreshes++; assert.ok(config.url.endsWith('/auth/refresh')); return response(config, { accessToken: 'renewed' }); };
  api.defaults.adapter = config => ++attempts === 1 ? reject(config, 401) : Promise.resolve(response(config, {}));
  await adminApi.activate(target.id);
  assert.equal(attempts, 2); assert.equal(refreshes, 1); assert.equal(getAccessToken(), 'renewed');
});

test('invalid refresh expires the session and rejects the mutation', async () => {
  const events = [];
  globalThis.window = { dispatchEvent: event => events.push(event.type) };
  api.defaults.adapter = config => reject(config, 401);
  axios.defaults.adapter = config => reject(config, 401);
  await assert.rejects(adminApi.deactivate(target.id));
  assert.equal(getAccessToken(), null);
  assert.deepEqual(events, ['shield:session-expired']);
  delete globalThis.window;
});

test('forbidden and failed mutations reject without token refresh or sensitive messages', async () => {
  let refreshes = 0;
  axios.defaults.adapter = config => { refreshes++; return response(config, {}); };
  for (const status of [400, 403, 500, 503]) {
    api.defaults.adapter = config => reject(config, status);
    await assert.rejects(adminApi.activate(target.id), error => {
      assert.doesNotMatch(adminError(error), /secret|stack|private/);
      return true;
    });
  }
  assert.equal(refreshes, 0);
});

test('disabled operations have no actionable legacy registration client or role mutation client', () => {
  assert.equal(authApi.adminRegister, undefined);
  assert.equal(adminApi.updateRole, undefined);
  assert.match(roleUnavailable, /unavailable.*verified invitation/);
});

test('disabled role and legacy registration responses remain rejected as forbidden', async () => {
  api.defaults.adapter = config => reject(config, 403);
  await assert.rejects(api.put(`/admin/admins/${target.id}/role`, { newAdminRole: 'GUARDIAN_ADMIN' }), error => error.response.status === 403);
  await assert.rejects(api.post('/admin/register', {}), error => error.response.status === 403);
});
