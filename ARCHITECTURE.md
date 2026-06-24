# AI Interview Platform Architecture

This project is a Next.js 16 App Router application for candidate mock interviews. It supports conversational interviews, aptitude tests, DSA coding rounds, webcam/tab proctoring, resume-based personalization, and final reports.

## System Map

```mermaid
flowchart LR
  U[Candidate Browser] --> P[Next.js Proxy]
  P --> UI[App Router Pages]
  UI --> API[Route Handlers]

  API --> DB[(PostgreSQL)]
  API --> AI[Gemini AI]
  API --> PDF[PDF Parser]
  API --> J0[Judge0 or Local Code Runner]

  UI --> VC[Voice, Camera, Tab Monitoring]
  VC --> API
```

## Main Layers

| Layer | Files | Responsibility |
|---|---|---|
| UI routes | `app/*/page.tsx`, route client files | Render home, auth, dashboard, interview workspace, DSA IDE, and reports. |
| API layer | `app/api/**/route.ts` | Handles auth, attempt lifecycle, AI messages, scoring, code execution, proctoring, reports, and resume upload. |
| Domain logic | `lib/interview-engine.ts`, `lib/dsa-scorer.ts`, `lib/questions*.ts` | Selects questions, generates interview prompts, evaluates answers, and builds feedback. |
| Infrastructure | `lib/db.ts`, `lib/auth.ts`, `lib/token.ts`, `lib/judge0.ts`, `lib/gemini.ts` | Database, JWT sessions, external AI, and code execution helpers. |
| Shared UI | `components/*` | Navbar, auth shell, themed home/dashboard pieces, and video proctoring. |
| Static assets | `public/*` | Role images, interviewer portraits, feature art, and icons. |

## Routing Shape

```text
/                         Landing or redirect based on session
/login, /register         Candidate authentication
/candidate/dashboard      Role and round selection plus report history
/interview/[attemptId]    Conversational and aptitude workspace
/dsa/[attemptId]          DSA coding IDE
/report/[attemptId]       Completed report view
/api/**                   Backend-for-frontend route handlers
```

`proxy.ts` is the request guard. It allows public/auth/static paths, verifies the `auth_token` cookie, redirects unauthenticated users to `/login`, and keeps protected pages behind a valid JWT.

## Core Data Model

```mermaid
erDiagram
  users ||--o{ interview_attempts : takes
  users ||--o{ interview_sessions : creates
  interview_sessions ||--o{ interview_attempts : contains
  interview_attempts ||--o{ proctoring_events : records
```

| Table | Purpose |
|---|---|
| `users` | Candidate accounts with hashed passwords and profile data. |
| `interview_sessions` | Optional scheduled/campaign sessions with role, round, custom questions, and active status. |
| `interview_attempts` | One candidate attempt: role, round, status, conversation, selected questions, resume text, score, feedback, DSA submission, and proctoring summary. |
| `proctoring_events` | Timestamped camera/tab/window integrity events for an attempt. |

The active database layer is PostgreSQL through `pg` in `lib/db.ts`. The `data/*.db` files look like local/older artifacts and are not used by the current imported DB code.

## Important Flows

### 1. Authentication

```mermaid
sequenceDiagram
  Candidate->>API: POST /api/auth/register or /api/auth/login
  API->>DB: Create or load user
  API->>API: Hash/verify password
  API->>Candidate: Set httpOnly auth_token cookie
  Candidate->>Proxy: Open protected route
  Proxy->>Proxy: Verify JWT
  Proxy->>Candidate: Continue or redirect to /login
```

### 2. Conversational Interview and Aptitude

```mermaid
sequenceDiagram
  Candidate->>Dashboard: Choose role and round
  Dashboard->>API: POST /api/upload-resume when needed
  Dashboard->>API: POST /api/interview/start
  API->>DB: Create interview_attempt with selected questions
  Candidate->>Workspace: /interview/[attemptId]
  Workspace->>API: POST /api/interview/message for each answer
  API->>Engine: Pick next question with Gemini or fallback logic
  API->>DB: Save conversation
  Workspace->>API: POST /api/interview/end
  API->>Engine: Generate score, summary, feedback
  API->>DB: Mark completed
  Candidate->>Report: View /report/[attemptId]
```

Technical and HR rounds are conversation based. Aptitude uses the same attempt/report path, but the client submits selected answers to `/api/interview/end` and the engine scores them against the selected question set.

### 3. DSA Coding Round

```mermaid
sequenceDiagram
  Candidate->>Dashboard: Choose DSA round
  Dashboard->>API: POST /api/interview/start
  API->>DB: Create DSA attempt with one selected problem
  Candidate->>DSA IDE: /dsa/[attemptId]
  DSA IDE->>API: POST /api/dsa/run
  API->>Judge0: Run sample tests
  DSA IDE->>API: POST /api/dsa/submit
  API->>Judge0: Run sample, hidden, edge tests
  API->>Scorer: Score correctness, implementation, complexity, approach, edge cases
  API->>DB: Save final score and feedback
  Candidate->>Report: View DSA report
```

`lib/judge0.ts` uses Judge0 when configured. In development, it can fall back to local runtimes for supported languages.

### 4. Proctoring

`components/VideoProctoring.tsx` monitors webcam status, face visibility, tab/window changes, and policy violations. Events are posted to `/api/interview/proctor`, stored in `proctoring_events`, summarized onto `interview_attempts`, and shown in reports. More than `PROCTORING_ALLOWED_VIOLATIONS` marks an unfinished attempt as `abandoned`.

## Question and Scoring Strategy

| Round | Question source | Scoring |
|---|---|---|
| Technical | Role-specific question banks plus resume-aware flow | Keyword matching with Gemini-assisted report text when available. |
| HR | HR question bank and resume-aware prompts | Gemini evaluation when available, with heuristic fallback. |
| Aptitude | Online assessment question bank | Direct answer checking. |
| DSA | DSA question bank | Test-case results plus structured DSA scorer, optionally using Gemini for code quality. |

Selected question IDs are stored in each attempt so refreshes, scoring, and reports use the same questions that the candidate saw.

## External Configuration

| Variable | Used for |
|---|---|
| `DATABASE_URL` | PostgreSQL connection. Defaults to local `postgres://postgres:postgres@localhost:5432/ai_interview`. |
| `JWT_SECRET` | Signing and verifying session JWT cookies. |
| `GEMINI_API_KEY` | AI interviewer responses and richer feedback. |
| Judge0 variables | Remote code execution when available; otherwise local fallback may be used in development. |
| `PGSSLMODE` or `POSTGRES_SSL` | Enables PostgreSQL SSL mode. |

## Mental Model

Think of the app as five cooperating pieces:

1. Candidate UI collects choices, resume text, answers, code, and proctoring signals.
2. API routes validate the session and own every write to the database.
3. Question engines keep each attempt consistent by storing selected question IDs.
4. AI and code-runner integrations enrich the experience but have fallbacks.
5. Reports read the completed attempt, feedback JSON, and proctoring events to present the final result.
