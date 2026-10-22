// Isolated browser test fixture; never imported by the production application.
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import axios from 'axios';
import { store } from '../src/app/store';
import { setUser } from '../src/features/auth/authSlice';
import { fetchUsers } from '../src/features/users/usersSlice';
import AdministratorModal from '../src/features/users/components/AdministratorModal';
import api from '../src/api/axiosConfig';
import type { User } from '../src/types';
import '../src/index.css';

const target: User = { id: '01234567-89ab-cdef-0123-456789abcdef', username: 'test-administrator', email: 'administrator@example.test', role: 'CLIENT_ADMIN', status: 'ACTIVE', clientName: 'Shield', createdAt: '2026-10-22' };
const fixture = { status: 'ACTIVE' as User['status'], calls: 0, delay: false, loadDelay: false, fail: false, refreshFail: false, release: () => {}, releaseLoad: () => {} };
store.dispatch(setUser({ ...target, id: 'actor', role: 'SUPER_ADMIN' }));
store.dispatch(fetchUsers.pending('fixture', {}));
store.dispatch(fetchUsers.fulfilled({ content: [target], number: 0, size: 20, totalPages: 1, totalElements: 1 }, 'fixture', {}));
api.defaults.adapter = async config => {
  if (config.method === 'put') {
    fixture.calls++;
    if (fixture.delay) await new Promise<void>(resolve => { fixture.release = resolve; });
    if (fixture.fail) throw new axios.AxiosError('private stack trace', 'ERR_BAD_RESPONSE', config, null, { config, status: 403, statusText: 'Forbidden', headers: {}, data: { message: 'private stack trace' } });
    fixture.status = config.url?.endsWith('/deactivate') ? 'SUSPENDED' : 'ACTIVE';
  } else if (fixture.loadDelay) {
    await new Promise<void>(resolve => { fixture.releaseLoad = resolve; });
  }
  if (config.method === 'get' && fixture.refreshFail && fixture.calls > 0) throw new Error('private transport details');
  return { config, status: 200, statusText: 'OK', headers: {}, data: { ...target, status: fixture.status } };
};
export default function Fixture() {
  const [open, setOpen] = useState(false);
  return <main className="p-4"><button className="primary-button" onClick={() => setOpen(true)}>Open administrator</button>{open && <AdministratorModal user={target} onClose={() => setOpen(false)} onChanged={() => {}} />}</main>;
}
Object.assign(window, { adminFixture: fixture, adminStore: store });
createRoot(document.getElementById('root')!).render(<Provider store={store}><MemoryRouter><Fixture /></MemoryRouter></Provider>);
