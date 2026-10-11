const test = require('node:test');
const assert = require('node:assert/strict');
const { createTargetVerificationService } = require('../services/targetVerificationService');
const { createTargetVerificationRepository } = require('../repositories/targetVerificationRepository');
const { sha256Hex } = require('../lib/evidenceIntegrity');

function verificationHarness({ targetType = 'website', targetState = 'pending', dnsError = null } = {}) {
  const calls = [];
  let role = 'admin';
  let pending = {
    id: 'challenge-a',
    organizationId: 'org-a',
    targetId: 'target-a',
    status: 'pending',
    method: 'dns_txt',
    tokenHash: sha256Hex('known-token'),
    dnsRecordName: '_guardai-challenge.example.com',
    attemptCount: 0,
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
  };
  const service = createTargetVerificationService({
    organizationAuthorization: {
      async requireRole(orgId, userId, minimumRole) {
        calls.push(['authorization', orgId, userId, minimumRole, role]);
        if (orgId !== 'org-a' || userId !== 'admin-a' || role !== 'admin') {
          const error = new Error('Forbidden');
          error.statusCode = 403;
          throw error;
        }
      },
    },
    targetVerificationRepository: {
      async getTarget(orgId, targetId) {
        calls.push(['getTarget', orgId, targetId]);
        return { id: targetId, organization_id: orgId, type: targetType,
          canonical_url: 'https://example.com/', verification_state: targetState };
      },
      async getPendingChallenge() {
        calls.push(['getPendingChallenge']);
        return pending;
      },
      async recordAttempt(input) {
        calls.push(['recordAttempt', input]);
        pending = { ...pending, status: input.matched ? 'verified' : 'pending', attemptCount: 1 };
        return pending;
      },
    },
    async resolveTxt(name) {
      calls.push(['resolveTxt', name]);
      if (dnsError) throw dnsError;
      return [['guardai-verification=known-token']];
    },
  });
  return {
    calls, service,
    setRole(value) { role = value; },
    setTargetType(value) { targetType = value; },
  };
}

const args = { organizationId: 'org-a', targetId: 'target-a', userId: 'admin-a' };

test('nonwebsite repository/asset targets cannot use DNS check, even if marked verified', async () => {
  for (const targetType of ['asset', 'repository']) {
    for (const targetState of ['pending', 'verified']) {
      const h = verificationHarness({ targetType, targetState });
      await assert.rejects(
        () => h.service.checkDnsChallenge(args),
        error => error.statusCode === 400 && error.code === 'VERIFICATION_METHOD_UNSUPPORTED',
      );
      assert.equal(h.calls.some(call => call[0] === 'getPendingChallenge'), false);
      assert.equal(h.calls.some(call => call[0] === 'resolveTxt'), false);
      assert.equal(h.calls.some(call => call[0] === 'recordAttempt'), false);
    }
  }
});

test('verified website reports ownership without reading or reissuing a DNS token', async () => {
  const h = verificationHarness({ targetState: 'verified' });
  const result = await h.service.checkDnsChallenge(args);
  assert.deepEqual(result, { status: 'verified', verified: true, alreadyVerified: true });
  assert.equal(h.calls.some(call => call[0] === 'resolveTxt'), false);
});

test('DNS TXT resolution that ends after Admin role revocation cannot record a verification attempt', async () => {
  const h = verificationHarness();
  // DNS has not been resolved yet. Make the role change during the awaited
  // external operation, not before the first authorization gate.
  const original = h.service;
  const deferredCalls = [];
  let resolveDns;
  const pendingDns = new Promise(resolve => { resolveDns = resolve; });
  let membership = 'admin';
  const deferredService = createTargetVerificationService({
    organizationAuthorization: {
      async requireRole(orgId, userId, minRole) {
        deferredCalls.push(['authorization', orgId, userId, minRole, membership]);
        if (membership !== 'admin') {
          const error = new Error('Permission revoked'); error.statusCode = 403; throw error;
        }
      },
    },
    targetVerificationRepository: {
      async getTarget() {
        deferredCalls.push(['getTarget']);
        return { type: 'website', verification_state: 'pending' };
      },
      async getPendingChallenge() {
        deferredCalls.push(['getPendingChallenge']);
        return { id: 'challenge-a', dnsRecordName: '_guardai-challenge.example.com',
          tokenHash: sha256Hex('known-token') };
      },
      async recordAttempt() { deferredCalls.push(['recordAttempt']); throw new Error('Must never write after role revocation'); },
    },
    resolveTxt: async () => { deferredCalls.push(['resolveTxt']); return pendingDns; },
  });
  const result = deferredService.checkDnsChallenge(args);
  // Resolve the pending DNS operation only after it has started and role has changed.
  for (let i = 0; i < 10 && !deferredCalls.some(call => call[0] === 'resolveTxt'); i++) {
    await Promise.resolve();
  }
  assert.equal(deferredCalls.some(call => call[0] === 'resolveTxt'), true);
  membership = 'viewer';
  resolveDns([['guardai-verification=known-token']]);
  await assert.rejects(result, error => error.statusCode === 403);
  assert.equal(deferredCalls.some(call => call[0] === 'recordAttempt'), false);
  assert.equal(deferredCalls.filter(call => call[0] === 'authorization').length, 2);
  assert.equal(original !== undefined, true);
});

