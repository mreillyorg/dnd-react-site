import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;

  if (score <= 1) return { score, label: 'Weak', color: 'progress-error' };
  if (score === 2) return { score, label: 'Fair', color: 'progress-warning' };
  if (score === 3) return { score, label: 'Good', color: 'progress-info' };
  return { score, label: 'Strong', color: 'progress-success' };
}

export function RegisterPage() {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const passwordsMatch = confirmPassword === '' || password === confirmPassword;
  const strength = getPasswordStrength(password);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);

    try {
      await register(email, password, name || undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-200 px-4">
      <div className="card bg-base-100 w-full max-w-sm shadow-sm">
        <div className="card-body">
          <h2 className="card-title text-2xl justify-center mb-2">Register</h2>

          <form onSubmit={handleSubmit}>
            <fieldset className="fieldset">
              <label className="label" htmlFor="name">
                Name
              </label>
              <input
                id="name"
                type="text"
                className="input w-full"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
              />
              <p className="label text-xs opacity-60">Optional</p>
            </fieldset>

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
                placeholder="Choose a password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                aria-required="true"
              />
              {password && (
                <div className="mt-2">
                  <div className="flex justify-between text-xs mb-1">
                    <span>Strength:</span>
                    <span>{strength.label}</span>
                  </div>
                  <progress
                    className={`progress ${strength.color} w-full`}
                    value={strength.score}
                    max={4}
                    aria-label="Password strength"
                  />
                </div>
              )}
            </fieldset>

            <fieldset className="fieldset">
              <label className="label" htmlFor="confirmPassword">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                className="input w-full"
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
                aria-required="true"
                aria-invalid={!passwordsMatch}
              />
              {!passwordsMatch && (
                <p className="label text-xs text-error">
                  Passwords do not match
                </p>
              )}
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
                {isLoading ? 'Creating account...' : 'Register'}
              </button>
            </div>
          </form>

          <div className="divider">OR</div>

          <p className="text-center text-sm">
            Already have an account?{' '}
            <Link to="/login" className="link link-primary">
              Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
