import { BaseAdapter } from './base.js';

/**
 * JanusGraph (self-hosted, Docker, Gremlin Server) — uses Gremlin traversal
 * language over WebSocket. JanusGraph requires an index backend (we use
 * in-memory/cassandra via the docker image).
 *
 * NOTE: gremlin (js) driver not pinned in package.json because JanusGraph uses
 * TinkerPop's gremlin-javascript ("gremlin" npm package). We dynamically import
 * it so the rest of the harness works even if the package isn't installed.
 */
const BATCH_SIZE = 200;

export class JanusGraphAdapter extends BaseAdapter {
  async connect() {
    const { gremlin } = await import('gremlin');
    const { driver, structure } = gremlin;
    const { DriverRemoteConnection } = driver;
    this.connection = new DriverRemoteConnection(this.config.uri, {});
    const { Graph } = structure;
    this.graph = new Graph();
    this.g = this.graph.traversal().withRemote(this.connection);
    this.connected = true;
  }

  async disconnect() {
    if (this.connection) await this.connection.close();
    this.connected = false;
  }

  async clear() {
    try {
      await this.g.V().drop().iterate();
    } catch (_) {
      // graph may be empty or schema not created
    }
  }

  async runQuery(traversal) {
    const result = await traversal.toList();
    return result;
  }

  /** Load nodes/edges via Gremlin. Returns ingest throughput. */
  async loadBatch(nodes, edges) {
    const nodeStart = performance.now();

    // Ensure schema: properties required for index creation
    const schemaSetup = `
      mgmt = graph.openManagement();
      mgmt.getPropertyKey('nodeId') || mgmt.makePropertyKey('nodeId').dataType(String.class).make();
      mgmt.getPropertyKey('label') || mgmt.makePropertyKey('label').dataType(String.class).make();
      mgmt.getPropertyKey('group') || mgmt.makePropertyKey('group').dataType(String.class).make();
      mgmt.getPropertyKey('timestamp') || mgmt.makePropertyKey('timestamp').dataType(Long.class).make();
      mgmt.commit();
    `;
    // We use a simpler approach below with addV/addE and let JanusGraph auto-create.

    for (let i = 0; i < nodes.length; i += BATCH_SIZE) {
      const batch = nodes.slice(i, i + BATCH_SIZE);
      let t = this.g;
      for (const n of batch) {
        t = t.addV('node').property('nodeId', n.nodeId).property('label', n.label).property('group', n.group);
      }
      await t.iterate();
    }
    const nodeMs = performance.now() - nodeStart;

    const edgeStart = performance.now();
    for (let i = 0; i < edges.length; i += BATCH_SIZE) {
      const batch = edges.slice(i, i + BATCH_SIZE);
      let t = this.g;
      for (const e of batch) {
        t = t
          .V().has('node', 'nodeId', e.from)
          .addE('rel')
          .to(this.g.V().has('node', 'nodeId', e.to))
          .property('weight', e.weight);
      }
      await t.iterate();
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
    try {
      await this.g.V().limit(1).next();
      await this.g.V().count().next();
    } catch (_) {}
  }

  async traversal1hop(startId) {
    await this.g.V().has('node', 'nodeId', startId).both().count().next();
  }

  async traversal2hop(startId) {
    await this.g.V().has('node', 'nodeId', startId).both('rel').both('rel').dedup().count().next();
  }

  async traversal3hop(startId) {
    await this.g
      .V().has('node', 'nodeId', startId)
      .both('rel').both('rel').both('rel')
      .dedup().count()
      .next();
  }

  async pointLookup(id) {
    await this.g.V().has('node', 'nodeId', id).next();
  }

  async indexedLookup(label, prop, val) {
    await this.g.V().has('node', 'nodeId', val).has('node', 'label', label).next();
  }

  async aggregation() {
    await this.g.V().hasLabel('node').groupCount().by('label').next();
  }

  async writeOperation(id) {
    await this.g.V().has('node', 'nodeId', id).property('timestamp', Date.now()).next();
  }

  async getNodeCount() {
    const res = await this.g.V().hasLabel('node').count().next();
    return Number(res.value);
  }

  async getEdgeCount() {
    const res = await this.g.E().hasLabel('rel').count().next();
    return Number(res.value);
  }
}
