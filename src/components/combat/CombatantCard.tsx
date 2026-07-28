import { HpBar } from './HpBar';
import { HpControls } from './HpControls';

export type CombatantType = 'player' | 'monster' | 'npc';

export interface CombatantCardProps {
  id: string;
  name: string;
  type: CombatantType;
  currentHp: number;
  maxHp: number;
  tempHp?: number;
  ac: number;
  initiative: number;
  isActive?: boolean;
  isUnconscious?: boolean;
  isDead?: boolean;
  onHpChange?: () => void;
}

const typeBadgeClasses: Record<CombatantType, string> = {
  player: 'badge-primary',
  monster: 'badge-error',
  npc: 'badge-info',
};

const typeBadgeLabels: Record<CombatantType, string> = {
  player: 'Player',
  monster: 'Monster',
  npc: 'NPC',
};

/**
 * CombatantCard displays a single combatant's information including
 * name, type badge, HP bar, HP controls, AC, initiative, and status.
 * Highlights when the combatant is the active turn holder.
 * Shows visual state for unconscious and dead combatants.
 */
export function CombatantCard({
  id,
  name,
  type,
  currentHp,
  maxHp,
  tempHp = 0,
  ac,
  initiative,
  isActive = false,
  isUnconscious = false,
  isDead = false,
  onHpChange,
}: CombatantCardProps) {
  const cardClasses = [
    'card',
    'card-compact',
    'bg-base-100',
    'shadow-md',
    'p-4',
    isActive ? 'ring-2 ring-primary' : '',
    isUnconscious && !isDead ? 'opacity-60' : '',
    isDead ? 'opacity-40 grayscale' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <article className={cardClasses} data-testid="combatant-card">
      {/* Header: Name, Type Badge, AC, Initiative */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-bold" data-testid="combatant-name">
            {name}
          </h3>
          <span
            className={`badge badge-sm ${typeBadgeClasses[type]}`}
            data-testid="combatant-type-badge"
          >
            {typeBadgeLabels[type]}
          </span>
        </div>
        <div className="flex items-center gap-3 text-sm text-base-content/70">
          <span data-testid="combatant-ac">AC {ac}</span>
          <span data-testid="combatant-initiative">Init {initiative}</span>
        </div>
      </div>

      {/* Status indicators */}
      {(isUnconscious || isDead) && (
        <div className="mt-1 flex gap-2" data-testid="combatant-status">
          {isDead && (
            <span className="badge badge-sm badge-error" data-testid="combatant-dead-badge">
              Dead
            </span>
          )}
          {isUnconscious && !isDead && (
            <span className="badge badge-sm badge-warning" data-testid="combatant-unconscious-badge">
              Unconscious
            </span>
          )}
        </div>
      )}

      {/* HP Bar */}
      <div className="mt-2" data-testid="combatant-hp-bar-container">
        <HpBar currentHp={currentHp} maxHp={maxHp} tempHp={tempHp} />
      </div>

      {/* HP Controls */}
      {!isDead && (
        <div className="mt-2" data-testid="combatant-hp-controls-container">
          <HpControls combatantId={id} onHpChange={onHpChange} />
        </div>
      )}
    </article>
  );
}
