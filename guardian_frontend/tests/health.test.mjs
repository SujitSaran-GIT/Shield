import test from 'node:test';
import assert from 'node:assert/strict';
import { metricValue, formatBytes, formatPercentage, formatUptime } from '../src/features/health/metrics.ts';

test('health metrics distinguish unavailable readings from measured zero', () => {
  const metrics = {
    'system.cpu.usage': { measurements: [{ statistic: 'VALUE', value: 0 }] },
    'jvm.memory.max': { measurements: [{ statistic: 'VALUE', value: -1 }] },
    invalid: { measurements: [{ statistic: 'VALUE', value: Number.NaN }] },
  };
  assert.equal(metricValue(metrics, 'system.cpu.usage'), 0);
  assert.equal(metricValue(metrics, 'jvm.memory.max'), null);
  assert.equal(metricValue(metrics, 'invalid'), null);
  assert.equal(metricValue(metrics, 'missing'), null);
  assert.equal(metricValue(null, 'system.cpu.usage'), null);
  assert.equal(formatPercentage(0), '0.0%');
  assert.equal(formatPercentage(2), 'Unavailable');
  assert.equal(formatBytes(0), '0 B');
  assert.equal(formatBytes(-1), 'Unavailable');
});

test('HTTP request counts use COUNT rather than elapsed request duration', () => {
  const metrics = { 'http.server.requests': { measurements: [
    { statistic: 'TOTAL_TIME', value: 123.4 },
    { statistic: 'COUNT', value: 12 },
  ] } };
  assert.equal(metricValue(metrics, 'http.server.requests', 'COUNT'), 12);
  assert.equal(metricValue(metrics, 'http.server.requests'), null);
  assert.equal(formatBytes(1024), '1.0 KiB');
  assert.equal(formatUptime(90061), '1d 1h 1m');
});
