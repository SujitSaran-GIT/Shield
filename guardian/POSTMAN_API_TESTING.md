# Guardian Authentication Platform - Postman API Testing Guide

## Overview
This document provides comprehensive API testing instructions for the Guardian Authentication Platform using Postman. The platform provides secure user authentication, client management, audit logging, and health monitoring capabilities.

## Base URL
```
http://localhost:6061
```

## Environment Setup in Postman
Create a new environment with the following variables:

| Variable | Initial Value | Description |
|----------|---------------|-------------|
| `base_url` | `http://localhost:6061` | Base URL for all API calls |
| `client_id` | `` | Client ID obtained from client registration |
| `client_key` | `` | Client Key obtained from client registration |
| `access_token` | `` | JWT access token from login/register |
| `refresh_token` | `` | JWT refresh token from login/register |
| `user_id` | `` | User ID for user-specific operations |

## Authentication Flow

### Step 1: Register a Client (GUARDIAN_ADMIN Required)
**Note:** This step requires existing GUARDIAN_ADMIN credentials. For initial setup, you may need to manually create a client in the database or adjust security settings temporarily.

**Endpoint:** `POST {{base_url}}/api/admin/clients`

**Headers:**
```
Content-Type: application/json
Authorization: Bearer {{access_token}}
```

**Request Body:**
```json
{
  "email": "client@example.com",
  "name": "Test Client",
  "description": "Client for API testing",
  "allowedOrigins": ["http://localhost:3000"],
  "idleTimeout": 3600
}
```

**Response:**
```json
{
  "clientId": "generated-client-id",
  "clientKey": "generated-client-key",
  "message": "Store these credentials securely. The client key cannot be retrieved again."
}
```

**Post-Response Script (Add to Tests tab):**
```javascript
pm.environment.set("client_id", pm.response.json().clientId);
pm.environment.set("client_key", pm.response.json().clientKey);
```

### Step 2: Register a User
**Endpoint:** `POST {{base_url}}/api/auth/register`

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "username": "testuser",
  "email": "test@example.com",
  "password": "password123",
  "clientId": "{{client_id}}",
  "clientKey": "{{client_key}}"
}
```

**Response:**
```json
{
  "accessToken": "jwt-access-token",
  "refreshToken": "jwt-refresh-token",
  "user": {
    "id": "user-id",
    "username": "testuser",
    "email": "test@example.com",
    "roles": ["USER"],
    "isBlocked": false,
    "createdAt": "2025-01-01T00:00:00",
    "lastLoginAt": "2025-01-01T00:00:00"
  }
}
```

**Post-Response Script:**
```javascript
pm.environment.set("access_token", pm.response.json().accessToken);
pm.environment.set("refresh_token", pm.response.json().refreshToken);
pm.environment.set("user_id", pm.response.json().user.id);
```

### Alternative: Register Admin User
**Endpoint:** `POST {{base_url}}/api/auth/register/admin`

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "username": "adminuser",
  "email": "admin@example.com",
  "password": "adminpassword123",
  "adminRole": "GUARDIAN_ADMIN"
}
```

**Response:** Same as user registration response.

**Note:** Valid adminRole values are "GUARDIAN_ADMIN" and "CLIENT_ADMIN".

### Step 3: Login (Alternative to Registration)
**Endpoint:** `POST {{base_url}}/api/auth/login`

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "test@example.com",
  "password": "password123",
  "clientId": "{{client_id}}",
  "clientKey": "{{client_key}}"
}
```

**Response:** Same as registration response above.

### Alternative: Guardian Admin Login (No Client Credentials Required)
**Endpoint:** `POST {{base_url}}/api/auth/login/admin`

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "admin@example.com",
  "password": "adminpassword123"
}
```

**Response:**
```json
{
  "id": "user-id",
  "email": "admin@example.com",
  "accessToken": "jwt-access-token",
  "refreshToken": "jwt-refresh-token",
  "message": "Admin Login Successful"
}
```

