# CA Work Tool

A full-stack work management application for accounting and professional-services teams. It organizes clients, recurring and one-time engagements, templated tasks, role-based work assignment, review, and dashboard reporting.

## Project links

- **Live application:** [ca-work-tool.vercel.app](https://ca-work-tool.vercel.app/)
- **Backend API base:** [ca-work-tool-backend.onrender.com/api](https://ca-work-tool-backend.onrender.com/api)
- **API health endpoint:** [ca-work-tool-backend.onrender.com/api/health](https://ca-work-tool-backend.onrender.com/api/health)
- **Source repository:** [github.com/nitinyadav107/CAWorkTool](https://github.com/nitinyadav107/CAWorkTool)

## Assessment overview

The application models the core assessment domain: users, clients, service types, task templates, engagements, generated tasks, and audit history. An engagement uses the selected service's templates to create its tasks. Recurring work is generated for its service period and protected against duplicate client/service/period entries.

### Roles and access

| Role | Main capabilities |
|---|---|
| Admin | Manage users, clients, service types, and task templates; view and manage work across the application. |
| Manager | Create and manage engagements, assign work to team members, set task due dates, and review or approve work within the manager's scope. |
| Team Member | View assigned work, update its progress, and submit completed work for review. A team member cannot update another person's task or approve their own work. |

Access rules are enforced by the API as well as reflected in the interface. The task workflow supports `Not Started → In Progress → Ready for Review → Completed`, with `Waiting for Client` and `Changes Requested` paths for work that needs follow-up.

The dashboard reports open, overdue, due today, waiting-for-client, and waiting-for-review task counts, scoped to the signed-in user's role.

## Technology and architecture

- **Frontend:** React, TypeScript, Vite, React Router, Axios
- **Backend:** Node.js, Express, TypeScript, Zod
- **Database:** MongoDB with Mongoose
- **Authentication:** bcrypt password hashing and JWT bearer tokens with role-based authorization
- **Recurring work:** daily scheduled generation with transactional writes and a unique compound index to prevent duplicate periods
- **Deployment:** Vercel frontend, Render API, MongoDB replica-set-compatible database

See [Technical_Design_Note.md](Technical_Design_Note.md) for the data model, API validation, authorization, transaction and recurrence behavior, tests, trade-offs, and production scaling considerations.

## Run locally

### Prerequisites

- Node.js 18 or later and npm
- MongoDB 6 or later configured as a replica set, or MongoDB Atlas. Engagement/task/audit creation uses transactions, which require replica-set support.

Clone the repository and install the backend and frontend dependencies in their respective folders:

```sh
git clone https://github.com/nitinyadav107/CAWorkTool.git
cd CAWorkTool
cd backend
npm install
cd ../frontend
npm install
```

### Configure and start the backend

Create `backend/.env`:

```env
MONGO_URI=mongodb://localhost:27017/ca-work-tool?replicaSet=rs0
JWT_SECRET=replace_with_a_random_secret_at_least_32_characters_long
PORT=5000
```

Make sure the local MongoDB replica set is initialized and running, then choose one seed option from the `backend` directory:

```sh
npm run seed:admin
```

This creates or updates the initial admin account without clearing the database. Alternatively, to load the full sample dataset:

```sh
npm run seed:demo
```

**Warning:** `seed:demo` deletes existing users, clients, service types, templates, engagements, and tasks in the database configured by `MONGO_URI`, then inserts fictional sample records. Use only with a disposable development database.

Start the API from `backend`:

```sh
npm run dev
```

The local API defaults to `http://localhost:5000/api`; health check: `http://localhost:5000/api/health`.

### Configure and start the frontend

Create `frontend/.env` if the API is not at the default local URL:

```env
VITE_API_URL=http://localhost:5000/api
```

Start Vite from `frontend` in a second terminal:

```sh
npm run dev
```

Vite prints the local application URL when it starts.

## Demo accounts

After running `npm run seed:demo`, the sample accounts use the following password:

| Role | Email | Password |
|---|---|---|
| Admin | `admin@example.com` | `password123` |
| Manager | `ravi@example.com` | `password123` |
| Manager | `priya@example.com` | `password123` |
| Team Member | `amit@example.com` | `password123` |

These credentials are for local demonstration only. Do not use them for a production account; change seeded credentials and use a private, strong `JWT_SECRET` in deployed environments. The demo seed contains fictional sample records and is destructive to the configured database.

## API overview

Protected routes require `Authorization: Bearer <token>`; login and health are public.

| Area | Example endpoints | Access summary |
|---|---|---|
| Authentication | `POST /api/auth/login` | Public login; returns a JWT. |
| Dashboard | `GET /api/dashboard/metrics` | Authenticated; results are role-scoped. |
| Tasks | `GET /api/tasks`, `PATCH /api/tasks/:id` | Authenticated; team members are limited to assigned tasks and managers to their engagement scope. |
| Engagements | `GET /api/engagements`, `POST /api/engagements`, `PATCH /api/engagements/:id` | Authenticated; creation and management are scoped to authorized managers/admins. |
| Administration | `/api/admin/users`, `/api/admin/clients`, `/api/admin/service-types`, `/api/admin/templates` | Admin-only mutations; reference reads are available to authorized workflows. |
| Health | `GET /api/health` | Public service health check. |

The API validates request data and references, enforces task-state transitions and permissions, and returns HTTP errors for invalid or unauthorized actions. Creating an engagement and its generated tasks/audit event is transactional. Duplicate recurring periods are rejected by a database uniqueness constraint.

## Build and test

Run backend unit/controller tests and compile the backend:

```sh
cd backend
npm test -- --runInBand
npm run build
```

Build the frontend (TypeScript check plus production bundle):

```sh
cd frontend
npm run build
```

The backend suite covers role and manager scoping, workflow transitions and approvals, assignment validation, transactional engagement creation and rollback behavior, one-time period validation, recurring index definition, and protected client deletion. These tests use mocks; they do not replace a database-backed integration test of MongoDB transaction and scheduled-job behavior. More detail is in the technical design note.

## Deployment configuration

The frontend reads `VITE_API_URL` at build time and defaults to `http://localhost:5000/api`. For the deployed Vercel frontend, configure it as:

```env
VITE_API_URL=https://ca-work-tool-backend.onrender.com/api
```

Configure the backend deployment with `MONGO_URI` pointing to a replica-set-capable MongoDB database and `JWT_SECRET` containing at least 32 characters. The Render service supplies `PORT`. Keep production credentials private and do not run the destructive demo seed against production data.

## Scale considerations

The current task and engagement list endpoints do not implement cursor pagination. The design note describes pagination, measured index tuning, durable background jobs, dashboard precomputation, and monitoring as next steps for a workload of millions of tasks; these are not claimed as implemented features.
