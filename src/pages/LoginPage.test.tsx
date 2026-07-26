import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { LoginPage } from './LoginPage';

const mockLogin = vi.fn();

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    login: mockLogin,
  }),
}));

function renderLoginPage() {
  return render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>
  );
}

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('form rendering', () => {
    it('renders email and password inputs', () => {
      renderLoginPage();

      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    });

    it('renders a login button', () => {
      renderLoginPage();

      expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
    });

    it('renders a heading', () => {
      renderLoginPage();

      expect(screen.getByRole('heading', { name: /login/i })).toBeInTheDocument();
    });
  });

  describe('form submission', () => {
    it('calls login with correct email and password', async () => {
      mockLogin.mockResolvedValue(undefined);
      const user = userEvent.setup();
      renderLoginPage();

      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/password/i), 'MyPassword123');
      await user.click(screen.getByRole('button', { name: /login/i }));

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'MyPassword123');
      });
    });

    it('calls login exactly once per submission', async () => {
      mockLogin.mockResolvedValue(undefined);
      const user = userEvent.setup();
      renderLoginPage();

      await user.type(screen.getByLabelText(/email/i), 'a@b.com');
      await user.type(screen.getByLabelText(/password/i), 'pass1234');
      await user.click(screen.getByRole('button', { name: /login/i }));

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('error display', () => {
    it('shows error message when login fails', async () => {
      mockLogin.mockRejectedValue(new Error('Invalid credentials'));
      const user = userEvent.setup();
      renderLoginPage();

      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/password/i), 'wrongpass');
      await user.click(screen.getByRole('button', { name: /login/i }));

      await waitFor(() => {
        expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
      });
    });

    it('shows generic message for non-Error throws', async () => {
      mockLogin.mockRejectedValue('unexpected');
      const user = userEvent.setup();
      renderLoginPage();

      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/password/i), 'somepass');
      await user.click(screen.getByRole('button', { name: /login/i }));

      await waitFor(() => {
        expect(screen.getByText(/login failed/i)).toBeInTheDocument();
      });
    });

    it('displays error in an alert with role="alert"', async () => {
      mockLogin.mockRejectedValue(new Error('Something went wrong'));
      const user = userEvent.setup();
      renderLoginPage();

      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/password/i), 'pass');
      await user.click(screen.getByRole('button', { name: /login/i }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
    });

    it('clears error on new submission', async () => {
      mockLogin.mockRejectedValueOnce(new Error('First error'));
      mockLogin.mockResolvedValueOnce(undefined);
      const user = userEvent.setup();
      renderLoginPage();

      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/password/i), 'wrong');
      await user.click(screen.getByRole('button', { name: /login/i }));

      await waitFor(() => {
        expect(screen.getByText(/first error/i)).toBeInTheDocument();
      });

      // Submit again successfully
      await user.click(screen.getByRole('button', { name: /login/i }));

      await waitFor(() => {
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      });
    });
  });

  describe('loading state', () => {
    it('shows loading text during login', async () => {
      // Make login hang by returning a never-resolving promise
      mockLogin.mockImplementation(() => new Promise(() => {}));
      const user = userEvent.setup();
      renderLoginPage();

      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/password/i), 'pass123');
      await user.click(screen.getByRole('button', { name: /login/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /logging in/i })).toBeInTheDocument();
      });
    });

    it('disables the submit button during login', async () => {
      mockLogin.mockImplementation(() => new Promise(() => {}));
      const user = userEvent.setup();
      renderLoginPage();

      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/password/i), 'pass123');
      await user.click(screen.getByRole('button', { name: /login/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /logging in/i })).toBeDisabled();
      });
    });

    it('re-enables button after login completes', async () => {
      mockLogin.mockResolvedValue(undefined);
      const user = userEvent.setup();
      renderLoginPage();

      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/password/i), 'pass123');
      await user.click(screen.getByRole('button', { name: /login/i }));

      await waitFor(() => {
        const button = screen.getByRole('button', { name: /login/i });
        expect(button).not.toBeDisabled();
      });
    });
  });

  describe('navigation link', () => {
    it('renders a link to the register page', () => {
      renderLoginPage();

      const link = screen.getByRole('link', { name: /register/i });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', '/register');
    });
  });

  describe('form validation', () => {
    it('email input has required attribute', () => {
      renderLoginPage();

      expect(screen.getByLabelText(/email/i)).toBeRequired();
    });

    it('password input has required attribute', () => {
      renderLoginPage();

      expect(screen.getByLabelText(/password/i)).toBeRequired();
    });

    it('email input has type="email"', () => {
      renderLoginPage();

      expect(screen.getByLabelText(/email/i)).toHaveAttribute('type', 'email');
    });

    it('password input has type="password"', () => {
      renderLoginPage();

      expect(screen.getByLabelText(/password/i)).toHaveAttribute('type', 'password');
    });
  });

  describe('accessibility', () => {
    it('email input has proper label association', () => {
      renderLoginPage();

      const emailInput = screen.getByLabelText(/email/i);
      expect(emailInput).toHaveAttribute('id', 'email');
    });

    it('password input has proper label association', () => {
      renderLoginPage();

      const passwordInput = screen.getByLabelText(/password/i);
      expect(passwordInput).toHaveAttribute('id', 'password');
    });

    it('email input has autocomplete="email"', () => {
      renderLoginPage();

      expect(screen.getByLabelText(/email/i)).toHaveAttribute('autocomplete', 'email');
    });

    it('password input has autocomplete="current-password"', () => {
      renderLoginPage();

      expect(screen.getByLabelText(/password/i)).toHaveAttribute(
        'autocomplete',
        'current-password'
      );
    });

    it('inputs have aria-required attribute', () => {
      renderLoginPage();

      expect(screen.getByLabelText(/email/i)).toHaveAttribute('aria-required', 'true');
      expect(screen.getByLabelText(/password/i)).toHaveAttribute('aria-required', 'true');
    });

    it('submit button has aria-busy during loading', async () => {
      mockLogin.mockImplementation(() => new Promise(() => {}));
      const user = userEvent.setup();
      renderLoginPage();

      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/password/i), 'pass123');
      await user.click(screen.getByRole('button', { name: /login/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /logging in/i })).toHaveAttribute(
          'aria-busy',
          'true'
        );
      });
    });
  });
});
