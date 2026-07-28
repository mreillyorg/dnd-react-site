import { describe, it, expect } from 'vitest';
import { schema } from './index.js';

describe('GraphQL schema assembly', () => {
  it('exports a valid GraphQL schema', () => {
    expect(schema).toBeDefined();
    expect(schema.constructor.name).toBe('GraphQLSchema');
    // Validate that the schema has Query and Mutation types
    expect(schema.getQueryType()).toBeDefined();
    expect(schema.getMutationType()).toBeDefined();
  });

  it('contains all expected object types', () => {
    const expectedTypes = [
      'User',
      'Character',
      'Campaign',
      'Session',
      'CombatEncounter',
      'Combatant',
      'Monster',
      'Item',
      'ItemAssignment',
      'NPC',
      'Location',
      'Quest',
      'TimelineEntry',
      'SessionNote',
      'OAuthURL',
    ];

    for (const typeName of expectedTypes) {
      const type = schema.getType(typeName);
      expect(type, `Expected type "${typeName}" to exist`).toBeDefined();
    }
  });

  it('has Query and Mutation root types', () => {
    const queryType = schema.getQueryType();
    const mutationType = schema.getMutationType();

    expect(queryType).toBeDefined();
    expect(queryType!.name).toBe('Query');
    expect(mutationType).toBeDefined();
    expect(mutationType!.name).toBe('Mutation');
  });

  it('Query type has expected fields', () => {
    const queryType = schema.getQueryType()!;
    const fields = queryType.getFields();

    const expectedQueryFields = [
      'me',
      'initiateOAuth',
      'linkedProviders',
      'user',
      'users',
      'character',
      'characters',
      'campaign',
      'campaigns',
      'session',
      'sessions',
      'combatEncounter',
      'combatEncounters',
      'combatant',
      'combatants',
      'monster',
      'monsters',
      'item',
      'items',
      'itemAssignment',
      'itemAssignments',
      'npc',
      'npcs',
      'location',
      'locations',
      'quest',
      'quests',
      'timelineEntry',
      'timelineEntries',
      'sessionNote',
      'sessionNotes',
    ];

    for (const fieldName of expectedQueryFields) {
      expect(fields[fieldName], `Expected Query.${fieldName} to exist`).toBeDefined();
    }
  });

  it('Mutation type has expected fields', () => {
    const mutationType = schema.getMutationType()!;
    const fields = mutationType.getFields();

    const expectedMutationFields = [
      'logout',
      'createUser',
      'updateUser',
      'deleteUser',
      'createCharacter',
      'updateCharacter',
      'deleteCharacter',
      'createCampaign',
      'updateCampaign',
      'deleteCampaign',
      'createSession',
      'updateSession',
      'deleteSession',
      'createCombatEncounter',
      'updateCombatEncounter',
      'deleteCombatEncounter',
      'createCombatant',
      'updateCombatant',
      'deleteCombatant',
      'createMonster',
      'updateMonster',
      'deleteMonster',
      'createItem',
      'updateItem',
      'deleteItem',
      'createItemAssignment',
      'updateItemAssignment',
      'deleteItemAssignment',
      'createNPC',
      'updateNPC',
      'deleteNPC',
      'createLocation',
      'updateLocation',
      'deleteLocation',
      'createQuest',
      'updateQuest',
      'deleteQuest',
      'createTimelineEntry',
      'updateTimelineEntry',
      'deleteTimelineEntry',
      'createSessionNote',
      'updateSessionNote',
      'deleteSessionNote',
    ];

    for (const fieldName of expectedMutationFields) {
      expect(fields[fieldName], `Expected Mutation.${fieldName} to exist`).toBeDefined();
    }
  });
});
