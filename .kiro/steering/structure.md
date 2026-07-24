---
inclusion: always
---

# Project Structure

## Current Layout

```
dnd-site/
├── .kiro/              # Kiro IDE configuration (steering, hooks, specs)
├── public/             # Static assets (images, fonts, favicon)
├── src/
│   ├── assets/         # Imported static assets (icons, images)
│   ├── components/     # Reusable UI components
│   │   └── ui/         # Low-level primitives (buttons, inputs, modals)
│   ├── features/       # Feature-scoped modules (character, campaign, etc.)
│   │   └── <feature>/
│   │       ├── components/
│   │       ├── hooks/
│   │       └── types.ts
│   ├── hooks/          # Shared custom React hooks
│   ├── lib/            # Utility functions and helpers
│   ├── pages/          # Route-level page components
│   ├── services/       # API clients and data-fetching logic
│   ├── store/          # Global state (if applicable)
│   ├── test/           # Global test setup (setup.ts, custom matchers)
│   └── types/          # Shared TypeScript types and interfaces
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## Conventions

- Group code by **feature** first, then by type within a feature.
- Shared/cross-cutting code lives at the `src/` level (hooks, lib, types).
- Component files use PascalCase (`CharacterCard.tsx`); all other files use camelCase or kebab-case.
- Co-locate tests alongside the file they test (`CharacterCard.test.tsx`).
