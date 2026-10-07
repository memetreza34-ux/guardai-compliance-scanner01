const test = require('node:test');
const assert = require('node:assert/strict');
const { createMonitoringService } = require('../services/monitoringService');

function createHarness({ monitorExists = true } = {}) {
  const calls = [];
  const organizationAuthorization = {
    async requireRole(organizationId, userId, role) {
      calls.push(['role', organizationId, userId, role]);
    },
  };
  const monitorRepository = {
    async getMonitor(organizationId, monitorId) {
      calls.push(['get', organizationId, monitorId]);
      return monitorExists ? {
        id: monitorId,
        organizationId,
        targetId: 'target-a',
        status: 'active',
      } : null;
    },
    async listMonitorRuns(input) {
      calls.push(['runs', input]);
      return [{
        id: 'run-a',
        organizationId: input.organizationId,
        monitorId: input.monitorId,
        scanId: 'scan-a',
      }];
    },
    async listMonitors(organizationId) {
      calls.push(['list', organizationId]);
      return [];
    },
    async createMonitor(input) {
      calls.push(['create', input]);
      return { id: 'monitor-a', ...input, status: 'active' };
    },
    async setStatus(input) {
      calls.push(['status', input]);
      return { id: input.monitorId, organizationId: input.organizationId, status: input.status };
    },
  };
  return {
    calls,
    service: createMonitoringService({ organizationAuthorization, monitorRepository }),
  };
}

test('monitor run history requires viewer membership and stays tenant scoped', async () => {
  const { calls, service } = createHarness();
  const runs = await service.runs({
    organizationId: 'org-a',
    userId: 'user-a',
    monitorId: 'monitor-a',
    limit: 20,
  });

  assert.equal(runs[0].scanId, 'scan-a');
  assert.deepEqual(calls[0], ['role', 'org-a', 'user-a', 'viewer']);
  assert.deepEqual(calls[1], ['get', 'org-a', 'monitor-a']);
  assert.deepEqual(calls[2], ['runs', {
    organizationId: 'org-a',
    monitorId: 'monitor-a',
    limit: 20,
  }]);
});

test('monitor run history returns 404 for another or missing workspace monitor', async () => {
  const { service } = createHarness({ monitorExists: false });
  await assert.rejects(
    () => service.runs({
      organizationId: 'org-a',
      userId: 'user-a',
      monitorId: 'monitor-missing',
      limit: 20,
    }),
    (error) => error.code === 'MONITOR_NOT_FOUND',
  );
});
