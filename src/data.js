/**
 * data.js — Loads the generated dataset (nodes, edges, sample IDs) from disk
 * or generates it on demand.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateDataset } from './dataset/generate.js';
import { config } from './config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function loadDataset() {
  const dataDir = path.resolve(__dirname, '../../data');
  const nodesFile = path.join(dataDir, 'nodes.csv');
  const edgesFile = path.join(dataDir, 'edges.csv');
  const sampleFile = path.join(dataDir, 'sample-start-ids.json');

  if (fs.existsSync(nodesFile) && fs.existsSync(edgesFile) && fs.existsSync(sampleFile)) {
    console.log('Loading existing dataset from disk...');
    const nodes = parseCsvNodes(nodesFile);
    const edges = parseCsvEdges(edgesFile);
    const sampleIds = JSON.parse(fs.readFileSync(sampleFile, 'utf-8'));
    console.log(`  Loaded ${nodes.length} nodes, ${edges.length} edges, ${sampleIds.length} sample IDs`);
    return { nodes, edges, sampleIds };
  }

  console.log('Generating dataset...');
  const { nodes, edges, sampleIds } = generateDataset(
    config.dataset.nodes,
    config.dataset.edges,
    config.dataset.seed
  );
  return { nodes, edges, sampleIds };
}

function parseCsvNodes(file) {
  const lines = fs.readFileSync(file, 'utf-8').trim().split('\n');
  lines.shift(); // header
  return lines.map((line) => {
    const [nodeId, label, group, timestamp] = line.split(',');
    return { nodeId, label, group, timestamp };
  });
}

function parseCsvEdges(file) {
  const lines = fs.readFileSync(file, 'utf-8').trim().split('\n');
  lines.shift(); // header
  return lines.map((line) => {
    const [from, to, weight, type] = line.split(',');
    return { from, to, weight: parseFloat(weight), type };
  });
}
