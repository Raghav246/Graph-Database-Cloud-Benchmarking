/**
 * benchmark.js — Orchestrates a full benchmark run for a single platform.
 */
import {
  runLoadWorkload,
  runTraversalWorkload,
  runLookupWorkload,
  runAggregationWorkload,
  runMixedWorkloadSweep,
} from '../workloads/index.js';

export async function runBenchmark(adapter, ctx) {
  const { nodes, edges, sampleIds, config, skipData } = ctx;
  const { iterations, warmupIterations, mixedConcurrency, mixedReadWriteRatio } = config.benchmark;

  const result = {
    platform: adapter.platformKey,
    platformName: adapter.config.name,
    tier: adapter.config.tier,
    specs: adapter.config.specs,
    startedAt: new Date().toISOString(),
    dataset: {
      nodes: nodes.length,
      edges: edges.length,
    },
    metrics: {},
  };

  // 1. Data loading (skipped when reusing existing data)
  if (skipData) {
    console.log(`[${adapter.platformKey}] Skipping load workload (--skip-data)`);
    result.metrics.load = {
      skipped: true,
      nodeCount: nodes.length,
      edgeCount: edges.length,
    };
  } else {
    console.log(`[${adapter.platformKey}] Loading data...`);
    result.metrics.load = await runLoadWorkload(adapter, nodes, edges);
  }

  // 2. Warm-up the whole database before read workloads
  console.log(`[${adapter.platformKey}] Warming up...`);
  await adapter.warmup();

  // 3. Traversals (1/2/3-hop)
  console.log(`[${adapter.platformKey}] Running traversals...`);
  result.metrics.traversal = await runTraversalWorkload(adapter, sampleIds, iterations, warmupIterations);

  // 4. Lookups
  console.log(`[${adapter.platformKey}] Running lookups...`);
  result.metrics.lookup = await runLookupWorkload(adapter, sampleIds, iterations, warmupIterations);

  // 5. Aggregation
  console.log(`[${adapter.platformKey}] Running aggregation...`);
  result.metrics.aggregation = await runAggregationWorkload(adapter, iterations, warmupIterations);

  // 6. Mixed workload (concurrency sweep)
  console.log(`[${adapter.platformKey}] Running mixed workload sweep...`);
  result.metrics.mixed = await runMixedWorkloadSweep(
    adapter,
    sampleIds,
    mixedReadWriteRatio,
    mixedConcurrency
  );

  result.finishedAt = new Date().toISOString();
  return result;
}
