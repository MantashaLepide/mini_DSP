import assert from 'node:assert/strict';
import { test } from 'node:test';
import { analyzeUpload, MAX_MULTIPART_BYTES, MAX_UPLOAD_BYTES, readLimitedBody, RequestError } from '../src/lib/upload.ts';

function upload(content: BlobPart, name = 'synthetic.txt', type = 'text/plain'): Request {
  const form = new FormData();
  form.set('file', new File([content], name, { type }));
  return new Request('http://localhost/api/scans', { method: 'POST', body: form });
}

test('upload returns masked aggregates without source text or original filename', async () => {
  const result = await analyzeUpload(upload('alex@example.test\n4111111111111111', 'alex@example.test.txt'));
  assert.equal(result.risk, 'Critical');
  assert.equal(result.extension, 'txt');
  assert.equal(result.byteSize, 34);
  assert.equal(result.findings.length, 2);
  assert.equal(JSON.stringify(result).includes('alex@example.test'), false);
  assert.equal(JSON.stringify(result).includes('4111111111111111'), false);
  assert.deepEqual(Object.keys(result).sort(), ['byteSize', 'extension', 'findings', 'risk']);
});

test('upload accepts clean CSV, UTF-8 BOM, Unicode, and the exact size limit', async () => {
  assert.equal((await analyzeUpload(upload('name,stock\ndesk,3', 'inventory.CSV', 'text/csv'))).risk, 'None');
  assert.equal((await analyzeUpload(upload('\ufeffCaf\u00e9\t\r\n'))).risk, 'None');
  const result = await analyzeUpload(upload('x'.repeat(MAX_UPLOAD_BYTES)));
  assert.equal(result.byteSize, MAX_UPLOAD_BYTES);
  assert.equal(result.risk, 'None');
});

test('upload rejects empty, oversized, unsupported, invalid UTF-8 and binary files', async () => {
  const cases: [Request, number][] = [
    [upload(''), 400], [upload('x'.repeat(MAX_UPLOAD_BYTES + 1)), 413],
    [upload('{}', 'data.json', 'application/json'), 415],
    [upload('text', 'data.txt', 'application/octet-stream'), 415],
    [upload(new Uint8Array([0xc3, 0x28])), 400],
    [upload('safe\u0000binary'), 400], [upload('safe\u0007binary'), 400],
  ];
  for (const [request, status] of cases) {
    await assert.rejects(analyzeUpload(request), error => error instanceof RequestError && error.status === status);
  }
});

test('upload rejects extra fields, duplicate files, missing files and malformed multipart', async () => {
  for (const mode of ['extra', 'duplicate', 'missing']) {
    const form = new FormData();
    if (mode !== 'missing') form.append('file', new File(['clean'], 'synthetic.txt'));
    form.append(mode === 'duplicate' ? 'file' : 'unexpected', 'untrusted');
    await assert.rejects(analyzeUpload(new Request('http://localhost', { method: 'POST', body: form })), RequestError);
  }
  await assert.rejects(analyzeUpload(new Request('http://localhost', { method: 'POST', body: 'clean' })), RequestError);
  await assert.rejects(analyzeUpload(new Request('http://localhost', {
    method: 'POST', body: 'invalid', headers: { 'content-type': 'multipart/form-data; boundary=missing' },
  })), RequestError);
});

test('bounded reader enforces declared and actual lengths without trusting Content-Length', async () => {
  await assert.rejects(readLimitedBody(new Request('http://localhost', {
    method: 'POST', body: 'small', headers: { 'content-length': String(MAX_MULTIPART_BYTES + 1) },
  }), MAX_MULTIPART_BYTES), error => error instanceof RequestError && error.status === 413);
  await assert.rejects(readLimitedBody(new Request('http://localhost', {
    method: 'POST', body: 'longer', headers: { 'content-length': '1' },
  }), 4), error => error instanceof RequestError && error.status === 413);
  await assert.rejects(readLimitedBody(new Request('http://localhost', {
    method: 'POST', body: 'short', headers: { 'content-length': '1' },
  }), 10), error => error instanceof RequestError && error.status === 400);
});

test('unknown-length chunked body is cancelled as soon as the byte cap is exceeded', async () => {
  let cancelled = false;
  const stream = new ReadableStream<Uint8Array>({
    pull(controller) { controller.enqueue(new Uint8Array([65, 66, 67])); },
    cancel() { cancelled = true; },
  });
  const options: RequestInit & { duplex: 'half' } = { method: 'POST', body: stream, duplex: 'half' };
  const request = new Request('http://localhost', options);
  assert.equal(request.headers.has('content-length'), false);
  await assert.rejects(readLimitedBody(request, 5), error => error instanceof RequestError && error.status === 413);
  assert.equal(cancelled, true);
});