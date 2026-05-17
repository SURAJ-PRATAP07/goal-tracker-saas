# GoalTracker – Enterprise Goal Setting & Tracking Portal

An enterprise-grade Goal Setting & Tracking Portal built for organizational performance management, quarterly reviews, and analytics-driven employee evaluation.

The platform enables Employees, Managers, and Admins to collaboratively manage goals, approvals, quarterly progress tracking, reporting, and enterprise analytics through a modern SaaS-style dashboard experience.

---

# 🚀 Live Demo

## Frontend

```text id="n4x8qt"
[YOUR_VERCEL_URL]
```

## Backend API

```text id="w8z2yr"
[YOUR_RENDER_URL]
```

---

# 👥 Demo Credentials

| Role     | Email                                         | Password |
| -------- | --------------------------------------------- | -------- |
| Admin    | [admin@test.com](mailto:admin@test.com)       | Test@123 |
| Manager  | [manager@test.com](mailto:manager@test.com)   | Test@123 |
| Employee | [employee@test.com](mailto:employee@test.com) | Test@123 |

---

# 📌 Problem Statement

Organizations often manage employee goals and performance tracking using spreadsheets, emails, and disconnected systems, leading to:

* Lack of visibility
* Inefficient approval workflows
* No centralized analytics
* Poor quarterly tracking
* Limited accountability
* Manual reporting overhead

GoalTracker solves these problems by providing a centralized enterprise platform for goal management, approvals, analytics, and quarterly performance tracking.

---

# ✨ Features

## 🔐 Authentication & Role-Based Access

* JWT Authentication
* Role-based dashboards
* Secure route protection
* Admin / Manager / Employee workflows

---

## 🎯 Goal Management

* Create and manage goals
* Weightage validation
* Shared goals support
* Goal locking after approval
* Goal submission workflow

---

## 👨‍💼 Manager Workflow

* Approve/reject employee goals
* Team progress monitoring
* Shared KPI assignment
* Quarterly check-in reviews
* Manager comments & feedback

---

## 📊 Analytics & Dashboards

* Real-time KPI dashboards
* Quarterly trend analytics
* Department performance charts
* Leaderboards
* Goal completion analytics
* Progress heatmaps

---

## 📅 Quarterly Check-ins

* Q1/Q2/Q3/Q4 progress tracking
* Planned vs actual updates
* Status tracking
* Timeline monitoring
* Window-based submission restrictions

---

## 📝 Audit Logging

* Action tracking
* Goal update history
* Approval/rejection logs
* Exportable audit reports
* Search & filter support

---

## 📤 Reports & Exports

* CSV Export
* Excel Export
* Department reports
* Performance summaries
* Quarterly reports

---

# 🏗️ System Architecture

```text id="v0k8qp"
Next.js Frontend
        ↓
Express.js Backend API
        ↓
Neon PostgreSQL Database
```

Additional Components:

* JWT Authentication
* RBAC Authorization
* Analytics Engine
* Export Service
* Audit Logging System

---

# 🛠️ Tech Stack

## Frontend

* Next.js
* TypeScript
* Tailwind CSS
* Recharts
* Axios

## Backend

* Node.js
* Express.js
* JWT Authentication
* REST APIs

## Database

* PostgreSQL
* Neon Database

## Deployment

* Vercel (Frontend)
* Render (Backend)

---

# 📂 Project Structure

```text id="s2r9mw"
├── app/
├── components/
├── hooks/
├── lib/
├── styles/
├── server/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── services/
│   └── utils/
```

---

# ⚙️ Local Setup

## 1. Clone Repository

```bash id="j4v8pd"
git clone [YOUR_GITHUB_REPO]
cd goaltracker
```

---

## 2. Install Frontend Dependencies

```bash id="q1m9az"
npm install
```

---

## 3. Install Backend Dependencies

```bash id="m8w2cl"
cd server
npm install
```

---

## 4. Configure Environment Variables

Create `.env` inside `server/`

```env id="k7p3rt"
PORT=5000

DB_HOST=
DB_PORT=5432
DB_NAME=
DB_USER=
DB_PASSWORD=

JWT_SECRET=
JWT_REFRESH_SECRET=
```

---

## 5. Start Backend

```bash id="n7z5yb"
cd server
npm run dev
```

---

## 6. Start Frontend

```bash id="u3k9dx"
npm run dev
```

---

# 📸 Screenshots

## Employee Dashboard

* Goal creation
* Quarterly check-ins
* KPI tracking

## Manager Dashboard

* Team analytics
* Goal approvals
* Shared goals

## Admin Dashboard

* Reports
* Audit logs
* Organization analytics

---

# 🔒 Validation Rules

* Total goal weightage must equal 100%
* Minimum individual goal weightage = 10%
* Maximum 8 goals per employee
* Shared goals are partially editable only
* Quarterly submissions restricted by cycle windows

---

# 📈 Future Scope

* Microsoft Entra ID Integration
* Microsoft Teams Notifications
* AI-based performance insights
* Predictive analytics
* Mobile application
* Email escalation workflows

---

# 👨‍💻 Contributors

Developed as part of a Hackathon project for enterprise goal management and analytics.

---

# 📄 License

This project is intended for educational and hackathon demonstration purposes.
