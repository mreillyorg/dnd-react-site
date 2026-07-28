import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ERROR_MESSAGES: Record<string, string> = {
  provider_timeout: "The authentication provider took too long to respond. Please try again.",
  provider_error: "There was a problem communicating with the authentication provider.",
  profile_fetch_failed: "Could not retrieve your profile. Please try again.",
  identity_conflict: "This account is already linked to a different user.",
  account_creation_failed: "Could not create your account. Please try again.",
  email_required: "Your OAuth provider did not share an email address, which is required.",
  access_denied: "You denied the authentication request.",
  invalid_state: "The authentication request was invalid. Please try again.",
};

const PROVIDERS = [
  { name: 'google', label: 'Google' },
  { name: 'discord', label: 'Discord' },
  { name: 'github', label: 'GitHub' },
  { name: 'facebook', label: 'Facebook' },
  { name: 'apple', label: 'Apple' },
  { name: 'microsoft', label: 'Microsoft' },
];

export function LoginPage() {
  const { initiateOAuth } = useAuth();
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);

  const errorCode = searchParams.get('error');
  const errorMessage = errorCode
    ? ERROR_MESSAGES[errorCode] ?? "An unknown error occurred. Please try again."
    : null;

  function handleProviderClick(provider: string) {
    setIsLoading(true);
    initiateOAuth(provider);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-200 px-4">
      <div className="card bg-base-100 w-full max-w-sm shadow-sm">
        <div className="card-body">
          <h2 className="card-title text-2xl justify-center mb-2">Login</h2>

          <p className="text-center text-sm text-base-content/70 mb-4">
            Sign in with one of the following providers
          </p>

          {errorMessage && (
            <div className="alert alert-error mb-4" role="alert">
              <span>{errorMessage}</span>
            </div>
          )}

          {isLoading && (
            <div className="flex justify-center mb-4">
              <span className="loading loading-spinner loading-md" />
            </div>
          )}

          <div className="flex flex-col gap-3">
            {PROVIDERS.map(({ name, label }) => (
              <button
                key={name}
                type="button"
                className="btn btn-outline w-full"
                onClick={() => handleProviderClick(name)}
                disabled={isLoading}
                aria-label={`Sign in with ${label}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
