# InterviewAI

InterviewAI is an AI-powered mock interview platform that helps candidates practice before real interviews. A candidate can sign up, choose a role and interview round, upload a resume when needed, answer AI interview questions, solve DSA problems, and get a final score with feedback.

Deployed app: [https://finops-jade.vercel.app](https://finops-jade.vercel.app)

## Top Features

- **AI interviewer:** Runs conversational mock interviews and asks follow-up questions based on the candidate's answers.
- **Multiple interview rounds:** Supports technical, HR, aptitude, and DSA coding rounds.
- **Role-based practice:** Includes tracks for Software Engineer, AI/ML Engineer, System Design, and Aptitude.
- **Resume-based questions:** Reads uploaded PDF resumes and uses the resume content to make technical and HR interviews more personal.
- **DSA IDE:** Lets candidates write, run, and submit code for coding problems.
- **Automatic scoring:** Evaluates answers, code submissions, aptitude choices, and overall performance.
- **Proctoring:** Tracks webcam status, face visibility, tab changes, and suspicious activity during an attempt.
- **Final reports:** Shows score, summary, feedback, proctoring details, and interview history.

## Tech Stack

| Tech | Role in this project |
| --- | --- |
| **Next.js 16** | Builds the frontend pages and backend API routes in one app. |
| **React 19** | Creates the interactive interview screens, dashboard, forms, and DSA workspace. |
| **TypeScript** | Keeps the code safer by adding types to components, API routes, and helper logic. |
| **PostgreSQL** | Stores users, interview attempts, selected questions, scores, reports, and proctoring events. |
| **pg** | Connects the Next.js API routes to PostgreSQL. |
| **Gemini AI** | Generates AI interviewer responses, follow-up questions, and richer feedback. |
| **PDF Parser** | Extracts text from uploaded resumes so the interview can use resume context. |
| **Judge0 / Local Runner** | Runs DSA code submissions and checks outputs against test cases. |
| **JWT + httpOnly cookies** | Keeps candidates logged in securely. |
| **bcryptjs** | Hashes user passwords before saving them. |
| **Lucide React** | Provides icons used across the UI. |
| **Vercel** | Hosts the deployed Next.js application. |

## Architecture

![AI Interview Platform architecture](C:\Users\singh\OneDrive\Desktop\ai-interview\publicInterviewAI_Architecture.png)

## Run Locally

### 1. Clone the project

```bash
git clone https://github.com/Arman0604/InterviewAI.git
cd InterviewAI
```

### 2. Install dependencies

```bash
npm install
```

### 3. Create a local environment file

Create `.env.local` in the project root:

```bash
DATABASE_URL="postgres://postgres:postgres@localhost:5432/ai_interview"
JWT_SECRET="replace-this-with-a-long-random-secret"
GEMINI_API_KEY="your-gemini-api-key"

# Optional: required only when you want remote Judge0 execution
JUDGE0_API_KEY="your-judge0-api-key"
JUDGE0_API_HOST="judge0-ce.p.rapidapi.com"
```

Notes:

- `DATABASE_URL` is required. If it is missing, the app tries to use `postgres://postgres:postgres@localhost:5432/ai_interview`.
- `JWT_SECRET` is required for secure login sessions.
- `GEMINI_API_KEY` is needed for the best AI interviewer and feedback experience.
- Judge0 is optional for local development because the project can use local runtimes for some languages.

### 4. Start PostgreSQL

Create a database named `ai_interview` in your local PostgreSQL server.

Example:

```bash
createdb ai_interview
```

The app creates the required tables automatically when it connects to the database.

### 5. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Useful Scripts

```bash
npm run dev     # start local development server
npm run build   # create a production build
npm run start   # run the production build
npm run lint    # run ESLint
```
