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

- `POST /api/v1/pre-interview` loads the candidate's GitHub repositories and
  creates an interview. The request body contains `github` and `linkedin` URLs.
- `POST /api/v1/auth/google` verifies a Google Identity Services credential and
  creates a session cookie.
- `GET /api/v1/results/:id` returns the persisted interview status, evaluation,
  and transcript.
- `GET /api/deepgram-token` creates a temporary Deepgram token.
- `WS /ws/interview/:id` streams microphone audio to Deepgram and sends
  completed conversation turns back to the browser.

When the client sends the `end` control message, the backend waits for queued
transcript writes, evaluates the authoritative PostgreSQL transcript with
Groq, saves the result, and closes the session.

## Development

```sh
bun run check-types
```

See the repository [README](../../README.md) for the complete local setup and
environment variable reference.
