#!/usr/bin/env bash
# run-cognodb.sh — run the benchmark against only CognoDB Cloud.
# Requires .env with COGNODB_URI + COGNODB_PASSWORD set.
set -euo pipefail

cd "$(dirname "$0")/.."

echo "==> Installing dependencies"
npm install

echo "==> Generating dataset"
node src/dataset/generate.js

echo "==> Running CognoDB benchmark"
node src/index.js --db cognodb

echo "==> Done. See ./results for outputs."
