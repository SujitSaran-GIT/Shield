// src/types/index.ts
export interface User {
  id: string;
  username: string;
  email: string;
  clientName: string;
  role: 'USER' | 'CLIENT_ADMIN' | 'SUPER_ADMIN' | 'GUARDIAN_ADMIN';
  status: 'ACTIVE' | 'BLOCKED' | 'SUSPENDED' | 'DELETED';
  createdAt: string;
  lastLoginAt?: string;
  lastLoginIp?: string;
  lastLoginLocation?: string;
  activeSessions?: number;
}

export interface Client {
  id: string;
  clientId: string;
  name: string;
  description: string;
  email?: string;
  allowedOrigins: string[];
  idleTimeout: number;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  userCount: number;
}

export interface AuditLog {
  id: string;
  clientId: string;
  clientName: string;
  userEmail: string;
  userId?: string;
  ipAddress: string;
  location?: {
    city: string;
    region?: string;
    country: string;
  };
  eventType: string;
  statusCode: string;
  details?: string;
  createdAt: string;
  updatedAt?: string;
  duration?: number;
  userAgent?: string;
  metadata?: Record<string, unknown>;
  relatedEvents?: AuditLog[];
  source?: string;
}

export interface HealthMetric {
  systemStatus: 'UP' | 'DOWN';
  database: boolean;
  apiLatency: number;
  authenticationHealth: boolean;
  errorRate: number;
  loginPerHour: number;
  signupPerHour: number;
  activeSessions: number;
}

export interface DashboardMetrics {
  totalClients: number;
  activeClients: number;
  totalUsers: number;
  activeUsers: number;
  userGrowth?: number;
  clientGrowth?: number;
  totalEvents?: number;
  eventGrowth?: number;
  successRate?: number;
  successRateChange?: number;
  loginData: { date: string; count: number }[];
  registrationData: { date: string; count: number }[];
  auditData: { date: string; count: number }[];
}

export interface ActivityData {
  dailyActivities: DailyActivity[];
}

export interface DailyActivity {
  date: string;
  eventCount: number;
  successfulEvents: number;
  failedEvents: number;
}
