/**
 * mixed.js — Concurrent read/write mixed workload.
 * Runs a sustained mixed read/write mix at configurable concurrency levels.
 * Reports sustained queries/second for each concurrency.
 */
import { StatsCollector } from '../metrics/stats.js';

const DURATION_MS = 10000; // sustain for 10 seconds per concurrency level

/**
 * @param {object} adapter
 * @param {string[]} sampleIds
 * @param {number} readRatio  0..1 (fraction of operations that are reads)
 * @param {number} concurrency  number of concurrent clients
 * @param {number} durationMs  how long to sustain
 */
export async function runMixedWorkloadOnce(adapter, sampleIds, readRatio, concurrency, durationMs = DURATION_MS) {
  const stopTime = Date.now() + durationMs;
  let completed = 0;
  let failed = 0;
  const latencies = new StatsCollector();

  async function worker() {
    while (Date.now() < stopTime) {
      const id = sampleIds[Math.floor(Math.random() * sampleIds.length)];
      const isRead = Math.random() < readRatio;
      const start = performance.now();
      try {
        if (isRead) {
          await adapter.pointLookup(id);
        } else {
          await adapter.writeOperation(id);
        }
        latencies.add(performance.now() - start);
        completed++;
      } catch (_) {
        failed++;
      }
    }
  }

  const workers = [];
  for (let i = 0; i < concurrency; i++) {
    workers.push(worker());
  }
  await Promise.all(workers);

  const qps = completed / (durationMs / 1000);
  return {
    concurrency,
    durationMs,
    completed,
    failed,
    qps: +qps.toFixed(2),
    latencyMs: latencies.report(),
    readRatio,
  };
}

/**
 * Run mixed workload across a concurrency sweep (e.g. 1, 10, 40).
 */
export async function runMixedWorkloadSweep(adapter, sampleIds, readRatio, concurrencyLevels) {
  const results = [];
  for (const concurrency of concurrencyLevels) {
    // short warm-up
    await runMixedWorkloadOnce(adapter, sampleIds, readRatio, Math.min(concurrency, 5), 2000).catch(() => {});
    const res = await runMixedWorkloadOnce(adapter, sampleIds, readRatio, concurrency);
    results.push(res);
  }
  return results;
}
