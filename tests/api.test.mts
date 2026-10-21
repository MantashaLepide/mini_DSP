import assert from 'node:assert/strict';
import { test } from 'node:test';
import { handleAuth, handleCallback, handleListScans, handleScan, handleSession } from '../src/lib/api.ts';
import type { ApiClient, CreateContext } from '../src/lib/api.ts';

const origin = 'http://localhost:3000';
const scanId = '11111111-1111-4111-8111-111111111111';
function harness() {
  const calls: string[] = [];
  const parameters: Record<string, unknown>[] = [];
  const client: ApiClient = {
    auth: {
      async getUser() { calls.push('user'); return { data: { user: { id: 'owner-a' } }, error: null }; },
      async signInWithPassword() { calls.push('sign-in'); return { error: null }; },
      async signUp() { calls.push('sign-up'); return { error: null }; },
      async signOut() { calls.push('sign-out'); return { error: null }; },
      async exchangeCodeForSession() { calls.push('exchange'); return { error: null }; },
    },
    async rpc(name, payload) { calls.push(name); parameters.push(payload); return { data: scanId, error: null }; },
    from() {
      return {
        select() {
          return {
            eq(column: 'owner_id', value: string) {
              calls.push(`eq:${column}:${value}`);
              return { order() { return { async limit() { return { data: [{ id: scanId, risk: 'Low' }], error: null }; } }; } };
            },
          };
        },
      };
    },
  };
  const factory: CreateContext = () => ({ client, finish: response => response });
  return { client, factory, calls, parameters };
}

function scanRequest(text = 'alex@example.test\n4111111111111111', extra = false): Request {
  const form = new FormData();
  form.set('file', new File([text], 'alex@example.test.txt', { type: 'text/plain' }));
  if (extra) form.set('owner_id', 'owner-b');
  return new Request(`${origin}/api/scans`, { method: 'POST', headers: { origin }, body: form });
}

function authRequest(action: string, input: unknown = { email: 'alex@example.test', password: 'synthetic-password' }): Request {
  return new Request(`${origin}/api/auth/${action}`, {
    method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify(input),
  });
}

test('scan authenticates before parsing and sends only aggregates in a single atomic RPC', async () => {
  const setup = harness();
  const response = await handleScan(scanRequest(), setup.factory, origin);
  assert.equal(response.status, 201);
  assert.deepEqual(setup.calls, ['user', 'save_scan']);
  const serialized = JSON.stringify(setup.parameters);
  for (const value of ['alex@example.test', '4111111111111111', 'owner-a', 'filename']) assert.equal(serialized.includes(value), false);
  assert.deepEqual(Object.keys(setup.parameters[0]).sort(), ['p_byte_size', 'p_extension', 'p_findings']);
  assert.equal((await response.json()).risk, 'Critical');
  assert.match(response.headers.get('cache-control') ?? '', /no-store/);
});

test('unauthenticated scans do not read the body or write anything', async () => {
  const setup = harness();
  setup.client.auth.getUser = async () => ({ data: { user: null }, error: null });
  const request = scanRequest();
  assert.equal((await handleScan(request, setup.factory, origin)).status, 401);
  assert.equal(request.bodyUsed, false);
  assert.equal(setup.parameters.length, 0);
});

test('cross-origin or missing-origin mutations fail before contacting Supabase', async () => {
  const setup = harness();
  for (const supplied of ['', 'https://attacker.test']) {
    const request = scanRequest();
    request.headers.set('origin', supplied);
    assert.equal((await handleScan(request, setup.factory, origin)).status, 403);
  }
  assert.deepEqual(setup.calls, []);
  assert.equal((await handleScan(scanRequest(), setup.factory)).status, 503);
});

test('invalid uploads and forged owner fields cause no database writes', async () => {
  const setup = harness();
  for (const request of [scanRequest(''), scanRequest('clean', true), scanRequest('bad\u0000binary')]) {
    assert.equal((await handleScan(request, setup.factory, origin)).status, 400);
  }
  assert.equal(setup.parameters.length, 0);
});

test('database errors never echo diagnostics or return a successful scan', async () => {
  const setup = harness();
  setup.client.rpc = async () => ({ data: null, error: { message: 'sensitive diagnostic' } });
  const response = await handleScan(scanRequest(), setup.factory, origin);
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: 'Unable to save scan.' });
});

test('email/password sign-in, generic sign-up, sign-out and session are supported', async () => {
  const setup = harness();
  for (const action of ['sign-in', 'sign-up', 'sign-out']) {
    const response = await handleAuth(authRequest(action), action, setup.factory, origin);
    assert.equal(response.status, action === 'sign-up' ? 202 : 200);
    assert.equal((await response.text()).includes('synthetic-password'), false);
  }
  const response = await handleSession(new Request(`${origin}/api/auth/session`), setup.factory);
  assert.deepEqual(await response.json(), { user: { id: 'owner-a' } });
});

test('auth rejects malformed credentials, bad passwords, oversized JSON, and generic login failures', async () => {
  const setup = harness();
  for (const input of [null, [], { email: 'invalid', password: 'short' },
    { email: 'alex@example.test', password: 'short' },
    { email: 'alex@example.test', password: 'synthetic-password', owner_id: 'owner-b' }]) {
    assert.equal((await handleAuth(authRequest('sign-up', input), 'sign-up', setup.factory, origin)).status, 400);
  }
  assert.equal((await handleAuth(authRequest('sign-in', { padding: 'x'.repeat(5000) }), 'sign-in', setup.factory, origin)).status, 413);
  assert.deepEqual(setup.calls, []);
  setup.client.auth.signInWithPassword = async () => ({ error: { message: 'do not expose provider diagnostics' } });
  const response = await handleAuth(authRequest('sign-in'), 'sign-in', setup.factory, origin);
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: 'Invalid sign-in credentials.' });
});

test('PKCE callback uses the code exchange and never honors an untrusted redirect', async () => {
  const setup = harness();
  const response = await handleCallback(new Request(`${origin}/auth/callback?code=synthetic-code&next=https://attacker.test`), setup.factory);
  assert.equal(response.status, 303);
  assert.equal(response.headers.get('location'), '/');
  assert.deepEqual(setup.calls, ['exchange']);
  assert.equal((await handleCallback(new Request(`${origin}/auth/callback`), setup.factory)).status, 400);
});

test('scan listing requires a user and filters by that user before reading', async () => {
  const setup = harness();
  const response = await handleListScans(new Request(`${origin}/api/scans`, { headers: { origin } }), setup.factory);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { scans: [{ id: scanId, risk: 'Low' }] });
  assert.deepEqual(setup.calls, ['user', 'eq:owner_id:owner-a']);
});

test('scan listing returns 401 without a session and a generic 503 on read errors', async () => {
  const setup = harness();
  setup.client.auth.getUser = async () => ({ data: { user: null }, error: null });
  assert.equal((await handleListScans(new Request(`${origin}/api/scans`), setup.factory)).status, 401);
  setup.client.auth.getUser = async () => ({ data: { user: { id: 'owner-a' } }, error: null });
  setup.client.from = () => ({
    select: () => ({ eq: () => ({ order: () => ({ limit: async () => ({ data: null, error: { message: 'sensitive diagnostic' } }) }) }) }),
  });
  const response = await handleListScans(new Request(`${origin}/api/scans`), setup.factory);
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: 'Unable to load scans.' });
});