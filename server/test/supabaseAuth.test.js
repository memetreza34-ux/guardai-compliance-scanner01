const test = require('node:test');
const assert = require('node:assert/strict');
const {
  verifySupabaseAccessToken,
  clearAuthTokenCache,
  getAuthTokenCacheSize,
} = require('../auth/supabaseAuth');

const mockAuthConfig = {
  supabaseUrl: 'https://mock.supabase.co',
  supabasePublishableKey: 'mock-key',
  authTimeoutMs: 1000,
};

test.beforeEach(() => {
  clearAuthTokenCache();
});

test('verifySupabaseAccessToken caches successful authentication response', async () => {
  let fetchCount = 0;
  const mockFetcher = async () => {
    fetchCount += 1;
    return {
      status: 200,
      data: {
        id: 'user-123',
        email: 'test@guardai.local',
        email_confirmed_at: '2026-10-01T00:00:00Z',
      },
    };
  };

  const token = 'fake-jwt-token-alpha';
  const result1 = await verifySupabaseAccessToken(token, {
    authConfig: mockAuthConfig,
    fetcher: mockFetcher,
  });
  assert.equal(result1.userId, 'user-123');
  assert.equal(result1.email, 'test@guardai.local');
  assert.equal(result1.emailVerified, true);
  assert.equal(fetchCount, 1);
  assert.equal(getAuthTokenCacheSize(), 1);

  // Second call with same token should hit cache and NOT invoke fetcher
  const result2 = await verifySupabaseAccessToken(token, {
    authConfig: mockAuthConfig,
    fetcher: mockFetcher,
  });
  assert.deepEqual(result2, result1);
  assert.equal(fetchCount, 1, 'Fetcher must not be called on cache hit');

  // Bypass cache should re-fetch
  const result3 = await verifySupabaseAccessToken(token, {
    authConfig: mockAuthConfig,
    fetcher: mockFetcher,
    bypassCache: true,
  });
  assert.deepEqual(result3, result1);
  assert.equal(fetchCount, 2, 'Fetcher must be called when bypassCache is true');
});

test('verifySupabaseAccessToken clears cache entry on 401 response', async () => {
  const mockFetcher = async () => ({
    status: 401,
    data: { error: 'Invalid token' },
  });

  const token = 'invalid-token-xyz';
  await assert.rejects(
    () => verifySupabaseAccessToken(token, {
      authConfig: mockAuthConfig,
      fetcher: mockFetcher,
    }),
    { message: 'Authentication token is invalid or expired.' },
  );
  assert.equal(getAuthTokenCacheSize(), 0);
});

test('clearAuthTokenCache removes all cached sessions', async () => {
  const mockFetcher = async () => ({
    status: 200,
    data: { id: 'u1', email: 'u1@guardai.local' },
  });

  await verifySupabaseAccessToken('t1', {
    authConfig: mockAuthConfig,
    fetcher: mockFetcher,
  });
  assert.equal(getAuthTokenCacheSize(), 1);

  clearAuthTokenCache();
  assert.equal(getAuthTokenCacheSize(), 0);
});
