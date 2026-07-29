import { useEffect, useState, useCallback } from 'react';
import { graphqlRequest } from '../../lib/graphqlClient';
import { CombatantCard, type CombatantType } from './CombatantCard';

export interface EncounterHpPanelProps {
  encounterId: string;
}

interface Combatant {
  id: string;
  name: string;
  initiative: number;
  maxHp: number;
  currentHp: number;
  tempHp: number;
  armorClass: number;
  combatantType: 'PLAYER' | 'MONSTER' | 'NPC';
  encounterId: string;
}

const COMBATANTS_QUERY = `
  query GetCombatants($encounterId: ID!) {
    combatants(encounterId: $encounterId) {
      id
      name
      initiative
      maxHp
      currentHp
      tempHp
      armorClass
      combatantType
      encounterId
    }
  }
`;

const CREATE_COMBATANT_MUTATION = `
  mutation CreateCombatant($input: CreateCombatantInput!) {
    createCombatant(input: $input) {
      id
      name
      initiative
      maxHp
      currentHp
      tempHp
      armorClass
      combatantType
      encounterId
    }
  }
`;

const DELETE_COMBATANT_MUTATION = `
  mutation DeleteCombatant($id: ID!) {
    deleteCombatant(id: $id)
  }
`;

type CombatantTypeInput = 'PLAYER' | 'MONSTER' | 'NPC';

function mapCombatantType(serverType: CombatantTypeInput): CombatantType {
  const map: Record<CombatantTypeInput, CombatantType> = {
    PLAYER: 'player',
    MONSTER: 'monster',
    NPC: 'npc',
  };
  return map[serverType];
}

/**
 * EncounterHpPanel displays all combatants for a given encounter,
 * sorted by initiative (descending). Supports adding and removing combatants.
 */
