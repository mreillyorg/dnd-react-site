import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CombatantCard } from './CombatantCard';

vi.mock('./HpBar', () => ({
  HpBar: (props: { currentHp: number; maxHp: number; tempHp?: number }) => (
    <div
      data-testid="mock-hp-bar"
      data-current-hp={props.currentHp}
      data-max-hp={props.maxHp}
      data-temp-hp={props.tempHp ?? 0}
    />
  ),
}));

vi.mock('./HpControls', () => ({
  HpControls: (props: { combatantId: string; onHpChange?: () => void }) => (
    <div
      data-testid="mock-hp-controls"
      data-combatant-id={props.combatantId}
      onClick={props.onHpChange}
    />
  ),
}));

const defaultProps = {
  id: 'combatant-1',
  name: 'Gandalf',
  type: 'player' as const,
  currentHp: 40,
  maxHp: 50,
  ac: 15,
  initiative: 18,
};

describe('CombatantCard', () => {
  describe('name and type display', () => {
    it('displays combatant name', () => {
      render(<CombatantCard {...defaultProps} />);

      expect(screen.getByTestId('combatant-name')).toHaveTextContent('Gandalf');
    });

    it('displays Player badge for player type', () => {
      render(<CombatantCard {...defaultProps} type="player" />);

      const badge = screen.getByTestId('combatant-type-badge');
      expect(badge).toHaveTextContent('Player');
      expect(badge).toHaveClass('badge-primary');
    });

    it('displays Monster badge for monster type', () => {
      render(<CombatantCard {...defaultProps} type="monster" />);

      const badge = screen.getByTestId('combatant-type-badge');
      expect(badge).toHaveTextContent('Monster');
      expect(badge).toHaveClass('badge-error');
    });

    it('displays NPC badge for npc type', () => {
      render(<CombatantCard {...defaultProps} type="npc" />);

      const badge = screen.getByTestId('combatant-type-badge');
      expect(badge).toHaveTextContent('NPC');
      expect(badge).toHaveClass('badge-info');
    });
  });

  describe('HP bar included with correct values', () => {
    it('renders HpBar with currentHp and maxHp', () => {
      render(<CombatantCard {...defaultProps} currentHp={30} maxHp={50} />);

      const hpBar = screen.getByTestId('mock-hp-bar');
      expect(hpBar).toBeInTheDocument();
      expect(hpBar).toHaveAttribute('data-current-hp', '30');
      expect(hpBar).toHaveAttribute('data-max-hp', '50');
    });

    it('passes tempHp to HpBar', () => {
      render(<CombatantCard {...defaultProps} tempHp={10} />);

      const hpBar = screen.getByTestId('mock-hp-bar');
      expect(hpBar).toHaveAttribute('data-temp-hp', '10');
    });

    it('passes tempHp default of 0 to HpBar when not provided', () => {
      render(<CombatantCard {...defaultProps} />);

      const hpBar = screen.getByTestId('mock-hp-bar');
      expect(hpBar).toHaveAttribute('data-temp-hp', '0');
    });
  });

  describe('HP controls included', () => {
    it('renders HpControls with correct combatantId', () => {
      render(<CombatantCard {...defaultProps} id="combatant-42" />);

      const controls = screen.getByTestId('mock-hp-controls');
      expect(controls).toBeInTheDocument();
      expect(controls).toHaveAttribute('data-combatant-id', 'combatant-42');
    });

    it('passes onHpChange callback to HpControls', () => {
      const onHpChange = vi.fn();
      render(<CombatantCard {...defaultProps} onHpChange={onHpChange} />);

      const controls = screen.getByTestId('mock-hp-controls');
      controls.click();
      expect(onHpChange).toHaveBeenCalled();
    });
  });

  describe('AC and initiative display', () => {
    it('displays AC value', () => {
      render(<CombatantCard {...defaultProps} ac={18} />);

      expect(screen.getByTestId('combatant-ac')).toHaveTextContent('AC 18');
    });

    it('displays initiative value', () => {
      render(<CombatantCard {...defaultProps} initiative={22} />);

      expect(screen.getByTestId('combatant-initiative')).toHaveTextContent('Init 22');
    });
  });

  describe('active combatant highlight', () => {
    it('applies ring-2 ring-primary classes when active', () => {
      render(<CombatantCard {...defaultProps} isActive={true} />);

      const card = screen.getByTestId('combatant-card');
      expect(card).toHaveClass('ring-2');
      expect(card).toHaveClass('ring-primary');
    });

    it('does not apply ring classes when not active', () => {
      render(<CombatantCard {...defaultProps} isActive={false} />);

      const card = screen.getByTestId('combatant-card');
      expect(card).not.toHaveClass('ring-2');
      expect(card).not.toHaveClass('ring-primary');
    });
  });

  describe('unconscious state styling', () => {
    it('applies opacity-60 class when unconscious', () => {
      render(<CombatantCard {...defaultProps} isUnconscious={true} />);

      const card = screen.getByTestId('combatant-card');
      expect(card).toHaveClass('opacity-60');
    });

    it('shows Unconscious badge when unconscious', () => {
      render(<CombatantCard {...defaultProps} isUnconscious={true} />);

      expect(screen.getByTestId('combatant-unconscious-badge')).toHaveTextContent('Unconscious');
    });

    it('does not show Unconscious badge when not unconscious', () => {
      render(<CombatantCard {...defaultProps} isUnconscious={false} />);

      expect(screen.queryByTestId('combatant-unconscious-badge')).not.toBeInTheDocument();
    });

    it('does not apply opacity-60 when unconscious AND dead (dead takes precedence)', () => {
      render(<CombatantCard {...defaultProps} isUnconscious={true} isDead={true} />);

      const card = screen.getByTestId('combatant-card');
      expect(card).not.toHaveClass('opacity-60');
    });
  });

  describe('dead/instant death styling', () => {
    it('applies opacity-40 and grayscale classes when dead', () => {
      render(<CombatantCard {...defaultProps} isDead={true} />);

      const card = screen.getByTestId('combatant-card');
      expect(card).toHaveClass('opacity-40');
      expect(card).toHaveClass('grayscale');
    });

    it('shows Dead badge when dead', () => {
      render(<CombatantCard {...defaultProps} isDead={true} />);

      expect(screen.getByTestId('combatant-dead-badge')).toHaveTextContent('Dead');
    });

    it('hides HpControls when dead', () => {
      render(<CombatantCard {...defaultProps} isDead={true} />);

      expect(screen.queryByTestId('mock-hp-controls')).not.toBeInTheDocument();
    });

    it('still shows HpBar when dead', () => {
      render(<CombatantCard {...defaultProps} isDead={true} />);

      expect(screen.getByTestId('mock-hp-bar')).toBeInTheDocument();
    });

    it('does not show Unconscious badge when dead (even if isUnconscious is true)', () => {
      render(<CombatantCard {...defaultProps} isDead={true} isUnconscious={true} />);

      expect(screen.queryByTestId('combatant-unconscious-badge')).not.toBeInTheDocument();
      expect(screen.getByTestId('combatant-dead-badge')).toBeInTheDocument();
    });

    it('does not apply dead styling when not dead', () => {
      render(<CombatantCard {...defaultProps} isDead={false} />);

      const card = screen.getByTestId('combatant-card');
      expect(card).not.toHaveClass('opacity-40');
      expect(card).not.toHaveClass('grayscale');
    });
  });
});
