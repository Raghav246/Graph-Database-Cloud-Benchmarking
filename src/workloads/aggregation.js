/**
 * aggregation.js — Count / group-by aggregation latency.
 */
import { StatsCollector } from '../metrics/stats.js';

export async function runAggregationWorkload(adapter, iterations, warmupIterations) {
  for (let i = 0; i < warmupIterations; i++) {
    try {
      await adapter.aggregation();
    } catch (_) {}
  }

  const stats = new StatsCollector();
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    try {
      await adapter.aggregation();
      stats.add(performance.now() - start);
    } catch (err) {
      stats.add(performance.now() - start);
    }
  }
  return { aggregation: stats.report() };
}
