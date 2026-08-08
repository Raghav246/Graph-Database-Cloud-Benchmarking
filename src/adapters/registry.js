/**
 * registry.js — Maps platform keys to adapter classes.
 */
import { CognoDBAdapter } from './cognodb.js';
import { Neo4jAuraAdapter } from './neo4j-aura.js';
import { MemgraphAdapter } from './memgraph.js';
import { ArangoDBAdapter } from './arangodb.js';
import { JanusGraphAdapter } from './janusgraph.js';

export const adapterRegistry = {
  cognodb: CognoDBAdapter,
  'neo4j-aura': Neo4jAuraAdapter,
  memgraph: MemgraphAdapter,
  arangodb: ArangoDBAdapter,
  janusgraph: JanusGraphAdapter,
};

export function createAdapter(platformKey, platformConfig) {
  const AdapterClass = adapterRegistry[platformKey];
  if (!AdapterClass) {
    throw new Error(`Unknown platform: ${platformKey}`);
  }
  return new AdapterClass(platformKey, platformConfig);
}
