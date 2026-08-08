import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env from project root (two levels up from src/)
dotenv.config({ path: path.resolve(__dirname, '../.env') });

function num(name, fallback) {
  const v = process.env[name];
  if (v === undefined || v === '') return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function str(name, fallback = '') {
  const v = process.env[name];
  return v === undefined || v === '' ? fallback : v;
}

function resolveSecret(name, fallback = '') {
  const v = str(name);
  if (!v || v === 'replace-me' || v.includes('<your-')) {
    return fallback;
  }
  return v;
}

export const config = {
  dataset: {
    nodes: num('DATASET_NODES', 50000),
    edges: num('DATASET_EDGES', 150000),
    seed: num('DATASET_SEED', 42),
  },
  benchmark: {
    iterations: num('ITERATIONS', 100),
    warmupIterations: num('WARMUP_ITERATIONS', 10),
    mixedConcurrency: str('MIXED_CONCURRENCY', '1,10,40')
      .split(',')
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isFinite(n) && n > 0),
    mixedReadWriteRatio: num('MIXED_READ_WRITE_RATIO', 0.8),
    resultsDir: path.resolve(path.dirname(__dirname), str('RESULTS_DIR', './results')),
  },
  platforms: {
    cognodb: {
      driver: 'neo4j',
      uri: str('COGNODB_URI'),
      user: str('COGNODB_USER', 'cognodb'),
      password: resolveSecret('COGNODB_PASSWORD'),
      name: 'CognoDB Cloud',
      tier: 'Free c0 (burstable)',
      specs: { vcpu: '0.5', ram: '256 MB', disk: '1 GB' },
    },
    'neo4j-aura': {
      driver: 'neo4j',
      uri: str('NEO4J_URI'),
      user: str('NEO4J_USER', 'neo4j'),
      password: resolveSecret('NEO4J_PASSWORD'),
      name: 'Neo4j AuraDB Free',
      tier: 'Free',
      specs: { vcpu: '0.5', ram: '1 GB', disk: '1 GB' },
    },
    memgraph: {
      driver: 'neo4j',
      uri: str('MEMGRAPH_URI', 'bolt://localhost:7687'),
      user: str('MEMGRAPH_USER'),
      password: str('MEMGRAPH_PASSWORD'),
      name: 'Memgraph (Docker)',
      tier: 'Self-hosted, capped',
      specs: { vcpu: '0.5', ram: '256 MB', disk: '1 GB' },
    },
    arangodb: {
      driver: 'arango',
      uri: str('ARANGO_URI', 'http://localhost:8529'),
      user: str('ARANGO_USER', 'root'),
      password: resolveSecret('ARANGO_PASSWORD'),
      database: 'benchmark',
      name: 'ArangoDB (Docker)',
      tier: 'Self-hosted, capped',
      specs: { vcpu: '0.5', ram: '256 MB', disk: '1 GB' },
    },
    janusgraph: {
      driver: 'gremlin',
      uri: str('JANUSGRAPH_URI', 'ws://localhost:8182/gremlin'),
      name: 'JanusGraph (Docker)',
      tier: 'Self-hosted, capped',
      specs: { vcpu: '0.5', ram: '256 MB', disk: '1 GB' },
    },
  },
};

export function ensureResultsDir() {
  fs.mkdirSync(config.benchmark.resultsDir, { recursive: true });
}
