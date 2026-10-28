import { DataError, getRestaurants, readApiKey, sampleRestaurants } from '../../../lib/restaurants';

export const runtime = 'nodejs';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
export async function GET() {
  try {
    const key = await readApiKey();
    if (!key) return Response.json({ mode: 'sample', items: sampleRestaurants, fetchedAt: null }, { headers });
    return Response.json({ mode: 'live', ...await getRestaurants(key) }, { headers });
  } catch (error) {
    return Response.json({ code: error instanceof DataError ? error.code : 'SERVER_ERROR', message: error instanceof DataError ? error.message : '데이터를 가져오지 못했습니다. 잠시 후 다시 시도해 주세요.' }, { status: 502, headers });
  }
}
