# Screenly Backend

The backend owns interview creation, GitHub repository loading, the Deepgram
voice session, transcript persistence, and post-interview evaluation.

## Setup

Install dependencies from the repository root:

```sh
bun install
```

Create `apps/backend/.env` from the example and provide PostgreSQL, Google,
GitHub, Deepgram, Groq, and Resend credentials:

```sh
cp .env.example .env
```

Initialize the Prisma client and database:

```sh
bunx prisma generate
bunx prisma migrate deploy
```

Start the API and WebSocket server:

```sh
bun run dev
```

The development server watches for source changes and listens on
`http://localhost:3001`. Use `bun run start` for a non-watching process.

Before starting the server, make sure PostgreSQL is running and the database
in `DATABASE_URL` is reachable. The Prisma client must be generated and all
migrations must be applied after installing dependencies.

`GOOGLE_CLIENT_ID` must be the OAuth 2.0 Web client ID configured for the
frontend origin. Google sign-in creates an HTTP-only session cookie valid for
seven days.

`RESEND_FROM_EMAIL` must use a sender address that Resend has verified. The
Resend variables are only required for company invitation emails.

## API

All `/api/v1` routes except invite validation require the HTTP-only
`screenly_session` cookie created by Google authentication.

### Authentication

- `POST /api/v1/auth/google` verifies a Google Identity Services credential in
  `{ "credential": "..." }` and creates a seven-day session cookie.
- `GET /api/v1/auth/me` returns the current user.
- `POST /api/v1/auth/logout` invalidates the current session and clears the
  cookie.

### Company and candidate management

- `POST /api/v1/company/onboarding` creates a company from `{ "name": "..." }`.
- `GET /api/v1/company` returns the current user's company.
- `GET /api/v1/company/candidates` lists candidates belonging to that company.
- `POST /api/v1/company/candidates` creates a candidate from `email` and an
  optional `name`.
- `POST /api/v1/company/candidates/:candidateId/interview` creates an
  interview for a company candidate and sends a Resend invitation email.

### Candidate interviews

- `GET /api/v1/candidate/invite/:token` validates an invite without requiring
  authentication.
- `POST /api/v1/candidate/invite/:token/accept` accepts an invite when the
  authenticated Google email matches the invited email.
- `GET /api/v1/candidate/interviews` lists interviews for the current
  candidate.
- `POST /api/v1/candidate/interviews/:interviewId/setup` stores GitHub and
  LinkedIn URLs for an invited interview and loads the candidate's GitHub
  repositories.
- `POST /api/v1/pre-interview` creates a direct interview from `github` and
  `linkedin` URLs and loads the public GitHub repositories.

### Interview results and audio

- `GET /api/v1/results/:id` returns the persisted status, evaluation, and
  authoritative transcript.
- `GET /api/deepgram-token` creates a temporary Deepgram access token.
- `WS /ws/interview/:id` streams 16 kHz microphone audio to Deepgram and
  returns 24 kHz audio plus JSON conversation/status events.

The WebSocket client sends binary microphone frames and finishes with
`{ "type": "end" }`. The server emits `ready`, `conversation-turn`,
`user-started-speaking`, `agent-thinking`, `agent-audio-done`,
`evaluation-complete`, `evaluation-error`, `deepgram-disconnected`, and
`error` events. On `end`, queued transcript writes are flushed before Groq
evaluation is saved.

When the client sends the `end` control message, the backend waits for queued
transcript writes, evaluates the authoritative PostgreSQL transcript with
Groq, saves the result, and closes the session.

## Development

```sh
bun run check-types
```

See the repository [README](../../README.md) for the complete local setup and
environment variable reference.
