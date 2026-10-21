import { analyzeUpload, readLimitedBody, RequestError } from './upload.ts';

type Credentials = { email: string; password: string };
type AuthResult = { error: unknown };
export interface ApiClient {
  auth: {
    getUser(): Promise<{ data: { user: { id: string } | null }; error: unknown }>;
    signInWithPassword(credentials: Credentials): Promise<AuthResult>;
    signUp(credentials: Credentials & { options: { emailRedirectTo: string } }): Promise<AuthResult>;
    signOut(options: { scope: 'local' }): Promise<AuthResult>;
    exchangeCodeForSession(code: string): Promise<AuthResult>;
  };
  rpc(name: 'save_scan', parameters: Record<string, unknown>): PromiseLike<{ data: unknown; error: unknown }>;
  from(table: 'scans'): {
    select(columns: string): {
      eq(column: 'owner_id', value: string): {
        order(column: 'created_at', options: { ascending: boolean }): {
          limit(count: number): PromiseLike<{ data: unknown; error: unknown }>;
        };
      };
    };
  };
}

export type ApiContext = { client: ApiClient; finish(response: Response): Response };
export type CreateContext = (request: Request) => ApiContext;

export function apiResponse(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: {
    'cache-control': 'private, no-store, max-age=0',
    pragma: 'no-cache', expires: '0', 'x-content-type-options': 'nosniff', 'referrer-policy': 'no-referrer',
  } });
}

function sameOrigin(request: Request, expected: string | undefined): string {
  if (!expected) throw new RequestError(503, 'Service is not configured.');
  let origin: string;
  try {
    const configured = new URL(expected);
    if (!['http:', 'https:'].includes(configured.protocol) || configured.username || configured.password) throw new Error();
    origin = configured.origin;
  } catch {
    throw new RequestError(503, 'Service is not configured.');
  }
  if (request.headers.get('origin') !== origin) throw new RequestError(403, 'Request origin is not allowed.');
  return origin;
}

async function execute(request: Request, factory: CreateContext,
  action: (client: ApiClient) => Promise<Response>, expectedOrigin?: string): Promise<Response> {
  let context: ApiContext | undefined;
  try {
    if (request.method !== 'GET') sameOrigin(request, expectedOrigin);
    context = factory(request);
    return context.finish(await action(context.client));
  } catch (error) {
    const response = error instanceof RequestError
      ? apiResponse({ error: error.message }, error.status)
      : apiResponse({ error: 'Service unavailable.' }, 503);
    return context ? context.finish(response) : response;
  }
}

function logAuthFailure(action: string, error: unknown): void {
  const detail = error && typeof error === 'object' ? error as { name?: unknown; status?: unknown; code?: unknown } : {};
  console.warn(JSON.stringify({ event: 'auth_failure', action, name: detail.name, status: detail.status, code: detail.code }));
}

async function requireUser(client: ApiClient): Promise<{ id: string }> {
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) throw new RequestError(401, 'Authentication required.');
  return { id: data.user.id };
}

export async function handleScan(request: Request, factory: CreateContext, origin?: string): Promise<Response> {
  return execute(request, factory, async client => {
    await requireUser(client);
    const scan = await analyzeUpload(request);
    const { data, error } = await client.rpc('save_scan', {
      p_extension: scan.extension, p_byte_size: scan.byteSize, p_findings: scan.findings,
    });
    if (error || typeof data !== 'string' || !/^[0-9a-f-]{36}$/i.test(data)) {
      throw new RequestError(503, 'Unable to save scan.');
    }
    return apiResponse({ id: data, ...scan }, 201);
  }, origin);
}

export async function handleListScans(request: Request, factory: CreateContext): Promise<Response> {
  return execute(request, factory, async client => {
    const user = await requireUser(client);
    const { data, error } = await client.from('scans')
      .select('id, display_name, byte_size, risk, total_count, created_at, findings(type, risk, count, masked_example)')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error || !Array.isArray(data)) throw new RequestError(503, 'Unable to load scans.');
    return apiResponse({ scans: data });
  });
}

export async function handleAuth(request: Request, action: string, factory: CreateContext, origin?: string): Promise<Response> {
  return execute(request, factory, async client => {
    if (action === 'sign-out') {
      await requireUser(client);
      const { error } = await client.auth.signOut({ scope: 'local' });
      if (error) throw new RequestError(503, 'Unable to sign out.');
      return apiResponse({ signedOut: true });
    }
    if (action !== 'sign-in' && action !== 'sign-up') throw new RequestError(404, 'Endpoint not found.');
    if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type') ?? '')) {
      throw new RequestError(415, 'JSON credentials are required.');
    }
    let input: unknown;
    try {
      input = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(await readLimitedBody(request, 4096)));
    } catch (error) {
      if (error instanceof RequestError) throw error;
      throw new RequestError(400, 'Invalid credentials request.');
    }
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new RequestError(400, 'Invalid credentials request.');
    const record = input as Record<string, unknown>;
    if (Object.keys(record).some(key => !['email', 'password'].includes(key)) ||
      typeof record.email !== 'string' || typeof record.password !== 'string') {
      throw new RequestError(400, 'Email and password are required.');
    }
    const email = record.email.trim();
    const password = record.password;
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      password.length < (action === 'sign-up' ? 12 : 1) || password.length > 1024) {
      throw new RequestError(400, 'Invalid email or password format.');
    }
    if (action === 'sign-up') {
      const { error } = await client.auth.signUp({ email, password, options: { emailRedirectTo: `${sameOrigin(request, origin)}/auth/callback` } });
      if (error) logAuthFailure(action, error);
      return apiResponse({ message: 'If sign-up is available, check your email before signing in.' }, 202);
    }
    const { error } = await client.auth.signInWithPassword({ email, password });
    if (error) {
      logAuthFailure(action, error);
      throw new RequestError(401, 'Invalid sign-in credentials.');
    }
    return apiResponse({ signedIn: true });
  }, origin);
}

export async function handleSession(request: Request, factory: CreateContext): Promise<Response> {
  return execute(request, factory, async client => apiResponse({ user: await requireUser(client) }));
}

export async function handleCallback(request: Request, factory: CreateContext): Promise<Response> {
  return execute(request, factory, async client => {
    const code = new URL(request.url).searchParams.get('code');
    if (!code || code.length > 2048) throw new RequestError(400, 'Invalid confirmation link.');
    const { error } = await client.auth.exchangeCodeForSession(code);
    if (error) throw new RequestError(400, 'Invalid or expired confirmation link.');
    const response = apiResponse({ confirmed: true });
    response.headers.set('location', '/');
    return new Response(null, { status: 303, headers: response.headers });
  });
}