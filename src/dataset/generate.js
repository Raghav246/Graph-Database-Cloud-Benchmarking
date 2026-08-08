/**
 * generate.js — Synthetic graph dataset with ≥100k relationships
 *
 * Outputs: nodes.csv, edges.csv, sample-start-ids.json
 * Schema:
 *   nodes(nodeId:ID, label:string, group:string, timestamp:bigint)
 *   edges(:START_ID, :END_ID, weight:double, type:string)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from '../config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '../../data');

// Seeded PRNG (Mulberry32)
function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateDataset(nodeCount, edgeCount, seed) {
  const rng = mulberry32(seed);
  const groups = ['GroupA', 'GroupB', 'GroupC', 'GroupD', 'GroupE'];
  const labels = ['Person', 'Organization', 'Project', 'Technology'];
  const edgeTypes = ['FOLLOWS', 'BELONGS_TO', 'DEVELOPS', 'FUNDED_BY'];

  const nodes = [];
  for (let i = 0; i < nodeCount; i++) {
    const nodeId = `n${i}`;
    const label = labels[Math.floor(rng() * labels.length)];
    const group = groups[Math.floor(rng() * groups.length)];
    const timestamp = Math.floor(Date.now() / 1000) - Math.floor(rng() * 1_000_000);
    nodes.push({ nodeId, label, group, timestamp });
  }

  // Prefer power-law-like edge distribution: a few hub nodes get many edges
  const edges = [];
  const edgeSet = new Set();

  // Phase 1: attach to random hubs to create structure
  const hubCount = Math.max(1, Math.floor(nodeCount * 0.05));
  const hubs = [];
  for (let i = 0; i < hubCount; i++) {
    hubs.push(Math.floor(rng() * nodeCount));
  }

  while (edges.length < edgeCount) {
    let from = Math.floor(rng() * nodeCount);
    let to = Math.floor(rng() * nodeCount);

    // bias toward hubs
    if (rng() < 0.6) {
      from = hubs[Math.floor(rng() * hubs.length)];
    }
    if (rng() < 0.6) {
      to = hubs[Math.floor(rng() * hubs.length)];
    }

    if (from === to) continue;
    const key = `${from}->${to}`;
    if (edgeSet.has(key)) continue;
    edgeSet.add(key);

    const weight = +(rng() * 100).toFixed(4);
    const type = edgeTypes[Math.floor(rng() * edgeTypes.length)];
    edges.push({ from: nodes[from].nodeId, to: nodes[to].nodeId, weight, type });
  }

  // Pick 200 random "start" node IDs for lookup/traversal queries
  const sampleIds = [];
  for (let i = 0; i < 200; i++) {
    sampleIds.push(nodes[Math.floor(rng() * nodes.length)].nodeId);
  }

  return { nodes, edges, sampleIds };
}

export function writeCSV(dataDir, nodes, edges, sampleIds) {
  fs.mkdirSync(dataDir, { recursive: true });

  // --- nodes.csv ---
  const nodeHeader = 'nodeId:ID,label,group,timestamp\n';
  const nodeRows = nodes
    .map((n) => `${n.nodeId},${n.label},${n.group},${n.timestamp}`)
    .join('\n');
  fs.writeFileSync(path.join(dataDir, 'nodes.csv'), nodeHeader + nodeRows, 'utf-8');

  // --- edges.csv ---
  const edgeHeader = ':START_ID,:END_ID,weight:double,type\n';
  const edgeRows = edges
    .map((e) => `${e.from},${e.to},${e.weight},${e.type}`)
    .join('\n');
  fs.writeFileSync(path.join(dataDir, 'edges.csv'), edgeHeader + edgeRows, 'utf-8');

  // --- sample-start-ids.json ---
  fs.writeFileSync(path.join(dataDir, 'sample-start-ids.json'), JSON.stringify(sampleIds), 'utf-8');

  // --- summary ---
  const summary = {
    nodeCount: nodes.length,
    edgeCount: edges.length,
    sampleCount: sampleIds.length,
    generatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(path.join(dataDir, 'summary.json'), JSON.stringify(summary, null, 2), 'utf-8');

  console.log(`\nDataset written to ${dataDir}`);
  console.log(`  Nodes: ${nodes.length}`);
  console.log(`  Edges: ${edges.length}`);
  console.log(`  Sample start IDs: ${sampleIds.length}`);

  return summary;
}

// --- CLI runner ---
if (process.argv[1] && process.argv[1].endsWith('generate.js')) {
  const { nodes, edges, sampleIds } = generateDataset(
    config.dataset.nodes,
    config.dataset.edges,
    config.dataset.seed
  );
  writeCSV(DATA_DIR, nodes, edges, sampleIds);
}

export { DATA_DIR };
