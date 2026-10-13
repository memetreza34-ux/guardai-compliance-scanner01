const { createOrganizationSlug, normalizeOrganizationName } = require('../domain/organization');
const { HttpError } = require('../lib/httpError');

const MAX_SLUG_ATTEMPTS = 3;

function createOrganizationService({ organizationRepository, organizationAuthorization = null }) {
  if (!organizationRepository) {
    throw new TypeError('Organization service requires a repository.');
  }

  async function create({ userId, name }) {
    if (!userId) {
      throw new HttpError(401, 'Authentication is required.', 'UNAUTHORIZED');
    }

    const normalizedName = normalizeOrganizationName(name);
    let lastError = null;

    for (let attempt = 0; attempt < MAX_SLUG_ATTEMPTS; attempt += 1) {
      try {
        return await organizationRepository.createOrganizationWithOwner({
          name: normalizedName,
          slug: createOrganizationSlug(normalizedName),
          userId,
        });
      } catch (error) {
        if (error?.code !== 'ORGANIZATION_SLUG_COLLISION') throw error;
        lastError = error;
      }
    }

    throw lastError || new HttpError(
      409,
      'Organization could not be created because a unique identifier could not be allocated.',
      'ORGANIZATION_CREATE_CONFLICT',
    );
  }

  async function listForUser(userId) {
    if (!userId) {
      throw new HttpError(401, 'Authentication is required.', 'UNAUTHORIZED');
    }
    return organizationRepository.listOrganizationsForUser(userId);
  }

  async function updateName({ organizationId, userId, name }) {
    if (!userId) {
      throw new HttpError(401, 'Authentication is required.', 'UNAUTHORIZED');
    }
    if (!organizationId) {
      throw new HttpError(400, 'Organization identifier is required.', 'INVALID_ORGANIZATION_ID');
    }

    if (organizationAuthorization && typeof organizationAuthorization.requireRole === 'function') {
      await organizationAuthorization.requireRole(organizationId, userId, 'admin');
    }

    const normalizedName = normalizeOrganizationName(name);
    return organizationRepository.updateOrganizationName(organizationId, normalizedName, userId);
  }

  return {
    create,
    listForUser,
    updateName,
  };
}

module.exports = { createOrganizationService, MAX_SLUG_ATTEMPTS };
