const test = require('node:test');
const assert = require('node:assert/strict');
const { resolveForecastJobStatus } = require('../src/services/forecastService');

test('status aktif selalu dilaporkan sebagai training', () => {
  assert.equal(resolveForecastJobStatus('completed', true), 'training');
});

test('status training yang tertinggal setelah restart menjadi failed', () => {
  assert.equal(resolveForecastJobStatus('training', false), 'failed');
});

test('status cache normal dipertahankan dan cache kosong menjadi idle', () => {
  assert.equal(resolveForecastJobStatus('completed', false), 'completed');
  assert.equal(resolveForecastJobStatus(undefined, false), 'idle');
});
