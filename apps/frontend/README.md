# Screenly Frontend

The frontend provides the candidate profile form, browser microphone session,
live interview transcript, and results route.

## Setup

Install dependencies from the repository root:

```sh
bun install
```

Start the development server:

```sh
bun run dev
```

The frontend expects the backend at `http://localhost:3001`. Start the backend
from `apps/backend` in a separate terminal before beginning an interview.
The backend URL is currently fixed in `src/lib/config.ts`, and the backend
listens on port `3001`.

Create `apps/frontend/.env` from the example and set
`VITE_GOOGLE_CLIENT_ID` to the Google OAuth 2.0 Web client ID. The backend must
use the matching `GOOGLE_CLIENT_ID` value. Add the frontend origin, usually
`http://localhost:3000`, to the OAuth client's authorized JavaScript origins.

The main routes are:

- `/` for role selection and Google sign-in
- `/company` for company role selection
- `/company/setup` for company onboarding
- `/company/login` for returning company users
- `/dashboard` for the protected company dashboard
- `/candidate/invite/:token` for invitation validation and acceptance
- `/candidate/login` for candidate sign-in
- `/candidate/dashboard` for the protected candidate dashboard
- `/setup` for direct or invited candidate profile submission
- `/interview/:id` for the live Deepgram interview
- `/results/:id` for the persisted interview result

The company flow creates candidates and sends interview invitations. The
candidate flow validates the invitation, requires the matching Google account,
collects GitHub and LinkedIn URLs, and then opens the interview. Protected
dashboard routes redirect unauthenticated users to `/`.

## Configuration

Create `apps/frontend/.env` from `.env.example` and set
`VITE_GOOGLE_CLIENT_ID`. The Bun server exposes this value through
`GET /api/config` before the React app loads it. It must match the backend's
`GOOGLE_CLIENT_ID`, and the frontend origin must be registered in Google Cloud
Console.

The frontend server also includes example Bun routes at `/api/hello` and
`/api/hello/:name`; these are development examples and are not used by the
interview workflow.

## Commands

Run these commands from `apps/frontend`:

```sh
bun run dev          # Start the hot development server
bun run start        # Start the production server
bun run build        # Build the frontend into dist/
bun run check-types  # Run the TypeScript check
```
