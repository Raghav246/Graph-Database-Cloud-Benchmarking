import { Neo4jBaseAdapter } from './neo4jBase.js';

/**
 * Neo4j AuraDB Free — managed Neo4j graph database (bolt+s).
 */
export class Neo4jAuraAdapter extends Neo4jBaseAdapter {
  constructor(platformKey, config) {
    super(platformKey, config);
  }
}
