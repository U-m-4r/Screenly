# Turborepo starter

This Turborepo starter is maintained by the Turborepo core team.

## Using this example

Run the following command:

```sh
npx create-turbo@latest
```

## What's inside?

This Turborepo includes the following packages/apps:

### Apps and Packages

- `docs`: a [Next.js](https://nextjs.org/) app
- `web`: another [Next.js](https://nextjs.org/) app
- `@repo/ui`: a stub React component library shared by both `web` and `docs` applications
- `@repo/eslint-config`: `eslint` configurations (includes `@next/eslint-plugin-next` and `eslint-config-prettier`)
- `@repo/typescript-config`: `tsconfig.json`s used throughout the monorepo

Each package/app is 100% [TypeScript](https://www.typescriptlang.org/).

### Utilities

This Turborepo has some additional tools already setup for you:

- [TypeScript](https://www.typescriptlang.org/) for static type checking
- [ESLint](https://eslint.org/) for code linting
- [Prettier](https://prettier.io) for code formatting

### Build

To build all apps and packages, run the following command:

With [global `turbo`](https://turborepo.dev/docs/getting-started/installation#global-installation) installed (recommended):

```sh
cd my-turborepo
turbo build
```

Without global `turbo`, use your package manager:

```sh
cd my-turborepo
npx turbo build
bun exec turbo build
bun exec turbo build
```

You can build a specific package by using a [filter](https://turborepo.dev/docs/crafting-your-repository/running-tasks#using-filters):

With [global `turbo`](https://turborepo.dev/docs/getting-started/installation#global-installation) installed:

```sh
turbo build --filter=docs
```

Without global `turbo`:

````sh
# Screenly

Screenly is an AI-assisted technical interview application. Candidates submit
their GitHub and LinkedIn profiles, and the backend gathers GitHub repository
data before creating an interview session. The frontend provides the interview
experience with Deepgram-powered audio support.

## Stack

- **Frontend:** React 19, Bun, Tailwind CSS, Radix UI
- **Backend:** Bun, Express, TypeScript, Zod
- **Data:** PostgreSQL with Prisma 7
- **Integrations:** GitHub API and Deepgram
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
````

## Requirements

- [Bun](https://bun.sh/) 1.4.2 or newer
- Node.js 24 or newer
- A PostgreSQL database
- GitHub token with permission to read public repository data
- Deepgram API key

## Getting Started

Install dependencies from the repository root:

```sh
bun install
```

Create the backend environment file and fill in the values:

```sh
cd apps/backend
cp .env.example .env
```

Generate the Prisma client and apply migrations:

```sh
bunx prisma generate
bunx prisma migrate deploy
```

Start the backend in one terminal:

```sh
cd apps/backend
bun index.ts
```

Start the frontend in another terminal:

```sh
cd apps/frontend
bun run dev
```

The API listens on `http://localhost:3001`. The frontend development server
prints its local URL when it starts.

## Environment Variables

The backend example file is [apps/backend/.env.example](apps/backend/.env.example).
The root `.gitignore` excludes local `.env` files, so never commit credentials.

| Variable           | Description                                            |
| ------------------ | ------------------------------------------------------ |
| `DATABASE_URL`     | PostgreSQL connection string used by Prisma            |
| `DEEPGRAM_API_KEY` | Deepgram API key used to create temporary audio tokens |
| `GITHUB_TOKEN`     | GitHub token used to fetch a user's repositories       |

## API Endpoints

### `GET /api/deepgram-token`

Creates a temporary Deepgram access token for the frontend audio session.

### `POST /api/v1/pre-interview`

Creates an interview from a candidate's profile URLs.

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

## Development Commands

Run these commands from the repository root:

```sh
bun run build       # Build all workspace apps and packages
bun run check-types # Run TypeScript checks
bun run lint        # Run lint tasks
bun run format      # Format TypeScript and Markdown files
```

## Status

Screenly is under active development. LinkedIn profile enrichment and the
remaining interview conversation flow are planned next.
