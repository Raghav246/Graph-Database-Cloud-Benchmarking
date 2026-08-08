/**
 * load.js — Data loading workload.
 * Measures ingest throughput (nodes/s, relationships/s) and total wall-clock time.
 */
export async function runLoadWorkload(adapter, nodes, edges) {
  const loadStart = performance.now();
  const ingest = await adapter.loadBatch(nodes, edges);
  const totalMs = performance.now() - loadStart;

  // Verify integrity
  let nodeCount = null;
  let edgeCount = null;
  try {
    nodeCount = await adapter.getNodeCount();
    edgeCount = await adapter.getEdgeCount();
  } catch (_) {
    // some platforms may not expose counts easily
  }

  return {
    nodeCount,
    edgeCount,
    expectedNodes: nodes.length,
    expectedEdges: edges.length,
    nodeIngestPerSec: +ingest.nodeThroughput.toFixed(2),
    edgeIngestPerSec: +ingest.edgeThroughput.toFixed(2),
    nodeLoadMs: +ingest.nodeMs.toFixed(2),
    edgeLoadMs: +ingest.edgeMs.toFixed(2),
    totalLoadMs: +totalMs.toFixed(2),
    totalLoadSec: +(totalMs / 1000).toFixed(3),
  };
}
