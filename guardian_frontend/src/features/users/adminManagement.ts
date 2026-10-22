import axios from 'axios';
import type { User } from '../../types';

export const adminRoles = ['SUPER_ADMIN', 'GUARDIAN_ADMIN', 'CLIENT_ADMIN'] as const;
export const roleUnavailable = 'Role changes are unavailable. Administrative privileges require verified invitation provisioning.';
export function canManageAdministrator(actor: User | null, target: User): boolean {
  return !!actor && ['SUPER_ADMIN', 'GUARDIAN_ADMIN'].includes(actor.role)
    && adminRoles.some(role => role === target.role);
}
export function administratorAction(actor: User | null, target: User): 'activate' | 'deactivate' | null {
  if (!canManageAdministrator(actor, target) || actor?.id === target.id) return null;
  if (target.status === 'ACTIVE') return 'deactivate';
  if (target.status === 'SUSPENDED' || target.status === 'BLOCKED') return 'activate';
  return null;
}
// Do not expose arbitrary backend messages, stack traces, or transport details.
export function adminError(error: unknown): string {
  const status = axios.isAxiosError(error) ? error.response?.status : undefined;
  if (status === 400) return 'This administrator request is invalid. Refresh the record and try again.';
  if (status === 401) return 'Your session has expired. Sign in again to continue.';
  if (status === 403) return 'You do not have permission to manage this administrator.';
  if (status === 429) return 'Too many attempts. Please wait before trying again.';
  if (status && status >= 500) return 'Shield could not complete the request. Please try again later.';
  return 'Unable to complete the administrator request. Please try again.';
}
