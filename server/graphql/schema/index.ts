import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { makeExecutableSchema } from '@graphql-tools/schema';

import { userResolvers } from '../resolvers/user.resolver.ts';
import { characterResolvers } from '../resolvers/character.resolver.ts';
import { campaignResolvers } from '../resolvers/campaign.resolver.ts';
import { sessionResolvers } from '../resolvers/session.resolver.ts';
import { encounterResolvers } from '../resolvers/encounter.resolver.ts';
import { combatantResolvers } from '../resolvers/combatant.resolver.ts';
import { hpResolvers } from '../resolvers/hp.resolver.ts';
import { statBlockResolvers } from '../resolvers/statBlock.resolver.ts';
import { inventoryResolvers } from '../resolvers/inventory.resolver.ts';
import { itemResolvers } from '../resolvers/item.resolver.ts';
import { authResolvers } from '../resolvers/auth.resolver.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const schemaFiles = [
  'base.graphql',
  'user.graphql',
  'auth.graphql',
  'character.graphql',
  'campaign.graphql',
  'session.graphql',
  'encounter.graphql',
  'combatant.graphql',
  'hp.graphql',
  'statBlock.graphql',
  'item.graphql',
];

const typeDefs = schemaFiles.map((file) =>
  readFileSync(join(__dirname, file), 'utf-8'),
);

const resolvers = [
  userResolvers,
  authResolvers,
  characterResolvers,
  campaignResolvers,
  sessionResolvers,
  encounterResolvers,
  combatantResolvers,
  hpResolvers,
  statBlockResolvers,
  inventoryResolvers,
  itemResolvers,
];

export const schema = makeExecutableSchema({ typeDefs, resolvers });
