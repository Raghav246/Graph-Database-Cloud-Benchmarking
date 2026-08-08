#!/usr/bin/env bash
# run-all.sh — one-command automation.
# 1. Generates the dataset (if missing)
# 2. Runs the benchmark against every configured platform
# 3. Emits JSON + CSV results into ./results
#
# Prereqs: node >= 18, npm install run once, docker compose for self-hosted DBs.
set -euo pipefail

cd "$(dirname "$0")/.."

echo "==> Installing dependencies"
npm install

echo "==> Generating dataset"
node src/dataset/generate.js

echo "==> Starting self-hosted databases (Docker) [optional]"
if command -v docker >/dev/null 2>&1; then
  docker compose -f docker/docker-compose.yml up -d || echo "WARN: docker compose failed — check Docker is running"
fi

echo "==> Running benchmarks"
node src/index.js --all

echo "==> Done. See ./results for JSON + CSV outputs."
