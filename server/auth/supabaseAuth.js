const crypto = require('node:crypto');
const axios = require('axios');
const { config } = require('../config');
const { HttpError } = require('../lib/httpError');

const DEFAULT_AUTH_CACHE_TTL_MS = 60 * 1000;
const MAX_AUTH_CACHE_SIZE = 1000;
const authTokenCache = new Map();

function getBearerToken(authorizationHeader) {
  if (typeof authorizationHeader !== 'string') return null;

  const match = authorizationHeader.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

function assertAuthConfigured(runtimeConfig = config) {
  if (!runtimeConfig.supabaseUrl || !runtimeConfig.supabasePublishableKey) {
    throw new HttpError(503, 'GuardAI authentication is not configured yet.');
  }
}

function getJwtExpiryMs(token) {
  try {
    const parts = token.split('.');
    if (parts.length === 3) {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
      if (typeof payload.exp === 'number' && Number.isFinite(payload.exp)) {
        return payload.exp * 1000;
      }
    }
  } catch {
    // Non-JWT token shape or malformed segment; fall through to fallback TTL
  }
  return null;
}

function clearAuthTokenCache() {
  authTokenCache.clear();
}

function getAuthTokenCacheSize() {
  return authTokenCache.size;
}

async function verifySupabaseAccessToken(token, options = {}) {
  const runtimeConfig = options.authConfig || config;
  assertAuthConfigured(runtimeConfig);

  const useCache = options.bypassCache !== true;
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const now = Date.now();

  if (useCache) {
    const cached = authTokenCache.get(tokenHash);
    if (cached) {
      if (cached.expiresAt > now) {
        return cached.user;
      }
      authTokenCache.delete(tokenHash);
    }
  }

  let endpoint;
  try {
    endpoint = new URL('/auth/v1/user', runtimeConfig.supabaseUrl).toString();
  } catch {
    throw new HttpError(503, 'GuardAI authentication configuration is invalid.');
  }

  let response;
  try {
    const fetcher = typeof options.fetcher === 'function' ? options.fetcher : axios.get;
    response = await fetcher(endpoint, {
      headers: {
        apikey: runtimeConfig.supabasePublishableKey,
        Authorization: `Bearer ${token}`,
      },
      timeout: runtimeConfig.authTimeoutMs || config.authTimeoutMs,
      maxRedirects: 0,
      proxy: false,
      validateStatus: () => true,
    });
  } catch (error) {
    console.error('[Auth] Supabase token validation request failed:', error.message);
    throw new HttpError(503, 'GuardAI authentication service is temporarily unavailable.');
  }

  if (response.status === 401 || response.status === 403) {
    authTokenCache.delete(tokenHash);
    throw new HttpError(401, 'Authentication token is invalid or expired.');
  }

  if (response.status !== 200) {
    throw new HttpError(503, 'GuardAI authentication service returned an unexpected response.');
  }

  const user = response.data;
  if (!user || typeof user !== 'object' || typeof user.id !== 'string') {
    throw new HttpError(503, 'GuardAI authentication service returned an invalid user payload.');
  }

  const resolvedUser = {
    userId: user.id,
    email: typeof user.email === 'string' ? user.email : null,
    emailVerified: typeof user.email_confirmed_at === 'string' && Number.isFinite(Date.parse(user.email_confirmed_at)),
  };

  if (useCache) {
    const jwtExp = getJwtExpiryMs(token);
    const maxTtlExpiresAt = now + DEFAULT_AUTH_CACHE_TTL_MS;
    const expiresAt = jwtExp ? Math.min(jwtExp, maxTtlExpiresAt) : maxTtlExpiresAt;

    if (expiresAt > now) {
      if (authTokenCache.size >= MAX_AUTH_CACHE_SIZE) {
        const oldestKey = authTokenCache.keys().next().value;
        authTokenCache.delete(oldestKey);
      }
      authTokenCache.set(tokenHash, { user: resolvedUser, expiresAt });
    }
  }

  return resolvedUser;
}

async function resolveRequestAuth(req) {
  const token = getBearerToken(req.headers.authorization);
  if (!token) return null;
  return verifySupabaseAccessToken(token);
}

async function optionalAuth(req, _res, next) {
  try {
    req.auth = await resolveRequestAuth(req);
    next();
  } catch (error) {
    next(error);
  }
}

async function requireAuth(req, _res, next) {
  try {
    const token = getBearerToken(req.headers.authorization);
    if (!token) {
      throw new HttpError(401, 'Authentication required.');
    }

    req.auth = await verifySupabaseAccessToken(token);
    next();
  } catch (error) {
    next(error);
  }
}

module.exports = {
  clearAuthTokenCache,
  getAuthTokenCacheSize,
  getBearerToken,
  optionalAuth,
  requireAuth,
  verifySupabaseAccessToken,
};
