const { HttpError } = require('../lib/httpError');
const { normalizeRiskState } = require('../domain/risk');
const { getControl } = require('../governance/controlFrameworkRegistry');

function createRiskService({
  riskRepository,
  organizationAuthorization,
  membershipRepository,
}) {
  if (!riskRepository) throw new TypeError('Risk service requires a Risk repository.');
  if (!organizationAuthorization || typeof organizationAuthorization.requireRole !== 'function') {
    throw new TypeError('Risk service requires organization authorization.');
  }
  if (!membershipRepository || typeof membershipRepository.getMembership !== 'function') {
    throw new TypeError('Risk service requires a Membership repository.');
  }

  function validateControls(controlIds) {
    for (const controlId of controlIds) getControl(controlId);
  }

  async function validateOwner(organizationId, ownerUserId) {
    if (!ownerUserId) return;
    const membership = await membershipRepository.getMembership(organizationId, ownerUserId);
    if (!membership) {
      throw new HttpError(
        400,
        'Risk owner must be a member of this organization.',
        'RISK_OWNER_NOT_MEMBER',
      );
    }
  }

  async function list({ organizationId, userId }) {
    await organizationAuthorization.requireRole(organizationId, userId, 'viewer');
    return riskRepository.listRisks(organizationId);
  }

  async function get({ organizationId, userId, riskId }) {
    await organizationAuthorization.requireRole(organizationId, userId, 'viewer');
    const risk = await riskRepository.getRisk(organizationId, riskId);
    if (!risk) throw new HttpError(404, 'Risk was not found in this organization.', 'RISK_NOT_FOUND');
    return risk;
  }

  async function create({ organizationId, userId, input }) {
    const risk = normalizeRiskState(input);
    await organizationAuthorization.requireRole(
      organizationId,
      userId,
      risk.status === 'accepted' ? 'admin' : 'member',
    );
    validateControls(risk.controlIds);
    await validateOwner(organizationId, risk.ownerUserId);
    return riskRepository.createRisk({ organizationId, userId, risk });
  }

  async function update({ organizationId, userId, riskId, patch }) {
    const current = await get({ organizationId, userId, riskId });
    const risk = normalizeRiskState({
      ...current,
      ...patch,
      targetIds: patch.targetIds ?? current.targetIds,
      findingIds: patch.findingIds ?? current.findingIds,
      controlIds: patch.controlIds ?? current.controlIds,
    });

    const acceptanceSensitive =
      current.status === 'accepted' ||
      risk.status === 'accepted' ||
      current.treatment === 'accept' ||
      risk.treatment === 'accept';

    await organizationAuthorization.requireRole(
      organizationId,
      userId,
      acceptanceSensitive ? 'admin' : 'member',
    );
    validateControls(risk.controlIds);
    await validateOwner(organizationId, risk.ownerUserId);
    return riskRepository.updateRisk({ organizationId, userId, riskId, risk });
  }

  return { create, get, list, update };
}

module.exports = { createRiskService };
