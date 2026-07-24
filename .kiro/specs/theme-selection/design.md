# Design Document - Theme Selection

## Overview

This design implements a theme selection system allowing users to choose between light mode, dark mode, and system preference. The theme preference is stored per user and persists across sessions. The implementation uses daisyUI's built-in theme support with React Context for state management.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    React Components                          │
│  (Theme toggle button, settings page)                       │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│                   Theme Context                              │
│  (Manages theme state, localStorage, system preference)     │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│                  GraphQL Mutation                            │
│  (Persists theme preference to database)                    │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│                     Database                                 │
│  (User.themeMode field)                                     │
└─────────────────────────────────────────────────────────────┘
```

## Database Schema

Already defined in the data-storage-api design:

```prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  passwordHash  String
  name          String?
  themeMode     String    @default("SYSTEM") // "LIGHT", "DARK", "SYSTEM"
  // ... other fields
}
```

## Backend Implementation

### GraphQL Schema

```typescript
// src/graphql/types/Theme.ts

import { builder } from '../schema';

// Theme mode enum
const ThemeModeEnum = builder.enumType('ThemeMode', {
  values: ['LIGHT', 'DARK', 'SYSTEM'] as const,
});

// Add themeMode field to User type (already defined)
builder.prismaObjectField('User', 'themeMode', (t) =>
  t.expose('themeMode', {
    type: ThemeModeEnum,
  })
);

// Mutation to update theme preference
builder.mutationField('updateThemeMode', (t) =>
  t.prismaField({
    type: 'User',
    args: {
      mode: t.arg({ type: ThemeModeEnum, required: true }),
    },
    resolve: async (query, _root, args, ctx) => {
      if (!ctx.userId) {
        throw new Error('Not authenticated');
      }

      return ctx.prisma.user.update({
        ...query,
        where: { id: ctx.userId },
        data: { themeMode: args.mode },
      });
    },
  })
);

// Query to get current theme (part of me query)
// Already included in User type, no additional query needed
```

## Frontend Implementation

### Theme Context

```typescript
// src/contexts/ThemeContext.tsx

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: ThemeMode;
  actualTheme: 'light' | 'dark'; // Resolved theme after system preference
  setTheme: (mode: ThemeMode) => Promise<void>;
  isLoading: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_KEY = 'theme_preference';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { user, token } = useAuth();
  const [theme, setThemeState] = useState<ThemeMode>('system');
  const [actualTheme, setActualTheme] = useState<'light' | 'dark'>('light');
  const [isLoading, setIsLoading] = useState(true);

  // Determine actual theme based on system preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const updateActualTheme = () => {
      if (theme === 'system') {
        setActualTheme(mediaQuery.matches ? 'dark' : 'light');
      } else {
        setActualTheme(theme);
      }
    };

    updateActualTheme();

    // Listen for system theme changes
    mediaQuery.addEventListener('change', updateActualTheme);
    return () => mediaQuery.removeEventListener('change', updateActualTheme);
  }, [theme]);

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', actualTheme);
  }, [actualTheme]);

  // Load theme preference on mount
  useEffect(() => {
    const loadTheme = async () => {
      if (user) {
        // Fetch from server if authenticated
        try {
          const response = await fetch('/graphql', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              query: `
                query {
                  me {
                    themeMode
                  }
                }
              `,
            }),
          });

          const { data } = await response.json();
          if (data?.me?.themeMode) {
            const serverTheme = data.me.themeMode.toLowerCase() as ThemeMode;
            setThemeState(serverTheme);
            localStorage.setItem(THEME_KEY, serverTheme);
          }
        } catch (error) {
          console.error('Failed to load theme preference:', error);
          // Fall back to localStorage
          const stored = localStorage.getItem(THEME_KEY) as ThemeMode | null;
          if (stored) {
            setThemeState(stored);
          }
        }
      } else {
        // Load from localStorage for unauthenticated users
        const stored = localStorage.getItem(THEME_KEY) as ThemeMode | null;
        if (stored) {
          setThemeState(stored);
        }
      }
      setIsLoading(false);
    };

    loadTheme();
  }, [user, token]);

  const setTheme = async (mode: ThemeMode) => {
    setThemeState(mode);
    localStorage.setItem(THEME_KEY, mode);

    // Persist to database if authenticated
    if (user && token) {
      try {
        await fetch('/graphql', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            query: `
              mutation UpdateThemeMode($mode: ThemeMode!) {
                updateThemeMode(mode: $mode) {
                  id
                  themeMode
                }
              }
            `,
            variables: { mode: mode.toUpperCase() },
          }),
        });
      } catch (error) {
        console.error('Failed to persist theme preference:', error);
        // Theme is still applied locally even if server update fails
      }
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, actualTheme, setTheme, isLoading }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
```

### Theme Toggle Component

```typescript
// src/components/ThemeToggle.tsx