test('successful DNS check reauthorizes after TXT lookup, and does not reissue the plaintext token', async () => {
  const h = verificationHarness();
  const result = await h.service.checkDnsChallenge(args);
  assert.equal(result.status, 'verified');
  assert.equal(result.verified, true);
  assert.equal(result.dnsRecordValue, undefined);
  assert.equal(result.tokenHash, undefined);
  const roles = h.calls.filter(call => call[0] === 'authorization');
  assert.equal(roles.length, 2);
  assert.equal(roles[0][3], 'admin');
  assert.equal(roles[1][3], 'admin');
  const recorded = h.calls.find(call => call[0] === 'recordAttempt');
  assert.equal(recorded[1].organizationId, 'org-a');
  assert.equal(recorded[1].targetId, 'target-a');
  assert.equal(recorded[1].matched, true);
});

test('DNS lookup unavailable returns 502 and never writes a verification attempt', async () => {
  const h = verificationHarness({ dnsError: Object.assign(new Error('timeout'), { code: 'ETIMEOUT' }) });
  await assert.rejects(
    () => h.service.checkDnsChallenge(args),
    error => error.statusCode === 502 && error.code === 'DNS_VERIFICATION_LOOKUP_FAILED',
  );
  assert.equal(h.calls.some(call => call[0] === 'recordAttempt'), false);
});

function transactionHarness({ targetType = 'asset', found = true } = {}) {
  const statements = [];
  const client = {
    async query(sql, params) {
      statements.push({ sql, params });
      if (sql === 'begin' || sql === 'commit' || sql === 'rollback') {
        return { rowCount: 0, rows: [] };
      }
      if (sql.includes('from public.targets') && sql.includes('for update')) {
        return found
          ? { rowCount: 1, rows: [{ id: 'target-a', type: targetType, verification_state: 'unverified' }] }
          : { rowCount: 0, rows: [] };
      }
      throw new Error('Unexpected write after target preflight: ' + sql.slice(0, 100));
    },
    release() { statements.push({ sql: 'release' }); },
  };
  const pool = {
    connect: async () => client,
    query: async () => { throw new Error('Unexpected query outside locked transaction'); },
  };
  return { repo: createTargetVerificationRepository(pool), statements };
}

const challengeArgs = {
  organizationId: 'org-a', targetId: 'target-a', createdBy: 'admin-a',
  tokenHash: 'a'.repeat(64), dnsRecordName: '_guardai-challenge.example.com', ttlMinutes: 30,
};

test('locked createDnsChallenge transaction rejects changed nonwebsite Target type before SQL writes', async () => {
  for (const targetType of ['repository', 'asset']) {
    const h = transactionHarness({ targetType });
    await assert.rejects(
      () => h.repo.createDnsChallenge(challengeArgs),
      error => error.statusCode === 400 && error.code === 'VERIFICATION_METHOD_UNSUPPORTED',
    );
    assert.equal(h.statements.some(entry => entry.sql === 'rollback'), true);
    assert.equal(h.statements.some(entry => entry.sql.includes('insert into public.target_verification_challenges')), false);
    assert.equal(h.statements.some(entry => entry.sql.includes('update public.targets')), false);
    assert.equal(h.statements.at(-1).sql, 'release');
  }
});

test('locked createDnsChallenge transaction denies a Target missing from the requested Organization', async () => {
  const h = transactionHarness({ found: false });
  await assert.rejects(
    () => h.repo.createDnsChallenge(challengeArgs),
    error => error.statusCode === 404 && error.code === 'TARGET_NOT_FOUND',
  );
  assert.equal(h.statements.some(entry => entry.sql === 'rollback'), true);
  assert.equal(h.statements.some(entry => entry.sql.includes('insert into public.target_verification_challenges')), false);
});
