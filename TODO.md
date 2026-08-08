# Graph-Database-Cloud-Benchmarking — TODO

## Project scaffolding
- [x] Confirm plan with user
- [ ] Create package.json with pinned dependencies
- [ ] Create .env.example (no real secrets)
- [ ] Create src/config.js (env loading + normalization)

## Dataset
- [ ] Create src/dataset/generate.js (100k+ relationship synthetic graph)
- [ ] Generate dataset files (nodes.csv, edges.csv, sample-start-ids.json)

## Core harness
- [ ] Create src/metrics/stats.js (p50/p95/mean, throughput)
- [ ] Create src/adapters/base.js (common interface)
- [ ] Create src/adapters/cognodb.js (Neo4j driver)
- [ ] Create src/adapters/neo4j-aura.js (Neo4j driver)
- [ ] Create src/adapters/memgraph.js (Neo4j driver)
- [ ] Create src/adapters/arangodb.js (arangojs)
- [ ] Create src/adapters/janusgraph.js (gremlin)

## Workloads
- [ ] Create src/workloads/load.js (ingest + throughput)
- [ ] Create src/workloads/traversal.js (1/2/3-hop)
- [ ] Create src/workloads/lookup.js (point + indexed/filtered)
- [ ] Create src/workloads/aggregation.js (count/group-by)
- [ ] Create src/workloads/mixed.js (concurrency read/write mix)

## Runner & orchestration
- [ ] Create src/runner/benchmark.js (warm-up, iterations, sweep)
- [ ] Create src/index.js (main orchestrator)
- [ ] Create docker/docker-compose.yml (resource-capped self-hosted DBs)
- [ ] Create scripts/run-all.sh (one-command automation)

## Reporting
- [ ] Create results/ output writing (JSON + CSV charts)
- [ ] Write comprehensive README.md (methodology, results matrix, analysis, caveats)

## Execution
- [ ] npm install
- [ ] Run benchmark against live CognoDB instance
- [ ] Generate results + charts
- [ ] Final review of README and analysis
