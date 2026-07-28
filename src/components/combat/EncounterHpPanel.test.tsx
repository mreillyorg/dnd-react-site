import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EncounterHpPanel } from './EncounterHpPanel';

vi.mock('../../lib/graphqlClient', () => ({
  graphqlRequest: vi.fn(),
}));

vi.mock('./CombatantCard', () => ({
  CombatantCard: (props: {
    id: string;
    name: string;
    type: string;
    currentHp: number;
    maxHp: number;
    tempHp?: number;
    ac: number;
    initiative: number;
  }) => (
    <div
      data-testid={`mock-combatant-card-${props.id}`}
      data-name={props.name}
      data-type={props.type}
      data-current-hp={props.currentHp}
      data-max-hp={props.maxHp}
      data-temp-hp={props.tempHp ?? 0}
      data-ac={props.ac}
      data-initiative={props.initiative}
    />
  ),
}));

import { graphqlRequest } from '../../lib/graphqlClient';

const mockGraphqlRequest = vi.mocked(graphqlRequest);

const mockCombatants = [
  {
    id: 'c1',
    name: 'Goblin',
    initiative: 12,
    maxHp: 20,
    currentHp: 20,
    tempHp: 0,
    armorClass: 13,
    combatantType: 'MONSTER',
    encounterId: 'enc-1',
  },
  {
    id: 'c2',
    name: 'Fighter',
    initiative: 18,
    maxHp: 50,
    currentHp: 45,
    tempHp: 5,
    armorClass: 18,
    combatantType: 'PLAYER',
    encounterId: 'enc-1',
  },
  {
    id: 'c3',
    name: 'Wizard',
    initiative: 15,
    maxHp: 30,
    currentHp: 30,
    tempHp: 0,
    armorClass: 12,
    combatantType: 'PLAYER',
    encounterId: 'enc-1',
  },
];

