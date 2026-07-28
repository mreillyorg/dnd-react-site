import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HpBar } from './HpBar';

describe('HpBar', () => {
  describe('full HP rendering', () => {
    it('renders green bar at 100%', () => {
      render(<HpBar currentHp={50} maxHp={50} />);

      const fill = screen.getByTestId('hp-bar-fill');
      expect(fill).toHaveStyle({ width: '100%' });
      expect(fill).toHaveClass('bg-success');
    });
  });

  describe('half HP rendering', () => {
    it('renders yellow bar at 50%', () => {
      render(<HpBar currentHp={25} maxHp={50} />);

      const fill = screen.getByTestId('hp-bar-fill');
      expect(fill).toHaveStyle({ width: '50%' });
      expect(fill).toHaveClass('bg-warning');
    });
  });

  describe('low HP rendering', () => {
    it('renders red bar at 20%', () => {
      render(<HpBar currentHp={10} maxHp={50} />);

      const fill = screen.getByTestId('hp-bar-fill');
      expect(fill).toHaveStyle({ width: '20%' });
      expect(fill).toHaveClass('bg-error');
    });
  });

  describe('0 HP rendering', () => {
    it('renders empty bar at 0%', () => {
      render(<HpBar currentHp={0} maxHp={50} />);

      const fill = screen.getByTestId('hp-bar-fill');
      expect(fill).toHaveStyle({ width: '0%' });
      expect(fill).toHaveClass('bg-error');
    });
  });

  describe('temp HP overlay', () => {
    it('shows additional segment when tempHp is provided', () => {
      render(<HpBar currentHp={30} maxHp={50} tempHp={10} />);

      const temp = screen.getByTestId('hp-bar-temp');
      expect(temp).toBeInTheDocument();
      expect(temp).toHaveClass('bg-info/60');
      // Temp starts at the fill end (60%) and extends by tempHp/maxHp (20%)
      expect(temp).toHaveStyle({ left: '60%', width: '20%' });
    });

    it('does not show temp segment when tempHp is 0', () => {
      render(<HpBar currentHp={30} maxHp={50} tempHp={0} />);

      expect(screen.queryByTestId('hp-bar-temp')).not.toBeInTheDocument();
    });

    it('does not show temp segment when tempHp is not provided', () => {
      render(<HpBar currentHp={30} maxHp={50} />);

      expect(screen.queryByTestId('hp-bar-temp')).not.toBeInTheDocument();
    });

    it('caps temp overlay so it does not exceed the track', () => {
      // currentHp 40/50 = 80%, tempHp 20/50 = 40%, but only 20% remaining space
      render(<HpBar currentHp={40} maxHp={50} tempHp={20} />);

      const temp = screen.getByTestId('hp-bar-temp');
      expect(temp).toHaveStyle({ left: '80%', width: '20%' });
    });
  });

  describe('HP text display', () => {
    it('shows "30/50" format', () => {
      render(<HpBar currentHp={30} maxHp={50} />);

      const text = screen.getByTestId('hp-bar-text');
      expect(text).toHaveTextContent('30/50');
    });

    it('shows "0/100" when at 0 HP', () => {
      render(<HpBar currentHp={0} maxHp={100} />);

      const text = screen.getByTestId('hp-bar-text');
      expect(text).toHaveTextContent('0/100');
    });

    it('shows "50/50" when at full HP', () => {
      render(<HpBar currentHp={50} maxHp={50} />);

      const text = screen.getByTestId('hp-bar-text');
      expect(text).toHaveTextContent('50/50');
    });
  });

  describe('size variants', () => {
    it('applies sm classes for small size', () => {
      render(<HpBar currentHp={25} maxHp={50} size="sm" />);

      const track = screen.getByTestId('hp-bar-track');
      expect(track).toHaveClass('h-2');

      const text = screen.getByTestId('hp-bar-text');
      expect(text).toHaveClass('text-xs');
    });

    it('applies md classes for medium size (default)', () => {
      render(<HpBar currentHp={25} maxHp={50} />);

      const track = screen.getByTestId('hp-bar-track');
      expect(track).toHaveClass('h-4');

      const text = screen.getByTestId('hp-bar-text');
      expect(text).toHaveClass('text-sm');
    });

    it('applies lg classes for large size', () => {
      render(<HpBar currentHp={25} maxHp={50} size="lg" />);

      const track = screen.getByTestId('hp-bar-track');
      expect(track).toHaveClass('h-6');

      const text = screen.getByTestId('hp-bar-text');
      expect(text).toHaveClass('text-base');
    });
  });

  describe('color thresholds', () => {
    it('renders green at 51%', () => {
      render(<HpBar currentHp={51} maxHp={100} />);

      const fill = screen.getByTestId('hp-bar-fill');
      expect(fill).toHaveClass('bg-success');
    });

    it('renders yellow at exactly 50%', () => {
      render(<HpBar currentHp={50} maxHp={100} />);

      const fill = screen.getByTestId('hp-bar-fill');
      expect(fill).toHaveClass('bg-warning');
    });

    it('renders yellow at exactly 25%', () => {
      render(<HpBar currentHp={25} maxHp={100} />);

      const fill = screen.getByTestId('hp-bar-fill');
      expect(fill).toHaveClass('bg-warning');
    });

    it('renders red at 24%', () => {
      render(<HpBar currentHp={24} maxHp={100} />);

      const fill = screen.getByTestId('hp-bar-fill');
      expect(fill).toHaveClass('bg-error');
    });
  });

  describe('edge cases', () => {
    it('handles maxHp of 0 without error', () => {
      render(<HpBar currentHp={0} maxHp={0} />);

      const fill = screen.getByTestId('hp-bar-fill');
      expect(fill).toHaveStyle({ width: '0%' });

      const text = screen.getByTestId('hp-bar-text');
      expect(text).toHaveTextContent('0/0');
    });
  });
});
