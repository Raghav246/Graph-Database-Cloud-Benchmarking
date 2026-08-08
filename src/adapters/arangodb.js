import { Database, aql } from 'arangojs';
import { BaseAdapter } from './base.js';

const BATCH_SIZE = 500;

/**
 * ArangoDB (self-hosted, Docker) — multi-model database with graph features.
 * Uses arangojs and AQL.
 * Model: documents stored in 'nodes' collection, edges in 'edges' edge collection.
 *   nodes: { _key: nodeId, label, group, timestamp }
 *   edges: { _from: 'nodes/<fromId>', _to: 'nodes/<toId>', weight, type }
 */
export class ArangoDBAdapter extends BaseAdapter {
  async connect() {
    const { uri, user, password, database } = this.config;
    this.db = new Database({ url: uri, databaseName: database });
    if (user) this.db.useBasicAuth(user, password);

    // Create the benchmark database if it doesn't exist (from _system)
    const sysDb = new Database({ url: uri });
    if (user) sysDb.useBasicAuth(user, password);
    const all = await sysDb.listDatabases();
    if (!all.includes(database)) {
      await sysDb.createDatabase(database);
    }
    this.connected = true;
  }

  async disconnect() {
    this.connected = false;
  }

  async clear() {
    try {
      const cols = await this.db.listCollections();
      for (const c of cols) {
        if (c.name === 'nodes' || c.name === 'edges') {
          await this.db.collection(c.name).truncate();
        }
      }
    } catch (_) {
      // collections may not exist yet
    }
  }

  async ensureCollections() {
    const cols = await this.db.listCollections().catch(() => []);
    const names = new Set(cols.map((c) => c.name));
    if (!names.has('nodes')) {
      await this.db.createCollection('nodes');
    }
    if (!names.has('edges')) {
      await this.db.createEdgeCollection('edges');
    }
  }

  async runQuery(query, bindVars = {}) {
    const cursor = await this.db.query({ query, bindVars });
    return cursor.all();
  }

  async loadBatch(nodes, edges) {
    await this.ensureCollections();

    const nodesCol = this.db.collection('nodes');
    const edgesCol = this.db.collection('edges');

    // index on nodeId (unique) + group for filtered lookup/aggregation
    try {
      await nodesCol.ensureIndex({ type: 'persistent', fields: ['label'] });
      await nodesCol.ensureIndex({ type: 'persistent', fields: ['group'] });
    } catch (_) {}

    const nodeStart = performance.now();
    for (let i = 0; i < nodes.length; i += BATCH_SIZE) {
      const batch = nodes.slice(i, i + BATCH_SIZE).map((n) => ({
        _key: n.nodeId,
        label: n.label,
        group: n.group,
        timestamp: n.timestamp,
      }));
      await nodesCol.saveAll(batch, { overwriteMode: 'update' });
    }
    const nodeMs = performance.now() - nodeStart;

    const edgeStart = performance.now();
    for (let i = 0; i < edges.length; i += BATCH_SIZE) {
      const batch = edges.slice(i, i + BATCH_SIZE).map((e) => ({
        _from: `nodes/${e.from}`,
        _to: `nodes/${e.to}`,
        weight: e.weight,
        type: e.type,
      }));
      await edgesCol.saveAll(batch);
    }
    const edgeMs = performance.now() - edgeStart;

    return {
      nodeMs,
      edgeMs,
      nodeThroughput: nodes.length / (nodeMs / 1000),
      edgeThroughput: edges.length / (edgeMs / 1000),
    };
  }

  async warmup() {
    await this.runQuery(aql`LIMIT 1 FOR d IN nodes RETURN d`).catch(() => {});
    const res = await this.runQuery(aql`FOR d IN nodes LIMIT 1 RETURN d`);
    if (res.length === 0) return;
    await this.runQuery(aql`FOR d IN nodes LIMIT 1 RETURN d._key`);
  }

  async traversal1hop(startId) {
    await this.runQuery(aql`
      FOR v, e IN 1..1 ANY 'nodes/${startId}' edges
        COLLECT WITH COUNT INTO c
        RETURN c
    `);
  }

  async traversal2hop(startId) {
    await this.runQuery(aql`
      FOR v, e IN 1..2 ANY 'nodes/${startId}' edges
        COLLECT WITH COUNT INTO c
        RETURN c
    `);
  }

  async traversal3hop(startId) {
    await this.runQuery(aql`
      FOR v, e IN 1..3 ANY 'nodes/${startId}' edges
        COLLECT WITH COUNT INTO c
        RETURN c
    `);
  }

  async pointLookup(id) {
    await this.runQuery(aql`RETURN DOCUMENT('nodes/${id}')`);
  }

  async indexedLookup(label, prop, val) {
    await this.runQuery(aql`
      FOR d IN nodes
        FILTER d.label == ${label} && d.${prop} == ${val}
        RETURN d
    `);
  }

  async aggregation() {
    await this.runQuery(aql`
      FOR d IN nodes
        COLLECT label = d.label WITH COUNT INTO c
        SORT c DESC
        RETURN { label, c }
    `);
  }

  async writeOperation(id) {
    await this.runQuery(aql`
      UPDATE 'nodes/${id}' WITH { timestamp: DATE_NOW() } IN nodes
    `);
  }

  async getNodeCount() {
    const res = await this.runQuery(aql`RETURN COUNT(FOR d IN nodes RETURN 1)`);
    return res[0];
  }

  async getEdgeCount() {
    const res = await this.runQuery(aql`RETURN COUNT(FOR d IN edges RETURN 1)`);
    return res[0];
  }
}
