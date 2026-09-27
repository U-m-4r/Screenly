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

Create `apps/frontend/.env` from the example and set
`VITE_GOOGLE_CLIENT_ID` to the Google OAuth 2.0 Web client ID. The backend must
use the matching `GOOGLE_CLIENT_ID` value. Add the frontend origin, usually
`http://localhost:3000`, to the OAuth client's authorized JavaScript origins.

The main routes are:

- `/` for Google sign-in
- `/setup` for candidate profile submission
- `/interview/:id` for the live Deepgram interview
- `/results/:id` for the persisted interview result

Production build and typecheck:

```sh
bun run build
bun run check-types
```
