const { HttpError } = require('../lib/httpError');
const { buildSecurityAssessment } = require('../scanners/securityHeaders');
const { getSecurityRuleForFinding } = require('../scanners/securityRuleRegistry');
const { safeGetWithMetadata } = require('../services/safeFetch');
const { startLeaseHeartbeat } = require('./leaseHeartbeat');

const SECURITY_JOB_TYPE = 'security';

async function executeSecurityJob(context) {
  if (context.jobType !== SECURITY_JOB_TYPE) {
    throw new HttpError(500, 'Security worker received the wrong job type.', 'WORKER_JOB_TYPE_MISMATCH');
  }
  if (context.targetType !== 'website') {
    throw new HttpError(500, 'Security worker requires a website target.', 'WORKER_TARGET_TYPE_MISMATCH');
  }
  if (typeof context.targetUrl !== 'string' || context.targetUrl.length === 0) {
    throw new HttpError(422, 'Verified website target has no canonical URL.', 'TARGET_URL_MISSING');
  }

  const { response, finalUrl } = await safeGetWithMetadata(context.targetUrl, {
    headers: {
      'User-Agent': 'GuardAI-Security-Worker/0.1',
      Accept: 'text/html,application/xhtml+xml,*/*;q=0.5',
    },
  });

  const html = typeof response.data === 'string' ? response.data : null;
  const security = buildSecurityAssessment(response.headers, finalUrl, html);
  const issues = security.category.issues.map((issue) => {
    const rule = getSecurityRuleForFinding(issue.id);
    return {
      ...issue,
      ruleId: rule.id,
      ruleVersion: rule.version,
      ruleDefinitionHash: rule.definitionHash,
    };
  });

  return {
    detectorId: security.detectorId,
    detectorVersion: security.detectorVersion,
    evidenceType: 'website-security-baseline',
    source: finalUrl,
    normalizedData: security.evidence,
    score: security.category.score,
    issues,
    notices: [
      'Security result is an automated technical screening of the observed HTTP response and document, not a penetration test or proof that no vulnerabilities exist.',
    ],
  };
}

async function processOneSecurityJob({
  jobRepository,
  jobFailureService,
  workerId,
  leaseSeconds = 60,
  executeAssessment = executeSecurityJob,
}) {
  if (!jobRepository) {
    throw new TypeError('Security worker requires a job repository.');
  }
  if (!jobFailureService || typeof jobFailureService.fail !== 'function') {
    throw new TypeError('Security worker requires a job failure service.');
  }

  const job = await jobRepository.claimNextJob({
    workerId,
    jobTypes: [SECURITY_JOB_TYPE],
    leaseSeconds,
  });

  if (!job) {
    return { state: 'idle' };
  }

  const heartbeat = startLeaseHeartbeat({
    jobRepository,
    jobId: job.id,
    workerId,
    leaseSeconds,
  });
  let heartbeatStopped = false;

  async function stopHeartbeat() {
    if (heartbeatStopped) return heartbeat.getError();
    heartbeatStopped = true;
    return heartbeat.stop();
  }

  try {
    const context = await jobRepository.getExecutionContext({
      jobId: job.id,
      workerId,
    });
    const assessment = await executeAssessment(context);

    // Stop and await any in-flight renewal before attempting the result write.
    // If renewal failed, ownership is uncertain: another worker may have
    // reclaimed this job, so do not commit or mutate its failure status.
    const heartbeatError = await stopHeartbeat();
    if (heartbeatError) throw heartbeatError;

    const completion = await jobRepository.completeJob({
      jobId: job.id,
      workerId,
      assessment,
    });

    return {
      state: 'completed',
      jobId: job.id,
      scanId: job.scanId,
      completion,
    };
  } catch (error) {
    const heartbeatError = await stopHeartbeat();
    if (heartbeatError) {
      // Leave the lease to expire and be safely reclaimed or terminalized.
      // Never record a failure for a job that might belong to another worker.
      throw heartbeatError;
    }

    const failure = await jobFailureService.fail({
      jobId: job.id,
      workerId,
      error,
    });

    return {
      state: failure.retryScheduled ? 'retrying' : 'failed',
      jobId: job.id,
      scanId: job.scanId,
      failure,
    };
  } finally {
    await stopHeartbeat();
  }
}

module.exports = {
  executeSecurityJob,
  processOneSecurityJob,
  SECURITY_JOB_TYPE,
};
