/**
 * neo4jBase.js — Shared implementation for all Cypher/Neo4j-protocol databases
 * (CognoDB, Neo4j AuraDB, Memgraph). Uses the official neo4j-driver.
 */
import neo4j from 'neo4j-driver';
import { BaseAdapter } from './base.js';

const BATCH_SIZE = 500;

export class Neo4jBaseAdapter extends BaseAdapter {
  async connect() {
    const { uri, user, password } = this.config;
    this.driver = neo4j.driver(
      uri,
      neo4j.auth.basic(user, password),
      { maxConnectionPoolSize: 50, connectionTimeout: 30000 }
    );
    await this.driver.verifyConnectivity();
    this.session = this.driver.session();
    this.connected = true;
  }

  async disconnect() {
    if (this.session) await this.session.close();
    if (this.driver) await this.driver.close();
    this.connected = false;
  }

  async clear() {
    await this.runQuery('MATCH (n) DETACH DELETE n');
  }

  async runQuery(query, params = {}) {
    const session = this.driver.session();
    try {
      const result = await session.run(query, params);
      return result.records;
    } finally {
      await session.close();
    }
  }

  /**
   * Load nodes and edges in batches using parameterized Cypher.
   * Returns ingest throughput stats.
   */
  async loadBatch(nodes, edges) {
    const session = this.driver.session();

// index creation for lookups/aggregations.
    // Nodes are stored with the :Node label, so indexes MUST target :Node
    // (previously they targeted :Person/:Organization/etc which never existed,
    //  causing every edge MATCH to be a full graph scan — extremely slow).
    await session.run('CREATE INDEX index_nodeId IF NOT EXISTS FOR (n:Node) ON (n.nodeId)');
    await session.run('CREATE INDEX index_label IF NOT EXISTS FOR (n:Node) ON (n.label)');
    await session.run('CREATE INDEX index_group IF NOT EXISTS FOR (n:Node) ON (n.group)');
    // Duplicate safety: some engines (e.g. older Memgraph) reject a constraint
    // when an index already exists on the same property.
    try {
      await session.run('CREATE CONSTRAINT node_nodeId_unique IF NOT EXISTS FOR (n:Node) REQUIRE n.nodeId IS UNIQUE');
    } catch (_) {
      // index-only fallback is fine
    }

    const nodeStart = performance.now();
    for (let i = 0; i < nodes.length; i += BATCH_SIZE) {
      const batch = nodes.slice(i, i + BATCH_SIZE);
      const cypher = `
        UNWIND $batch AS row
        CREATE (n:Node {nodeId: row.nodeId, label: row.label, group: row.group, timestamp: row.timestamp})
      `;
      await session.run(cypher, { batch });
    }
    const nodeMs = performance.now() - nodeStart;

    const edgeStart = performance.now();
    for (let i = 0; i < edges.length; i += BATCH_SIZE) {
      const batch = edges.slice(i, i + BATCH_SIZE);
      const cypher = `
        UNWIND $batch AS row
        MATCH (a:Node {nodeId: row.from})
        MATCH (b:Node {nodeId: row.to})
        CREATE (a)-[r:REL {weight: row.weight, type: row.type}]->(b)
      `;
      await session.run(cypher, { batch });
    }
    const edgeMs = performance.now() - edgeStart;

    await session.close();

    return {
      nodeMs,
      edgeMs,
      nodeThroughput: nodes.length / (nodeMs / 1000),
      edgeThroughput: edges.length / (edgeMs / 1000),
    };
  }

  async warmup() {
    // Force query plan compilation + cache warm
    const sample = await this.runQuery('MATCH (n:Node) RETURN n LIMIT 1');
    if (sample.length === 0) return;
    await this.runQuery('MATCH (n:Node) RETURN n.nodeId LIMIT 1');
  }

  async traversal1hop(startId) {
    await this.runQuery(
      'MATCH (a:Node {nodeId: $id})-[:REL]-(b) RETURN count(b) AS c',
      { id: startId }
    );
  }

  async traversal2hop(startId) {
    await this.runQuery(
      'MATCH (a:Node {nodeId: $id})-[:REL*1..2]-(b) RETURN count(b) AS c',
      { id: startId }
    );
  }

  async traversal3hop(startId) {
    await this.runQuery(
      'MATCH (a:Node {nodeId: $id})-[:REL*1..3]-(b) RETURN count(b) AS c',
      { id: startId }
    );
  }

  async pointLookup(id) {
    await this.runQuery('MATCH (n:Node {nodeId: $id}) RETURN n', { id });
  }

  async indexedLookup(label, prop, val) {
    await this.runQuery(
      'MATCH (n:Node) WHERE n.label = $label AND n.nodeId = $val RETURN n',
      { label, val }
    );
  }

  async aggregation() {
    await this.runQuery(
      'MATCH (n:Node) RETURN n.label AS label, count(*) AS c ORDER BY c DESC'
    );
  }

  async writeOperation(id) {
    // touch a node's timestamp to simulate a write
    await this.runQuery(
      'MATCH (n:Node {nodeId: $id}) SET n.timestamp = timestamp()',
      { id }
    );
  }

  async getNodeCount() {
    const res = await this.runQuery('MATCH (n:Node) RETURN count(n) AS c');
    return res[0].get('c').toNumber();
  }

  async getEdgeCount() {
    const res = await this.runQuery('MATCH ()-[r:REL]->() RETURN count(r) AS c');
    return res[0].get('c').toNumber();
  }
}
