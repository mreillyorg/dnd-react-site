/**
 * HP Service - Core hit point calculation logic for D&D 5e combat tracking.
 *
 * Implements damage, healing, temporary HP, and visual state calculations
 * following D&D 5e rules:
 * - Temp HP absorbs damage before current HP
 * - Temp HP does not stack (take the higher value)
 * - Healing is capped at max HP
 * - Instant death occurs when overkill damage >= max HP
 */

export interface HpState {
  maxHp: number;
  currentHp: number;
  tempHp: number;
}

export interface DamageResult {
  newCurrentHp: number;
  newTempHp: number;
  overkillDamage: number;
  isUnconscious: boolean;
  isInstantDeath: boolean;
}

/**
 * Apply damage to a combatant following D&D 5e rules.
 * Temp HP absorbs damage first, then remaining damage reduces current HP.
 * Detects unconscious (0 HP) and instant death (overkill >= maxHp).
 */
export function applyDamage(state: HpState, damage: number): DamageResult {
  let remaining = damage;
  let newTempHp = state.tempHp;
  let newCurrentHp = state.currentHp;

  // Temp HP absorbs damage first
  if (newTempHp > 0) {
    if (remaining >= newTempHp) {
      remaining -= newTempHp;
      newTempHp = 0;
    } else {
      newTempHp -= remaining;
      remaining = 0;
    }
  }

  // Remaining damage applies to current HP
  newCurrentHp = Math.max(0, newCurrentHp - remaining);

  // Overkill check (instant death if overkill damage >= maxHp)
  const overkillDamage = Math.max(0, remaining - state.currentHp);
  const isInstantDeath = overkillDamage >= state.maxHp;
  const isUnconscious = newCurrentHp === 0;

  return { newCurrentHp, newTempHp, overkillDamage, isUnconscious, isInstantDeath };
}

/**
 * Apply healing to a combatant. Current HP is increased but capped at max HP.
 * Healing does not affect temp HP.
 */
export function applyHealing(state: HpState, healing: number): HpState {
  const newCurrentHp = Math.min(state.maxHp, state.currentHp + healing);
  return { ...state, currentHp: newCurrentHp };
}

/**
 * Set temporary hit points for a combatant.
 * Temp HP does not stack per D&D 5e rules — takes the higher value.
 */
export function setTempHp(state: HpState, tempHp: number): HpState {
  return { ...state, tempHp: Math.max(state.tempHp, tempHp) };
}

/**
 * Calculate HP as a percentage (0-100).
 * Returns 0 if max HP is 0 to avoid division by zero.
 */
export function calculateHpPercentage(current: number, max: number): number {
  if (max <= 0) {
    return 0;
  }
  return Math.round((current / max) * 100);
}

/**
 * Get the daisyUI color class based on HP percentage.
 * - Green (text-success) when > 50%
 * - Yellow (text-warning) when 25-50%
 * - Red (text-error) when < 25%
 */
export function getHpColorClass(percentage: number): string {
  if (percentage > 50) {
    return 'text-success';
  }
  if (percentage >= 25) {
    return 'text-warning';
  }
  return 'text-error';
}
