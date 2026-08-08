/**
 * traversal.js — 1-hop, 2-hop, 3-hop traversal latency.
 * Runs configurable iterations over a set of random start nodes.
 * Reports p50/p95 latency per hop depth.
 */
import { StatsCollector } from '../metrics/stats.js';

export async function runTraversalWorkload(adapter, sampleIds, iterations, warmupIterations) {
  const results = {};
  const depths = [
    { key: 'traversal1hop', fn: (id) => adapter.traversal1hop(id) },
    { key: 'traversal2hop', fn: (id) => adapter.traversal2hop(id) },
    { key: 'traversal3hop', fn: (id) => adapter.traversal3hop(id) },
  ];

  for (const { key, fn } of depths) {
    // Warm-up
    for (let i = 0; i < Math.min(warmupIterations, sampleIds.length); i++) {
      try {
        await fn(sampleIds[i % sampleIds.length]);
      } catch (_) {}
    }

    const stats = new StatsCollector();
    for (let i = 0; i < iterations; i++) {
      const id = sampleIds[i % sampleIds.length];
      const start = performance.now();
      try {
        await fn(id);
        stats.add(performance.now() - start);
      } catch (err) {
        stats.add(performance.now() - start); // record the latency even on failure
        if (!results._errors) results._errors = {};
        if (!results._errors[key]) results._errors[key] = [];
        results._errors[key].push(String(err.message || err));
      }
    }
    results[key] = stats.report();
  }

  return results;
}
