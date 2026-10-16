const test = require('node:test');
const assert = require('node:assert/strict');
const { createOrganizationAuthorizationService } = require('../services/organizationAuthorization');
const { createTargetService } = require('../services/targetService');
const { createTargetVerificationService } = require('../services/targetVerificationService');
const { createScanSubmissionService } = require('../domain/scanSubmission');
const { assertTargetVerified } = require('../domain/targetAuthorization');
const { assertTargetSupportsModules } = require('../domain/targetScanCompatibility');

function createTwoTenantHarness() {
  const memberships = [
    { organizationId: 'org-a', userId: 'owner-a', role: 'owner' },
    { organizationId: 'org-a', userId: 'admin-a', role: 'admin' },
    { organizationId: 'org-a', userId: 'member-a', role: 'member' },
    { organizationId: 'org-a', userId: 'viewer-a', role: 'viewer' },
    { organizationId: 'org-b', userId: 'owner-b', role: 'owner' },
  ];
  const targets = [];
  const challenges = new Map();
  const scans = [];
  const records = { targetReads: 0, targetWrites: 0, dnsWrites: 0, scanWrites: 0 };
  let publishedTxt = [];

  const organizationAuthorization = createOrganizationAuthorizationService({
    async getMembership(organizationId, userId) {
      return memberships.find(m => m.organizationId === organizationId && m.userId === userId) || null;
    },
  });

  const getTarget = async (organizationId, targetId) => {
    records.targetReads += 1;
    return targets.find(t => t.organizationId === organizationId && t.id === targetId) || null;
  };

  const targetService = createTargetService({
    organizationAuthorization,
    targetRepository: {
      async createWebsiteTarget(input) {
        records.targetWrites += 1;
        const target = {
          ...input,
          id: `target-${targets.length + 1}`,
          type: 'website',
          canonical_url: input.canonicalUrl,
          verificationState: 'unverified',
          verification_state: 'unverified',
        };
        targets.push(target);
        return target;
      },
      async getTarget(organizationId, targetId) {
        return getTarget(organizationId, targetId);
      },
      async listTargets(organizationId) {
        records.targetReads += 1;
        return targets.filter(t => t.organizationId === organizationId);
      },
    },
  });

  const targetVerification = createTargetVerificationService({
    organizationAuthorization,
    targetVerificationRepository: {
      getTarget,
      async createDnsChallenge(input) {
        records.dnsWrites += 1;
        const challenge = {
          id: `challenge-${records.dnsWrites}`,
          method: 'dns_txt',
          status: 'pending',
          tokenHash: input.tokenHash,
          dnsRecordName: input.dnsRecordName,
          expiresAt: new Date(Date.now() + 60_000).toISOString(),
          attemptCount: 0,
        };
        challenges.set(`${input.organizationId}:${input.targetId}`, challenge);
        return challenge;
      },
      async getPendingChallenge(organizationId, targetId) {
        return challenges.get(`${organizationId}:${targetId}`) || null;
      },
      async recordAttempt({ organizationId, targetId, challengeId, matched }) {
        const key = `${organizationId}:${targetId}`;
        const challenge = challenges.get(key);
        assert.equal(challenge.id, challengeId);
        const next = {
          ...challenge,
          status: matched ? 'verified' : 'pending',
          attemptCount: challenge.attemptCount + 1,
          lastCheckedAt: new Date().toISOString(),
        };
        challenges.set(key, next);
        if (matched) {
          const target = targets.find(t => t.organizationId === organizationId && t.id === targetId);
          target.verification_state = 'verified';
          target.verificationState = 'verified';
        }
        return next;
      },
    },
    resolveTxt: async () => publishedTxt,
  });

  const scanSubmission = createScanSubmissionService({
    organizationAuthorization,
    scanRepository: {
      async createQueuedScanWithJobs(input) {
        // Fake of the authoritative persistence boundary; not a real DB test.
        const target = targets.find(t => t.organizationId === input.organizationId && t.id === input.targetId);
        assertTargetVerified(target);
        assertTargetSupportsModules(target.type, input.requestedModules);
        records.scanWrites += 1;
        const scan = {
          id: `scan-${records.scanWrites}`,
          organizationId: input.organizationId,
          targetId: input.targetId,
          status: 'queued',
        };
        scans.push(scan);
        return { created: true, scan, jobs: [{ id: `job-${records.scanWrites}`, jobType: 'security', status: 'queued' }] };
      },
    },
    scannerVersion: 'core-journey-test',
    contractVersion: '0.3.0',
  });

  return {
    memberships, targets, challenges, scans, records,
    targetService, targetVerification, scanSubmission,
    setPublishedTxt(value) { publishedTxt = [[value]]; },
  };
}

function isHttpError(status) {
  return error => error.statusCode === status;
}

test('two organizations: foreign users cannot list, read, create, verify, or submit scans', async () => {
  const h = createTwoTenantHarness();
  const site = await h.targetService.createWebsite({
    organizationId: 'org-a', userId: 'owner-a', url: 'https://example.com',
  });
  const baseline = { ...h.records };
  const foreign = { organizationId: 'org-a', userId: 'owner-b', targetId: site.id };
  await assert.rejects(() => h.targetService.list(foreign), isHttpError(403));
  await assert.rejects(() => h.targetService.get(foreign), isHttpError(403));
  await assert.rejects(() => h.targetService.createWebsite({
    organizationId: 'org-a', userId: 'owner-b', url: 'example.net',
  }), isHttpError(403));
  await assert.rejects(() => h.targetVerification.startDnsChallenge(foreign), isHttpError(403));
  await assert.rejects(() => h.targetVerification.checkDnsChallenge(foreign), isHttpError(403));
  await assert.rejects(() => h.scanSubmission.submit({
    organizationId: 'org-a', targetId: site.id, requestedBy: 'owner-b', requestedModules: ['security'],
  }), isHttpError(403));

  assert.deepEqual(h.records, baseline, 'foreign calls must not even reach tenant repositories');
  assert.equal(h.scans.length, 0);
});

