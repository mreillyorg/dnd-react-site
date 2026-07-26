import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';

const mockUseAuth = vi.fn();

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

function renderProtectedRoute(initialRoute = '/protected') {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <Routes>
        <Route
          path="/protected"
          element={
            <ProtectedRoute>
              <div>Protected Content</div>
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<LoginPageStub />} />
      </Routes>
    </MemoryRouter>
  );
}

function LoginPageStub() {
  // Access location state to verify route preservation
  const { useLocation } = require('react-router-dom');
  const location = useLocation();
  return (
    <div>
      <span>Login Page</span>
      {location.state?.from?.pathname && (
        <span data-testid="redirect-from">{location.state.from.pathname}</span>
      )}
    </div>
  );
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('loading state', () => {
    it('shows loading spinner while isLoading is true', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isLoading: true,
      });

      renderProtectedRoute();

      const spinner = document.querySelector('.loading-spinner');
      expect(spinner).toBeInTheDocument();
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });

    it('does not render children while loading', () => {
      mockUseAuth.mockReturnValue({
        user: { id: '1', email: 'test@example.com', name: 'Test' },
        isLoading: true,
      });

      renderProtectedRoute();

      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });
  });

  describe('unauthenticated redirect', () => {
    it('redirects to /login when user is null and not loading', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isLoading: false,
      });

      renderProtectedRoute();

      expect(screen.getByText('Login Page')).toBeInTheDocument();
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });
  });

  describe('authenticated access', () => {
    it('renders children when user is authenticated', () => {
      mockUseAuth.mockReturnValue({
        user: { id: '1', email: 'test@example.com', name: 'Test User' },
        isLoading: false,
      });

      renderProtectedRoute();

      expect(screen.getByText('Protected Content')).toBeInTheDocument();
      expect(screen.queryByText('Login Page')).not.toBeInTheDocument();
    });

    it('renders children when user has no name', () => {
      mockUseAuth.mockReturnValue({
        user: { id: '2', email: 'user@example.com', name: null },
        isLoading: false,
      });

      renderProtectedRoute();

      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });
  });

  describe('route preservation', () => {
    it('passes current location in state when redirecting to login', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isLoading: false,
      });

      renderProtectedRoute('/protected');

      expect(screen.getByTestId('redirect-from')).toHaveTextContent('/protected');
    });
  });
});
