const test = require('node:test');
const assert = require('node:assert/strict');
const { monitorStorageError } = require('../repositories/monitorRepository');
const { notificationStorageError } = require('../repositories/notificationRepository');

test('missing Monitoring tables map to a stable readiness error', () => {
  const mapped = monitorStorageError({ code: '42P01' });
  assert.equal(mapped.statusCode, 503);
  assert.equal(mapped.code, 'MONITORING_STORAGE_NOT_READY');
});

test('missing Notification tables map to a stable readiness error', () => {
  const mapped = notificationStorageError({ code: '42P01' });
  assert.equal(mapped.statusCode, 503);
  assert.equal(mapped.code, 'NOTIFICATION_STORAGE_NOT_READY');
});
