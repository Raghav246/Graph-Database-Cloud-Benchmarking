import neo4j from 'neo4j-driver';
import { Neo4jBaseAdapter } from './neo4jBase.js';

/**
 * Memgraph (self-hosted, Docker) — uses Neo4j/Cypher BOLT protocol.
 * Memgraph supports a subset of Cypher; variable-length traversals and
 * anonymous MATCH are supported. Some Neo4j-specific index syntax may differ.
 */
export class MemgraphAdapter extends Neo4jBaseAdapter {
  constructor(platformKey, config) {
    super(platformKey, config);
  }

  async connect() {
    // Memgraph uses a single user (usually no auth on localhost)
    const { uri, user, password } = this.config;
    const authToken = user ? neo4j.auth.basic(user, password) : undefined;
    this.driver = neo4j.driver(
      uri,
      authToken,
      { maxConnectionPoolSize: 50, connectionTimeout: 30000 }
    );
    await this.driver.verifyConnectivity();
    this.session = this.driver.session();
    this.connected = true;
  }
}
