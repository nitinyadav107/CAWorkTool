# CA Work Tool - Task & Engagement Management

A full-stack enterprise-grade application for managing professional services tasks and engagements, built as per the Full Stack Developer Technical Assignment.

## 🔗 Submission Links

- **Live Application Link:** [Insert your deployed Vercel/Render URL here]
- **Source-code Repository:** [Insert your GitHub/GitLab URL here]

## 🔑 Demo Credentials

Use these credentials to log in and test the live application. (Role-based access control is strictly enforced on the server-side).

- **Admin (Superuser):**
  - Email: `admin@example.com`
  - Password: `password123`
- **Manager (Creates Engagements & Reviews Tasks):**
  - Email: `ravi@example.com`
  - Password: `password123`
- **Team Member (Executes Tasks):**
  - Email: `amit@example.com`
  - Password: `password123`

---

## 🛠 Technology Stack

- **Frontend:** React, TypeScript, Vite, CSS (Glassmorphism UI)
- **Backend:** Node.js, Express, TypeScript
- **Database:** MongoDB with Mongoose (Utilizes multi-document transactions)
- **Validation:** Zod
- **Authentication:** JWT (JSON Web Tokens)
- **Automation:** node-cron (for recurring engagements)

## 📋 Local Setup Instructions (For Evaluation)

If you wish to run the application locally instead of using the live link, follow these steps:

### Prerequisites
- Node.js (v18+)
- MongoDB (Running locally on port 27017 or a MongoDB Atlas URI)
  *Note: A Replica Set is required for MongoDB transactions.*

### 1. Backend Setup

```sh
cd backend
npm install
```
Create a `.env` file in the `backend` directory:
```env
MONGO_URI=mongodb://localhost:27017/ca-work-tool
JWT_SECRET=your_super_secret_key_minimum_32_chars
PORT=5000
```
Generate realistic dummy data (Recommended for testing the dashboard):
```sh
npm run seed:demo
```
Start the server:
```sh
npm run dev
```

### 2. Frontend Setup

```sh
cd frontend
npm install
npm run dev
```
The application will now be running on `http://localhost:5173`.

---

## ✨ Key Features & Engineering Highlights

- **Server-Side Authorization:** Strict API-level role checks prevent Team Members from creating engagements or approving their own work.
- **ACID Transactions:** Uses MongoDB multi-document transactions to ensure that if task generation fails, the parent Engagement is rolled back instantly.
- **Idempotent Cron Jobs:** A background script automatically generates next month's recurring engagements. Unique compound indexes on the database (`clientId + serviceTypeId + period`) prevent duplicate generation even if the script runs twice.
- **State Machine Workflow:** Enforces valid task transitions (e.g., `Not Started` -> `In Progress` -> `Ready for Review`).
- **Grouped UI:** Tasks are grouped systematically by `Client | Service` for an enterprise-level Jira-like experience.

## 🧪 Testing

To run the automated backend test suite (covers authorization, workflow rules, transaction rollbacks, and unique indexes):
```sh
cd backend
npm test
```
