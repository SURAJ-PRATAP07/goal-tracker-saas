# Enterprise Goal Setting & Tracking Portal — Backend API

## Tech Stack
- **Runtime**: Node.js 18+
- **Framework**: Express.js 4.x
- **Database**: PostgreSQL 14+
- **Auth**: JWT (Access + Refresh tokens)
- **Validation**: express-validator
- **Logging**: Winston + Morgan

---

## Quick Start

```bash
# 1. Install dependencies
cd server && npm install

# 2. Configure environment
cp .env.example .env
# Fill in DB credentials and JWT secrets

# 3. Run migrations
npm run db:migrate

# 4. Seed test data
npm run db:seed

# 5. Start server
npm run dev
```

**Default credentials (after seeding):**
| Role     | Email                    | Password      |
|----------|--------------------------|---------------|
| Admin    | admin@company.com        | Admin@123     |
| Manager  | manager@company.com      | Manager@123   |
| Employee | employee@company.com     | Employee@123  |

---

## Folder Structure

```
server/
├── index.js              # Entry point
├── app.js                # Express app + middleware setup
├── config/
│   ├── database.js       # PG connection pool
│   ├── migrate.js        # Schema migrations
│   └── seed.js           # Test data seeder
├── routes/               # Route definitions + validation rules
│   ├── auth.routes.js
│   ├── user.routes.js
│   ├── goal.routes.js
│   ├── checkIn.routes.js
│   ├── report.routes.js
│   └── audit.routes.js
├── controllers/          # Request handlers
│   ├── auth.controller.js
│   ├── user.controller.js
│   ├── goal.controller.js
│   ├── checkIn.controller.js
│   ├── report.controller.js
│   └── audit.controller.js
├── middleware/
│   ├── auth.middleware.js    # JWT verify + RBAC
│   ├── audit.middleware.js   # Audit logging
│   └── errorHandler.js      # Global error handler
├── models/               # Database query functions
│   ├── auth.model.js
│   ├── user.model.js
│   ├── goal.model.js
│   ├── checkIn.model.js
│   └── report.model.js
├── services/
│   ├── notification.service.js
│   └── goalValidation.service.js
└── utils/
    ├── logger.js
    ├── jwt.js
    ├── response.js
    └── validation.js
```

---

## API Reference

### Base URL: `http://localhost:5000/api/v1`

All protected endpoints require: `Authorization: Bearer <accessToken>`

---

### Auth

| Method | Endpoint                    | Roles      | Description              |
|--------|-----------------------------|------------|--------------------------|
| POST   | /auth/register              | Admin      | Create user              |
| POST   | /auth/login                 | Public     | Login → tokens           |
| POST   | /auth/refresh               | Public     | Refresh access token     |
| POST   | /auth/logout                | All        | Invalidate refresh token |
| GET    | /auth/me                    | All        | Get own profile          |
| PATCH  | /auth/change-password       | All        | Change password          |

---

### Users

| Method | Endpoint                    | Roles         | Description          |
|--------|-----------------------------|---------------|----------------------|
| GET    | /users                      | Manager/Admin | List users           |
| GET    | /users/team                 | Manager/Admin | Get team members     |
| GET    | /users/:id                  | All*          | Get user by ID       |
| PATCH  | /users/:id                  | All*          | Update user profile  |
| PATCH  | /users/:id/status           | Admin         | Activate/suspend     |
| PATCH  | /users/:id/role             | Admin         | Change role          |

---

### Goals

| Method | Endpoint                        | Roles         | Description            |
|--------|---------------------------------|---------------|------------------------|
| POST   | /goals                          | Employee      | Create goal (draft)    |
| GET    | /goals                          | All           | List goals             |
| GET    | /goals/stats                    | All           | Goal statistics        |
| GET    | /goals/pending-approvals        | Manager/Admin | Goals awaiting approval|
| GET    | /goals/:id                      | All*          | Get goal details       |
| PATCH  | /goals/:id                      | Employee/Admin| Update draft goal      |
| DELETE | /goals/:id                      | Employee/Admin| Cancel draft goal      |
| POST   | /goals/:id/submit               | Employee      | Submit for approval    |
| POST   | /goals/:id/approve              | Manager/Admin | Approve goal           |
| POST   | /goals/:id/reject               | Manager/Admin | Reject with reason     |
| PATCH  | /goals/:id/progress             | Employee      | Update progress        |
| POST   | /goals/:id/key-results          | Employee      | Add key result         |
| PATCH  | /goals/:id/key-results/:krId    | Employee      | Update key result      |

---

### Check-ins (Quarterly)

| Method | Endpoint                                | Roles         | Description              |
|--------|-----------------------------------------|---------------|--------------------------|
| POST   | /check-ins                              | Employee      | Record check-in          |
| GET    | /check-ins                              | All           | List check-ins           |
| GET    | /check-ins/:id                          | All*          | Get check-in             |
| PATCH  | /check-ins/:id/feedback                 | Manager/Admin | Add manager feedback     |
| GET    | /check-ins/goals/:goalId/progress       | All*          | Goal progress timeline   |

---

### Reports

| Method | Endpoint                          | Roles         | Description            |
|--------|-----------------------------------|---------------|------------------------|
| GET    | /reports/dashboard                | Admin         | Admin overview         |
| GET    | /reports/team                     | Manager/Admin | Team report            |
| GET    | /reports/department               | Admin         | Dept-level summary     |
| GET    | /reports/scorecard/:employeeId    | All*          | Employee scorecard     |
| GET    | /reports/cycles                   | All           | List goal cycles       |
| POST   | /reports/cycles                   | Admin         | Create cycle           |
| PATCH  | /reports/cycles/:id/activate      | Admin         | Activate cycle         |

---

### Audit Logs

| Method | Endpoint                            | Roles | Description         |
|--------|-------------------------------------|-------|---------------------|
| GET    | /audit-logs                         | Admin | Searchable log list |
| GET    | /audit-logs/entity/:type/:id        | Admin | Entity audit trail  |

---

## Business Rules

| Rule                         | Detail                                                 |
|------------------------------|--------------------------------------------------------|
| Max goals per cycle          | 8 goals per employee per quarter                       |
| Min goal weightage           | 10% per goal                                           |
| Total weightage for submit   | Must equal exactly 100% before submission              |
| Goal lifecycle               | draft → submitted → approved/rejected → in_progress → completed |
| Edit restriction             | Goals only editable in `draft` or `rejected` state     |
| Delete restriction           | Only `draft` goals can be deleted (soft cancel)        |
| Manager scope                | Managers only see/approve their own team's goals       |
| Password policy              | Min 8 chars, uppercase, lowercase, number, special char|

---

## Standard Response Format

```json
{
  "success": true,
  "message": "Success",
  "data": { ... }
}
```

**Paginated response:**
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1, "limit": 20, "total": 100,
    "totalPages": 5, "hasNext": true, "hasPrev": false
  }
}
```

**Error response:**
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [{ "field": "email", "message": "Valid email required" }]
}
```
