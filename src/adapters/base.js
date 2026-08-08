/**
 * base.js — Abstract base adapter that every database adapter must implement.
 *
 * Each adapter provides:
 *   connect()                     — open connection(s)
 *   disconnect()                  — clean close
 *   clear()                       — remove all data (reset database)
 *   loadBatch(nodes, edges)       — bulk load nodes + edges, returns {nodeMs, edgeMs}
 *   warmup()                      — run a few queries to warm caches
 *   runQuery(query, params)       — execute arbitrary query
 *
 * Workload-specific methods:
 *   traversal1hop(startId)        — 1-hop traversal
 *   traversal2hop(startId)        — 2-hop traversal
 *   traversal3hop(startId)        — 3-hop traversal
 *   pointLookup(id)               — point lookup by node ID
 *   indexedLookup(label, prop, val) — filtered/indexed lookup
 *   aggregation()                 — count/group-by query
 *   writeOperation(id)            — single write for mixed workload
 *   getNodeCount()                — returns node count (for verification)
 *   getEdgeCount()                — returns edge count (for verification)
 */
export class BaseAdapter {
  constructor(platformKey, config) {
    this.platformKey = platformKey;
    this.config = config;
    this.driver = null;
    this.connected = false;
  }

  async connect() {
    throw new Error('connect() not implemented');
  }

  async disconnect() {
    throw new Error('disconnect() not implemented');
  }

  async clear() {
    throw new Error('clear() not implemented');
  }

  /** Load nodes and edges in batches; returns { nodeThroughput, edgeThroughput } */
  async loadBatch(nodes, edges) {
    throw new Error('loadBatch() not implemented');
  }

  async warmup() {
    throw new Error('warmup() not implemented');
  }

  async runQuery(query, params) {
    throw new Error('runQuery() not implemented');
  }

  async traversal1hop(startId) {
    throw new Error('traversal1hop() not implemented');
  }

  async traversal2hop(startId) {
    throw new Error('traversal2hop() not implemented');
  }

  async traversal3hop(startId) {
    throw new Error('traversal3hop() not implemented');
  }

  async pointLookup(id) {
    throw new Error('pointLookup() not implemented');
  }

  async indexedLookup(label, prop, val) {
    throw new Error('indexedLookup() not implemented');
  }

  async aggregation() {
    throw new Error('aggregation() not implemented');
  }

  async writeOperation(id) {
    throw new Error('writeOperation() not implemented');
  }

  async getNodeCount() {
    throw new Error('getNodeCount() not implemented');
  }

  async getEdgeCount() {
    throw new Error('getEdgeCount() not implemented');
  }

  /** Helper: measure latency of an async function */
  async measure(fn) {
    const start = performance.now();
    await fn();
    return performance.now() - start;
  }
}
