const test = require('node:test');
const assert = require('node:assert/strict');
const { processOneSecurityJob } = require('../workers/securityWorker');
const { startLeaseHeartbeat } = require('../workers/leaseHeartbeat');

function makeWorker({ claimed = true, executionError = null, assessmentError = null, heartbeatError = null, retryScheduled = false } = {}) {
  const actions = [];
  const job = { id: 'job-a', scanId: 'scan-a' };
  const repository = {
    async claimNextJob(input) {
      actions.push(['claim', input]);
      return claimed ? job : null;
    },
    async getExecutionContext(input) {
      actions.push(['context', input]);
      if (executionError) throw executionError;
      return { jobType: 'security', targetType: 'website', targetUrl: 'https://example.com' };
    },
    async completeJob(input) {
      actions.push(['complete', input]);
      return { scanCompleted: true };
    },
  };
  const failureService = {
    async fail(input) {
      actions.push(['fail', input]);
      return { retryScheduled };
    },
  };
  const startHeartbeat = input => {
    actions.push(['startHeartbeat', input]);
    return {
      async stop() {
        actions.push(['stopHeartbeat']);
        return heartbeatError;
      },
      getError() { return heartbeatError; },
    };
  };
  const executeAssessment = async context => {
    actions.push(['assessment', context]);
    if (assessmentError) throw assessmentError;
    return { detectorId: 'security-headers', state: 'completed', score: 80 };
  };

  return {
    actions,
    run: () => processOneSecurityJob({
      jobRepository: repository,
      jobFailureService: failureService,
      workerId: 'security:worker-1',
      leaseSeconds: 60,
      executeAssessment,
      startHeartbeat,
    }),
  };
}

test('idle poll does not start heartbeat, fetch Target or write results', async () => {
  const h = makeWorker({ claimed: false });
  assert.deepEqual(await h.run(), { state: 'idle' });
  assert.deepEqual(h.actions.map(entry => entry[0]), ['claim']);
});

test('successful Security assessment stops heartbeat before completing', async () => {
  const h = makeWorker();
  const result = await h.run();
  assert.equal(result.state, 'completed');
  assert.equal(result.jobId, 'job-a');
  assert.deepEqual(h.actions.map(entry => entry[0]),
    ['claim', 'startHeartbeat', 'context', 'assessment', 'stopHeartbeat', 'complete']);
  assert.equal(h.actions[1][1].jobId, 'job-a');
  assert.equal(h.actions[1][1].workerId, 'security:worker-1');
  assert.equal(h.actions[1][1].leaseSeconds, 60);
  assert.equal(h.actions[1][1].jobRepository !== undefined, true);
  assert.equal(h.actions.some(entry => entry[0] === 'fail'), false);
});

test('regular assessment error stops heartbeat then records a retryable failure', async () => {
  const originalError = Object.assign(new Error('HTTP timeout'), { code: 'TARGET_FETCH_FAILED' });
  const h = makeWorker({ assessmentError: originalError, retryScheduled: true });
  const result = await h.run();
  assert.equal(result.state, 'retrying');
  assert.deepEqual(h.actions.map(entry => entry[0]),
    ['claim', 'startHeartbeat', 'context', 'assessment', 'stopHeartbeat', 'fail']);
  assert.equal(h.actions.at(-1)[1].error, originalError);
});

test('if context loading fails, heartbeat is stopped before the failure write', async () => {
  const h = makeWorker({ executionError: new Error('target unavailable') });
  const result = await h.run();
  assert.equal(result.state, 'failed');
  assert.deepEqual(h.actions.map(entry => entry[0]),
    ['claim', 'startHeartbeat', 'context', 'stopHeartbeat', 'fail']);
});

test('lost lease prevents both completion and failure writes even if assessment succeeds', async () => {
  const leaseLost = Object.assign(new Error('Lease already claimed by a different worker'), {
    code: 'JOB_LEASE_LOST',
    statusCode: 409,
  });
  const h = makeWorker({ heartbeatError: leaseLost });
  await assert.rejects(() => h.run(), error => error === leaseLost);
  assert.deepEqual(h.actions.map(entry => entry[0]),
    ['claim', 'startHeartbeat', 'context', 'assessment', 'stopHeartbeat']);
});

test('lost lease takes precedence over normal scanner error and cannot mark another owner failed', async () => {
  const scannerFailure = new Error('Scanner failed after lease was lost');
  const leaseLost = Object.assign(new Error('Lease lost'), { code: 'JOB_LEASE_LOST' });
  const h = makeWorker({ heartbeatError: leaseLost, assessmentError: scannerFailure });
  await assert.rejects(() => h.run(), error => error === leaseLost);
  assert.equal(h.actions.some(entry => entry[0] === 'complete' || entry[0] === 'fail'), false);
});

async function waitFor(predicate) {
  for (let attempt = 0; attempt < 40; attempt++) {
    if (predicate()) return;
    await Promise.resolve();
  }
  assert.fail('Heartbeat did not advance as expected');
}

test('shared heartbeat renews a long operation and stop aborts future timers', async () => {
  const renewals = [];
  const intervals = [];
  let sleeps = 0;
  const heartbeat = startLeaseHeartbeat({
    jobRepository: {
      async renewLease(input) { renewals.push(input); },
    },
    jobId: 'job-long',
    workerId: 'security:worker-1',
    leaseSeconds: 60,
    sleep: (ms, unused, { signal }) => {
      intervals.push(ms);
      sleeps += 1;
      if (sleeps === 1) return Promise.resolve();
      return new Promise((resolve, reject) => {
        if (signal.aborted) {
          const error = new Error('aborted'); error.name = 'AbortError'; reject(error); return;
        }
        signal.addEventListener('abort', () => {
          const error = new Error('aborted'); error.name = 'AbortError'; reject(error);
        }, { once: true });
      });
    },
  });
  await waitFor(() => renewals.length === 1 && sleeps >= 2);
  assert.deepEqual(renewals, [{ jobId: 'job-long', workerId: 'security:worker-1', leaseSeconds: 60 }]);
  assert.equal(intervals[0], 20000);
  assert.equal(await heartbeat.stop(), null);
  assert.equal(renewals.length, 1);
});

test('shared heartbeat reports renewal failure instead of assuming it still owns the lease', async () => {
  const lost = Object.assign(new Error('Lease expired'), { code: 'JOB_LEASE_LOST' });
  let attempted = false;
  const heartbeat = startLeaseHeartbeat({
    jobRepository: {
      async renewLease() { attempted = true; throw lost; },
    },
    jobId: 'job-a',
    workerId: 'security:worker-1',
    leaseSeconds: 60,
    sleep: async () => {},
  });
  await waitFor(() => attempted && heartbeat.getError() === lost);
  assert.equal(await heartbeat.stop(), lost);
});

test('shared heartbeat stop waits for an in-flight renewal to settle', async () => {
  let settleRenewal;
  let renewalStarted = false;
  const renewPromise = new Promise(resolve => { settleRenewal = resolve; });
  const heartbeat = startLeaseHeartbeat({
    jobRepository: {
      async renewLease() { renewalStarted = true; await renewPromise; },
    },
    jobId: 'job-a',
    workerId: 'security:worker-1',
    leaseSeconds: 60,
    sleep: async () => {},
  });
  await waitFor(() => renewalStarted);
  let stopped = false;
  const stopping = heartbeat.stop().then(() => { stopped = true; });
  await Promise.resolve();
  assert.equal(stopped, false);
  settleRenewal();
  await stopping;
  assert.equal(stopped, true);
});
