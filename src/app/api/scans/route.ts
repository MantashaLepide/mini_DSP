import { handleListScans, handleScan } from '../../../lib/api.ts';
import { createSupabaseContext } from '../../../lib/supabase-server.ts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function GET(request: Request) {
  return handleListScans(request, createSupabaseContext);
}

export async function POST(request: Request) {
  return handleScan(request, createSupabaseContext, process.env.APP_ORIGIN);
}