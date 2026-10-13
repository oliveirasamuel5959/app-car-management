import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * Regression tests for the API client's error handling.
 *
 * Every bug these cover reached the browser at some point:
 *  - a 401 was treated as "session expired" whenever *any* token sat in
 *    localStorage, so a wrong password reloaded the login page and discarded the
 *    reason it failed;
 *  - a non-JSON response (Vite serving index.html for a path the dev proxy did
 *    not cover) surfaced as "Unexpected character at line 1 column 1 of the JSON
 *    data", which points at the wrong problem entirely.
 *
 * Runs in the project's `node` test environment, so localStorage and window are
 * stubbed in memory rather than pulling in a DOM implementation.
 */

const { api } = await import('./api');

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

/** Minimal in-memory localStorage; read it back to assert what the API touched. */
const makeStorage = () => {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
    clear: () => map.clear(),
    _map: map,
  };
};

let storage: ReturnType<typeof makeStorage>;
let location: { href: string };

describe('api error handling', () => {
  beforeEach(() => {
    storage = makeStorage();
    location = { href: '' };
    vi.stubGlobal('localStorage', storage);
    vi.stubGlobal('window', { location });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('401 on an unauthenticated request', () => {
    it('surfaces the backend detail instead of redirecting', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(json(401, { detail: 'Invalid email or password' })),
      );
      await expect(api.auth.login({ email: 'a@b.com', password: 'nope' })).rejects.toThrow(
        'Invalid email or password',
      );
      expect(location.href).toBe('');
    });

    it('still surfaces the error when a stale token is left in storage', async () => {
      // The bug: this token made the handler decide "session expired" and reload
      // the page, destroying the real message. Login never sends a token, so the
      // response must be handled as bad credentials regardless of what is stored.
      storage.setItem('access_token', 'stale.expired.token');
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(json(401, { detail: 'Invalid email or password' })),
      );

      await expect(api.auth.login({ email: 'a@b.com', password: 'nope' })).rejects.toThrow(
        'Invalid email or password',
      );
      expect(location.href).toBe('');
    });

    it('does not send an Authorization header on login', async () => {
      storage.setItem('access_token', 'stale.expired.token');
      const fetchMock = vi.fn().mockResolvedValue(json(401, { detail: 'nope' }));
      vi.stubGlobal('fetch', fetchMock);

      await api.auth.login({ email: 'a@b.com', password: 'nope' }).catch(() => {});

      const headers = fetchMock.mock.calls[0][1].headers as Record<string, string>;
      expect(headers.Authorization).toBeUndefined();
    });
  });

  describe('401 on an authenticated request', () => {
    it('clears the session and redirects with a reason', async () => {
      storage.setItem('access_token', 'live.token');
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(401, { detail: 'expired' })));

      await expect(api.get('/workshops/me')).rejects.toThrow(/session expired/i);
      expect(storage.getItem('access_token')).toBeNull();
      expect(location.href).toContain('reason=session-expired');
    });
  });

  describe('non-JSON responses', () => {
    it('explains a 200 that came back as HTML rather than failing on JSON.parse', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(
          new Response('<!doctype html><html></html>', {
            status: 200,
            headers: { 'content-type': 'text/html' },
          }),
        ),
      );

      await expect(api.get('/auth/me')).rejects.toThrow(/text\/html instead of JSON/);
    });

    it('reports a server error with no JSON body without a parse crash', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 500 })));
      await expect(api.get('/auth/me')).rejects.toThrow('Internal server error');
    });

    it('treats 204 as success rather than a parse failure', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 204 })));
      await expect(api.delete('/cars/1')).resolves.toEqual({ success: true });
    });
  });

  describe('backend error details', () => {
    const cases: [number, string][] = [
      [400, 'Invalid request'],
      [403, 'Access forbidden'],
      [404, 'Resource not found'],
      [409, 'Conflict: Resource already exists'],
      [429, 'Too many requests. Please try again later.'],
    ];

    it.each(cases)('falls back to a readable message for %i', async (status, expected) => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status })));
      await expect(api.get('/anything')).rejects.toThrow(expected);
    });
  });
});
