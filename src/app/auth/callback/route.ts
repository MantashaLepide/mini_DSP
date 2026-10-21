import { handleCallback } from '../../../lib/api.ts';
import { createSupabaseContext } from '../../../lib/supabase-server.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  return handleCallback(request, createSupabaseContext);
}