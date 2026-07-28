import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { LoginPage } from './LoginPage';

const mockInitiateOAuth = vi.fn();

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    initiateOAuth: mockInitiateOAuth,
  }),
}));

function renderLoginPage(searchParams = '') {
  const initialEntries = [`/login${searchParams}`];
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <LoginPage />
    </MemoryRouter>
  );
}

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('provider buttons', () => {
    it('renders all 6 OAuth provider buttons', () => {
      renderLoginPage();

      expect(screen.getByRole('button', { name: /sign in with google/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in with discord/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in with github/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in with facebook/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in with apple/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in with microsoft/i })).toBeInTheDocument();
    });

    it('calls initiateOAuth with "google" when Google button is clicked', async () => {
      const user = userEvent.setup();
      renderLoginPage();

      await user.click(screen.getByRole('button', { name: /sign in with google/i }));

      expect(mockInitiateOAuth).toHaveBeenCalledWith('google');
    });

    it('calls initiateOAuth with "discord" when Discord button is clicked', async () => {
      const user = userEvent.setup();
      renderLoginPage();

      await user.click(screen.getByRole('button', { name: /sign in with discord/i }));

      expect(mockInitiateOAuth).toHaveBeenCalledWith('discord');
    });

    it('calls initiateOAuth with "github" when GitHub button is clicked', async () => {
      const user = userEvent.setup();
      renderLoginPage();

      await user.click(screen.getByRole('button', { name: /sign in with github/i }));

      expect(mockInitiateOAuth).toHaveBeenCalledWith('github');
    });

    it('calls initiateOAuth with "facebook" when Facebook button is clicked', async () => {
      const user = userEvent.setup();
      renderLoginPage();

      await user.click(screen.getByRole('button', { name: /sign in with facebook/i }));

      expect(mockInitiateOAuth).toHaveBeenCalledWith('facebook');
    });

    it('calls initiateOAuth with "apple" when Apple button is clicked', async () => {
      const user = userEvent.setup();
      renderLoginPage();

      await user.click(screen.getByRole('button', { name: /sign in with apple/i }));

      expect(mockInitiateOAuth).toHaveBeenCalledWith('apple');
    });

    it('calls initiateOAuth with "microsoft" when Microsoft button is clicked', async () => {
      const user = userEvent.setup();
      renderLoginPage();

      await user.click(screen.getByRole('button', { name: /sign in with microsoft/i }));

      expect(mockInitiateOAuth).toHaveBeenCalledWith('microsoft');
    });
  });

  describe('error display', () => {
    it('displays error message for identity_conflict error code', () => {
      renderLoginPage('?error=identity_conflict');

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(
        screen.getByText('This account is already linked to a different user.')
      ).toBeInTheDocument();
    });

    it('displays error message for provider_timeout error code', () => {
      renderLoginPage('?error=provider_timeout');

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(
        screen.getByText(
          'The authentication provider took too long to respond. Please try again.'
        )
      ).toBeInTheDocument();
    });

    it('displays generic error message for unknown error codes', () => {
      renderLoginPage('?error=some_unknown_code');

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(
        screen.getByText('An unknown error occurred. Please try again.')
      ).toBeInTheDocument();
    });

    it('does not display an error when no error param is present', () => {
      renderLoginPage();

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  describe('loading state', () => {
    it('shows loading spinner after a provider button is clicked', async () => {
      const user = userEvent.setup();
      renderLoginPage();

      await user.click(screen.getByRole('button', { name: /sign in with google/i }));

      expect(document.querySelector('.loading-spinner')).toBeInTheDocument();
    });

    it('disables all provider buttons after one is clicked', async () => {
      const user = userEvent.setup();
      renderLoginPage();

      await user.click(screen.getByRole('button', { name: /sign in with google/i }));

      const buttons = screen.getAllByRole('button');
      buttons.forEach((button) => {
        expect(button).toBeDisabled();
      });
    });
  });

  describe('page content', () => {
    it('renders a login heading', () => {
      renderLoginPage();

      expect(screen.getByRole('heading', { name: /login/i })).toBeInTheDocument();
    });

    it('does not render a link to register page', () => {
      renderLoginPage();

      expect(screen.queryByRole('link', { name: /register/i })).not.toBeInTheDocument();
    });
  });
});
