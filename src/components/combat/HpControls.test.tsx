import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HpControls } from './HpControls';

vi.mock('../../lib/graphqlClient', () => ({
  graphqlRequest: vi.fn(),
}));

import { graphqlRequest } from '../../lib/graphqlClient';

const mockGraphqlRequest = vi.mocked(graphqlRequest);

describe('HpControls', () => {
  const defaultProps = {
    combatantId: 'combatant-1',
    onHpChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGraphqlRequest.mockResolvedValue({});
  });

  describe('damage input and submit', () => {
    it('calls applyDamage mutation with correct values', async () => {
      const user = userEvent.setup();
      render(<HpControls {...defaultProps} />);

      const input = screen.getByTestId('damage-input');
      await user.type(input, '15');

      const btn = screen.getByTestId('apply-damage-btn');
      await user.click(btn);

      expect(mockGraphqlRequest).toHaveBeenCalledWith(
        expect.stringContaining('ApplyDamage'),
        { combatantId: 'combatant-1', damage: 15 }
      );
    });

    it('clears input after successful submit', async () => {
      const user = userEvent.setup();
      render(<HpControls {...defaultProps} />);

      const input = screen.getByTestId('damage-input');
      await user.type(input, '10');
      await user.click(screen.getByTestId('apply-damage-btn'));

      await waitFor(() => {
        expect(input).toHaveValue(null);
      });
    });

    it('calls onHpChange callback after successful damage', async () => {
      const user = userEvent.setup();
      render(<HpControls {...defaultProps} />);

      await user.type(screen.getByTestId('damage-input'), '5');
      await user.click(screen.getByTestId('apply-damage-btn'));

      await waitFor(() => {
        expect(defaultProps.onHpChange).toHaveBeenCalled();
      });
    });
  });

  describe('heal input and submit', () => {
    it('calls applyHealing mutation with correct values', async () => {
      const user = userEvent.setup();
      render(<HpControls {...defaultProps} />);

      const input = screen.getByTestId('heal-input');
      await user.type(input, '8');

      const btn = screen.getByTestId('apply-heal-btn');
      await user.click(btn);

      expect(mockGraphqlRequest).toHaveBeenCalledWith(
        expect.stringContaining('ApplyHealing'),
        { combatantId: 'combatant-1', healing: 8 }
      );
    });

    it('clears input after successful submit', async () => {
      const user = userEvent.setup();
      render(<HpControls {...defaultProps} />);

      const input = screen.getByTestId('heal-input');
      await user.type(input, '12');
      await user.click(screen.getByTestId('apply-heal-btn'));

      await waitFor(() => {
        expect(input).toHaveValue(null);
      });
    });

    it('calls onHpChange callback after successful healing', async () => {
      const user = userEvent.setup();
      render(<HpControls {...defaultProps} />);

      await user.type(screen.getByTestId('heal-input'), '3');
      await user.click(screen.getByTestId('apply-heal-btn'));

      await waitFor(() => {
        expect(defaultProps.onHpChange).toHaveBeenCalled();
      });
    });
  });

  describe('temp HP input and submit', () => {
    it('calls setTempHp mutation with correct values', async () => {
      const user = userEvent.setup();
      render(<HpControls {...defaultProps} />);

      const input = screen.getByTestId('temp-hp-input');
      await user.type(input, '7');

      const btn = screen.getByTestId('set-temp-hp-btn');
      await user.click(btn);

      expect(mockGraphqlRequest).toHaveBeenCalledWith(
        expect.stringContaining('SetTempHp'),
        { combatantId: 'combatant-1', tempHp: 7 }
      );
    });

    it('clears input after successful submit', async () => {
      const user = userEvent.setup();
      render(<HpControls {...defaultProps} />);

      const input = screen.getByTestId('temp-hp-input');
      await user.type(input, '4');
      await user.click(screen.getByTestId('set-temp-hp-btn'));

      await waitFor(() => {
        expect(input).toHaveValue(null);
      });
    });

    it('calls onHpChange callback after successful set temp HP', async () => {
      const user = userEvent.setup();
      render(<HpControls {...defaultProps} />);

      await user.type(screen.getByTestId('temp-hp-input'), '6');
      await user.click(screen.getByTestId('set-temp-hp-btn'));

      await waitFor(() => {
        expect(defaultProps.onHpChange).toHaveBeenCalled();
      });
    });
  });

  describe('input validation', () => {
    it('disables damage button when input is empty', () => {
      render(<HpControls {...defaultProps} />);

      const btn = screen.getByTestId('apply-damage-btn');
      expect(btn).toBeDisabled();
    });

    it('disables heal button when input is empty', () => {
      render(<HpControls {...defaultProps} />);

      const btn = screen.getByTestId('apply-heal-btn');
      expect(btn).toBeDisabled();
    });

    it('disables temp HP button when input is empty', () => {
      render(<HpControls {...defaultProps} />);

      const btn = screen.getByTestId('set-temp-hp-btn');
      expect(btn).toBeDisabled();
    });

    it('disables damage button for negative value', async () => {
      const user = userEvent.setup();
      render(<HpControls {...defaultProps} />);

      await user.type(screen.getByTestId('damage-input'), '-5');

      expect(screen.getByTestId('apply-damage-btn')).toBeDisabled();
    });

    it('disables damage button for zero', async () => {
      const user = userEvent.setup();
      render(<HpControls {...defaultProps} />);

      await user.type(screen.getByTestId('damage-input'), '0');

      expect(screen.getByTestId('apply-damage-btn')).toBeDisabled();
    });

    it('disables heal button for non-positive value', async () => {
      const user = userEvent.setup();
      render(<HpControls {...defaultProps} />);

      await user.type(screen.getByTestId('heal-input'), '0');

      expect(screen.getByTestId('apply-heal-btn')).toBeDisabled();
    });

    it('does not call mutation when input is invalid', async () => {
      const user = userEvent.setup();
      render(<HpControls {...defaultProps} />);

      // Type invalid value and try to submit
      await user.type(screen.getByTestId('damage-input'), '-1');
      // Button is disabled, so clicking it should not trigger mutation
      await user.click(screen.getByTestId('apply-damage-btn'));

      expect(mockGraphqlRequest).not.toHaveBeenCalled();
    });
  });

  describe('quick buttons', () => {
    it('applies quick damage value of 1', async () => {
      const user = userEvent.setup();
      render(<HpControls {...defaultProps} />);

      await user.click(screen.getByTestId('quick-damage-1'));

      expect(mockGraphqlRequest).toHaveBeenCalledWith(
        expect.stringContaining('ApplyDamage'),
        { combatantId: 'combatant-1', damage: 1 }
      );
    });

    it('applies quick damage value of 5', async () => {
      const user = userEvent.setup();
      render(<HpControls {...defaultProps} />);

      await user.click(screen.getByTestId('quick-damage-5'));

      expect(mockGraphqlRequest).toHaveBeenCalledWith(
        expect.stringContaining('ApplyDamage'),
        { combatantId: 'combatant-1', damage: 5 }
      );
    });

    it('applies quick damage value of 10', async () => {
      const user = userEvent.setup();
      render(<HpControls {...defaultProps} />);

      await user.click(screen.getByTestId('quick-damage-10'));

      expect(mockGraphqlRequest).toHaveBeenCalledWith(
        expect.stringContaining('ApplyDamage'),
        { combatantId: 'combatant-1', damage: 10 }
      );
    });

    it('applies quick heal value of 5', async () => {
      const user = userEvent.setup();
      render(<HpControls {...defaultProps} />);

      await user.click(screen.getByTestId('quick-heal-5'));

      expect(mockGraphqlRequest).toHaveBeenCalledWith(
        expect.stringContaining('ApplyHealing'),
        { combatantId: 'combatant-1', healing: 5 }
      );
    });

    it('applies quick temp HP value of 10', async () => {
      const user = userEvent.setup();
      render(<HpControls {...defaultProps} />);

      await user.click(screen.getByTestId('quick-temp-10'));

      expect(mockGraphqlRequest).toHaveBeenCalledWith(
        expect.stringContaining('SetTempHp'),
        { combatantId: 'combatant-1', tempHp: 10 }
      );
    });
  });

  describe('loading state during mutation', () => {
    it('shows loading spinner during mutation', async () => {
      let resolveRequest: (value: any) => void;
      mockGraphqlRequest.mockImplementation(
        () => new Promise((resolve) => { resolveRequest = resolve; })
      );

      const user = userEvent.setup();
      render(<HpControls {...defaultProps} />);

      await user.type(screen.getByTestId('damage-input'), '5');
      await user.click(screen.getByTestId('apply-damage-btn'));

      expect(screen.getByTestId('hp-controls-loading')).toBeInTheDocument();

      resolveRequest!({});
      await waitFor(() => {
        expect(screen.queryByTestId('hp-controls-loading')).not.toBeInTheDocument();
      });
    });

    it('disables inputs during loading', async () => {
      let resolveRequest: (value: any) => void;
      mockGraphqlRequest.mockImplementation(
        () => new Promise((resolve) => { resolveRequest = resolve; })
      );

      const user = userEvent.setup();
      render(<HpControls {...defaultProps} />);

      await user.type(screen.getByTestId('damage-input'), '5');
      await user.click(screen.getByTestId('apply-damage-btn'));

      expect(screen.getByTestId('damage-input')).toBeDisabled();
      expect(screen.getByTestId('heal-input')).toBeDisabled();
      expect(screen.getByTestId('temp-hp-input')).toBeDisabled();

      resolveRequest!({});
      await waitFor(() => {
        expect(screen.getByTestId('damage-input')).not.toBeDisabled();
      });
    });

    it('disables quick buttons during loading', async () => {
      let resolveRequest: (value: any) => void;
      mockGraphqlRequest.mockImplementation(
        () => new Promise((resolve) => { resolveRequest = resolve; })
      );

      const user = userEvent.setup();
      render(<HpControls {...defaultProps} />);

      await user.type(screen.getByTestId('damage-input'), '5');
      await user.click(screen.getByTestId('apply-damage-btn'));

      expect(screen.getByTestId('quick-damage-1')).toBeDisabled();
      expect(screen.getByTestId('quick-heal-5')).toBeDisabled();
      expect(screen.getByTestId('quick-temp-10')).toBeDisabled();

      resolveRequest!({});
      await waitFor(() => {
        expect(screen.getByTestId('quick-damage-1')).not.toBeDisabled();
      });
    });
  });

  describe('error display on mutation failure', () => {
    it('displays error message when mutation fails', async () => {
      mockGraphqlRequest.mockRejectedValue(new Error('Network error'));

      const user = userEvent.setup();
      render(<HpControls {...defaultProps} />);

      await user.type(screen.getByTestId('damage-input'), '5');
      await user.click(screen.getByTestId('apply-damage-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('hp-controls-error')).toHaveTextContent('Network error');
      });
    });

    it('clears error on next successful mutation', async () => {
      mockGraphqlRequest.mockRejectedValueOnce(new Error('Temporary failure'));
      mockGraphqlRequest.mockResolvedValueOnce({});

      const user = userEvent.setup();
      render(<HpControls {...defaultProps} />);

      // First attempt fails
      await user.type(screen.getByTestId('damage-input'), '5');
      await user.click(screen.getByTestId('apply-damage-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('hp-controls-error')).toBeInTheDocument();
      });

      // Second attempt succeeds (use quick button)
      await user.click(screen.getByTestId('quick-damage-1'));

      await waitFor(() => {
        expect(screen.queryByTestId('hp-controls-error')).not.toBeInTheDocument();
      });
    });

    it('shows fallback error message when error has no message', async () => {
      mockGraphqlRequest.mockRejectedValue({});

      const user = userEvent.setup();
      render(<HpControls {...defaultProps} />);

      await user.type(screen.getByTestId('heal-input'), '3');
      await user.click(screen.getByTestId('apply-heal-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('hp-controls-error')).toHaveTextContent('Failed to apply healing');
      });
    });
  });
});
