import { calculateHpPercentage } from '../../services/hpService';

export interface HpBarProps {
  currentHp: number;
  maxHp: number;
  tempHp?: number;
  size?: 'sm' | 'md' | 'lg';
}

const trackSizeClasses: Record<string, string> = {
  sm: 'h-2',
  md: 'h-4',
  lg: 'h-6',
};

const textSizeClasses: Record<string, string> = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
};

/**
 * Get the Tailwind background-color class for the HP bar fill based on HP percentage.
 * - Green when > 50%
 * - Yellow when 25-50%
 * - Red when < 25%
 */
function getBarColorClass(percentage: number): string {
  if (percentage > 50) {
    return 'bg-success';
  }
  if (percentage >= 25) {
    return 'bg-warning';
  }
  return 'bg-error';
}

/**
 * HpBar displays a visual progress bar with current/max HP text,
 * color-coded by HP percentage, with optional temp HP overlay.
 */
export function HpBar({ currentHp, maxHp, tempHp = 0, size = 'md' }: HpBarProps) {
  const percentage = calculateHpPercentage(currentHp, maxHp);
  const colorClass = getBarColorClass(percentage);

  // Temp HP is shown as an overlay segment starting where the current HP fill ends
  const tempPercentage = maxHp > 0 ? Math.min(100 - percentage, Math.round((tempHp / maxHp) * 100)) : 0;

  return (
    <div className="flex w-full items-center gap-2" data-testid="hp-bar">
      <div
        className={`relative flex-1 overflow-hidden rounded bg-base-300 ${trackSizeClasses[size]}`}
        data-testid="hp-bar-track"
      >
        <div
          className={`h-full rounded transition-all duration-300 ease-in-out ${colorClass}`}
          style={{ width: `${percentage}%` }}
          data-testid="hp-bar-fill"
        />
        {tempHp > 0 && (
          <div
            className="absolute top-0 h-full rounded bg-info/60 transition-all duration-300 ease-in-out"
            style={{ left: `${percentage}%`, width: `${tempPercentage}%` }}
            data-testid="hp-bar-temp"
          />
        )}
      </div>
      <span
        className={`font-mono whitespace-nowrap text-base-content ${textSizeClasses[size]}`}
        data-testid="hp-bar-text"
      >
        {currentHp}/{maxHp}
      </span>
    </div>
  );
}
