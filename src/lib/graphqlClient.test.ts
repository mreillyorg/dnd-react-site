import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { graphqlRequest } from './graphqlClient';

describe('graphqlClient', () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch);
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('successful request', () => {
    it('sends correct fetch params with Authorization header when token exists', async () => {
      localStorage.setItem('auth_token', 'test-jwt-token');
      mockFetch.mockResolvedValue({
        json: () => Promise.resolve({ data: { user: { id: '1', name: 'Test' } } }),
      });

      const query = '{ user { id name } }';
      const variables = { id: '1' };

      await graphqlRequest(query, variables);

      expect(mockFetch).toHaveBeenCalledWith('/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-jwt-token',
        },
        body: JSON.stringify({ query, variables }),
      });
    });

    it('extracts and returns data from the response', async () => {
      mockFetch.mockResolvedValue({
        json: () => Promise.resolve({ data: { users: [{ id: '1' }, { id: '2' }] } }),
      });

      const result = await graphqlRequest('{ users { id } }');

      expect(result).toEqual({ users: [{ id: '1' }, { id: '2' }] });
    });
  });

  describe('request without token', () => {
    it('does not include Authorization header when no token in localStorage', async () => {
      mockFetch.mockResolvedValue({
        json: () => Promise.resolve({ data: { public: true } }),
      });

      await graphqlRequest('{ public }');

      expect(mockFetch).toHaveBeenCalledWith('/graphql', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: '{ public }', variables: undefined }),
      });
    });

    it('still returns data successfully without a token', async () => {
      mockFetch.mockResolvedValue({
        json: () => Promise.resolve({ data: { hello: 'world' } }),
      });

      const result = await graphqlRequest('{ hello }');

      expect(result).toEqual({ hello: 'world' });
    });
  });

  describe('GraphQL errors', () => {
    it('throws an error with the first error message from GraphQL response', async () => {
      mockFetch.mockResolvedValue({
        json: () =>
          Promise.resolve({
            data: null,
            errors: [
              { message: 'User not found' },
              { message: 'Another error' },
            ],
          }),
      });

      await expect(graphqlRequest('{ user { id } }')).rejects.toThrow('User not found');
    });

    it('throws when errors array has a single error', async () => {
      mockFetch.mockResolvedValue({
        json: () =>
          Promise.resolve({
            data: null,
            errors: [{ message: 'Unauthorized' }],
          }),
      });

      await expect(graphqlRequest('{ me { id } }')).rejects.toThrow('Unauthorized');
    });
  });

  describe('network errors', () => {
    it('throws when fetch rejects (network failure)', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      await expect(graphqlRequest('{ user { id } }')).rejects.toThrow('Network error');
    });

    it('throws when response.json() fails', async () => {
      mockFetch.mockResolvedValue({
        json: () => Promise.reject(new Error('Invalid JSON')),
      });

      await expect(graphqlRequest('{ user { id } }')).rejects.toThrow('Invalid JSON');
    });
  });

  describe('response parsing', () => {
    it('correctly extracts typed data from response', async () => {
      interface UserData {
        user: { id: string; email: string };
      }

      mockFetch.mockResolvedValue({
        json: () =>
          Promise.resolve({
            data: { user: { id: 'abc', email: 'test@example.com' } },
          }),
      });

      const result = await graphqlRequest<UserData>('{ user { id email } }');

      expect(result.user.id).toBe('abc');
      expect(result.user.email).toBe('test@example.com');
    });

    it('handles null data fields correctly when no errors', async () => {
      mockFetch.mockResolvedValue({
        json: () => Promise.resolve({ data: { me: null } }),
      });

      const result = await graphqlRequest('{ me { id } }');

      expect(result).toEqual({ me: null });
    });

    it('passes variables correctly in the request body', async () => {
      mockFetch.mockResolvedValue({
        json: () => Promise.resolve({ data: { createUser: { id: '1' } } }),
      });

      const query = 'mutation CreateUser($email: String!) { createUser(email: $email) { id } }';
      const variables = { email: 'new@example.com' };

      await graphqlRequest(query, variables);

      const lastCall = mockFetch.mock.calls[mockFetch.mock.calls.length - 1];
      const body = JSON.parse(lastCall[1].body);
      expect(body.query).toBe(query);
      expect(body.variables).toEqual(variables);
    });
  });
});
