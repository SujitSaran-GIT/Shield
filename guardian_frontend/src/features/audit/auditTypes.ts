export interface AuditRecord {
  id: string; clientId?: string | null; clientName?: string | null;
  userId?: string | null; userEmail?: string | null; ipAddress?: string | null;
  location?: string | null; eventType: string; statusCode: number | null;
  details?: string | null; createdAt: string;
}
export interface AuditKPIsData { totalEvents: number; successfulEvents: number; failedEvents: number; successRate: number; failureRate: number }
export interface AuditFiltersState { eventType: string; clientId: string; ipAddress: string; startDate: string | null; endDate: string | null; sortBy: string; sortDir: string }
export interface AuditQuery { page?: number; size?: number; sortBy?: string; sortDir?: string; clientId?: string; eventType?: string; ipAddress?: string; startDate?: string | null; endDate?: string | null }
export interface AuditPage { content: AuditRecord[]; number: number; size: number; totalPages: number; totalElements: number }
