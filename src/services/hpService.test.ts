import { describe, it, expect } from 'vitest';
import {
  applyDamage,
  applyHealing,
  setTempHp,
  calculateHpPercentage,
  getHpColorClass,
  type HpState,
} from './hpService';

describe('applyDamage', () => {
  it('applies basic damage reducing current HP', () => {
    const state: HpState = { maxHp: 50, currentHp: 50, tempHp: 0 };
    const result = applyDamage(state, 20);
    expect(result.newCurrentHp).toBe(30);
    expect(result.newTempHp).toBe(0);
    expect(result.isUnconscious).toBe(false);
    expect(result.isInstantDeath).toBe(false);
  });

  it('absorbs damage with temp HP first, remaining hits current HP', () => {
    const state: HpState = { maxHp: 50, currentHp: 50, tempHp: 10 };
    const result = applyDamage(state, 15);
    expect(result.newCurrentHp).toBe(45);
    expect(result.newTempHp).toBe(0);
  });

  it('temp HP absorbs partial damage leaving HP unchanged', () => {
    const state: HpState = { maxHp: 50, currentHp: 50, tempHp: 10 };
    const result = applyDamage(state, 5);
    expect(result.newCurrentHp).toBe(50);
    expect(result.newTempHp).toBe(5);
  });

  it('sets isUnconscious when HP reaches 0', () => {
    const state: HpState = { maxHp: 50, currentHp: 20, tempHp: 0 };
    const result = applyDamage(state, 20);
    expect(result.newCurrentHp).toBe(0);
    expect(result.isUnconscious).toBe(true);
  });

  it('sets isInstantDeath when overkill damage >= maxHp', () => {
    const state: HpState = { maxHp: 50, currentHp: 10, tempHp: 0 };
    // 10 current HP, 60 damage → overkill = 60 - 10 = 50 >= maxHp (50)
    const result = applyDamage(state, 60);
    expect(result.newCurrentHp).toBe(0);
    expect(result.isUnconscious).toBe(true);
    expect(result.isInstantDeath).toBe(true);
    expect(result.overkillDamage).toBe(50);
  });

  it('does nothing when zero damage is applied', () => {
    const state: HpState = { maxHp: 50, currentHp: 50, tempHp: 5 };
    const result = applyDamage(state, 0);
    expect(result.newCurrentHp).toBe(50);
    expect(result.newTempHp).toBe(5);
    expect(result.overkillDamage).toBe(0);
    expect(result.isUnconscious).toBe(false);
    expect(result.isInstantDeath).toBe(false);
  });
});

describe('applyHealing', () => {
  it('applies basic healing increasing current HP', () => {
    const state: HpState = { maxHp: 50, currentHp: 30, tempHp: 0 };
    const result = applyHealing(state, 10);
    expect(result.currentHp).toBe(40);
  });

  it('caps healing at max HP', () => {
    const state: HpState = { maxHp: 50, currentHp: 40, tempHp: 0 };
    const result = applyHealing(state, 30);
    expect(result.currentHp).toBe(50);
  });

  it('does not change HP when already at full', () => {
    const state: HpState = { maxHp: 50, currentHp: 50, tempHp: 0 };
    const result = applyHealing(state, 10);
    expect(result.currentHp).toBe(50);
  });

  it('increases HP from 0 (stabilizes unconscious combatant)', () => {
    const state: HpState = { maxHp: 50, currentHp: 0, tempHp: 0 };
    const result = applyHealing(state, 5);
    expect(result.currentHp).toBe(5);
  });
});

describe('setTempHp', () => {
  it('sets temp HP on a combatant with no existing temp HP', () => {
    const state: HpState = { maxHp: 50, currentHp: 50, tempHp: 0 };
    const result = setTempHp(state, 10);
    expect(result.tempHp).toBe(10);
  });

  it('does not stack — keeps existing higher temp HP', () => {
    const state: HpState = { maxHp: 50, currentHp: 50, tempHp: 8 };
    const result = setTempHp(state, 5);
    expect(result.tempHp).toBe(8);
  });

  it('replaces existing temp HP when new value is higher', () => {
    const state: HpState = { maxHp: 50, currentHp: 50, tempHp: 5 };
    const result = setTempHp(state, 10);
    expect(result.tempHp).toBe(10);
  });
});

describe('calculateHpPercentage', () => {
  it('returns 100 at full HP', () => {
    expect(calculateHpPercentage(50, 50)).toBe(100);
  });

  it('returns 50 at half HP', () => {
    expect(calculateHpPercentage(25, 50)).toBe(50);
  });

  it('returns 0 at zero HP', () => {
    expect(calculateHpPercentage(0, 50)).toBe(0);
  });

  it('returns 0 when max HP is 0 (avoids division by zero)', () => {
    expect(calculateHpPercentage(0, 0)).toBe(0);
  });

  it('rounds to nearest integer', () => {
    expect(calculateHpPercentage(1, 3)).toBe(33);
  });
});

describe('getHpColorClass', () => {
  it('returns text-success when percentage > 50', () => {
    expect(getHpColorClass(51)).toBe('text-success');
    expect(getHpColorClass(100)).toBe('text-success');
  });

  it('returns text-warning when percentage is 25-50', () => {
    expect(getHpColorClass(50)).toBe('text-warning');
    expect(getHpColorClass(25)).toBe('text-warning');
  });

  it('returns text-error when percentage < 25', () => {
    expect(getHpColorClass(24)).toBe('text-error');
    expect(getHpColorClass(0)).toBe('text-error');
  });
});