export function EncounterHpPanel({ encounterId }: EncounterHpPanelProps) {
  const [combatants, setCombatants] = useState<Combatant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // Add combatant form state
  const [newName, setNewName] = useState('');
  const [newInitiative, setNewInitiative] = useState('');
  const [newMaxHp, setNewMaxHp] = useState('');
  const [newArmorClass, setNewArmorClass] = useState('');
  const [newType, setNewType] = useState<CombatantTypeInput>('MONSTER');
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const fetchCombatants = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await graphqlRequest<{ combatants: Combatant[] }>(COMBATANTS_QUERY, {
        encounterId,
      });
      setCombatants(data.combatants);
    } catch (err: any) {
      setError(err.message ?? 'Failed to load combatants');
    } finally {
      setLoading(false);
    }
  }, [encounterId]);

  useEffect(() => {
    fetchCombatants();
  }, [fetchCombatants]);

  const sortedCombatants = [...combatants].sort((a, b) => b.initiative - a.initiative);

  async function handleAddCombatant(e: React.FormEvent) {
    e.preventDefault();

    const initiative = parseInt(newInitiative, 10);
    const maxHp = parseInt(newMaxHp, 10);
    const armorClass = parseInt(newArmorClass, 10);

    if (!newName.trim() || isNaN(initiative) || isNaN(maxHp) || isNaN(armorClass)) {
      setAddError('All fields are required and must be valid');
      return;
    }

    if (maxHp <= 0) {
      setAddError('Max HP must be greater than 0');
      return;
    }

    if (armorClass <= 0) {
      setAddError('Armor Class must be greater than 0');
      return;
    }

    setAddLoading(true);
    setAddError(null);
    try {
      await graphqlRequest(CREATE_COMBATANT_MUTATION, {
        input: {
          name: newName.trim(),
          initiative,
          maxHp,
          currentHp: maxHp,
          tempHp: 0,
          armorClass,
          combatantType: newType,
          encounterId,
        },
      });
      // Reset form
      setNewName('');
      setNewInitiative('');
      setNewMaxHp('');
      setNewArmorClass('');
      setNewType('MONSTER');
      setShowAddForm(false);
      // Refetch combatants
      await fetchCombatants();
    } catch (err: any) {
      setAddError(err.message ?? 'Failed to add combatant');
    } finally {
      setAddLoading(false);
    }
  }

  async function handleRemoveCombatant(id: string) {
    try {
      await graphqlRequest(DELETE_COMBATANT_MUTATION, { id });
      await fetchCombatants();
    } catch (err: any) {
      setError(err.message ?? 'Failed to remove combatant');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8" data-testid="encounter-hp-panel-loading">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4" data-testid="encounter-hp-panel">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Combatants</h2>
        <button
          className="btn btn-primary btn-sm"
          onClick={() => setShowAddForm(!showAddForm)}
          data-testid="add-combatant-btn"
        >
          {showAddForm ? 'Cancel' : 'Add Combatant'}
        </button>
      </div>

      {/* Error display */}
      {error && (
        <div className="alert alert-error" data-testid="encounter-hp-panel-error">
          <span>{error}</span>
        </div>
      )}

      {/* Add Combatant Form */}
      {showAddForm && (
        <form
          className="card bg-base-200 p-4"
          onSubmit={handleAddCombatant}
          data-testid="add-combatant-form"
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="form-control">
              <label className="label" htmlFor="combatant-name">
                <span className="label-text">Name</span>
              </label>
              <input
                id="combatant-name"
                type="text"
                className="input input-bordered input-sm"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Goblin"
                disabled={addLoading}
                data-testid="add-combatant-name"
              />
            </div>

            <div className="form-control">
              <label className="label" htmlFor="combatant-initiative">
                <span className="label-text">Initiative</span>
              </label>
              <input
                id="combatant-initiative"
                type="number"
                className="input input-bordered input-sm"
                value={newInitiative}
                onChange={(e) => setNewInitiative(e.target.value)}
                placeholder="15"
                disabled={addLoading}
                data-testid="add-combatant-initiative"
              />
            </div>

            <div className="form-control">
              <label className="label" htmlFor="combatant-max-hp">
                <span className="label-text">Max HP</span>
              </label>
              <input
                id="combatant-max-hp"
                type="number"
                min="1"
                className="input input-bordered input-sm"
                value={newMaxHp}
                onChange={(e) => setNewMaxHp(e.target.value)}
                placeholder="30"
                disabled={addLoading}
                data-testid="add-combatant-max-hp"
              />
            </div>

            <div className="form-control">
              <label className="label" htmlFor="combatant-ac">
                <span className="label-text">Armor Class</span>
              </label>
              <input
                id="combatant-ac"
                type="number"
                min="1"
                className="input input-bordered input-sm"
                value={newArmorClass}
                onChange={(e) => setNewArmorClass(e.target.value)}
                placeholder="15"
                disabled={addLoading}
                data-testid="add-combatant-ac"
              />
            </div>

            <div className="form-control">
              <label className="label" htmlFor="combatant-type">
                <span className="label-text">Type</span>
              </label>
              <select
                id="combatant-type"
                className="select select-bordered select-sm"
                value={newType}
                onChange={(e) => setNewType(e.target.value as CombatantTypeInput)}
                disabled={addLoading}
                data-testid="add-combatant-type"
              >
                <option value="PLAYER">Player</option>
                <option value="MONSTER">Monster</option>
                <option value="NPC">NPC</option>
              </select>
            </div>
          </div>

          {addError && (
            <div className="text-error text-sm mt-2" data-testid="add-combatant-error">
              {addError}
            </div>
          )}

          <div className="mt-3 flex justify-end">
            <button
              type="submit"
              className="btn btn-primary btn-sm"
              disabled={addLoading}
              data-testid="add-combatant-submit"
            >
              {addLoading ? (
                <span className="loading loading-spinner loading-xs" />
              ) : (
                'Add'
              )}
            </button>
          </div>
        </form>
      )}

      {/* Empty state */}
      {sortedCombatants.length === 0 && (
        <div className="text-center py-8 text-base-content/60" data-testid="encounter-hp-panel-empty">
          <p className="text-lg">No combatants in this encounter</p>
          <p className="text-sm">Click "Add Combatant" to get started</p>
        </div>
      )}

      {/* Combatant list */}
      <div className="flex flex-col gap-3" data-testid="combatant-list">
        {sortedCombatants.map((combatant) => (
          <div key={combatant.id} className="relative" data-testid={`combatant-row-${combatant.id}`}>
            <CombatantCard
              id={combatant.id}
              name={combatant.name}
              type={mapCombatantType(combatant.combatantType)}
              currentHp={combatant.currentHp}
              maxHp={combatant.maxHp}
              tempHp={combatant.tempHp}
              ac={combatant.armorClass}
              initiative={combatant.initiative}
              isUnconscious={combatant.currentHp === 0}
              onHpChange={fetchCombatants}
            />
            <button
              className="btn btn-ghost btn-xs absolute top-2 right-2 text-error"
              onClick={() => handleRemoveCombatant(combatant.id)}
              aria-label={`Remove ${combatant.name}`}
              data-testid={`remove-combatant-${combatant.id}`}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
