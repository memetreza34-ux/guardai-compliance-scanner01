const test = require('node:test');
const assert = require('node:assert/strict');
const {
  CATALOG_VERSION,
  PLAN_CATALOG,
  getPlan,
  getPublicPlans,
} = require('../domain/planCatalog');

test('plan catalog declares versioned, non-empty canonical plans', () => {
  assert.equal(typeof CATALOG_VERSION, 'string');
  assert.ok(CATALOG_VERSION.length > 0);
  assert.ok(PLAN_CATALOG.free);
  assert.ok(PLAN_CATALOG.starter);
  assert.ok(PLAN_CATALOG.growth);
  assert.ok(PLAN_CATALOG.business);
});

test('getPlan retrieves plan definitions case-insensitively', () => {
  assert.equal(getPlan('free')?.name, 'Free');
  assert.equal(getPlan('FREE')?.name, 'Free');
  assert.equal(getPlan('Starter')?.name, 'Starter');
  assert.equal(getPlan('unknown-plan'), null);
  assert.equal(getPlan(null), null);
});

test('free plan defines explicit, bounded quotas', () => {
  const free = getPlan('free');
  assert.equal(free.quotas.website_targets, 1);
  assert.equal(free.quotas.seats, 1);
  assert.equal(free.quotas.security_scan, 50);
  assert.equal(free.quotas.monitor_schedules, 0);
  assert.deepEqual(free.capabilities, ['security']);
});

test('paid plans provide scaled quotas and capabilities', () => {
  const starter = getPlan('starter');
  const growth = getPlan('growth');
  const business = getPlan('business');

  assert.ok(starter.quotas.security_scan > freeSecurityScanQuota());
  assert.ok(growth.quotas.security_scan > starter.quotas.security_scan);
  assert.equal(business.quotas.security_scan, null); // custom / unconstrained contract

  function freeSecurityScanQuota() {
    return getPlan('free').quotas.security_scan;
  }
});

test('getPublicPlans formats public payload with features and quotas', () => {
  const publicPlans = getPublicPlans();
  assert.equal(publicPlans.length, 4);

  const [freePlan] = publicPlans;
  assert.equal(freePlan.code, 'free');
  assert.equal(freePlan.name, 'Free');
  assert.equal(freePlan.price, '0 €');
  assert.ok(Array.isArray(freePlan.features));
  assert.ok(freePlan.features.length >= 3);
  assert.equal(typeof freePlan.quotas, 'object');
  assert.equal(freePlan.quotas.website_targets, 1);
});
