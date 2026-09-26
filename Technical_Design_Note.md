# Technical Design Note

## 1. Architecture

The application is a React and TypeScript single-page frontend backed by an Express and TypeScript REST API. MongoDB stores the domain records through Mongoose. The frontend sends a bearer JWT with API requests. The backend is the source of truth for authorization, input validation and task workflow decisions.

The backend is organized into route, controller, middleware, model and service layers. Routes authenticate and authorize requests, controllers validate and coordinate operations, Mongoose models describe stored entities and indexes, and the recurring service contains scheduled generation logic. A shared error middleware converts validation, cast and duplicate-key errors into HTTP responses.

The local setup runs the Vite development server and the Express API separately. The API connects to MongoDB before it begins listening. The recurring job runs daily. No hosted deployment is configured in this submission; deployment requires environment-specific frontend and API hosting plus a MongoDB replica set.

## 2. Data model and relationships

MongoDB uses each document's `_id` as its primary key. Mongoose references below act as foreign keys; request handlers validate important referenced records before creating or assigning work.

| Entity | Main fields and relationships |
|---|---|
| User | Name, unique email, password hash, role (`Admin`, `Manager`, `TeamMember`) |
| Client | Name, contact email and industry |
| ServiceType | Name, recurrence flag and frequency (`None`, `Monthly`, `Yearly`) |
| TaskTemplate | Service type reference, task name, description and ordering |
| Engagement | Client, service type and manager references; status and optional period |
| Task | Engagement and optional template, assignee and reviewer references; status, name and due date |
| AuditLog | Entity type/id, action, actor and optional details; timestamps record when the event occurred |

One client can have many engagements. A service type can have many templates and engagements. Each engagement generates tasks from its service's templates. Users can manage or be assigned to work according to role. Audit entries retain task status, assignee and due-date changes, as well as engagement creation.

Indexes include the unique user email, task engagement and due-date indexes, a compound task assignee/status/due-date index, and a unique compound engagement index over client/service/period for string periods. One-time engagements store a null period and are excluded from the recurring uniqueness index. The backend creates this critical index on database connection; the partial filter uses MongoDB's supported `$type` operator.

## 3. API, validation and errors

The API exposes login, dashboard metrics, task listing and updates, engagement listing, creation and status updates, and admin endpoints for users, clients, service types and templates. Admin-only routes support user/client creation, edits and deletion; deletions are blocked while records are referenced by tasks or engagements. Managers can read the users/clients/services/templates required by their workflows; engagement and task queries are scoped to engagements owned by the requesting manager. Team members only list and update their own assigned tasks.

Zod validates login, entity creation, engagement periods, task status, assignee IDs and due dates. Mongoose validates persisted document shapes. The engagement handler confirms that the client, service type and manager exist, that the manager has the correct role, and that period format matches recurrence frequency. It refuses to create engagements without templates. Task updates validate assignees as existing team members and restrict managers to their own engagements.

The error middleware returns 400 for malformed request data, 401 for missing or invalid authentication, 403 for disallowed roles/actions, 404 for missing records, 409 for duplicate keys and 500 for unexpected server errors. JWT signing requires a configured secret of at least 32 characters; there is no fallback signing key.

## 4. Authentication, authorization and workflow

Passwords are hashed with bcrypt. Successful login issues a one-day JWT containing the user id and role. Authentication middleware verifies the token before protected routes run. Role middleware protects admin-only operations and engagement access.

The backend state machine supports `Not Started -> In Progress`, `In Progress -> Waiting for Client` or `Ready for Review`, `Waiting for Client -> In Progress`, `Ready for Review -> Changes Requested` or `Completed`, and `Changes Requested -> In Progress`. Completed tasks are terminal. Only admins/managers can approve or request changes, and a user cannot review their own task. The task UI offers only valid next statuses and gives managers/admins assignment and due-date controls; API checks still apply if a client bypasses the UI.

## 5. Engagement creation and recurring generation

Creating an engagement validates its references and recurrence period, starts a MongoDB transaction, inserts the engagement, creates tasks from ordered templates, writes an audit event and commits. Any failure aborts the transaction so the engagement is not left without its generated tasks.

The daily cron service selects recurring services and derives either the current `YYYY-MM` month or `YYYY` year. It considers clients with an earlier recurring engagement, then creates the next engagement, tasks and audit event in one transaction. The unique client/service/period index makes repeated runs idempotent: a duplicate-key error aborts that attempt and is skipped. Other errors are logged; the transaction is aborted so a partial engagement is not retained. Task assignments and deadlines can be set by managers after generation.

## 6. Tests

The backend Jest suite currently covers:

- Rejection of a team member updating another person's task.
- Rejection of a manager updating a task in another manager's engagement.
- Rejection of self-approval.
- Rejection of an invalid task transition.
- Successful manager approval.
- Rejection of assignment to a non-team-member role.
- Engagement/task creation within a transaction.
- Transaction rollback when engagement creation fails.
- Rejection of a period on one-time services.
- Successful one-time engagement creation without a period.
- Presence and shape of the recurring unique-index definition.
- Protection against deleting a client that still has engagements.

These are automated controller/model tests using mocks; they do not replace a database-backed integration test of MongoDB transactions and recurring-job execution.

## 7. Production considerations at five million tasks

At larger scale, use compound indexes chosen from measured query plans, likely including status and due date for manager dashboards and engagement/assignee filters. Keep index creation in a reviewed migration process and monitor index size and write cost. Add cursor pagination to task and engagement listings, with a stable sort key, instead of returning an unbounded result set. Move recurring generation to a durable background queue with leases/retries and idempotency keys if the workload or deployment becomes multi-region. Precompute or cache dashboard counts where aggregate latency warrants it, while preserving role-based scopes. Add structured logs, request correlation IDs, error tracking, queue metrics, database monitoring and alerts for failed generation or index creation.

## 8. Trade-offs

1. **MongoDB with Mongoose:** flexible service templates and a small implementation surface suit this prototype; schema validation and explicit indexes provide basic structure. A relational database would offer stronger built-in relational constraints if cross-entity reporting grows.
2. **Transactions for engagement generation:** a multi-document transaction prevents orphaned engagements/tasks/audit rows. This requires MongoDB replica-set support and has higher cost than independent writes.
3. **Daily cron plus a unique period index:** a simple scheduler is easy to operate for this assignment, while the database constraint handles repeated runs. A durable queue is preferable when generation volume, retry visibility or multiple worker instances increase.
