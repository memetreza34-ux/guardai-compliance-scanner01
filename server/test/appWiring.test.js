const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../app');

test('Express app can be constructed with every mounted route defined', () => {
  assert.doesNotThrow(() => createApp());
});
