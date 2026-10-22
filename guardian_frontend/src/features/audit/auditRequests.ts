import axios from 'axios';
import type { AuditQuery } from './auditTypes';

export function auditQuery(query: AuditQuery): AuditQuery {
  return Object.fromEntries(Object.entries(query)
    .map(([key, value]) => [key, typeof value === 'string' ? value.trim() : value])
    .filter(([, value]) => value !== '' && value !== null && value !== undefined));
}
export function hasAuditFilters(query: AuditQuery): boolean {
  const clean = auditQuery(query);
  return !!(clean.clientId || clean.eventType || clean.ipAddress || clean.startDate || clean.endDate);
}
export function auditDateError(query: AuditQuery): string {
  if ([query.startDate, query.endDate].some(value => value && Number.isNaN(Date.parse(value)))) return 'Enter valid start and end dates.';
  if (query.startDate && query.endDate && Date.parse(query.startDate) > Date.parse(query.endDate)) return 'The start date must be before the end date.';
  return '';
}
export function auditError(error: unknown): string {
  const status = axios.isAxiosError(error) ? error.response?.status : undefined;
  if (status === 400) return 'The audit request is invalid. Check the filters, date range, and page settings.';
  if (status === 401) return 'Your session has expired. Sign in again to view audit events.';
  if (status === 403) return 'You do not have permission to view these audit events.';
  if (status === 404) return 'This event is unavailable or outside your authorized scope.';
  if (status === 429) return 'Too many requests. Please wait before trying again.';
  return 'Unable to load audit data. Please try again.';
}
