# Screenly

Screenly is an AI-assisted technical interview application. Candidates submit
their GitHub and LinkedIn profiles, and the backend gathers GitHub repository
data before creating an interview session. The frontend provides the interview
experience with Deepgram-powered audio support.

## Stack

- **Frontend:** React 19, Bun, Tailwind CSS, Radix UI
- **Backend:** Bun, Express, TypeScript, Zod
- **Data:** PostgreSQL with Prisma 7
- **Integrations:** GitHub API, Deepgram, and Groq
- **Workspace:** Turborepo

## Project Structure

```text
apps/
  backend/       Express API, Prisma schema, and GitHub integration
  frontend/      React interview interface
packages/
  eslint-config/ Shared lint configuration
  typescript-config/ Shared TypeScript configuration
  ui/            Shared UI components
```

## Requirements

- [Bun](https://bun.sh/) 1.4.2 or newer
- Node.js 24 or newer
- A PostgreSQL database
- A Google OAuth 2.0 Web client ID
- GitHub token with permission to read public repository data
- Deepgram API key
- Groq API key for post-interview evaluation
- Resend API key and a verified sender address for interview invitations

## Getting Started

Install dependencies from the repository root:

```sh
bun install
```

Create the backend environment file and fill in the values. The backend needs
PostgreSQL plus credentials for Google, GitHub, Deepgram, Groq, and Resend:

```sh
cd apps/backend
cp .env.example .env
```

Create the frontend environment file and fill in the Google OAuth client ID:

```sh
cd ../frontend
cp .env.example .env
```

In Google Cloud Console, add the frontend origin, usually
`http://localhost:3000`, to the OAuth client's authorized JavaScript origins.

Generate the Prisma client and apply migrations:

```sh
cd ../backend
bunx prisma generate
bunx prisma migrate deploy
```

Start the backend in one terminal from `apps/backend`:

```sh
cd apps/backend
bun run dev
```

Use `bun run start` instead when you do not want file watching.

Start the frontend in another terminal:

```sh
cd apps/frontend
bun run dev
```

The API listens on `http://localhost:3001`. The frontend development server
prints its local URL when it starts.

## Application Flows

### Company invitations

1. A company user signs in with Google and creates a company.
2. The company adds a candidate by email and sends an interview invitation.
3. The candidate opens the emailed link, signs in with the invited Google
   account, and accepts the invitation.
4. The candidate submits GitHub and LinkedIn URLs. Screenly loads the public
   GitHub repositories and opens the live interview.
5. After the interview ends, the backend saves the transcript and Groq
   evaluation. The company and candidate dashboards can view the result.

### Direct candidate interviews

Candidates can also sign in and submit their GitHub and LinkedIn URLs through
the direct pre-interview flow. This creates an interview without a company
invitation.

## Environment Variables

The backend example file is [apps/backend/.env.example](apps/backend/.env.example),
and the frontend example file is [apps/frontend/.env.example](apps/frontend/.env.example).
The root `.gitignore` excludes local `.env` files, so never commit credentials.

| Variable            | Description                                            |
| ------------------- | ------------------------------------------------------ |
| `DATABASE_URL`      | PostgreSQL connection string used by Prisma            |
| `GOOGLE_CLIENT_ID`  | Google OAuth client ID used to verify sign-in tokens   |
| `DEEPGRAM_API_KEY`  | Deepgram API key used to create temporary audio tokens |
| `GITHUB_TOKEN`      | GitHub token used to fetch a user's repositories       |
| `GROQ_API_KEY`      | Groq API key used to evaluate completed interviews     |
| `RESEND_API_KEY`    | Resend API key used to send interview invitations      |
| `RESEND_FROM_EMAIL` | Verified Resend sender used for invitation emails      |

The Resend variables are required for company invitation emails. The sender
must be verified in Resend. If the backend does not start, first check that
the database in `DATABASE_URL` is running and reachable, then check for a
process already using port `3001`.

## API Endpoints

### `GET /api/deepgram-token`

Creates a temporary Deepgram access token for the frontend audio session.

### `POST /api/v1/pre-interview`

Creates an interview from a signed-in candidate's profile URLs. The browser
must first authenticate through Google at `POST /api/v1/auth/google`.

Example request:

```json
{
  "github": "https://github.com/username",
  "linkedin": "https://www.linkedin.com/in/username"
}
```

The response contains the created interview ID:

```json
{
  "interviewId": "..."
}
```

### Authentication

- `POST /api/v1/auth/google` verifies a Google Identity Services credential
  and creates a seven-day HTTP-only `screenly_session` cookie.
- `GET /api/v1/auth/me` returns the signed-in user or `401`.
- `POST /api/v1/auth/logout` invalidates the current session and clears the
  cookie.

### Company and candidate management

- `POST /api/v1/company/onboarding` creates a company for the signed-in user.
  Body: `{ "name": "Example Company" }`.
- `GET /api/v1/company` returns the signed-in user's company.
- `GET /api/v1/company/candidates` lists the company's candidates and their
  interview summaries.
- `POST /api/v1/company/candidates` creates a candidate. Body: `{ "email":
"candidate@example.com", "name": "Candidate Name" }`.
- `POST /api/v1/company/candidates/:candidateId/interview` creates an
  interview and sends an email invitation through Resend.

### Candidate invitations

- `GET /api/v1/candidate/invite/:token` validates an invitation without
  authentication.
- `POST /api/v1/candidate/invite/:token/accept` accepts the invitation after
  verifying that the signed-in Google email matches the invited email.
- `GET /api/v1/candidate/interviews` lists interviews for the signed-in
  candidate.
- `POST /api/v1/candidate/interviews/:interviewId/setup` saves the invited
  candidate's GitHub and LinkedIn URLs on the existing interview.

### `GET /api/v1/results/:id`

Returns the interview status, persisted evaluation, and authoritative
conversation transcript for the supplied interview ID. Evaluation is created
when the interview ends and includes an overall score, category scores,
summary, strengths, improvements, and discussed topics.

### WebSocket `/ws/interview/:id`

The interview client sends 16 kHz microphone audio as binary messages and an
`{ "type": "end" }` control message. The server sends 24 kHz audio back as
binary messages and JSON events including `ready`, `conversation-turn`,
`user-started-speaking`, `agent-thinking`, `agent-audio-done`,
`evaluation-complete`, `evaluation-error`, `deepgram-disconnected`, and
`error`. The browser does not send transcript or evaluation data. When the
client ends the session, transcript writes are flushed before the evaluation
is persisted.

## Development Commands

Run these commands from the repository root:

```sh
bun run build       # Build all workspace apps and packages
bun run check-types # Run TypeScript checks
bun run lint        # Run lint tasks
bun run format      # Format TypeScript and Markdown files
```

## Status

Screenly is under active development. Google sign-in, company onboarding,
candidate invitations, protected dashboards, the interview pipeline, transcript
persistence, post-interview evaluation, and the results view are implemented.