import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

export function ThemeToggle() {
  const { theme, actualTheme, setTheme } = useTheme();

  const cycleTheme = () => {
    const modes: Array<'light' | 'dark' | 'system'> = ['light', 'dark', 'system'];
    const currentIndex = modes.indexOf(theme);
    const nextIndex = (currentIndex + 1) % modes.length;
    setTheme(modes[nextIndex]);
  };

  const getIcon = () => {
    if (theme === 'system') {
      return (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
      );
    }

    if (actualTheme === 'dark') {
      return (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
          />
        </svg>
      );
    }

    return (
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
        />
      </svg>
    );
  };

  const getLabel = () => {
    if (theme === 'system') return 'System';
    if (theme === 'dark') return 'Dark';
    return 'Light';
  };

  return (
    <button
      onClick={cycleTheme}
      className="btn btn-ghost btn-circle"
      title={`Theme: ${getLabel()}`}
      aria-label="Toggle theme"
    >
      {getIcon()}
    </button>
  );
}
```

### Theme Settings Panel

```typescript
// src/components/ThemeSettings.tsx

import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

export function ThemeSettings() {
  const { theme, actualTheme, setTheme } = useTheme();

  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <h2 className="card-title">Theme Preferences</h2>

        <div className="form-control">
          <label className="label cursor-pointer">
            <span className="label-text">Light Mode</span>
            <input
              type="radio"
              name="theme"
              className="radio radio-primary"
              checked={theme === 'light'}
              onChange={() => setTheme('light')}
            />
          </label>
        </div>

        <div className="form-control">
          <label className="label cursor-pointer">
            <span className="label-text">Dark Mode</span>
            <input
              type="radio"
              name="theme"
              className="radio radio-primary"
              checked={theme === 'dark'}
              onChange={() => setTheme('dark')}
            />
          </label>
        </div>

        <div className="form-control">
          <label className="label cursor-pointer">
            <span className="label-text">
              System Default
              {theme === 'system' && (
                <span className="text-sm text-base-content/60 ml-2">
                  (Currently: {actualTheme})
                </span>
              )}
            </span>
            <input
              type="radio"
              name="theme"
              className="radio radio-primary"
              checked={theme === 'system'}
              onChange={() => setTheme('system')}
            />
          </label>
        </div>

        <div className="alert alert-info mt-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            className="stroke-current shrink-0 w-6 h-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            ></path>
          </svg>
          <span>
            System default will automatically switch between light and dark based on
            your operating system settings.
          </span>
        </div>
      </div>
    </div>
  );
}
```

### App Setup

```typescript
// src/main.tsx

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
          <App />
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
```

### Navigation Bar with Theme Toggle

```typescript
// src/components/Navbar.tsx

import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ThemeToggle } from './ThemeToggle';

export function Navbar() {
  const { user, logout } = useAuth();

  return (
    <div className="navbar bg-base-100 shadow-lg">
      <div className="flex-1">
        <Link to="/" className="btn btn-ghost text-xl">
          D&D Companion
        </Link>
      </div>

      <div className="flex-none gap-2">
        <ThemeToggle />

        {user ? (
          <div className="dropdown dropdown-end">
            <label tabIndex={0} className="btn btn-ghost btn-circle avatar">
              <div className="w-10 rounded-full bg-primary text-primary-content flex items-center justify-center">
                <span>{user.name?.[0] || user.email[0].toUpperCase()}</span>
              </div>
            </label>
            <ul
              tabIndex={0}
              className="mt-3 p-2 shadow menu menu-sm dropdown-content bg-base-100 rounded-box w-52"
            >
              <li>
                <Link to="/profile">Profile</Link>
              </li>
              <li>
                <Link to="/settings">Settings</Link>
              </li>
              <li>
                <button onClick={logout}>Logout</button>
              </li>
            </ul>
          </div>
        ) : (
          <Link to="/login" className="btn btn-primary">
            Login
          </Link>
        )}
      </div>
    </div>
  );
}
```

## DaisyUI Configuration

```javascript
// tailwind.config.js

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
    themes: [
      {
        light: {
          ...require("daisyui/src/theming/themes")["light"],
          primary: "#570df8",
          secondary: "#f000b8",
        },
        dark: {
          ...require("daisyui/src/theming/themes")["dark"],
          primary: "#661ae6",
          secondary: "#d926aa",
        },
      },
    ],
    darkTheme: "dark",
    base: true,
    styled: true,
    utils: true,
  },
}
```

## Testing Strategy

### Backend Tests

```typescript
// src/graphql/types/__tests__/Theme.test.ts

