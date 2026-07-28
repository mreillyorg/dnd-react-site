import { useState } from 'react';
import { graphqlRequest } from '../../lib/graphqlClient';

export interface HpControlsProps {
  combatantId: string;
  onHpChange?: () => void;
}

const APPLY_DAMAGE_MUTATION = `
  mutation ApplyDamage($combatantId: ID!, $damage: Int!) {
    applyDamage(combatantId: $combatantId, damage: $damage) {
      id
      currentHp
      maxHp
      tempHp
    }
  }
`;

const APPLY_HEALING_MUTATION = `
  mutation ApplyHealing($combatantId: ID!, $healing: Int!) {
    applyHealing(combatantId: $combatantId, healing: $healing) {
      id
      currentHp
      maxHp
      tempHp
    }
  }
`;

const SET_TEMP_HP_MUTATION = `
  mutation SetTempHp($combatantId: ID!, $tempHp: Int!) {
    setTempHp(combatantId: $combatantId, tempHp: $tempHp) {
      id
      currentHp
      maxHp
      tempHp
    }
  }
`;

const QUICK_VALUES = [1, 5, 10];

/**
 * Validates that input is a positive integer string.
 * Returns the parsed number or null if invalid.
 */
function parsePositiveInt(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === '') return null;
  const num = Number(trimmed);
  if (!Number.isInteger(num) || num <= 0) return null;
  return num;
}

/**
 * HpControls provides damage, healing, and temp HP inputs
 * with quick-value buttons. Calls GraphQL mutations on submit.
 */
export function HpControls({ combatantId, onHpChange }: HpControlsProps) {
  const [damageInput, setDamageInput] = useState('');
  const [healInput, setHealInput] = useState('');
  const [tempHpInput, setTempHpInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleApplyDamage(value?: number) {
    const amount = value ?? parsePositiveInt(damageInput);
    if (amount === null) return;

    setLoading(true);
    setError(null);
    try {
      await graphqlRequest(APPLY_DAMAGE_MUTATION, { combatantId, damage: amount });
      setDamageInput('');
      onHpChange?.();
    } catch (err: any) {
      setError(err.message ?? 'Failed to apply damage');
    } finally {
      setLoading(false);
    }
  }

  async function handleApplyHealing(value?: number) {
    const amount = value ?? parsePositiveInt(healInput);
    if (amount === null) return;

    setLoading(true);
    setError(null);
    try {
      await graphqlRequest(APPLY_HEALING_MUTATION, { combatantId, healing: amount });
      setHealInput('');
      onHpChange?.();
    } catch (err: any) {
      setError(err.message ?? 'Failed to apply healing');
    } finally {
      setLoading(false);
    }
  }

  async function handleSetTempHp(value?: number) {
    const amount = value ?? parsePositiveInt(tempHpInput);
    if (amount === null) return;

    setLoading(true);
    setError(null);
    try {
      await graphqlRequest(SET_TEMP_HP_MUTATION, { combatantId, tempHp: amount });
      setTempHpInput('');
      onHpChange?.();
    } catch (err: any) {
      setError(err.message ?? 'Failed to set temp HP');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2" data-testid="hp-controls">
      {/* Damage Section */}
      <div className="flex items-center gap-1" data-testid="hp-controls-damage">
        <input
          type="number"
          min="1"
          className="input input-sm input-bordered w-20"
          placeholder="Dmg"
          value={damageInput}
          onChange={(e) => setDamageInput(e.target.value)}
          disabled={loading}
          data-testid="damage-input"
          aria-label="Damage amount"
        />
        <button
          className="btn btn-sm btn-error"
          onClick={() => handleApplyDamage()}
          disabled={loading || parsePositiveInt(damageInput) === null}
          data-testid="apply-damage-btn"
        >
          Damage
        </button>
        <div className="join">
          {QUICK_VALUES.map((v) => (
            <button
              key={`dmg-${v}`}
              className="btn btn-xs join-item"
              onClick={() => handleApplyDamage(v)}
              disabled={loading}
              data-testid={`quick-damage-${v}`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Heal Section */}
      <div className="flex items-center gap-1" data-testid="hp-controls-heal">
        <input
          type="number"
          min="1"
          className="input input-sm input-bordered w-20"
          placeholder="Heal"
          value={healInput}
          onChange={(e) => setHealInput(e.target.value)}
          disabled={loading}
          data-testid="heal-input"
          aria-label="Healing amount"
        />
        <button
          className="btn btn-sm btn-success"
          onClick={() => handleApplyHealing()}
          disabled={loading || parsePositiveInt(healInput) === null}
          data-testid="apply-heal-btn"
        >
          Heal
        </button>
        <div className="join">
          {QUICK_VALUES.map((v) => (
            <button
              key={`heal-${v}`}
              className="btn btn-xs join-item"
              onClick={() => handleApplyHealing(v)}
              disabled={loading}
              data-testid={`quick-heal-${v}`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Temp HP Section */}
      <div className="flex items-center gap-1" data-testid="hp-controls-temp">
        <input
          type="number"
          min="1"
          className="input input-sm input-bordered w-20"
          placeholder="Temp"
          value={tempHpInput}
          onChange={(e) => setTempHpInput(e.target.value)}
          disabled={loading}
          data-testid="temp-hp-input"
          aria-label="Temporary HP amount"
        />
        <button
          className="btn btn-sm btn-info"
          onClick={() => handleSetTempHp()}
          disabled={loading || parsePositiveInt(tempHpInput) === null}
          data-testid="set-temp-hp-btn"
        >
          Set Temp
        </button>
        <div className="join">
          {QUICK_VALUES.map((v) => (
            <button
              key={`temp-${v}`}
              className="btn btn-xs join-item"
              onClick={() => handleSetTempHp(v)}
              disabled={loading}
              data-testid={`quick-temp-${v}`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Loading indicator */}
      {loading && (
        <span className="loading loading-spinner loading-sm" data-testid="hp-controls-loading" />
      )}

      {/* Error display */}
      {error && (
        <div className="text-error text-sm" data-testid="hp-controls-error">
          {error}
        </div>
      )}
    </div>
  );
}
