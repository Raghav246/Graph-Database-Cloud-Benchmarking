/**
 * index.js — Main orchestrator.
 *
 * Usage:
 *   node src/index.js --db cognodb       # run a single platform
 *   node src/index.js --all              # run all configured platforms
 *   node src/index.js --db cognodb --skip-data   # reuse existing data
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config, ensureResultsDir } from './config.js';
import { loadDataset } from './data.js';
import { createAdapter } from './adapters/registry.js';
import { runBenchmark } from './runner/benchmark.js';
import { writeJson, writeCsv } from './runner/results.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function parseArgs() {
  const args = process.argv.slice(2);
  const out = { db: null, all: false, skipData: false };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--db') out.db = args[i + 1];
    if (args[i] === '--all') out.all = true;
    if (args[i] === '--skip-data') out.skipData = true;
  }
  return out;
}

async function main() {
  const args = parseArgs();

  // Which platforms to run
  let platforms;
  if (args.all) {
    platforms = Object.keys(config.platforms);
  } else if (args.db) {
    if (!config.platforms[args.db]) {
      console.error(`Unknown platform '${args.db}'. Available: ${Object.keys(config.platforms).join(', ')}`);
      process.exit(1);
    }
    platforms = [args.db];
  } else {
    console.error('Usage: node src/index.js --db <platform> | --all');
    process.exit(1);
  }

  // Load/generate dataset
  const { nodes, edges, sampleIds } = loadDataset();

  ensureResultsDir();

  const allResults = [];
  for (const key of platforms) {
    const platformConfig = config.platforms[key];

    // Skip platforms without credentials configured
    if (platformConfig.password !== undefined && (!platformConfig.password || platformConfig.password === 'replace-me')) {
      console.warn(`Skipping ${key}: no password configured in .env`);
      continue;
    }
    if (!platformConfig.uri || platformConfig.uri.includes('<your-')) {
      console.warn(`Skipping ${key}: no URI configured in .env`);
      continue;
    }

    const adapter = createAdapter(key, platformConfig);
    try {
      await adapter.connect();
      if (args.skipData) {
        console.log(`[${key}] Skipping data load (--skip-data)`);
      } else {
        await adapter.clear();
      }

const result = await runBenchmark(adapter, {
        nodes,
        edges,
        sampleIds,
        config,
        skipData: args.skipData,
      });
      allResults.push(result);
    } catch (err) {
      console.error(`\n[${key}] Benchmark failed: ${err.message}`);
      console.error(err.stack);
    } finally {
      await adapter.disconnect();
    }
  }

  // Write outputs
  if (allResults.length > 0) {
    const resultsDir = config.benchmark.resultsDir;
    const jsonFile = writeJson(resultsDir, allResults);
    const csvFile = writeCsv(resultsDir, allResults);
    console.log('\n========================================');
    console.log('Benchmark complete.');
    console.log(`  JSON: ${jsonFile}`);
    console.log(`  CSV:  ${csvFile}`);
    console.log('========================================');
  } else {
    console.log('\nNo benchmark results generated. Check .env configuration.');
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
