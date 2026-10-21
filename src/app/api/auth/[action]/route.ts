import { apiResponse, handleAuth, handleSession } from '../../../../lib/api.ts';
import { createSupabaseContext } from '../../../../lib/supabase-server.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request, context: { params: Promise<{ action: string }> }) {
  return handleAuth(request, (await context.params).action, createSupabaseContext, process.env.APP_ORIGIN);
}

export async function GET(request: Request, context: { params: Promise<{ action: string }> }) {
  if ((await context.params).action !== 'session') return apiResponse({ error: 'Endpoint not found.' }, 404);
  return handleSession(request, createSupabaseContext);
}