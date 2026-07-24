# Implementation Plan: Theme Selection

## Overview

Implement a theme selection system supporting light mode, dark mode, and system preference detection. The theme preference persists per user in the database and localStorage, with immediate UI updates and graceful fallback for unauthenticated users. All implementations must include comprehensive tests with 80% minimum coverage.

---

## Tasks

- [ ] 1. Update database schema and generate migration
  - Verify `User.themeMode` field exists in `prisma/schema.prisma` (should be "LIGHT" | "DARK" | "SYSTEM", default "SYSTEM")
  - Run `prisma migrate dev --name add_theme_mode` if field doesn't exist
  - Run `prisma generate` to update client
  - _Requirements: 1.1_
  - **TESTING REQUIRED: Verify migration runs successfully**

- [ ] 2. Implement GraphQL theme schema
  - [ ] 2.1 Create `src/graphql/types/Theme.ts`
    - Define `ThemeMode` enum with values: LIGHT, DARK, SYSTEM
    - Add `themeMode` field to User type exposing the enum
    - Implement `updateThemeMode` mutation with `mode: ThemeMode!` argument
    - Mutation resolver: check authentication, update user.themeMode, return updated user
    - _Requirements: 2.1, 2.2_
  - [ ] 2.2 Write unit tests for Theme GraphQL API (**REQUIRED**)
    - **Test ThemeMode enum definition**: assert all three values present
    - **Test me query returns themeMode**: assert default is SYSTEM for new users
    - **Test updateThemeMode mutation success**: assert theme updated in database
    - **Test updateThemeMode without auth**: assert throws NOT_AUTHENTICATED error
    - **Test updateThemeMode with invalid enum**: assert validation error
    - **Test theme persistence**: update theme, query me, assert matches
    - **All tests must pass before proceeding to task 3**
    - **Minimum 80% coverage required**
    - _Requirements: 2.1, 2.2_

- [ ] 3. Configure daisyUI themes in Tailwind
  - [ ] 3.1 Update `tailwind.config.js`
    - Configure daisyUI plugin with light and dark themes
    - Customize primary and secondary colors for both themes
    - Set `darkTheme: "dark"` and `base: true`
    - Enable theme utilities with `utils: true`
    - _Requirements: 3.1_
  - [ ] 3.2 Verify theme configuration (**REQUIRED**)
    - **Manual test**: Run dev server, inspect HTML element, verify data-theme attribute changes
    - **Build test**: Run `npm run build`, assert no Tailwind errors
    - **Theme test**: Create simple component with both themes, verify styling applies correctly
    - **All verifications must pass before proceeding to task 4**
    - _Requirements: 3.1_

- [ ] 4. Implement React ThemeContext
  - [ ] 4.1 Create `src/contexts/ThemeContext.tsx`
    - Define `ThemeMode` type: 'light' | 'dark' | 'system'
    - Define `ThemeContextType` interface with theme, actualTheme, setTheme, isLoading
    - Implement system preference detection using `window.matchMedia('(prefers-color-scheme: dark)')`
    - Implement theme resolution: if system, use matchMedia result; else use explicit theme
    - Apply theme to `document.documentElement.setAttribute('data-theme', actualTheme)`
    - Load theme from server for authenticated users (via me query)
    - Load theme from localStorage for unauthenticated users
    - Implement `setTheme()`: update state, save to localStorage, persist to server if authenticated
    - Handle server errors gracefully (log, keep local theme applied)
    - _Requirements: 4.1, 4.2, 4.3, 4.4_
  - [ ] 4.2 Write unit tests for ThemeContext (**REQUIRED**)
    - **Mock window.matchMedia**
    - **Mock useAuth hook**
    - **Mock fetch for GraphQL calls**
    - **Test default theme is system**: assert initial state
    - **Test localStorage loading for unauthenticated**: assert theme loaded from storage
    - **Test server loading for authenticated**: assert GraphQL query called, theme set from server response
    - **Test system preference detection**: assert actualTheme matches system when theme is 'system'
    - **Test system preference changes**: assert actualTheme updates when matchMedia changes
    - **Test theme application to document**: assert data-theme attribute set on document.documentElement
    - **Test setTheme() local only**: assert localStorage updated for unauthenticated users
    - **Test setTheme() with server sync**: assert GraphQL mutation called for authenticated users
    - **Test server error handling**: assert theme still applied locally when mutation fails
    - **Test useTheme outside provider**: assert throws error
    - **All tests must pass before proceeding to task 5**
    - **Minimum 80% coverage required**
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ] 5. Checkpoint — Context and backend complete
  - **GATE: All backend and context tests must pass with 80%+ coverage**
  - Run `npm run test:coverage`
  - Verify GraphQL theme tests pass
  - Verify ThemeContext tests pass
  - Verify coverage meets 80% threshold
  - **DO NOT PROCEED without passing tests**
  - Ask user if questions arise