**Note:** This endpoint is specifically for GUARDIAN_ADMIN users only.

## API Endpoints

### Authentication Endpoints

#### Refresh Token
**Endpoint:** `POST {{base_url}}/api/auth/refresh`

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "refreshToken": "{{refresh_token}}",
  "clientId": "{{client_id}}"
}
```

**Response:**
```json
{
  "accessToken": "new-jwt-access-token",
  "refreshToken": "new-jwt-refresh-token"
}
```

#### Logout
**Endpoint:** `POST {{base_url}}/api/auth/logout`

**Headers:**
```
Authorization: Bearer {{access_token}}
```

**Response:**
```json
{
  "message": "Logout successful"
}
```

### User Management Endpoints
**Note:** These endpoints require GUARDIAN_ADMIN or CLIENT_ADMIN role.

#### Get All Users
**Endpoint:** `GET {{base_url}}/api/users?page=0&size=10&sortBy=createdAt&sortDir=DESC`

**Headers:**
```
Authorization: Bearer {{access_token}}
```

**Response:**
```json
{
  "content": [
    {
      "id": "user-id",
      "username": "username",
      "email": "email@example.com",
      "roles": ["USER"],
      "isBlocked": false,
      "createdAt": "2025-01-01T00:00:00",
      "lastLoginAt": "2025-01-01T00:00:00"
    }
  ],
  "pageable": {
    "pageNumber": 0,
    "pageSize": 10,
    "sort": {
      "sorted": true,
      "unsorted": false,
      "empty": false
    },
    "offset": 0,
    "paged": true,
    "unpaged": false
  },
  "totalElements": 1,
  "totalPages": 1,
  "last": true,
  "first": true,
  "numberOfElements": 1,
  "sort": {
    "sorted": true,
    "unsorted": false,
    "empty": false
  },
  "empty": false
}
```

#### Search Users
**Endpoint:** `GET {{base_url}}/api/users/search?query=test&page=0&size=10`

**Headers:**
```
Authorization: Bearer {{access_token}}
```

#### Get User by ID
**Endpoint:** `GET {{base_url}}/api/users/{{user_id}}`

**Headers:**
```
Authorization: Bearer {{access_token}}
```

#### Get User Sessions
**Endpoint:** `GET {{base_url}}/api/users/{{user_id}}/sessions`

**Headers:**
```
Authorization: Bearer {{access_token}}
```

#### Block User
**Endpoint:** `PUT {{base_url}}/api/users/{{user_id}}/block`

**Headers:**
```
Authorization: Bearer {{access_token}}
```

**Response:**
```json
{
  "message": "User blocked successfully"
}
```

#### Unblock User
**Endpoint:** `PUT {{base_url}}/api/users/{{user_id}}/unblock`

**Headers:**
```
Authorization: Bearer {{access_token}}
```

**Response:**
```json
{
  "message": "User unblocked successfully"
}
```

### Client Management Endpoints
**Note:** These endpoints require GUARDIAN_ADMIN role.

#### Get All Clients
**Endpoint:** `GET {{base_url}}/api/admin/clients`

**Headers:**
```
Authorization: Bearer {{access_token}}
```

**Response:**
```json
[
  {
    "id": "client-id",
    "clientId": "public-client-id",
    "email": "client@example.com",
    "name": "Client Name",
    "description": "Client Description",
    "allowedOrigins": ["http://localhost:3000"],
    "idleTimeout": 3600,
    "status": "ACTIVE",
    "createdAt": "2025-01-01T00:00:00"
  }
]
```

#### Get Client by ID
**Endpoint:** `GET {{base_url}}/api/admin/clients/{client-id}`

**Headers:**
```
Authorization: Bearer {{access_token}}
```

#### Update Client
**Endpoint:** `PUT {{base_url}}/api/admin/clients/{client-id}`

**Headers:**
```
Authorization: Bearer {{access_token}}
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Updated Client Name",
  "description": "Updated description",
  "allowedOrigins": ["http://localhost:3000", "http://localhost:5173"],
  "idleTimeout": 7200
}
```

#### Deactivate Client
**Endpoint:** `PUT {{base_url}}/api/admin/clients/{client-id}/deactivate`

**Headers:**
```
Authorization: Bearer {{access_token}}
```

**Response:**
```json
{
  "message": "Client deactivated successfully"
}
```

#### Activate Client
**Endpoint:** `PUT {{base_url}}/api/admin/clients/{client-id}/activate`

**Headers:**
```
Authorization: Bearer {{access_token}}
```

**Response:**
```json
{
  "message": "Client activated successfully"
}
```

### Admin Management Endpoints
**Note:** These endpoints require GUARDIAN_ADMIN role.

#### Register Admin
**Endpoint:** `POST {{base_url}}/api/admin/register`

**Headers:**
```
Authorization: Bearer {{access_token}}
Content-Type: application/json
```

**Request Body:**
```json
{
  "username": "newadmin",
  "email": "newadmin@example.com",
  "password": "adminpassword123",
  "adminRole": "CLIENT_ADMIN"
}
```

**Response:**
```json
{
  "admin": {
    "id": "admin-id",
    "username": "newadmin",
    "email": "newadmin@example.com",
    "roles": ["CLIENT_ADMIN"],
    "isBlocked": false,
    "createdAt": "2025-01-01T00:00:00",
    "lastLoginAt": null
  },
  "message": "Admin account created successfully"
}
```

#### Get Admin by ID
**Endpoint:** `GET {{base_url}}/api/admin/admins/{admin-id}`

**Headers:**
```
Authorization: Bearer {{access_token}}
```

#### Update Admin Role
**Endpoint:** `PUT {{base_url}}/api/admin/admins/{admin-id}/role`

**Headers:**
```
Authorization: Bearer {{access_token}}
Content-Type: application/json
```

**Request Body:**
```json
{
  "newAdminRole": "GUARDIAN_ADMIN"
}
```

**Response:**
```json
{
  "admin": {
    "id": "admin-id",
    "username": "newadmin",
    "email": "newadmin@example.com",
    "roles": ["GUARDIAN_ADMIN"],
    "isBlocked": false,
    "createdAt": "2025-01-01T00:00:00",
    "lastLoginAt": "2025-01-01T00:00:00"
  },
  "message": "Admin role updated successfully"
}
```

#### Deactivate Admin
**Endpoint:** `PUT {{base_url}}/api/admin/admins/{admin-id}/deactivate`

**Headers:**
```
Authorization: Bearer {{access_token}}
```

**Response:**
```json
{
  "message": "Admin deactivated successfully"
}
```

#### Activate Admin
**Endpoint:** `PUT {{base_url}}/api/admin/admins/{admin-id}/activate`

**Headers:**
```
Authorization: Bearer {{access_token}}
```

**Response:**
```json
{
  "message": "Admin activated successfully"
}
```

### Audit Endpoints
**Note:** These endpoints require GUARDIAN_ADMIN or CLIENT_ADMIN role.

#### Get All Audits
**Endpoint:** `GET {{base_url}}/api/admin/audits?page=0&size=20&sortBy=createdAt&sortDir=DESC`

**Headers:**
```
Authorization: Bearer {{access_token}}
```

**Response:**
```json
{
  "content": [
    {
      "id": "audit-id",
      "eventType": "LOGIN_SUCCESS",
      "clientId": "client-id",
      "userId": "user-id",
      "ipAddress": "127.0.0.1",
      "userAgent": "PostmanRuntime/7.32.0",
      "location": "Local",
      "details": "User logged in successfully",
      "createdAt": "2025-01-01T00:00:00"
    }
  ],
  "pageable": {...},
  "totalElements": 1,
  "totalPages": 1,
  "last": true,
  "first": true,
  "numberOfElements": 1,
  "sort": {...},
  "empty": false
}
```

#### Filter Audits
**Endpoint:** `GET {{base_url}}/api/admin/audits/filter?clientId={{client_id}}&eventType=LOGIN_SUCCESS&ipAddress=127.0.0.1&startDate=2025-01-01T00:00:00&endDate=2025-12-31T23:59:59&page=0&size=20`

**Headers:**
```
Authorization: Bearer {{access_token}}
```

**Query Parameters:**
- `clientId` (optional): Filter by client ID
- `eventType` (optional): Filter by event type (LOGIN_SUCCESS, LOGIN_FAILED, etc.)
- `ipAddress` (optional): Filter by IP address
- `startDate` (optional): Start date in ISO format (defaults to 30 days ago)
- `endDate` (optional): End date in ISO format (defaults to now)
- `page` (optional): Page number (default: 0)
- `size` (optional): Page size (default: 20)

#### Get Audit KPIs
**Endpoint:** `GET {{base_url}}/api/admin/audits/kpis`

**Headers:**
```
Authorization: Bearer {{access_token}}
```

**Response:**
```json
{
  "totalEvents": 100,
  "eventsLast24Hours": 10,
  "eventsByType": {
    "LOGIN_SUCCESS": 50,
    "LOGIN_FAILED": 20,
    "LOGOUT": 30
  },
  "topIpAddresses": [
    {
      "ipAddress": "127.0.0.1",
      "count": 25
    }
  ]
}
```

#### Get Recent Logs
**Endpoint:** `GET {{base_url}}/api/admin/audits/recent?days=7`

**Headers:**
```
Authorization: Bearer {{access_token}}
```

### Health Endpoints

#### Get Health Metrics
**Endpoint:** `GET {{base_url}}/api/health/metrics`

**Response:**
```json
{
  "uptime": "1 day, 2 hours",
  "totalUsers": 10,
  "activeUsers": 5,
  "totalSessions": 15,
  "activeSessions": 8,
  "totalClients": 3,
  "activeClients": 3,
  "memoryUsage": "256 MB / 512 MB",
  "cpuUsage": "15%",
  "databaseConnections": "5 / 20",
  "redisConnections": "2 / 10"
}
```

#### Get Status
**Endpoint:** `GET {{base_url}}/api/health/status`

**Response:**
```json
{
  "status": "OK",
  "message": "Guardian Auth Platform is running"
}
```

### Actuator Endpoints
Spring Boot Actuator endpoints are available at `/actuator/*`

#### Health Check
**Endpoint:** `GET {{base_url}}/actuator/health`

#### Application Metrics
**Endpoint:** `GET {{base_url}}/actuator/metrics`

#### Prometheus Metrics
**Endpoint:** `GET {{base_url}}/actuator/prometheus`

## Error Responses
Common error response format:
```json
{
  "timestamp": "2025-01-01T00:00:00",
  "status": 400,
  "error": "Bad Request",
  "message": "Validation failed",
  "path": "/api/auth/register"
}
```

## Rate Limiting
The API implements rate limiting:
- Login: 5 attempts per 5 minutes, retry after 30 minutes
- Registration: 5 successful registrations per minute, retry after 15 minutes

Rate limited responses include:
```
HTTP 429 Too Many Requests
X-Rate-Limit-Remaining: 0
X-Rate-Limit-Retry-After: 1800
```

## Testing Tips
1. Always test authentication flow first
2. Use environment variables for dynamic values
3. Test error scenarios with invalid tokens/data
4. Verify rate limiting by making repeated requests
5. Check audit logs after operations
6. Monitor health metrics during load testing

## Import Collection
You can import this guide into Postman by creating a new collection and adding the endpoints with the provided examples. Remember to set up the environment variables as described above.
