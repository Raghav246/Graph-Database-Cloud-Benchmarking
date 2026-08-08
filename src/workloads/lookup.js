/**
 * lookup.js — Point lookup and indexed/filtered lookup latency.
 */
import { StatsCollector } from '../metrics/stats.js';

export async function runLookupWorkload(adapter, sampleIds, iterations, warmupIterations) {
  const results = {};

  // --- Point lookup ---
  for (let i = 0; i < Math.min(warmupIterations, sampleIds.length); i++) {
    try {
      await adapter.pointLookup(sampleIds[i % sampleIds.length]);
    } catch (_) {}
  }
  const point = new StatsCollector();
  for (let i = 0; i < iterations; i++) {
    const id = sampleIds[i % sampleIds.length];
    const start = performance.now();
    try {
      await adapter.pointLookup(id);
      point.add(performance.now() - start);
    } catch (err) {
      point.add(performance.now() - start);
    }
  }
  results.pointLookup = point.report();

  // --- Indexed/filtered lookup (by label + nodeId) ---
  // Use a mix of labels so the filter is exercised
  const labels = ['Person', 'Organization', 'Project', 'Technology'];
  for (let i = 0; i < Math.min(warmupIterations, sampleIds.length); i++) {
    try {
      await adapter.indexedLookup(labels[i % labels.length], 'nodeId', sampleIds[i % sampleIds.length]);
    } catch (_) {}
  }
  const indexed = new StatsCollector();
  for (let i = 0; i < iterations; i++) {
    const id = sampleIds[i % sampleIds.length];
    const label = labels[Math.floor(Math.random() * labels.length)];
    const start = performance.now();
    try {
      await adapter.indexedLookup(label, 'nodeId', id);
      indexed.add(performance.now() - start);
    } catch (err) {
      indexed.add(performance.now() - start);
    }
  }
  results.indexedLookup = indexed.report();

  return results;
}
