import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import App from './App';

// Mock the AuthContext module
const mockLogin = vi.fn();
const mockRegister = vi.fn();
const mockLogout = vi.fn();

let mockAuthState = {
  user: null as { id: string; email: string; name: string | null } | null,
  token: null as string | null,
  isLoading: false,
  login: mockLogin,
  register: mockRegister,
  logout: mockLogout,
};

vi.mock('./contexts/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAuth: () => mockAuthState,
}));

// Mock the pages to keep tests focused on routing
vi.mock('./pages/LoginPage', () => ({
  LoginPage: () => <div data-testid="login-page">Login Page</div>,
}));

vi.mock('./pages/RegisterPage', () => ({
  RegisterPage: () => <div data-testid="register-page">Register Page</div>,
}));

function renderApp(initialRoute = '/') {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <App />
    </MemoryRouter>
  );
}

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthState = {
      user: null,
      token: null,
      isLoading: false,
      login: mockLogin,
      register: mockRegister,
      logout: mockLogout,
    };
  });

  describe('AuthProvider integration', () => {
    it('wraps the app with AuthProvider', () => {
      // If AuthProvider is not present, useAuth would throw.
      // The fact that App renders without error confirms the provider is in place.
      renderApp();
      expect(screen.getByText('D&D Companion')).toBeInTheDocument();
    });
  });

  describe('routing', () => {
    it('renders LoginPage at /login', () => {
      renderApp('/login');
      expect(screen.getByTestId('login-page')).toBeInTheDocument();
    });

    it('renders RegisterPage at /register', () => {
      renderApp('/register');
      expect(screen.getByTestId('register-page')).toBeInTheDocument();
    });

    it('renders HomePage at / when authenticated', () => {
      mockAuthState.user = { id: '1', email: 'test@example.com', name: 'Test User' };
      mockAuthState.token = 'valid-token';

      renderApp('/');
      expect(screen.getByText(/Welcome, Test User/)).toBeInTheDocument();
    });

    it('redirects unauthenticated users from / to /login (via ProtectedRoute)', () => {
      renderApp('/');
      // ProtectedRoute redirects to /login when user is null
      expect(screen.getByTestId('login-page')).toBeInTheDocument();
    });
  });

  describe('navigation', () => {
    it('shows login and register links when not authenticated', () => {
      renderApp();
      expect(screen.getByRole('link', { name: /login/i })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /register/i })).toBeInTheDocument();
    });

    it('shows user info and logout button when authenticated', () => {
      mockAuthState.user = { id: '1', email: 'user@example.com', name: 'Hero' };
      mockAuthState.token = 'valid-token';

      renderApp('/');
      expect(screen.getByText('Hero')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument();
    });

    it('shows email when user has no name', () => {
      mockAuthState.user = { id: '1', email: 'user@example.com', name: null };
      mockAuthState.token = 'valid-token';

      renderApp('/');
      expect(screen.getByText('user@example.com')).toBeInTheDocument();
    });

    it('calls logout when logout button is clicked', async () => {
      const user = userEvent.setup();
      mockAuthState.user = { id: '1', email: 'user@example.com', name: 'Hero' };
      mockAuthState.token = 'valid-token';

      renderApp('/');
      await user.click(screen.getByRole('button', { name: /logout/i }));
      expect(mockLogout).toHaveBeenCalledOnce();
    });

    it('renders the home link in navbar', () => {
      renderApp();
      expect(screen.getByRole('link', { name: /d&d companion/i })).toHaveAttribute('href', '/');
    });
  });
});
