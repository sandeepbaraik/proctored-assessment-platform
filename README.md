# Proctored Assessment Platform

Full-stack online assessment platform for admins to create and assign assessments, and candidates to attempt them with browser-level proctoring.

## Tech Stack

- Frontend: React, Vite, TypeScript, Bootstrap
- Backend: NestJS, TypeScript, JWT, Mongoose
- Database: MongoDB
- Local setup: npm scripts or Docker Compose

## Folder Structure

```text
proctored-assessment-platform/
  backend/
    src/
      assessments/       Assessment CRUD and question attach/detach APIs
      assignments/       Candidate assignment and unassignment APIs
      attempts/          Start, autosave, submit, scoring, proctoring events
      auth/              JWT login and authenticated user APIs
      common/            Guards, decorators, enums, filters, shared DTOs
      questions/         Question bank APIs
      seed-data/         JSON seed inputs
      users/             Candidate lookup APIs
      seed.ts            Local seed script
  frontend/
    src/
      components/        Shared layout, protected route, multiselect
      context/           Auth state
      pages/admin/       Admin dashboard, assessments, questions, submissions
      pages/candidate/   Candidate dashboard and assessment attempt UI
      services/          Axios API client
      types.ts           Shared frontend types
  docker-compose.yml
  Proctored_Assessment_Platform.postman_collection.json
```

## Architecture

The backend exposes REST APIs under `/api` and uses JWT authentication with role-based guards for `ADMIN` and `CANDIDATE`.

Admins manage assessments, reusable question-bank questions, candidate assignments, submissions, and proctoring timelines. Candidates can only view their own assignments, start/resume attempts, autosave answers, submit once, and send proctoring events for their own active attempt.

MongoDB stores users, assessments, questions, assignments, attempts, submissions, and proctoring events. Candidate ownership is validated on attempt, answer, submit, and candidate assignment APIs.

## Environment Variables

Backend: create `backend/.env` from `backend/.env.example`.

```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/proctored_assessment
JWT_SECRET=replace-with-local-development-secret
JWT_EXPIRES_IN=1d
FRONTEND_URL=http://localhost:5173
```

Frontend: create `frontend/.env` from `frontend/.env.example`.

```env
VITE_API_URL=http://localhost:3000/api
```

## Local Setup Without Docker

Prerequisites:

- Node.js 20+
- MongoDB running locally on port `27017`

Install dependencies:

```bash
cd backend
npm install

cd ../frontend
npm install
```

Start backend:

```bash
cd backend
npm run start:dev
```

Start frontend in another terminal:

```bash
cd frontend
npm run dev
```

Open:

```text
http://localhost:5173
```

## Docker-Based Local Setup

Start MongoDB, backend, and frontend:

```bash
docker compose up --build
```

Open:

```text
Frontend: http://localhost:5173
Backend:  http://localhost:3000/api
MongoDB:  localhost:27017
```

Seed after the containers are running:

```bash
docker compose exec backend npm run seed
```

Stop containers:

```bash
docker compose down
```

To remove the MongoDB volume too:

```bash
docker compose down -v
```

## Database Setup

The app uses MongoDB database:

```text
proctored_assessment
```

For non-Docker setup, make sure MongoDB is running and `MONGODB_URI` points to it.

For Docker setup, MongoDB is provided by the `mongo` service and persisted in the `mongo-data` volume.

## Seed Data

Run:

```bash
cd backend
npm run seed
```

The seed script creates:

- 1 admin user
- 15 candidate users
- 20 assessments
- 20 to 30 questions per assessment
- Assignments for candidates
- Topics covering Frontend, Backend, Full Stack, MERN/MEAN, AWS, MySQL, MongoDB, API design, and security

Seed input files:

```text
backend/src/seed-data/assessments.json
backend/src/seed-data/candidates.json
backend/src/seed-data/question-bank.json
```

## Sample Login Credentials

Admin:

```text
Email: admin@example.com
Password: Admin@123
```

Candidate:

```text
Email: candidate1@example.com
Password: Candidate@123
```

Other seeded candidates use:

```text
candidate2@example.com ... candidate15@example.com
Password: Candidate@123
```

## Main Features

- JWT authentication
- Role-based access control
- Admin dashboard
- Assessment create, view/edit, delete
- Question create, edit, delete
- Attach/detach reusable questions to assessments
- Assign/unassign candidates
- Candidate assignment dashboard
- Server-driven timer using attempt expiry time
- Autosave answers
- Resume attempt after refresh
- Prevent duplicate submissions
- Objective scoring for single-choice and multiple-choice questions
- Short-answer responses marked as manual-review pending in the UI
- Browser-level proctoring event capture:
  - Tab switch
  - Window blur
  - Fullscreen exit
  - Copy attempt
  - Paste attempt
  - Right-click attempt
- Admin submissions table and proctoring timeline table

## API Documentation

Postman collection is included at:

```text
Proctored_Assessment_Platform.postman_collection.json
```

How to use:

1. Import the collection into Postman.
2. Set collection variable `baseUrl` to `http://localhost:3000/api`.
3. Run `Auth / Admin Login`; it stores `adminToken`.
4. Run `Auth / Candidate Login`; it stores `candidateToken`.
5. Use returned IDs from list APIs to fill variables such as `assessmentId`, `questionId`, `candidateId`, `assignmentId`, `attemptId`, and `submissionId`.

## Useful API Groups

- Auth: login, current user
- Users: list candidates
- Assessments: list, create, view, update, delete, attach/detach questions
- Questions: list, create, view, update, delete
- Assignments: assign candidates, unassign candidates, list admin assignments, list candidate assignments
- Attempts: start, resume/get attempt, autosave answers, submit, proctoring events
- Submissions: list submissions, view submission details, view proctoring timeline

## Assumptions and Known Limitations

- Deployment is not required; the project is designed to run locally.
- Short-answer questions are collected but not automatically graded.
- Candidate score shown for assessments containing short answers is objective score only; final score requires manual review.
- Browser-level proctoring is best-effort and not a replacement for secure lockdown browsers.
- Fullscreen can only be started from a user action because of browser security restrictions.
- Proctoring events are queued locally and flushed when the candidate returns to the assessment tab and before submission.
- Cursor pagination uses Previous/Next controls in the UI.
- The seed script is idempotent for users and assessments, but it recreates assessment questions for seeded assessments.

## Build Checks

Backend:

```bash
cd backend
npm run build
```

Frontend:

```bash
cd frontend
npm run build
```