import { describe, it, expect, beforeEach } from 'vitest';
import { yoga } from '../../server';
import { prisma } from '../../../lib/db/prisma';
import { AuthService } from '../../../services/authService';

describe('Theme GraphQL API', () => {
  let userId: string;
  let token: string;

  beforeEach(async () => {
    await prisma.user.deleteMany();

    const result = await AuthService.register({
      email: 'test@example.com',
      password: 'TestPassword123',
    });

    userId = result.user.id;
    token = result.token;
  });

  it('should return default theme mode for new user', async () => {
    const response = await yoga.fetch('http://localhost/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        query: `
          query {
            me {
              themeMode
            }
          }
        `,
      }),
    });

    const result = await response.json();
    expect(result.data.me.themeMode).toBe('SYSTEM');
  });

  it('should update theme mode', async () => {
    const response = await yoga.fetch('http://localhost/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        query: `
          mutation UpdateThemeMode($mode: ThemeMode!) {
            updateThemeMode(mode: $mode) {
              themeMode
            }
          }
        `,
        variables: { mode: 'DARK' },
      }),
    });

    const result = await response.json();
    expect(result.data.updateThemeMode.themeMode).toBe('DARK');

    // Verify persistence
    const user = await prisma.user.findUnique({ where: { id: userId } });
    expect(user?.themeMode).toBe('DARK');
  });

  it('should reject theme update for unauthenticated user', async () => {
    const response = await yoga.fetch('http://localhost/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `
          mutation UpdateThemeMode($mode: ThemeMode!) {
            updateThemeMode(mode: $mode) {
              themeMode
            }
          }
        `,
        variables: { mode: 'DARK' },
      }),
    });

    const result = await response.json();
    expect(result.errors).toBeDefined();
    expect(result.errors[0].message).toContain('Not authenticated');
  });

  it('should validate theme mode enum values', async () => {
    const response = await yoga.fetch('http://localhost/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        query: `
          mutation UpdateThemeMode($mode: ThemeMode!) {
            updateThemeMode(mode: $mode) {
              themeMode
            }
          }
        `,
        variables: { mode: 'INVALID' },
      }),
    });

    const result = await response.json();
    expect(result.errors).toBeDefined();
  });
});
```

### Frontend Tests

```typescript
// src/contexts/__tests__/ThemeContext.test.tsx

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import { ThemeProvider, useTheme } from '../ThemeContext';
import { AuthContext } from '../AuthContext';

const mockFetch = vi.fn();
global.fetch = mockFetch;

function TestComponent() {
  const { theme, actualTheme, setTheme } = useTheme();
  return (
    <div>
      <div data-testid="theme">{theme}</div>
      <div data-testid="actual-theme">{actualTheme}</div>
      <button onClick={() => setTheme('dark')}>Set Dark</button>
    </div>
  );
}

describe('ThemeContext', () => {
  beforeEach(() => {
    localStorage.clear();
    mockFetch.mockClear();
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }));
  });

  it('should default to system theme', async () => {
    const authValue = {
      user: null,
      token: null,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    };

    render(
      <AuthContext.Provider value={authValue}>
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      </AuthContext.Provider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('theme')).toHaveTextContent('system');
    });
  });

  it('should load theme from localStorage for unauthenticated user', async () => {
    localStorage.setItem('theme_preference', 'dark');

    const authValue = {
      user: null,
      token: null,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    };

    render(
      <AuthContext.Provider value={authValue}>
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      </AuthContext.Provider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('theme')).toHaveTextContent('dark');
    });
  });

  it('should fetch theme from server for authenticated user', async () => {
    mockFetch.mockResolvedValueOnce({
      json: async () => ({
        data: {
          me: {
            themeMode: 'DARK',
          },
        },
      }),
    });

    const authValue = {
      user: { id: '1', email: 'test@example.com', name: null },
      token: 'test-token',
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    };

    render(
      <AuthContext.Provider value={authValue}>
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      </AuthContext.Provider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('theme')).toHaveTextContent('dark');
    });
  });

  it('should persist theme to server when authenticated', async () => {
    mockFetch.mockResolvedValue({
      json: async () => ({ data: {} }),
    });

    const authValue = {
      user: { id: '1', email: 'test@example.com', name: null },
      token: 'test-token',
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    };

    render(
      <AuthContext.Provider value={authValue}>
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      </AuthContext.Provider>
    );

    await act(async () => {
      screen.getByRole('button', { name: /set dark/i }).click();
    });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/graphql',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        })
      );
    });
  });

  it('should apply theme to document', async () => {
    const authValue = {
      user: null,
      token: null,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    };

    render(
      <AuthContext.Provider value={authValue}>
        <ThemeProvider>
          <TestComponent />
        </ThemeProvider>
      </AuthContext.Provider>
    );

    await act(async () => {
      screen.getByRole('button', { name: /set dark/i }).click();
    });

    await waitFor(() => {
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });
  });
});
```

### Component Tests

```typescript
// src/components/__tests__/ThemeToggle.test.tsx

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeToggle } from '../ThemeToggle';
import { ThemeContext } from '../../contexts/ThemeContext';

describe('ThemeToggle', () => {
  it('should cycle through themes on click', () => {
    const setTheme = vi.fn();
    const themeValue = {
      theme: 'light' as const,
      actualTheme: 'light' as const,
      setTheme,
      isLoading: false,
    };

    render(
      <ThemeContext.Provider value={themeValue}>
        <ThemeToggle />
      </ThemeContext.Provider>
    );

    const button = screen.getByRole('button', { name: /toggle theme/i });
    fireEvent.click(button);

    expect(setTheme).toHaveBeenCalledWith('dark');
  });

  it('should display correct icon for each theme', () => {
    const themes: Array<'light' | 'dark' | 'system'> = ['light', 'dark', 'system'];

    themes.forEach((theme) => {
      const { rerender } = render(
        <ThemeContext.Provider
          value={{
            theme,
            actualTheme: theme === 'system' ? 'light' : theme,
            setTheme: vi.fn(),
            isLoading: false,
          }}
        >
          <ThemeToggle />
        </ThemeContext.Provider>
      );

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();

      rerender(<></>);
    });
  });
});
```

### Required Test Coverage

All implementations MUST include:

1. **Backend tests** for:
   - Theme mode query (default value, authenticated access)
   - Theme mode mutation (update, persistence, authentication)
   - Enum validation
   - Error handling

2. **Frontend tests** for:
   - ThemeContext (default, localStorage, server fetch, persistence)
   - Theme application to document
   - System preference detection
   - Theme cycling logic
   - Component rendering

3. **Integration tests** for:
   - Full theme change flow (UI → Context → GraphQL → Database)
   - Theme persistence across sessions
   - Unauthenticated vs authenticated behavior

4. **Minimum coverage**: 80% across lines, functions, branches, and statements

## Accessibility Considerations

1. **WCAG Compliance**
   - Sufficient contrast ratios in both themes (4.5:1 for normal text, 3:1 for large text)
   - No information conveyed by color alone
   - Keyboard accessible theme toggle

2. **Screen Reader Support**
   - Proper ARIA labels on theme toggle button
   - Announce theme changes to screen readers

3. **Reduced Motion**
   - Respect prefers-reduced-motion for animations

## Performance Considerations

1. **Immediate Application**
   - Theme applied to document before first render to prevent flash
   - Use inline script in index.html to apply theme from localStorage

2. **Lazy Server Sync**
   - Theme applied locally first, server updated asynchronously
   - No blocking on server response for theme changes

## Next Steps

1. Add theme preview before applying (with tests)
2. Support custom theme colors (with tests)
3. Add per-device theme preferences (with tests)
4. Implement theme import/export (with tests)
