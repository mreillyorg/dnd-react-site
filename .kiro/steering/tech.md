---
inclusion: always
---

# Tech Stack

- **Frontend**: React (TypeScript)
- **Routing**: React Router (latest)
- **Styling**: Tailwind CSS + daisyUI
- **Build tool**: Vite
- **Package manager**: npm
- **Unit testing**: Vitest + React Testing Library
- **API**: GraphQL
- **ORM**: Prisma (schema management, typed client, migrations)
- **Database (default)**: SQLite in Rollback Journal Mode
- **Database (future investigation)**: MySQL (Prisma schema kept provider-compatible)

## Backend Data Layer

- **GraphQL** is the API layer for all data access. No REST endpoints for application data.
- **Prisma ORM** manages the schema (`schema.prisma`), generates the typed client, and runs migrations.
  - All database access goes through the Prisma Client; raw SQL is not used in application code.
  - `prisma migrate deploy` is run at application startup to apply pending migrations.
  - `prisma generate` is run as part of the build to keep the client in sync with the schema.
- **SQLite** (Rollback Journal Mode) is the default provider — zero infrastructure, runs locally.
  - `journal_mode=DELETE` (SQLite default). WAL mode is not used.
  - `PRAGMA foreign_keys = ON` and `PRAGMA synchronous = FULL` are applied on every connection.
  - Database path is set via `DATABASE_URL` environment variable only; never hard-coded.
- **Write queue**: Because SQLite has a single-writer constraint, all write operations are routed through a serialised in-process FIFO queue to prevent contention under concurrent GraphQL load. The queue is bypassed when MySQL is the active provider.
- **MySQL** is identified as an optional future provider. The Prisma schema is authored to be compatible with both `sqlite` and `mysql` providers. Switching requires only a `DATABASE_URL` change and provider update in `schema.prisma`.

## Routing

- **React Router**: Client-side routing for single-page application navigation
  - Use declarative route configuration with `<Routes>` and `<Route>` components
  - Prefer `<Link>` and `<NavLink>` components over `<a>` tags for internal navigation
  - Use `useNavigate()` for programmatic navigation
  - Use nested routes for feature-level layouts and shared UI elements
  - Use route loaders for data fetching (when using data router patterns)
  - Use URL parameters and search params for state that should be shareable via URL
  - Use `<Outlet>` components for nested route rendering

## Styling

- **Tailwind CSS**: Utility-first CSS framework for custom styling
- **daisyUI**: Component library built on Tailwind CSS providing pre-styled UI components
  - Use daisyUI components for common UI patterns (buttons, cards, modals, forms, etc.)
  - Customize daisyUI themes to match the D&D companion site aesthetic
  - Leverage daisyUI's dark/light mode support for theme switching
  - Extend with custom Tailwind utilities when daisyUI components don't fit the use case

## Common Commands

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run tests (single pass, no watch)
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Lint
npm run lint
```

## Notes

- Prefer TypeScript strict mode.
- Use environment variables for API keys and external service URLs; never hard-code secrets.
- Use daisyUI components as the foundation, then customize with Tailwind utilities as needed.
-Configure daisyUI themes in tailwind.config.js to support dark/light mode switching.


## Unit Testing

- **Framework**: [Vitest](https://vitest.dev/) — integrates natively with Vite, no extra config needed.
- **Component testing**: [React Testing Library](https://testing-library.com/react) — test behavior, not implementation details.
- **Test files**: co-located with the source file they test (e.g. `CharacterCard.test.tsx` next to `CharacterCard.tsx`).
- Use `@testing-library/user-event` for simulating user interactions over `fireEvent`.
- Prefer `screen` queries in this order: `getByRole` → `getByLabelText` → `getByText` → `getByTestId`.
- Use `getByTestId` sparingly; only when semantic queries are not practical.
- Mock external services and API calls at the module boundary with `vi.mock()`.
- Aim for tests that assert observable behavior (what the user sees / can do), not internal state.

### Vitest config snippet (`vite.config.ts`)

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
    coverage: {
      reporter: ['text', 'lcov'],
    },
  },
})
```

### Setup file (`src/test/setup.ts`)

```ts
import '@testing-library/jest-dom'
```

### Tailwind + daisyUI config snippet (`tailwind.config.js`)
```js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [require("daisyui")],
  daisyui: {
    themes: ["light", "dark"], // Enable light and dark themes
    darkTheme: "dark", // Name of dark theme
    base: true, // Apply background color and foreground color for root element
    styled: true, // Include daisyUI colors and design decisions
    utils: true, // Adds responsive and modifier utility classes
  },
}
```


