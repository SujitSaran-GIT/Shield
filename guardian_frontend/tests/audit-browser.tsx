// Test-only transport fixtures. The production audit page always calls the backend.
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import axios, { type InternalAxiosRequestConfig } from 'axios';
import { store } from '../src/app/store';
import { setUser } from '../src/features/auth/authSlice';
import { setAccessToken } from '../src/api/session';
import api from '../src/api/axiosConfig';
import Audit from '../src/features/audit/Audit';
import Layout from '../src/components/layout/Layout';
import { ThemeProvider } from '../src/app/ThemeContext';
import '../src/index.css';

const event = { id: '01234567-89ab-cdef-0123-456789abcdef', eventType: 'LOGIN_FAILED', clientId: 'tenant-a', clientName: 'Test application', userEmail: 'member@example.test', statusCode: 401, createdAt: '2026-10-22T10:00:00', details: 'List summary' };
const preview = new URLSearchParams(location.search).has('preview');
const previewEvents = [
  ['LOGIN_SUCCESS', 'maya@northstar.example', 200, '10:42:18', '198.51.100.24', 'Northstar workspace'],
  ['LOGIN_FAILED', 'alex@northstar.example', 401, '10:40:52', '198.51.100.41', 'Northstar workspace'],
  ['TOKEN_REFRESHED', 'maya@northstar.example', 200, '10:38:05', '198.51.100.24', 'Northstar workspace'],
  ['USER_REGISTRATION_SUCCESS', 'sam@northstar.example', 201, '10:35:27', '203.0.113.12', 'Customer portal'],
  ['RATE_LIMIT_EXCEEDED', null, 429, '10:32:46', '203.0.113.86', 'Customer portal'],
  ['ADMIN_UPDATED', 'jordan@northstar.example', 200, '10:29:13', '198.51.100.8', 'Northstar workspace'],
  ['LOGOUT_SUCCESS', 'alex@northstar.example', 200, '10:25:09', '198.51.100.41', 'Northstar workspace'],
  ['CLIENT_AUTH_SUCCESS', null, 200, '10:21:34', '203.0.113.5', 'Customer portal'],
].map(([eventType, userEmail, statusCode, time, ipAddress, clientName], index) => ({ ...event, id: `preview-event-${index}`, eventType, userEmail, statusCode, createdAt: `2026-10-22T${time}`, ipAddress, clientName }));
const fixture = { calls: [] as InternalAxiosRequestConfig[], delayDetails: false, detailStatus: 200, kpiStatus: 200, release: () => {} };
setAccessToken('browser-test-access');
store.dispatch(setUser({ id: 'test-actor', username: preview ? 'Jordan Lee' : 'test-admin', email: 'admin@example.test', role: 'CLIENT_ADMIN', status: 'ACTIVE', clientName: 'Shield', createdAt: '2026-10-22' }));
api.defaults.adapter = async config => {
  fixture.calls.push(config);
  let data: unknown;
  let status = 200;
  switch (config.url) {
    case '/admin/clients': data = [{ clientId: 'tenant-a', name: 'Test application' }]; break;
    case '/audits': case '/audits/filter': data = { content: preview ? previewEvents : [event], number: config.params?.page || 0, size: config.params?.size || 20, totalPages: preview ? 1 : 2, totalElements: preview ? 8 : 25 }; break;
    case '/audits/kpis': data = preview ? { totalEvents: 8, successfulEvents: 6, failedEvents: 2, successRate: 75, failureRate: 25 } : { totalEvents: 25, successfulEvents: 20, failedEvents: 5, successRate: 80, failureRate: 20 }; status = fixture.kpiStatus; break;
    case '/audits/recent': data = preview ? previewEvents : [event]; break;
    default:
      if (fixture.delayDetails) await new Promise<void>(resolve => { fixture.release = resolve; });
      status = fixture.detailStatus; data = { ...event, details: 'Fresh event detail' };
  }
  if (status !== 200) throw new axios.AxiosError('private stack trace', 'ERR_BAD_RESPONSE', config, null, { config, status, statusText: 'Failure', headers: {}, data: { message: 'private stack trace' } });
  return { config, status, statusText: 'OK', headers: {}, data };
};
Object.assign(window, { auditFixture: fixture });
export default function Fixture() { return <Provider store={store}><ThemeProvider><MemoryRouter initialEntries={['/audit']}><Routes><Route element={<Layout />}><Route path="/audit" element={<Audit />} /></Route></Routes></MemoryRouter></ThemeProvider></Provider>; }
createRoot(document.getElementById('root')!).render(<Fixture />);
