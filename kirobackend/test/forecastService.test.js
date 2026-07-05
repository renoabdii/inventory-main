const test = require('node:test');
const assert = require('node:assert/strict');
const {
  resolveForecastJobStatus,
  shouldPreserveLstmCache,
} = require('../src/services/forecastService');

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

test('cache LSTM lama dipertahankan saat TensorFlow tidak tersedia di server', () => {
  const cache = {
    data: [{ method: 'lstm' }],
    stats: { method: 'lstm', lstmStatus: 'completed' },
  };

  const result = {
    stats: { method: 'moving_average', lstmStatus: 'unavailable' },
  };

  assert.equal(shouldPreserveLstmCache(cache, result), true);
});

test('fallback moving average boleh disimpan jika cache lama bukan LSTM', () => {
  const cache = {
    data: [{ method: 'moving_average' }],
    stats: { method: 'moving_average', lstmStatus: 'unavailable' },
  };

  const result = {
    stats: { method: 'moving_average', lstmStatus: 'unavailable' },
  };

  assert.equal(shouldPreserveLstmCache(cache, result), false);
});
