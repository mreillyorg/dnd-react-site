import { renderHook, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('fetchCurrentUser', () => {
    it('calls the me query with credentials: "include"', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () =>
          Promise.resolve({
            data: { me: { id: '1', email: 'user@test.com', name: 'Test User' } },
          }),
      });

      renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });

      expect(mockFetch).toHaveBeenCalledWith('/graphql', expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
      }));

      // Verify no Authorization header is sent
      const callArgs = mockFetch.mock.calls[0][1];
      expect(callArgs.headers).not.toHaveProperty('Authorization');
    });

    it('sets user when me query returns valid user data', async () => {
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

      expect(result.current.user).toEqual({ id: '1', email: 'user@test.com', name: 'Test User' });
    });

    it('sets user to null when me query returns errors', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () =>
          Promise.resolve({
            errors: [{ message: 'Not authenticated' }],
          }),
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.user).toBeNull();
    });

    it('sets user to null when me query returns null', async () => {
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

      expect(result.current.user).toBeNull();
    });

    it('sets user to null when fetch throws a network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.user).toBeNull();
    });

    it('includes the me query in the request body', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ data: { me: null } }),
      });

      renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.query).toContain('me');
    });
  });

  describe('initiateOAuth', () => {
    it('sets window.location.href to /auth/initiate/{provider}', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ data: { me: null } }),
      });

      // Mock window.location.href
      const originalLocation = window.location;
      const locationMock = { ...originalLocation, href: '' };
      Object.defineProperty(window, 'location', {
        writable: true,
        value: locationMock,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.initiateOAuth('google');
      });

      expect(window.location.href).toBe('/auth/initiate/google');

      // Restore
      Object.defineProperty(window, 'location', {
        writable: true,
        value: originalLocation,
      });
    });

    it('sets window.location.href with the correct provider name for discord', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ data: { me: null } }),
      });

      const originalLocation = window.location;
      const locationMock = { ...originalLocation, href: '' };
      Object.defineProperty(window, 'location', {
        writable: true,
        value: locationMock,
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.initiateOAuth('discord');
      });

      expect(window.location.href).toBe('/auth/initiate/discord');

      Object.defineProperty(window, 'location', {
        writable: true,
        value: originalLocation,
      });
    });
  });

  describe('logout', () => {
    it('calls the GraphQL logout mutation with credentials: "include"', async () => {
      // First call: me query on mount
      mockFetch.mockResolvedValueOnce({
        json: () =>
          Promise.resolve({
            data: { me: { id: '1', email: 'user@test.com', name: 'Test User' } },
          }),
      });
      // Second call: logout mutation
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ data: { logout: true } }),
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.logout();
      });

      // Check the second fetch call (logout mutation)
      expect(mockFetch).toHaveBeenCalledTimes(2);
      const logoutCall = mockFetch.mock.calls[1];
      expect(logoutCall[0]).toBe('/graphql');
      expect(logoutCall[1]).toEqual(expect.objectContaining({
        method: 'POST',
        credentials: 'include',
      }));

      const logoutBody = JSON.parse(logoutCall[1].body);
      expect(logoutBody.query).toContain('logout');
    });

    it('clears user state after logout', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () =>
          Promise.resolve({
            data: { me: { id: '1', email: 'user@test.com', name: 'Test User' } },
          }),
      });
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ data: { logout: true } }),
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.user).not.toBeNull();
      });

      await act(async () => {
        await result.current.logout();
      });

      expect(result.current.user).toBeNull();
    });

    it('navigates to /login after logout', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () =>
          Promise.resolve({
            data: { me: { id: '1', email: 'user@test.com', name: 'Test User' } },
          }),
      });
      mockFetch.mockResolvedValueOnce({
        json: () => Promise.resolve({ data: { logout: true } }),
      });

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.logout();
      });

      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });

    it('clears user state even if logout mutation fails', async () => {
      mockFetch.mockResolvedValueOnce({
        json: () =>
          Promise.resolve({
            data: { me: { id: '1', email: 'user@test.com', name: 'Test User' } },
          }),
      });
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useAuth(), { wrapper });

      await waitFor(() => {
        expect(result.current.user).not.toBeNull();
      });

      await act(async () => {
        await result.current.logout();
      });

      expect(result.current.user).toBeNull();
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });
  });

  describe('useAuth outside provider', () => {
    it('throws error when used outside AuthProvider', () => {
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
