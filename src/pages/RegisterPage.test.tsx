import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { RegisterPage } from './RegisterPage';

const mockRegister = vi.fn();

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    register: mockRegister,
  }),
}));

function renderRegisterPage() {
  return render(
    <MemoryRouter>
      <RegisterPage />
    </MemoryRouter>
  );
}

describe('RegisterPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('form rendering', () => {
    it('renders all input fields', () => {
      renderRegisterPage();

      expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    });

    it('renders a register button', () => {
      renderRegisterPage();

      expect(screen.getByRole('button', { name: /register/i })).toBeInTheDocument();
    });

    it('renders a heading', () => {
      renderRegisterPage();

      expect(screen.getByRole('heading', { name: /register/i })).toBeInTheDocument();
    });
  });

  describe('password match validation', () => {
    it('shows error when passwords do not match', async () => {
      const user = userEvent.setup();
      renderRegisterPage();

      await user.type(screen.getByLabelText(/^password$/i), 'Password1');
      await user.type(screen.getByLabelText(/confirm password/i), 'Different1');

      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
    });

    it('does not show mismatch error when passwords match', async () => {
      const user = userEvent.setup();
      renderRegisterPage();

      await user.type(screen.getByLabelText(/^password$/i), 'Password1');
      await user.type(screen.getByLabelText(/confirm password/i), 'Password1');

      expect(screen.queryByText(/passwords do not match/i)).not.toBeInTheDocument();
    });

    it('blocks submission when passwords do not match', async () => {
      const user = userEvent.setup();
      renderRegisterPage();

      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/^password$/i), 'Password1');
      await user.type(screen.getByLabelText(/confirm password/i), 'Different1');
      await user.click(screen.getByRole('button', { name: /register/i }));

      expect(mockRegister).not.toHaveBeenCalled();
    });

    it('shows error alert when submitting with mismatched passwords', async () => {
      const user = userEvent.setup();
      renderRegisterPage();

      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/^password$/i), 'Password1');
      await user.type(screen.getByLabelText(/confirm password/i), 'Different1');
      await user.click(screen.getByRole('button', { name: /register/i }));

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toHaveTextContent(/passwords do not match/i);
    });
  });

  describe('form submission', () => {
    it('calls register with correct email, password, and name', async () => {
      mockRegister.mockResolvedValue(undefined);
      const user = userEvent.setup();
      renderRegisterPage();

      await user.type(screen.getByLabelText(/name/i), 'Test User');
      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/^password$/i), 'MyPassword1');
      await user.type(screen.getByLabelText(/confirm password/i), 'MyPassword1');
      await user.click(screen.getByRole('button', { name: /register/i }));

      await waitFor(() => {
        expect(mockRegister).toHaveBeenCalledWith('test@example.com', 'MyPassword1', 'Test User');
      });
    });

    it('calls register with undefined name when name is empty', async () => {
      mockRegister.mockResolvedValue(undefined);
      const user = userEvent.setup();
      renderRegisterPage();

      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/^password$/i), 'MyPassword1');
      await user.type(screen.getByLabelText(/confirm password/i), 'MyPassword1');
      await user.click(screen.getByRole('button', { name: /register/i }));

      await waitFor(() => {
        expect(mockRegister).toHaveBeenCalledWith('test@example.com', 'MyPassword1', undefined);
      });
    });

    it('calls register exactly once per submission', async () => {
      mockRegister.mockResolvedValue(undefined);
      const user = userEvent.setup();
      renderRegisterPage();

      await user.type(screen.getByLabelText(/email/i), 'a@b.com');
      await user.type(screen.getByLabelText(/^password$/i), 'Pass1234');
      await user.type(screen.getByLabelText(/confirm password/i), 'Pass1234');
      await user.click(screen.getByRole('button', { name: /register/i }));

      await waitFor(() => {
        expect(mockRegister).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('error display', () => {
    it('shows error message when registration fails', async () => {
      mockRegister.mockRejectedValue(new Error('Email already in use'));
      const user = userEvent.setup();
      renderRegisterPage();

      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/^password$/i), 'Password1');
      await user.type(screen.getByLabelText(/confirm password/i), 'Password1');
      await user.click(screen.getByRole('button', { name: /register/i }));

      await waitFor(() => {
        expect(screen.getByText(/email already in use/i)).toBeInTheDocument();
      });
    });

    it('shows generic message for non-Error throws', async () => {
      mockRegister.mockRejectedValue('unexpected');
      const user = userEvent.setup();
      renderRegisterPage();

      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/^password$/i), 'Password1');
      await user.type(screen.getByLabelText(/confirm password/i), 'Password1');
      await user.click(screen.getByRole('button', { name: /register/i }));

      await waitFor(() => {
        expect(screen.getByText(/registration failed/i)).toBeInTheDocument();
      });
    });

    it('displays error in an alert with role="alert"', async () => {
      mockRegister.mockRejectedValue(new Error('Something went wrong'));
      const user = userEvent.setup();
      renderRegisterPage();

      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/^password$/i), 'Password1');
      await user.type(screen.getByLabelText(/confirm password/i), 'Password1');
      await user.click(screen.getByRole('button', { name: /register/i }));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
    });

    it('clears error on new submission', async () => {
      mockRegister.mockRejectedValueOnce(new Error('First error'));
      mockRegister.mockResolvedValueOnce(undefined);
      const user = userEvent.setup();
      renderRegisterPage();

      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/^password$/i), 'Password1');
      await user.type(screen.getByLabelText(/confirm password/i), 'Password1');
      await user.click(screen.getByRole('button', { name: /register/i }));

      await waitFor(() => {
        expect(screen.getByText(/first error/i)).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /register/i }));

      await waitFor(() => {
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      });
    });
  });

  describe('loading state', () => {
    it('shows loading text during registration', async () => {
      mockRegister.mockImplementation(() => new Promise(() => {}));
      const user = userEvent.setup();
      renderRegisterPage();

      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/^password$/i), 'Password1');
      await user.type(screen.getByLabelText(/confirm password/i), 'Password1');
      await user.click(screen.getByRole('button', { name: /register/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /creating account/i })).toBeInTheDocument();
      });
    });

    it('disables the submit button during registration', async () => {
      mockRegister.mockImplementation(() => new Promise(() => {}));
      const user = userEvent.setup();
      renderRegisterPage();

      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/^password$/i), 'Password1');
      await user.type(screen.getByLabelText(/confirm password/i), 'Password1');
      await user.click(screen.getByRole('button', { name: /register/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /creating account/i })).toBeDisabled();
      });
    });

    it('re-enables button after registration completes', async () => {
      mockRegister.mockResolvedValue(undefined);
      const user = userEvent.setup();
      renderRegisterPage();

      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/^password$/i), 'Password1');
      await user.type(screen.getByLabelText(/confirm password/i), 'Password1');
      await user.click(screen.getByRole('button', { name: /register/i }));

      await waitFor(() => {
        const button = screen.getByRole('button', { name: /register/i });
        expect(button).not.toBeDisabled();
      });
    });
  });

  describe('navigation link', () => {
    it('renders a link to the login page', () => {
      renderRegisterPage();

      const link = screen.getByRole('link', { name: /login/i });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', '/login');
    });
  });

  describe('password strength indicator', () => {
    it('does not show indicator when password is empty', () => {
      renderRegisterPage();

      expect(screen.queryByLabelText(/password strength/i)).not.toBeInTheDocument();
    });

    it('shows weak strength for a short password', async () => {
      const user = userEvent.setup();
      renderRegisterPage();

      await user.type(screen.getByLabelText(/^password$/i), 'ab');

      expect(screen.getByText(/weak/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password strength/i)).toBeInTheDocument();
    });

    it('shows strong strength for a complete password', async () => {
      const user = userEvent.setup();
      renderRegisterPage();

      await user.type(screen.getByLabelText(/^password$/i), 'Password1');

      expect(screen.getByText(/strong/i)).toBeInTheDocument();
    });
  });

  describe('form validation', () => {
    it('email input has required attribute', () => {
      renderRegisterPage();

      expect(screen.getByLabelText(/email/i)).toBeRequired();
    });

    it('password input has required attribute', () => {
      renderRegisterPage();

      expect(screen.getByLabelText(/^password$/i)).toBeRequired();
    });

    it('confirm password input has required attribute', () => {
      renderRegisterPage();

      expect(screen.getByLabelText(/confirm password/i)).toBeRequired();
    });

    it('name input is optional (not required)', () => {
      renderRegisterPage();

      expect(screen.getByLabelText(/name/i)).not.toBeRequired();
    });

    it('email input has type="email"', () => {
      renderRegisterPage();

      expect(screen.getByLabelText(/email/i)).toHaveAttribute('type', 'email');
    });

    it('password input has type="password"', () => {
      renderRegisterPage();

      expect(screen.getByLabelText(/^password$/i)).toHaveAttribute('type', 'password');
    });

    it('confirm password input has type="password"', () => {
      renderRegisterPage();

      expect(screen.getByLabelText(/confirm password/i)).toHaveAttribute('type', 'password');
    });
  });

  describe('accessibility', () => {
    it('name input has proper label association', () => {
      renderRegisterPage();

      const nameInput = screen.getByLabelText(/name/i);
      expect(nameInput).toHaveAttribute('id', 'name');
    });

    it('email input has proper label association', () => {
      renderRegisterPage();

      const emailInput = screen.getByLabelText(/email/i);
      expect(emailInput).toHaveAttribute('id', 'email');
    });

    it('password input has proper label association', () => {
      renderRegisterPage();

      const passwordInput = screen.getByLabelText(/^password$/i);
      expect(passwordInput).toHaveAttribute('id', 'password');
    });

    it('confirm password input has proper label association', () => {
      renderRegisterPage();

      const confirmInput = screen.getByLabelText(/confirm password/i);
      expect(confirmInput).toHaveAttribute('id', 'confirmPassword');
    });

    it('name input has autocomplete="name"', () => {
      renderRegisterPage();

      expect(screen.getByLabelText(/name/i)).toHaveAttribute('autocomplete', 'name');
    });

    it('email input has autocomplete="email"', () => {
      renderRegisterPage();

      expect(screen.getByLabelText(/email/i)).toHaveAttribute('autocomplete', 'email');
    });

    it('password input has autocomplete="new-password"', () => {
      renderRegisterPage();

      expect(screen.getByLabelText(/^password$/i)).toHaveAttribute('autocomplete', 'new-password');
    });

    it('confirm password input has autocomplete="new-password"', () => {
      renderRegisterPage();

      expect(screen.getByLabelText(/confirm password/i)).toHaveAttribute(
        'autocomplete',
        'new-password'
      );
    });

    it('required inputs have aria-required attribute', () => {
      renderRegisterPage();

      expect(screen.getByLabelText(/email/i)).toHaveAttribute('aria-required', 'true');
      expect(screen.getByLabelText(/^password$/i)).toHaveAttribute('aria-required', 'true');
      expect(screen.getByLabelText(/confirm password/i)).toHaveAttribute('aria-required', 'true');
    });

    it('confirm password has aria-invalid when passwords do not match', async () => {
      const user = userEvent.setup();
      renderRegisterPage();

      await user.type(screen.getByLabelText(/^password$/i), 'Password1');
      await user.type(screen.getByLabelText(/confirm password/i), 'Different1');

      expect(screen.getByLabelText(/confirm password/i)).toHaveAttribute('aria-invalid', 'true');
    });

    it('submit button has aria-busy during loading', async () => {
      mockRegister.mockImplementation(() => new Promise(() => {}));
      const user = userEvent.setup();
      renderRegisterPage();

      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/^password$/i), 'Password1');
      await user.type(screen.getByLabelText(/confirm password/i), 'Password1');
      await user.click(screen.getByRole('button', { name: /register/i }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /creating account/i })).toHaveAttribute(
          'aria-busy',
          'true'
        );
      });
    });
  });
});
