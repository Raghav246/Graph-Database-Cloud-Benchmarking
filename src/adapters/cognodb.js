import { Neo4jBaseAdapter } from './neo4jBase.js';

/**
 * CognoDB Cloud — managed Neo4j-compatible graph database (bolt+s).
 */
export class CognoDBAdapter extends Neo4jBaseAdapter {
  constructor(platformKey, config) {
    super(platformKey, config);
  }
}
