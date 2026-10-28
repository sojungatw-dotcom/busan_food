import { DataError, readApiKey } from '../../../lib/restaurants';
import { getParking, nearestParking } from '../../../lib/parking';
export const runtime = 'nodejs';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
export async function GET(request: Request) {
  try {
    const key = await readApiKey('PARKING_API_KEY');
    if (!key) return Response.json({ mode: 'unconfigured', items: [], message: '주차장 API 키를 등록하면 음식점 근처의 주차장을 찾아드려요.' }, { headers });
    const url = new URL(request.url);
    const lat = url.searchParams.get('lat'), lng = url.searchParams.get('lng');
    if (!lat || !lng || !Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng)) || Number(lat) < 33 || Number(lat) > 39 || Number(lng) < 124 || Number(lng) > 132) {
      return Response.json({ code: 'INVALID_COORDINATES', message: '음식점의 위치 좌표를 확인할 수 없습니다.', items: [] }, { status: 400, headers });
    }
    const data = await getParking(key);
    return Response.json({ mode: 'live', items: nearestParking(data.items, Number(lat), Number(lng)), radiusMeters: 2000, fetchedAt: data.fetchedAt }, { headers });
  } catch (error) {
    return Response.json({ code: error instanceof DataError ? error.code : 'PARKING_SERVER_ERROR', message: error instanceof DataError ? error.message : '주차장 조회 중 문제가 발생했습니다. 다시 조회해 주세요.' }, { status: 502, headers });
  }
}