- [ ] 6. Implement ThemeToggle button component
  - [ ] 6.1 Create `src/components/ThemeToggle.tsx`
    - Use `useTheme()` hook to access theme state
    - Implement cycle behavior: light → dark → system → light
    - Display appropriate icon for current theme (sun, moon, desktop)
    - Add tooltip showing current theme mode
    - Use daisyUI button styling (btn-ghost, btn-circle)
    - Add ARIA label for accessibility
    - _Requirements: 5.1, 5.2_
  - [ ] 6.2 Write component tests for ThemeToggle (**REQUIRED**)
    - **Mock useTheme hook**
    - **Test button renders**: assert button element present
    - **Test icon display for light theme**: assert sun icon shown
    - **Test icon display for dark theme**: assert moon icon shown
    - **Test icon display for system theme**: assert desktop icon shown
    - **Test theme cycling on click**: assert setTheme called with next mode
    - **Test cycle order**: light → dark → system → light
    - **Test accessibility**: assert ARIA label present, button is keyboard accessible
    - **Test tooltip**: assert title attribute shows current theme
    - **All tests must pass before proceeding to task 7**
    - **Minimum 80% coverage required**
    - _Requirements: 5.1, 5.2_

- [ ] 7. Implement ThemeSettings panel component
  - [ ] 7.1 Create `src/components/ThemeSettings.tsx`
    - Use `useTheme()` hook to access theme state
    - Display radio buttons for each theme option (light, dark, system)
    - Show current system preference when system theme is selected
    - Add informational alert explaining system default behavior
    - Use daisyUI card and form styling
    - Update theme on radio button change
    - _Requirements: 5.1, 5.2, 6.1_
  - [ ] 7.2 Write component tests for ThemeSettings (**REQUIRED**)
    - **Mock useTheme hook**
    - **Test all radio buttons render**: assert three options present
    - **Test correct option selected**: assert radio matches current theme
    - **Test system preference display**: assert shows "Currently: dark/light" when system theme selected
    - **Test theme change on selection**: assert setTheme called when radio clicked
    - **Test informational alert**: assert system default explanation present
    - **Test accessibility**: assert labels properly associated with radios
    - **All tests must pass before proceeding to task 8**
    - **Minimum 80% coverage required**
    - _Requirements: 5.1, 5.2, 6.1_

- [ ] 8. Add ThemeProvider to app and integrate ThemeToggle in navigation
  - Update `src/main.tsx`: wrap app with ThemeProvider after AuthProvider
  - Update navigation bar component: add ThemeToggle button
  - Create settings page: include ThemeSettings panel
  - Test theme persistence across page refreshes
  - Test theme switching for authenticated and unauthenticated users
  - _Requirements: 7.1, 7.2_

