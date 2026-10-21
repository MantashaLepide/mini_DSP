import 'server-only';
import { createServerClient, parseCookieHeader, serializeCookieHeader } from '@supabase/ssr';
import type { CookieOptions } from '@supabase/ssr';
import type { ApiClient, ApiContext } from './api.ts';
import { RequestError } from './upload.ts';

export function createSupabaseContext(request: Request): ApiContext {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key || !key.startsWith('sb_publishable_')) throw new RequestError(503, 'Service is not configured.');
  const configured = new URL(url);
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(configured.hostname);
  if (configured.username || configured.password || (configured.protocol !== 'https:' && !(local && configured.protocol === 'http:'))) {
    throw new RequestError(503, 'Service is not configured.');
  }
  const pending = new Map<string, { name: string; value: string; options: CookieOptions }>();
  const incoming = new Map(parseCookieHeader(request.headers.get('cookie') ?? '').map(cookie => [cookie.name, cookie.value]));
  const client = createServerClient(url, key, {
    cookies: {
      getAll: () => [...incoming].map(([name, value]) => ({ name, value: value ?? '' })),
      setAll(cookiesToSet) {
        for (const cookie of cookiesToSet) {
          incoming.set(cookie.name, cookie.value);
          pending.set(cookie.name, cookie);
        }
      },
    },
  });
  return {
    // Supabase's generic query types exceed TypeScript's depth limit against ApiClient.
    client: client as unknown as ApiClient,
    finish(response) {
      response.headers.set('cache-control', 'private, no-store, max-age=0');
      response.headers.set('pragma', 'no-cache');
      response.headers.set('expires', '0');
      for (const cookie of pending.values()) {
        response.headers.append('set-cookie', serializeCookieHeader(cookie.name, cookie.value, {
          ...cookie.options, httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/',
        }));
      }
      return response;
    },
  };
}