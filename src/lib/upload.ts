import { detectSensitiveData } from './detection.ts';
import type { DetectionResult } from './detection.ts';

export const MAX_UPLOAD_BYTES = 1_048_576;
export const MAX_MULTIPART_BYTES = MAX_UPLOAD_BYTES + 65_536;

export class RequestError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'RequestError';
    this.status = status;
  }
}

export interface AnalyzedUpload extends DetectionResult {
  extension: 'csv' | 'txt';
  byteSize: number;
}

export async function readLimitedBody(request: Request, limit: number): Promise<Uint8Array<ArrayBuffer>> {
  const declared = request.headers.get('content-length');
  if (declared !== null && !/^\d+$/.test(declared)) throw new RequestError(400, 'Invalid request length.');
  if (declared !== null && Number(declared) > limit) throw new RequestError(413, 'Request is too large.');
  if (!request.body) throw new RequestError(400, 'Request body is required.');
  const reader = request.body.getReader();
  const bytes = new Uint8Array(limit);
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (total + value.byteLength > limit) {
        await reader.cancel().catch(() => undefined);
        throw new RequestError(413, 'Request is too large.');
      }
      bytes.set(value, total);
      total += value.byteLength;
    }
  } catch (error) {
    if (error instanceof RequestError) throw error;
    throw new RequestError(400, 'Unable to read request.');
  } finally {
    reader.releaseLock();
  }
  if (declared !== null && Number(declared) !== total) throw new RequestError(400, 'Invalid request length.');
  return bytes.slice(0, total);
}

export async function analyzeUpload(request: Request): Promise<AnalyzedUpload> {
  const contentType = request.headers.get('content-type') ?? '';
  if (!/^multipart\/form-data\s*;/i.test(contentType)) throw new RequestError(415, 'Multipart file upload is required.');
  const bytes = await readLimitedBody(request, MAX_MULTIPART_BYTES);
  let form: FormData;
  try {
    form = await new Response(bytes, { headers: { 'content-type': contentType } }).formData();
  } catch {
    throw new RequestError(400, 'Invalid multipart upload.');
  }
  const entries = [...form.entries()];
  if (entries.length !== 1 || entries[0][0] !== 'file' || typeof entries[0][1] === 'string') {
    throw new RequestError(400, 'Exactly one file field is required.');
  }
  const file = entries[0][1];
  const extension = /\.(csv|txt)$/i.exec(file.name)?.[1].toLowerCase();
  if ((extension !== 'csv' && extension !== 'txt') || file.name.length > 255 || /[\\/\u0000-\u001f\u007f]/.test(file.name)) {
    throw new RequestError(415, 'Only CSV and TXT filenames are accepted.');
  }
  if (!['', 'text/plain', 'text/csv'].includes(file.type.toLowerCase())) {
    throw new RequestError(415, 'Unsupported file media type.');
  }
  if (file.size < 1) throw new RequestError(400, 'File must not be empty.');
  if (file.size > MAX_UPLOAD_BYTES) throw new RequestError(413, 'File exceeds 1 MiB.');
  let text: string;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(await file.arrayBuffer());
  } catch {
    throw new RequestError(400, 'File must be valid UTF-8 text.');
  }
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/u.test(text)) {
    throw new RequestError(400, 'Binary or control-character content is not accepted.');
  }
  return { extension, byteSize: file.size, ...detectSensitiveData(text) };
}