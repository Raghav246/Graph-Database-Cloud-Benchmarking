/**
 * stats.js — Statistical utilities for benchmark metrics
 */
export class StatsCollector {
  constructor() {
    this.values = [];
  }

  add(value) {
    this.values.push(value);
  }

  clear() {
    this.values = [];
  }

  get count() {
    return this.values.length;
  }

  sorted() {
    return [...this.values].sort((a, b) => a - b);
  }

  /** Arithmetic mean */
  mean() {
    if (this.values.length === 0) return 0;
    const sum = this.values.reduce((a, b) => a + b, 0);
    return sum / this.values.length;
  }

  /** P-th percentile (0-100) using linear interpolation */
  percentile(p) {
    const sorted = this.sorted();
    const n = sorted.length;
    if (n === 0) return 0;
    if (n === 1) return sorted[0];
    const rank = (p / 100) * (n - 1);
    const lower = Math.floor(rank);
    const upper = Math.ceil(rank);
    if (lower === upper) return sorted[lower];
    const frac = rank - lower;
    return sorted[lower] + frac * (sorted[upper] - sorted[lower]);
  }

  p50() {
    return this.percentile(50);
  }

  p95() {
    return this.percentile(95);
  }

  min() {
    return this.values.length > 0 ? Math.min(...this.values) : 0;
  }

  max() {
    return this.values.length > 0 ? Math.max(...this.values) : 0;
  }

  /** Produce the standard metric report object */
  report() {
    return {
      count: this.count,
      mean: +this.mean().toFixed(3),
      p50: +this.p50().toFixed(3),
      p95: +this.p95().toFixed(3),
      min: +this.min().toFixed(3),
      max: +this.max().toFixed(3),
    };
  }
}

/**
 * Throughput tracker: records items processed over wall-clock time.
 */
export class ThroughputTracker {
  constructor() {
    this.startTime = null;
    this.totalItems = 0;
  }

  start() {
    this.startTime = performance.now();
    this.totalItems = 0;
    return this;
  }

  addItems(count) {
    this.totalItems += count;
  }

  stop() {
    const elapsedMs = performance.now() - this.startTime;
    const elapsedS = elapsedMs / 1000;
    const throughput = elapsedS > 0 ? this.totalItems / elapsedS : 0;
    return {
      totalItems: this.totalItems,
      elapsedMs: +elapsedMs.toFixed(2),
      elapsedSec: +elapsedS.toFixed(3),
      throughputPerSec: +throughput.toFixed(2),
      throughputPerMin: +(throughput * 60).toFixed(2),
    };
  }
}
