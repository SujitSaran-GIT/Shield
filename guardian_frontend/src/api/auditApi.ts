// src/api/auditApi.js
import axiosInstance from './axiosConfig';
import type { AuditQuery, AuditPage, AuditRecord, AuditKPIsData } from '../features/audit/auditTypes';
import { auditQuery } from '../features/audit/auditRequests';

export const auditApi = {
  getAllAudits: (params: AuditQuery = {}, signal?: AbortSignal) => axiosInstance.get<AuditPage>('/audits', { params: auditQuery(params), signal }),
  getAuditDetails: (id: string, signal?: AbortSignal) => axiosInstance.get<AuditRecord>(`/audits/${encodeURIComponent(id)}`, { signal }),
  getFilteredAudits: (filters: AuditQuery, signal?: AbortSignal) =>
    axiosInstance.get<AuditPage>('/audits/filter', { params: auditQuery(filters), signal }),
  getAuditKPIs: (signal?: AbortSignal) => axiosInstance.get<AuditKPIsData>('/audits/kpis', { signal }),
  getRecentLogs: (days = 7, signal?: AbortSignal) =>
    axiosInstance.get<AuditRecord[]>('/audits/recent', { params: { days }, signal }),
};
