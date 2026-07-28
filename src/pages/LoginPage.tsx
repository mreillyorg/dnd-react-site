import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-200 px-4">
      <div className="card bg-base-100 w-full max-w-sm shadow-sm">
        <div className="card-body">
          <h2 className="card-title text-2xl justify-center mb-2">Login</h2>

          <form onSubmit={handleSubmit}>
            <fieldset className="fieldset">
              <label className="label" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                className="input w-full"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                aria-required="true"
              />
            </fieldset>

            <fieldset className="fieldset">
              <label className="label" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                className="input w-full"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                aria-required="true"
              />
            </fieldset>

            {error && (
              <div className="alert alert-error mt-4" role="alert">
                <span>{error}</span>
              </div>
            )}

            <div className="mt-6">
              <button
                type="submit"
                className="btn btn-primary w-full"
                disabled={isLoading}
                aria-busy={isLoading}
              >
                {isLoading && (
                  <span className="loading loading-spinner loading-sm" />
                )}
                {isLoading ? 'Logging in...' : 'Login'}
              </button>
            </div>
          </form>

          <div className="divider">OR</div>

          <p className="text-center text-sm">
            Don't have an account?{' '}
            <Link to="/register" className="link link-primary">
              Register
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