- [ ] 9. Add theme initialization script to prevent flash
  - [ ] 9.1 Create inline script in `index.html`
    - Read theme from localStorage before React renders
    - Apply data-theme attribute to document.documentElement immediately
    - Prevent white flash on dark mode load
    - Handle missing localStorage gracefully (default to system)
    - _Requirements: 8.1_
  - [ ] 9.2 Test flash prevention (**REQUIRED**)
    - **Manual test**: Set theme to dark, reload page, verify no white flash
    - **Manual test**: Set theme to light, reload page, verify immediate light theme
    - **Manual test**: Clear localStorage, reload, verify system theme applied
    - **Performance test**: Measure time to first paint with theme applied
    - **All tests must pass before proceeding to task 10**
    - _Requirements: 8.1_

- [ ] 10. Integration testing — Full theme flow
  - [ ] 10.1 Write end-to-end theme flow tests (**REQUIRED**)
    - **Test unauthenticated theme flow**: set theme → localStorage → document attribute → reload → theme persists
    - **Test authenticated theme flow**: set theme → GraphQL mutation → database → localStorage → theme persists across sessions
    - **Test theme sync on login**: unauthenticated theme in localStorage → login → server theme overrides
    - **Test system preference detection**: change system theme → actualTheme updates automatically
    - **Test theme application**: cycle through all themes, verify document.documentElement.getAttribute('data-theme') matches
    - **Test server failure resilience**: mutation fails → theme still applied locally
    - **Use test database (in-memory SQLite) for authenticated tests**
    - **All tests must pass before proceeding to task 11**
    - **Minimum 80% coverage for integration scenarios**
    - _Requirements: All requirements_

- [ ] 11. Accessibility and contrast validation
  - [ ] 11.1 Validate WCAG compliance (**REQUIRED**)
    - **Test contrast ratios**: Run automated contrast checker on both themes
    - **Assert 4.5:1 for normal text**: All body text meets AA standard
    - **Assert 3:1 for large text**: All headings meet AA standard
    - **Test with screen reader**: Verify theme changes announced
    - **Test keyboard navigation**: Verify theme toggle accessible via keyboard
    - **Test reduced motion**: Verify theme transitions respect prefers-reduced-motion
    - **All accessibility tests must pass**
    - _Requirements: 9.1_

- [ ] 12. Final checkpoint — Complete test suite
  - **FINAL GATE: ALL tests must pass with 80%+ coverage**
  - Run full test suite: `npm run test:coverage`
  - Verify all unit tests pass (GraphQL, ThemeContext, components)
  - Verify all integration tests pass
  - Verify accessibility tests pass
  - Verify coverage ≥ 80% on lines, functions, branches, statements
  - Test manually: switch themes, refresh page, login/logout, change system theme
  - **DO NOT PROCEED to production without passing all tests**
  - Ask user if questions arise

---

## Notes

- **TESTING IS MANDATORY**: Every implementation task includes corresponding tests that MUST pass before proceeding.
- **Coverage requirement**: Minimum 80% coverage on lines, functions, branches, and statements.
- **Theme persistence**: localStorage for immediate access, database for cross-device sync.
- **System preference**: Listen for matchMedia changes to update automatically.
- **Flash prevention**: Inline script in index.html applies theme before React loads.
- **Graceful degradation**: Theme works for unauthenticated users with localStorage only.
- **Accessibility**: WCAG AA compliance for contrast, keyboard accessible, screen reader support.
- **Gate checkpoints**: Tasks 5, 10, and 12 are explicit gates where all tests must pass before continuing.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1"] },
    { "id": 1, "tasks": ["2.1", "3.1"] },
    { "id": 2, "tasks": ["2.2", "3.2"] },
    { "id": 3, "tasks": ["4.1"] },
    { "id": 4, "tasks": ["4.2", "5"] },
    { "id": 5, "tasks": ["6.1", "7.1"] },
    { "id": 6, "tasks": ["6.2", "7.2"] },
    { "id": 7, "tasks": ["8", "9.1"] },
    { "id": 8, "tasks": ["9.2"] },
    { "id": 9, "tasks": ["10.1"] },
    { "id": 10, "tasks": ["11.1"] },
    { "id": 11, "tasks": ["12"] }
  ]
}
```
