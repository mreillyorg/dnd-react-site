import { renderHook, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext';
import type { ReactNode } from 'react';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockFetch = vi.fn();

function wrapper({ children }: { children: ReactNode }) {
  return (
    <MemoryRouter>
      <AuthProvider>{children}</AuthProvider>
    </MemoryRouter>
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = mockFetch;
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('token loading from localStorage', () => {
    it('calls fetchCurrentUser with stored token on mount', async () => {
      localStorage.setItem('auth_token', 'stored-token-123');

      mockFetch.mockResolvedValueOnce({
        json: () =>
          Promise.resolve({
            data: { me: { id: '1', email: 'user@test.com', name: 'Test User' } },
          }),
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockFetch).toHaveBeenCalledWith('/graphql', expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer stored-token-123',
        }),
      }));
      expect(result.current.user).toEqual({ id: '1', email: 'user@test.com', name: 'Test User' });
    });

    it('does not call fetch when no token is stored', async () => {
      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockFetch).not.toHaveBeenCalled();
      expect(result.current.user).toBeNull();
    });
  });

  describe('login', () => {
    it('stores token, updates user state, and navigates on success', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () =>
          Promise.resolve({
            data: {
              login: {
                token: 'new-token-456',
                user: { id: '2', email: 'login@test.com', name: 'Login User' },
              },
            },
          }),
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.login('login@test.com', 'password123');
      });

      expect(localStorage.getItem('auth_token')).toBe('new-token-456');
      expect(result.current.user).toEqual({ id: '2', email: 'login@test.com', name: 'Login User' });
      expect(result.current.token).toBe('new-token-456');
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });

    it('throws error and does not change state on failure', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () =>
          Promise.resolve({
            errors: [{ message: 'Invalid credentials' }],
          }),
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await expect(
        act(async () => {
          await result.current.login('bad@test.com', 'wrong');
        }),
      ).rejects.toThrow('Invalid credentials');

      expect(localStorage.getItem('auth_token')).toBeNull();
      expect(result.current.user).toBeNull();
      expect(result.current.token).toBeNull();
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('register', () => {
    it('stores token, updates user state, and navigates on success', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () =>
          Promise.resolve({
            data: {
              register: {
                token: 'reg-token-789',
                user: { id: '3', email: 'new@test.com', name: 'New User' },
              },
            },
          }),
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.register('new@test.com', 'securepass', 'New User');
      });

      expect(localStorage.getItem('auth_token')).toBe('reg-token-789');
      expect(result.current.user).toEqual({ id: '3', email: 'new@test.com', name: 'New User' });
      expect(result.current.token).toBe('reg-token-789');
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });

    it('throws error and does not change state on failure', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () =>
          Promise.resolve({
            errors: [{ message: 'Email already in use' }],
          }),
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await expect(
        act(async () => {
          await result.current.register('existing@test.com', 'password');
        }),
      ).rejects.toThrow('Email already in use');

      expect(localStorage.getItem('auth_token')).toBeNull();
      expect(result.current.user).toBeNull();
      expect(result.current.token).toBeNull();
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('removes token from localStorage, clears state, and navigates to /login', async () => {
      // Start with a logged-in user
      localStorage.setItem('auth_token', 'existing-token');

      mockFetch.mockResolvedValueOnce({
        json: () =>
          Promise.resolve({
            data: { me: { id: '1', email: 'user@test.com', name: 'Test User' } },
          }),
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.user).not.toBeNull();

      act(() => {
        result.current.logout();
      });

      expect(localStorage.getItem('auth_token')).toBeNull();
      expect(result.current.user).toBeNull();
      expect(result.current.token).toBeNull();
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });
  });

  describe('invalid stored token', () => {
    it('removes token and sets user to null when server returns errors', async () => {
      localStorage.setItem('auth_token', 'expired-token');

      mockFetch.mockResolvedValueOnce({
        json: () =>
          Promise.resolve({
            errors: [{ message: 'Token expired' }],
          }),
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(localStorage.getItem('auth_token')).toBeNull();
      expect(result.current.user).toBeNull();
      expect(result.current.token).toBeNull();
    });

    it('removes token and sets user to null when fetch throws network error', async () => {
      localStorage.setItem('auth_token', 'some-token');

      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(localStorage.getItem('auth_token')).toBeNull();
      expect(result.current.user).toBeNull();
      expect(result.current.token).toBeNull();
    });

    it('removes token when server returns null for me query', async () => {
      localStorage.setItem('auth_token', 'bad-token');

      mockFetch.mockResolvedValueOnce({
        json: () =>
          Promise.resolve({
            data: { me: null },
          }),
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(localStorage.getItem('auth_token')).toBeNull();
      expect(result.current.user).toBeNull();
    });
  });

  describe('useAuth outside provider', () => {
    it('throws error when used outside AuthProvider', () => {
      // Suppress React error boundary console output
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() => {
        renderHook(() => useAuth(), {
          wrapper: ({ children }: { children: ReactNode }) => (
            <MemoryRouter>{children}</MemoryRouter>
          ),
        });
      }).toThrow('useAuth must be used within an AuthProvider');

      consoleSpy.mockRestore();
    });
  });
});
