/**
 * results.js — Writes benchmark results to JSON + CSV files.
 */
import fs from 'node:fs';
import path from 'node:path';

export function writeJson(resultsDir, results) {
  const file = path.join(resultsDir, `results-${Date.now()}.json`);
  fs.writeFileSync(file, JSON.stringify(results, null, 2), 'utf-8');
  return file;
}

function flattenTraversal(metrics) {
  return {
    traversal1hop_p50: metrics.traversal?.traversal1hop?.p50 ?? null,
    traversal1hop_p95: metrics.traversal?.traversal1hop?.p95 ?? null,
    traversal2hop_p50: metrics.traversal?.traversal2hop?.p50 ?? null,
    traversal2hop_p95: metrics.traversal?.traversal2hop?.p95 ?? null,
    traversal3hop_p50: metrics.traversal?.traversal3hop?.p50 ?? null,
    traversal3hop_p95: metrics.traversal?.traversal3hop?.p95 ?? null,
  };
}

function flattenLookup(metrics) {
  return {
    pointLookup_p50: metrics.lookup?.pointLookup?.p50 ?? null,
    pointLookup_p95: metrics.lookup?.pointLookup?.p95 ?? null,
    indexedLookup_p50: metrics.lookup?.indexedLookup?.p50 ?? null,
    indexedLookup_p95: metrics.lookup?.indexedLookup?.p95 ?? null,
  };
}

function flattenAggregation(metrics) {
  return {
    aggregation_p50: metrics.aggregation?.aggregation?.p50 ?? null,
    aggregation_p95: metrics.aggregation?.aggregation?.p95 ?? null,
  };
}

function flattenMixed(metrics) {
  const out = {};
  for (const row of metrics.mixed || []) {
    out[`mixed_qps_c${row.concurrency}`] = row.qps;
    out[`mixed_p50_c${row.concurrency}`] = row.latencyMs?.p50 ?? null;
    out[`mixed_p95_c${row.concurrency}`] = row.latencyMs?.p95 ?? null;
  }
  return out;
}

export function writeCsv(resultsDir, results) {
  const row = {
    platform: results[0]?.platform ?? '',
    platformName: results[0]?.platformName ?? '',
    tier: results[0]?.tier ?? '',
    vcpu: results[0]?.specs?.vcpu ?? '',
    ram: results[0]?.specs?.ram ?? '',
    disk: results[0]?.specs?.disk ?? '',
    nodeCount: results[0]?.dataset?.nodes ?? '',
    edgeCount: results[0]?.dataset?.edges ?? '',
    ...(() => {
      const m = results[0]?.metrics ?? {};
      return {
        load_totalSec: m.load?.totalLoadSec ?? null,
        load_nodePerSec: m.load?.nodeIngestPerSec ?? null,
        load_edgePerSec: m.load?.edgeIngestPerSec ?? null,
      };
    })(),
    ...flattenTraversal(results[0]?.metrics ?? {}),
    ...flattenLookup(results[0]?.metrics ?? {}),
    ...flattenAggregation(results[0]?.metrics ?? {}),
    ...flattenMixed(results[0]?.metrics ?? {}),
  };

  const headers = Object.keys(row);
  const file = path.join(resultsDir, `results-${Date.now()}.csv`);
  const lines = [headers.join(',')];
  for (const r of results) {
    const m = r.metrics ?? {};
    const values = {
      platform: r.platform,
      platformName: r.platformName,
      tier: r.tier,
      vcpu: r.specs?.vcpu,
      ram: r.specs?.ram,
      disk: r.specs?.disk,
      nodeCount: r.dataset?.nodes,
      edgeCount: r.dataset?.edges,
      load_totalSec: m.load?.totalLoadSec,
      load_nodePerSec: m.load?.nodeIngestPerSec,
      load_edgePerSec: m.load?.edgeIngestPerSec,
      ...flattenTraversal(m),
      ...flattenLookup(m),
      ...flattenAggregation(m),
      ...flattenMixed(m),
    };
    lines.push(headers.map((h) => values[h] ?? '').join(','));
  }
  fs.writeFileSync(file, lines.join('\n'), 'utf-8');
  return file;
}
