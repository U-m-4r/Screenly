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

The main routes are:

- `/` for candidate profile submission
- `/interview/:id` for the live Deepgram interview
- `/results/:id` for the persisted interview result

Production build and typecheck:

```sh
bun run build
bun run check-types
```
