function createDriftService({ driftRepository, organizationAuthorization }) {
  if (!driftRepository || typeof driftRepository.listDriftEvents !== 'function') {
    throw new TypeError('Drift service requires a Drift repository.');
  }
  if (!organizationAuthorization || typeof organizationAuthorization.requireRole !== 'function') {
    throw new TypeError('Drift service requires organization authorization.');
  }

  async function list({ organizationId, userId, limit, cursor }) {
    await organizationAuthorization.requireRole(organizationId, userId, 'viewer');
    return driftRepository.listDriftEvents({ organizationId, limit, cursor });
  }

  return { list };
}

module.exports = { createDriftService };