test('role checks: viewer has read-only access, member scans verified targets, admin handles DNS', async () => {
  const h = createTwoTenantHarness();
  const site = await h.targetService.createWebsite({
    organizationId: 'org-a', userId: 'owner-a', url: 'example.com',
  });
  assert.equal((await h.targetService.list({ organizationId: 'org-a', userId: 'viewer-a' })).length, 1);
  assert.equal((await h.targetService.get({ organizationId: 'org-a', targetId: site.id, userId: 'viewer-a' })).id, site.id);
  await assert.rejects(() => h.targetService.createWebsite({
    organizationId: 'org-a', userId: 'viewer-a', url: 'example.net',
  }), isHttpError(403));
  await assert.rejects(() => h.targetVerification.startDnsChallenge({
    organizationId: 'org-a', targetId: site.id, userId: 'member-a',
  }), isHttpError(403));
  await assert.rejects(() => h.scanSubmission.submit({
    organizationId: 'org-a', targetId: site.id, requestedBy: 'viewer-a', requestedModules: ['security'],
  }), isHttpError(403));
  await assert.rejects(() => h.scanSubmission.submit({
    organizationId: 'org-a', targetId: site.id, requestedBy: 'member-a', requestedModules: ['security'],
  }), error => error.code === 'TARGET_NOT_VERIFIED' && error.statusCode === 403);
  assert.equal(h.records.scanWrites, 0);
});

test('authorized DNS proof transitions a website to verified and permits a queued security scan', async () => {
  const h = createTwoTenantHarness();
  const site = await h.targetService.createWebsite({
    organizationId: 'org-a', userId: 'owner-a', url: 'https://example.com/path?q=x', displayName: 'Demo',
  });
  assert.equal(site.canonicalUrl, 'https://example.com/path');
  const issued = await h.targetVerification.startDnsChallenge({
    organizationId: 'org-a', targetId: site.id, userId: 'admin-a',
  });
  assert.equal(issued.status, 'pending');
  assert.match(issued.dnsRecordValue, /^guardai-verification=/);
  assert.notEqual(h.challenges.get(`org-a:${site.id}`).tokenHash, issued.dnsRecordValue);
  assert.equal(h.challenges.get(`org-a:${site.id}`).tokenHash.length, 64);

  h.setPublishedTxt('guardai-verification=wrong-token');
  const pending = await h.targetVerification.checkDnsChallenge({
    organizationId: 'org-a', targetId: site.id, userId: 'admin-a',
  });
  assert.equal(pending.verified, false);
  assert.equal(site.verification_state, 'unverified');

  h.setPublishedTxt(issued.dnsRecordValue);
  const verified = await h.targetVerification.checkDnsChallenge({
    organizationId: 'org-a', targetId: site.id, userId: 'admin-a',
  });
  assert.equal(verified.verified, true);
  assert.equal(verified.status, 'verified');
  assert.equal(site.verification_state, 'verified');
  assert.equal(verified.dnsRecordValue, undefined, 'DNS value is not reissued on check');

  const submission = await h.scanSubmission.submit({
    organizationId: 'org-a', targetId: site.id, requestedBy: 'member-a',
    requestedModules: ['security'], idempotencyKey: 'journey-idempotency-001',
  });
  assert.equal(submission.scan.status, 'queued');
  assert.equal(submission.scan.organizationId, 'org-a');
  assert.equal(submission.scan.targetId, site.id);
  assert.equal(h.records.scanWrites, 1);
});

test('role downgrade is enforced by a new server authorization read, not stale browser flags', async () => {
  const h = createTwoTenantHarness();
  const site = await h.targetService.createWebsite({
    organizationId: 'org-a', userId: 'owner-a', url: 'example.com',
  });
  h.memberships.find(m => m.organizationId === 'org-a' && m.userId === 'admin-a').role = 'viewer';
  await assert.rejects(() => h.targetVerification.startDnsChallenge({
    organizationId: 'org-a', targetId: site.id, userId: 'admin-a',
  }), isHttpError(403));
  await assert.rejects(() => h.targetService.createWebsite({
    organizationId: 'org-a', userId: 'admin-a', url: 'example.net',
  }), isHttpError(403));
  assert.equal(h.records.dnsWrites, 0);
});

test('wrong-org target ID cannot be scanned and the request cannot queue a job', async () => {
  const h = createTwoTenantHarness();
  const site = await h.targetService.createWebsite({
    organizationId: 'org-a', userId: 'owner-a', url: 'example.com',
  });
  await assert.rejects(() => h.scanSubmission.submit({
    organizationId: 'org-b', targetId: site.id, requestedBy: 'owner-b',
    requestedModules: ['security'],
  }), error => error.code === 'TARGET_NOT_VERIFIED' && error.statusCode === 403);
  assert.equal(h.records.scanWrites, 0);
});

test('unsupported scan modules remain unavailable even to an owner in a valid workspace', async () => {
  const h = createTwoTenantHarness();
  const site = await h.targetService.createWebsite({
    organizationId: 'org-a', userId: 'owner-a', url: 'example.com',
  });
  await assert.rejects(() => h.scanSubmission.submit({
    organizationId: 'org-a', targetId: site.id, requestedBy: 'owner-a',
    requestedModules: ['privacy'],
  }), error => error.code === 'SCAN_MODULE_NOT_AVAILABLE' && error.statusCode === 422);
  assert.equal(h.records.scanWrites, 0);
});
