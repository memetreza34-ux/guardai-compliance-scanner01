const { HttpError } = require('../lib/httpError');
const { buildFindingRetestJobPayload } = require('../domain/findingRetest');
const {
  normalizeFindingStatus,
  normalizeFindingTransition,
} = require('../domain/findingLifecycle');

function createFindingService({ findingRepository, organizationAuthorization, scanSubmission = null }) {
  if (!findingRepository) {
    throw new TypeError('Finding service requires a Finding repository.');
  }
  if (!organizationAuthorization || typeof organizationAuthorization.requireRole !== 'function') {
    throw new TypeError('Finding service requires organization authorization.');
  }

  async function list({ organizationId, userId, status, targetId, limit, cursor }) {
    await organizationAuthorization.requireRole(organizationId, userId, 'viewer');
    const normalizedStatus = status ? normalizeFindingStatus(status) : null;
    return findingRepository.listFindings({
      organizationId,
      status: normalizedStatus,
      targetId: targetId || null,
      limit,
      cursor,
    });
  }

  async function get({ organizationId, userId, findingId }) {
    await organizationAuthorization.requireRole(organizationId, userId, 'viewer');
    const finding = await findingRepository.getFinding(organizationId, findingId);
    if (!finding) {
      throw new HttpError(404, 'Finding was not found in this organization.', 'FINDING_NOT_FOUND');
    }
    return finding;
  }

  async function updateStatus({ organizationId, userId, findingId, status, reason }) {
    // Do not read a Finding or run status-dependent validation before proving
    // the caller can mutate within this organization. Accepting risk always
    // requires an Admin; all other changes require at least a Member.
    const initialRole = status === 'accepted_risk' ? 'admin' : 'member';
    await organizationAuthorization.requireRole(organizationId, userId, initialRole);

    const current = await findingRepository.getFinding(organizationId, findingId);
    if (!current) {
      throw new HttpError(404, 'Finding was not found in this organization.', 'FINDING_NOT_FOUND');
    }

    const transition = normalizeFindingTransition({
      currentStatus: current.status,
      nextStatus: status,
      reason,
    });
    const requiredRole = transition.minimumRole === 'viewer' ? 'member' : transition.minimumRole;
    // Leaving an accepted-risk state needs Admin authorization too. Keep this
    // check independent of frontend button visibility or supplied role claims.
    // Revalidate the current role even when it matches the initial role:
    // membership may have been revoked while getFinding() was awaiting IO.
    await organizationAuthorization.requireRole(organizationId, userId, requiredRole);

    return findingRepository.transitionStatus({
      organizationId,
      findingId,
      expectedCurrentStatus: current.status,
      nextStatus: transition.nextStatus,
      reason: transition.reason,
      actorId: userId,
    });
  }

  async function requestRetest({
    organizationId,
    userId,
    findingId,
    idempotencyKey = null,
  }) {
    await organizationAuthorization.requireRole(organizationId, userId, 'member');

    const finding = await findingRepository.getFinding(organizationId, findingId);
    if (!finding) {
      throw new HttpError(404, 'Finding was not found in this organization.', 'FINDING_NOT_FOUND');
    }
    if (finding.status === 'accepted_risk') {
      throw new HttpError(
        409,
        'Withdraw accepted risk before requesting a verification re-test.',
        'FINDING_RETEST_ACCEPTED_RISK_BLOCKED',
      );
    }
    if (!finding.ruleId?.startsWith('security.') || !finding.latestDetectorId) {
      throw new HttpError(
        422,
        'This Finding does not currently support automated verification re-tests.',
        'FINDING_RETEST_NOT_SUPPORTED',
      );
    }
    if (!scanSubmission || typeof scanSubmission.submit !== 'function') {
      throw new HttpError(
        503,
        'Finding re-test service is not available.',
        'FINDING_RETEST_SERVICE_UNAVAILABLE',
      );
    }

    // A membership downgrade during the awaited Finding read must not queue
    // a verification scan using an earlier permission result.
    await organizationAuthorization.requireRole(organizationId, userId, 'member');

    return scanSubmission.submit({
      organizationId,
      targetId: finding.targetId,
      requestedBy: userId,
      requestedModules: ['security'],
      idempotencyKey,
      jobPayloadByModule: {
        security: buildFindingRetestJobPayload(finding),
      },
    });
  }

  async function history({ organizationId, userId, findingId, limit, cursor }) {
    await organizationAuthorization.requireRole(organizationId, userId, 'viewer');
    const finding = await findingRepository.getFinding(organizationId, findingId);
    if (!finding) {
      throw new HttpError(404, 'Finding was not found in this organization.', 'FINDING_NOT_FOUND');
    }
    return findingRepository.listStatusHistory({
      organizationId,
      findingId,
      limit,
      cursor,
    });
  }

  return {
    get,
    history,
    list,
    requestRetest,
    updateStatus,
  };
}

module.exports = { createFindingService };