describe('EncounterHpPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('loading state', () => {
    it('shows loading spinner while fetching combatants', () => {
      mockGraphqlRequest.mockImplementation(
        () => new Promise(() => {})
      );

      render(<EncounterHpPanel encounterId="enc-1" />);

      expect(screen.getByTestId('encounter-hp-panel-loading')).toBeInTheDocument();
    });

    it('hides loading spinner after data loads', async () => {
      mockGraphqlRequest.mockResolvedValue({ combatants: [] });

      render(<EncounterHpPanel encounterId="enc-1" />);

      await waitFor(() => {
        expect(screen.queryByTestId('encounter-hp-panel-loading')).not.toBeInTheDocument();
      });
    });
  });

  describe('empty encounter display', () => {
    it('shows empty state when no combatants exist', async () => {
      mockGraphqlRequest.mockResolvedValue({ combatants: [] });

      render(<EncounterHpPanel encounterId="enc-1" />);

      await waitFor(() => {
        expect(screen.getByTestId('encounter-hp-panel-empty')).toBeInTheDocument();
      });
      expect(screen.getByText('No combatants in this encounter')).toBeInTheDocument();
    });
  });

  describe('combatant list rendering', () => {
    it('renders CombatantCard for each combatant', async () => {
      mockGraphqlRequest.mockResolvedValue({ combatants: mockCombatants });

      render(<EncounterHpPanel encounterId="enc-1" />);

      await waitFor(() => {
        expect(screen.getByTestId('mock-combatant-card-c1')).toBeInTheDocument();
      });
      expect(screen.getByTestId('mock-combatant-card-c2')).toBeInTheDocument();
      expect(screen.getByTestId('mock-combatant-card-c3')).toBeInTheDocument();
    });

    it('passes correct props to CombatantCard', async () => {
      mockGraphqlRequest.mockResolvedValue({ combatants: mockCombatants });

      render(<EncounterHpPanel encounterId="enc-1" />);

      await waitFor(() => {
        expect(screen.getByTestId('mock-combatant-card-c2')).toBeInTheDocument();
      });

      const card = screen.getByTestId('mock-combatant-card-c2');
      expect(card).toHaveAttribute('data-name', 'Fighter');
      expect(card).toHaveAttribute('data-type', 'player');
      expect(card).toHaveAttribute('data-current-hp', '45');
      expect(card).toHaveAttribute('data-max-hp', '50');
      expect(card).toHaveAttribute('data-temp-hp', '5');
      expect(card).toHaveAttribute('data-ac', '18');
      expect(card).toHaveAttribute('data-initiative', '18');
    });

    it('renders combatant rows with correct testids', async () => {
      mockGraphqlRequest.mockResolvedValue({ combatants: mockCombatants });

      render(<EncounterHpPanel encounterId="enc-1" />);

      await waitFor(() => {
        expect(screen.getByTestId('combatant-row-c1')).toBeInTheDocument();
      });
      expect(screen.getByTestId('combatant-row-c2')).toBeInTheDocument();
      expect(screen.getByTestId('combatant-row-c3')).toBeInTheDocument();
    });
  });

  describe('sorted by initiative', () => {
    it('displays combatants in descending initiative order', async () => {
      mockGraphqlRequest.mockResolvedValue({ combatants: mockCombatants });

      render(<EncounterHpPanel encounterId="enc-1" />);

      await waitFor(() => {
        expect(screen.getByTestId('combatant-list')).toBeInTheDocument();
      });

      const list = screen.getByTestId('combatant-list');
      const rows = within(list).getAllByTestId(/^combatant-row-/);

      // Fighter (18) > Wizard (15) > Goblin (12)
      expect(rows[0]).toHaveAttribute('data-testid', 'combatant-row-c2');
      expect(rows[1]).toHaveAttribute('data-testid', 'combatant-row-c3');
      expect(rows[2]).toHaveAttribute('data-testid', 'combatant-row-c1');
    });
  });

  describe('add combatant flow', () => {
    it('shows add form when clicking Add Combatant button', async () => {
      const user = userEvent.setup();
      mockGraphqlRequest.mockResolvedValue({ combatants: [] });

      render(<EncounterHpPanel encounterId="enc-1" />);

      await waitFor(() => {
        expect(screen.getByTestId('add-combatant-btn')).toBeInTheDocument();
      });

      await user.click(screen.getByTestId('add-combatant-btn'));

      expect(screen.getByTestId('add-combatant-form')).toBeInTheDocument();
      expect(screen.getByTestId('add-combatant-name')).toBeInTheDocument();
      expect(screen.getByTestId('add-combatant-initiative')).toBeInTheDocument();
      expect(screen.getByTestId('add-combatant-max-hp')).toBeInTheDocument();
      expect(screen.getByTestId('add-combatant-ac')).toBeInTheDocument();
      expect(screen.getByTestId('add-combatant-type')).toBeInTheDocument();
    });

    it('hides form when clicking Cancel', async () => {
      const user = userEvent.setup();
      mockGraphqlRequest.mockResolvedValue({ combatants: [] });

      render(<EncounterHpPanel encounterId="enc-1" />);

      await waitFor(() => {
        expect(screen.getByTestId('add-combatant-btn')).toBeInTheDocument();
      });

      await user.click(screen.getByTestId('add-combatant-btn'));
      expect(screen.getByTestId('add-combatant-form')).toBeInTheDocument();

      await user.click(screen.getByTestId('add-combatant-btn'));
      expect(screen.queryByTestId('add-combatant-form')).not.toBeInTheDocument();
    });

    it('calls CreateCombatant mutation with correct input on submit', async () => {
      const user = userEvent.setup();
      mockGraphqlRequest
        .mockResolvedValueOnce({ combatants: [] }) // initial fetch
        .mockResolvedValueOnce({ createCombatant: { id: 'new-1' } }) // create mutation
        .mockResolvedValueOnce({ combatants: [mockCombatants[0]] }); // refetch

      render(<EncounterHpPanel encounterId="enc-1" />);

      await waitFor(() => {
        expect(screen.getByTestId('add-combatant-btn')).toBeInTheDocument();
      });

      await user.click(screen.getByTestId('add-combatant-btn'));

      await user.type(screen.getByTestId('add-combatant-name'), 'Orc');
      await user.type(screen.getByTestId('add-combatant-initiative'), '14');
      await user.type(screen.getByTestId('add-combatant-max-hp'), '30');
      await user.type(screen.getByTestId('add-combatant-ac'), '13');

      await user.click(screen.getByTestId('add-combatant-submit'));

      await waitFor(() => {
        expect(mockGraphqlRequest).toHaveBeenCalledWith(
          expect.stringContaining('CreateCombatant'),
          {
            input: {
              name: 'Orc',
              initiative: 14,
              maxHp: 30,
              currentHp: 30,
              tempHp: 0,
              armorClass: 13,
              combatantType: 'MONSTER',
              encounterId: 'enc-1',
            },
          }
        );
      });
    });

    it('refetches combatants after successful add', async () => {
      const user = userEvent.setup();
      mockGraphqlRequest
        .mockResolvedValueOnce({ combatants: [] }) // initial fetch
        .mockResolvedValueOnce({ createCombatant: { id: 'new-1' } }) // create mutation
        .mockResolvedValueOnce({ combatants: [mockCombatants[0]] }); // refetch

      render(<EncounterHpPanel encounterId="enc-1" />);

      await waitFor(() => {
        expect(screen.getByTestId('add-combatant-btn')).toBeInTheDocument();
      });

      await user.click(screen.getByTestId('add-combatant-btn'));
      await user.type(screen.getByTestId('add-combatant-name'), 'Orc');
      await user.type(screen.getByTestId('add-combatant-initiative'), '14');
      await user.type(screen.getByTestId('add-combatant-max-hp'), '30');
      await user.type(screen.getByTestId('add-combatant-ac'), '13');
      await user.click(screen.getByTestId('add-combatant-submit'));

      // After add, the refetch should show the combatant
      await waitFor(() => {
        expect(screen.getByTestId('mock-combatant-card-c1')).toBeInTheDocument();
      });
    });
  });

  describe('add combatant validation', () => {
    it('shows error when fields are empty on submit', async () => {
      const user = userEvent.setup();
      mockGraphqlRequest.mockResolvedValue({ combatants: [] });

      render(<EncounterHpPanel encounterId="enc-1" />);

      await waitFor(() => {
        expect(screen.getByTestId('add-combatant-btn')).toBeInTheDocument();
      });

      await user.click(screen.getByTestId('add-combatant-btn'));
      await user.click(screen.getByTestId('add-combatant-submit'));

      expect(screen.getByTestId('add-combatant-error')).toHaveTextContent(
        'All fields are required and must be valid'
      );
    });

    it('allows selecting different combatant type', async () => {
      const user = userEvent.setup();
      mockGraphqlRequest
        .mockResolvedValueOnce({ combatants: [] }) // initial fetch
        .mockResolvedValueOnce({ createCombatant: { id: 'new-1' } }) // create mutation
        .mockResolvedValueOnce({ combatants: [] }); // refetch

      render(<EncounterHpPanel encounterId="enc-1" />);

      await waitFor(() => {
        expect(screen.getByTestId('add-combatant-btn')).toBeInTheDocument();
      });

      await user.click(screen.getByTestId('add-combatant-btn'));
      await user.type(screen.getByTestId('add-combatant-name'), 'Ally');
      await user.type(screen.getByTestId('add-combatant-initiative'), '10');
      await user.type(screen.getByTestId('add-combatant-max-hp'), '30');
      await user.type(screen.getByTestId('add-combatant-ac'), '12');
      await user.selectOptions(screen.getByTestId('add-combatant-type'), 'NPC');
      await user.click(screen.getByTestId('add-combatant-submit'));

      await waitFor(() => {
        expect(mockGraphqlRequest).toHaveBeenCalledWith(
          expect.stringContaining('CreateCombatant'),
          expect.objectContaining({
            input: expect.objectContaining({
              combatantType: 'NPC',
            }),
          })
        );
      });
    });

    it('shows error when add mutation fails', async () => {
      const user = userEvent.setup();
      mockGraphqlRequest
        .mockResolvedValueOnce({ combatants: [] }) // initial fetch
        .mockRejectedValueOnce(new Error('Server error')); // create mutation fails

      render(<EncounterHpPanel encounterId="enc-1" />);

      await waitFor(() => {
        expect(screen.getByTestId('add-combatant-btn')).toBeInTheDocument();
      });

      await user.click(screen.getByTestId('add-combatant-btn'));
      await user.type(screen.getByTestId('add-combatant-name'), 'Orc');
      await user.type(screen.getByTestId('add-combatant-initiative'), '10');
      await user.type(screen.getByTestId('add-combatant-max-hp'), '30');
      await user.type(screen.getByTestId('add-combatant-ac'), '12');
      await user.click(screen.getByTestId('add-combatant-submit'));

      await waitFor(() => {
        expect(screen.getByTestId('add-combatant-error')).toHaveTextContent('Server error');
      });
    });

    it('shows fallback error when add mutation fails with no message', async () => {
      const user = userEvent.setup();
      mockGraphqlRequest
        .mockResolvedValueOnce({ combatants: [] }) // initial fetch
        .mockRejectedValueOnce({}); // create mutation fails without message

      render(<EncounterHpPanel encounterId="enc-1" />);

      await waitFor(() => {
        expect(screen.getByTestId('add-combatant-btn')).toBeInTheDocument();
      });

      await user.click(screen.getByTestId('add-combatant-btn'));
      await user.type(screen.getByTestId('add-combatant-name'), 'Orc');
      await user.type(screen.getByTestId('add-combatant-initiative'), '10');
      await user.type(screen.getByTestId('add-combatant-max-hp'), '30');
      await user.type(screen.getByTestId('add-combatant-ac'), '12');
      await user.click(screen.getByTestId('add-combatant-submit'));

      await waitFor(() => {
        expect(screen.getByTestId('add-combatant-error')).toHaveTextContent(
          'Failed to add combatant'
        );
      });
    });
  });

  describe('error handling', () => {
    it('shows error when fetch combatants fails', async () => {
      mockGraphqlRequest.mockRejectedValue(new Error('Network error'));

      render(<EncounterHpPanel encounterId="enc-1" />);

      await waitFor(() => {
        expect(screen.getByTestId('encounter-hp-panel-error')).toHaveTextContent('Network error');
      });
    });

    it('shows fallback error when fetch fails with no message', async () => {
      mockGraphqlRequest.mockRejectedValue({});

      render(<EncounterHpPanel encounterId="enc-1" />);

      await waitFor(() => {
        expect(screen.getByTestId('encounter-hp-panel-error')).toHaveTextContent(
          'Failed to load combatants'
        );
      });
    });

    it('shows error when remove combatant fails', async () => {
      const user = userEvent.setup();
      mockGraphqlRequest
        .mockResolvedValueOnce({ combatants: mockCombatants }) // initial fetch
        .mockRejectedValueOnce(new Error('Delete failed')); // delete fails

      render(<EncounterHpPanel encounterId="enc-1" />);

      await waitFor(() => {
        expect(screen.getByTestId('remove-combatant-c1')).toBeInTheDocument();
      });

      await user.click(screen.getByTestId('remove-combatant-c1'));

      await waitFor(() => {
        expect(screen.getByTestId('encounter-hp-panel-error')).toHaveTextContent('Delete failed');
      });
    });

    it('shows fallback error when remove fails with no message', async () => {
      const user = userEvent.setup();
      mockGraphqlRequest
        .mockResolvedValueOnce({ combatants: mockCombatants }) // initial fetch
        .mockRejectedValueOnce({}); // delete fails without message

      render(<EncounterHpPanel encounterId="enc-1" />);

      await waitFor(() => {
        expect(screen.getByTestId('remove-combatant-c1')).toBeInTheDocument();
      });

      await user.click(screen.getByTestId('remove-combatant-c1'));

      await waitFor(() => {
        expect(screen.getByTestId('encounter-hp-panel-error')).toHaveTextContent(
          'Failed to remove combatant'
        );
      });
    });
  });

  describe('remove combatant flow', () => {
    it('calls DeleteCombatant mutation when remove button clicked', async () => {
      const user = userEvent.setup();
      mockGraphqlRequest
        .mockResolvedValueOnce({ combatants: mockCombatants }) // initial fetch
        .mockResolvedValueOnce({ deleteCombatant: true }) // delete mutation
        .mockResolvedValueOnce({ combatants: mockCombatants.slice(1) }); // refetch

      render(<EncounterHpPanel encounterId="enc-1" />);

      await waitFor(() => {
        expect(screen.getByTestId('remove-combatant-c1')).toBeInTheDocument();
      });

      await user.click(screen.getByTestId('remove-combatant-c1'));

      await waitFor(() => {
        expect(mockGraphqlRequest).toHaveBeenCalledWith(
          expect.stringContaining('DeleteCombatant'),
          { id: 'c1' }
        );
      });
    });

    it('refetches combatants after successful remove', async () => {
      const user = userEvent.setup();
      mockGraphqlRequest
        .mockResolvedValueOnce({ combatants: mockCombatants }) // initial fetch
        .mockResolvedValueOnce({ deleteCombatant: true }) // delete mutation
        .mockResolvedValueOnce({ combatants: mockCombatants.filter((c) => c.id !== 'c1') }); // refetch

      render(<EncounterHpPanel encounterId="enc-1" />);

      await waitFor(() => {
        expect(screen.getByTestId('remove-combatant-c1')).toBeInTheDocument();
      });

      await user.click(screen.getByTestId('remove-combatant-c1'));

      await waitFor(() => {
        expect(screen.queryByTestId('combatant-row-c1')).not.toBeInTheDocument();
      });
      expect(screen.getByTestId('combatant-row-c2')).toBeInTheDocument();
      expect(screen.getByTestId('combatant-row-c3')).toBeInTheDocument();
    });
  });
});
